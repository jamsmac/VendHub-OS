/**
 * Inventory Service for VendHub OS
 *
 * 3-Level Inventory System with Pessimistic Locking:
 * Level 1: Warehouse (central storage)
 * Level 2: Operator (assigned for delivery)
 * Level 3: Machine (loaded in vending machine)
 *
 * All transfers use pessimistic locking to prevent race conditions.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  WarehouseInventory,
  OperatorInventory,
  MachineInventory,
  InventoryMovement,
  InventoryReservation,
  InventoryAdjustment,
  InventoryCount,
  InventoryCountItem,
  MovementType,
  ReservationStatus,
  InventoryLevel,
  AdjustmentType,
} from './entities/inventory.entity';

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
// MAIN SERVICE
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
    @InjectRepository(InventoryReservation)
    private readonly reservationRepo: Repository<InventoryReservation>,
    @InjectRepository(InventoryAdjustment)
    private readonly adjustmentRepo: Repository<InventoryAdjustment>,
    @InjectRepository(InventoryCount)
    private readonly countRepo: Repository<InventoryCount>,
    @InjectRepository(InventoryCountItem)
    private readonly countItemRepo: Repository<InventoryCountItem>,
    private readonly dataSource: DataSource,
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
      order: { created_at: 'DESC' },
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
  async getWarehouseLowStock(organizationId: string): Promise<WarehouseInventory[]> {
    return this.warehouseRepo
      .createQueryBuilder('wi')
      .where('wi.organizationId = :organizationId', { organizationId })
      .andWhere('wi.currentQuantity <= wi.minStockLevel')
      .orderBy('wi.currentQuantity', 'ASC')
      .getMany();
  }

  /**
   * Add stock to warehouse (purchase, receiving)
   */
  async warehouseStockIn(
    dto: WarehouseStockInDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; movement: InventoryMovement }> {
    return this.dataSource.transaction(async (manager) => {
      // Find or create warehouse inventory
      let warehouse = await manager.findOne(WarehouseInventory, {
        where: {
          organizationId: dto.organizationId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      const previousQty = warehouse ? Number(warehouse.currentQuantity) : 0;
      const newQty = dto.quantity;

      if (!warehouse) {
        warehouse = manager.create(WarehouseInventory, {
          organizationId: dto.organizationId,
          productId: dto.productId,
          currentQuantity: 0,
          reservedQuantity: 0,
          minStockLevel: 0,
        });
      }

      // Update quantity and prices
      warehouse.currentQuantity = previousQty + newQty;
      warehouse.lastRestockedAt = new Date();

      if (dto.unitCost) {
        // Calculate weighted average price
        const totalValue = previousQty * Number(warehouse.avgPurchasePrice || 0) + newQty * dto.unitCost;
        warehouse.avgPurchasePrice = totalValue / (previousQty + newQty);
        warehouse.lastPurchasePrice = dto.unitCost;
      }

      if (dto.locationInWarehouse) {
        warehouse.locationInWarehouse = dto.locationInWarehouse;
      }

      await manager.save(WarehouseInventory, warehouse);

      // Create movement record
      const movement = manager.create(InventoryMovement, {
        organizationId: dto.organizationId,
        movementType: MovementType.WAREHOUSE_IN,
        productId: dto.productId,
        quantity: dto.quantity,
        performedByUserId: userId,
        operationDate: new Date(),
        notes: dto.notes || `Stock received: ${dto.quantity}`,
        metadata: dto.metadata,
        unitCost: dto.unitCost,
        totalCost: dto.unitCost ? dto.unitCost * dto.quantity : undefined,
      });

      await manager.save(InventoryMovement, movement);

      this.logger.log(
        `Warehouse stock in: product=${dto.productId}, qty=${dto.quantity}, org=${dto.organizationId}`,
      );

      return { warehouse, movement };
    });
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
      order: { created_at: 'DESC' },
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
      order: { slotNumber: 'ASC' },
    });
  }

  /**
   * Get machines needing refill
   */
  async getMachinesNeedingRefill(organizationId: string): Promise<MachineInventory[]> {
    return this.machineRepo
      .createQueryBuilder('mi')
      .where('mi.organizationId = :organizationId', { organizationId })
      .andWhere('mi.currentQuantity <= mi.minStockLevel')
      .orderBy('mi.currentQuantity', 'ASC')
      .getMany();
  }

  // ==========================================================================
  // TRANSFERS (Pessimistic Locking)
  // ==========================================================================

  /**
   * Transfer: Warehouse -> Operator
   * Uses pessimistic locking to prevent race conditions
   */
  async transferWarehouseToOperator(
    dto: TransferWarehouseToOperatorDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory; movement: InventoryMovement }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock and get warehouse inventory
      const warehouse = await manager.findOne(WarehouseInventory, {
        where: {
          organizationId: dto.organizationId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!warehouse) {
        throw new NotFoundException(
          `Product ${dto.productId} not found in warehouse`,
        );
      }

      const availableQty = warehouse.availableQuantity;
      const requestedQty = Number(dto.quantity);

      if (availableQty < requestedQty) {
        throw new BadRequestException(
          `Insufficient warehouse stock. Available: ${availableQty}, Requested: ${requestedQty}`,
        );
      }

      // Decrease warehouse quantity
      warehouse.currentQuantity = Number(warehouse.currentQuantity) - requestedQty;
      await manager.save(WarehouseInventory, warehouse);

      // Find or create operator inventory
      let operator = await manager.findOne(OperatorInventory, {
        where: {
          organizationId: dto.organizationId,
          operatorId: dto.operatorId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!operator) {
        operator = manager.create(OperatorInventory, {
          organizationId: dto.organizationId,
          operatorId: dto.operatorId,
          productId: dto.productId,
          currentQuantity: 0,
          reservedQuantity: 0,
        });
      }

      // Increase operator quantity
      operator.currentQuantity = Number(operator.currentQuantity) + requestedQty;
      operator.lastReceivedAt = new Date();
      await manager.save(OperatorInventory, operator);

      // Create movement record
      const movement = manager.create(InventoryMovement, {
        organizationId: dto.organizationId,
        movementType: MovementType.WAREHOUSE_TO_OPERATOR,
        productId: dto.productId,
        quantity: dto.quantity,
        performedByUserId: userId,
        operatorId: dto.operatorId,
        operationDate: new Date(),
        notes: dto.notes || `Issued to operator: ${dto.quantity}`,
        unitCost: warehouse.avgPurchasePrice,
        totalCost: warehouse.avgPurchasePrice * requestedQty,
      });

      await manager.save(InventoryMovement, movement);

      this.logger.log(
        `Transfer W->O: product=${dto.productId}, qty=${dto.quantity}, operator=${dto.operatorId}`,
      );

      return { warehouse, operator, movement };
    });
  }

  /**
   * Transfer: Operator -> Warehouse (return)
   * Uses pessimistic locking to prevent race conditions
   */
  async transferOperatorToWarehouse(
    dto: TransferOperatorToWarehouseDto,
    userId: string,
  ): Promise<{ warehouse: WarehouseInventory; operator: OperatorInventory; movement: InventoryMovement }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock and get operator inventory
      const operator = await manager.findOne(OperatorInventory, {
        where: {
          organizationId: dto.organizationId,
          operatorId: dto.operatorId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!operator) {
        throw new NotFoundException(
          `Product ${dto.productId} not found with operator ${dto.operatorId}`,
        );
      }

      const operatorQty = Number(operator.currentQuantity);
      const requestedQty = Number(dto.quantity);

      if (operatorQty < requestedQty) {
        throw new BadRequestException(
          `Insufficient operator stock. Available: ${operatorQty}, Requested: ${requestedQty}`,
        );
      }

      // Decrease operator quantity
      operator.currentQuantity = operatorQty - requestedQty;
      await manager.save(OperatorInventory, operator);

      // Lock and get warehouse inventory
      const warehouse = await manager.findOne(WarehouseInventory, {
        where: {
          organizationId: dto.organizationId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!warehouse) {
        throw new NotFoundException(
          `Product ${dto.productId} not found in warehouse`,
        );
      }

      // Increase warehouse quantity
      warehouse.currentQuantity = Number(warehouse.currentQuantity) + requestedQty;
      await manager.save(WarehouseInventory, warehouse);

      // Create movement record
      const movement = manager.create(InventoryMovement, {
        organizationId: dto.organizationId,
        movementType: MovementType.OPERATOR_TO_WAREHOUSE,
        productId: dto.productId,
        quantity: dto.quantity,
        performedByUserId: userId,
        operatorId: dto.operatorId,
        operationDate: new Date(),
        notes: dto.notes || `Returned to warehouse: ${dto.quantity}`,
      });

      await manager.save(InventoryMovement, movement);

      this.logger.log(
        `Transfer O->W: product=${dto.productId}, qty=${dto.quantity}, operator=${dto.operatorId}`,
      );

      return { warehouse, operator, movement };
    });
  }

  /**
   * Transfer: Operator -> Machine (refill)
   * CRITICAL: Called when completing refill tasks
   * Uses pessimistic locking to prevent race conditions
   */
  async transferOperatorToMachine(
    dto: TransferOperatorToMachineDto,
    userId: string,
  ): Promise<{ operator: OperatorInventory; machine: MachineInventory; movement: InventoryMovement }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock and get operator inventory
      const operator = await manager.findOne(OperatorInventory, {
        where: {
          organizationId: dto.organizationId,
          operatorId: dto.operatorId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!operator) {
        throw new NotFoundException(
          `Product ${dto.productId} not found with operator ${dto.operatorId}`,
        );
      }

      const operatorQty = Number(operator.currentQuantity);
      const requestedQty = Number(dto.quantity);

      if (operatorQty < requestedQty) {
        throw new BadRequestException(
          `Insufficient operator stock. Available: ${operatorQty}, Requested: ${requestedQty}`,
        );
      }

      // Decrease operator quantity
      operator.currentQuantity = operatorQty - requestedQty;
      if (dto.taskId) {
        operator.lastTaskId = dto.taskId;
      }
      await manager.save(OperatorInventory, operator);

      // Find or create machine inventory
      let machine = await manager.findOne(MachineInventory, {
        where: {
          organizationId: dto.organizationId,
          machineId: dto.machineId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!machine) {
        machine = manager.create(MachineInventory, {
          organizationId: dto.organizationId,
          machineId: dto.machineId,
          productId: dto.productId,
          currentQuantity: 0,
          minStockLevel: 0,
          totalSold: 0,
        });
      }

      // Increase machine quantity
      machine.currentQuantity = Number(machine.currentQuantity) + requestedQty;
      machine.lastRefilledAt = new Date();
      if (dto.taskId) {
        machine.lastRefillTaskId = dto.taskId;
      }
      await manager.save(MachineInventory, machine);

      // Create movement record
      const movement = manager.create(InventoryMovement, {
        organizationId: dto.organizationId,
        movementType: MovementType.OPERATOR_TO_MACHINE,
        productId: dto.productId,
        quantity: dto.quantity,
        performedByUserId: userId,
        operatorId: dto.operatorId,
        machineId: dto.machineId,
        taskId: dto.taskId,
        operationDate: dto.operationDate || new Date(),
        notes: dto.notes || `Machine refill: ${dto.quantity}`,
      });

      await manager.save(InventoryMovement, movement);

      this.logger.log(
        `Transfer O->M: product=${dto.productId}, qty=${dto.quantity}, machine=${dto.machineId}`,
      );

      return { operator, machine, movement };
    });
  }

  /**
   * Transfer: Machine -> Operator (removal)
   * Uses pessimistic locking to prevent race conditions
   */
  async transferMachineToOperator(
    dto: TransferMachineToOperatorDto,
    userId: string,
  ): Promise<{ machine: MachineInventory; operator: OperatorInventory; movement: InventoryMovement }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock and get machine inventory
      const machine = await manager.findOne(MachineInventory, {
        where: {
          organizationId: dto.organizationId,
          machineId: dto.machineId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!machine) {
        throw new NotFoundException(
          `Product ${dto.productId} not found in machine ${dto.machineId}`,
        );
      }

      const machineQty = Number(machine.currentQuantity);
      const requestedQty = Number(dto.quantity);

      if (machineQty < requestedQty) {
        throw new BadRequestException(
          `Insufficient machine stock. Available: ${machineQty}, Requested: ${requestedQty}`,
        );
      }

      // Decrease machine quantity
      machine.currentQuantity = machineQty - requestedQty;
      await manager.save(MachineInventory, machine);

      // Find or create operator inventory
      let operator = await manager.findOne(OperatorInventory, {
        where: {
          organizationId: dto.organizationId,
          operatorId: dto.operatorId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!operator) {
        operator = manager.create(OperatorInventory, {
          organizationId: dto.organizationId,
          operatorId: dto.operatorId,
          productId: dto.productId,
          currentQuantity: 0,
          reservedQuantity: 0,
        });
      }

      // Increase operator quantity
      operator.currentQuantity = Number(operator.currentQuantity) + requestedQty;
      await manager.save(OperatorInventory, operator);

      // Create movement record
      const movement = manager.create(InventoryMovement, {
        organizationId: dto.organizationId,
        movementType: MovementType.MACHINE_TO_OPERATOR,
        productId: dto.productId,
        quantity: dto.quantity,
        performedByUserId: userId,
        operatorId: dto.operatorId,
        machineId: dto.machineId,
        operationDate: new Date(),
        notes: dto.notes || `Removed from machine: ${dto.quantity}`,
      });

      await manager.save(InventoryMovement, movement);

      this.logger.log(
        `Transfer M->O: product=${dto.productId}, qty=${dto.quantity}, machine=${dto.machineId}`,
      );

      return { machine, operator, movement };
    });
  }

  // ==========================================================================
  // SALES
  // ==========================================================================

  /**
   * Record a sale (reduce machine inventory)
   */
  async recordSale(
    dto: RecordSaleDto,
    userId?: string,
  ): Promise<{ machine: MachineInventory; movement: InventoryMovement }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock and get machine inventory
      const machine = await manager.findOne(MachineInventory, {
        where: {
          organizationId: dto.organizationId,
          machineId: dto.machineId,
          productId: dto.productId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!machine) {
        throw new NotFoundException(
          `Product ${dto.productId} not found in machine ${dto.machineId}`,
        );
      }

      const machineQty = Number(machine.currentQuantity);
      const saleQty = Number(dto.quantity);

      if (machineQty < saleQty) {
        throw new BadRequestException(
          `Insufficient machine stock for sale. Available: ${machineQty}, Requested: ${saleQty}`,
        );
      }

      // Decrease machine quantity and update stats
      machine.currentQuantity = machineQty - saleQty;
      machine.totalSold = (machine.totalSold || 0) + saleQty;
      machine.lastSaleAt = new Date();
      await manager.save(MachineInventory, machine);

      // Create movement record
      const movement = manager.create(InventoryMovement, {
        organizationId: dto.organizationId,
        movementType: MovementType.MACHINE_SALE,
        productId: dto.productId,
        quantity: dto.quantity,
        performedByUserId: userId,
        machineId: dto.machineId,
        operationDate: new Date(),
        notes: `Sale: ${dto.quantity} @ ${dto.unitPrice}`,
        metadata: {
          unitPrice: dto.unitPrice,
          totalPrice: dto.unitPrice * saleQty,
          transactionId: dto.transactionId,
        },
      });

      await manager.save(InventoryMovement, movement);

      return { machine, movement };
    });
  }

  // ==========================================================================
  // RESERVATIONS
  // ==========================================================================

  /**
   * Create inventory reservation for a task
   */
  async createReservation(
    dto: CreateReservationDto,
  ): Promise<InventoryReservation> {
    return this.dataSource.transaction(async (manager) => {
      // Validate available quantity based on level
      if (dto.inventoryLevel === InventoryLevel.WAREHOUSE) {
        const warehouse = await manager.findOne(WarehouseInventory, {
          where: {
            organizationId: dto.organizationId,
            productId: dto.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!warehouse || warehouse.availableQuantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient warehouse stock for reservation. Available: ${warehouse?.availableQuantity || 0}`,
          );
        }

        // Increase reserved quantity
        warehouse.reservedQuantity = Number(warehouse.reservedQuantity) + dto.quantity;
        await manager.save(WarehouseInventory, warehouse);
      } else if (dto.inventoryLevel === InventoryLevel.OPERATOR) {
        const operator = await manager.findOne(OperatorInventory, {
          where: {
            organizationId: dto.organizationId,
            operatorId: dto.referenceId,
            productId: dto.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!operator || operator.availableQuantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient operator stock for reservation. Available: ${operator?.availableQuantity || 0}`,
          );
        }

        // Increase reserved quantity
        operator.reservedQuantity = Number(operator.reservedQuantity) + dto.quantity;
        await manager.save(OperatorInventory, operator);
      }

      // Create reservation record
      const reservation = manager.create(InventoryReservation, {
        organizationId: dto.organizationId,
        taskId: dto.taskId,
        productId: dto.productId,
        quantityReserved: dto.quantity,
        quantityFulfilled: 0,
        status: ReservationStatus.PENDING,
        inventoryLevel: dto.inventoryLevel,
        referenceId: dto.referenceId,
        expiresAt: dto.expiresAt,
        notes: dto.notes,
        createdByUserId: dto.createdByUserId,
      });

      await manager.save(InventoryReservation, reservation);

      // Create movement record for reservation
      const movement = manager.create(InventoryMovement, {
        organizationId: dto.organizationId,
        movementType:
          dto.inventoryLevel === InventoryLevel.WAREHOUSE
            ? MovementType.WAREHOUSE_RESERVATION
            : MovementType.OPERATOR_RESERVATION,
        productId: dto.productId,
        quantity: dto.quantity,
        performedByUserId: dto.createdByUserId,
        operatorId:
          dto.inventoryLevel === InventoryLevel.OPERATOR ? dto.referenceId : undefined,
        taskId: dto.taskId,
        operationDate: new Date(),
        notes: `Reservation created: ${dto.quantity}`,
      });

      await manager.save(InventoryMovement, movement);

      this.logger.log(
        `Reservation created: task=${dto.taskId}, product=${dto.productId}, qty=${dto.quantity}`,
      );

      return reservation;
    });
  }

  /**
   * Fulfill reservation (mark as completed)
   */
  async fulfillReservation(
    reservationId: string,
    fulfilledQuantity: number,
    _userId?: string,
  ): Promise<InventoryReservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(InventoryReservation, {
        where: { id: reservationId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!reservation) {
        throw new NotFoundException(`Reservation ${reservationId} not found`);
      }

      if (!reservation.isActive) {
        throw new BadRequestException(
          `Reservation ${reservationId} is not active (status: ${reservation.status})`,
        );
      }

      // Compute release quantity BEFORE updating quantityFulfilled
      const previousRemaining = Number(reservation.quantityReserved) - Number(reservation.quantityFulfilled);
      const releaseQty = Math.min(fulfilledQuantity, previousRemaining);

      // Update reservation
      reservation.quantityFulfilled = Number(reservation.quantityFulfilled) + fulfilledQuantity;

      if (reservation.quantityFulfilled >= reservation.quantityReserved) {
        reservation.status = ReservationStatus.FULFILLED;
        reservation.fulfilledAt = new Date();
      } else {
        reservation.status = ReservationStatus.PARTIALLY_FULFILLED;
      }

      await manager.save(InventoryReservation, reservation);

      // Release reserved quantity from inventory

      if (reservation.inventoryLevel === InventoryLevel.WAREHOUSE) {
        const warehouse = await manager.findOne(WarehouseInventory, {
          where: {
            organizationId: reservation.organizationId,
            productId: reservation.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (warehouse) {
          warehouse.reservedQuantity = Math.max(
            0,
            Number(warehouse.reservedQuantity) - releaseQty,
          );
          await manager.save(WarehouseInventory, warehouse);
        }
      } else if (reservation.inventoryLevel === InventoryLevel.OPERATOR) {
        const operator = await manager.findOne(OperatorInventory, {
          where: {
            organizationId: reservation.organizationId,
            operatorId: reservation.referenceId,
            productId: reservation.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (operator) {
          operator.reservedQuantity = Math.max(
            0,
            Number(operator.reservedQuantity) - releaseQty,
          );
          await manager.save(OperatorInventory, operator);
        }
      }

      this.logger.log(
        `Reservation fulfilled: id=${reservationId}, qty=${fulfilledQuantity}`,
      );

      return reservation;
    });
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(
    reservationId: string,
    reason?: string,
    userId?: string,
  ): Promise<InventoryReservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(InventoryReservation, {
        where: { id: reservationId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!reservation) {
        throw new NotFoundException(`Reservation ${reservationId} not found`);
      }

      if (!reservation.isActive) {
        throw new BadRequestException(
          `Reservation ${reservationId} is already inactive`,
        );
      }

      const releaseQty = reservation.quantityRemaining;

      // Release reserved quantity from inventory
      if (reservation.inventoryLevel === InventoryLevel.WAREHOUSE) {
        const warehouse = await manager.findOne(WarehouseInventory, {
          where: {
            organizationId: reservation.organizationId,
            productId: reservation.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (warehouse) {
          warehouse.reservedQuantity = Math.max(
            0,
            Number(warehouse.reservedQuantity) - releaseQty,
          );
          await manager.save(WarehouseInventory, warehouse);
        }
      } else if (reservation.inventoryLevel === InventoryLevel.OPERATOR) {
        const operator = await manager.findOne(OperatorInventory, {
          where: {
            organizationId: reservation.organizationId,
            operatorId: reservation.referenceId,
            productId: reservation.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (operator) {
          operator.reservedQuantity = Math.max(
            0,
            Number(operator.reservedQuantity) - releaseQty,
          );
          await manager.save(OperatorInventory, operator);
        }
      }

      // Update reservation status
      reservation.status = ReservationStatus.CANCELLED;
      reservation.cancelledAt = new Date();
      if (reason) {
        reservation.notes = reason;
      }
      await manager.save(InventoryReservation, reservation);

      // Create movement record
      const movement = manager.create(InventoryMovement, {
        organizationId: reservation.organizationId,
        movementType:
          reservation.inventoryLevel === InventoryLevel.WAREHOUSE
            ? MovementType.WAREHOUSE_RESERVATION_RELEASE
            : MovementType.OPERATOR_RESERVATION_RELEASE,
        productId: reservation.productId,
        quantity: releaseQty,
        performedByUserId: userId,
        operatorId:
          reservation.inventoryLevel === InventoryLevel.OPERATOR
            ? reservation.referenceId
            : undefined,
        taskId: reservation.taskId,
        operationDate: new Date(),
        notes: `Reservation cancelled: ${releaseQty}`,
      });

      await manager.save(InventoryMovement, movement);

      this.logger.log(`Reservation cancelled: id=${reservationId}`);

      return reservation;
    });
  }

  /**
   * Get reservations for task
   */
  async getReservationsByTask(organizationId: string, taskId: string): Promise<InventoryReservation[]> {
    return this.reservationRepo.find({
      where: { organizationId, taskId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get active reservations
   */
  async getActiveReservations(organizationId: string): Promise<InventoryReservation[]> {
    return this.reservationRepo.find({
      where: {
        organizationId,
        status: In([
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.PARTIALLY_FULFILLED,
        ]),
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Confirm a pending reservation
   * Optionally adjust the reserved quantity
   */
  async confirmReservation(
    reservationId: string,
    adjustedQuantity?: number,
  ): Promise<InventoryReservation> {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(InventoryReservation, {
        where: { id: reservationId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!reservation) {
        throw new NotFoundException(`Reservation ${reservationId} not found`);
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new BadRequestException(
          `Reservation ${reservationId} is not in PENDING status (current: ${reservation.status})`,
        );
      }

      // If adjustedQuantity is provided, adjust reserved quantity on inventory
      if (adjustedQuantity !== undefined && adjustedQuantity !== Number(reservation.quantityReserved)) {
        const originalQty = Number(reservation.quantityReserved);
        const difference = adjustedQuantity - originalQty;

        if (reservation.inventoryLevel === InventoryLevel.WAREHOUSE) {
          const warehouse = await manager.findOne(WarehouseInventory, {
            where: {
              organizationId: reservation.organizationId,
              productId: reservation.productId,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (warehouse) {
            if (difference > 0 && warehouse.availableQuantity < difference) {
              throw new BadRequestException(
                `Insufficient warehouse stock to increase reservation. Available: ${warehouse.availableQuantity}, Additional needed: ${difference}`,
              );
            }
            warehouse.reservedQuantity = Math.max(
              0,
              Number(warehouse.reservedQuantity) + difference,
            );
            await manager.save(WarehouseInventory, warehouse);
          }
        } else if (reservation.inventoryLevel === InventoryLevel.OPERATOR) {
          const operator = await manager.findOne(OperatorInventory, {
            where: {
              organizationId: reservation.organizationId,
              operatorId: reservation.referenceId,
              productId: reservation.productId,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (operator) {
            if (difference > 0 && operator.availableQuantity < difference) {
              throw new BadRequestException(
                `Insufficient operator stock to increase reservation. Available: ${operator.availableQuantity}, Additional needed: ${difference}`,
              );
            }
            operator.reservedQuantity = Math.max(
              0,
              Number(operator.reservedQuantity) + difference,
            );
            await manager.save(OperatorInventory, operator);
          }
        }

        reservation.quantityReserved = adjustedQuantity;
      }

      reservation.status = ReservationStatus.CONFIRMED;
      await manager.save(InventoryReservation, reservation);

      this.logger.log(
        `Reservation confirmed: id=${reservationId}${adjustedQuantity !== undefined ? `, adjustedQty=${adjustedQuantity}` : ''}`,
      );

      return reservation;
    });
  }

  /**
   * Get reservation by ID
   */
  async getReservationById(organizationId: string, id: string): Promise<InventoryReservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { organizationId, id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    return reservation;
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
    const query = this.reservationRepo
      .createQueryBuilder('r')
      .where('r.organizationId = :organizationId', { organizationId });

    if (filters?.taskId) {
      query.andWhere('r.taskId = :taskId', { taskId: filters.taskId });
    }

    if (filters?.productId) {
      query.andWhere('r.productId = :productId', { productId: filters.productId });
    }

    if (filters?.status) {
      query.andWhere('r.status = :status', { status: filters.status });
    }

    if (filters?.inventoryLevel) {
      query.andWhere('r.inventoryLevel = :inventoryLevel', {
        inventoryLevel: filters.inventoryLevel,
      });
    }

    const total = await query.getCount();

    query.orderBy('r.created_at', 'DESC');

    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 50, 100);
    query.skip((page - 1) * limit).take(limit);

    const data = await query.getMany();

    return { data, total };
  }

  /**
   * Get reservations summary for organization
   */
  async getReservationsSummary(organizationId: string): Promise<{
    byStatus: Record<string, number>;
    totalActiveReservedQuantity: number;
    expiringWithin24h: number;
  }> {
    // Count by status
    const statusCounts = await this.reservationRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('r.organizationId = :organizationId', { organizationId })
      .groupBy('r.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    // Total reserved quantity for active reservations
    const activeResult = await this.reservationRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.quantityReserved - r.quantityFulfilled), 0)', 'totalReserved')
      .where('r.organizationId = :organizationId', { organizationId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.PARTIALLY_FULFILLED,
        ],
      })
      .getRawOne();

    const totalActiveReservedQuantity = parseFloat(activeResult?.totalReserved || '0');

    // Count expiring within 24 hours
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const expiringResult = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.organizationId = :organizationId', { organizationId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [
          ReservationStatus.PENDING,
          ReservationStatus.CONFIRMED,
          ReservationStatus.PARTIALLY_FULFILLED,
        ],
      })
      .andWhere('r.expiresAt IS NOT NULL')
      .andWhere('r.expiresAt <= :in24h', { in24h })
      .andWhere('r.expiresAt > :now', { now })
      .getCount();

    return {
      byStatus,
      totalActiveReservedQuantity,
      expiringWithin24h: expiringResult,
    };
  }

  /**
   * Expire old reservations (CRON: every 10 minutes)
   * Finds PENDING or CONFIRMED reservations past their expiresAt
   * and releases the reserved quantities back to inventory.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireOldReservations(): Promise<void> {
    const now = new Date();

    // Find expired reservations
    const expiredReservations = await this.reservationRepo.find({
      where: [
        {
          status: ReservationStatus.PENDING,
          expiresAt: LessThanOrEqual(now),
        },
        {
          status: ReservationStatus.CONFIRMED,
          expiresAt: LessThanOrEqual(now),
        },
      ],
    });

    if (expiredReservations.length === 0) {
      return;
    }

    this.logger.log(`Expiring ${expiredReservations.length} old reservation(s)...`);

    for (const reservation of expiredReservations) {
      try {
        await this.dataSource.transaction(async (manager) => {
          // Re-fetch with lock to avoid race conditions
          const locked = await manager.findOne(InventoryReservation, {
            where: { id: reservation.id },
            lock: { mode: 'pessimistic_write' },
          });

          if (!locked || !locked.isActive) {
            return; // Already processed
          }

          const releaseQty = locked.quantityRemaining;

          // Release reserved quantity from inventory
          if (locked.inventoryLevel === InventoryLevel.WAREHOUSE) {
            const warehouse = await manager.findOne(WarehouseInventory, {
              where: {
                organizationId: locked.organizationId,
                productId: locked.productId,
              },
              lock: { mode: 'pessimistic_write' },
            });

            if (warehouse) {
              warehouse.reservedQuantity = Math.max(
                0,
                Number(warehouse.reservedQuantity) - releaseQty,
              );
              await manager.save(WarehouseInventory, warehouse);
            }
          } else if (locked.inventoryLevel === InventoryLevel.OPERATOR) {
            const operator = await manager.findOne(OperatorInventory, {
              where: {
                organizationId: locked.organizationId,
                operatorId: locked.referenceId,
                productId: locked.productId,
              },
              lock: { mode: 'pessimistic_write' },
            });

            if (operator) {
              operator.reservedQuantity = Math.max(
                0,
                Number(operator.reservedQuantity) - releaseQty,
              );
              await manager.save(OperatorInventory, operator);
            }
          }

          // Update reservation status
          locked.status = ReservationStatus.EXPIRED;
          await manager.save(InventoryReservation, locked);

          // Create movement record for release
          const movement = manager.create(InventoryMovement, {
            organizationId: locked.organizationId,
            movementType:
              locked.inventoryLevel === InventoryLevel.WAREHOUSE
                ? MovementType.WAREHOUSE_RESERVATION_RELEASE
                : MovementType.OPERATOR_RESERVATION_RELEASE,
            productId: locked.productId,
            quantity: releaseQty,
            operatorId:
              locked.inventoryLevel === InventoryLevel.OPERATOR
                ? locked.referenceId
                : undefined,
            taskId: locked.taskId,
            operationDate: new Date(),
            notes: `Reservation expired: ${releaseQty} released`,
          });

          await manager.save(InventoryMovement, movement);

          this.logger.log(
            `Reservation expired: id=${locked.id}, qty=${releaseQty}`,
          );
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to expire reservation ${reservation.id}: ${error?.message}`,
          error?.stack,
        );
      }
    }
  }

  // ==========================================================================
  // ADJUSTMENTS
  // ==========================================================================

  /**
   * Create inventory adjustment
   */
  async createAdjustment(
    dto: AdjustInventoryDto,
  ): Promise<{ adjustment: InventoryAdjustment; movement?: InventoryMovement }> {
    return this.dataSource.transaction(async (manager) => {
      let systemQuantity = 0;
      let inventoryRecord: WarehouseInventory | OperatorInventory | MachineInventory | null = null;

      // Get current system quantity based on level
      if (dto.inventoryLevel === InventoryLevel.WAREHOUSE) {
        inventoryRecord = await manager.findOne(WarehouseInventory, {
          where: {
            organizationId: dto.organizationId,
            productId: dto.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });
        systemQuantity = inventoryRecord ? Number((inventoryRecord as WarehouseInventory).currentQuantity) : 0;
      } else if (dto.inventoryLevel === InventoryLevel.OPERATOR) {
        inventoryRecord = await manager.findOne(OperatorInventory, {
          where: {
            organizationId: dto.organizationId,
            operatorId: dto.referenceId,
            productId: dto.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });
        systemQuantity = inventoryRecord ? Number((inventoryRecord as OperatorInventory).currentQuantity) : 0;
      } else if (dto.inventoryLevel === InventoryLevel.MACHINE) {
        inventoryRecord = await manager.findOne(MachineInventory, {
          where: {
            organizationId: dto.organizationId,
            machineId: dto.referenceId,
            productId: dto.productId,
          },
          lock: { mode: 'pessimistic_write' },
        });
        systemQuantity = inventoryRecord ? Number((inventoryRecord as MachineInventory).currentQuantity) : 0;
      }

      const difference = dto.actualQuantity - systemQuantity;

      // Create adjustment record
      const adjustment = manager.create(InventoryAdjustment, {
        organizationId: dto.organizationId,
        inventoryLevel: dto.inventoryLevel,
        referenceId: dto.referenceId,
        productId: dto.productId,
        adjustmentType: dto.adjustmentType,
        systemQuantity,
        actualQuantity: dto.actualQuantity,
        difference,
        reason: dto.reason,
        notes: dto.notes,
        adjustedByUserId: dto.adjustedByUserId,
        isApproved: false,
      });

      await manager.save(InventoryAdjustment, adjustment);

      // If there's a difference, update inventory and create movement
      let movement: InventoryMovement | undefined;

      if (difference !== 0 && inventoryRecord) {
        // Update inventory quantity based on level type
        if (dto.inventoryLevel === InventoryLevel.WAREHOUSE) {
          (inventoryRecord as WarehouseInventory).currentQuantity = dto.actualQuantity;
          await manager.save(WarehouseInventory, inventoryRecord as WarehouseInventory);
        } else if (dto.inventoryLevel === InventoryLevel.OPERATOR) {
          (inventoryRecord as OperatorInventory).currentQuantity = dto.actualQuantity;
          await manager.save(OperatorInventory, inventoryRecord as OperatorInventory);
        } else if (dto.inventoryLevel === InventoryLevel.MACHINE) {
          (inventoryRecord as MachineInventory).currentQuantity = dto.actualQuantity;
          await manager.save(MachineInventory, inventoryRecord as MachineInventory);
        }

        // Create movement record
        movement = manager.create(InventoryMovement, {
          organizationId: dto.organizationId,
          movementType: MovementType.ADJUSTMENT,
          productId: dto.productId,
          quantity: Math.abs(difference),
          performedByUserId: dto.adjustedByUserId,
          operatorId:
            dto.inventoryLevel === InventoryLevel.OPERATOR ? dto.referenceId : undefined,
          machineId:
            dto.inventoryLevel === InventoryLevel.MACHINE ? dto.referenceId : undefined,
          operationDate: new Date(),
          notes: `Adjustment (${dto.adjustmentType}): ${systemQuantity} -> ${dto.actualQuantity}`,
          metadata: {
            adjustmentId: adjustment.id,
            adjustmentType: dto.adjustmentType,
            systemQuantity,
            actualQuantity: dto.actualQuantity,
            difference,
          },
        });

        await manager.save(InventoryMovement, movement);

        // Link movement to adjustment
        adjustment.movementId = movement.id;
        await manager.save(InventoryAdjustment, adjustment);
      }

      this.logger.log(
        `Adjustment created: level=${dto.inventoryLevel}, product=${dto.productId}, diff=${difference}`,
      );

      return { adjustment, movement };
    });
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
      .createQueryBuilder('m')
      .where('m.organizationId = :organizationId', { organizationId });

    if (filters?.productId) {
      query.andWhere('m.productId = :productId', { productId: filters.productId });
    }

    if (filters?.machineId) {
      query.andWhere('m.machineId = :machineId', { machineId: filters.machineId });
    }

    if (filters?.operatorId) {
      query.andWhere('m.operatorId = :operatorId', { operatorId: filters.operatorId });
    }

    if (filters?.movementType) {
      query.andWhere('m.movementType = :movementType', {
        movementType: filters.movementType,
      });
    }

    if (filters?.startDate) {
      query.andWhere('m.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('m.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const total = await query.getCount();

    query.orderBy('m.createdAt', 'DESC');

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
    warehouse: { totalProducts: number; totalValue: number; lowStockCount: number };
    operators: { totalOperators: number; totalProducts: number };
    machines: { totalMachines: number; totalProducts: number; needsRefillCount: number };
  }> {
    // Warehouse stats
    const warehouseStats = await this.warehouseRepo
      .createQueryBuilder('wi')
      .select('COUNT(DISTINCT wi.productId)', 'totalProducts')
      .addSelect('SUM(wi.currentQuantity * wi.avgPurchasePrice)', 'totalValue')
      .addSelect(
        'SUM(CASE WHEN wi.currentQuantity <= wi.minStockLevel THEN 1 ELSE 0 END)',
        'lowStockCount',
      )
      .where('wi.organizationId = :organizationId', { organizationId })
      .getRawOne();

    // Operator stats
    const operatorStats = await this.operatorRepo
      .createQueryBuilder('oi')
      .select('COUNT(DISTINCT oi.operatorId)', 'totalOperators')
      .addSelect('COUNT(DISTINCT oi.productId)', 'totalProducts')
      .where('oi.organizationId = :organizationId', { organizationId })
      .andWhere('oi.currentQuantity > 0')
      .getRawOne();

    // Machine stats
    const machineStats = await this.machineRepo
      .createQueryBuilder('mi')
      .select('COUNT(DISTINCT mi.machineId)', 'totalMachines')
      .addSelect('COUNT(DISTINCT mi.productId)', 'totalProducts')
      .addSelect(
        'SUM(CASE WHEN mi.currentQuantity <= mi.minStockLevel THEN 1 ELSE 0 END)',
        'needsRefillCount',
      )
      .where('mi.organizationId = :organizationId', { organizationId })
      .getRawOne();

    return {
      warehouse: {
        totalProducts: parseInt(warehouseStats?.totalProducts || '0'),
        totalValue: parseFloat(warehouseStats?.totalValue || '0'),
        lowStockCount: parseInt(warehouseStats?.lowStockCount || '0'),
      },
      operators: {
        totalOperators: parseInt(operatorStats?.totalOperators || '0'),
        totalProducts: parseInt(operatorStats?.totalProducts || '0'),
      },
      machines: {
        totalMachines: parseInt(machineStats?.totalMachines || '0'),
        totalProducts: parseInt(machineStats?.totalProducts || '0'),
        needsRefillCount: parseInt(machineStats?.needsRefillCount || '0'),
      },
    };
  }
}
