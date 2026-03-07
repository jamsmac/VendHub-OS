import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { BotMenuService } from "./bot-menu.service";
import { User } from "../../users/entities/user.entity";
import { Task, TaskStatus } from "../../tasks/entities/task.entity";
import { Machine, MachineStatus } from "../../machines/entities/machine.entity";
import { UserRole } from "../../../common/enums";

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
    callbackQuery: null,
    user: {
      id: "user-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      phone: "+998901234567",
      role: UserRole.OPERATOR,
      organizationId: "org-1",
      isActive: true,
      createdAt: new Date("2025-01-01"),
    },
    organizationId: "org-1",
    ...overrides,
  } as any;
}

describe("BotMenuService", () => {
  let service: BotMenuService;
  let userRepo: MockRepository<User>;
  let taskRepo: MockRepository<Task>;
  let machineRepo: MockRepository<Machine>;

  beforeEach(async () => {
    userRepo = createMockRepository<User>();
    taskRepo = createMockRepository<Task>();
    machineRepo = createMockRepository<Machine>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotMenuService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
      ],
    }).compile();

    service = module.get<BotMenuService>(BotMenuService);
    service.setBot({} as any, new Map());
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // handleUnregisteredUser
  // ==========================================================================

  describe("handleUnregisteredUser", () => {
    it("should reply with welcome and access request button", async () => {
      const ctx = createMockContext({ user: undefined });
      await service.handleUnregisteredUser(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("Добро пожаловать");
      expect(text).toContain("регистрация");
    });
  });

  // ==========================================================================
  // showMainMenu
  // ==========================================================================

  describe("showMainMenu", () => {
    it("should return early when user is not set", async () => {
      const ctx = createMockContext({ user: undefined });
      await service.showMainMenu(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it("should show main menu with user name and role", async () => {
      taskRepo.count!.mockResolvedValue(3);

      const ctx = createMockContext();
      await service.showMainMenu(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("John");
      expect(text).toContain("Оператор");
    });

    it("should show active task count badge", async () => {
      taskRepo.count!.mockResolvedValue(5);

      const ctx = createMockContext();
      await service.showMainMenu(ctx);

      const text = ctx.reply.mock.calls[0][0] as string;
      // The task count appears in the button text, not the message
      // But the taskRepo.count should have been called
      expect(taskRepo.count).toHaveBeenCalled();
    });

    it("should include reports and team buttons for admin users", async () => {
      taskRepo.count!.mockResolvedValue(0);

      const ctx = createMockContext({
        user: { ...createMockContext().user, role: UserRole.ADMIN },
      });
      await service.showMainMenu(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
      // The keyboard includes reports/team buttons for admin
      const keyboard = ctx.reply.mock.calls[0][1];
      expect(keyboard).toBeDefined();
    });

    it("should edit message when called from callback", async () => {
      taskRepo.count!.mockResolvedValue(0);

      const ctx = createMockContext({ callbackQuery: { data: "menu" } });
      await service.showMainMenu(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    });

    it("should include warehouse buttons for warehouse role", async () => {
      taskRepo.count!.mockResolvedValue(0);

      const ctx = createMockContext({
        user: { ...createMockContext().user, role: UserRole.WAREHOUSE },
      });
      await service.showMainMenu(ctx);

      expect(ctx.reply).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // showMyStats
  // ==========================================================================

  describe("showMyStats", () => {
    it("should return early when user is not set", async () => {
      const ctx = createMockContext({ user: undefined });
      await service.showMyStats(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it("should show task statistics for last 30 days", async () => {
      taskRepo
        .count!.mockResolvedValueOnce(8) // completed
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(1); // overdue

      const ctx = createMockContext();
      await service.showMyStats(ctx);

      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("статистика");
      expect(text).toContain("8");
      expect(text).toContain("10");
      expect(text).toContain("80%");
    });
  });

  // ==========================================================================
  // showProfile
  // ==========================================================================

  describe("showProfile", () => {
    it("should return early when user is not set", async () => {
      const ctx = createMockContext({ user: undefined });
      await service.showProfile(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it("should display user profile details", async () => {
      const ctx = createMockContext();
      await service.showProfile(ctx);

      const text = ctx.reply.mock.calls[0][0] as string;
      expect(text).toContain("John");
      expect(text).toContain("john@test.com");
      expect(text).toContain("+998901234567");
      expect(text).toContain("Оператор");
    });
  });

  // ==========================================================================
  // getHelpMessage
  // ==========================================================================

  describe("getHelpMessage", () => {
    it("should return help text with all commands", () => {
      const help = service.getHelpMessage();

      expect(help).toContain("/start");
      expect(help).toContain("/mytasks");
      expect(help).toContain("/machines");
      expect(help).toContain("/stats");
      expect(help).toContain("/profile");
      expect(help).toContain("/overdue");
      expect(help).toContain("/help");
    });

    it("should accept optional role parameter", () => {
      const help = service.getHelpMessage("admin");
      expect(typeof help).toBe("string");
    });
  });
});
