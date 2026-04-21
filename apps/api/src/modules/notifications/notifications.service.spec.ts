jest.mock("@nestjs/axios", () => ({
  HttpModule: class HttpModule {},
  HttpService: class HttpService {
    get = jest.fn();
    post = jest.fn();
    put = jest.fn();
    delete = jest.fn();
    patch = jest.fn();
    axiosRef = {};
  },
}));

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import {
  Notification,
  NotificationTemplate,
  UserNotificationSettings,
  NotificationRule,
  NotificationQueue as NotificationQueueEntity,
  NotificationLog,
  NotificationCampaign,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationType,
} from "./entities/notification.entity";
import { PushSubscription } from "./entities/push-subscription.entity";
import { FcmToken, DeviceType } from "./entities/fcm-token.entity";
import { User } from "../users/entities/user.entity";
import { PushNotificationService } from "./services/push-notification.service";
import { NotificationDeliveryService } from "./services/notification-delivery.service";
import { DeviceToken } from "./entities/device-token.entity";
import { WebSocketService } from "../websocket/websocket.service";
import { NotificationGateway } from "../websocket/gateways/notification.gateway";

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
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
});

describe("NotificationsService", () => {
  let service: NotificationsService;
  let notificationRepo: MockRepository<Notification>;
  let templateRepo: MockRepository<NotificationTemplate>;
  let settingsRepo: MockRepository<UserNotificationSettings>;
  let ruleRepo: MockRepository<NotificationRule>;
  let queueRepo: MockRepository<NotificationQueueEntity>;
  let logRepo: MockRepository<NotificationLog>;
  let campaignRepo: MockRepository<NotificationCampaign>;
  let pushNotificationService: { [key: string]: jest.Mock };
  let deliveryService: { [key: string]: jest.Mock };

  beforeEach(async () => {
    notificationRepo = createMockRepository<Notification>();
    templateRepo = createMockRepository<NotificationTemplate>();
    settingsRepo = createMockRepository<UserNotificationSettings>();
    ruleRepo = createMockRepository<NotificationRule>();
    queueRepo = createMockRepository<NotificationQueueEntity>();
    logRepo = createMockRepository<NotificationLog>();
    campaignRepo = createMockRepository<NotificationCampaign>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
        {
          provide: getRepositoryToken(NotificationTemplate),
          useValue: templateRepo,
        },
        {
          provide: getRepositoryToken(UserNotificationSettings),
          useValue: settingsRepo,
        },
        { provide: getRepositoryToken(NotificationRule), useValue: ruleRepo },
        {
          provide: getRepositoryToken(NotificationQueueEntity),
          useValue: queueRepo,
        },
        { provide: getRepositoryToken(NotificationLog), useValue: logRepo },
        {
          provide: getRepositoryToken(NotificationCampaign),
          useValue: campaignRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
        {
          provide: PushNotificationService,
          useValue: {
            subscribePush: jest.fn(),
            unsubscribePush: jest.fn(),
            registerFcm: jest.fn(),
            unregisterFcm: jest.fn(),
            sendPush: jest.fn(),
          },
        },
        {
          provide: NotificationDeliveryService,
          useValue: {
            deliver: jest.fn(),
            processQueue: jest.fn(),
            queueNotification: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DeviceToken),
          useValue: createMockRepository<DeviceToken>(),
        },
        {
          provide: WebSocketService,
          useValue: {
            emitToOrganization: jest.fn(),
            emitToUser: jest.fn(),
            emitToRoom: jest.fn(),
          },
        },
        {
          provide: NotificationGateway,
          useValue: {
            emitNewNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    pushNotificationService = module.get(PushNotificationService);
    deliveryService = module.get(NotificationDeliveryService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe("create", () => {
    const dto = {
      organizationId: "org-1",
      userId: "user-1",
      type: NotificationType.SYSTEM,
      title: "Test Title",
      body: "Test Body",
      channels: [NotificationChannel.IN_APP],
    };

    it("should create a notification with QUEUED status when not scheduled", async () => {
      const created = {
        id: "n-1",
        ...dto,
        channels: dto.channels,
        status: NotificationStatus.QUEUED,
      };
      notificationRepo.create!.mockReturnValue(created);
      notificationRepo.save!.mockResolvedValue(created);
      queueRepo.create!.mockReturnValue({});
      queueRepo.save!.mockResolvedValue({});

      const result = await service.create(dto);

      expect(notificationRepo.create).toHaveBeenCalled();
      expect(notificationRepo.save).toHaveBeenCalledWith(created);
      expect(result.status).toBe(NotificationStatus.QUEUED);
    });

    it("should create a notification with PENDING status when scheduled", async () => {
      const scheduledDto = { ...dto, scheduledFor: new Date("2030-01-01") };
      const created = {
        id: "n-2",
        ...scheduledDto,
        status: NotificationStatus.PENDING,
      };
      notificationRepo.create!.mockReturnValue(created);
      notificationRepo.save!.mockResolvedValue(created);

      const result = await service.create(scheduledDto);

      expect(result.status).toBe(NotificationStatus.PENDING);
      // Should NOT queue when scheduled
      expect(queueRepo.create).not.toHaveBeenCalled();
    });

    it("should default priority to NORMAL when not provided", async () => {
      const created = {
        id: "n-3",
        priority: NotificationPriority.NORMAL,
        channels: dto.channels,
      };
      notificationRepo.create!.mockReturnValue(created);
      notificationRepo.save!.mockResolvedValue(created);
      queueRepo.create!.mockReturnValue({});
      queueRepo.save!.mockResolvedValue({});

      await service.create(dto);

      expect(notificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ priority: NotificationPriority.NORMAL }),
      );
    });
  });

  // ==========================================================================
  // findById
  // ==========================================================================

  describe("findById", () => {
    it("should return a notification when found", async () => {
      const notification = { id: "n-1", type: NotificationType.SYSTEM };
      notificationRepo.findOne!.mockResolvedValue(notification);

      const result = await service.findById("n-1");

      expect(result).toEqual(notification);
      expect(notificationRepo.findOne).toHaveBeenCalledWith({
        where: { id: "n-1" },
      });
    });

    it("should throw NotFoundException when notification not found", async () => {
      notificationRepo.findOne!.mockResolvedValue(null);

      await expect(service.findById("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // query
  // ==========================================================================

  describe("query", () => {
    it("should return paginated notifications", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(50);
      mockQb.getMany.mockResolvedValue([{ id: "n-1" }]);
      notificationRepo.createQueryBuilder!.mockReturnValue(mockQb);
      notificationRepo.count!.mockResolvedValue(3);

      const result = await service.query({
        userId: "user-1",
        organizationId: "org-1",
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(50);
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(3);
    });

    it("should filter by type array when provided", async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      notificationRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.query({
        type: [NotificationType.SYSTEM, NotificationType.ANNOUNCEMENT],
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith("n.type IN (:...type)", {
        type: [NotificationType.SYSTEM, NotificationType.ANNOUNCEMENT],
      });
    });
  });

  // ==========================================================================
  // markAsRead / markAllAsRead
  // ==========================================================================

  describe("markAsRead", () => {
    it("should mark a notification as read", async () => {
      const notification = {
        id: "n-1",
        readAt: null,
        status: NotificationStatus.SENT,
      };
      notificationRepo.findOne!.mockResolvedValue(notification);
      notificationRepo.save!.mockResolvedValue({
        ...notification,
        readAt: expect.any(Date),
        status: NotificationStatus.READ,
      });

      await service.markAsRead("n-1");

      expect(notificationRepo.save).toHaveBeenCalled();
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read for a user", async () => {
      notificationRepo.update!.mockResolvedValue({ affected: 5 });

      const result = await service.markAllAsRead("user-1");

      expect(result).toBe(5);
    });

    it("should return 0 when no unread notifications", async () => {
      notificationRepo.update!.mockResolvedValue({ affected: 0 });

      const result = await service.markAllAsRead("user-1");

      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // getUnreadCount
  // ==========================================================================

  describe("getUnreadCount", () => {
    it("should return count of unread notifications", async () => {
      notificationRepo.count!.mockResolvedValue(7);

      const result = await service.getUnreadCount("user-1");

      expect(result).toBe(7);
    });
  });

  // ==========================================================================
  // delete / bulkDelete / bulkMarkAsRead
  // ==========================================================================

  describe("delete", () => {
    it("should delete a notification by ID", async () => {
      notificationRepo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.delete("n-1");

      expect(notificationRepo.softDelete).toHaveBeenCalledWith("n-1");
    });
  });

  describe("bulkDelete", () => {
    it("should delete multiple notifications and return count", async () => {
      notificationRepo.softDelete!.mockResolvedValue({ affected: 3 });

      const result = await service.bulkDelete(["n-1", "n-2", "n-3"]);

      expect(result).toBe(3);
    });
  });

  describe("bulkMarkAsRead", () => {
    it("should mark multiple notifications as read and return count", async () => {
      notificationRepo.update!.mockResolvedValue({ affected: 2 });

      const result = await service.bulkMarkAsRead(["n-1", "n-2"]);

      expect(result).toBe(2);
    });
  });

  // ==========================================================================
  // cancel
  // ==========================================================================

  describe("cancel", () => {
    it("should cancel a pending notification", async () => {
      const notification = { id: "n-1", status: NotificationStatus.PENDING };
      notificationRepo.findOne!.mockResolvedValue(notification);
      notificationRepo.save!.mockResolvedValue({
        ...notification,
        status: NotificationStatus.CANCELLED,
      });
      queueRepo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.cancel("n-1");

      expect(queueRepo.softDelete).toHaveBeenCalledWith({
        notificationId: "n-1",
      });
      expect(notificationRepo.save).toHaveBeenCalled();
    });

    it("should throw BadRequestException when cancelling a sent notification", async () => {
      const notification = { id: "n-1", status: NotificationStatus.SENT };
      notificationRepo.findOne!.mockResolvedValue(notification);

      await expect(service.cancel("n-1")).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // update
  // ==========================================================================

  describe("update", () => {
    it("should update notification title and body", async () => {
      const notification = {
        id: "n-1",
        content: { title: "Old", body: "Old body" },
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.NORMAL,
        metadata: {},
      };
      notificationRepo.findOne!.mockResolvedValue(notification);
      notificationRepo.save!.mockImplementation((n) => Promise.resolve(n));

      const result = await service.update("n-1", {
        title: "New Title",
        body: "New Body",
      });

      expect(result.content.title).toBe("New Title");
      expect(result.content.body).toBe("New Body");
    });
  });

  // ==========================================================================
  // deleteOld
  // ==========================================================================

  describe("deleteOld", () => {
    it("should delete old notifications and return count", async () => {
      notificationRepo.softDelete!.mockResolvedValue({ affected: 10 });

      const result = await service.deleteOld(30);

      expect(result).toBe(10);
      expect(notificationRepo.softDelete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // sendTemplated
  // ==========================================================================

  describe("sendTemplated", () => {
    it("should throw NotFoundException when template not found", async () => {
      templateRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.sendTemplated({
          templateCode: "INVALID",
          organizationId: "org-1",
          variables: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should create notification from template with interpolated variables", async () => {
      const template = {
        code: "TASK_ASSIGNED",
        isActive: true,
        type: NotificationType.TASK_ASSIGNED,
        titleRu: "Задача {{task_name}}",
        bodyRu: "Назначена {{user_name}}",
        titleUz: "",
        bodyUz: "",
        defaultChannels: [NotificationChannel.IN_APP],
        defaultPriority: NotificationPriority.NORMAL,
      };
      templateRepo.findOne!.mockResolvedValue(template);
      settingsRepo.findOne!.mockResolvedValue(null);
      const created = { id: "n-1", channels: [NotificationChannel.IN_APP] };
      notificationRepo.create!.mockReturnValue(created);
      notificationRepo.save!.mockResolvedValue(created);
      queueRepo.create!.mockReturnValue({});
      queueRepo.save!.mockResolvedValue({});

      await service.sendTemplated({
        templateCode: "TASK_ASSIGNED",
        organizationId: "org-1",
        variables: { task_name: "Fix machine", user_name: "Alisher" },
      });

      expect(notificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: "Задача Fix machine",
            body: "Назначена Alisher",
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // getSettings / updateSettings
  // ==========================================================================

  describe("getSettings", () => {
    it("should return user notification settings", async () => {
      const settings = { userId: "user-1", pushEnabled: true };
      settingsRepo.findOne!.mockResolvedValue(settings);

      const result = await service.getSettings("user-1");

      expect(result).toEqual(settings);
    });

    it("should return null when settings not found", async () => {
      settingsRepo.findOne!.mockResolvedValue(null);

      const result = await service.getSettings("user-1");

      expect(result).toBeNull();
    });
  });

  describe("updateSettings", () => {
    it("should update existing settings", async () => {
      const existing = { userId: "user-1", pushEnabled: true };
      settingsRepo.findOne!.mockResolvedValue(existing);
      settingsRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.updateSettings("user-1", "org-1", {
        pushEnabled: false,
      });

      expect(result.pushEnabled).toBe(false);
    });

    it("should create new settings when none exist", async () => {
      settingsRepo.findOne!.mockResolvedValue(null);

      settingsRepo.create!.mockImplementation((d) => d as any);
      settingsRepo.save!.mockImplementation((s) => Promise.resolve(s));

      await service.updateSettings("user-1", "org-1", { smsEnabled: true });

      expect(settingsRepo.create).toHaveBeenCalled();
      expect(settingsRepo.save).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Templates
  // ==========================================================================

  describe("getTemplate", () => {
    it("should return template when found", async () => {
      const template = { id: "t-1", name: "Template" };
      templateRepo.findOne!.mockResolvedValue(template);

      const result = await service.getTemplate("t-1", "org-uuid-1");

      expect(result).toEqual(template);
    });

    it("should throw NotFoundException when template not found", async () => {
      templateRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getTemplate("non-existent", "org-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("createTemplate", () => {
    it("should create a template with isActive=true and isSystem=false", async () => {
      const data = { name: "New Template", titleRu: "Title" };
      templateRepo.create!.mockReturnValue({
        ...data,
        isActive: true,
        isSystem: false,
      });
      templateRepo.save!.mockResolvedValue({
        id: "t-1",
        ...data,
        isActive: true,
        isSystem: false,
      });

      await service.createTemplate(data as any);

      expect(templateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true, isSystem: false }),
      );
    });
  });

  // ==========================================================================
  // Campaigns
  // ==========================================================================

  describe("createCampaign", () => {
    it("should create a campaign with estimated recipients from targetUserIds", async () => {
      const dto = {
        organizationId: "org-1",
        name: "Test Campaign",
        title: "Hello",
        body: "World",
        targetType: "custom" as const,
        targetUserIds: ["u-1", "u-2", "u-3"],
        channels: [NotificationChannel.PUSH],
      };
      campaignRepo.create!.mockReturnValue({ ...dto, estimatedRecipients: 3 });
      campaignRepo.save!.mockResolvedValue({
        id: "c-1",
        ...dto,
        estimatedRecipients: 3,
      });

      await service.createCampaign(dto);

      expect(campaignRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ estimatedRecipients: 3 }),
      );
    });
  });

  describe("startCampaign", () => {
    it("should start a draft campaign", async () => {
      const campaign = { id: "c-1", status: "draft" };
      campaignRepo.findOne!.mockResolvedValue(campaign);
      campaignRepo.save!.mockResolvedValue({
        ...campaign,
        status: "in_progress",
      });

      await service.startCampaign("c-1");

      expect(campaign.status).toBe("in_progress");
    });

    it("should throw NotFoundException when campaign not found", async () => {
      campaignRepo.findOne!.mockResolvedValue(null);

      await expect(service.startCampaign("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when campaign already in progress", async () => {
      const campaign = { id: "c-1", status: "in_progress" };
      campaignRepo.findOne!.mockResolvedValue(campaign);

      await expect(service.startCampaign("c-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // Push Subscriptions
  // ==========================================================================

  describe("subscribePush", () => {
    it("should delegate to pushNotificationService", async () => {
      const sub = {
        id: "ps-1",
        userId: "u-1",
        endpoint: "https://push.example.com",
      };
      pushNotificationService.subscribePush.mockResolvedValue(sub);

      const result = await service.subscribePush(
        "u-1",
        "org-1",
        "https://push.example.com",
        "p256dh",
        "auth",
      );

      expect(pushNotificationService.subscribePush).toHaveBeenCalledWith(
        "u-1",
        "org-1",
        "https://push.example.com",
        "p256dh",
        "auth",
        undefined,
      );
      expect(result.userId).toBe("u-1");
    });
  });

  describe("unsubscribePush", () => {
    it("should delegate to pushNotificationService", async () => {
      pushNotificationService.unsubscribePush.mockResolvedValue(undefined);

      await service.unsubscribePush("https://push.example.com");

      expect(pushNotificationService.unsubscribePush).toHaveBeenCalledWith(
        "https://push.example.com",
      );
    });

    it("should propagate NotFoundException from pushNotificationService", async () => {
      pushNotificationService.unsubscribePush.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(service.unsubscribePush("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================================================
  // FCM Tokens
  // ==========================================================================

  describe("registerFcm", () => {
    it("should delegate to pushNotificationService", async () => {
      const token = {
        id: "ft-1",
        userId: "u-1",
        token: "fcm-token-123",
        deviceType: DeviceType.ANDROID,
      };
      pushNotificationService.registerFcm.mockResolvedValue(token);

      const result = await service.registerFcm(
        "u-1",
        "org-1",
        "fcm-token-123",
        DeviceType.ANDROID,
      );

      expect(pushNotificationService.registerFcm).toHaveBeenCalledWith(
        "u-1",
        "org-1",
        "fcm-token-123",
        DeviceType.ANDROID,
        undefined,
        undefined,
      );
      expect(result.token).toBe("fcm-token-123");
    });
  });

  describe("unregisterFcm", () => {
    it("should delegate to pushNotificationService", async () => {
      pushNotificationService.unregisterFcm.mockResolvedValue(undefined);

      await service.unregisterFcm("fcm-token-123");

      expect(pushNotificationService.unregisterFcm).toHaveBeenCalledWith(
        "fcm-token-123",
      );
    });

    it("should propagate NotFoundException from pushNotificationService", async () => {
      pushNotificationService.unregisterFcm.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(service.unregisterFcm("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
