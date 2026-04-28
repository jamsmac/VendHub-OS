import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { BonusEngineService } from "./bonus-engine.service";
import { AchievementService } from "./achievement.service";
import { LoyaltyService } from "../loyalty.service";
import { PointsTransaction } from "../entities/points-transaction.entity";
import {
  PointsSource,
  PointsTransactionType,
} from "../constants/loyalty.constants";

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
  /**
   * Points the customer applied at order creation time. Stored on the
   * order (orders.service.ts:181) but not deducted from the user's
   * balance until the order is paid + delivered — that's this
   * listener's job.
   */
  pointsUsed?: number | string;
}

@Injectable()
export class LoyaltyEventListenerService {
  private readonly logger = new Logger(LoyaltyEventListenerService.name);

  constructor(
    private readonly bonusEngineService: BonusEngineService,
    private readonly achievementService: AchievementService,
    private readonly loyaltyService: LoyaltyService,
    @InjectRepository(PointsTransaction)
    private readonly pointsTransactionRepo: Repository<PointsTransaction>,
  ) {}

  @OnEvent("order.completed")
  async handleOrderCompleted(event: OrderCompletedEvent): Promise<void> {
    const { orderId, userId, totalAmount, pointsUsed, organizationId } = event;

    if (!userId) {
      return;
    }

    // Spend applied points first — failure here must not prevent earning.
    // The customer already paid (cash + bonuses); not deducting bonuses
    // would let them spend the same balance multiple times.
    const pointsToSpend = Number(pointsUsed ?? 0);
    if (pointsToSpend > 0) {
      await this.spendOrderPoints(
        userId,
        organizationId,
        orderId,
        pointsToSpend,
      );
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
      // Skip achievement check: user.totalOrders may be in an inconsistent
      // state (processOrderPoints increments it before earnPoints), so
      // condition evaluation could either miss or double-fire.
      return;
    }

    // Achievement unlocking is best-effort — a failure here must not bubble
    // up to the order pipeline. checkAndUnlock is idempotent (skips already
    // unlocked achievements), so re-emitting the event is safe.
    try {
      await this.achievementService.checkAndUnlock(
        userId,
        organizationId,
        "order.completed",
        { orderId, totalAmount: amount },
      );
    } catch (error: unknown) {
      this.logger.error(
        `Failed achievement check for order ${orderId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Deduct points the customer applied at checkout. Idempotent on
   * (orderId, type=SPEND, source=PURCHASE) so a re-emitted event will
   * not double-debit. Errors are logged but never thrown — the order
   * pipeline must not be blocked by a loyalty hiccup.
   */
  private async spendOrderPoints(
    userId: string,
    organizationId: string,
    orderId: string,
    amount: number,
  ): Promise<void> {
    const existing = await this.pointsTransactionRepo.findOne({
      where: {
        organizationId,
        userId,
        type: PointsTransactionType.SPEND,
        source: PointsSource.PURCHASE,
        referenceId: orderId,
        referenceType: "order",
      },
    });

    if (existing) {
      this.logger.debug(
        `Order ${orderId}: spend already recorded (tx ${existing.id})`,
      );
      return;
    }

    try {
      await this.loyaltyService.spendPoints({
        userId,
        organizationId,
        amount,
        referenceId: orderId,
        referenceType: "order",
        description: `Списание за заказ ${orderId.substring(0, 8)}`,
      });
      this.logger.log(
        `Spent ${amount} points for order ${orderId} (user ${userId})`,
      );
    } catch (error: unknown) {
      // Insufficient balance, below minPointsToSpend, or DB error. The
      // order is already paid + delivered, so we cannot reverse — surface
      // the audit trail and leave it to manual reconciliation.
      this.logger.error(
        `Failed to spend ${amount} points for order ${orderId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
