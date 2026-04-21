import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Machine, MachineSlot } from "../../machines/entities/machine.entity";
import {
  Transaction,
  TransactionItem,
} from "../../transactions/entities/transaction.entity";
import { StockMovementsService } from "../../stock-movements/services/stock-movements.service";
import {
  MovementType,
  MovementReferenceType,
} from "../../stock-movements/entities/stock-movement.entity";

@Injectable()
export class QuantitySyncService {
  private readonly logger = new Logger(QuantitySyncService.name);

  constructor(
    @InjectRepository(MachineSlot)
    private readonly slotRepo: Repository<MachineSlot>,
    @InjectRepository(TransactionItem)
    private readonly itemRepo: Repository<TransactionItem>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  @OnEvent("transaction.created")
  async handleTransactionCreated(transaction: Transaction): Promise<void> {
    if (!transaction.machineId) return;
    if (!transaction.organizationId) return;

    // Items relation is NOT loaded on the emitted entity — query separately
    const items = await this.itemRepo.find({
      where: { transactionId: transaction.id },
      select: ["productId", "quantity", "unitPrice"],
    });

    if (!items.length) return;

    // Resolve machine's location for stock movement origin.
    // Org-scoped lookup to enforce tenant isolation.
    const machine = await this.machineRepo.findOne({
      where: {
        id: transaction.machineId,
        organizationId: transaction.organizationId,
      },
      select: ["id", "locationId"],
    });

    for (const item of items) {
      const safeQty = Math.max(0, Math.round(item.quantity));
      if (safeQty <= 0) continue;

      // 1) Dual-write: keep denormalized MachineSlot.currentQuantity cache fresh
      //    (Sprint F behaviour — don't break existing predictive-refill queries)
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

      // 2) Event-sourced log: append SALE stock movement (Sprint G1)
      //    Only if we can resolve the machine's location — otherwise skip
      //    (cannot construct a valid movement without fromLocationId).
      if (machine?.locationId) {
        try {
          await this.stockMovementsService.record({
            organizationId: transaction.organizationId,
            productId: item.productId,
            fromLocationId: machine.locationId,
            toLocationId: null,
            quantity: safeQty,
            movementType: MovementType.SALE,
            unitPrice:
              item.unitPrice !== null && item.unitPrice !== undefined
                ? Number(item.unitPrice)
                : null,
            referenceType: MovementReferenceType.TRANSACTION,
            referenceId: transaction.id,
            note: `Sale via transaction ${transaction.id}`,
            at: transaction.transactionDate ?? new Date(),
          });
        } catch (err) {
          // Defensive: stock movement logging failure must not break the
          // denormalized cache update above or other items in this batch.
          this.logger.warn(
            `Failed to record SALE movement for tx ${transaction.id} / product ${item.productId}: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      } else {
        this.logger.debug(
          `Machine ${transaction.machineId} has no locationId — skipping stock movement log for tx ${transaction.id}`,
        );
      }
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
