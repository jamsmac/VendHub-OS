/**
 * Inventory Adjustment Sub-Service
 *
 * Handles inventory adjustments (stocktake corrections,
 * manual corrections, damage, expiry, theft, etc.).
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  WarehouseInventory,
  OperatorInventory,
  MachineInventory,
  InventoryMovement,
  InventoryAdjustment,
  MovementType,
  InventoryLevel,
} from "../entities/inventory.entity";
import type { AdjustInventoryDto } from "../inventory.service";

@Injectable()
export class InventoryAdjustmentService {
  private readonly logger = new Logger(InventoryAdjustmentService.name);

  constructor(
    @InjectRepository(WarehouseInventory)
    private readonly warehouseRepo: Repository<WarehouseInventory>,
    @InjectRepository(OperatorInventory)
    private readonly operatorRepo: Repository<OperatorInventory>,
    @InjectRepository(MachineInventory)
    private readonly machineRepo: Repository<MachineInventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    @InjectRepository(InventoryAdjustment)
    private readonly adjustmentRepo: Repository<InventoryAdjustment>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create inventory adjustment
   */
  async createAdjustment(dto: AdjustInventoryDto): Promise<{
    adjustment: InventoryAdjustment;
    movement?: InventoryMovement;
  }> {
    return this.dataSource.transaction(async (manager) => {
      let systemQuantity = 0;
      let inventoryRecord:
        | WarehouseInventory
        | OperatorInventory
        | MachineInventory
        | null = null;

      // Get current system quantity based on level
      if (dto.inventoryLevel === InventoryLevel.WAREHOUSE) {
        inventoryRecord = await manager.findOne(WarehouseInventory, {
          where: {
            organizationId: dto.organizationId,
            productId: dto.productId,
          },
          lock: { mode: "pessimistic_write" },
        });
        systemQuantity = inventoryRecord
          ? Number((inventoryRecord as WarehouseInventory).currentQuantity)
          : 0;
      } else if (dto.inventoryLevel === InventoryLevel.OPERATOR) {
        inventoryRecord = await manager.findOne(OperatorInventory, {
          where: {
            organizationId: dto.organizationId,
            operatorId: dto.referenceId,
            productId: dto.productId,
          },
          lock: { mode: "pessimistic_write" },
        });
        systemQuantity = inventoryRecord
          ? Number((inventoryRecord as OperatorInventory).currentQuantity)
          : 0;
      } else if (dto.inventoryLevel === InventoryLevel.MACHINE) {
        inventoryRecord = await manager.findOne(MachineInventory, {
          where: {
            organizationId: dto.organizationId,
            machineId: dto.referenceId,
            productId: dto.productId,
          },
          lock: { mode: "pessimistic_write" },
        });
        systemQuantity = inventoryRecord
          ? Number((inventoryRecord as MachineInventory).currentQuantity)
          : 0;
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
          (inventoryRecord as WarehouseInventory).currentQuantity =
            dto.actualQuantity;
          await manager.save(
            WarehouseInventory,
            inventoryRecord as WarehouseInventory,
          );
        } else if (dto.inventoryLevel === InventoryLevel.OPERATOR) {
          (inventoryRecord as OperatorInventory).currentQuantity =
            dto.actualQuantity;
          await manager.save(
            OperatorInventory,
            inventoryRecord as OperatorInventory,
          );
        } else if (dto.inventoryLevel === InventoryLevel.MACHINE) {
          (inventoryRecord as MachineInventory).currentQuantity =
            dto.actualQuantity;
          await manager.save(
            MachineInventory,
            inventoryRecord as MachineInventory,
          );
        }

        // Create movement record
        movement = manager.create(InventoryMovement, {
          organizationId: dto.organizationId,
          movementType: MovementType.ADJUSTMENT,
          productId: dto.productId,
          quantity: Math.abs(difference),
          performedByUserId: dto.adjustedByUserId,
          operatorId:
            dto.inventoryLevel === InventoryLevel.OPERATOR
              ? dto.referenceId
              : undefined,
          machineId:
            dto.inventoryLevel === InventoryLevel.MACHINE
              ? dto.referenceId
              : undefined,
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
}
