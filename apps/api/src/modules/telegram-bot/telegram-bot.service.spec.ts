import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository, ObjectLiteral } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { TelegramBotService } from "./telegram-bot.service";
import { BotHandlersService } from "./services/bot-handlers.service";
import { BotTaskOpsService } from "./services/bot-task-ops.service";
import { BotMachineOpsService } from "./services/bot-machine-ops.service";
import { BotMenuService } from "./services/bot-menu.service";
import { BotNotificationsService } from "./services/bot-notifications.service";
import { BotAdminService } from "./services/bot-admin.service";
import { BotRouteOpsService } from "./services/bot-route-ops.service";
import { BotStatsService } from "./services/bot-stats.service";
import { User } from "../users/entities/user.entity";
import { Task } from "../tasks/entities/task.entity";
import { Machine } from "../machines/entities/machine.entity";
import {
  TelegramUser,
  TelegramUserStatus,
  TelegramLanguage,
} from "./entities/telegram-user.entity";
import {
  TelegramMessageLog,
  TelegramMessageType,
  TelegramMessageStatus,
} from "./entities/telegram-message-log.entity";
import {
  TelegramBotAnalytics,
  TelegramEventType,
} from "./entities/telegram-bot-analytics.entity";
import { TelegramSettings } from "./entities/telegram-settings.entity";

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
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getCount: jest.fn(),
  getMany: jest.fn(),
  getManyAndCount: jest.fn(),
  getOne: jest.fn(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
});

