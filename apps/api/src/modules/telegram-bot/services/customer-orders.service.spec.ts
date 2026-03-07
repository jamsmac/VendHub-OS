import { Test, TestingModule } from "@nestjs/testing";
import { CustomerOrdersService } from "./customer-orders.service";

function createMockContext(overrides: any = {}) {
  return {
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithHTML: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    from: { id: 123456789, first_name: "Test", language_code: "ru" },
    message: { text: "/orders", chat: { id: 123456789, type: "private" } },
    callbackQuery: null,
    ...overrides,
  } as any;
}

describe("CustomerOrdersService", () => {
  let service: CustomerOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerOrdersService],
    }).compile();

    service = module.get<CustomerOrdersService>(CustomerOrdersService);
    service.setBot({} as any, new Map());
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // showOrderHistory
  // ==========================================================================

  describe("showOrderHistory", () => {
    it('should show "coming soon" placeholder via reply', async () => {
      const ctx = createMockContext();
      await service.showOrderHistory(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("История заказов");
      expect(text).toContain("скоро будет доступна");
    });

    it("should edit message when called from callback", async () => {
      const ctx = createMockContext({ callbackQuery: { data: "orders" } });
      await service.showOrderHistory(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    });

    it("should fall back to reply when edit fails", async () => {
      const ctx = createMockContext({
        callbackQuery: { data: "orders" },
        editMessageText: jest.fn().mockRejectedValue(new Error("fail")),
      });
      await service.showOrderHistory(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
    });

    it("should accept a page parameter without error", async () => {
      const ctx = createMockContext();
      await expect(service.showOrderHistory(ctx, 3)).resolves.not.toThrow();
    });

    it("should include a keyboard with navigation buttons", async () => {
      const ctx = createMockContext();
      await service.showOrderHistory(ctx);

      const keyboard = ctx.reply.mock.calls[0][1];
      expect(keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // showOrderDetails
  // ==========================================================================

  describe("showOrderDetails", () => {
    it('should show "coming soon" placeholder', async () => {
      const ctx = createMockContext();
      await service.showOrderDetails(ctx, "order-123");

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Детали заказа");
      expect(text).toContain("скоро будет доступна");
    });

    it("should include back-to-orders button", async () => {
      const ctx = createMockContext();
      await service.showOrderDetails(ctx, "order-123");

      const keyboard = ctx.reply.mock.calls[0][1];
      expect(keyboard).toBeDefined();
    });

    it("should accept any orderId without error", async () => {
      const ctx = createMockContext();
      await expect(
        service.showOrderDetails(ctx, "any-id"),
      ).resolves.not.toThrow();
    });
  });
});
