import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PurchasesService } from "./purchases.service";
import {
  Purchase,
  PurchaseStatus,
  PaymentMethod,
} from "../entities/purchase.entity";
import { PurchaseItem } from "../entities/purchase-item.entity";
import {
  Product,
  ProductPriceHistory,
  PriceType,
  Supplier,
} from "../../products/entities/product.entity";
import { StockMovementsService } from "../../stock-movements/services/stock-movements.service";
import {
  MovementType,
  MovementReferenceType,
} from "../../stock-movements/entities/stock-movement.entity";

describe("PurchasesService", () => {
  let service: PurchasesService;

  let purchaseRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let itemRepo: { create: jest.Mock; save: jest.Mock };
  let productRepo: { findOne: jest.Mock };
  let priceHistoryRepo: { create: jest.Mock; save: jest.Mock };
  let supplierRepo: { findOne: jest.Mock };
  let stockMovementsService: { record: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  // A reusable fake "manager" for transactional work
  const createFakeManager = () => {
    const saved: Array<{ kind: string; value: unknown }> = [];
    const manager = {
      create: jest.fn((EntityClass: unknown, data: Record<string, unknown>) => {
        // tag with constructor name for assertions
        const name =
          typeof EntityClass === "function"
            ? (EntityClass as { name: string }).name
            : "Unknown";
        return { __kind: name, ...data };
      }),
      save: jest.fn((entity: { __kind?: string; id?: string }) => {
        if (Array.isArray(entity)) return Promise.resolve(entity);
        const withId = {
          id: entity.id ?? `saved-${saved.length + 1}`,
          ...entity,
        };
        saved.push({ kind: entity.__kind ?? "Unknown", value: withId });
        return Promise.resolve(withId);
      }),
      savedLog: saved,
    };
    return manager;
  };

  beforeEach(async () => {
    purchaseRepo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) =>
        Promise.resolve({
          id: entity.id ?? "purchase-1",
          ...entity,
        }),
      ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    itemRepo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) => Promise.resolve({ id: "item-1", ...entity })),
    };
    productRepo = { findOne: jest.fn() };
    priceHistoryRepo = {
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn((entity) =>
        Promise.resolve({ id: "history-1", ...entity }),
      ),
    };
    supplierRepo = { findOne: jest.fn() };
    stockMovementsService = {
      record: jest.fn().mockResolvedValue({ id: "movement-1" }),
    };

    // Default transaction impl runs callback with a fresh fake manager
    dataSource = {
      transaction: jest.fn(async (cb: (m: unknown) => unknown) => {
        const manager = createFakeManager();
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        { provide: getRepositoryToken(Purchase), useValue: purchaseRepo },
        { provide: getRepositoryToken(PurchaseItem), useValue: itemRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        {
          provide: getRepositoryToken(ProductPriceHistory),
          useValue: priceHistoryRepo,
        },
        { provide: getRepositoryToken(Supplier), useValue: supplierRepo },
        { provide: StockMovementsService, useValue: stockMovementsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(PurchasesService);
  });

  // =========================================================================
  // createDraft
  // =========================================================================

  describe("createDraft", () => {
    it("sets status=DRAFT and captures supplierNameSnapshot", async () => {
      supplierRepo.findOne.mockResolvedValue({
        id: "sup-1",
        organizationId: "org-1",
        name: "ACME Supplies",
      });

      const result = await service.createDraft({
        organizationId: "org-1",
        supplierId: "sup-1",
        warehouseLocationId: "loc-wh",
        paymentMethod: PaymentMethod.CASH,
        note: "initial",
        byUserId: "user-1",
      });

      expect(supplierRepo.findOne).toHaveBeenCalledWith({
        where: { id: "sup-1", organizationId: "org-1" },
      });
      expect(purchaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          supplierId: "sup-1",
          supplierNameSnapshot: "ACME Supplies",
          warehouseLocationId: "loc-wh",
          paymentMethod: PaymentMethod.CASH,
          status: PurchaseStatus.DRAFT,
          totalAmount: 0,
          totalItems: 0,
          byUserId: "user-1",
        }),
      );
      expect(result).toHaveProperty("id", "purchase-1");
    });

    it("throws NotFoundException if supplier belongs to a different org", async () => {
      supplierRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createDraft({
          organizationId: "org-1",
          supplierId: "sup-other",
          warehouseLocationId: "loc-wh",
          byUserId: "user-1",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("allows draft without supplier", async () => {
      await service.createDraft({
        organizationId: "org-1",
        warehouseLocationId: "loc-wh",
        byUserId: "user-1",
      });

      expect(supplierRepo.findOne).not.toHaveBeenCalled();
      expect(purchaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: null,
          supplierNameSnapshot: null,
          status: PurchaseStatus.DRAFT,
        }),
      );
    });
  });

  // =========================================================================
  // addItem
  // =========================================================================

  describe("addItem", () => {
    const draftPurchase = {
      id: "p-1",
      organizationId: "org-1",
      status: PurchaseStatus.DRAFT,
      totalItems: 0,
      totalAmount: 0,
    };

    it("rejects if purchase is not DRAFT", async () => {
      purchaseRepo.findOne.mockResolvedValue({
        ...draftPurchase,
        status: PurchaseStatus.RECEIVED,
      });

      await expect(
        service.addItem({
          purchaseId: "p-1",
          organizationId: "org-1",
          productId: "prod-1",
          quantity: 5,
          unitCost: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects non-positive quantity", async () => {
      purchaseRepo.findOne.mockResolvedValue({ ...draftPurchase });
      await expect(
        service.addItem({
          purchaseId: "p-1",
          organizationId: "org-1",
          productId: "prod-1",
          quantity: 0,
          unitCost: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects negative unitCost", async () => {
      purchaseRepo.findOne.mockResolvedValue({ ...draftPurchase });
      productRepo.findOne.mockResolvedValue({ id: "prod-1" });
      await expect(
        service.addItem({
          purchaseId: "p-1",
          organizationId: "org-1",
          productId: "prod-1",
          quantity: 1,
          unitCost: -1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("calculates lineTotal and updates purchase totals", async () => {
      const purchaseEntity = { ...draftPurchase };
      purchaseRepo.findOne.mockResolvedValue(purchaseEntity);
      productRepo.findOne.mockResolvedValue({
        id: "prod-1",
        organizationId: "org-1",
      });

      const saved = await service.addItem({
        purchaseId: "p-1",
        organizationId: "org-1",
        productId: "prod-1",
        quantity: 3,
        unitCost: 1500,
      });

      // Transaction should have been called
      expect(dataSource.transaction).toHaveBeenCalled();
      // Saved item shape
      expect(saved).toEqual(
        expect.objectContaining({
          purchaseId: "p-1",
          productId: "prod-1",
          quantity: 3,
          unitCost: 1500,
          lineTotal: 4500,
        }),
      );
      // Totals mutated
      expect(purchaseEntity.totalItems).toBe(3);
      expect(Number(purchaseEntity.totalAmount)).toBe(4500);
    });

    it("rounds lineTotal to 2 decimals", async () => {
      const purchaseEntity = { ...draftPurchase };
      purchaseRepo.findOne.mockResolvedValue(purchaseEntity);
      productRepo.findOne.mockResolvedValue({
        id: "prod-1",
        organizationId: "org-1",
      });

      const saved = await service.addItem({
        purchaseId: "p-1",
        organizationId: "org-1",
        productId: "prod-1",
        quantity: 2,
        unitCost: 12.345, // 2 * 12.345 = 24.69 → rounded to 24.69
      });

      // Always two decimals (no third digit)
      expect(Number.isInteger(saved.lineTotal * 100)).toBe(true);
      expect(saved.lineTotal).toBeCloseTo(24.69, 2);
    });

    it("throws NotFoundException when purchase belongs to another org", async () => {
      purchaseRepo.findOne.mockResolvedValue(null);
      await expect(
        service.addItem({
          purchaseId: "p-1",
          organizationId: "org-wrong",
          productId: "prod-1",
          quantity: 1,
          unitCost: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // submit
  // =========================================================================

  describe("submit", () => {
    it("creates PURCHASE_IN stock movements for each item and sets status=RECEIVED", async () => {
      const purchase = {
        id: "p-1",
        organizationId: "org-1",
        status: PurchaseStatus.DRAFT,
        number: "PO-001",
        supplierId: "sup-1",
        supplierNameSnapshot: "ACME",
        warehouseLocationId: "loc-wh",
        purchaseDate: new Date("2026-04-20"),
        items: [
          {
            id: "it-1",
            productId: "prod-1",
            quantity: 10,
            unitCost: 500,
            product: { id: "prod-1", purchasePrice: 500, sellingPrice: 1000 },
          },
          {
            id: "it-2",
            productId: "prod-2",
            quantity: 5,
            unitCost: 800,
            product: { id: "prod-2", purchasePrice: 800, sellingPrice: 1600 },
          },
        ],
      };
      purchaseRepo.findOne.mockResolvedValue(purchase);

      const result = await service.submit("p-1", "org-1", "user-1");

      // One stock movement per item
      expect(stockMovementsService.record).toHaveBeenCalledTimes(2);
      expect(stockMovementsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          productId: "prod-1",
          fromLocationId: null,
          toLocationId: "loc-wh",
          quantity: 10,
          movementType: MovementType.PURCHASE_IN,
          referenceType: MovementReferenceType.PURCHASE,
          referenceId: "p-1",
          byUserId: "user-1",
        }),
      );
      // No price change (cost matches), no history expected
      expect(result.status).toBe(PurchaseStatus.RECEIVED);
      expect(result.receivedAt).toBeInstanceOf(Date);
    });

    it("creates price history when cost changes and updates product.purchasePrice", async () => {
      const product = {
        id: "prod-1",
        purchasePrice: 500,
        sellingPrice: 1000,
      };
      const purchase = {
        id: "p-1",
        organizationId: "org-1",
        status: PurchaseStatus.DRAFT,
        number: "PO-002",
        supplierId: "sup-1",
        supplierNameSnapshot: "ACME",
        warehouseLocationId: "loc-wh",
        purchaseDate: new Date("2026-04-20"),
        items: [
          {
            id: "it-1",
            productId: "prod-1",
            quantity: 10,
            unitCost: 600, // cost changed 500 → 600
            product,
          },
        ],
      };
      purchaseRepo.findOne.mockResolvedValue(purchase);

      // Capture the fake manager so we can inspect what was saved
      let capturedManager: ReturnType<typeof createFakeManager> | undefined;
      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => unknown) => {
          capturedManager = createFakeManager();
          return cb(capturedManager);
        },
      );

      await service.submit("p-1", "org-1", "user-1");

      expect(stockMovementsService.record).toHaveBeenCalledTimes(1);

      // A ProductPriceHistory row should have been created+saved
      expect(capturedManager).toBeDefined();
      const historyCreateCalls = capturedManager!.create.mock.calls.filter(
        (c) => (c[0] as { name?: string }).name === "ProductPriceHistory",
      );
      expect(historyCreateCalls.length).toBe(1);
      const historyPayload = historyCreateCalls[0][1];
      expect(historyPayload).toEqual(
        expect.objectContaining({
          organizationId: "org-1",
          productId: "prod-1",
          priceType: PriceType.COST,
          oldPrice: 500,
          newPrice: 600,
          supplierId: "sup-1",
          supplierNameSnapshot: "ACME",
          purchaseId: "p-1",
          changedByUserId: "user-1",
        }),
      );

      // product.purchasePrice updated in memory
      expect(product.purchasePrice).toBe(600);
    });

    it("does NOT create price history when cost is unchanged", async () => {
      const product = {
        id: "prod-1",
        purchasePrice: 500,
        sellingPrice: 1000,
      };
      const purchase = {
        id: "p-1",
        organizationId: "org-1",
        status: PurchaseStatus.DRAFT,
        number: "PO-003",
        supplierId: null,
        supplierNameSnapshot: null,
        warehouseLocationId: "loc-wh",
        purchaseDate: new Date("2026-04-20"),
        items: [
          {
            id: "it-1",
            productId: "prod-1",
            quantity: 10,
            unitCost: 500, // unchanged
            product,
          },
        ],
      };
      purchaseRepo.findOne.mockResolvedValue(purchase);

      let capturedManager: ReturnType<typeof createFakeManager> | undefined;
      dataSource.transaction.mockImplementation(
        async (cb: (m: unknown) => unknown) => {
          capturedManager = createFakeManager();
          return cb(capturedManager);
        },
      );

      await service.submit("p-1", "org-1", "user-1");

      expect(capturedManager).toBeDefined();
      const historyCreateCalls = capturedManager!.create.mock.calls.filter(
        (c) => (c[0] as { name?: string }).name === "ProductPriceHistory",
      );
      expect(historyCreateCalls.length).toBe(0);
      expect(product.purchasePrice).toBe(500); // unchanged
    });

    it("rejects submit if not DRAFT", async () => {
      purchaseRepo.findOne.mockResolvedValue({
        id: "p-1",
        organizationId: "org-1",
        status: PurchaseStatus.RECEIVED,
        items: [],
      });

      await expect(service.submit("p-1", "org-1", "user-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects submit if no items", async () => {
      purchaseRepo.findOne.mockResolvedValue({
        id: "p-1",
        organizationId: "org-1",
        status: PurchaseStatus.DRAFT,
        items: [],
      });

      await expect(service.submit("p-1", "org-1", "user-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws NotFoundException for cross-org submit (tenant isolation)", async () => {
      purchaseRepo.findOne.mockResolvedValue(null);
      await expect(
        service.submit("p-1", "org-wrong", "user-1"),
      ).rejects.toThrow(NotFoundException);

      expect(purchaseRepo.findOne).toHaveBeenCalledWith({
        where: { id: "p-1", organizationId: "org-wrong" },
        relations: ["items", "items.product"],
      });
    });
  });

  // =========================================================================
  // cancel
  // =========================================================================

  describe("cancel", () => {
    it("cancels a DRAFT purchase", async () => {
      const purchase = {
        id: "p-1",
        organizationId: "org-1",
        status: PurchaseStatus.DRAFT,
      };
      purchaseRepo.findOne.mockResolvedValue(purchase);

      const result = await service.cancel("p-1", "org-1");
      expect(result.status).toBe(PurchaseStatus.CANCELLED);
      expect(purchaseRepo.save).toHaveBeenCalled();
    });

    it("rejects if already RECEIVED", async () => {
      purchaseRepo.findOne.mockResolvedValue({
        id: "p-1",
        organizationId: "org-1",
        status: PurchaseStatus.RECEIVED,
      });
      await expect(service.cancel("p-1", "org-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws NotFoundException when not found in org", async () => {
      purchaseRepo.findOne.mockResolvedValue(null);
      await expect(service.cancel("p-1", "org-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // findById
  // =========================================================================

  describe("findById", () => {
    it("returns purchase with relations", async () => {
      const purchase = {
        id: "p-1",
        organizationId: "org-1",
        items: [],
        supplier: null,
        warehouseLocation: { id: "loc-wh" },
      };
      purchaseRepo.findOne.mockResolvedValue(purchase);

      const result = await service.findById("p-1", "org-1");
      expect(result).toBe(purchase);
      expect(purchaseRepo.findOne).toHaveBeenCalledWith({
        where: { id: "p-1", organizationId: "org-1" },
        relations: ["items", "items.product", "supplier", "warehouseLocation"],
      });
    });

    it("throws NotFoundException for cross-org (tenant isolation)", async () => {
      purchaseRepo.findOne.mockResolvedValue(null);
      await expect(service.findById("p-1", "org-wrong")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