describe("TelegramBotService", () => {
  let service: TelegramBotService;
  let userRepo: MockRepository<User>;
  let taskRepo: MockRepository<Task>;
  let machineRepo: MockRepository<Machine>;
  let telegramUserRepo: MockRepository<TelegramUser>;
  let messageLogRepo: MockRepository<TelegramMessageLog>;
  let analyticsRepo: MockRepository<TelegramBotAnalytics>;
  let settingsRepo: MockRepository<TelegramSettings>;

  beforeEach(async () => {
    userRepo = createMockRepository<User>();
    taskRepo = createMockRepository<Task>();
    machineRepo = createMockRepository<Machine>();
    telegramUserRepo = createMockRepository<TelegramUser>();
    messageLogRepo = createMockRepository<TelegramMessageLog>();
    analyticsRepo = createMockRepository<TelegramBotAnalytics>();
    settingsRepo = createMockRepository<TelegramSettings>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        BotHandlersService,
        BotTaskOpsService,
        BotMachineOpsService,
        BotMenuService,
        BotNotificationsService,
        BotAdminService,
        {
          provide: BotRouteOpsService,
          useValue: { setBot: jest.fn() },
        },
        {
          provide: BotStatsService,
          useValue: { setBot: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // No token -> bot disabled
          },
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(Machine), useValue: machineRepo },
        {
          provide: getRepositoryToken(TelegramUser),
          useValue: telegramUserRepo,
        },
        {
          provide: getRepositoryToken(TelegramMessageLog),
          useValue: messageLogRepo,
        },
        {
          provide: getRepositoryToken(TelegramBotAnalytics),
          useValue: analyticsRepo,
        },
        {
          provide: getRepositoryToken(TelegramSettings),
          useValue: settingsRepo,
        },
      ],
    }).compile();

    service = module.get<TelegramBotService>(TelegramBotService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // findOrCreateTelegramUser
  // ==========================================================================

  describe("findOrCreateTelegramUser", () => {
    it("should update and return existing telegram user", async () => {
      const existing = {
        id: "tu-1",
        telegramId: "123456",
        chatId: "old-chat",
        username: "olduser",
        firstName: "Old",
        lastName: "Name",
        organizationId: null,
        lastInteractionAt: null,
      };

      telegramUserRepo.findOne!.mockResolvedValue(existing);
      telegramUserRepo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.findOrCreateTelegramUser(
        "123456",
        "new-chat",
        "newuser",
        "New",
        "User",
        "staff",
        "org-1",
      );

      expect(result.chatId).toBe("new-chat");
      expect(result.username).toBe("newuser");
      expect(result.firstName).toBe("New");
      expect(result.lastName).toBe("User");
      expect(result.organizationId).toBe("org-1");
      expect(result.lastInteractionAt).toBeInstanceOf(Date);
    });

    it("should create a new telegram user when not found", async () => {
      telegramUserRepo.findOne!.mockResolvedValue(null);
      const created = {
        id: "tu-new",
        telegramId: "789",
        chatId: "chat-1",
        username: "testuser",
        firstName: "Test",
        lastName: null,
        botType: "staff",
        organizationId: "org-1",
        language: TelegramLanguage.RU,
        status: TelegramUserStatus.ACTIVE,
        isVerified: false,
        notificationPreferences: { tasks: true, machines: true, alerts: true },
      };
      telegramUserRepo.create!.mockReturnValue(created);
      telegramUserRepo.save!.mockResolvedValue(created);

      const result = await service.findOrCreateTelegramUser(
        "789",
        "chat-1",
        "testuser",
        "Test",
        null,
        "staff",
        "org-1",
      );

      expect(telegramUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegramId: "789",
          chatId: "chat-1",
          username: "testuser",
          language: TelegramLanguage.RU,
          status: TelegramUserStatus.ACTIVE,
          isVerified: false,
        }),
      );
      expect(result.id).toBe("tu-new");
    });

    it("should preserve existing user fields when new values are null", async () => {
      const existing = {
        id: "tu-1",
        telegramId: "123",
        chatId: "chat-old",
        username: "existinguser",
        firstName: "Existing",
        lastName: "User",
        organizationId: "org-1",
        lastInteractionAt: null,
      };

      telegramUserRepo.findOne!.mockResolvedValue(existing);
      telegramUserRepo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.findOrCreateTelegramUser(
        "123",
        "chat-new",
        null,
        null,
        null,
        "staff",
      );

      expect(result.username).toBe("existinguser");
      expect(result.firstName).toBe("Existing");
      expect(result.lastName).toBe("User");
    });
  });

  // ==========================================================================
  // logMessage
  // ==========================================================================

  describe("logMessage", () => {
    it("should create and save a message log entry", async () => {
      const logData = {
        telegramUserId: "tu-1",
        chatId: "chat-1",
        direction: "incoming",
        messageType: TelegramMessageType.COMMAND,
        command: "/start",
        messageText: "/start",
        telegramMessageId: 12345,
        status: TelegramMessageStatus.SENT,
        responseTimeMs: 150,
        organizationId: "org-1",
        metadata: { source: "direct" },
      };

      const created = { id: "ml-1", ...logData };
      messageLogRepo.create!.mockReturnValue(created);
      messageLogRepo.save!.mockResolvedValue(created);

      const result = await service.logMessage(logData);

      expect(messageLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegramUserId: "tu-1",
          chatId: "chat-1",
          direction: "incoming",
          messageType: TelegramMessageType.COMMAND,
          command: "/start",
        }),
      );
      expect(result.id).toBe("ml-1");
    });

    it("should truncate message text to 1000 characters", async () => {
      const longText = "a".repeat(2000);
      const logData = {
        telegramUserId: "tu-1",
        chatId: "chat-1",
        direction: "incoming",
        messageType: TelegramMessageType.MESSAGE,
        messageText: longText,
        status: TelegramMessageStatus.SENT,
      };

      messageLogRepo.create!.mockReturnValue({});
      messageLogRepo.save!.mockResolvedValue({});

      await service.logMessage(logData);

      expect(messageLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messageText: longText.substring(0, 1000),
        }),
      );
    });

    it("should handle null optional fields", async () => {
      const logData = {
        telegramUserId: "tu-1",
        chatId: "chat-1",
        direction: "outgoing",
        messageType: TelegramMessageType.NOTIFICATION,
        status: TelegramMessageStatus.SENT,
      };

      messageLogRepo.create!.mockReturnValue({});
      messageLogRepo.save!.mockResolvedValue({});

      await service.logMessage(logData);

      expect(messageLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: null,
          messageText: null,
          telegramMessageId: null,
          responseTimeMs: null,
          organizationId: null,
          metadata: null,
        }),
      );
    });
  });

  // ==========================================================================
  // trackAnalytics
  // ==========================================================================

  describe("trackAnalytics", () => {
    it("should create an analytics event", async () => {
      const eventData = {
        telegramUserId: "tu-1",
        userId: "user-1",
        botType: "staff",
        eventType: TelegramEventType.COMMAND,
        actionName: "/start",
        actionCategory: "navigation",
        responseTimeMs: 100,
        success: true,
        organizationId: "org-1",
        sessionId: "sess-123",
        metadata: { page: "main_menu" },
      };

      const created = { id: "a-1", ...eventData };
      analyticsRepo.create!.mockReturnValue(created);
      analyticsRepo.save!.mockResolvedValue(created);

      const result = await service.trackAnalytics(eventData);

      expect(analyticsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          botType: "staff",
          eventType: TelegramEventType.COMMAND,
          actionName: "/start",
          success: true,
        }),
      );
      expect(result.id).toBe("a-1");
    });

    it("should store error message on failed events", async () => {
      const eventData = {
        botType: "staff",
        eventType: TelegramEventType.NOTIFICATION_FAILED,
        actionName: "send_notification",
        success: false,
        errorMessage: "User blocked bot",
      };

      analyticsRepo.create!.mockReturnValue({});
      analyticsRepo.save!.mockResolvedValue({});

      await service.trackAnalytics(eventData);

      expect(analyticsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: "User blocked bot",
        }),
      );
    });
  });

  // ==========================================================================
  // verifyUser
  // ==========================================================================

  describe("verifyUser", () => {
    it("should verify user with correct code", async () => {
      const user = {
        telegramId: "123",
        isVerified: false,
        verificationCode: "123456",
        verificationExpiresAt: new Date(Date.now() + 3600000),
      };

      telegramUserRepo.findOne!.mockResolvedValue(user);
      telegramUserRepo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.verifyUser("123", "123456");

      expect(result.success).toBe(true);
      expect(result.message).toBe("User verified successfully");
      expect(user.isVerified).toBe(true);
      expect(user.verificationCode).toBeNull();
    });

    it("should fail when telegram user not found", async () => {
      telegramUserRepo.findOne!.mockResolvedValue(null);

      const result = await service.verifyUser("999", "000000");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Telegram user not found");
    });

    it("should fail when user is already verified", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({
        telegramId: "123",
        isVerified: true,
      });

      const result = await service.verifyUser("123", "123456");

      expect(result.success).toBe(false);
      expect(result.message).toBe("User is already verified");
    });

    it("should fail when no verification code is set", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({
        telegramId: "123",
        isVerified: false,
        verificationCode: null,
      });

      const result = await service.verifyUser("123", "123456");

      expect(result.success).toBe(false);
      expect(result.message).toBe("No verification code set");
    });

    it("should fail when verification code has expired", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({
        telegramId: "123",
        isVerified: false,
        verificationCode: "123456",
        verificationExpiresAt: new Date(Date.now() - 3600000),
      });

      const result = await service.verifyUser("123", "123456");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Verification code has expired");
    });

    it("should fail when verification code is wrong", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({
        telegramId: "123",
        isVerified: false,
        verificationCode: "123456",
        verificationExpiresAt: new Date(Date.now() + 3600000),
      });

      const result = await service.verifyUser("123", "999999");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid verification code");
    });
  });

  // ==========================================================================
  // updateNotificationPreferences
  // ==========================================================================

  describe("updateNotificationPreferences", () => {
    it("should merge new preferences with existing ones", async () => {
      const existing = {
        id: "tu-1",
        notificationPreferences: { tasks: true, machines: true, alerts: true },
      };

      telegramUserRepo.findOne!.mockResolvedValue(existing);
      telegramUserRepo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.updateNotificationPreferences("tu-1", {
        tasks: false,
        dailyReport: true,
      });

      expect(result.notificationPreferences).toEqual({
        tasks: false,
        machines: true,
        alerts: true,
        dailyReport: true,
      });
    });

    it("should throw NotFoundException when user not found", async () => {
      telegramUserRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateNotificationPreferences("non-existent", {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getTelegramUsers
  // ==========================================================================

  describe("getTelegramUsers", () => {
    it("should return paginated telegram users", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[{ id: "tu-1" }], 1]);
      telegramUserRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getTelegramUsers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it("should apply organization, status, and search filters", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      telegramUserRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.getTelegramUsers(
        {
          status: TelegramUserStatus.ACTIVE,
          search: "john",
          botType: "staff",
          isVerified: "true",
        },
        "org-1",
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "tu.organizationId = :organizationId",
        { organizationId: "org-1" },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith("tu.status = :status", {
        status: TelegramUserStatus.ACTIVE,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith("tu.botType = :botType", {
        botType: "staff",
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "tu.isVerified = :isVerified",
        { isVerified: true },
      );
    });

    it("should use default pagination when not specified", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      telegramUserRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getTelegramUsers({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ==========================================================================
  // getTelegramUser
  // ==========================================================================

  describe("getTelegramUser", () => {
    it("should return user with stats", async () => {
      const user = { id: "tu-1", username: "testuser" };
      telegramUserRepo.findOne!.mockResolvedValue(user);
      messageLogRepo.count!.mockResolvedValueOnce(50).mockResolvedValueOnce(15);
      const lastMessage = { createdAt: new Date("2025-06-01") };
      messageLogRepo.findOne!.mockResolvedValue(lastMessage);

      const result = await service.getTelegramUser("tu-1");

      expect(result.user).toEqual(user);
      expect(result.stats.totalMessages).toBe(50);
      expect(result.stats.totalCommands).toBe(15);
      expect(result.stats.lastMessageAt).toEqual(lastMessage.createdAt);
    });

    it("should throw NotFoundException when user not found", async () => {
      telegramUserRepo.findOne!.mockResolvedValue(null);

      await expect(service.getTelegramUser("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return null lastMessageAt when no messages exist", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({ id: "tu-1" });
      messageLogRepo.count!.mockResolvedValue(0);
      messageLogRepo.findOne!.mockResolvedValue(null);

      const result = await service.getTelegramUser("tu-1");

      expect(result.stats.lastMessageAt).toBeNull();
    });
  });

  // ==========================================================================
  // getAnalyticsSummary
  // ==========================================================================

  describe("getAnalyticsSummary", () => {
    it("should return analytics summary with all metrics", async () => {
      const userQb = createMockQueryBuilder();
      userQb.getCount.mockResolvedValue(100);
      const activeUserQb = createMockQueryBuilder();
      activeUserQb.getCount.mockResolvedValue(45);
      const eventQb = createMockQueryBuilder();
      eventQb.getCount.mockResolvedValue(500);
      const byTypeQb = createMockQueryBuilder();
      byTypeQb.getRawMany.mockResolvedValue([
        { event_type: TelegramEventType.COMMAND, count: "300" },
        { event_type: TelegramEventType.CALLBACK, count: "200" },
      ]);
      const byBotTypeQb = createMockQueryBuilder();
      byBotTypeQb.getRawMany.mockResolvedValue([
        { bot_type: "staff", count: "400" },
        { bot_type: "customer", count: "100" },
      ]);

      const avgResponseQb = createMockQueryBuilder();
      avgResponseQb.getRawOne.mockResolvedValue({ avg_response: "234.5" });
      const successQb = createMockQueryBuilder();
      successQb.getCount.mockResolvedValue(450);

      telegramUserRepo
        .createQueryBuilder!.mockReturnValueOnce(userQb)
        .mockReturnValueOnce(activeUserQb);
      analyticsRepo
        .createQueryBuilder!.mockReturnValueOnce(eventQb)
        .mockReturnValueOnce(byTypeQb)
        .mockReturnValueOnce(byBotTypeQb)
        .mockReturnValueOnce(avgResponseQb)
        .mockReturnValueOnce(successQb);

      const result = await service.getAnalyticsSummary();

      expect(result.totalUsers).toBe(100);
      expect(result.activeUsers).toBe(45);
      expect(result.totalEvents).toBe(500);
      expect(result.eventsByType[TelegramEventType.COMMAND]).toBe(300);
      expect(result.eventsByBotType["staff"]).toBe(400);
      expect(result.averageResponseTime).toBe(235);
      expect(result.successRate).toBe(90);
    });
  });

  // ==========================================================================
  // getMessageLog
  // ==========================================================================

  describe("getMessageLog", () => {
    it("should return paginated message logs", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[{ id: "ml-1" }], 1]);
      messageLogRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getMessageLog({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalled();
    });

    it("should apply filters for telegramUserId, messageType, direction, and dates", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      messageLogRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.getMessageLog(
        {
          telegramUserId: "tu-1",
          messageType: TelegramMessageType.COMMAND,
          direction: "incoming",
          dateFrom: "2025-01-01",
          dateTo: "2025-12-31",
        },
        "org-1",
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "ml.organizationId = :organizationId",
        { organizationId: "org-1" },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "ml.telegramUserId = :telegramUserId",
        { telegramUserId: "tu-1" },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "ml.messageType = :messageType",
        { messageType: TelegramMessageType.COMMAND },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "ml.direction = :direction",
        { direction: "incoming" },
      );
    });
  });

  // ==========================================================================
  // sendTaskAssignedNotification
  // ==========================================================================

  describe("sendTaskAssignedNotification", () => {
    it("should not throw when user has no telegramId", async () => {
      userRepo.findOne!.mockResolvedValue({ id: "user-1", telegramId: null });

      await expect(
        service.sendTaskAssignedNotification("user-1", {
          id: "t1",
          typeCode: "refill",
        } as Partial<Task> as Task),
      ).resolves.not.toThrow();
    });

    it("should not throw when user not found", async () => {
      userRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.sendTaskAssignedNotification("non-existent", {
          id: "t1",
        } as Partial<Task> as Task),
      ).resolves.not.toThrow();
    });
  });

  describe("sendMachineAlertNotification", () => {
    it("should not throw when bot is not initialized", async () => {
      userRepo.findOne!.mockResolvedValue({ id: "user-1", telegramId: "123" });

      await expect(
        service.sendMachineAlertNotification(
          "user-1",
          { id: "m1", name: "Machine A" } as Partial<Machine> as Machine,
          "low_stock",
        ),
      ).resolves.not.toThrow();
    });
  });
});
