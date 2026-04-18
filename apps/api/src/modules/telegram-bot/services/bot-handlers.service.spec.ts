import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ObjectLiteral, Repository } from "typeorm";
import { BotHandlersService } from "./bot-handlers.service";
import { BotTaskOpsService } from "./bot-task-ops.service";
import { BotMachineOpsService } from "./bot-machine-ops.service";
import { BotMenuService } from "./bot-menu.service";
import { BotRouteOpsService } from "./bot-route-ops.service";
import { BotStatsService } from "./bot-stats.service";
import { User } from "../../users/entities/user.entity";
import { Task } from "../../tasks/entities/task.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { SessionState } from "./bot-types";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
});

function createMockContext(overrides: any = {}) {
  return {
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithHTML: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    from: { id: 123456789, first_name: "Test", language_code: "ru" },
    message: { text: "/start", chat: { id: 123456789, type: "private" } },
    callbackQuery: { data: "" },
    user: {
      id: "user-1",
      firstName: "Operator",
      lastName: "Test",
      role: "operator",
      organizationId: "org-1",
    },
    organizationId: "org-1",
    ...overrides,
  } as any;
}

describe("BotHandlersService", () => {
  let service: BotHandlersService;
  let menuService: BotMenuService;
  let taskOpsService: BotTaskOpsService;
  let machineOpsService: BotMachineOpsService;

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
        BotHandlersService,
        BotTaskOpsService,
        BotMachineOpsService,
        BotMenuService,
        {
          provide: BotRouteOpsService,
          useValue: { setBot: jest.fn() },
        },
        {
          provide: BotStatsService,
          useValue: { setBot: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
        {
          provide: getRepositoryToken(Task),
          useValue: createMockRepository<Task>(),
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: createMockRepository<Machine>(),
        },
      ],
    }).compile();

    service = module.get<BotHandlersService>(BotHandlersService);
    menuService = module.get<BotMenuService>(BotMenuService);
    taskOpsService = module.get<BotTaskOpsService>(BotTaskOpsService);
    machineOpsService = module.get<BotMachineOpsService>(BotMachineOpsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // setBot — handler registration
  // ==========================================================================

  describe("setBot", () => {
    it("should register commands, actions, and message handlers", () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      expect(bot.command).toHaveBeenCalled();
      expect(bot.action).toHaveBeenCalled();
      expect(bot.on).toHaveBeenCalled();
    });

    it("should register /start, /help, /mytasks, /machines commands", () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      expect(registeredCommands["start"]).toBeDefined();
      expect(registeredCommands["help"]).toBeDefined();
      expect(registeredCommands["mytasks"]).toBeDefined();
      expect(registeredCommands["machines"]).toBeDefined();
    });
  });

  // ==========================================================================
  // /start command
  // ==========================================================================

  describe("/start command", () => {
    it("should show unregistered user screen when user is not set", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      jest
        .spyOn(menuService, "handleUnregisteredUser")
        .mockResolvedValue(undefined);

      const ctx = createMockContext({ user: undefined });
      await registeredCommands["start"](ctx);

      expect(menuService.handleUnregisteredUser).toHaveBeenCalledWith(ctx);
    });

    it("should show main menu when user is registered", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      jest.spyOn(menuService, "showMainMenu").mockResolvedValue(undefined);

      const ctx = createMockContext();
      await registeredCommands["start"](ctx);

      expect(menuService.showMainMenu).toHaveBeenCalledWith(ctx);
    });
  });

  // ==========================================================================
  // /mytasks command
  // ==========================================================================

  describe("/mytasks command", () => {
    it("should reply with error when user is not registered", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      const ctx = createMockContext({ user: undefined });
      await registeredCommands["mytasks"](ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("не зарегистрированы"),
      );
    });

    it("should call showMyTasks when user is registered", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      jest.spyOn(taskOpsService, "showMyTasks").mockResolvedValue(undefined);

      const ctx = createMockContext();
      await registeredCommands["mytasks"](ctx);

      expect(taskOpsService.showMyTasks).toHaveBeenCalledWith(ctx);
    });
  });

  // ==========================================================================
  // /task command
  // ==========================================================================

  describe("/task command", () => {
    it("should show error when no task ID provided", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      const ctx = createMockContext({
        message: { text: "/task", chat: { id: 123, type: "private" } },
      });
      await registeredCommands["task"](ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Укажите ID"),
      );
    });

    it("should call showTaskDetails with provided task ID", async () => {
      const bot = createMockBot();
      service.setBot(bot, new Map());

      jest
        .spyOn(taskOpsService, "showTaskDetails")
        .mockResolvedValue(undefined);

      const ctx = createMockContext({
        message: { text: "/task abc-123", chat: { id: 123, type: "private" } },
      });
      await registeredCommands["task"](ctx);

      expect(taskOpsService.showTaskDetails).toHaveBeenCalledWith(
        ctx,
        "abc-123",
      );
    });
  });

  // ==========================================================================
  // Text message handler (state machine)
  // ==========================================================================

  describe("text message handler", () => {
    it("should ignore text when no session exists", async () => {
      const sessions = new Map();
      const bot = createMockBot();
      service.setBot(bot, sessions);

      jest
        .spyOn(taskOpsService, "saveTaskComment")
        .mockResolvedValue(undefined);

      const ctx = createMockContext({
        message: { text: "some text", chat: { id: 123, type: "private" } },
      });
      await registeredOn["text"](ctx);

      expect(taskOpsService.saveTaskComment).not.toHaveBeenCalled();
    });

    it("should route to saveTaskComment when awaiting comment", async () => {
      const sessions = new Map();
      sessions.set(123456789, {
        state: SessionState.AWAITING_COMMENT,
        data: { taskId: "task-1", action: "postpone" },
      });
      const bot = createMockBot();
      service.setBot(bot, sessions);

      jest
        .spyOn(taskOpsService, "saveTaskComment")
        .mockResolvedValue(undefined);

      const ctx = createMockContext({
        message: { text: "reason text", chat: { id: 123, type: "private" } },
      });
      await registeredOn["text"](ctx);

      expect(taskOpsService.saveTaskComment).toHaveBeenCalledWith(
        ctx,
        "task-1",
        "reason text",
      );
    });

    it("should parse cash amount and call saveCashAmount", async () => {
      const sessions = new Map();
      sessions.set(123456789, {
        state: SessionState.AWAITING_CASH_AMOUNT,
        data: { taskId: "task-2" },
      });
      const bot = createMockBot();
      service.setBot(bot, sessions);

      jest.spyOn(taskOpsService, "saveCashAmount").mockResolvedValue(undefined);

      const ctx = createMockContext({
        message: { text: "150000", chat: { id: 123, type: "private" } },
      });
      await registeredOn["text"](ctx);

      expect(taskOpsService.saveCashAmount).toHaveBeenCalledWith(
        ctx,
        "task-2",
        150000,
      );
    });

    it("should reply with error for invalid cash amount", async () => {
      const sessions = new Map();
      sessions.set(123456789, {
        state: SessionState.AWAITING_CASH_AMOUNT,
        data: { taskId: "task-2" },
      });
      const bot = createMockBot();
      service.setBot(bot, sessions);

      const ctx = createMockContext({
        message: { text: "not-a-number", chat: { id: 123, type: "private" } },
      });
      await registeredOn["text"](ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("корректную сумму"),
      );
    });
  });

  // ==========================================================================
  // cancel callback
  // ==========================================================================

  describe("cancel callback", () => {
    it("should clear session and show main menu", async () => {
      const sessions = new Map();
      sessions.set(123456789, {
        state: SessionState.AWAITING_COMMENT,
        data: {},
      });

      const bot = createMockBot();
      service.setBot(bot, sessions);

      jest.spyOn(menuService, "showMainMenu").mockResolvedValue(undefined);

      const ctx = createMockContext();
      await registeredActions["cancel"](ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith("Отменено");
      expect(sessions.has(123456789)).toBe(false);
      expect(menuService.showMainMenu).toHaveBeenCalledWith(ctx);
    });
  });
});
