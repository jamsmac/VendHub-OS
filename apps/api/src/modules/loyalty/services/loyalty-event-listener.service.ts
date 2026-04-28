import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BonusEngineService } from "./bonus-engine.service";
import { PointsTransaction } from "../entities/points-transaction.entity";
import { PointsSource } from "../constants/loyalty.constants";

/**
 * Payload of the "order.completed" event emitted by OrdersService when an
 * order transitions to COMPLETED with paymentStatus = PAID.
 *
 * userId is nullable because guest checkout is supported — guests do not
 * accrue loyalty points.
 */
interface OrderCompletedEvent {
  orderId: string;
  userId: string | null;
  totalAmount: number | string;
  organizationId: string;
}

@Injectable()
export class LoyaltyEventListenerService {
  private readonly logger = new Logger(LoyaltyEventListenerService.name);

  constructor(
    private readonly bonusEngineService: BonusEngineService,
    @InjectRepository(PointsTransaction)
    private readonly pointsTransactionRepo: Repository<PointsTransaction>,
  ) {}

  @OnEvent("order.completed")
  async handleOrderCompleted(event: OrderCompletedEvent): Promise<void> {
    const { orderId, userId, totalAmount, organizationId } = event;

    if (!userId) {
      return;
    }

    // Idempotency: BonusEngineService.processOrderPoints mutates user stats
    // (totalOrders++, totalSpent+=, lastOrderDate) and inserts a
    // PointsTransaction. Re-emitting the event would double-count; guard here.
    const existing = await this.pointsTransactionRepo.findOne({
      where: {
        organizationId,
        userId,
        referenceId: orderId,
        referenceType: "order",
        source: PointsSource.ORDER,
      },
    });

    if (existing) {
      this.logger.debug(
        `Order ${orderId}: points already granted (tx ${existing.id})`,
      );
      return;
    }

    // Decimal columns come back as strings via TypeORM; coerce defensively.
    const amount = Number(totalAmount);

    // First-order bonus is independent of regular points — failure here must
    // not block the main earn flow.
    try {
      await this.bonusEngineService.processFirstOrderBonus(
        userId,
        organizationId,
        orderId,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed first-order bonus for order ${orderId}`,
        error instanceof Error ? error.stack : error,
      );
    }

    try {
      await this.bonusEngineService.processOrderPoints(
        userId,
        organizationId,
        orderId,
        amount,
      );
      this.logger.log(
        `Granted loyalty points for order ${orderId} (user ${userId})`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed to grant points for order ${orderId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
