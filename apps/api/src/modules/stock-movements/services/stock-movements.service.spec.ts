import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { StockMovementsService } from "./stock-movements.service";
import {
  StockMovement,
  MovementType,
  MovementReferenceType,
} from "../entities/stock-movement.entity";
import { InventoryBalance } from "../entities/inventory-balance.entity";

describe("StockMovementsService", () => {
  let service: StockMovementsService;
  let movementRepo: {
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let balanceRepo: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    movementRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Array.isArray(entity)
            ? Promise.resolve(entity)
            : Promise.resolve({ id: "movement-1", ...entity }),
        ),
      createQueryBuilder: jest.fn(),
    };

    balanceRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        { provide: getRepositoryToken(StockMovement), useValue: movementRepo },
        {
          provide: getRepositoryToken(InventoryBalance),
          useValue: balanceRepo,
        },
      ],
    }).compile();

    service = module.get(StockMovementsService);
  });

  // =========================================================================
  // record() — single movement
  // =========================================================================

  describe("record", () => {
    it("should save a movement with correct enum values and at timestamp", async () => {
      const at = new Date("2026-04-20T12:00:00Z");
      const result = await service.record({
        organizationId: "org-1",
        productId: "product-1",
        fromLocationId: "loc-a",
        toLocationId: "loc-b",
        quantity: 5,
        movementType: MovementType.TRANSFER_TO_MACHINE,
        unitCost: 1000,
        referenceType: MovementReferenceType.MANUAL,
        at,
      });

      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          productId: "product-1",
          fromLocationId: "loc-a",
          toLocationId: "loc-b",
          quantity: 5,
          movementType: MovementType.TRANSFER_TO_MACHINE,
          unitCost: 1000,
          referenceType: MovementReferenceType.MANUAL,
          at,
        }),
      );
      expect(movementRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty("id", "movement-1");
    });

    it("should round fractional quantities to int", async () => {
      await service.record({
        organizationId: "org-1",
        productId: "product-1",
        toLocationId: "loc-b",
        quantity: 2.7,
        movementType: MovementType.PURCHASE_IN,
      });

      expect(movementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 3 }),
      );
    });

    it("should default at to current time when omitted", async () => {
      const before = Date.now();
      await service.record({
        organizationId: "org-1",
        productId: "product-1",
        toLocationId: "loc-b",
        quantity: 1,
        movementType: MovementType.PURCHASE_IN,
      });
      const after = Date.now();

      const created = movementRepo.create.mock.calls[0][0];
      expect(created.at).toBeInstanceOf(Date);
      expect(created.at.getTime()).toBeGreaterThanOrEqual(before);
      expect(created.at.getTime()).toBeLessThanOrEqual(after);
    });

    it("should reject zero quantity", async () => {
      await expect(
        service.record({
          organizationId: "org-1",
          productId: "product-1",
          toLocationId: "loc-b",
          quantity: 0,
          movementType: MovementType.PURCHASE_IN,
        }),
      ).rejects.toThrow(/positive/);
    });

    it("should reject negative quantity", async () => {
      await expect(
        service.record({
          organizationId: "org-1",
          productId: "product-1",
          toLocationId: "loc-b",
          quantity: -5,
          movementType: MovementType.SALE,
        }),
      ).rejects.toThrow(/positive/);
    });

    it("should reject movement with no locations", async () => {
      await expect(
        service.record({
          organizationId: "org-1",
          productId: "product-1",
          quantity: 1,
          movementType: MovementType.SALE,
        }),
      ).rejects.toThrow(/fromLocationId or toLocationId/);
    });

    it("should accept SALE with only fromLocationId (leaving system)", async () => {
      await expect(
        service.record({
          organizationId: "org-1",
          productId: "product-1",
          fromLocationId: "loc-a",
          quantity: 1,
          movementType: MovementType.SALE,
          unitPrice: 10000,
        }),
      ).resolves.toBeDefined();
    });

    it("should accept PURCHASE_IN with only toLocationId (entering system)", async () => {
      await expect(
        service.record({
          organizationId: "org-1",
          productId: "product-1",
          toLocationId: "loc-b",
          quantity: 50,
          movementType: MovementType.PURCHASE_IN,
          unitCost: 800,
        }),
      ).resolves.toBeDefined();
    });
  });

  // =========================================================================
  // recordBatch()
  // =========================================================================

  describe("recordBatch", () => {
    it("should return empty array when no inputs given", async () => {
      const result = await service.recordBatch([]);
      expect(result).toEqual([]);
      expect(movementRepo.save).not.toHaveBeenCalled();
    });

    it("should save N movements when given N inputs", async () => {
      const inputs = [
        {
          organizationId: "org-1",
          productId: "product-1",
          toLocationId: "loc-b",
          quantity: 10,
          movementType: MovementType.PURCHASE_IN,
        },
        {
          organizationId: "org-1",
          productId: "product-2",
          toLocationId: "loc-b",
          quantity: 5,
          movementType: MovementType.PURCHASE_IN,
        },
      ];

      await service.recordBatch(inputs);

      expect(movementRepo.create).toHaveBeenCalledTimes(2);
      // Single save call with array (single DB round-trip)
      expect(movementRepo.save).toHaveBeenCalledTimes(1);
      expect(movementRepo.save.mock.calls[0][0]).toHaveLength(2);
    });
  });

  // =========================================================================
  // list() — filtering
  // =========================================================================

  describe("list", () => {
    function makeListQb(data: StockMovement[], total: number) {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([data, total]),
      };
      return qb;
    }

    it("should filter by productId", async () => {
      const qb = makeListQb([], 0);
      movementRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list({
        organizationId: "org-1",
        productId: "product-1",
      });

      expect(qb.where).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          productId: "product-1",
        }),
      );
    });

    it("should filter by movementType", async () => {
      const qb = makeListQb([], 0);
      movementRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list({
        organizationId: "org-1",
        movementType: MovementType.SALE,
      });

      expect(qb.where).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          movementType: MovementType.SALE,
        }),
      );
    });

    it("should filter by locationId (from or to)", async () => {
      const qb = makeListQb([], 0);
      movementRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list({
        organizationId: "org-1",
        locationId: "loc-x",
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("from_location_id"),
        { loc: "loc-x" },
      );
    });

    it("should apply date range filter", async () => {
      const qb = makeListQb([], 0);
      movementRepo.createQueryBuilder.mockReturnValue(qb);

      const from = new Date("2026-04-01");
      const to = new Date("2026-04-30");

      await service.list({
        organizationId: "org-1",
        from,
        to,
      });

      const whereArg = qb.where.mock.calls[0][0];
      expect(whereArg).toHaveProperty("at");
    });

    it("should cap limit at 200", async () => {
      const qb = makeListQb([], 0);
      movementRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list({
        organizationId: "org-1",
        limit: 500,
      });

      expect(qb.take).toHaveBeenCalledWith(200);
    });

    it("should default limit to 50 and offset to 0", async () => {
      const qb = makeListQb([], 0);
      movementRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list({ organizationId: "org-1" });

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(50);
    });
  });

  // =========================================================================
  // getBalance / getTotalBalance
  // =========================================================================

  describe("getBalance", () => {
    it("should return 0 when no balance row exists", async () => {
      balanceRepo.findOne.mockResolvedValue(null);
      const result = await service.getBalance("org-1", "loc-1", "product-1");
      expect(result).toBe(0);
    });

    it("should return quantity from balance row when it exists", async () => {
      balanceRepo.findOne.mockResolvedValue({ quantity: 42 });
      const result = await service.getBalance("org-1", "loc-1", "product-1");
      expect(result).toBe(42);
      expect(balanceRepo.findOne).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          locationId: "loc-1",
          productId: "product-1",
        },
      });
    });
  });

  describe("getTotalBalance", () => {
    function makeSumQb(total: string | null) {
      return {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest
          .fn()
          .mockResolvedValue(total === null ? null : { total }),
      };
    }

    it("should aggregate balances across locations", async () => {
      const qb = makeSumQb("123");
      balanceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTotalBalance("org-1", "product-1");
      expect(result).toBe(123);
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining("organization_id"),
        { org: "org-1", product: "product-1" },
      );
    });

    it("should return 0 when no rows exist", async () => {
      const qb = makeSumQb(null);
      balanceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTotalBalance("org-1", "product-1");
      expect(result).toBe(0);
    });

    it("should coerce string SUM result to number", async () => {
      const qb = makeSumQb("500");
      balanceRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTotalBalance("org-1", "product-1");
      expect(typeof result).toBe("number");
      expect(result).toBe(500);
    });
  });
});
