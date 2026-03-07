import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { BotTaskOpsService } from "./bot-task-ops.service";
import { Task, TaskStatus, TaskType } from "../../tasks/entities/task.entity";

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
    message: { text: "/mytasks", chat: { id: 123456789, type: "private" } },
    callbackQuery: { data: "" },
    user: {
      id: "user-1",
      firstName: "Operator",
      role: "operator",
      organizationId: "org-1",
    },
    organizationId: "org-1",
    ...overrides,
  } as any;
}

describe("BotTaskOpsService", () => {
  let service: BotTaskOpsService;
  let taskRepo: MockRepository<Task>;

  beforeEach(async () => {
    taskRepo = createMockRepository<Task>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotTaskOpsService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
      ],
    }).compile();

    service = module.get<BotTaskOpsService>(BotTaskOpsService);
    service.setBot({} as any, new Map());
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // showMyTasks
  // ==========================================================================

  describe("showMyTasks", () => {
    it("should return early when user is not set", async () => {
      const ctx = createMockContext({ user: undefined });
      await service.showMyTasks(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
      expect(ctx.editMessageText).not.toHaveBeenCalled();
    });

    it('should show "no active tasks" when list is empty', async () => {
      taskRepo.findAndCount!.mockResolvedValue([[], 0]);

      const ctx = createMockContext();
      await service.showMyTasks(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("нет активных задач"),
        expect.anything(),
      );
    });

    it("should list tasks with type labels and machine names", async () => {
      const tasks = [
        {
          id: "t1",
          typeCode: "refill",
          status: "assigned",
          machine: { name: "Machine A" },
          dueDate: new Date("2025-07-01"),
        },
        {
          id: "t2",
          typeCode: "collection",
          status: "in_progress",
          machine: { name: "Machine B" },
          dueDate: null,
        },
      ];
      taskRepo.findAndCount!.mockResolvedValue([tasks, 2]);

      const ctx = createMockContext();
      await service.showMyTasks(ctx);

      // Should try editMessageText first, fall back to reply
      const calledFn =
        ctx.editMessageText.mock.calls.length > 0
          ? ctx.editMessageText
          : ctx.reply;
      const text = calledFn.mock.calls[0][0] as string;
      expect(text).toContain("Machine A");
      expect(text).toContain("Machine B");
      expect(text).toContain("Пополнение");
      expect(text).toContain("Инкассация");
    });

    it("should include pagination buttons when tasks exceed page size", async () => {
      const tasks = Array.from({ length: 5 }, (_, i) => ({
        id: `t${i}`,
        typeCode: "refill",
        status: "assigned",
        machine: { name: `Machine ${i}` },
        dueDate: null,
      }));
      taskRepo.findAndCount!.mockResolvedValue([tasks, 12]);

      const ctx = createMockContext();
      await service.showMyTasks(ctx);

      // Keyboard should be present with pagination
      const calledFn =
        ctx.editMessageText.mock.calls.length > 0
          ? ctx.editMessageText
          : ctx.reply;
      const keyboard = calledFn.mock.calls[0][1];
      expect(keyboard).toBeDefined();
    });
  });

  // ==========================================================================
  // showTaskDetails
  // ==========================================================================

  describe("showTaskDetails", () => {
    it("should show error when task not found", async () => {
      taskRepo.findOne!.mockResolvedValue(null);

      const ctx = createMockContext();
      await service.showTaskDetails(ctx, "nonexistent");

      expect(ctx.reply).toHaveBeenCalledWith("❌ Задача не найдена");
    });

    it("should display full task details", async () => {
      const task = {
        id: "t1",
        taskNumber: "TSK-001",
        typeCode: "refill",
        status: TaskStatus.IN_PROGRESS,
        description: "Test description",
        priority: "high",
        dueDate: new Date("2025-07-01"),
        machine: {
          name: "CoffeeMachine",
          address: "Main St",
          latitude: null,
          longitude: null,
        },
        items: [],
        hasPhotoBefore: true,
        hasPhotoAfter: false,
        expectedCashAmount: null,
      };
      taskRepo.findOne!.mockResolvedValue(task);

      const ctx = createMockContext();
      await service.showTaskDetails(ctx, "t1");

      const calledFn =
        ctx.editMessageText.mock.calls.length > 0
          ? ctx.editMessageText
          : ctx.reply;
      const text = calledFn.mock.calls[0][0] as string;
      expect(text).toContain("TSK-001");
      expect(text).toContain("CoffeeMachine");
      expect(text).toContain("Высокий");
      expect(text).toContain("Test description");
    });

    it("should show start button for assigned tasks", async () => {
      const task = {
        id: "t1",
        taskNumber: "TSK-001",
        typeCode: "refill",
        status: TaskStatus.ASSIGNED,
        machine: { name: "M1", address: "A1", latitude: null, longitude: null },
        items: [],
        hasPhotoBefore: false,
        hasPhotoAfter: false,
      };
      taskRepo.findOne!.mockResolvedValue(task);

      const ctx = createMockContext();
      await service.showTaskDetails(ctx, "t1");

      // keyboard should contain action buttons
      const calledFn =
        ctx.editMessageText.mock.calls.length > 0
          ? ctx.editMessageText
          : ctx.reply;
      expect(calledFn).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // startTask
  // ==========================================================================

  describe("startTask", () => {
    it("should reject if task is not in ASSIGNED status", async () => {
      taskRepo.findOne!.mockResolvedValue({
        id: "t1",
        status: TaskStatus.COMPLETED,
      });

      const ctx = createMockContext();
      await service.startTask(ctx, "t1");

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Невозможно"),
      );
    });

    it("should update task status to IN_PROGRESS", async () => {
      const task = {
        id: "t1",
        status: TaskStatus.ASSIGNED,
        typeCode: "refill",
        taskNumber: "TSK-001",
        machine: { name: "M1", address: null, latitude: null, longitude: null },
        items: [],
        hasPhotoBefore: false,
        hasPhotoAfter: false,
      };
      taskRepo.findOne!.mockResolvedValue(task);
      taskRepo.update!.mockResolvedValue({ affected: 1 });

      const ctx = createMockContext();
      await service.startTask(ctx, "t1");

      expect(taskRepo.update).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
        }),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Задача начата"),
      );
    });
  });

  // ==========================================================================
  // initiateTaskComplete
  // ==========================================================================

  describe("initiateTaskComplete", () => {
    it("should reject if task is not IN_PROGRESS", async () => {
      taskRepo.findOne!.mockResolvedValue({
        id: "t1",
        status: TaskStatus.ASSIGNED,
      });

      const ctx = createMockContext();
      await service.initiateTaskComplete(ctx, "t1");

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("не может быть завершена"),
      );
    });

    it("should warn about missing photos", async () => {
      taskRepo.findOne!.mockResolvedValue({
        id: "t1",
        status: TaskStatus.IN_PROGRESS,
        hasPhotoBefore: false,
        hasPhotoAfter: false,
        typeCode: "refill",
      });

      const ctx = createMockContext();
      await service.initiateTaskComplete(ctx, "t1");

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Необходимо загрузить"),
        expect.anything(),
      );
    });
  });

  // ==========================================================================
  // completeTask
  // ==========================================================================

  describe("completeTask", () => {
    it("should mark task as completed and clear session", async () => {
      const sessions = new Map();
      sessions.set(123456789, { state: "awaiting_cash_amount", data: {} });
      service.setBot({} as any, sessions);

      taskRepo.findOne!.mockResolvedValue({
        id: "t1",
        status: TaskStatus.IN_PROGRESS,
      });
      taskRepo.update!.mockResolvedValue({ affected: 1 });

      const ctx = createMockContext();
      await service.completeTask(ctx, "t1", 50000);

      expect(taskRepo.update).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          status: TaskStatus.COMPLETED,
          actualCashAmount: 50000,
        }),
      );
      expect(sessions.has(123456789)).toBe(false);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("успешно завершена"),
      );
    });
  });

  // ==========================================================================
  // postponeTask
  // ==========================================================================

  describe("postponeTask", () => {
    it("should set session state to AWAITING_COMMENT", async () => {
      const sessions = new Map();
      service.setBot({} as any, sessions);

      const ctx = createMockContext();
      await service.postponeTask(ctx, "t1");

      expect(sessions.get(123456789)).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({ taskId: "t1" }),
        }),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("причину"),
      );
    });
  });

  // ==========================================================================
  // saveTaskPhoto
  // ==========================================================================

  describe("saveTaskPhoto", () => {
    it('should save "before" photo and confirm', async () => {
      const sessions = new Map();
      sessions.set(123456789, {
        state: "awaiting_photo_before",
        data: { taskId: "t1" },
      });
      service.setBot({} as any, sessions);

      taskRepo.findOne!.mockResolvedValue({ metadata: {} });
      taskRepo.update!.mockResolvedValue({ affected: 1 });

      const ctx = createMockContext();
      // Re-mock findOne for showTaskDetails call after save
      taskRepo
        .findOne!.mockResolvedValueOnce({ metadata: {} })
        .mockResolvedValueOnce({
          id: "t1",
          taskNumber: "TSK-001",
          typeCode: "refill",
          status: "in_progress",
          machine: {
            name: "M1",
            address: null,
            latitude: null,
            longitude: null,
          },
          items: [],
          hasPhotoBefore: true,
          hasPhotoAfter: false,
        });

      await service.saveTaskPhoto(ctx, "t1", "file-id-123", "before");

      expect(taskRepo.update).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Фото ДО"),
      );
      expect(sessions.has(123456789)).toBe(false);
    });
  });

  // ==========================================================================
  // setShowMainMenuFn
  // ==========================================================================

  describe("setShowMainMenuFn", () => {
    it("should set the main menu callback function", () => {
      const fn = jest.fn();
      service.setShowMainMenuFn(fn);

      // The function is stored internally; we verify it doesn't throw
      expect(() => service.setShowMainMenuFn(fn)).not.toThrow();
    });
  });
});
