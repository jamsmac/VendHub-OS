/**
 * Inventory Service for VendHub OS
 *
 * 3-Level Inventory System with Pessimistic Locking:
 * Level 1: Warehouse (central storage)
 * Level 2: Operator (assigned for delivery)
 * Level 3: Machine (loaded in vending machine)
 *
 * Orchestrator: delegates transfers, reservations, and adjustments
 * to dedicated sub-services while keeping queries and summaries here.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  WarehouseInventory,
  OperatorInventory,
  MachineInventory,
  InventoryMovement,
  InventoryReservation,
  InventoryAdjustment,
  MovementType,
  ReservationStatus,
  InventoryLevel,
  AdjustmentType,
} from "./entities/inventory.entity";
import { InventoryTransferService } from "./services/inventory-transfer.service";
import { InventoryReservationService } from "./services/inventory-reservation.service";
import { InventoryAdjustmentService } from "./services/inventory-adjustment.service";

// ============================================================================
// DTOs
// ============================================================================

export interface TransferWarehouseToOperatorDto {
  organizationId: string;
  operatorId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

export interface TransferOperatorToWarehouseDto {
  organizationId: string;
  operatorId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

export interface TransferOperatorToMachineDto {
  organizationId: string;
  operatorId: string;
  machineId: string;
  productId: string;
  quantity: number;
  taskId?: string;
  notes?: string;
  operationDate?: Date;
}

export interface TransferMachineToOperatorDto {
  organizationId: string;
  operatorId: string;
  machineId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

export interface RecordSaleDto {
  organizationId: string;
  machineId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  transactionId?: string;
}

export interface CreateReservationDto {
  organizationId: string;
  taskId: string;
  productId: string;
  quantity: number;
  inventoryLevel: InventoryLevel;
  referenceId: string;
  expiresAt?: Date;
  notes?: string;
  createdByUserId?: string;
}

export interface AdjustInventoryDto {
  organizationId: string;
  inventoryLevel: InventoryLevel;
  referenceId: string;
  productId: string;
  actualQuantity: number;
  adjustmentType: AdjustmentType;
  reason?: string;
  notes?: string;
  adjustedByUserId: string;
}

export interface WarehouseStockInDto {
  organizationId: string;
  productId: string;
  quantity: number;
  unitCost?: number;
  locationInWarehouse?: string;
  notes?: string;
  performedByUserId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// MAIN SERVICE (Orchestrator)
// ============================================================================

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly warehouseRepo: Repository<WarehouseInventory>,
    @InjectRepository(OperatorInventory)
    private readonly operatorRepo: Repository<OperatorInventory>,
    @InjectRepository(MachineInventory)
    private readonly machineRepo: Repository<MachineInventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    private readonly transferService: InventoryTransferService,
    private readonly reservationService: InventoryReservationService,
    private readonly adjustmentService: InventoryAdjustmentService,
  ) {}

  // ==========================================================================
  // WAREHOUSE INVENTORY (Level 1)
  // ==========================================================================

  /**
   * Get all warehouse inventory for organization (paginated)
   */
  async getWarehouseInventory(
    organizationId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: WarehouseInventory[]; total: number }> {
    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.warehouseRepo.findAndCount({
      where: { organizationId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total };
  }

  /**
   * Get warehouse inventory for specific product
   */
  async getWarehouseInventoryByProduct(
    organizationId: string,
    productId: string,
  ): Promise<WarehouseInventory | null> {
    return this.warehouseRepo.findOne({
      where: { organizationId, productId },
    });
  }

  /**
   * Get low stock items in warehouse
   */
  async getWarehouseLowStock(
    organizationId: string,
  ): Promise<WarehouseInventory[]> {
    return this.warehouseRepo
      .createQueryBuilder("wi")
      .where("wi.organizationId = :organizationId", { organizationId })
      .andWhere("wi.currentQuantity <= wi.minStockLevel")
      .orderBy("wi.currentQuantity", "ASC")
      .getMany();
  }

  /**
   * Add stock to warehouse (purchase, receiving)
   */
  async warehouseStockIn(
    dto: WarehouseStockInDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; movement: InventoryMovement }> {
    return this.transferService.warehouseStockIn(dto, userId);
  }

  // ==========================================================================
  // OPERATOR INVENTORY (Level 2)
  // ==========================================================================

  /**
   * Get operator inventory (paginated)
   */
  async getOperatorInventory(
    organizationId: string,
    operatorId: string,
    page = 1,
    limit = 50,
  ): Promise<{ data: OperatorInventory[]; total: number }> {
    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.operatorRepo.findAndCount({
      where: { organizationId, operatorId },
      order: { createdAt: "DESC" },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total };
  }

  /**
   * Get operator inventory for specific product
   */
  async getOperatorInventoryByProduct(
    organizationId: string,
    operatorId: string,
    productId: string,
  ): Promise<OperatorInventory | null> {
    return this.operatorRepo.findOne({
      where: { organizationId, operatorId, productId },
    });
  }

  // ==========================================================================
  // MACHINE INVENTORY (Level 3)
  // ==========================================================================

  /**
   * Get machine inventory
   */
  async getMachineInventory(
    organizationId: string,
    machineId: string,
  ): Promise<MachineInventory[]> {
    return this.machineRepo.find({
      where: { organizationId, machineId },
      order: { slotNumber: "ASC" },
    });
  }

  /**
   * Get machines needing refill
   */
  async getMachinesNeedingRefill(
    organizationId: string,
  ): Promise<MachineInventory[]> {
    return this.machineRepo
      .createQueryBuilder("mi")
      .where("mi.organizationId = :organizationId", { organizationId })
      .andWhere("mi.currentQuantity <= mi.minStockLevel")
      .orderBy("mi.currentQuantity", "ASC")
      .getMany();
  }

  // ==========================================================================
  // TRANSFERS (delegated to InventoryTransferService)
  // ==========================================================================

  /**
   * Transfer: Warehouse -> Operator
   */
  async transferWarehouseToOperator(
    dto: TransferWarehouseToOperatorDto,
    userId: string,
  ): Promise<{
    warehouse: WarehouseInventory;
    operator: OperatorInventory;
    movement: InventoryMovement;
  }> {
    return this.transferService.transferWarehouseToOperator(dto, userId);
  }

  /**
   * Transfer: Operator -> Warehouse (return)
   */
  async transferOperatorToWarehouse(
    dto: TransferOperatorToWarehouseDto,
    userId: string,
  ): Promise<{
    warehouse: WarehouseInventory;
    operator: OperatorInventory;
    movement: InventoryMovement;
  }> {
    return this.transferService.transferOperatorToWarehouse(dto, userId);
  }

  /**
   * Transfer: Operator -> Machine (refill)
   */
  async transferOperatorToMachine(
    dto: TransferOperatorToMachineDto,
    userId: string,
  ): Promise<{
    operator: OperatorInventory;
    machine: MachineInventory;
    movement: InventoryMovement;
  }> {
    return this.transferService.transferOperatorToMachine(dto, userId);
  }

  /**
   * Transfer: Machine -> Operator (removal)
   */
  async transferMachineToOperator(
    dto: TransferMachineToOperatorDto,
    userId: string,
  ): Promise<{
    machine: MachineInventory;
    operator: OperatorInventory;
    movement: InventoryMovement;
  }> {
    return this.transferService.transferMachineToOperator(dto, userId);
  }

  // ==========================================================================
  // SALES (delegated to InventoryTransferService)
  // ==========================================================================

  /**
   * Record a sale (reduce machine inventory)
   */
  async recordSale(
    dto: RecordSaleDto,
    userId?: string,
  ): Promise<{ machine: MachineInventory; movement: InventoryMovement }> {
    return this.transferService.recordSale(dto, userId);
  }

  // ==========================================================================
  // RESERVATIONS (delegated to InventoryReservationService)
  // ==========================================================================

  /**
   * Create inventory reservation for a task
   */
  async createReservation(
    dto: CreateReservationDto,
  ): Promise<InventoryReservation> {
    return this.reservationService.createReservation(dto);
  }

  /**
   * Fulfill reservation (mark as completed)
   */
  async fulfillReservation(
    reservationId: string,
    fulfilledQuantity: number,
    _userId?: string,
  ): Promise<InventoryReservation> {
    return this.reservationService.fulfillReservation(
      reservationId,
      fulfilledQuantity,
      _userId,
    );
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(
    reservationId: string,
    reason?: string,
    userId?: string,
  ): Promise<InventoryReservation> {
    return this.reservationService.cancelReservation(
      reservationId,
      reason,
      userId,
    );
  }

  /**
   * Get reservations for task
   */
  async getReservationsByTask(
    organizationId: string,
    taskId: string,
  ): Promise<InventoryReservation[]> {
    return this.reservationService.getReservationsByTask(
      organizationId,
      taskId,
    );
  }

  /**
   * Get active reservations
   */
  async getActiveReservations(
    organizationId: string,
  ): Promise<InventoryReservation[]> {
    return this.reservationService.getActiveReservations(organizationId);
  }

  /**
   * Confirm a pending reservation
   */
  async confirmReservation(
    reservationId: string,
    adjustedQuantity?: number,
  ): Promise<InventoryReservation> {
    return this.reservationService.confirmReservation(
      reservationId,
      adjustedQuantity,
    );
  }

  /**
   * Get reservation by ID
   */
  async getReservationById(
    organizationId: string,
    id: string,
  ): Promise<InventoryReservation> {
    return this.reservationService.getReservationById(organizationId, id);
  }

  /**
   * Get reservations with filters (paginated)
   */
  async getReservations(
    organizationId: string,
    filters?: {
      taskId?: string;
      productId?: string;
      status?: ReservationStatus;
      inventoryLevel?: InventoryLevel;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: InventoryReservation[]; total: number }> {
    return this.reservationService.getReservations(organizationId, filters);
  }

  /**
   * Get reservations summary for organization
   */
  async getReservationsSummary(organizationId: string): Promise<{
    byStatus: Record<string, number>;
    totalActiveReservedQuantity: number;
    expiringWithin24h: number;
  }> {
    return this.reservationService.getReservationsSummary(organizationId);
  }

  // ==========================================================================
  // ADJUSTMENTS (delegated to InventoryAdjustmentService)
  // ==========================================================================

  /**
   * Create inventory adjustment
   */
  async createAdjustment(dto: AdjustInventoryDto): Promise<{
    adjustment: InventoryAdjustment;
    movement?: InventoryMovement;
  }> {
    return this.adjustmentService.createAdjustment(dto);
  }

  // ==========================================================================
  // MOVEMENTS HISTORY
  // ==========================================================================

  /**
   * Get movement history with filters
   */
  async getMovements(
    organizationId: string,
    filters?: {
      productId?: string;
      machineId?: string;
      operatorId?: string;
      movementType?: MovementType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ movements: InventoryMovement[]; total: number }> {
    const query = this.movementRepo
      .createQueryBuilder("m")
      .where("m.organizationId = :organizationId", { organizationId });

    if (filters?.productId) {
      query.andWhere("m.productId = :productId", {
        productId: filters.productId,
      });
    }

    if (filters?.machineId) {
      query.andWhere("m.machineId = :machineId", {
        machineId: filters.machineId,
      });
    }

    if (filters?.operatorId) {
      query.andWhere("m.operatorId = :operatorId", {
        operatorId: filters.operatorId,
      });
    }

    if (filters?.movementType) {
      query.andWhere("m.movementType = :movementType", {
        movementType: filters.movementType,
      });
    }

    if (filters?.startDate) {
      query.andWhere("m.createdAt >= :startDate", {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      query.andWhere("m.createdAt <= :endDate", { endDate: filters.endDate });
    }

    const total = await query.getCount();

    query.orderBy("m.createdAt", "DESC");

    const takeLimit = Math.min(filters?.limit || 20, 100);
    query.take(takeLimit);

    if (filters?.offset) {
      query.skip(filters.offset);
    }

    const movements = await query.getMany();

    return { movements, total };
  }

  // ==========================================================================
  // REPORTS & ANALYTICS
  // ==========================================================================

  /**
   * Get inventory summary for organization
   */
  async getInventorySummary(organizationId: string): Promise<{
    warehouse: {
      totalProducts: number;
      totalValue: number;
      lowStockCount: number;
    };
    operators: { totalOperators: number; totalProducts: number };
    machines: {
      totalMachines: number;
      totalProducts: number;
      needsRefillCount: number;
    };
  }> {
    // Warehouse stats
    const warehouseStats = await this.warehouseRepo
      .createQueryBuilder("wi")
      .select("COUNT(DISTINCT wi.productId)", "totalProducts")
      .addSelect("SUM(wi.currentQuantity * wi.avgPurchasePrice)", "totalValue")
      .addSelect(
        "SUM(CASE WHEN wi.currentQuantity <= wi.minStockLevel THEN 1 ELSE 0 END)",
        "lowStockCount",
      )
      .where("wi.organizationId = :organizationId", { organizationId })
      .getRawOne();

    // Operator stats
    const operatorStats = await this.operatorRepo
      .createQueryBuilder("oi")
      .select("COUNT(DISTINCT oi.operatorId)", "totalOperators")
      .addSelect("COUNT(DISTINCT oi.productId)", "totalProducts")
      .where("oi.organizationId = :organizationId", { organizationId })
      .andWhere("oi.currentQuantity > 0")
      .getRawOne();

    // Machine stats
    const machineStats = await this.machineRepo
      .createQueryBuilder("mi")
      .select("COUNT(DISTINCT mi.machineId)", "totalMachines")
      .addSelect("COUNT(DISTINCT mi.productId)", "totalProducts")
      .addSelect(
        "SUM(CASE WHEN mi.currentQuantity <= mi.minStockLevel THEN 1 ELSE 0 END)",
        "needsRefillCount",
      )
      .where("mi.organizationId = :organizationId", { organizationId })
      .getRawOne();

    return {
      warehouse: {
        totalProducts: parseInt(warehouseStats?.totalProducts || "0"),
        totalValue: parseFloat(warehouseStats?.totalValue || "0"),
        lowStockCount: parseInt(warehouseStats?.lowStockCount || "0"),
      },
      operators: {
        totalOperators: parseInt(operatorStats?.totalOperators || "0"),
        totalProducts: parseInt(operatorStats?.totalProducts || "0"),
      },
      machines: {
        totalMachines: parseInt(machineStats?.totalMachines || "0"),
        totalProducts: parseInt(machineStats?.totalProducts || "0"),
        needsRefillCount: parseInt(machineStats?.needsRefillCount || "0"),
      },
    };
  }
}
