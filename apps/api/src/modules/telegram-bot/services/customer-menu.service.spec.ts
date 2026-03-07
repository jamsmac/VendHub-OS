import { Test, TestingModule } from "@nestjs/testing";
import { CustomerMenuService } from "./customer-menu.service";

function createMockContext(overrides: any = {}) {
  return {
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithHTML: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    from: { id: 123456789, first_name: "Test", language_code: "ru" },
    message: { text: "/start", chat: { id: 123456789, type: "private" } },
    callbackQuery: null,
    ...overrides,
  } as any;
}

describe("CustomerMenuService", () => {
  let service: CustomerMenuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerMenuService],
    }).compile();

    service = module.get<CustomerMenuService>(CustomerMenuService);
    service.setBot({} as any, new Map());
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // showMainMenu
  // ==========================================================================

  describe("showMainMenu", () => {
    it("should reply with the main menu when there is no callbackQuery", async () => {
      const ctx = createMockContext();
      await service.showMainMenu(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const replyText = ctx.reply.mock.calls[0][0] as string;
      expect(replyText).toContain("Привет, Test");
      expect(replyText).toContain("Выберите действие");
    });

    it("should edit the message when there is a callbackQuery", async () => {
      const ctx = createMockContext({ callbackQuery: { data: "menu" } });
      await service.showMainMenu(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
      const editText = ctx.editMessageText.mock.calls[0][0] as string;
      expect(editText).toContain("Привет, Test");
    });

    it("should fall back to reply when editMessageText throws", async () => {
      const ctx = createMockContext({
        callbackQuery: { data: "menu" },
        editMessageText: jest
          .fn()
          .mockRejectedValue(new Error("message not modified")),
      });
      await service.showMainMenu(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
    });

    it("should greet with default name when from.first_name is missing", async () => {
      const ctx = createMockContext({ from: { id: 111 } });
      await service.showMainMenu(ctx);

      const replyText = ctx.reply.mock.calls[0][0] as string;
      expect(replyText).toContain("друг");
    });

    it("should include all menu buttons in the reply", async () => {
      const ctx = createMockContext();
      await service.showMainMenu(ctx);

      const keyboard = ctx.reply.mock.calls[0][1];
      expect(keyboard).toBeDefined();
    });

    it("should include language selection buttons", async () => {
      const ctx = createMockContext();
      await service.showMainMenu(ctx);

      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Посмотреть меню и цены");
      expect(text).toContain("Проверить свои бонусы");
    });
  });

  // ==========================================================================
  // getHelpMessage
  // ==========================================================================

  describe("getHelpMessage", () => {
    it("should return a help message string", () => {
      const helpMessage = service.getHelpMessage();
      expect(typeof helpMessage).toBe("string");
      expect(helpMessage.length).toBeGreaterThan(0);
    });

    it("should include all commands", () => {
      const helpMessage = service.getHelpMessage();
      expect(helpMessage).toContain("/start");
      expect(helpMessage).toContain("/menu");
      expect(helpMessage).toContain("/bonuses");
      expect(helpMessage).toContain("/orders");
      expect(helpMessage).toContain("/complaint");
      expect(helpMessage).toContain("/status");
      expect(helpMessage).toContain("/refund");
      expect(helpMessage).toContain("/mycomplaints");
      expect(helpMessage).toContain("/help");
    });

    it("should include support contact info", () => {
      const helpMessage = service.getHelpMessage();
      expect(helpMessage).toContain("support@vendhub.uz");
    });
  });
});
