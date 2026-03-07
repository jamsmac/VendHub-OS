import { Test, TestingModule } from "@nestjs/testing";
import { CustomerLoyaltyService } from "./customer-loyalty.service";

function createMockContext(overrides: any = {}) {
  return {
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithHTML: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    from: { id: 123456789, first_name: "Test", language_code: "ru" },
    message: { text: "/bonuses", chat: { id: 123456789, type: "private" } },
    callbackQuery: null,
    ...overrides,
  } as any;
}

describe("CustomerLoyaltyService", () => {
  let service: CustomerLoyaltyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerLoyaltyService],
    }).compile();

    service = module.get<CustomerLoyaltyService>(CustomerLoyaltyService);
    service.setBot({} as any, new Map());
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // showLoyaltyOverview
  // ==========================================================================

  describe("showLoyaltyOverview", () => {
    it('should reply with loyalty "coming soon" message', async () => {
      const ctx = createMockContext();
      await service.showLoyaltyOverview(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Бонусная программа");
      expect(text).toContain("скоро будет запущена");
    });

    it("should edit message when called from callback", async () => {
      const ctx = createMockContext({ callbackQuery: { data: "loyalty" } });
      await service.showLoyaltyOverview(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    });

    it("should fall back to reply when edit fails", async () => {
      const ctx = createMockContext({
        callbackQuery: { data: "loyalty" },
        editMessageText: jest.fn().mockRejectedValue(new Error("fail")),
      });
      await service.showLoyaltyOverview(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
    });

    it("should mention loyalty tiers in the overview", async () => {
      const ctx = createMockContext();
      await service.showLoyaltyOverview(ctx);

      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Bronze");
      expect(text).toContain("Diamond");
    });

    it('should include a "tiers" button', async () => {
      const ctx = createMockContext();
      await service.showLoyaltyOverview(ctx);

      const keyboard = ctx.reply.mock.calls[0][1];
      expect(keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // showPointsHistory
  // ==========================================================================

  describe("showPointsHistory", () => {
    it('should show "coming soon" placeholder for points history', async () => {
      const ctx = createMockContext();
      await service.showPointsHistory(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("История баллов");
      expect(text).toContain("скоро будет доступна");
    });

    it("should edit message when called from callback", async () => {
      const ctx = createMockContext({
        callbackQuery: { data: "loyalty_history" },
      });
      await service.showPointsHistory(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // showTiersInfo
  // ==========================================================================

  describe("showTiersInfo", () => {
    it("should display all five loyalty tiers", async () => {
      const ctx = createMockContext();
      await service.showTiersInfo(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Bronze");
      expect(text).toContain("Silver");
      expect(text).toContain("Gold");
      expect(text).toContain("Platinum");
      expect(text).toContain("Diamond");
    });

    it("should include cashback percentages", async () => {
      const ctx = createMockContext();
      await service.showTiersInfo(ctx);

      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("1%");
      expect(text).toContain("3%");
      expect(text).toContain("5%");
      expect(text).toContain("10%");
      expect(text).toContain("15%");
    });

    it("should include special perks for gold+", async () => {
      const ctx = createMockContext();
      await service.showTiersInfo(ctx);

      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("бесплатно");
    });

    it("should edit message when called from callback", async () => {
      const ctx = createMockContext({
        callbackQuery: { data: "loyalty_tiers" },
      });
      await service.showTiersInfo(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    });
  });
});
