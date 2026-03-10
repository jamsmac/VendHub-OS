/**
 * Products Batch Service
 * FIFO batch tracking, expiry, stock summary
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThanOrEqual } from "typeorm";
import {
  IngredientBatch,
  IngredientBatchStatus,
} from "./entities/product.entity";
import { CreateBatchDto } from "./dto/create-batch.dto";
import { ProductsCoreService } from "./products-core.service";

@Injectable()
export class ProductsBatchService {
  constructor(
    @InjectRepository(IngredientBatch)
    private readonly ingredientBatchRepository: Repository<IngredientBatch>,
    private readonly coreService: ProductsCoreService,
  ) {}

  // ── Batch CRUD ───────────────────────────────────────────

  async createBatch(
    productId: string,
    organizationId: string,
    dto: CreateBatchDto,
    userId: string,
  ): Promise<IngredientBatch> {
    await this.coreService.findById(productId, organizationId);

    const batch = this.ingredientBatchRepository.create({
      productId,
      organizationId,
      batchNumber: dto.batchNumber,
      quantity: dto.quantity,
      remainingQuantity: dto.quantity,
      unitOfMeasure: dto.unitOfMeasure,
      purchasePrice: dto.purchasePrice,
      totalCost:
        dto.totalCost ??
        ((dto.purchasePrice
          ? dto.purchasePrice * dto.quantity
          : undefined) as number),
      supplierId: dto.supplierId,
      supplierBatchNumber: dto.supplierBatchNumber,
      invoiceNumber: dto.invoiceNumber,
      manufactureDate: dto.manufactureDate,
      expiryDate: dto.expiryDate,
      storageLocation: dto.storageLocation,
      notes: dto.notes,
      status: IngredientBatchStatus.IN_STOCK,
      createdById: userId,
    });

    return this.ingredientBatchRepository.save(batch);
  }

  async depleteFromBatch(
    productId: string,
    organizationId: string,
    quantityToDeplete: number,
    userId?: string,
    reason?: string,
    referenceId?: string,
    referenceType?: string,
  ): Promise<{
    depletedFrom: { batchId: string; quantity: number }[];
    remaining: number;
  }> {
    if (quantityToDeplete <= 0) {
      throw new BadRequestException("Quantity to deplete must be positive");
    }

    const batches = await this.ingredientBatchRepository.find({
      where: {
        productId,
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
      },
      order: { receivedDate: "ASC", createdAt: "ASC" },
    });

    let remaining = quantityToDeplete;
    const depletedFrom: { batchId: string; quantity: number }[] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const available =
        Number(batch.remainingQuantity) - Number(batch.reservedQuantity);
      if (available <= 0) continue;

      const toDeduct = Math.min(available, remaining);
      batch.remainingQuantity = Number(batch.remainingQuantity) - toDeduct;
      batch.updatedById = userId ?? null;

      if (batch.remainingQuantity <= 0) {
        batch.status = IngredientBatchStatus.DEPLETED;
      }

      const history = ((batch.metadata as Record<string, unknown>)
        ?.deductionHistory ?? []) as Record<string, unknown>[];
      history.push({
        date: new Date().toISOString(),
        quantity: toDeduct,
        userId: userId ?? null,
        ...(reason && { reason }),
        ...(referenceId && { referenceId }),
        ...(referenceType && { referenceType }),
      });
      batch.metadata = { ...batch.metadata, deductionHistory: history };

      await this.ingredientBatchRepository.save(batch);
      depletedFrom.push({ batchId: batch.id, quantity: toDeduct });
      remaining -= toDeduct;
    }

    return { depletedFrom, remaining };
  }

  async getAvailableBatches(
    productId: string,
    organizationId: string,
  ): Promise<IngredientBatch[]> {
    return this.ingredientBatchRepository.find({
      where: {
        productId,
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
      },
      order: { receivedDate: "ASC", createdAt: "ASC" },
    });
  }

  async updateBatch(
    batchId: string,
    organizationId: string,
    data: Partial<IngredientBatch>,
    userId?: string,
  ): Promise<IngredientBatch> {
    const batch = await this.ingredientBatchRepository.findOne({
      where: { id: batchId, organizationId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    Object.assign(batch, { ...data, updatedById: userId ?? null });

    if (Number(batch.remainingQuantity) <= 0) {
      batch.status = IngredientBatchStatus.DEPLETED;
    }

    return this.ingredientBatchRepository.save(batch);
  }

  async deleteBatch(batchId: string, organizationId: string): Promise<void> {
    const batch = await this.ingredientBatchRepository.findOne({
      where: { id: batchId, organizationId },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }
    await this.ingredientBatchRepository.softDelete(batchId);
  }

  // ── Batch Expiry & Stock Summary ─────────────────────────

  async checkExpiredBatches(
    organizationId: string,
  ): Promise<{ markedExpired: number }> {
    const today = new Date();
    const batches = await this.ingredientBatchRepository.find({
      where: {
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
        expiryDate: LessThanOrEqual(today),
      },
    });

    for (const batch of batches) {
      batch.status = IngredientBatchStatus.EXPIRED;
    }

    if (batches.length > 0) {
      await this.ingredientBatchRepository.save(batches);
    }

    return { markedExpired: batches.length };
  }

  async getExpiringBatches(
    organizationId: string,
    days = 7,
  ): Promise<IngredientBatch[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.ingredientBatchRepository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.product", "product")
      .where("batch.organizationId = :organizationId", { organizationId })
      .andWhere("batch.status = :status", {
        status: IngredientBatchStatus.IN_STOCK,
      })
      .andWhere("batch.expiryDate >= :today", { today })
      .andWhere("batch.expiryDate <= :futureDate", { futureDate })
      .orderBy("batch.expiryDate", "ASC")
      .getMany();
  }

  async getStockByProduct(
    productId: string,
    organizationId: string,
  ): Promise<{
    totalStock: number;
    batchCount: number;
    oldestExpiry: Date | null;
    newestExpiry: Date | null;
    totalValue: number;
  }> {
    await this.coreService.findById(productId, organizationId);

    const batches = await this.ingredientBatchRepository.find({
      where: {
        productId,
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
      },
    });

    let totalStock = 0;
    let totalValue = 0;
    let oldestExpiry: Date | null = null;
    let newestExpiry: Date | null = null;

    for (const b of batches) {
      const remaining = Number(b.remainingQuantity);
      totalStock += remaining;
      totalValue += remaining * Number(b.purchasePrice || 0);
      if (b.expiryDate) {
        if (!oldestExpiry || b.expiryDate < oldestExpiry)
          oldestExpiry = b.expiryDate;
        if (!newestExpiry || b.expiryDate > newestExpiry)
          newestExpiry = b.expiryDate;
      }
    }

    return {
      totalStock,
      batchCount: batches.length,
      oldestExpiry,
      newestExpiry,
      totalValue,
    };
  }

  async getStockSummary(organizationId: string): Promise<{
    totalProducts: number;
    totalBatches: number;
    totalValue: number;
    expiringWithin7Days: number;
  }> {
    const batches = await this.ingredientBatchRepository.find({
      where: {
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
      },
    });

    const productIds = new Set(batches.map((b) => b.productId));
    let totalValue = 0;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    let expiringCount = 0;

    for (const b of batches) {
      totalValue += Number(b.remainingQuantity) * Number(b.purchasePrice || 0);
      if (b.expiryDate && b.expiryDate <= sevenDaysFromNow) {
        expiringCount++;
      }
    }

    return {
      totalProducts: productIds.size,
      totalBatches: batches.length,
      totalValue,
      expiringWithin7Days: expiringCount,
    };
  }
}
