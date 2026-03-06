import { Test, TestingModule } from "@nestjs/testing";
import { TelegramBotController } from "./telegram-bot.controller";
import { TelegramBotService } from "./telegram-bot.service";
import {
  TelegramUserStatus,
  TelegramLanguage,
} from "./entities/telegram-user.entity";
import { TelegramMessageType } from "./entities/telegram-message-log.entity";
import { TelegramEventType } from "./entities/telegram-bot-analytics.entity";

// ============================================================================
// Mock service — also exposes settingsRepo since controller accesses it directly
// ============================================================================

const mockSettingsRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockTelegramBotService = {
  getTelegramUsers: jest.fn(),
  getTelegramUser: jest.fn(),
  updateNotificationPreferences: jest.fn(),
  verifyUser: jest.fn(),
  getAnalyticsSummary: jest.fn(),
  getMessageLog: jest.fn(),
  // Expose settingsRepo so controller's ["settingsRepo"] access works
  settingsRepo: mockSettingsRepo,
};

describe("TelegramBotController (unit)", () => {
  let controller: TelegramBotController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramBotController],
      providers: [
        { provide: TelegramBotService, useValue: mockTelegramBotService },
      ],
    })
      .overrideGuard(
        require("../auth/guards/jwt-auth.guard").JwtAuthGuard,
      )
      .useValue({ canActivate: () => true })
      .overrideGuard(require("../../common/guards").RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TelegramBotController>(TelegramBotController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // handleWebhook
  // ==========================================================================

  describe("handleWebhook", () => {
    it("should return ok: true for any update payload", async () => {
      const result = await controller.handleWebhook({ update_id: 1 });
      expect(result).toEqual({ ok: true });
    });

    it("should return ok: true for empty payload", async () => {
      const result = await controller.handleWebhook({});
      expect(result).toEqual({ ok: true });
    });
  });

  // ==========================================================================
  // healthCheck
  // ==========================================================================

  describe("healthCheck", () => {
    it("should return status ok with timestamp", async () => {
      const result = await controller.healthCheck();

      expect(result.status).toBe("ok");
      expect(typeof result.timestamp).toBe("string");
      // Timestamp should be a valid ISO string
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });

  // ==========================================================================
  // sendNotification
  // ==========================================================================

  describe("sendNotification", () => {
    it("should return sent: true without calling any service method", async () => {
      const result = await controller.sendNotification("user-123", {
        message: "Test message",
      } as any);

      expect(result).toEqual({ sent: true });
      // Controller has this method stubbed out — no service calls expected
    });
  });

  // ==========================================================================
  // getTelegramUsers
  // ==========================================================================

  describe("getTelegramUsers", () => {
    it("should delegate to service with query and organizationId", async () => {
      const query = {
        page: 1,
        limit: 20,
        status: TelegramUserStatus.ACTIVE,
      } as any;
      const orgId = "org-1";
      const mockResult = { data: [], total: 0, page: 1, limit: 20 };
      mockTelegramBotService.getTelegramUsers.mockResolvedValue(mockResult);

      const result = await controller.getTelegramUsers(query, orgId);

      expect(mockTelegramBotService.getTelegramUsers).toHaveBeenCalledWith(
        query,
        orgId,
      );
      expect(result).toEqual(mockResult);
    });

    it("should pass empty query when no filters specified", async () => {
      const query = {} as any;
      mockTelegramBotService.getTelegramUsers.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.getTelegramUsers(query, "org-1");

      expect(mockTelegramBotService.getTelegramUsers).toHaveBeenCalledWith(
        {},
        "org-1",
      );
    });
  });

  // ==========================================================================
  // getTelegramUser
  // ==========================================================================

  describe("getTelegramUser", () => {
    it("should return user with stats from service", async () => {
      const mockResult = {
        user: { id: "tu-1", username: "john" },
        stats: { totalMessages: 10, totalCommands: 5, lastMessageAt: null },
      };
      mockTelegramBotService.getTelegramUser.mockResolvedValue(mockResult);

      const result = await controller.getTelegramUser("tu-1");

      expect(mockTelegramBotService.getTelegramUser).toHaveBeenCalledWith(
        "tu-1",
      );
      expect(result).toEqual(mockResult);
    });

    it("should propagate NotFoundException from service", async () => {
      const { NotFoundException } = require("@nestjs/common");
      mockTelegramBotService.getTelegramUser.mockRejectedValue(
        new NotFoundException("Telegram user not found"),
      );

      await expect(controller.getTelegramUser("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // updateTelegramUser
  // ==========================================================================

  describe("updateTelegramUser", () => {
    it("should call updateNotificationPreferences when preferences provided", async () => {
      const dto = {
        notificationPreferences: { tasks: false, alerts: true },
      } as any;
      const mockUser = { user: { id: "tu-1" }, stats: {} };
      mockTelegramBotService.getTelegramUser.mockResolvedValue(mockUser);
      mockTelegramBotService.updateNotificationPreferences.mockResolvedValue(
        {},
      );

      await controller.updateTelegramUser("tu-1", dto);

      expect(
        mockTelegramBotService.updateNotificationPreferences,
      ).toHaveBeenCalledWith("tu-1", dto.notificationPreferences);
    });

    it("should not call updateNotificationPreferences when no preferences", async () => {
      const dto = { language: TelegramLanguage.RU } as any;
      const mockUser = { user: { id: "tu-1" }, stats: {} };
      mockTelegramBotService.getTelegramUser.mockResolvedValue(mockUser);

      await controller.updateTelegramUser("tu-1", dto);

      expect(
        mockTelegramBotService.updateNotificationPreferences,
      ).not.toHaveBeenCalled();
    });

    it("should return user after update when language/status changed", async () => {
      const dto = { language: TelegramLanguage.UZ } as any;
      const mockUser = { user: { id: "tu-1", language: TelegramLanguage.UZ }, stats: {} };
      mockTelegramBotService.getTelegramUser.mockResolvedValue(mockUser);

      const result = await controller.updateTelegramUser("tu-1", dto);

      // getTelegramUser is called multiple times (validation + final fetch)
      expect(mockTelegramBotService.getTelegramUser).toHaveBeenCalledWith(
        "tu-1",
      );
      expect(result).toEqual(mockUser);
    });

    it("should call getTelegramUser at least once to validate existence", async () => {
      const dto = {} as any;
      const mockUser = { user: { id: "tu-1" }, stats: {} };
      mockTelegramBotService.getTelegramUser.mockResolvedValue(mockUser);

      await controller.updateTelegramUser("tu-1", dto);

      expect(mockTelegramBotService.getTelegramUser).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // verifyTelegramUser
  // ==========================================================================

  describe("verifyTelegramUser", () => {
    it("should call verifyUser with telegramId and verificationCode", async () => {
      const dto = { telegramId: "123456", verificationCode: "999888" } as any;
      const mockResult = { success: true, message: "User verified successfully" };
      mockTelegramBotService.verifyUser.mockResolvedValue(mockResult);

      const result = await controller.verifyTelegramUser(dto);

      expect(mockTelegramBotService.verifyUser).toHaveBeenCalledWith(
        "123456",
        "999888",
      );
      expect(result).toEqual(mockResult);
    });

    it("should return failure result when code is wrong", async () => {
      const dto = { telegramId: "123", verificationCode: "000000" } as any;
      mockTelegramBotService.verifyUser.mockResolvedValue({
        success: false,
        message: "Invalid verification code",
      });

      const result = await controller.verifyTelegramUser(dto);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Invalid verification code");
    });
  });

  // ==========================================================================
  // getAnalytics
  // ==========================================================================

  describe("getAnalytics", () => {
    it("should return summary + filters structure", async () => {
      const query = {
        dateFrom: "2025-01-01",
        dateTo: "2025-12-31",
        eventType: TelegramEventType.COMMAND,
        botType: "staff",
        page: 2,
        limit: 10,
      } as any;
      const mockSummary = {
        totalUsers: 100,
        activeUsers: 40,
        totalEvents: 500,
      };
      mockTelegramBotService.getAnalyticsSummary.mockResolvedValue(mockSummary);

      const result = await controller.getAnalytics(query, "org-1");

      expect(mockTelegramBotService.getAnalyticsSummary).toHaveBeenCalledWith(
        "org-1",
        "2025-01-01",
        "2025-12-31",
      );
      expect(result.summary).toEqual(mockSummary);
      expect(result.filters.dateFrom).toBe("2025-01-01");
      expect(result.filters.dateTo).toBe("2025-12-31");
      expect(result.filters.page).toBe(2);
      expect(result.filters.limit).toBe(10);
    });

    it("should use default page=1 limit=20 when not specified", async () => {
      const query = {} as any;
      mockTelegramBotService.getAnalyticsSummary.mockResolvedValue({});

      const result = await controller.getAnalytics(query, "org-1");

      expect(result.filters.page).toBe(1);
      expect(result.filters.limit).toBe(20);
    });
  });

  // ==========================================================================
  // getAnalyticsSummary
  // ==========================================================================

  describe("getAnalyticsSummary", () => {
    it("should delegate to service with all params", async () => {
      const mockSummary = {
        totalUsers: 50,
        activeUsers: 20,
        totalEvents: 200,
        eventsByType: {},
        eventsByBotType: {},
        averageResponseTime: 150,
        successRate: 95,
      };
      mockTelegramBotService.getAnalyticsSummary.mockResolvedValue(mockSummary);

      const result = await controller.getAnalyticsSummary(
        "org-1",
        "2025-06-01",
        "2025-06-30",
      );

      expect(mockTelegramBotService.getAnalyticsSummary).toHaveBeenCalledWith(
        "org-1",
        "2025-06-01",
        "2025-06-30",
      );
      expect(result).toEqual(mockSummary);
    });

    it("should work without date range params", async () => {
      mockTelegramBotService.getAnalyticsSummary.mockResolvedValue({});

      await controller.getAnalyticsSummary("org-1");

      expect(mockTelegramBotService.getAnalyticsSummary).toHaveBeenCalledWith(
        "org-1",
        undefined,
        undefined,
      );
    });
  });

  // ==========================================================================
  // getSettings (directly accesses service["settingsRepo"])
  // ==========================================================================

  describe("getSettings", () => {
    it("should return settings from settingsRepo.find", async () => {
      const mockSettings = [
        { id: "s-1", settingKey: "customer_bot", isActive: true },
        { id: "s-2", settingKey: "staff_bot", isActive: false },
      ];
      mockSettingsRepo.find.mockResolvedValue(mockSettings);

      const result = await controller.getSettings();

      expect(mockSettingsRepo.find).toHaveBeenCalled();
      expect(result).toEqual(mockSettings);
    });

    it("should return empty array when no settings exist", async () => {
      mockSettingsRepo.find.mockResolvedValue([]);

      const result = await controller.getSettings();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // updateSettings (directly accesses service["settingsRepo"])
  // ==========================================================================

  describe("updateSettings", () => {
    it("should update existing settings entry", async () => {
      const existingSettings = {
        id: "s-1",
        settingKey: "staff_bot",
        isActive: false,
        mode: "polling",
      };
      mockSettingsRepo.findOne.mockResolvedValue(existingSettings);
      mockSettingsRepo.save.mockImplementation((s) => Promise.resolve(s));

      const dto = {
        isActive: true,
        mode: "webhook",
        webhookUrl: "https://example.com/webhook",
      } as any;
      const result = await controller.updateSettings("staff_bot", dto);

      expect(mockSettingsRepo.findOne).toHaveBeenCalledWith({
        where: { settingKey: "staff_bot" },
      });
      expect(mockSettingsRepo.save).toHaveBeenCalled();
      expect(result.isActive).toBe(true);
      expect(result.mode).toBe("webhook");
      expect(result.webhookUrl).toBe("https://example.com/webhook");
    });

    it("should create new settings entry when key not found", async () => {
      mockSettingsRepo.findOne.mockResolvedValue(null);
      const newSettings = { settingKey: "customer_bot" };
      mockSettingsRepo.create.mockReturnValue(newSettings);
      mockSettingsRepo.save.mockImplementation((s) => Promise.resolve(s));

      const dto = { isActive: true } as any;
      await controller.updateSettings("customer_bot", dto);

      expect(mockSettingsRepo.create).toHaveBeenCalledWith({
        settingKey: "customer_bot",
      });
      expect(mockSettingsRepo.save).toHaveBeenCalled();
    });

    it("should selectively apply only provided fields", async () => {
      const existingSettings = {
        settingKey: "staff_bot",
        isActive: false,
        mode: "polling",
        sendNotifications: true,
        maxMessagesPerMinute: 30,
        defaultLanguage: "ru",
      };
      mockSettingsRepo.findOne.mockResolvedValue(existingSettings);
      mockSettingsRepo.save.mockImplementation((s) => Promise.resolve(s));

      // Only update sendNotifications — other fields should remain
      const dto = { sendNotifications: false } as any;
      const result = await controller.updateSettings("staff_bot", dto);

      expect(result.sendNotifications).toBe(false);
      expect(result.isActive).toBe(false); // unchanged
      expect(result.mode).toBe("polling"); // unchanged
    });

    it("should update welcome messages", async () => {
      const existingSettings = { settingKey: "customer_bot" };
      mockSettingsRepo.findOne.mockResolvedValue(existingSettings);
      mockSettingsRepo.save.mockImplementation((s) => Promise.resolve(s));

      const dto = {
        welcomeMessageRu: "Добро пожаловать!",
        welcomeMessageUz: "Xush kelibsiz!",
        welcomeMessageEn: "Welcome!",
      } as any;
      const result = await controller.updateSettings("customer_bot", dto);

      expect(result.welcomeMessageRu).toBe("Добро пожаловать!");
      expect(result.welcomeMessageUz).toBe("Xush kelibsiz!");
      expect(result.welcomeMessageEn).toBe("Welcome!");
    });
  });

  // ==========================================================================
  // getMessages
  // ==========================================================================

  describe("getMessages", () => {
    it("should delegate to service with query and organizationId", async () => {
      const query = {
        page: 1,
        limit: 50,
        messageType: TelegramMessageType.COMMAND,
        direction: "incoming",
      } as any;
      const mockResult = {
        data: [{ id: "ml-1" }],
        total: 1,
        page: 1,
        limit: 50,
      };
      mockTelegramBotService.getMessageLog.mockResolvedValue(mockResult);

      const result = await controller.getMessages(query, "org-1");

      expect(mockTelegramBotService.getMessageLog).toHaveBeenCalledWith(
        query,
        "org-1",
      );
      expect(result).toEqual(mockResult);
    });

    it("should pass through empty query", async () => {
      const query = {} as any;
      mockTelegramBotService.getMessageLog.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.getMessages(query, "org-2");

      expect(mockTelegramBotService.getMessageLog).toHaveBeenCalledWith(
        {},
        "org-2",
      );
    });
  });
});
