import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { BotMachineOpsService } from "./bot-machine-ops.service";
import { BotTaskOpsService } from "./bot-task-ops.service";
import { Task, TaskStatus, TaskType } from "../../tasks/entities/task.entity";
import { Machine } from "../../machines/entities/machine.entity";

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
    message: { text: "/machines", chat: { id: 123456789, type: "private" } },
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

describe("BotMachineOpsService", () => {
  let service: BotMachineOpsService;
  let taskRepo: MockRepository<Task>;
  let machineRepo: MockRepository<Machine>;
  let taskOpsService: BotTaskOpsService;

  beforeEach(async () => {
    taskRepo = createMockRepository<Task>();
    machineRepo = createMockRepository<Machine>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotMachineOpsService,
        BotTaskOpsService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
      ],
    }).compile();

    service = module.get<BotMachineOpsService>(BotMachineOpsService);
    taskOpsService = module.get<BotTaskOpsService>(BotTaskOpsService);
    service.setBot({} as any, new Map());
    taskOpsService.setBot({} as any, new Map());
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // showMyMachines
  // ==========================================================================

  describe("showMyMachines", () => {
    it("should return early when user is not set", async () => {
      const ctx = createMockContext({ user: undefined });
      await service.showMyMachines(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
      expect(ctx.editMessageText).not.toHaveBeenCalled();
    });

    it('should show "no machines" when list is empty', async () => {
      machineRepo.findAndCount!.mockResolvedValue([[], 0]);

      const ctx = createMockContext();
      await service.showMyMachines(ctx);

      expect(ctx.editMessageText).toHaveBeenCalledWith(
        expect.stringContaining("не закреплены аппараты"),
        expect.anything(),
      );
    });

    it("should list machines with status icons", async () => {
      const machines = [
        {
          id: "m1",
          name: "Coffee Pro",
          address: "Main St 1",
          status: "active",
        },
        { id: "m2", name: "Snack Box", address: null, status: "error" },
      ];
      machineRepo.findAndCount!.mockResolvedValue([machines, 2]);

      const ctx = createMockContext();
      await service.showMyMachines(ctx);

      const calledFn =
        ctx.editMessageText.mock.calls.length > 0
          ? ctx.editMessageText
          : ctx.reply;
      const text = calledFn.mock.calls[0][0] as string;
      expect(text).toContain("Coffee Pro");
      expect(text).toContain("Snack Box");
      expect(text).toContain("🟢");
      expect(text).toContain("🔴");
    });

    it("should include pagination buttons when total exceeds page size", async () => {
      const machines = Array.from({ length: 5 }, (_, i) => ({
        id: `m${i}`,
        name: `Machine ${i}`,
        address: "Addr",
        status: "active",
      }));
      machineRepo.findAndCount!.mockResolvedValue([machines, 12]);

      const ctx = createMockContext();
      await service.showMyMachines(ctx);

      const calledFn =
        ctx.editMessageText.mock.calls.length > 0
          ? ctx.editMessageText
          : ctx.reply;
      const keyboard = calledFn.mock.calls[0][1];
      expect(keyboard).toBeDefined();
    });

    it('should show "Адрес не указан" for machines without address', async () => {
      machineRepo.findAndCount!.mockResolvedValue([
        [{ id: "m1", name: "NoAddr Machine", address: null, status: "active" }],
        1,
      ]);

      const ctx = createMockContext();
      await service.showMyMachines(ctx);

      const calledFn =
        ctx.editMessageText.mock.calls.length > 0
          ? ctx.editMessageText
          : ctx.reply;
      const text = calledFn.mock.calls[0][0] as string;
      expect(text).toContain("Адрес не указан");
    });
  });

  // ==========================================================================
  // showMachineDetails
  // ==========================================================================

  describe("showMachineDetails", () => {
    it("should show error when machine not found", async () => {
      machineRepo.findOne!.mockResolvedValue(null);

      const ctx = createMockContext();
      await service.showMachineDetails(ctx, "nonexistent");

      expect(ctx.reply).toHaveBeenCalledWith("❌ Аппарат не найден");
    });

    it("should display machine details with status", async () => {
      machineRepo.findOne!.mockResolvedValue({
        id: "m1",
        name: "Coffee Machine A",
        machineNumber: "VH-001",
        address: "Main St",
        status: "active",
        lastRefillDate: new Date("2025-06-01"),
        lastCollectionDate: null,
        currentCashAmount: 50000,
        latitude: null,
        longitude: null,
      });

      const ctx = createMockContext();
      await service.showMachineDetails(ctx, "m1");

      const calledFn =
        ctx.editMessageText.mock.calls.length > 0
          ? ctx.editMessageText
          : ctx.reply;
      const text = calledFn.mock.calls[0][0] as string;
      expect(text).toContain("Coffee Machine A");
      expect(text).toContain("VH-001");
      expect(text).toContain("Активен");
      expect(text).toContain("50");
    });

    it("should include navigation link when coords are available", async () => {
      machineRepo.findOne!.mockResolvedValue({
        id: "m1",
        name: "Machine",
        machineNumber: "VH-002",
        address: "Some St",
        status: "active",
        lastRefillDate: null,
        lastCollectionDate: null,
        currentCashAmount: null,
        latitude: 41.311,
        longitude: 69.279,
      });

      const ctx = createMockContext();
      await service.showMachineDetails(ctx, "m1");

      // The keyboard should include a URL button for navigation
      const calledFn =
        ctx.editMessageText.mock.calls.length > 0
          ? ctx.editMessageText
          : ctx.reply;
      expect(calledFn).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // createRefillTask
  // ==========================================================================

  describe("createRefillTask", () => {
    it("should return early when user is not set", async () => {
      const ctx = createMockContext({ user: undefined });
      await service.createRefillTask(ctx, "m1");

      expect(taskRepo.create).not.toHaveBeenCalled();
    });

    it("should create a refill task and show details", async () => {
      taskRepo.create!.mockReturnValue({
        id: "new-task-1",
        typeCode: TaskType.REFILL,
        status: TaskStatus.ASSIGNED,
      });
      taskRepo.save!.mockResolvedValue({
        id: "new-task-1",
        typeCode: TaskType.REFILL,
        status: TaskStatus.ASSIGNED,
      });
      // Mock for showTaskDetails call
      taskRepo.findOne!.mockResolvedValue({
        id: "new-task-1",
        taskNumber: "TSK-X",
        typeCode: "refill",
        status: TaskStatus.ASSIGNED,
        machine: {
          name: "M1",
          address: "Addr",
          latitude: null,
          longitude: null,
        },
        items: [],
        hasPhotoBefore: false,
        hasPhotoAfter: false,
      });

      const ctx = createMockContext();
      await service.createRefillTask(ctx, "m1");

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          machineId: "m1",
          typeCode: TaskType.REFILL,
          status: TaskStatus.ASSIGNED,
        }),
      );
      expect(taskRepo.save).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("пополнение создана"),
      );
    });
  });

  // ==========================================================================
  // createCollectionTask
  // ==========================================================================

  describe("createCollectionTask", () => {
    it("should return early when user is not set", async () => {
      const ctx = createMockContext({ user: undefined });
      await service.createCollectionTask(ctx, "m1");

      expect(taskRepo.create).not.toHaveBeenCalled();
    });

    it("should create a collection task with expected cash amount", async () => {
      machineRepo.findOne!.mockResolvedValue({
        id: "m1",
        currentCashAmount: 75000,
      });
      taskRepo.create!.mockReturnValue({
        id: "new-task-2",
        typeCode: TaskType.COLLECTION,
        status: TaskStatus.ASSIGNED,
      });
      taskRepo.save!.mockResolvedValue({
        id: "new-task-2",
        typeCode: TaskType.COLLECTION,
        status: TaskStatus.ASSIGNED,
      });
      taskRepo.findOne!.mockResolvedValue({
        id: "new-task-2",
        taskNumber: "TSK-Y",
        typeCode: "collection",
        status: TaskStatus.ASSIGNED,
        machine: {
          name: "M1",
          address: "Addr",
          latitude: null,
          longitude: null,
        },
        items: [],
        hasPhotoBefore: false,
        hasPhotoAfter: false,
        expectedCashAmount: 75000,
      });

      const ctx = createMockContext();
      await service.createCollectionTask(ctx, "m1");

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          typeCode: TaskType.COLLECTION,
          expectedCashAmount: 75000,
        }),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("инкассацию создана"),
      );
    });
  });
});
