import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InventoryReconciliationService } from "./inventory-reconciliation.service";
import {
  InventoryReconciliation,
  InventoryReconciliationStatus,
} from "../entities/inventory-reconciliation.entity";
import { InventoryReconciliationItem } from "../entities/inventory-reconciliation-item.entity";
import { InventoryBalance } from "../../stock-movements/entities/inventory-balance.entity";
import { Product } from "../../products/entities/product.entity";
import { StockMovementsService } from "../../stock-movements/services/stock-movements.service";
import {
  MovementType,
  MovementReferenceType,
} from "../../stock-movements/entities/stock-movement.entity";

describe("InventoryReconciliationService", () => {
  let service: InventoryReconciliationService;

  let recRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let itemRepo: { create: jest.Mock; save: jest.Mock };
  let balanceRepo: {
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
  };
  let productRepo: { findOne: jest.Mock };
  let stockMovementsService: { record: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const createFakeManager = (
    balances: Array<{
      organizationId: string;
      locationId: string;
      productId: string;
      quantity: number;
    }>,
    products: Array<{ id: string; purchasePrice: number }>,
  ) => {
    const saved: Array<{ kind: string; value: unknown }> = [];
    return {
      find: jest.fn().mockResolvedValue(balances),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(products),
      })),
      create: jest.fn((EntityClass: unknown, data: Record<string, unknown>) => {
        const name =
          typeof EntityClass === "function"
            ? (EntityClass as { name: string }).name
            : "Unknown";
        return { __kind: name, ...data };
      }),
      save: jest.fn((entity: unknown) => {
        if (Array.isArray(entity)) {
          entity.forEach((e) => saved.push({ kind: "item", value: e }));
          return Promise.resolve(entity);
        }
        const ent = entity as { id?: string };
        const withId = { id: ent.id ?? "saved-1", ...ent };
        saved.push({ kind: "recon", value: withId });
        return Promise.resolve(withId);
      }),
      savedLog: saved,
    };
  };

  beforeEach(async () => {
    recRepo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) =>
        Promise.resolve({ id: entity.id ?? "rec-1", ...entity }),
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    itemRepo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ id: "item-1", ...entity })),
    };
    balanceRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };
    productRepo = { findOne: jest.fn() };
    stockMovementsService = {
      record: jest.fn().mockResolvedValue({ id: "movement-1" }),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryReconciliationService,
        {
          provide: getRepositoryToken(InventoryReconciliation),
          useValue: recRepo,
        },
        {
          provide: getRepositoryToken(InventoryReconciliationItem),
          useValue: itemRepo,
        },
        {
          provide: getRepositoryToken(InventoryBalance),
          useValue: balanceRepo,
        },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: StockMovementsService, useValue: stockMovementsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(InventoryReconciliationService);
  });

  // =========================================================================
  // start
  // =========================================================================

  describe("start", () => {
    it("creates DRAFT reconciliation with countedAt + byUserId", async () => {
      const result = await service.start("org-1", "loc-1", "user-1");

      expect(recRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          locationId: "loc-1",
          status: InventoryReconciliationStatus.DRAFT,
          totalDifferenceQty: 0,
          totalDifferenceAmount: 0,
          nedostacha: 0,
          byUserId: "user-1",
        }),
      );
      const createCall = recRepo.create.mock.calls[0]?.[0] as {
        countedAt: Date;
      };
      expect(createCall.countedAt).toBeInstanceOf(Date);
      expect(result).toHaveProperty("id", "rec-1");
    });
  });

  // =========================================================================
  // getExpectedBalances
  // =========================================================================

  describe("getExpectedBalances", () => {
    it("returns rows from inventory_balances joined with products", async () => {
      const fakeQb = {
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { productId: "p-1", qty: 10, name: "Cola", cost: "5000" },
          { productId: "p-2", qty: 3, name: "Water", cost: null },
        ]),
      };
      balanceRepo.createQueryBuilder.mockReturnValue(fakeQb);

      const result = await service.getExpectedBalances("org-1", "loc-1");

      expect(result).toEqual([
        {
          productId: "p-1",
          productName: "Cola",
          expectedQty: 10,
          unitCost: 5000,
        },
        {
          productId: "p-2",
          productName: "Water",
          expectedQty: 3,
          unitCost: 0,
        },
      ]);
    });
  });

  // =========================================================================
  // submit
  // =========================================================================

  describe("submit", () => {
    it("creates ADJUSTMENT_MINUS for shortage, nedostacha = |diff| * unitCost", async () => {
      recRepo.findOne.mockResolvedValue({
        id: "rec-1",
        organizationId: "org-1",
        locationId: "loc-1",
        status: InventoryReconciliationStatus.DRAFT,
      });

      const balances = [
        {
          organizationId: "org-1",
          locationId: "loc-1",
          productId: "p-1",
          quantity: 10,
        },
      ];
      const products = [{ id: "p-1", purchasePrice: 5000 }];
      const fakeManager = createFakeManager(balances, products);
      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => unknown) => cb(fakeManager),
      );

      const result = (await service.submit(
        "org-1",
        "rec-1",
        [{ productId: "p-1", actualQty: 7 }],
        "user-1",
      )) as InventoryReconciliation;

      // stock movement called: expected=10 actual=7 diff=-3 → ADJUSTMENT_MINUS qty=3
      expect(stockMovementsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          productId: "p-1",
          fromLocationId: "loc-1",
          toLocationId: null,
          quantity: 3,
          movementType: MovementType.ADJUSTMENT_MINUS,
          unitCost: 5000,
          referenceType: MovementReferenceType.RECONCILIATION,
          referenceId: "rec-1",
        }),
      );

      // nedostacha = 3 * 5000 = 15000
      expect(result.nedostacha).toBe(15000);
      expect(result.totalDifferenceQty).toBe(-3);
      expect(result.totalDifferenceAmount).toBe(-15000);
      expect(result.status).toBe(InventoryReconciliationStatus.SUBMITTED);
    });

    it("creates ADJUSTMENT_PLUS for surplus, nedostacha = 0", async () => {
      recRepo.findOne.mockResolvedValue({
        id: "rec-2",
        organizationId: "org-1",
        locationId: "loc-1",
        status: InventoryReconciliationStatus.DRAFT,
      });

      const balances = [
        {
          organizationId: "org-1",
          locationId: "loc-1",
          productId: "p-1",
          quantity: 5,
        },
      ];
      const products = [{ id: "p-1", purchasePrice: 1000 }];
      const fakeManager = createFakeManager(balances, products);
      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => unknown) => cb(fakeManager),
      );

      const result = (await service.submit(
        "org-1",
        "rec-2",
        [{ productId: "p-1", actualQty: 8 }],
        "user-1",
      )) as InventoryReconciliation;

      expect(stockMovementsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          fromLocationId: null,
          toLocationId: "loc-1",
          quantity: 3,
          movementType: MovementType.ADJUSTMENT_PLUS,
        }),
      );
      expect(result.nedostacha).toBe(0);
      expect(result.totalDifferenceQty).toBe(3);
      expect(result.totalDifferenceAmount).toBe(3000);
    });

    it("rejects if already SUBMITTED", async () => {
      recRepo.findOne.mockResolvedValue({
        id: "rec-1",
        organizationId: "org-1",
        status: InventoryReconciliationStatus.SUBMITTED,
      });

      await expect(
        service.submit(
          "org-1",
          "rec-1",
          [{ productId: "p-1", actualQty: 1 }],
          "user-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects if reconciliation not found", async () => {
      recRepo.findOne.mockResolvedValue(null);
      await expect(
        service.submit(
          "org-1",
          "rec-x",
          [{ productId: "p-1", actualQty: 1 }],
          "user-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejects if items array is empty", async () => {
      recRepo.findOne.mockResolvedValue({
        id: "rec-1",
        organizationId: "org-1",
        status: InventoryReconciliationStatus.DRAFT,
      });
      await expect(
        service.submit("org-1", "rec-1", [], "user-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("skips stock movement when diffQty = 0", async () => {
      recRepo.findOne.mockResolvedValue({
        id: "rec-3",
        organizationId: "org-1",
        locationId: "loc-1",
        status: InventoryReconciliationStatus.DRAFT,
      });

      const balances = [
        {
          organizationId: "org-1",
          locationId: "loc-1",
          productId: "p-1",
          quantity: 5,
        },
      ];
      const products = [{ id: "p-1", purchasePrice: 1000 }];
      const fakeManager = createFakeManager(balances, products);
      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => unknown) => cb(fakeManager),
      );

      const result = (await service.submit(
        "org-1",
        "rec-3",
        [{ productId: "p-1", actualQty: 5 }],
        "user-1",
      )) as InventoryReconciliation;

      expect(stockMovementsService.record).not.toHaveBeenCalled();
      expect(result.totalDifferenceQty).toBe(0);
      expect(result.nedostacha).toBe(0);
    });
  });

  // =========================================================================
  // cancel
  // =========================================================================

  describe("cancel", () => {
    it("cancels DRAFT reconciliation", async () => {
      recRepo.findOne.mockResolvedValue({
        id: "rec-1",
        organizationId: "org-1",
        status: InventoryReconciliationStatus.DRAFT,
      });

      const result = await service.cancel("org-1", "rec-1");
      expect(result.status).toBe(InventoryReconciliationStatus.CANCELLED);
    });

    it("rejects cancelling a SUBMITTED reconciliation", async () => {
      recRepo.findOne.mockResolvedValue({
        id: "rec-1",
        organizationId: "org-1",
        status: InventoryReconciliationStatus.SUBMITTED,
      });

      await expect(service.cancel("org-1", "rec-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws NotFound for missing reconciliation", async () => {
      recRepo.findOne.mockResolvedValue(null);
      await expect(service.cancel("org-1", "rec-x")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // findById — tenant isolation
  // =========================================================================

  describe("findById", () => {
    it("throws NotFound for wrong org (tenant isolation)", async () => {
      recRepo.findOne.mockResolvedValue(null);
      await expect(service.findById("wrong-org", "rec-1")).rejects.toThrow(
        NotFoundException,
      );
      expect(recRepo.findOne).toHaveBeenCalledWith({
        where: { id: "rec-1", organizationId: "wrong-org" },
        relations: ["items", "items.product", "location", "byUser"],
      });
    });

    it("returns reconciliation with relations when found", async () => {
      const rec = {
        id: "rec-1",
        organizationId: "org-1",
        items: [],
      };
      recRepo.findOne.mockResolvedValue(rec);
      const result = await service.findById("org-1", "rec-1");
      expect(result).toBe(rec);
    });
  });
});
