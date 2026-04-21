import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MachineSlot } from "../../machines/entities/machine.entity";
import {
  Transaction,
  TransactionItem,
} from "../../transactions/entities/transaction.entity";

@Injectable()
export class QuantitySyncService {
  private readonly logger = new Logger(QuantitySyncService.name);

  constructor(
    @InjectRepository(MachineSlot)
    private readonly slotRepo: Repository<MachineSlot>,
    @InjectRepository(TransactionItem)
    private readonly itemRepo: Repository<TransactionItem>,
  ) {}

  @OnEvent("transaction.created")
  async handleTransactionCreated(transaction: Transaction): Promise<void> {
    if (!transaction.machineId) return;
    if (!transaction.organizationId) return;

    // Items relation is NOT loaded on the emitted entity — query separately
    const items = await this.itemRepo.find({
      where: { transactionId: transaction.id },
      select: ["productId", "quantity"],
    });

    if (!items.length) return;

    for (const item of items) {
      const safeQty = Math.max(0, Math.round(item.quantity));
      await this.slotRepo
        .createQueryBuilder()
        .update(MachineSlot)
        .set({
          currentQuantity: () => `GREATEST(current_quantity - ${safeQty}, 0)`,
        })
        .where("machine_id = :machineId AND product_id = :productId", {
          machineId: transaction.machineId,
          productId: item.productId,
        })
        .andWhere(
          "machine_id IN (SELECT id FROM machines WHERE organization_id = :orgId)",
          { orgId: transaction.organizationId },
        )
        .execute();
    }

    this.logger.debug(
      `Synced ${items.length} slots for machine ${transaction.machineId}`,
    );
  }

  async resetOnRefill(machineId: string, productId: string): Promise<void> {
    await this.slotRepo
      .createQueryBuilder()
      .update(MachineSlot)
      .set({ currentQuantity: () => "capacity" })
      .where("machine_id = :machineId AND product_id = :productId", {
        machineId,
        productId,
      })
      .execute();

    this.logger.debug(
      `Reset quantity to capacity for machine ${machineId}, product ${productId}`,
    );
  }
}
