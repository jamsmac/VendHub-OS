import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { CustomerCatalogService } from "./customer-catalog.service";

function createMockContext(overrides: any = {}) {
  return {
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithHTML: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    from: { id: 123456789, first_name: "Test", language_code: "ru" },
    message: { text: "/menu", chat: { id: 123456789, type: "private" } },
    callbackQuery: null,
    ...overrides,
  } as any;
}

describe("CustomerCatalogService", () => {
  let service: CustomerCatalogService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerCatalogService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CustomerCatalogService>(CustomerCatalogService);
    service.setBot({} as any, new Map());
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // showCategories
  // ==========================================================================

  describe("showCategories", () => {
    it("should reply with category list", async () => {
      const ctx = createMockContext();
      await service.showCategories(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Наше меню");
      expect(text).toContain("категорию");
    });

    it("should edit message when called from callback", async () => {
      const ctx = createMockContext({ callbackQuery: { data: "catalog" } });
      await service.showCategories(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    });

    it("should fall back to reply when edit fails", async () => {
      const ctx = createMockContext({
        callbackQuery: { data: "catalog" },
        editMessageText: jest.fn().mockRejectedValue(new Error("fail")),
      });
      await service.showCategories(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // showCategoryProducts
  // ==========================================================================

  describe("showCategoryProducts", () => {
    it('should show "no products" message when category is empty', async () => {
      dataSource.query
        .mockResolvedValueOnce([]) // products query
        .mockResolvedValueOnce([{ count: "0" }]); // count query

      const ctx = createMockContext();
      await service.showCategoryProducts(ctx, "coffee");

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Товаров в этой категории пока нет");
    });

    it("should list products with prices", async () => {
      const products = [
        {
          id: "p1",
          name: "Americano",
          price: 15000,
          category: "coffee",
          description: "Strong coffee",
          discount_percent: null,
        },
        {
          id: "p2",
          name: "Latte",
          price: 20000,
          category: "coffee",
          description: null,
          discount_percent: 10,
        },
      ];
      dataSource.query
        .mockResolvedValueOnce(products)
        .mockResolvedValueOnce([{ count: "2" }]);

      const ctx = createMockContext({ callbackQuery: { data: "cat:coffee" } });
      await service.showCategoryProducts(ctx, "coffee");

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
      const text = ctx.editMessageText.mock.calls[0][0] as string;
      expect(text).toContain("Americano");
      expect(text).toContain("Latte");
      expect(text).toContain("15");
      expect(text).toContain("Скидка 10%");
    });

    it("should display pagination when total exceeds page size", async () => {
      const products = Array.from({ length: 5 }, (_, i) => ({
        id: `p${i}`,
        name: `Product ${i}`,
        price: 10000,
        category: "coffee",
        description: null,
        discount_percent: null,
      }));
      dataSource.query
        .mockResolvedValueOnce(products)
        .mockResolvedValueOnce([{ count: "12" }]);

      const ctx = createMockContext({ callbackQuery: { data: "cat:coffee" } });
      await service.showCategoryProducts(ctx, "coffee", 1);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
      // Keyboard should include pagination buttons
      const keyboard = ctx.editMessageText.mock.calls[0][1];
      expect(keyboard).toBeDefined();
    });

    it("should handle database errors gracefully", async () => {
      dataSource.query.mockRejectedValue(new Error("DB error"));

      const ctx = createMockContext();
      await service.showCategoryProducts(ctx, "coffee");

      expect(ctx.reply).toHaveBeenCalledWith(
        "❌ Ошибка загрузки товаров. Попробуйте позже.",
      );
    });

    it("should truncate long descriptions to 60 chars", async () => {
      const longDesc = "A".repeat(100);
      const products = [
        {
          id: "p1",
          name: "TestProduct",
          price: 5000,
          category: "snack",
          description: longDesc,
          discount_percent: null,
        },
      ];
      dataSource.query
        .mockResolvedValueOnce(products)
        .mockResolvedValueOnce([{ count: "1" }]);

      const ctx = createMockContext({ callbackQuery: { data: "cat:snack" } });
      await service.showCategoryProducts(ctx, "snack");

      const text = ctx.editMessageText.mock.calls[0][0] as string;
      expect(text).toContain("...");
    });
  });

  // ==========================================================================
  // showProductDetails
  // ==========================================================================

  describe("showProductDetails", () => {
    it("should show product details with price", async () => {
      dataSource.query.mockResolvedValue([
        {
          id: "p1",
          name: "Espresso",
          name_uz: "Espresso UZ",
          price: 12000,
          category: "coffee",
          description: "Rich espresso",
          description_uz: null,
          options: null,
          calories: 5,
          discount_percent: null,
        },
      ]);

      const ctx = createMockContext({ callbackQuery: { data: "product:p1" } });
      await service.showProductDetails(ctx, "p1");

      const text = ctx.editMessageText.mock.calls[0][0] as string;
      expect(text).toContain("Espresso");
      expect(text).toContain("12");
      expect(text).toContain("5 ккал");
    });

    it('should show "not found" when product does not exist', async () => {
      dataSource.query.mockResolvedValue([]);

      const ctx = createMockContext();
      await service.showProductDetails(ctx, "nonexistent");

      expect(ctx.reply).toHaveBeenCalledWith("❌ Товар не найден");
    });

    it("should show discount price when discount_percent is present", async () => {
      dataSource.query.mockResolvedValue([
        {
          id: "p1",
          name: "Cappuccino",
          name_uz: null,
          price: 20000,
          category: "coffee",
          description: null,
          description_uz: null,
          options: null,
          calories: null,
          discount_percent: 20,
        },
      ]);

      const ctx = createMockContext({ callbackQuery: { data: "product:p1" } });
      await service.showProductDetails(ctx, "p1");

      const text = ctx.editMessageText.mock.calls[0][0] as string;
      expect(text).toContain("Со скидкой");
      expect(text).toContain("-20%");
    });

    it("should display product options when present", async () => {
      dataSource.query.mockResolvedValue([
        {
          id: "p1",
          name: "Coffee",
          name_uz: null,
          price: 10000,
          category: "coffee",
          description: null,
          description_uz: null,
          options: [{ name: "Large", price: 15000 }, { name: "Small" }],
          calories: null,
          discount_percent: null,
        },
      ]);

      const ctx = createMockContext({ callbackQuery: { data: "product:p1" } });
      await service.showProductDetails(ctx, "p1");

      const text = ctx.editMessageText.mock.calls[0][0] as string;
      expect(text).toContain("Large");
      expect(text).toContain("Small");
      expect(text).toContain("Варианты");
    });

    it("should handle database errors gracefully", async () => {
      dataSource.query.mockRejectedValue(new Error("DB error"));

      const ctx = createMockContext();
      await service.showProductDetails(ctx, "p1");

      expect(ctx.reply).toHaveBeenCalledWith("❌ Ошибка загрузки товара.");
    });
  });

  // ==========================================================================
  // showNearbyMachines
  // ==========================================================================

  describe("showNearbyMachines", () => {
    it('should show "not found" when no machines available', async () => {
      dataSource.query.mockResolvedValue([]);

      const ctx = createMockContext();
      await service.showNearbyMachines(ctx);

      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Автоматы не найдены");
    });

    it("should list machines with status icons", async () => {
      const machines = [
        {
          id: "m1",
          name: "Machine A",
          address: "Street 1",
          status: "online",
          hours: "08:00-22:00",
          latitude: null,
          longitude: null,
        },
        {
          id: "m2",
          name: "Machine B",
          address: "Street 2",
          status: "low_stock",
          hours: null,
          latitude: null,
          longitude: null,
        },
      ];
      dataSource.query.mockResolvedValue(machines);

      const ctx = createMockContext({ callbackQuery: { data: "machines" } });
      await service.showNearbyMachines(ctx);

      const text = ctx.editMessageText.mock.calls[0][0] as string;
      expect(text).toContain("Machine A");
      expect(text).toContain("Machine B");
      expect(text).toContain("🟢");
      expect(text).toContain("🟡");
    });

    it("should handle database errors gracefully", async () => {
      dataSource.query.mockRejectedValue(new Error("DB error"));

      const ctx = createMockContext();
      await service.showNearbyMachines(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        "❌ Ошибка загрузки автоматов. Попробуйте позже.",
      );
    });
  });
});
