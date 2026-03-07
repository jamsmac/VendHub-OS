import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { BotNotificationsService } from "./bot-notifications.service";
import { User } from "../../users/entities/user.entity";
import { Task } from "../../tasks/entities/task.entity";
import { Machine } from "../../machines/entities/machine.entity";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
});

describe("BotNotificationsService", () => {
  let service: BotNotificationsService;
  let userRepo: MockRepository<User>;

  beforeEach(async () => {
    userRepo = createMockRepository<User>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotNotificationsService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<BotNotificationsService>(BotNotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // sendTaskAssignedNotification
  // ==========================================================================

  describe("sendTaskAssignedNotification", () => {
    it("should not send when user has no telegramId", async () => {
      userRepo.findOne!.mockResolvedValue({ id: "user-1", telegramId: null });

      await expect(
        service.sendTaskAssignedNotification("user-1", {
          id: "task-1",
          typeCode: "refill",
          machine: { name: "Machine A" },
        } as any),
      ).resolves.not.toThrow();
    });

    it("should not send when user not found", async () => {
      userRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.sendTaskAssignedNotification("non-existent", {
          id: "task-1",
          typeCode: "refill",
        } as any),
      ).resolves.not.toThrow();
    });

    it("should send notification when user has telegramId and bot is set", async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      const mockBot = { telegram: { sendMessage } } as any;
      service.setBot(mockBot, new Map());

      userRepo.findOne!.mockResolvedValue({
        id: "user-1",
        telegramId: "999888",
      });

      await service.sendTaskAssignedNotification("user-1", {
        id: "task-1",
        typeCode: "refill",
        machine: { name: "Machine A" },
        dueDate: new Date("2025-06-01T12:00:00Z"),
      } as any);

      expect(sendMessage).toHaveBeenCalledWith(
        "999888",
        expect.stringContaining("Новая задача"),
        expect.anything(),
      );
    });

    it("should handle telegram API errors gracefully", async () => {
      const sendMessage = jest.fn().mockRejectedValue(new Error("Bot blocked"));
      const mockBot = { telegram: { sendMessage } } as any;
      service.setBot(mockBot, new Map());

      userRepo.findOne!.mockResolvedValue({
        id: "user-1",
        telegramId: "999888",
      });

      await expect(
        service.sendTaskAssignedNotification("user-1", {
          id: "task-1",
          typeCode: "refill",
        } as any),
      ).resolves.not.toThrow();
    });

    it("should include task type label in the notification", async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      const mockBot = { telegram: { sendMessage } } as any;
      service.setBot(mockBot, new Map());

      userRepo.findOne!.mockResolvedValue({
        id: "user-1",
        telegramId: "999888",
      });

      await service.sendTaskAssignedNotification("user-1", {
        id: "task-1",
        typeCode: "collection",
        machine: { name: "Machine B" },
      } as any);

      const messageText = sendMessage.mock.calls[0][1] as string;
      expect(messageText).toContain("Инкассация");
    });
  });

  // ==========================================================================
  // sendTaskOverdueNotification
  // ==========================================================================

  describe("sendTaskOverdueNotification", () => {
    it("should not send when user has no telegramId", async () => {
      userRepo.findOne!.mockResolvedValue({ id: "user-1", telegramId: null });

      await expect(
        service.sendTaskOverdueNotification("user-1", {
          id: "task-1",
          taskNumber: "TSK-001",
          dueDate: new Date(),
        } as any),
      ).resolves.not.toThrow();
    });

    it("should send overdue notification with task details", async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      const mockBot = { telegram: { sendMessage } } as any;
      service.setBot(mockBot, new Map());

      userRepo.findOne!.mockResolvedValue({
        id: "user-1",
        telegramId: "999888",
      });

      await service.sendTaskOverdueNotification("user-1", {
        id: "task-1",
        taskNumber: "TSK-001",
        machine: { name: "Machine A" },
        dueDate: new Date("2025-06-01"),
      } as any);

      const messageText = sendMessage.mock.calls[0][1] as string;
      expect(messageText).toContain("Просрочена");
      expect(messageText).toContain("TSK-001");
    });

    it("should handle telegram API errors gracefully", async () => {
      const sendMessage = jest
        .fn()
        .mockRejectedValue(new Error("User deactivated"));
      const mockBot = { telegram: { sendMessage } } as any;
      service.setBot(mockBot, new Map());

      userRepo.findOne!.mockResolvedValue({
        id: "user-1",
        telegramId: "999888",
      });

      await expect(
        service.sendTaskOverdueNotification("user-1", {
          id: "task-1",
          taskNumber: "TSK-001",
          dueDate: new Date(),
        } as any),
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // sendMachineAlertNotification
  // ==========================================================================

  describe("sendMachineAlertNotification", () => {
    it("should not send when user not found", async () => {
      userRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.sendMachineAlertNotification(
          "user-1",
          { id: "m1", name: "M1" } as any,
          "low_stock",
        ),
      ).resolves.not.toThrow();
    });

    it("should send alert with machine name and alert type", async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      const mockBot = { telegram: { sendMessage } } as any;
      service.setBot(mockBot, new Map());

      userRepo.findOne!.mockResolvedValue({
        id: "user-1",
        telegramId: "111222",
      });

      await service.sendMachineAlertNotification(
        "user-1",
        { id: "m1", name: "Coffee Machine", address: "Main St" } as any,
        "error",
      );

      const messageText = sendMessage.mock.calls[0][1] as string;
      expect(messageText).toContain("Coffee Machine");
      expect(messageText).toContain("Ошибка аппарата");
    });

    it("should handle unknown alert type gracefully", async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      const mockBot = { telegram: { sendMessage } } as any;
      service.setBot(mockBot, new Map());

      userRepo.findOne!.mockResolvedValue({
        id: "user-1",
        telegramId: "111222",
      });

      await service.sendMachineAlertNotification(
        "user-1",
        { id: "m1", name: "Machine", address: null } as any,
        "unknown_alert",
      );

      const messageText = sendMessage.mock.calls[0][1] as string;
      expect(messageText).toContain("Требуется внимание");
    });

    it('should show "Адрес не указан" when address is null', async () => {
      const sendMessage = jest.fn().mockResolvedValue(undefined);
      const mockBot = { telegram: { sendMessage } } as any;
      service.setBot(mockBot, new Map());

      userRepo.findOne!.mockResolvedValue({
        id: "user-1",
        telegramId: "111222",
      });

      await service.sendMachineAlertNotification(
        "user-1",
        { id: "m1", name: "Machine", address: null } as any,
        "offline",
      );

      const messageText = sendMessage.mock.calls[0][1] as string;
      expect(messageText).toContain("Адрес не указан");
    });
  });
});
