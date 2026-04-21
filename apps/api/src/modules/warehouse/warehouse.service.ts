import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Warehouse,
  WarehouseType,
  StockMovement,
  StockMovementType,
  StockMovementStatus,
  InventoryBatch,
} from "./entities/warehouse.entity";
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
} from "./dto/create-warehouse.dto";
import { stripProtectedFields } from "../../common/utils";

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,

    @InjectRepository(StockMovement)
    private readonly stockMovementRepository: Repository<StockMovement>,

    @InjectRepository(InventoryBatch)
    private readonly inventoryBatchRepository: Repository<InventoryBatch>,
  ) {}

  // ============================================================================
  // WAREHOUSE CRUD
  // ============================================================================

  async create(dto: CreateWarehouseDto, userId?: string): Promise<Warehouse> {
    const warehouse = this.warehouseRepository.create({
      ...dto,
      ...(userId !== undefined && { createdById: userId }),
    });
    return this.warehouseRepository.save(warehouse);
  }

  async findAll(
    organizationId: string,
    filters?: {
      type?: WarehouseType;
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { type, isActive, search, page = 1, limit = 20 } = filters || {};

    const query = this.warehouseRepository.createQueryBuilder("warehouse");

    query.where("warehouse.organizationId = :organizationId", {
      organizationId,
    });

    if (type) {
      query.andWhere("warehouse.type = :type", { type });
    }

    if (isActive !== undefined) {
      query.andWhere("warehouse.isActive = :isActive", { isActive });
    }

    if (search) {
      query.andWhere(
        "(warehouse.name ILIKE :search OR warehouse.code ILIKE :search OR warehouse.address ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy("warehouse.name", "ASC");
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

  async findById(
    id: string,
    organizationId?: string,
  ): Promise<Warehouse | null> {
    const where: Record<string, string> = { id };
    if (organizationId) where.organizationId = organizationId;
    return this.warehouseRepository.findOne({
      where,
    });
  }

  async update(
    id: string,
    dto: UpdateWarehouseDto,
    organizationId: string,
    userId?: string,
  ): Promise<Warehouse> {
    const warehouse = await this.findById(id, organizationId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    Object.assign(
      warehouse,
      stripProtectedFields(dto as Record<string, unknown>),
    );
    warehouse.updatedById = userId ?? warehouse.updatedById;

    return this.warehouseRepository.save(warehouse);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const warehouse = await this.findById(id, organizationId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    await this.warehouseRepository.softDelete(id);
  }

  // ============================================================================
  // STOCK TRANSFER
  // ============================================================================

  /**
   * Create a stock transfer between warehouses.
   * Creates a pending stock movement and validates both warehouses exist.
   */
  async transferStock(
    organizationId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    productId: string,
    quantity: number,
    userId: string,
    options?: { referenceNumber?: string; cost?: number; notes?: string },
  ): Promise<StockMovement> {
    // Validate both warehouses exist and belong to the organization
    const fromWarehouse = await this.warehouseRepository.findOne({
      where: { id: fromWarehouseId, organizationId },
    });
    if (!fromWarehouse) {
      throw new NotFoundException(
        `Source warehouse with ID ${fromWarehouseId} not found`,
      );
    }

    const toWarehouse = await this.warehouseRepository.findOne({
      where: { id: toWarehouseId, organizationId },
    });
    if (!toWarehouse) {
      throw new NotFoundException(
        `Destination warehouse with ID ${toWarehouseId} not found`,
      );
    }

    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException(
        "Source and destination warehouses must be different",
      );
    }

    const movement = this.stockMovementRepository.create({
      organizationId,
      fromWarehouseId,
      toWarehouseId,
      productId,
      quantity,
      type: StockMovementType.TRANSFER,
      status: StockMovementStatus.IN_TRANSIT,
      requestedByUserId: userId,
      ...(options?.referenceNumber !== undefined && {
        referenceNumber: options.referenceNumber,
      }),
      ...(options?.cost !== undefined && { cost: options.cost }),
      ...(options?.notes !== undefined && { notes: options.notes }),
      createdById: userId,
    });

    return this.stockMovementRepository.save(movement);
  }

  // ============================================================================
  // WAREHOUSE INVENTORY
  // ============================================================================

  /**
   * Get the current inventory for a warehouse, aggregated by product.
   */
  async getWarehouseInventory(warehouseId: string, organizationId: string) {
    const warehouse = await this.warehouseRepository.findOne({
      where: { id: warehouseId, organizationId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    const inventory = await this.inventoryBatchRepository
      .createQueryBuilder("batch")
      .select("batch.productId", "productId")
      .addSelect("SUM(batch.remainingQuantity)", "totalQuantity")
      .addSelect("COUNT(batch.id)", "batchCount")
      .addSelect("MIN(batch.expiryDate)", "nearestExpiry")
      .where("batch.warehouseId = :warehouseId", { warehouseId })
      .andWhere("batch.organizationId = :organizationId", { organizationId })
      .andWhere("batch.remainingQuantity > 0")
      .groupBy("batch.productId")
      .orderBy('"totalQuantity"', "DESC")
      .getRawMany();

    return {
      warehouse,
      inventory,
    };
  }
}
