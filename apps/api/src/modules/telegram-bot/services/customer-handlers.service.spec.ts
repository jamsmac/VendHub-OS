import { Test, TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { CustomerHandlersService } from "./customer-handlers.service";
import { CustomerMenuService } from "./customer-menu.service";
import { CustomerCatalogService } from "./customer-catalog.service";
import { CustomerLoyaltyService } from "./customer-loyalty.service";
import { CustomerOrdersService } from "./customer-orders.service";
import { CustomerComplaintsService } from "./customer-complaints.service";
import { CustomerLocationService } from "./customer-location.service";
import { CustomerCartService } from "./customer-cart.service";
import { CustomerEngagementService } from "./customer-engagement.service";
import { CustomerSessionState } from "./customer-types";

function createMockContext(overrides: any = {}) {
  return {
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithHTML: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    from: { id: 123456789, first_name: "Test", language_code: "ru" },
    message: { text: "/start", chat: { id: 123456789, type: "private" } },
    callbackQuery: { data: "" },
    ...overrides,
  } as any;
}

describe("CustomerHandlersService", () => {
  let service: CustomerHandlersService;
  let menuService: CustomerMenuService;
  let catalogService: CustomerCatalogService;
  let loyaltyService: CustomerLoyaltyService;
  let ordersService: CustomerOrdersService;
  let complaintsService: CustomerComplaintsService;

  // Create a minimal mock bot that captures handler registrations
  let registeredCommands: Record<string, Function>;
  let registeredActions: Record<string, Function>;
  let registeredOn: Record<string, Function>;

  function createMockBot() {
    registeredCommands = {};
    registeredActions = {};
    registeredOn = {};

    return {
      command: jest.fn((name: string, handler: Function) => {
        registeredCommands[name] = handler;
      }),
      action: jest.fn((trigger: string | RegExp, handler: Function) => {
        const key = trigger instanceof RegExp ? trigger.source : trigger;
        registeredActions[key] = handler;
      }),
      on: jest.fn((event: string, handler: Function) => {
        registeredOn[event] = handler;
      }),
    } as any;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerHandlersService,
        CustomerMenuService,
        CustomerCatalogService,
        CustomerComplaintsService,
        {
          provide: CustomerLoyaltyService,
          useValue: {
            setBot: jest.fn(),
            showLoyaltyOverview: jest.fn(),
            showLoyaltyTiers: jest.fn(),
          },
        },
        {
          provide: CustomerOrdersService,
          useValue: {
            setBot: jest.fn(),
            showOrderHistory: jest.fn(),
            showOrderDetails: jest.fn(),
          },
        },
        {
          provide: CustomerLocationService,
          useValue: { setBot: jest.fn() },
        },
        {
          provide: CustomerCartService,
          useValue: { setBot: jest.fn() },
        },
        {
          provide: CustomerEngagementService,
          useValue: { setBot: jest.fn() },
        },
        { provide: DataSource, useValue: { query: jest.fn() } },
      ],
    }).compile();

    service = module.get<CustomerHandlersService>(CustomerHandlersService);
    menuService = module.get<CustomerMenuService>(CustomerMenuService);
    catalogService = module.get<CustomerCatalogService>(CustomerCatalogService);
    loyaltyService = module.get<CustomerLoyaltyService>(CustomerLoyaltyService);
    ordersService = module.get<CustomerOrdersService>(CustomerOrdersService);
    complaintsService = module.get<CustomerComplaintsService>(
      CustomerComplaintsService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // setBot and handler registration
  // ==========================================================================

  describe("setBot", () => {
    it("should register command, action, and message handlers", () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      expect(bot.command).toHaveBeenCalled();
      expect(bot.action).toHaveBeenCalled();
      expect(bot.on).toHaveBeenCalled();
    });

    it("should register /start command", () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      expect(registeredCommands["start"]).toBeDefined();
    });

    it("should register /help command", () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      expect(registeredCommands["help"]).toBeDefined();
    });
  });

  // ==========================================================================
  // /start command
  // ==========================================================================

  describe("/start command", () => {
    it("should call showMainMenu for plain /start", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      jest.spyOn(menuService, "showMainMenu").mockResolvedValue(undefined);

      const ctx = createMockContext({
        message: { text: "/start", chat: { id: 123, type: "private" } },
      });
      await registeredCommands["start"](ctx);

      expect(menuService.showMainMenu).toHaveBeenCalledWith(ctx);
    });

    it("should handle deep link /start complaint_{machineId}", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      jest
        .spyOn(complaintsService, "startComplaintFlow")
        .mockResolvedValue(undefined);

      const ctx = createMockContext({
        message: {
          text: "/start complaint_machine-uuid-123",
          chat: { id: 123, type: "private" },
        },
      });
      await registeredCommands["start"](ctx);

      expect(complaintsService.startComplaintFlow).toHaveBeenCalledWith(
        ctx,
        "machine-uuid-123",
      );
    });

    it("should handle deep link /start status_{transactionId}", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      jest
        .spyOn(complaintsService, "showTransactionStatus")
        .mockResolvedValue(undefined);

      const ctx = createMockContext({
        message: {
          text: "/start status_trx-456",
          chat: { id: 123, type: "private" },
        },
      });
      await registeredCommands["start"](ctx);

      expect(complaintsService.showTransactionStatus).toHaveBeenCalledWith(
        ctx,
        "trx-456",
      );
    });
  });

  // ==========================================================================
  // /help command
  // ==========================================================================

  describe("/help command", () => {
    it("should reply with help message", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      const ctx = createMockContext();
      await registeredCommands["help"](ctx);

      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("/start"));
    });
  });

  // ==========================================================================
  // Callback handlers
  // ==========================================================================

  describe("callback handlers", () => {
    it('should register "menu" callback action', () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      expect(registeredActions["menu"]).toBeDefined();
    });

    it('should register "catalog" callback action', () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      expect(registeredActions["catalog"]).toBeDefined();
    });
  });

  // ==========================================================================
  // Text message handler (state machine routing)
  // ==========================================================================

  describe("text message handler", () => {
    it("should ignore text when no session exists", async () => {
      const sessions = new Map();
      const bot = createMockBot();
      service.setBot(bot, sessions);

      jest
        .spyOn(complaintsService, "handleMachineCode")
        .mockResolvedValue(undefined);

      const ctx = createMockContext({
        from: { id: 999 },
        message: { text: "VH-001", chat: { id: 999, type: "private" } },
      });
      await registeredOn["text"](ctx);

      expect(complaintsService.handleMachineCode).not.toHaveBeenCalled();
    });

    it("should route to handleMachineCode when awaiting machine code", async () => {
      const sessions = new Map();
      sessions.set(999, {
        state: CustomerSessionState.AWAITING_MACHINE_CODE,
        data: {},
      });
      const bot = createMockBot();
      service.setBot(bot, sessions);

      jest
        .spyOn(complaintsService, "handleMachineCode")
        .mockResolvedValue(undefined);

      const ctx = createMockContext({
        from: { id: 999 },
        message: { text: "VH-001", chat: { id: 999, type: "private" } },
      });
      await registeredOn["text"](ctx);

      expect(complaintsService.handleMachineCode).toHaveBeenCalledWith(
        ctx,
        "VH-001",
      );
    });
  });
});
