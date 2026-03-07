import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { InventoryBatchService } from "./inventory-batch.service";
import { InventoryBatch } from "../entities/warehouse.entity";

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
const WAREHOUSE_ID = uuid();

/** Build a mock QueryBuilder that returns configurable data */
const mockQueryBuilder = (data: any[] = [], rawOne: any = null) => {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    clone: jest.fn(),
    getMany: jest.fn().mockResolvedValue(data),
    getCount: jest.fn().mockResolvedValue(data.length),
    getRawOne: jest.fn().mockResolvedValue(rawOne),
  };
  // clone returns a new builder with same data
  qb.clone.mockImplementation(() => mockQueryBuilder(data, rawOne));
  return qb;
};

/** Build a mock EntityManager for DataSource.transaction */
const buildManager = (batches: any[] = []) => {
  const qb = mockQueryBuilder(batches);
  return {
    findOne: jest.fn(),
    create: jest.fn((_e: any, d: any) => ({ id: uuid(), ...d })),
    save: jest.fn((_e: any, d: any) => Promise.resolve(d)),
    createQueryBuilder: jest.fn(() => qb),
    __qb: qb,
  };
};

const buildTransactionRunner = (manager: any) =>
  jest.fn((cb: (m: any) => Promise<any>) => cb(manager));

