import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { BotAdminService } from "./bot-admin.service";
import {
  TelegramUser,
  TelegramUserStatus,
  TelegramLanguage,
} from "../entities/telegram-user.entity";
import {
  TelegramMessageLog,
  TelegramMessageType,
  TelegramMessageStatus,
} from "../entities/telegram-message-log.entity";
import {
  TelegramBotAnalytics,
  TelegramEventType,
} from "../entities/telegram-bot-analytics.entity";
import { TelegramSettings } from "../entities/telegram-settings.entity";

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

describe("BotAdminService", () => {
  let service: BotAdminService;
  let telegramUserRepo: MockRepository<TelegramUser>;
  let messageLogRepo: MockRepository<TelegramMessageLog>;
  let analyticsRepo: MockRepository<TelegramBotAnalytics>;
  let settingsRepo: MockRepository<TelegramSettings>;

  beforeEach(async () => {
    telegramUserRepo = createMockRepository<TelegramUser>();
    messageLogRepo = createMockRepository<TelegramMessageLog>();
    analyticsRepo = createMockRepository<TelegramBotAnalytics>();
    settingsRepo = createMockRepository<TelegramSettings>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotAdminService,
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

    service = module.get<BotAdminService>(BotAdminService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // findOrCreateTelegramUser
  // ==========================================================================

  describe("findOrCreateTelegramUser", () => {
    it("should update and return existing user", async () => {
      const existing = {
        id: "tu-1",
        telegramId: "123",
        chatId: "old-chat",
        username: "old",
        firstName: "Old",
        lastName: "Name",
        organizationId: null,
        lastInteractionAt: null,
      };
      telegramUserRepo.findOne!.mockResolvedValue(existing);
      telegramUserRepo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.findOrCreateTelegramUser(
        "123",
        "new-chat",
        "newuser",
        "New",
        "User",
        "staff",
        "org-1",
      );

      expect(result.chatId).toBe("new-chat");
      expect(result.username).toBe("newuser");
      expect(result.organizationId).toBe("org-1");
    });

    it("should create a new user when not found", async () => {
      telegramUserRepo.findOne!.mockResolvedValue(null);
      const created = {
        id: "tu-new",
        telegramId: "789",
        chatId: "c1",
        language: TelegramLanguage.RU,
        status: TelegramUserStatus.ACTIVE,
        isVerified: false,
      };
      telegramUserRepo.create!.mockReturnValue(created);
      telegramUserRepo.save!.mockResolvedValue(created);

      const result = await service.findOrCreateTelegramUser(
        "789",
        "c1",
        "test",
        "Test",
        null,
        "staff",
        "org-1",
      );

      expect(telegramUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegramId: "789",
          language: TelegramLanguage.RU,
        }),
      );
      expect(result.id).toBe("tu-new");
    });
  });

  // ==========================================================================
  // logMessage
  // ==========================================================================

  describe("logMessage", () => {
    it("should create and save a message log", async () => {
      const logData = {
        telegramUserId: "tu-1",
        chatId: "c1",
        direction: "incoming",
        messageType: TelegramMessageType.COMMAND,
        command: "/start",
        messageText: "/start",
        status: TelegramMessageStatus.SENT,
      };
      messageLogRepo.create!.mockReturnValue({ id: "ml-1", ...logData });
      messageLogRepo.save!.mockResolvedValue({ id: "ml-1", ...logData });

      const result = await service.logMessage(logData);
      expect(result.id).toBe("ml-1");
    });

    it("should truncate long message text to 1000 chars", async () => {
      const longText = "x".repeat(2000);
      messageLogRepo.create!.mockReturnValue({});
      messageLogRepo.save!.mockResolvedValue({});

      await service.logMessage({
        telegramUserId: "tu-1",
        chatId: "c1",
        direction: "incoming",
        messageType: TelegramMessageType.MESSAGE,
        messageText: longText,
        status: TelegramMessageStatus.SENT,
      });

      expect(messageLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ messageText: longText.substring(0, 1000) }),
      );
    });
  });

  // ==========================================================================
  // trackAnalytics
  // ==========================================================================

  describe("trackAnalytics", () => {
    it("should create an analytics event", async () => {
      const eventData = {
        botType: "staff",
        eventType: TelegramEventType.COMMAND,
        actionName: "/start",
        success: true,
      };
      analyticsRepo.create!.mockReturnValue({ id: "a-1", ...eventData });
      analyticsRepo.save!.mockResolvedValue({ id: "a-1", ...eventData });

      const result = await service.trackAnalytics(eventData);
      expect(result.id).toBe("a-1");
    });
  });

  // ==========================================================================
  // verifyUser
  // ==========================================================================

  describe("verifyUser", () => {
    it("should verify user with correct code", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({
        telegramId: "123",
        isVerified: false,
        verificationCode: "123456",
        verificationExpiresAt: new Date(Date.now() + 3600000),
      });
      telegramUserRepo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.verifyUser("123", "123456");
      expect(result.success).toBe(true);
    });

    it("should fail when user not found", async () => {
      telegramUserRepo.findOne!.mockResolvedValue(null);
      const result = await service.verifyUser("999", "000000");
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
    });

    it("should fail when already verified", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({ isVerified: true });
      const result = await service.verifyUser("123", "123456");
      expect(result.success).toBe(false);
      expect(result.message).toContain("already verified");
    });

    it("should fail when code expired", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({
        isVerified: false,
        verificationCode: "123456",
        verificationExpiresAt: new Date(Date.now() - 3600000),
      });
      const result = await service.verifyUser("123", "123456");
      expect(result.success).toBe(false);
      expect(result.message).toContain("expired");
    });

    it("should fail when code is wrong", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({
        isVerified: false,
        verificationCode: "123456",
        verificationExpiresAt: new Date(Date.now() + 3600000),
      });
      const result = await service.verifyUser("123", "999999");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid");
    });
  });

  // ==========================================================================
  // updateNotificationPreferences
  // ==========================================================================

  describe("updateNotificationPreferences", () => {
    it("should merge new preferences", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({
        id: "tu-1",
        notificationPreferences: { tasks: true, machines: true },
      });
      telegramUserRepo.save!.mockImplementation((e) => Promise.resolve(e));

      const result = await service.updateNotificationPreferences("tu-1", {
        tasks: false,
        dailyReport: true,
      });

      expect(result.notificationPreferences).toEqual({
        tasks: false,
        machines: true,
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
    it("should return paginated users", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[{ id: "tu-1" }], 1]);
      telegramUserRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getTelegramUsers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should apply filters", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      telegramUserRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.getTelegramUsers(
        {
          status: TelegramUserStatus.ACTIVE,
          search: "john",
        },
        "org-1",
      );

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "tu.organizationId = :organizationId",
        { organizationId: "org-1" },
      );
    });
  });

  // ==========================================================================
  // getTelegramUser
  // ==========================================================================

  describe("getTelegramUser", () => {
    it("should return user with stats", async () => {
      telegramUserRepo.findOne!.mockResolvedValue({ id: "tu-1" });
      messageLogRepo.count!.mockResolvedValueOnce(50).mockResolvedValueOnce(15);
      messageLogRepo.findOne!.mockResolvedValue({ createdAt: new Date() });

      const result = await service.getTelegramUser("tu-1");

      expect(result.user.id).toBe("tu-1");
      expect(result.stats.totalMessages).toBe(50);
      expect(result.stats.totalCommands).toBe(15);
    });

    it("should throw NotFoundException when user not found", async () => {
      telegramUserRepo.findOne!.mockResolvedValue(null);

      await expect(service.getTelegramUser("bad")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // getSettingsRepo
  // ==========================================================================

  describe("getSettingsRepo", () => {
    it("should return the settings repository", () => {
      const repo = service.getSettingsRepo();
      expect(repo).toBeDefined();
    });
  });
});
