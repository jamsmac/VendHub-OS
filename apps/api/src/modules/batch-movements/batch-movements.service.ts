/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { BatchMovement } from "./entities/batch-movement.entity";
import { CreateBatchMovementDto } from "./dto/create-batch-movement.dto";
import { IngredientBatch } from "../products/entities/product.entity";
import { EntityEventsService } from "../entity-events/entity-events.service";
import {
  BatchMovementType,
  EntityEventType,
  TrackedEntityType,
} from "@vendhub/shared";

@Injectable()
export class BatchMovementsService {
  constructor(
    @InjectRepository(BatchMovement)
    private readonly movementRepo: Repository<BatchMovement>,
    @InjectRepository(IngredientBatch)
    private readonly batchRepo: Repository<IngredientBatch>,
    private readonly dataSource: DataSource,
    private readonly entityEventsService: EntityEventsService,
  ) {}

  /**
   * Record a batch movement and update remaining quantity.
   * Runs in a transaction for data consistency.
   */
  async createMovement(
    dto: CreateBatchMovementDto,
    performedBy: string,
    organizationId: string,
  ): Promise<BatchMovement> {
    return this.dataSource.transaction(async (manager) => {
      // Load batch
      const batch = await manager.findOne(IngredientBatch, {
        where: { id: dto.batchId, organizationId },
      });
      if (!batch) {
        throw new BadRequestException("Batch not found");
      }

      // Validate quantity for outgoing movements
      const outgoing = [
        BatchMovementType.ISSUE,
        BatchMovementType.LOAD,
        BatchMovementType.CONSUME,
        BatchMovementType.WRITE_OFF,
      ];
      if (outgoing.includes(dto.movementType)) {
        if (Number(batch.remainingQuantity) < dto.quantity) {
          throw new BadRequestException(
            `Insufficient quantity: ${batch.remainingQuantity} available, ${dto.quantity} requested`,
          );
        }
        batch.remainingQuantity =
          Number(batch.remainingQuantity) - dto.quantity;
      }

      // Incoming movements increase remaining quantity
      if (dto.movementType === BatchMovementType.RETURN) {
        batch.remainingQuantity =
          Number(batch.remainingQuantity) + dto.quantity;
      }

      // Update batch status
      if (Number(batch.remainingQuantity) <= 0) {
        batch.status = "depleted" as any;
      } else if (Number(batch.remainingQuantity) < Number(batch.quantity)) {
        batch.status = "partially_used" as any;
      }

      await manager.save(IngredientBatch, batch);

      // Create entity event
      const eventTypeMap: Partial<Record<BatchMovementType, EntityEventType>> =
        {
          [BatchMovementType.ISSUE]: EntityEventType.ISSUED_FROM_WAREHOUSE,
          [BatchMovementType.LOAD]: EntityEventType.LOADED_TO_BUNKER,
          [BatchMovementType.CONSUME]: EntityEventType.SOLD,
          [BatchMovementType.WRITE_OFF]: EntityEventType.WRITTEN_OFF,
          [BatchMovementType.MIX]: EntityEventType.BUNKER_MIXED,
          [BatchMovementType.RETURN]: EntityEventType.RETURNED_FROM_OPERATOR,
        };

      let eventId: string | null = null;
      const eventType = eventTypeMap[dto.movementType];
      if (eventType) {
        const event = await this.entityEventsService.createEvent(
          {
            entityId: dto.batchId,
            entityType: TrackedEntityType.INGREDIENT_BATCH,
            eventType,
            quantity: dto.quantity,
            notes: dto.notes,
          },
          performedBy,
          organizationId,
        );
        eventId = event.id;
      }

      // Create movement record
      const movement = manager.create(BatchMovement, {
        organizationId,
        batchId: dto.batchId,
        eventId,
        movementType: dto.movementType,
        quantity: dto.quantity,
        containerId: dto.containerId || null,
        machineId: dto.machineId || null,
        mixedWithBatchId: dto.mixedWithBatchId || null,
        mixRatio: dto.mixRatio || null,
        performedBy,
        notes: dto.notes || null,
      });

      return manager.save(BatchMovement, movement);
    });
  }

  /**
   * Get movement history for a batch
   */
  async getBatchHistory(
    batchId: string,
    organizationId: string,
  ): Promise<BatchMovement[]> {
    return this.movementRepo.find({
      where: { batchId, organizationId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get movements for a specific container/bunker
   */
  async getContainerMovements(
    containerId: string,
    organizationId: string,
  ): Promise<BatchMovement[]> {
    return this.movementRepo.find({
      where: { containerId, organizationId },
      order: { createdAt: "DESC" },
    });
  }
}
