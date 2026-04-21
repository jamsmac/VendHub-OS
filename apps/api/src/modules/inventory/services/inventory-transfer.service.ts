/**
 * Inventory Transfer Sub-Service
 *
 * Handles all inventory transfers between the 3 levels
 * (Warehouse, Operator, Machine), sales recording, and warehouse stock-in.
 * All transfers use pessimistic locking to prevent race conditions.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  WarehouseInventory,
  OperatorInventory,
  MachineInventory,
  InventoryMovement,
  MovementType,
} from "../entities/inventory.entity";
import type {
  TransferWarehouseToOperatorDto,
  TransferOperatorToWarehouseDto,
  TransferOperatorToMachineDto,
  TransferMachineToOperatorDto,
  RecordSaleDto,
  WarehouseStockInDto,
} from "../inventory.service";

@Injectable()
export class InventoryTransferService {
  private readonly logger = new Logger(InventoryTransferService.name);

  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly warehouseRepo: Repository<WarehouseInventory>,
    @InjectRepository(OperatorInventory)
    private readonly operatorRepo: Repository<OperatorInventory>,
    @InjectRepository(MachineInventory)
    private readonly machineRepo: Repository<MachineInventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================================================
  // WAREHOUSE STOCK-IN
  // ==========================================================================

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
        lock: { mode: "pessimistic_write" },
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
        const totalValue =
          previousQty * Number(warehouse.avgPurchasePrice || 0) +
          newQty * dto.unitCost;
        warehouse.avgPurchasePrice = totalValue / (previousQty + newQty);
        warehouse.lastPurchasePrice = dto.unitCost;
      }

      if (dto.locationInWarehouse) {
        warehouse.locationInWarehouse = dto.locationInWarehouse;
      }

      await manager.save(WarehouseInventory, warehouse);

      // Create movement record
      const warehouseInData: Partial<InventoryMovement> = {
        organizationId: dto.organizationId,
        movementType: MovementType.WAREHOUSE_IN,
        productId: dto.productId,
        quantity: dto.quantity,
        performedByUserId: userId,
        operationDate: new Date(),
        notes: dto.notes || `Stock received: ${dto.quantity}`,
      };
      if (dto.metadata !== undefined) {
        warehouseInData.metadata = dto.metadata;
      }
      if (dto.unitCost !== undefined) {
        warehouseInData.unitCost = dto.unitCost;
        warehouseInData.totalCost = dto.unitCost * dto.quantity;
      }
      const movement = manager.create(InventoryMovement, warehouseInData);

      await manager.save(InventoryMovement, movement as InventoryMovement);

      this.logger.log(
        `Warehouse stock in: product=${dto.productId}, qty=${dto.quantity}, org=${dto.organizationId}`,
      );

      return { warehouse, movement };
    });
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
  ): Promise<{
    warehouse: WarehouseInventory;
    operator: OperatorInventory;
    movement: InventoryMovement;
  }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock and get warehouse inventory
      const warehouse = await manager.findOne(WarehouseInventory, {
        where: {
          organizationId: dto.organizationId,
          productId: dto.productId,
        },
        lock: { mode: "pessimistic_write" },
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
      warehouse.currentQuantity =
        Number(warehouse.currentQuantity) - requestedQty;
      await manager.save(WarehouseInventory, warehouse);

      // Find or create operator inventory
      let operator = await manager.findOne(OperatorInventory, {
        where: {
          organizationId: dto.organizationId,
          operatorId: dto.operatorId,
          productId: dto.productId,
        },
        lock: { mode: "pessimistic_write" },
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
      operator.currentQuantity =
        Number(operator.currentQuantity) + requestedQty;
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
  ): Promise<{
    warehouse: WarehouseInventory;
    operator: OperatorInventory;
    movement: InventoryMovement;
  }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock and get operator inventory
      const operator = await manager.findOne(OperatorInventory, {
        where: {
          organizationId: dto.organizationId,
          operatorId: dto.operatorId,
          productId: dto.productId,
        },
        lock: { mode: "pessimistic_write" },
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
        lock: { mode: "pessimistic_write" },
      });

      if (!warehouse) {
        throw new NotFoundException(
          `Product ${dto.productId} not found in warehouse`,
        );
      }

      // Increase warehouse quantity
      warehouse.currentQuantity =
        Number(warehouse.currentQuantity) + requestedQty;
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
  ): Promise<{
    operator: OperatorInventory;
    machine: MachineInventory;
    movement: InventoryMovement;
  }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock and get operator inventory
      const operator = await manager.findOne(OperatorInventory, {
        where: {
          organizationId: dto.organizationId,
          operatorId: dto.operatorId,
          productId: dto.productId,
        },
        lock: { mode: "pessimistic_write" },
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
        lock: { mode: "pessimistic_write" },
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
      } as Partial<InventoryMovement>);

      await manager.save(InventoryMovement, movement as InventoryMovement);

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
  ): Promise<{
    machine: MachineInventory;
    operator: OperatorInventory;
    movement: InventoryMovement;
  }> {
    return this.dataSource.transaction(async (manager) => {
      // Lock and get machine inventory
      const machine = await manager.findOne(MachineInventory, {
        where: {
          organizationId: dto.organizationId,
          machineId: dto.machineId,
          productId: dto.productId,
        },
        lock: { mode: "pessimistic_write" },
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
        lock: { mode: "pessimistic_write" },
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
      operator.currentQuantity =
        Number(operator.currentQuantity) + requestedQty;
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
        lock: { mode: "pessimistic_write" },
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
      } as Partial<InventoryMovement>);

      await manager.save(InventoryMovement, movement);

      return { machine, movement };
    });
  }
}
