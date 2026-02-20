import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import {
  StockMovement,
  StockMovementType,
  StockMovementStatus,
  InventoryBatch,
} from './entities/warehouse.entity';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateInventoryBatchDto } from './dto/create-inventory-batch.dto';

@Injectable()
export class StockTakeService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,

    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
  ) {}

  // ============================================================================
  // STOCK MOVEMENT MANAGEMENT
  // ============================================================================

  async createMovement(dto: CreateStockMovementDto, userId: string): Promise<StockMovement> {
    // Validate that at least one warehouse is specified
    if (!dto.fromWarehouseId && !dto.toWarehouseId) {
      throw new BadRequestException('At least one of fromWarehouseId or toWarehouseId must be provided');
    }

    const movement = this.stockMovementRepository.create({
      organizationId: dto.organizationId,
      fromWarehouseId: dto.fromWarehouseId ?? null,
      toWarehouseId: dto.toWarehouseId ?? null,
      productId: dto.productId,
      quantity: dto.quantity,
      unitOfMeasure: dto.unitOfMeasure ?? 'pcs',
      type: dto.type,
      status: StockMovementStatus.PENDING,
      referenceNumber: dto.referenceNumber,
      requestedByUserId: userId,
      cost: dto.cost,
      notes: dto.notes,
      metadata: dto.metadata ?? {},
      created_by_id: userId,
    });

    return this.stockMovementRepository.save(movement);
  }

  async completeMovement(movementId: string, userId: string): Promise<StockMovement> {
    const movement = await this.stockMovementRepository.findOne({
      where: { id: movementId },
    });
    if (!movement) {
      throw new NotFoundException(`Stock movement with ID ${movementId} not found`);
    }

    if (movement.status === StockMovementStatus.COMPLETED) {
      throw new BadRequestException('This movement has already been completed');
    }

    if (movement.status === StockMovementStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled movement');
    }

    movement.status = StockMovementStatus.COMPLETED;
    movement.completedByUserId = userId;
    movement.completedAt = new Date();
    movement.updated_by_id = userId;

    return this.stockMovementRepository.save(movement);
  }

  async cancelMovement(movementId: string, userId: string): Promise<StockMovement> {
    const movement = await this.stockMovementRepository.findOne({
      where: { id: movementId },
    });
    if (!movement) {
      throw new NotFoundException(`Stock movement with ID ${movementId} not found`);
    }

    if (movement.status === StockMovementStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed movement');
    }

    if (movement.status === StockMovementStatus.CANCELLED) {
      throw new BadRequestException('This movement is already cancelled');
    }

    movement.status = StockMovementStatus.CANCELLED;
    movement.updated_by_id = userId;

    return this.stockMovementRepository.save(movement);
  }

  async getMovements(
    organizationId: string,
    filters?: {
      warehouseId?: string;
      productId?: string;
      type?: StockMovementType;
      status?: StockMovementStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      warehouseId,
      productId,
      type,
      status,
      page = 1,
      limit = 20,
    } = filters || {};

    const query = this.stockMovementRepository.createQueryBuilder('movement');

    query.where('movement.organizationId = :organizationId', { organizationId });

    if (warehouseId) {
      query.andWhere(
        '(movement.fromWarehouseId = :warehouseId OR movement.toWarehouseId = :warehouseId)',
        { warehouseId },
      );
    }

    if (productId) {
      query.andWhere('movement.productId = :productId', { productId });
    }

    if (type) {
      query.andWhere('movement.type = :type', { type });
    }

    if (status) {
      query.andWhere('movement.status = :status', { status });
    }

    const total = await query.getCount();

    query.orderBy('movement.requestedAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // INVENTORY BATCH MANAGEMENT
  // ============================================================================

  async createBatch(dto: CreateInventoryBatchDto, userId: string): Promise<InventoryBatch> {
    const batch = this.inventoryBatchRepository.create({
      organizationId: dto.organizationId,
      warehouseId: dto.warehouseId,
      productId: dto.productId,
      batchNumber: dto.batchNumber,
      quantity: dto.quantity,
      remainingQuantity: dto.quantity, // Initially, remaining equals total
      unitOfMeasure: dto.unitOfMeasure ?? 'pcs',
      costPerUnit: dto.costPerUnit,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      notes: dto.notes,
      metadata: dto.metadata ?? {},
      created_by_id: userId,
    });

    return this.inventoryBatchRepository.save(batch);
  }

  /**
   * Deplete stock from batches using FIFO (First In, First Out) strategy.
   * Batches are consumed in order of receivedAt (oldest first),
   * with expiring-soonest prioritized when receivedAt is the same.
   *
   * @returns Array of affected batches with their depleted amounts
   */
  async depleteFromBatch(
    warehouseId: string,
    productId: string,
    organizationId: string,
    quantityToDeplete: number,
    userId: string,
  ): Promise<{ batches: InventoryBatch[]; totalDepleted: number }> {
    if (quantityToDeplete <= 0) {
      throw new BadRequestException('Quantity to deplete must be greater than zero');
    }

    // Get available batches ordered by FIFO (oldest received first, then nearest expiry)
    const batches = await this.inventoryBatchRepository
      .createQueryBuilder('batch')
      .where('batch.warehouseId = :warehouseId', { warehouseId })
      .andWhere('batch.productId = :productId', { productId })
      .andWhere('batch.organizationId = :organizationId', { organizationId })
      .andWhere('batch.remainingQuantity > 0')
      .orderBy('batch.receivedAt', 'ASC')
      .addOrderBy('batch.expiryDate', 'ASC', 'NULLS LAST')
      .getMany();

    if (batches.length === 0) {
      throw new BadRequestException(
        `No available stock for product ${productId} in warehouse ${warehouseId}`,
      );
    }

    // Check total available
    const totalAvailable = batches.reduce(
      (sum, b) => sum + Number(b.remainingQuantity),
      0,
    );

    if (totalAvailable < quantityToDeplete) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${totalAvailable}, Requested: ${quantityToDeplete}`,
      );
    }

    let remaining = quantityToDeplete;
    const affectedBatches: InventoryBatch[] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const batchRemaining = Number(batch.remainingQuantity);
      const depleteAmount = Math.min(batchRemaining, remaining);

      batch.remainingQuantity = batchRemaining - depleteAmount;
      batch.updated_by_id = userId;

      const savedBatch = await this.inventoryBatchRepository.save(batch);
      affectedBatches.push(savedBatch);

      remaining -= depleteAmount;
    }

    return {
      batches: affectedBatches,
      totalDepleted: quantityToDeplete - remaining,
    };
  }

  async getBatches(
    organizationId: string,
    filters?: {
      warehouseId?: string;
      productId?: string;
      onlyAvailable?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      warehouseId,
      productId,
      onlyAvailable,
      page = 1,
      limit = 20,
    } = filters || {};

    const query = this.inventoryBatchRepository.createQueryBuilder('batch');

    query.where('batch.organizationId = :organizationId', { organizationId });

    if (warehouseId) {
      query.andWhere('batch.warehouseId = :warehouseId', { warehouseId });
    }

    if (productId) {
      query.andWhere('batch.productId = :productId', { productId });
    }

    if (onlyAvailable) {
      query.andWhere('batch.remainingQuantity > 0');
    }

    const total = await query.getCount();

    query.orderBy('batch.receivedAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
