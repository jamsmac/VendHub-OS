import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { StockReservationService } from "./stock-reservation.service";
import {
  StockReservation,
  StockReservationStatus,
  InventoryBatch,
} from "../entities/warehouse.entity";

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

/** Build a mock EntityManager for DataSource.transaction */
const buildManager = (overrides: Record<string, jest.Mock> = {}) => {
  const qbMock: any = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  return {
    findOne: jest.fn(),
    create: jest.fn((_entity: any, data: any) => ({ id: uuid(), ...data })),
    save: jest.fn((_entity: any, data: any) => Promise.resolve(data)),
    createQueryBuilder: jest.fn(() => qbMock),
    __qb: qbMock,
    ...overrides,
  };
};

const buildTransactionRunner = (manager: any) =>
  jest.fn((cb: (m: any) => Promise<any>) => cb(manager));

/** Minimal mock for repo-level QueryBuilder (used in expireOldReservations) */
const mockQueryBuilder = (data: any[] = []) => {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(data),
    getRawOne: jest.fn().mockResolvedValue({ reserved: 0 }),
  };
  return qb;
};

describe("StockReservationService", () => {
  let service: StockReservationService;
  let reservationRepo: Record<string, jest.Mock>;
  let manager: ReturnType<typeof buildManager>;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    manager = buildManager();
    dataSource = { transaction: buildTransactionRunner(manager) };

    reservationRepo = {
      findOne: jest.fn(),
      save: jest.fn((data: any) => Promise.resolve(data)),
      createQueryBuilder: jest.fn(() => mockQueryBuilder()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockReservationService,
        {
          provide: getRepositoryToken(StockReservation),
          useValue: reservationRepo,
        },
        { provide: getRepositoryToken(InventoryBatch), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(StockReservationService);
  });

  // =========================================================================
  // createReservation
  // =========================================================================

  it("should create a reservation when sufficient stock exists", async () => {
    const batches = [{ remainingQuantity: 100 }];
    manager.__qb.getMany.mockResolvedValueOnce(batches);

    const result = await service.createReservation(
      ORG_ID,
      WAREHOUSE_ID,
      PRODUCT_ID,
      25,
      "pcs",
      "order-123",
      USER_ID,
    );

    expect(result.quantityReserved).toBe(25);
    expect(result.quantityFulfilled).toBe(0);
    expect(result.status).toBe(StockReservationStatus.PENDING);
    expect(result.reservationNumber).toMatch(/^RSV-/);
  });

  it("should throw when quantity is zero or negative", async () => {
    await expect(
      service.createReservation(
        ORG_ID,
        WAREHOUSE_ID,
        PRODUCT_ID,
        0,
        "pcs",
        "order",
        USER_ID,
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createReservation(
        ORG_ID,
        WAREHOUSE_ID,
        PRODUCT_ID,
        -5,
        "pcs",
        "order",
        USER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw when insufficient stock for reservation", async () => {
    manager.__qb.getMany.mockResolvedValueOnce([{ remainingQuantity: 10 }]);

    await expect(
      service.createReservation(
        ORG_ID,
        WAREHOUSE_ID,
        PRODUCT_ID,
        50,
        "pcs",
        "order",
        USER_ID,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it("should set expiresAt when expiresInHours is provided", async () => {
    manager.__qb.getMany.mockResolvedValueOnce([{ remainingQuantity: 100 }]);

    const before = Date.now();
    const result = await service.createReservation(
      ORG_ID,
      WAREHOUSE_ID,
      PRODUCT_ID,
      10,
      "pcs",
      "order-x",
      USER_ID,
      { expiresInHours: 24 },
    );

    expect(result.expiresAt).toBeInstanceOf(Date);
    const expiryMs = result.expiresAt!.getTime();
    expect(expiryMs).toBeGreaterThanOrEqual(before + 24 * 3600000 - 1000);
  });

  // =========================================================================
  // confirmReservation
  // =========================================================================

  it("should confirm a pending reservation", async () => {
    reservationRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      organizationId: ORG_ID,
      status: StockReservationStatus.PENDING,
    });

    const result = await service.confirmReservation(uuid(), ORG_ID, USER_ID);

    expect(result.status).toBe(StockReservationStatus.CONFIRMED);
  });

  it("should throw when confirming a non-pending reservation", async () => {
    reservationRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      status: StockReservationStatus.FULFILLED,
    });

    await expect(
      service.confirmReservation(uuid(), ORG_ID, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // fulfillReservation
  // =========================================================================

  it("should fully fulfill a reservation", async () => {
    manager.findOne.mockResolvedValueOnce({
      id: uuid(),
      organizationId: ORG_ID,
      status: StockReservationStatus.CONFIRMED,
      quantityReserved: 50,
      quantityFulfilled: 0,
    });

    const result = await service.fulfillReservation(
      uuid(),
      ORG_ID,
      50,
      USER_ID,
    );

    expect(result.status).toBe(StockReservationStatus.FULFILLED);
    expect(result.quantityFulfilled).toBe(50);
    expect(result.fulfilledAt).toBeInstanceOf(Date);
  });

  it("should partially fulfill a reservation", async () => {
    manager.findOne.mockResolvedValueOnce({
      id: uuid(),
      organizationId: ORG_ID,
      status: StockReservationStatus.CONFIRMED,
      quantityReserved: 100,
      quantityFulfilled: 20,
    });

    const result = await service.fulfillReservation(
      uuid(),
      ORG_ID,
      30,
      USER_ID,
    );

    expect(result.status).toBe(StockReservationStatus.PARTIALLY_FULFILLED);
    expect(result.quantityFulfilled).toBe(50);
  });

  it("should throw when fulfilling more than remaining", async () => {
    manager.findOne.mockResolvedValueOnce({
      id: uuid(),
      organizationId: ORG_ID,
      status: StockReservationStatus.CONFIRMED,
      quantityReserved: 10,
      quantityFulfilled: 8,
    });

    await expect(
      service.fulfillReservation(uuid(), ORG_ID, 5, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // cancelReservation
  // =========================================================================

  it("should cancel a pending reservation", async () => {
    reservationRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      organizationId: ORG_ID,
      status: StockReservationStatus.PENDING,
      metadata: {},
    });

    const result = await service.cancelReservation(
      uuid(),
      ORG_ID,
      USER_ID,
      "No longer needed",
    );

    expect(result.status).toBe(StockReservationStatus.CANCELLED);
    expect((result.metadata as any).cancellation.reason).toBe(
      "No longer needed",
    );
  });

  it("should throw when cancelling a fulfilled reservation", async () => {
    reservationRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      status: StockReservationStatus.FULFILLED,
    });

    await expect(
      service.cancelReservation(uuid(), ORG_ID, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw when cancelling an already cancelled reservation", async () => {
    reservationRepo.findOne.mockResolvedValueOnce({
      id: uuid(),
      status: StockReservationStatus.CANCELLED,
    });

    await expect(
      service.cancelReservation(uuid(), ORG_ID, USER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // expireOldReservations
  // =========================================================================

  it("should expire reservations past their expiresAt", async () => {
    const expired = [
      {
        id: uuid(),
        status: StockReservationStatus.PENDING,
        metadata: {},
        expiresAt: new Date(Date.now() - 3600000),
      },
      {
        id: uuid(),
        status: StockReservationStatus.CONFIRMED,
        metadata: {},
        expiresAt: new Date(Date.now() - 7200000),
      },
    ];
    reservationRepo.createQueryBuilder.mockReturnValueOnce(
      mockQueryBuilder(expired),
    );

    const result = await service.expireOldReservations(ORG_ID);

    expect(result.expiredCount).toBe(2);
    expect(expired[0].status).toBe(StockReservationStatus.EXPIRED);
    expect(expired[1].status).toBe(StockReservationStatus.EXPIRED);
    expect(reservationRepo.save).toHaveBeenCalledWith(expired);
  });

  it("should return zero when no reservations have expired", async () => {
    reservationRepo.createQueryBuilder.mockReturnValueOnce(
      mockQueryBuilder([]),
    );

    const result = await service.expireOldReservations(ORG_ID);

    expect(result.expiredCount).toBe(0);
    expect(reservationRepo.save).not.toHaveBeenCalled();
  });
});
