/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { StockTakeService } from "./stock-take.service";
import {
  StockMovement,
  StockMovementType,
  StockMovementStatus,
  InventoryBatch,
} from "./entities/warehouse.entity";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

const ORG_ID = uuid();
const USER_ID = uuid();
const PRODUCT_ID = uuid();
const WAREHOUSE_A = uuid();
const WAREHOUSE_B = uuid();

/** Minimal mock for SelectQueryBuilder */
const mockQueryBuilder = (data: any[] = [], count = 0) => {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(data),
    getCount: jest.fn().mockResolvedValue(count),
  };
  return qb;
};

describe("StockTakeService", () => {
  let service: StockTakeService;
  let movementRepo: Record<string, jest.Mock>;
  let batchRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    movementRepo = {
      create: jest.fn((data) => ({ id: uuid(), ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder()),
    };

    batchRepo = {
      create: jest.fn((data) => ({ id: uuid(), ...data })),
      save: jest.fn((data) => Promise.resolve(data)),
      createQueryBuilder: jest.fn(() => mockQueryBuilder()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockTakeService,
        { provide: getRepositoryToken(StockMovement), useValue: movementRepo },
        { provide: getRepositoryToken(InventoryBatch), useValue: batchRepo },
      ],
    }).compile();

    service = module.get(StockTakeService);
  });

  // =========================================================================
  // createMovement
  // =========================================================================

  it("should create a stock movement with PENDING status", async () => {
    const dto: any = {
      organizationId: ORG_ID,
      fromWarehouseId: WAREHOUSE_A,
      toWarehouseId: WAREHOUSE_B,
      productId: PRODUCT_ID,
      quantity: 50,
      type: StockMovementType.TRANSFER,
    };

    const result = await service.createMovement(dto, USER_ID);

    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: StockMovementStatus.PENDING,
        requestedByUserId: USER_ID,
      }),
    );
    expect(movementRepo.save).toHaveBeenCalled();
    expect(result.status).toBe(StockMovementStatus.PENDING);
  });

  it("should throw when neither fromWarehouseId nor toWarehouseId is provided", async () => {
    const dto: any = {
      organizationId: ORG_ID,
      productId: PRODUCT_ID,
      quantity: 10,
      type: StockMovementType.TRANSFER,
    };

    await expect(service.createMovement(dto, USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("should default unitOfMeasure to pcs", async () => {
    const dto: any = {
      organizationId: ORG_ID,
      toWarehouseId: WAREHOUSE_A,
      productId: PRODUCT_ID,
      quantity: 10,
      type: StockMovementType.RECEIPT,
    };

    await service.createMovement(dto, USER_ID);

    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ unitOfMeasure: "pcs" }),
    );
  });

  // =========================================================================
  // completeMovement
  // =========================================================================

  it("should complete a pending movement", async () => {
    const movement = {
      id: uuid(),
      status: StockMovementStatus.PENDING,
    };
    movementRepo.findOne.mockResolvedValueOnce(movement);

    const result = await service.completeMovement(movement.id, USER_ID);

    expect(result.status).toBe(StockMovementStatus.COMPLETED);
    expect(result.completedByUserId).toBe(USER_ID);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it("should throw when completing an already completed movement", async () => {
    movementRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      status: StockMovementStatus.COMPLETED,
    });

    await expect(service.completeMovement(uuid(), USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("should throw when completing a cancelled movement", async () => {
    movementRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      status: StockMovementStatus.CANCELLED,
    });

    await expect(service.completeMovement(uuid(), USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("should throw NotFoundException when movement not found for complete", async () => {
    movementRepo.findOne.mockResolvedValueOnce(null);

    await expect(service.completeMovement(uuid(), USER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  // =========================================================================
  // cancelMovement
  // =========================================================================

  it("should cancel a pending movement", async () => {
    const movement = {
      id: uuid(),
      status: StockMovementStatus.PENDING,
    };
    movementRepo.findOne.mockResolvedValueOnce(movement);

    const result = await service.cancelMovement(movement.id, USER_ID);

    expect(result.status).toBe(StockMovementStatus.CANCELLED);
  });

  it("should throw when cancelling a completed movement", async () => {
    movementRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      status: StockMovementStatus.COMPLETED,
    });

    await expect(service.cancelMovement(uuid(), USER_ID)).rejects.toThrow(
      BadRequestException,
    );
  });

  // =========================================================================
  // createBatch
  // =========================================================================

  it("should create an inventory batch with remainingQuantity equal to quantity", async () => {
    const dto: any = {
      organizationId: ORG_ID,
      warehouseId: WAREHOUSE_A,
      productId: PRODUCT_ID,
      batchNumber: "BATCH-001",
      quantity: 200,
      costPerUnit: 1500,
      expiryDate: "2027-06-30",
    };

    const result = await service.createBatch(dto, USER_ID);

    expect(batchRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        remainingQuantity: 200,
        createdById: USER_ID,
      }),
    );
    expect(batchRepo.save).toHaveBeenCalled();
    expect(result.remainingQuantity).toBe(200);
  });

  // =========================================================================
  // depleteFromBatch (FIFO)
  // =========================================================================

  it("should deplete stock using FIFO from oldest batches", async () => {
    const batches = [
      { id: uuid(), remainingQuantity: 30, receivedAt: new Date("2025-01-01") },
      { id: uuid(), remainingQuantity: 50, receivedAt: new Date("2025-02-01") },
    ];

    const qb = mockQueryBuilder(batches);
    batchRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.depleteFromBatch(
      WAREHOUSE_A,
      PRODUCT_ID,
      ORG_ID,
      40,
      USER_ID,
    );

    expect(result.totalDepleted).toBe(40);
    expect(result.batches.length).toBe(2);
    // First batch fully depleted (30), second partially (10)
    expect(result.batches[0].remainingQuantity).toBe(0);
    expect(result.batches[1].remainingQuantity).toBe(40);
  });

  it("should throw when quantity to deplete is zero or negative", async () => {
    await expect(
      service.depleteFromBatch(WAREHOUSE_A, PRODUCT_ID, ORG_ID, 0, USER_ID),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.depleteFromBatch(WAREHOUSE_A, PRODUCT_ID, ORG_ID, -5, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw when insufficient total batch stock", async () => {
    const batches = [{ id: uuid(), remainingQuantity: 10 }];
    const qb = mockQueryBuilder(batches);
    batchRepo.createQueryBuilder.mockReturnValue(qb);

    await expect(
      service.depleteFromBatch(WAREHOUSE_A, PRODUCT_ID, ORG_ID, 50, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw when no batches are available", async () => {
    const qb = mockQueryBuilder([]);
    batchRepo.createQueryBuilder.mockReturnValue(qb);

    await expect(
      service.depleteFromBatch(WAREHOUSE_A, PRODUCT_ID, ORG_ID, 10, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });
});
