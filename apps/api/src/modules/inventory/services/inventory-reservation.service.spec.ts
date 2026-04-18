import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { InventoryReservationService } from "./inventory-reservation.service";
import {
  WarehouseInventory,
  OperatorInventory,
  InventoryMovement,
  InventoryReservation,
  ReservationStatus,
  InventoryLevel,
} from "../entities/inventory.entity";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Creates a mock InventoryReservation with proper computed getters
 * mirroring those defined on the entity class.
 */
function makeMockReservation(
  overrides: Partial<InventoryReservation> & Record<string, unknown> = {},
): InventoryReservation {
  const base: Record<string, unknown> = {
    id: "res-1",
    organizationId: "org-1",
    productId: "prod-1",
    taskId: "task-1",
    status: ReservationStatus.PENDING,
    quantityReserved: 10,
    quantityFulfilled: 0,
    inventoryLevel: InventoryLevel.WAREHOUSE,
    referenceId: null,
    expiresAt: null,
    notes: null,
    ...overrides,
  };

  // Replicate entity getters
  Object.defineProperty(base, "isActive", {
    get(this: typeof base) {
      return [
        ReservationStatus.PENDING,
        ReservationStatus.CONFIRMED,
        ReservationStatus.PARTIALLY_FULFILLED,
      ].includes(this.status as ReservationStatus);
    },
    configurable: true,
  });

  Object.defineProperty(base, "quantityRemaining", {
    get(this: typeof base) {
      return Number(this.quantityReserved) - Number(this.quantityFulfilled);
    },
    configurable: true,
  });

  return base as unknown as InventoryReservation;
}

// ============================================================================
// Mock: Entity Manager (used inside transaction callback)
// ============================================================================

const mockManager = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// ============================================================================
// Mock: DataSource
// ============================================================================

const mockDataSource = {
  transaction: jest
    .fn()
    .mockImplementation((cb: (m: typeof mockManager) => Promise<unknown>) =>
      cb(mockManager),
    ),
};

// ============================================================================
// Mock: Query Builder (shared, reset per test)
// ============================================================================

const createMockQB = () => {
  const qb: Record<string, jest.Mock> = {};
  const chain = (name: string) => (qb[name] = jest.fn().mockReturnValue(qb));

  // builder chain methods
  [
    "where",
    "andWhere",
    "orderBy",
    "skip",
    "take",
    "select",
    "addSelect",
    "groupBy",
  ].forEach(chain);

  qb["getCount"] = jest.fn().mockResolvedValue(0);
  qb["getMany"] = jest.fn().mockResolvedValue([]);
  qb["getRawMany"] = jest.fn().mockResolvedValue([]);
  qb["getRawOne"] = jest.fn().mockResolvedValue(null);

  // Return `qb` itself from all chain methods (already done above)
  return qb;
};

// ============================================================================
// Mock: Repositories
// ============================================================================

const mockReservationRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockWarehouseRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockOperatorRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockMovementRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
};

// ============================================================================
// Test Suite
// ============================================================================

