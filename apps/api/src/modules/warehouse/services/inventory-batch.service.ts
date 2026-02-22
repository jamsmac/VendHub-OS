/**
 * InventoryBatchService
 * Advanced inventory batch operations: quarantine, expiry tracking,
 * stock summary, and FIFO write-off with pessimistic locking.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { InventoryBatch } from "../entities/warehouse.entity";

export interface StockSummary {
  totalBatches: number;
  totalStockValue: number;
  expiringSoon: number;
  expired: number;
}

@Injectable()
export class InventoryBatchService {
  constructor(
    @InjectRepository(InventoryBatch)
    private readonly batchRepository: Repository<InventoryBatch>,

    private readonly dataSource: DataSource,
  ) {}

  // ==========================================================================
  // EXPIRY TRACKING
  // ==========================================================================

  async getExpiringBatches(
    warehouseId: string,
    organizationId: string,
    daysThreshold = 30,
  ): Promise<InventoryBatch[]> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    return this.batchRepository
      .createQueryBuilder("batch")
      .where("batch.warehouseId = :warehouseId", { warehouseId })
      .andWhere("batch.organizationId = :organizationId", { organizationId })
      .andWhere("batch.remainingQuantity > 0")
      .andWhere("batch.expiryDate IS NOT NULL")
      .andWhere("batch.expiryDate <= :thresholdDate", { thresholdDate })
      .andWhere("batch.expiryDate > :now", { now: new Date() })
      .orderBy("batch.expiryDate", "ASC")
      .getMany();
  }

  async getExpiredBatches(
    warehouseId: string,
    organizationId: string,
  ): Promise<InventoryBatch[]> {
    return this.batchRepository
      .createQueryBuilder("batch")
      .where("batch.warehouseId = :warehouseId", { warehouseId })
      .andWhere("batch.organizationId = :organizationId", { organizationId })
      .andWhere("batch.remainingQuantity > 0")
      .andWhere("batch.expiryDate IS NOT NULL")
      .andWhere("batch.expiryDate < :now", { now: new Date() })
      .orderBy("batch.expiryDate", "ASC")
      .getMany();
  }

  async writeOffExpiredStock(
    warehouseId: string,
    organizationId: string,
    userId: string,
  ): Promise<{
    batchesProcessed: number;
    totalQuantityWrittenOff: number;
    totalValueWrittenOff: number;
  }> {
    let batchesProcessed = 0;
    let totalQuantityWrittenOff = 0;
    let totalValueWrittenOff = 0;

    await this.dataSource.transaction(async (manager) => {
      const expiredBatches = await manager
        .createQueryBuilder(InventoryBatch, "batch")
        .setLock("pessimistic_write")
        .where("batch.warehouseId = :warehouseId", { warehouseId })
        .andWhere("batch.organizationId = :organizationId", { organizationId })
        .andWhere("batch.remainingQuantity > 0")
        .andWhere("batch.expiryDate IS NOT NULL")
        .andWhere("batch.expiryDate < :now", { now: new Date() })
        .getMany();

      for (const batch of expiredBatches) {
        const qty = Number(batch.remainingQuantity);
        const value = qty * Number(batch.costPerUnit ?? 0);

        batch.metadata = {
          ...batch.metadata,
          writeOff: {
            date: new Date().toISOString(),
            quantity: qty,
            value,
            reason: "expired",
            userId,
          },
        };
        batch.remainingQuantity = 0;
        batch.updatedById = userId;

        await manager.save(InventoryBatch, batch);

        batchesProcessed++;
        totalQuantityWrittenOff += qty;
        totalValueWrittenOff += value;
      }
    });

    return { batchesProcessed, totalQuantityWrittenOff, totalValueWrittenOff };
  }

  // ==========================================================================
  // QUARANTINE
  // ==========================================================================

  async quarantineBatch(
    batchId: string,
    organizationId: string,
    reason: string,
    userId: string,
  ): Promise<InventoryBatch> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId, organizationId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    if (batch.metadata?.isQuarantined) {
      throw new BadRequestException("Batch is already quarantined");
    }

    batch.metadata = {
      ...batch.metadata,
      isQuarantined: true,
      quarantineReason: reason,
      quarantinedAt: new Date().toISOString(),
      quarantinedByUserId: userId,
    };
    batch.updatedById = userId;

    return this.batchRepository.save(batch);
  }

  async releaseFromQuarantine(
    batchId: string,
    organizationId: string,
    userId: string,
  ): Promise<InventoryBatch> {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId, organizationId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    if (!batch.metadata?.isQuarantined) {
      throw new BadRequestException("Batch is not quarantined");
    }

    batch.metadata = {
      ...batch.metadata,
      isQuarantined: false,
      quarantineReason: null,
      releasedAt: new Date().toISOString(),
      releasedByUserId: userId,
    };
    batch.updatedById = userId;

    return this.batchRepository.save(batch);
  }

  // ==========================================================================
  // STOCK SUMMARY
  // ==========================================================================

  async getStockSummary(
    warehouseId: string,
    organizationId: string,
  ): Promise<StockSummary> {
    const now = new Date();
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    const base = this.batchRepository
      .createQueryBuilder("batch")
      .where("batch.warehouseId = :warehouseId", { warehouseId })
      .andWhere("batch.organizationId = :organizationId", { organizationId })
      .andWhere("batch.remainingQuantity > 0");

    const [totalBatches, totalStockValue, expiringSoon, expired] =
      await Promise.all([
        base.clone().getCount(),

        base
          .clone()
          .select(
            "COALESCE(SUM(batch.remainingQuantity * COALESCE(batch.costPerUnit, 0)), 0)",
            "value",
          )
          .getRawOne()
          .then((r) => Number(r?.value ?? 0)),

        base
          .clone()
          .andWhere("batch.expiryDate IS NOT NULL")
          .andWhere("batch.expiryDate > :now", { now })
          .andWhere("batch.expiryDate <= :threshold", {
            threshold: thirtyDaysOut,
          })
          .getCount(),

        base
          .clone()
          .andWhere("batch.expiryDate IS NOT NULL")
          .andWhere("batch.expiryDate < :now", { now })
          .getCount(),
      ]);

    return { totalBatches, totalStockValue, expiringSoon, expired };
  }

  // ==========================================================================
  // FIFO WRITE-OFF (pessimistic locking)
  // ==========================================================================

  async fifoWriteOff(
    warehouseId: string,
    productId: string,
    organizationId: string,
    quantityToWriteOff: number,
    userId: string,
    notes?: string,
  ): Promise<{ batches: { batchId: string; quantityWrittenOff: number }[] }> {
    if (quantityToWriteOff <= 0) {
      throw new BadRequestException("Quantity must be greater than zero");
    }

    const result: { batchId: string; quantityWrittenOff: number }[] = [];

    await this.dataSource.transaction(async (manager) => {
      const batches = await manager
        .createQueryBuilder(InventoryBatch, "batch")
        .setLock("pessimistic_write")
        .where("batch.warehouseId = :warehouseId", { warehouseId })
        .andWhere("batch.productId = :productId", { productId })
        .andWhere("batch.organizationId = :organizationId", { organizationId })
        .andWhere("batch.remainingQuantity > 0")
        .orderBy("batch.receivedAt", "ASC")
        .addOrderBy("batch.expiryDate", "ASC", "NULLS LAST")
        .getMany();

      const totalAvailable = batches.reduce(
        (sum, b) => sum + Number(b.remainingQuantity),
        0,
      );

      if (totalAvailable < quantityToWriteOff) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${totalAvailable}, Requested: ${quantityToWriteOff}`,
        );
      }

      let remaining = quantityToWriteOff;

      for (const batch of batches) {
        if (remaining <= 0) break;

        const batchQty = Number(batch.remainingQuantity);
        const writeOffQty = Math.min(batchQty, remaining);

        batch.remainingQuantity = batchQty - writeOffQty;
        batch.updatedById = userId;
        batch.metadata = {
          ...batch.metadata,
          lastWriteOff: {
            date: new Date().toISOString(),
            quantity: writeOffQty,
            userId,
            notes: notes ?? null,
          },
        };

        await manager.save(InventoryBatch, batch);
        result.push({ batchId: batch.id, quantityWrittenOff: writeOffQty });
        remaining -= writeOffQty;
      }
    });

    return { batches: result };
  }
}
