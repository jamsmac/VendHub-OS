import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
import { BadRequestException } from "@nestjs/common";

import { BatchMovementsService } from "./batch-movements.service";
import { BatchMovement } from "./entities/batch-movement.entity";
import { IngredientBatch } from "../products/entities/product.entity";
import { EntityEventsService } from "../entity-events/entity-events.service";
import {
  BatchMovementType,
  EntityEventType,
  TrackedEntityType,
} from "@vendhub/shared";
import { CreateBatchMovementDto } from "./dto/create-batch-movement.dto";

describe("BatchMovementsService", () => {
  let service: BatchMovementsService;
  let movementRepo: jest.Mocked<Repository<BatchMovement>>;
  let mockManager: jest.Mocked<Partial<EntityManager>>;
  let entityEventsService: jest.Mocked<Partial<EntityEventsService>>;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const batchId = "batch-uuid-1";
  const eventId = "event-uuid-1";
  const movementId = "movement-uuid-1";

  const createMockBatch = (
    overrides?: Partial<IngredientBatch>,
  ): IngredientBatch =>
    ({
      id: batchId,
      organizationId: orgId,
      productId: "product-uuid-1",
      batchNumber: "B-001",
      quantity: 1000,
      remainingQuantity: 500,
      reservedQuantity: 0,
      unitOfMeasure: "gram",
      purchasePrice: null,
      totalCost: null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdById: userId,
      updatedById: null,
      ...overrides,
    }) as unknown as IngredientBatch;

  const createMockMovement = (
    overrides?: Partial<BatchMovement>,
  ): BatchMovement =>
    ({
      id: movementId,
      organizationId: orgId,
      batchId,
      eventId,
      movementType: BatchMovementType.ISSUE,
      quantity: 100,
      containerId: null,
      machineId: null,
      mixedWithBatchId: null,
      mixRatio: null,
      performedBy: userId,
      notes: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdById: null,
      updatedById: null,
      ...overrides,
    }) as unknown as BatchMovement;

  const createDto = (
    overrides?: Partial<CreateBatchMovementDto>,
  ): CreateBatchMovementDto => ({
    batchId,
    movementType: BatchMovementType.ISSUE,
    quantity: 100,
    ...overrides,
  });

  beforeEach(async () => {
    mockManager = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    entityEventsService = {
      createEvent: jest.fn().mockResolvedValue({ id: eventId }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchMovementsService,
        {
          provide: getRepositoryToken(BatchMovement),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(IngredientBatch),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest
              .fn()
              .mockImplementation(
                (cb: (manager: EntityManager) => Promise<unknown>) =>
                  cb(mockManager as unknown as EntityManager),
              ),
          },
        },
        {
          provide: EntityEventsService,
          useValue: entityEventsService,
        },
      ],
    }).compile();

    service = module.get<BatchMovementsService>(BatchMovementsService);
    movementRepo = module.get(getRepositoryToken(BatchMovement));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // createMovement
  // ============================================================================

  describe("createMovement", () => {
    it("should create an outgoing movement and deduct remaining quantity", async () => {
      const batch = createMockBatch({ remainingQuantity: 500, quantity: 1000 });
      const dto = createDto({
        movementType: BatchMovementType.ISSUE,
        quantity: 100,
      });
      const savedMovement = createMockMovement({
        movementType: BatchMovementType.ISSUE,
        quantity: 100,
      });

      mockManager.findOne!.mockResolvedValue(batch);
      mockManager.create!.mockReturnValue(savedMovement);
      mockManager
        .save!.mockResolvedValueOnce(batch) // save batch
        .mockResolvedValueOnce(savedMovement); // save movement

      const result = await service.createMovement(dto, userId, orgId);

      expect(result).toEqual(savedMovement);
      expect(mockManager.findOne).toHaveBeenCalledWith(IngredientBatch, {
        where: { id: batchId, organizationId: orgId },
      });
      // Batch remaining should have been decremented
      expect(batch.remainingQuantity).toBe(400);
      expect(mockManager.save).toHaveBeenCalledWith(IngredientBatch, batch);
      expect(entityEventsService.createEvent).toHaveBeenCalledWith(
        {
          entityId: batchId,
          entityType: TrackedEntityType.INGREDIENT_BATCH,
          eventType: EntityEventType.ISSUED_FROM_WAREHOUSE,
          quantity: 100,
          notes: undefined,
        },
        userId,
        orgId,
      );
    });

    it("should throw BadRequestException when batch is not found", async () => {
      const dto = createDto();
      mockManager.findOne!.mockResolvedValue(null);

      await expect(service.createMovement(dto, userId, orgId)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.createMovement(dto, userId, orgId)).rejects.toThrow(
        "Batch not found",
      );
    });

    it("should throw BadRequestException when insufficient quantity for outgoing movement", async () => {
      const batch = createMockBatch({ remainingQuantity: 50 });
      const dto = createDto({
        movementType: BatchMovementType.CONSUME,
        quantity: 100,
      });

      mockManager.findOne!.mockResolvedValue(batch);

      await expect(service.createMovement(dto, userId, orgId)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.createMovement(dto, userId, orgId)).rejects.toThrow(
        /Insufficient quantity/,
      );
    });

    it("should increase remaining quantity for RETURN movement", async () => {
      const batch = createMockBatch({
        remainingQuantity: 300,
        quantity: 1000,
      });
      const dto = createDto({
        movementType: BatchMovementType.RETURN,
        quantity: 200,
      });
      const savedMovement = createMockMovement({
        movementType: BatchMovementType.RETURN,
        quantity: 200,
      });

      mockManager.findOne!.mockResolvedValue(batch);
      mockManager.create!.mockReturnValue(savedMovement);
      mockManager
        .save!.mockResolvedValueOnce(batch)
        .mockResolvedValueOnce(savedMovement);

      const result = await service.createMovement(dto, userId, orgId);

      expect(result).toEqual(savedMovement);
      // Batch remaining should have been incremented
      expect(batch.remainingQuantity).toBe(500);
      expect(batch.status).toBe("partially_used");
      expect(entityEventsService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: EntityEventType.RETURNED_FROM_OPERATOR,
        }),
        userId,
        orgId,
      );
    });

    it("should set batch status to 'depleted' when remaining reaches zero", async () => {
      const batch = createMockBatch({
        remainingQuantity: 100,
        quantity: 1000,
      });
      const dto = createDto({
        movementType: BatchMovementType.WRITE_OFF,
        quantity: 100,
      });
      const savedMovement = createMockMovement({
        movementType: BatchMovementType.WRITE_OFF,
        quantity: 100,
      });

      mockManager.findOne!.mockResolvedValue(batch);
      mockManager.create!.mockReturnValue(savedMovement);
      mockManager
        .save!.mockResolvedValueOnce(batch)
        .mockResolvedValueOnce(savedMovement);

      await service.createMovement(dto, userId, orgId);

      expect(batch.remainingQuantity).toBe(0);
      expect(batch.status).toBe("depleted");
    });

    it("should set batch status to 'partially_used' when remaining is less than original quantity", async () => {
      const batch = createMockBatch({
        remainingQuantity: 1000,
        quantity: 1000,
      });
      const dto = createDto({
        movementType: BatchMovementType.LOAD,
        quantity: 200,
      });
      const savedMovement = createMockMovement({
        movementType: BatchMovementType.LOAD,
        quantity: 200,
      });

      mockManager.findOne!.mockResolvedValue(batch);
      mockManager.create!.mockReturnValue(savedMovement);
      mockManager
        .save!.mockResolvedValueOnce(batch)
        .mockResolvedValueOnce(savedMovement);

      await service.createMovement(dto, userId, orgId);

      expect(batch.remainingQuantity).toBe(800);
      expect(batch.status).toBe("partially_used");
    });

    it("should enforce organization isolation — batch from another org is not found", async () => {
      const dto = createDto();
      const differentOrgId = "other-org-uuid";

      mockManager.findOne!.mockResolvedValue(null);

      await expect(
        service.createMovement(dto, userId, differentOrgId),
      ).rejects.toThrow(BadRequestException);

      expect(mockManager.findOne).toHaveBeenCalledWith(IngredientBatch, {
        where: { id: batchId, organizationId: differentOrgId },
      });
    });

    it("should validate all outgoing movement types check quantity", async () => {
      const outgoingTypes = [
        BatchMovementType.ISSUE,
        BatchMovementType.LOAD,
        BatchMovementType.CONSUME,
        BatchMovementType.WRITE_OFF,
      ];

      for (const movementType of outgoingTypes) {
        const batch = createMockBatch({ remainingQuantity: 10 });
        const dto = createDto({ movementType, quantity: 50 });

        mockManager.findOne!.mockResolvedValue(batch);

        await expect(
          service.createMovement(dto, userId, orgId),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it("should pass optional fields (containerId, machineId, notes) to movement record", async () => {
      const batch = createMockBatch({ remainingQuantity: 500, quantity: 1000 });
      const dto = createDto({
        movementType: BatchMovementType.LOAD,
        quantity: 50,
        containerId: "container-uuid-1",
        machineId: "machine-uuid-1",
        notes: "Loaded into bunker A",
      });
      const savedMovement = createMockMovement();

      mockManager.findOne!.mockResolvedValue(batch);
      mockManager.create!.mockReturnValue(savedMovement);
      mockManager
        .save!.mockResolvedValueOnce(batch)
        .mockResolvedValueOnce(savedMovement);

      await service.createMovement(dto, userId, orgId);

      expect(mockManager.create).toHaveBeenCalledWith(
        BatchMovement,
        expect.objectContaining({
          containerId: "container-uuid-1",
          machineId: "machine-uuid-1",
          notes: "Loaded into bunker A",
          performedBy: userId,
          organizationId: orgId,
        }),
      );
    });

    it("should create entity event with correct event type mapping", async () => {
      const eventTypeMap: Partial<Record<BatchMovementType, EntityEventType>> =
        {
          [BatchMovementType.ISSUE]: EntityEventType.ISSUED_FROM_WAREHOUSE,
          [BatchMovementType.LOAD]: EntityEventType.LOADED_TO_BUNKER,
          [BatchMovementType.CONSUME]: EntityEventType.SOLD,
          [BatchMovementType.WRITE_OFF]: EntityEventType.WRITTEN_OFF,
          [BatchMovementType.MIX]: EntityEventType.BUNKER_MIXED,
          [BatchMovementType.RETURN]: EntityEventType.RETURNED_FROM_OPERATOR,
        };

      for (const [movementType, expectedEventType] of Object.entries(
        eventTypeMap,
      )) {
        const isOutgoing = [
          BatchMovementType.ISSUE,
          BatchMovementType.LOAD,
          BatchMovementType.CONSUME,
          BatchMovementType.WRITE_OFF,
        ].includes(movementType as BatchMovementType);

        const batch = createMockBatch({
          remainingQuantity: 500,
          quantity: 1000,
        });
        const dto = createDto({
          movementType: movementType as BatchMovementType,
          quantity: isOutgoing ? 10 : 10,
        });
        const savedMovement = createMockMovement();

        mockManager.findOne!.mockResolvedValue(batch);
        mockManager.create!.mockReturnValue(savedMovement);
        mockManager
          .save!.mockResolvedValueOnce(batch)
          .mockResolvedValueOnce(savedMovement);

        (entityEventsService.createEvent as jest.Mock).mockClear();

        await service.createMovement(dto, userId, orgId);

        expect(entityEventsService.createEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            entityType: TrackedEntityType.INGREDIENT_BATCH,
            eventType: expectedEventType,
          }),
          userId,
          orgId,
        );
      }
    });
  });

  // ============================================================================
  // getBatchHistory
  // ============================================================================

  describe("getBatchHistory", () => {
    it("should return movements for a batch ordered by createdAt DESC", async () => {
      const movements = [
        createMockMovement({ id: "m1" }),
        createMockMovement({ id: "m2" }),
      ];
      movementRepo.find.mockResolvedValue(movements);

      const result = await service.getBatchHistory(batchId, orgId);

      expect(result).toEqual(movements);
      expect(movementRepo.find).toHaveBeenCalledWith({
        where: { batchId, organizationId: orgId },
        order: { createdAt: "DESC" },
      });
    });

    it("should filter by organizationId", async () => {
      movementRepo.find.mockResolvedValue([]);

      await service.getBatchHistory(batchId, "other-org-uuid");

      expect(movementRepo.find).toHaveBeenCalledWith({
        where: { batchId, organizationId: "other-org-uuid" },
        order: { createdAt: "DESC" },
      });
    });
  });

  // ============================================================================
  // getContainerMovements
  // ============================================================================

  describe("getContainerMovements", () => {
    it("should return movements for a container ordered by createdAt DESC", async () => {
      const containerId = "container-uuid-1";
      const movements = [createMockMovement({ containerId })];
      movementRepo.find.mockResolvedValue(movements);

      const result = await service.getContainerMovements(containerId, orgId);

      expect(result).toEqual(movements);
      expect(movementRepo.find).toHaveBeenCalledWith({
        where: { containerId, organizationId: orgId },
        order: { createdAt: "DESC" },
      });
    });
  });
});