describe("InventoryReservationService (unit)", () => {
  let service: InventoryReservationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Default: transaction just invokes the callback
    mockDataSource.transaction.mockImplementation(
      (cb: (m: typeof mockManager) => Promise<unknown>) => cb(mockManager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryReservationService,
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: mockWarehouseRepo,
        },
        {
          provide: getRepositoryToken(OperatorInventory),
          useValue: mockOperatorRepo,
        },
        {
          provide: getRepositoryToken(InventoryMovement),
          useValue: mockMovementRepo,
        },
        {
          provide: getRepositoryToken(InventoryReservation),
          useValue: mockReservationRepo,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<InventoryReservationService>(
      InventoryReservationService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // createReservation
  // ==========================================================================

  describe("createReservation", () => {
    const baseDto = {
      organizationId: "org-1",
      taskId: "task-1",
      productId: "prod-1",
      quantity: 5,
      inventoryLevel: InventoryLevel.WAREHOUSE,
      referenceId: "wh-1",
      createdByUserId: "user-1",
    };

    it("should create a warehouse reservation when stock is sufficient", async () => {
      const warehouseItem = {
        id: "wh-1",
        currentQuantity: 20,
        reservedQuantity: 0,
        get availableQuantity() {
          return Number(this.currentQuantity) - Number(this.reservedQuantity);
        },
      };
      const mockRes = makeMockReservation({ quantityReserved: 5 });
      const mockMovement = { id: "mv-1" };

      mockManager.findOne.mockResolvedValueOnce(warehouseItem); // warehouse stock check
      mockManager.create
        .mockReturnValueOnce(mockRes) // reservation create
        .mockReturnValueOnce(mockMovement); // movement create
      mockManager.save
        .mockResolvedValueOnce(warehouseItem) // save updated warehouse
        .mockResolvedValueOnce(mockRes) // save reservation
        .mockResolvedValueOnce(mockMovement); // save movement

      const result = await service.createReservation(baseDto);

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.findOne).toHaveBeenCalledWith(
        WarehouseInventory,
        expect.objectContaining({
          where: { organizationId: "org-1", productId: "prod-1" },
        }),
      );
      expect(result).toEqual(mockRes);
    });

    it("should throw BadRequestException when warehouse stock is insufficient", async () => {
      const warehouseItem = {
        currentQuantity: 2,
        reservedQuantity: 0,
        get availableQuantity() {
          return 2;
        },
      };
      mockManager.findOne.mockResolvedValueOnce(warehouseItem);

      await expect(
        service.createReservation({ ...baseDto, quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when warehouse item not found", async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.createReservation(baseDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should create an operator reservation when stock is sufficient", async () => {
      const dto = {
        ...baseDto,
        inventoryLevel: InventoryLevel.OPERATOR,
        referenceId: "op-1",
      };
      const operatorItem = {
        currentQuantity: 20,
        reservedQuantity: 0,
        get availableQuantity() {
          return 20;
        },
      };
      const mockRes = makeMockReservation({
        inventoryLevel: InventoryLevel.OPERATOR,
        quantityReserved: 5,
      });
      const mockMovement = { id: "mv-1" };

      mockManager.findOne.mockResolvedValueOnce(operatorItem);
      mockManager.create
        .mockReturnValueOnce(mockRes)
        .mockReturnValueOnce(mockMovement);
      mockManager.save
        .mockResolvedValueOnce(operatorItem)
        .mockResolvedValueOnce(mockRes)
        .mockResolvedValueOnce(mockMovement);

      const result = await service.createReservation(dto);

      expect(mockManager.findOne).toHaveBeenCalledWith(
        OperatorInventory,
        expect.objectContaining({
          where: {
            organizationId: "org-1",
            operatorId: "op-1",
            productId: "prod-1",
          },
        }),
      );
      expect(result).toEqual(mockRes);
    });

    it("should increment reservedQuantity on warehouse record", async () => {
      const warehouseItem = {
        currentQuantity: 20,
        reservedQuantity: 5,
        get availableQuantity() {
          return Number(this.currentQuantity) - Number(this.reservedQuantity);
        },
      };
      const mockRes = makeMockReservation({ quantityReserved: 5 });
      const mockMovement = { id: "mv-1" };

      mockManager.findOne.mockResolvedValueOnce(warehouseItem);
      mockManager.create
        .mockReturnValueOnce(mockRes)
        .mockReturnValueOnce(mockMovement);
      mockManager.save
        .mockResolvedValueOnce(warehouseItem)
        .mockResolvedValueOnce(mockRes)
        .mockResolvedValueOnce(mockMovement);

      await service.createReservation(baseDto);

      // First save should be the warehouse with updated reservedQuantity
      const savedWarehouse = mockManager.save.mock.calls[0][1];
      expect(savedWarehouse.reservedQuantity).toBe(10); // 5 + 5
    });
  });

  // ==========================================================================
  // fulfillReservation
  // ==========================================================================

  describe("fulfillReservation", () => {
    it("should fully fulfill a warehouse reservation", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.CONFIRMED,
        quantityReserved: 10,
        quantityFulfilled: 0,
        inventoryLevel: InventoryLevel.WAREHOUSE,
        organizationId: "org-1",
        productId: "prod-1",
      });
      const warehouseItem = {
        currentQuantity: 20,
        reservedQuantity: 10,
      };

      mockManager.findOne
        .mockResolvedValueOnce(reservation) // reservation fetch
        .mockResolvedValueOnce(warehouseItem); // warehouse fetch
      mockManager.save
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(warehouseItem);

      const result = await service.fulfillReservation("res-1", 10);

      expect(result.status).toBe(ReservationStatus.FULFILLED);
      expect(result.quantityFulfilled).toBe(10);
    });

    it("should partially fulfill and set status PARTIALLY_FULFILLED", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.CONFIRMED,
        quantityReserved: 10,
        quantityFulfilled: 0,
        inventoryLevel: InventoryLevel.WAREHOUSE,
      });
      const warehouseItem = { reservedQuantity: 10 };

      mockManager.findOne
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(warehouseItem);
      mockManager.save
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(warehouseItem);

      const result = await service.fulfillReservation("res-1", 4);

      expect(result.status).toBe(ReservationStatus.PARTIALLY_FULFILLED);
      expect(result.quantityFulfilled).toBe(4);
    });

    it("should throw NotFoundException when reservation not found", async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.fulfillReservation("nonexistent", 5),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when reservation is not active", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.CANCELLED,
      });
      mockManager.findOne.mockResolvedValueOnce(reservation);

      await expect(service.fulfillReservation("res-1", 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should release reserved quantity from operator inventory on fulfillment", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.CONFIRMED,
        inventoryLevel: InventoryLevel.OPERATOR,
        referenceId: "op-1",
        quantityReserved: 5,
        quantityFulfilled: 0,
      });
      const operatorItem = { reservedQuantity: 5 };

      mockManager.findOne
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(operatorItem);
      mockManager.save
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(operatorItem);

      await service.fulfillReservation("res-1", 5);

      // Second save is the operator item with released quantity
      const savedOperator = mockManager.save.mock.calls[1][1];
      expect(savedOperator.reservedQuantity).toBe(0); // 5 - 5
    });
  });

  // ==========================================================================
  // cancelReservation
  // ==========================================================================

  describe("cancelReservation", () => {
    it("should cancel an active warehouse reservation and release stock", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.PENDING,
        quantityReserved: 8,
        quantityFulfilled: 0,
        inventoryLevel: InventoryLevel.WAREHOUSE,
      });
      const warehouseItem = { reservedQuantity: 8 };
      const mockMovement = { id: "mv-1" };

      mockManager.findOne
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(warehouseItem);
      mockManager.create.mockReturnValueOnce(mockMovement);
      mockManager.save
        .mockResolvedValueOnce(warehouseItem)
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(mockMovement);

      const result = await service.cancelReservation("res-1", "Task removed");

      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });

    it("should store the cancellation reason in notes", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.CONFIRMED,
        quantityReserved: 5,
        quantityFulfilled: 0,
        inventoryLevel: InventoryLevel.WAREHOUSE,
      });
      const warehouseItem = { reservedQuantity: 5 };
      const mockMovement = { id: "mv-1" };

      mockManager.findOne
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(warehouseItem);
      mockManager.create.mockReturnValueOnce(mockMovement);
      mockManager.save
        .mockResolvedValueOnce(warehouseItem)
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(mockMovement);

      const result = await service.cancelReservation(
        "res-1",
        "No longer needed",
      );

      expect(result.notes).toBe("No longer needed");
    });

    it("should throw NotFoundException when reservation not found", async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.cancelReservation("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when reservation is already inactive", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.FULFILLED,
      });
      mockManager.findOne.mockResolvedValueOnce(reservation);

      await expect(service.cancelReservation("res-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // confirmReservation
  // ==========================================================================

  describe("confirmReservation", () => {
    it("should confirm a PENDING reservation without quantity adjustment", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.PENDING,
        quantityReserved: 10,
        inventoryLevel: InventoryLevel.WAREHOUSE,
      });

      mockManager.findOne.mockResolvedValueOnce(reservation);
      mockManager.save.mockResolvedValueOnce(reservation);

      const result = await service.confirmReservation("res-1");

      expect(result.status).toBe(ReservationStatus.CONFIRMED);
    });

    it("should adjust warehouse reservedQuantity when adjustedQuantity is different", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.PENDING,
        quantityReserved: 10,
        inventoryLevel: InventoryLevel.WAREHOUSE,
      });
      const warehouseItem = {
        currentQuantity: 20,
        reservedQuantity: 10,
        get availableQuantity() {
          return Number(this.currentQuantity) - Number(this.reservedQuantity);
        },
      };

      mockManager.findOne
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(warehouseItem);
      mockManager.save
        .mockResolvedValueOnce(warehouseItem)
        .mockResolvedValueOnce(reservation);

      await service.confirmReservation("res-1", 12); // increase by 2

      const savedWarehouse = mockManager.save.mock.calls[0][1];
      expect(savedWarehouse.reservedQuantity).toBe(12); // 10 + 2
    });

    it("should throw NotFoundException when reservation not found", async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(service.confirmReservation("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when reservation is not PENDING", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.CONFIRMED,
      });
      mockManager.findOne.mockResolvedValueOnce(reservation);

      await expect(service.confirmReservation("res-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when increasing qty beyond available stock", async () => {
      const reservation = makeMockReservation({
        status: ReservationStatus.PENDING,
        quantityReserved: 10,
        inventoryLevel: InventoryLevel.WAREHOUSE,
      });
      const warehouseItem = {
        currentQuantity: 12,
        reservedQuantity: 10,
        get availableQuantity() {
          return 2;
        },
      };

      mockManager.findOne
        .mockResolvedValueOnce(reservation)
        .mockResolvedValueOnce(warehouseItem);

      // Need 5 more (15 - 10) but only 2 available
      await expect(service.confirmReservation("res-1", 15)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // getReservationsByTask
  // ==========================================================================

  describe("getReservationsByTask", () => {
    it("should return reservations for the given task", async () => {
      const mockReservations = [
        makeMockReservation({ taskId: "task-1" }),
        makeMockReservation({ id: "res-2", taskId: "task-1" }),
      ];
      mockReservationRepo.find.mockResolvedValue(mockReservations);

      const result = await service.getReservationsByTask("org-1", "task-1");

      expect(mockReservationRepo.find).toHaveBeenCalledWith({
        where: { organizationId: "org-1", taskId: "task-1" },
        order: { createdAt: "DESC" },
        take: 1000,
      });
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no reservations exist for task", async () => {
      mockReservationRepo.find.mockResolvedValue([]);

      const result = await service.getReservationsByTask("org-1", "task-99");

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // getActiveReservations
  // ==========================================================================

  describe("getActiveReservations", () => {
    it("should return active reservations with status filter", async () => {
      const activeReservations = [
        makeMockReservation({ status: ReservationStatus.PENDING }),
        makeMockReservation({
          id: "res-2",
          status: ReservationStatus.CONFIRMED,
        }),
      ];
      mockReservationRepo.find.mockResolvedValue(activeReservations);

      const result = await service.getActiveReservations("org-1");

      expect(mockReservationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: "org-1" }),
        }),
      );
      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // getReservationById
  // ==========================================================================

  describe("getReservationById", () => {
    it("should return reservation when found", async () => {
      const reservation = makeMockReservation({ id: "res-1" });
      mockReservationRepo.findOne.mockResolvedValue(reservation);

      const result = await service.getReservationById("org-1", "res-1");

      expect(mockReservationRepo.findOne).toHaveBeenCalledWith({
        where: { organizationId: "org-1", id: "res-1" },
      });
      expect(result).toEqual(reservation);
    });

    it("should throw NotFoundException when reservation not found", async () => {
      mockReservationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getReservationById("org-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getReservations (paginated + filtered)
  // ==========================================================================

  describe("getReservations", () => {
    it("should return paginated results with applied filters", async () => {
      const qb = createMockQB();
      qb["getCount"].mockResolvedValue(5);
      qb["getMany"].mockResolvedValue([makeMockReservation()]);
      mockReservationRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getReservations("org-1", {
        taskId: "task-1",
        status: ReservationStatus.PENDING,
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(1);
      expect(qb["andWhere"]).toHaveBeenCalledWith(
        "r.taskId = :taskId",
        expect.any(Object),
      );
      expect(qb["andWhere"]).toHaveBeenCalledWith(
        "r.status = :status",
        expect.any(Object),
      );
    });

    it("should use default page=1 limit=50 when no filters provided", async () => {
      const qb = createMockQB();
      qb["getCount"].mockResolvedValue(0);
      qb["getMany"].mockResolvedValue([]);
      mockReservationRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getReservations("org-1");

      expect(qb["skip"]).toHaveBeenCalledWith(0); // (1-1)*50 = 0
      expect(qb["take"]).toHaveBeenCalledWith(50);
      expect(result).toEqual({ data: [], total: 0 });
    });

    it("should cap limit at 100", async () => {
      const qb = createMockQB();
      qb["getCount"].mockResolvedValue(0);
      qb["getMany"].mockResolvedValue([]);
      mockReservationRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getReservations("org-1", { limit: 500 });

      expect(qb["take"]).toHaveBeenCalledWith(100);
    });
  });

  // ==========================================================================
  // getReservationsSummary
  // ==========================================================================

  describe("getReservationsSummary", () => {
    it("should return byStatus, totalActiveReservedQuantity, expiringWithin24h", async () => {
      const qb1 = createMockQB();
      const qb2 = createMockQB();
      const qb3 = createMockQB();

      qb1["getRawMany"].mockResolvedValue([
        { status: ReservationStatus.PENDING, count: "3" },
        { status: ReservationStatus.CONFIRMED, count: "7" },
      ]);
      qb2["getRawOne"].mockResolvedValue({ totalReserved: "42.5" });
      qb3["getCount"].mockResolvedValue(2);

      // The service creates 3 separate query builders
      mockReservationRepo.createQueryBuilder
        .mockReturnValueOnce(qb1)
        .mockReturnValueOnce(qb2)
        .mockReturnValueOnce(qb3);

      const result = await service.getReservationsSummary("org-1");

      expect(result.byStatus).toEqual({
        [ReservationStatus.PENDING]: 3,
        [ReservationStatus.CONFIRMED]: 7,
      });
      expect(result.totalActiveReservedQuantity).toBe(42.5);
      expect(result.expiringWithin24h).toBe(2);
    });

    it("should handle empty results gracefully", async () => {
      const qb1 = createMockQB();
      const qb2 = createMockQB();
      const qb3 = createMockQB();

      qb1["getRawMany"].mockResolvedValue([]);
      qb2["getRawOne"].mockResolvedValue({ totalReserved: "0" });
      qb3["getCount"].mockResolvedValue(0);

      mockReservationRepo.createQueryBuilder
        .mockReturnValueOnce(qb1)
        .mockReturnValueOnce(qb2)
        .mockReturnValueOnce(qb3);

      const result = await service.getReservationsSummary("org-1");

      expect(result.byStatus).toEqual({});
      expect(result.totalActiveReservedQuantity).toBe(0);
      expect(result.expiringWithin24h).toBe(0);
    });
  });

  // ==========================================================================
  // expireOldReservations (CRON)
  // ==========================================================================

  describe("expireOldReservations", () => {
    it("should return early when no expired reservations exist", async () => {
      mockReservationRepo.find.mockResolvedValue([]);

      await service.expireOldReservations();

      // No transactions should be initiated
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it("should expire a warehouse reservation and release stock", async () => {
      const expired = makeMockReservation({
        id: "res-exp-1",
        status: ReservationStatus.PENDING,
        quantityReserved: 5,
        quantityFulfilled: 0,
        inventoryLevel: InventoryLevel.WAREHOUSE,
        organizationId: "org-1",
        productId: "prod-1",
      });
      mockReservationRepo.find.mockResolvedValue([expired]);

      const lockedReservation = makeMockReservation({
        ...expired,
        // isActive getter → true since status = PENDING
      });
      const warehouseItem = { reservedQuantity: 5 };
      const mockMovement = { id: "mv-exp-1" };

      mockManager.findOne
        .mockResolvedValueOnce(lockedReservation) // re-fetch with lock
        .mockResolvedValueOnce(warehouseItem); // warehouse
      mockManager.create.mockReturnValueOnce(mockMovement);
      mockManager.save
        .mockResolvedValueOnce(warehouseItem)
        .mockResolvedValueOnce(lockedReservation)
        .mockResolvedValueOnce(mockMovement);

      await service.expireOldReservations();

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(lockedReservation.status).toBe(ReservationStatus.EXPIRED);
      const savedWarehouse = mockManager.save.mock.calls[0][1];
      expect(savedWarehouse.reservedQuantity).toBe(0);
    });

    it("should skip reservation that is no longer active when re-fetched", async () => {
      const expired = makeMockReservation({
        status: ReservationStatus.PENDING,
      });
      mockReservationRepo.find.mockResolvedValue([expired]);

      // Re-fetch returns an already-fulfilled reservation
      const alreadyProcessed = makeMockReservation({
        status: ReservationStatus.FULFILLED,
      });
      mockManager.findOne.mockResolvedValueOnce(alreadyProcessed);

      await service.expireOldReservations();

      // No save should occur
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it("should skip reservation when re-fetch returns null", async () => {
      const expired = makeMockReservation({
        status: ReservationStatus.CONFIRMED,
      });
      mockReservationRepo.find.mockResolvedValue([expired]);

      mockManager.findOne.mockResolvedValueOnce(null); // null = already deleted

      await service.expireOldReservations();

      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it("should continue processing remaining reservations after one fails", async () => {
      const expired1 = makeMockReservation({
        id: "res-1",
        status: ReservationStatus.PENDING,
      });
      const expired2 = makeMockReservation({
        id: "res-2",
        status: ReservationStatus.CONFIRMED,
      });
      mockReservationRepo.find.mockResolvedValue([expired1, expired2]);

      // First transaction throws, second succeeds
      mockDataSource.transaction
        .mockRejectedValueOnce(new Error("DB lock timeout"))
        .mockImplementationOnce(
          (cb: (m: typeof mockManager) => Promise<unknown>) => cb(mockManager),
        );

      const lockedRes2 = makeMockReservation({
        id: "res-2",
        status: ReservationStatus.CONFIRMED,
        quantityReserved: 3,
        quantityFulfilled: 0,
        inventoryLevel: InventoryLevel.WAREHOUSE,
      });
      const warehouseItem = { reservedQuantity: 3 };
      const mockMovement = { id: "mv-2" };

      mockManager.findOne
        .mockResolvedValueOnce(lockedRes2)
        .mockResolvedValueOnce(warehouseItem);
      mockManager.create.mockReturnValueOnce(mockMovement);
      mockManager.save
        .mockResolvedValueOnce(warehouseItem)
        .mockResolvedValueOnce(lockedRes2)
        .mockResolvedValueOnce(mockMovement);

      // Should not throw even though first reservation failed
      await expect(service.expireOldReservations()).resolves.not.toThrow();
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(2);
    });
  });
});