describe("InventoryBatchService", () => {
  let service: InventoryBatchService;
  let batchRepo: Record<string, jest.Mock>;
  let manager: ReturnType<typeof buildManager>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    manager = buildManager();
    dataSource = { transaction: buildTransactionRunner(manager) };

    batchRepo = {
      findOne: jest.fn(),
      save: jest.fn((data: any) => Promise.resolve(data)),
      createQueryBuilder: jest.fn(() => mockQueryBuilder()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryBatchService,
        { provide: getRepositoryToken(InventoryBatch), useValue: batchRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(InventoryBatchService);
  });

  // =========================================================================
  // getExpiringBatches
  // =========================================================================

  it("should return batches expiring within the threshold", async () => {
    const expiringBatch = {
      id: uuid(),
      remainingQuantity: 20,
      expiryDate: new Date(Date.now() + 15 * 86400000), // 15 days out
    };
    batchRepo.createQueryBuilder.mockReturnValueOnce(
      mockQueryBuilder([expiringBatch]),
    );

    const result = await service.getExpiringBatches(WAREHOUSE_ID, ORG_ID, 30);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(expiringBatch.id);
  });

  // =========================================================================
  // getExpiredBatches
  // =========================================================================

  it("should return batches that are past their expiry date", async () => {
    const expiredBatch = {
      id: uuid(),
      remainingQuantity: 10,
      expiryDate: new Date(Date.now() - 86400000), // yesterday
    };
    batchRepo.createQueryBuilder.mockReturnValueOnce(
      mockQueryBuilder([expiredBatch]),
    );

    const result = await service.getExpiredBatches(WAREHOUSE_ID, ORG_ID);

    expect(result).toHaveLength(1);
  });

  // =========================================================================
  // writeOffExpiredStock
  // =========================================================================

  it("should write off all expired batches and zero out remaining quantity", async () => {
    const expired = [
      { id: uuid(), remainingQuantity: 30, costPerUnit: 1000, metadata: {} },
      { id: uuid(), remainingQuantity: 20, costPerUnit: 500, metadata: {} },
    ];
    manager.__qb.getMany.mockResolvedValueOnce(expired);

    const result = await service.writeOffExpiredStock(
      WAREHOUSE_ID,
      ORG_ID,
      USER_ID,
    );

    expect(result.batchesProcessed).toBe(2);
    expect(result.totalQuantityWrittenOff).toBe(50);
    expect(result.totalValueWrittenOff).toBe(30 * 1000 + 20 * 500);
    expect(expired[0].remainingQuantity).toBe(0);
    expect(expired[1].remainingQuantity).toBe(0);
  });

  it("should return zeros when no expired batches exist", async () => {
    manager.__qb.getMany.mockResolvedValueOnce([]);

    const result = await service.writeOffExpiredStock(
      WAREHOUSE_ID,
      ORG_ID,
      USER_ID,
    );

    expect(result.batchesProcessed).toBe(0);
    expect(result.totalQuantityWrittenOff).toBe(0);
    expect(result.totalValueWrittenOff).toBe(0);
  });

  // =========================================================================
  // quarantineBatch
  // =========================================================================

  it("should quarantine a batch", async () => {
    const batch = { id: uuid(), organizationId: ORG_ID, metadata: {} };
    batchRepo.findOne.mockResolvedValueOnce(batch);

    const result = await service.quarantineBatch(
      batch.id,
      ORG_ID,
      "Suspected contamination",
      USER_ID,
    );

    expect(result.metadata.isQuarantined).toBe(true);
    expect(result.metadata.quarantineReason).toBe("Suspected contamination");
    expect(result.updatedById).toBe(USER_ID);
  });

  it("should throw when batch is already quarantined", async () => {
    batchRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      metadata: { isQuarantined: true },
    });

    await expect(
      service.quarantineBatch(uuid(), ORG_ID, "Reason", USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw NotFoundException when batch not found for quarantine", async () => {
    batchRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.quarantineBatch(uuid(), ORG_ID, "Reason", USER_ID),
    ).rejects.toThrow(NotFoundException);
  });

  // =========================================================================
  // releaseFromQuarantine
  // =========================================================================

  it("should release a quarantined batch", async () => {
    batchRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      organizationId: ORG_ID,
      metadata: { isQuarantined: true, quarantineReason: "test" },
    });

    const result = await service.releaseFromQuarantine(uuid(), ORG_ID, USER_ID);

    expect(result.metadata.isQuarantined).toBe(false);
    expect(result.metadata.releasedByUserId).toBe(USER_ID);
  });

  it("should throw when releasing a batch that is not quarantined", async () => {
    batchRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      metadata: {},
    });

    await expect(
      service.releaseFromQuarantine(uuid(), ORG_ID, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // fifoWriteOff
  // =========================================================================

  it("should write off stock using FIFO across multiple batches", async () => {
    const batches = [
      { id: uuid(), remainingQuantity: 20, metadata: {} },
      { id: uuid(), remainingQuantity: 30, metadata: {} },
    ];
    manager.__qb.getMany.mockResolvedValueOnce(batches);

    const result = await service.fifoWriteOff(
      WAREHOUSE_ID,
      PRODUCT_ID,
      ORG_ID,
      35,
      USER_ID,
      "Quality issue",
    );

    expect(result.batches).toHaveLength(2);
    expect(result.batches[0].quantityWrittenOff).toBe(20); // first batch fully consumed
    expect(result.batches[1].quantityWrittenOff).toBe(15); // second batch partial
  });

  it("should throw when quantity to write off is zero", async () => {
    await expect(
      service.fifoWriteOff(WAREHOUSE_ID, PRODUCT_ID, ORG_ID, 0, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw when insufficient stock for FIFO write-off", async () => {
    const batches = [{ id: uuid(), remainingQuantity: 5, metadata: {} }];
    manager.__qb.getMany.mockResolvedValueOnce(batches);

    await expect(
      service.fifoWriteOff(WAREHOUSE_ID, PRODUCT_ID, ORG_ID, 50, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it("should record writeOff metadata on each affected batch", async () => {
    const batch = { id: uuid(), remainingQuantity: 10, metadata: {} };
    manager.__qb.getMany.mockResolvedValueOnce([batch]);

    await service.fifoWriteOff(
      WAREHOUSE_ID,
      PRODUCT_ID,
      ORG_ID,
      5,
      USER_ID,
      "Damaged",
    );

    // batch object was mutated and saved
    expect(batch.metadata).toHaveProperty("lastWriteOff");
    expect((batch.metadata as any).lastWriteOff.notes).toBe("Damaged");
    expect(batch.remainingQuantity).toBe(5);
  });

  // =========================================================================
  // getStockSummary
  // =========================================================================

  it("should return aggregated stock summary", async () => {
    // Each clone() call produces a new builder; we configure the main builder
    // to return sensible defaults since mockQueryBuilder's clone does that.
    const qb = mockQueryBuilder([{ id: "1" }, { id: "2" }], { value: 150000 });
    batchRepo.createQueryBuilder.mockReturnValueOnce(qb);

    const result = await service.getStockSummary(WAREHOUSE_ID, ORG_ID);

    expect(result).toHaveProperty("totalBatches");
    expect(result).toHaveProperty("totalStockValue");
    expect(result).toHaveProperty("expiringSoon");
    expect(result).toHaveProperty("expired");
  });
});
