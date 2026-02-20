import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
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
} from './entities/notification.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { FcmToken, DeviceType } from './entities/fcm-token.entity';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
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

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepo: MockRepository<Notification>;
  let templateRepo: MockRepository<NotificationTemplate>;
  let settingsRepo: MockRepository<UserNotificationSettings>;
  let ruleRepo: MockRepository<NotificationRule>;
  let queueRepo: MockRepository<NotificationQueueEntity>;
  let logRepo: MockRepository<NotificationLog>;
  let campaignRepo: MockRepository<NotificationCampaign>;
  let pushSubscriptionRepo: MockRepository<PushSubscription>;
  let fcmTokenRepo: MockRepository<FcmToken>;

  beforeEach(async () => {
    notificationRepo = createMockRepository<Notification>();
    templateRepo = createMockRepository<NotificationTemplate>();
    settingsRepo = createMockRepository<UserNotificationSettings>();
    ruleRepo = createMockRepository<NotificationRule>();
    queueRepo = createMockRepository<NotificationQueueEntity>();
    logRepo = createMockRepository<NotificationLog>();
    campaignRepo = createMockRepository<NotificationCampaign>();
    pushSubscriptionRepo = createMockRepository<PushSubscription>();
    fcmTokenRepo = createMockRepository<FcmToken>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: notificationRepo },
        { provide: getRepositoryToken(NotificationTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(UserNotificationSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(NotificationRule), useValue: ruleRepo },
        { provide: getRepositoryToken(NotificationQueueEntity), useValue: queueRepo },
        { provide: getRepositoryToken(NotificationLog), useValue: logRepo },
        { provide: getRepositoryToken(NotificationCampaign), useValue: campaignRepo },
        { provide: getRepositoryToken(PushSubscription), useValue: pushSubscriptionRepo },
        { provide: getRepositoryToken(FcmToken), useValue: fcmTokenRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    const dto = {
      organizationId: 'org-1',
      userId: 'user-1',
      type: NotificationType.SYSTEM,
      title: 'Test Title',
      body: 'Test Body',
      channels: [NotificationChannel.IN_APP],
    };

    it('should create a notification with QUEUED status when not scheduled', async () => {
      const created = { id: 'n-1', ...dto, channels: dto.channels, status: NotificationStatus.QUEUED };
      notificationRepo.create!.mockReturnValue(created);
      notificationRepo.save!.mockResolvedValue(created);
      queueRepo.create!.mockReturnValue({});
      queueRepo.save!.mockResolvedValue({});

      const result = await service.create(dto);

      expect(notificationRepo.create).toHaveBeenCalled();
      expect(notificationRepo.save).toHaveBeenCalledWith(created);
      expect(result.status).toBe(NotificationStatus.QUEUED);
    });

    it('should create a notification with PENDING status when scheduled', async () => {
      const scheduledDto = { ...dto, scheduledFor: new Date('2030-01-01') };
      const created = { id: 'n-2', ...scheduledDto, status: NotificationStatus.PENDING };
      notificationRepo.create!.mockReturnValue(created);
      notificationRepo.save!.mockResolvedValue(created);

      const result = await service.create(scheduledDto);

      expect(result.status).toBe(NotificationStatus.PENDING);
      // Should NOT queue when scheduled
      expect(queueRepo.create).not.toHaveBeenCalled();
    });

    it('should default priority to NORMAL when not provided', async () => {
      const created = { id: 'n-3', priority: NotificationPriority.NORMAL };
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

  describe('findById', () => {
    it('should return a notification when found', async () => {
      const notification = { id: 'n-1', type: NotificationType.SYSTEM };
      notificationRepo.findOne!.mockResolvedValue(notification);

      const result = await service.findById('n-1');

      expect(result).toEqual(notification);
      expect(notificationRepo.findOne).toHaveBeenCalledWith({ where: { id: 'n-1' } });
    });

    it('should throw NotFoundException when notification not found', async () => {
      notificationRepo.findOne!.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // query
  // ==========================================================================

  describe('query', () => {
    it('should return paginated notifications', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(50);
      mockQb.getMany.mockResolvedValue([{ id: 'n-1' }]);
      notificationRepo.createQueryBuilder!.mockReturnValue(mockQb);
      notificationRepo.count!.mockResolvedValue(3);

      const result = await service.query({
        userId: 'user-1',
        organizationId: 'org-1',
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(50);
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(3);
    });

    it('should filter by type array when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(0);
      mockQb.getMany.mockResolvedValue([]);
      notificationRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.query({ type: [NotificationType.SYSTEM, NotificationType.ANNOUNCEMENT] });

      expect(mockQb.andWhere).toHaveBeenCalledWith('n.type IN (:...type)', {
        type: [NotificationType.SYSTEM, NotificationType.ANNOUNCEMENT],
      });
    });
  });

  // ==========================================================================
  // markAsRead / markAllAsRead
  // ==========================================================================

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notification = { id: 'n-1', readAt: null, status: NotificationStatus.SENT };
      notificationRepo.findOne!.mockResolvedValue(notification);
      notificationRepo.save!.mockResolvedValue({
        ...notification,
        readAt: expect.any(Date),
        status: NotificationStatus.READ,
      });

      const result = await service.markAsRead('n-1');

      expect(notificationRepo.save).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      notificationRepo.update!.mockResolvedValue({ affected: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toBe(5);
    });

    it('should return 0 when no unread notifications', async () => {
      notificationRepo.update!.mockResolvedValue({ affected: 0 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toBe(0);
    });
  });

  // ==========================================================================
  // getUnreadCount
  // ==========================================================================

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      notificationRepo.count!.mockResolvedValue(7);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(7);
    });
  });

  // ==========================================================================
  // delete / bulkDelete / bulkMarkAsRead
  // ==========================================================================

  describe('delete', () => {
    it('should delete a notification by ID', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 1 });

      await service.delete('n-1');

      expect(notificationRepo.delete).toHaveBeenCalledWith('n-1');
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple notifications and return count', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 3 });

      const result = await service.bulkDelete(['n-1', 'n-2', 'n-3']);

      expect(result).toBe(3);
    });
  });

  describe('bulkMarkAsRead', () => {
    it('should mark multiple notifications as read and return count', async () => {
      notificationRepo.update!.mockResolvedValue({ affected: 2 });

      const result = await service.bulkMarkAsRead(['n-1', 'n-2']);

      expect(result).toBe(2);
    });
  });

  // ==========================================================================
  // cancel
  // ==========================================================================

  describe('cancel', () => {
    it('should cancel a pending notification', async () => {
      const notification = { id: 'n-1', status: NotificationStatus.PENDING };
      notificationRepo.findOne!.mockResolvedValue(notification);
      notificationRepo.save!.mockResolvedValue({ ...notification, status: NotificationStatus.CANCELLED });
      queueRepo.delete!.mockResolvedValue({ affected: 1 });

      const result = await service.cancel('n-1');

      expect(queueRepo.delete).toHaveBeenCalledWith({ notificationId: 'n-1' });
      expect(notificationRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when cancelling a sent notification', async () => {
      const notification = { id: 'n-1', status: NotificationStatus.SENT };
      notificationRepo.findOne!.mockResolvedValue(notification);

      await expect(service.cancel('n-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // update
  // ==========================================================================

  describe('update', () => {
    it('should update notification title and body', async () => {
      const notification = {
        id: 'n-1',
        content: { title: 'Old', body: 'Old body' },
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.NORMAL,
        metadata: {},
      };
      notificationRepo.findOne!.mockResolvedValue(notification);
      notificationRepo.save!.mockImplementation((n) => Promise.resolve(n));

      const result = await service.update('n-1', { title: 'New Title', body: 'New Body' });

      expect(result.content.title).toBe('New Title');
      expect(result.content.body).toBe('New Body');
    });
  });

  // ==========================================================================
  // deleteOld
  // ==========================================================================

  describe('deleteOld', () => {
    it('should delete old notifications and return count', async () => {
      notificationRepo.delete!.mockResolvedValue({ affected: 10 });

      const result = await service.deleteOld(30);

      expect(result).toBe(10);
      expect(notificationRepo.delete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // sendTemplated
  // ==========================================================================

  describe('sendTemplated', () => {
    it('should throw NotFoundException when template not found', async () => {
      templateRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.sendTemplated({
          templateCode: 'INVALID',
          organizationId: 'org-1',
          variables: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create notification from template with interpolated variables', async () => {
      const template = {
        code: 'TASK_ASSIGNED',
        isActive: true,
        type: NotificationType.TASK_ASSIGNED,
        titleRu: 'Задача {{task_name}}',
        bodyRu: 'Назначена {{user_name}}',
        titleUz: '',
        bodyUz: '',
        defaultChannels: [NotificationChannel.IN_APP],
        defaultPriority: NotificationPriority.NORMAL,
      };
      templateRepo.findOne!.mockResolvedValue(template);
      settingsRepo.findOne!.mockResolvedValue(null);
      const created = { id: 'n-1', channels: [NotificationChannel.IN_APP] };
      notificationRepo.create!.mockReturnValue(created);
      notificationRepo.save!.mockResolvedValue(created);
      queueRepo.create!.mockReturnValue({});
      queueRepo.save!.mockResolvedValue({});

      await service.sendTemplated({
        templateCode: 'TASK_ASSIGNED',
        organizationId: 'org-1',
        variables: { task_name: 'Fix machine', user_name: 'Alisher' },
      });

      expect(notificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Задача Fix machine',
            body: 'Назначена Alisher',
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // getSettings / updateSettings
  // ==========================================================================

  describe('getSettings', () => {
    it('should return user notification settings', async () => {
      const settings = { userId: 'user-1', pushEnabled: true };
      settingsRepo.findOne!.mockResolvedValue(settings);

      const result = await service.getSettings('user-1');

      expect(result).toEqual(settings);
    });

    it('should return null when settings not found', async () => {
      settingsRepo.findOne!.mockResolvedValue(null);

      const result = await service.getSettings('user-1');

      expect(result).toBeNull();
    });
  });

  describe('updateSettings', () => {
    it('should update existing settings', async () => {
      const existing = { userId: 'user-1', pushEnabled: true };
      settingsRepo.findOne!.mockResolvedValue(existing);
      settingsRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.updateSettings('user-1', 'org-1', { pushEnabled: false });

      expect(result.pushEnabled).toBe(false);
    });

    it('should create new settings when none exist', async () => {
      settingsRepo.findOne!.mockResolvedValue(null);
      settingsRepo.create!.mockImplementation((d) => d as any);
      settingsRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.updateSettings('user-1', 'org-1', { smsEnabled: true });

      expect(settingsRepo.create).toHaveBeenCalled();
      expect(settingsRepo.save).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Templates
  // ==========================================================================

  describe('getTemplate', () => {
    it('should return template when found', async () => {
      const template = { id: 't-1', name: 'Template' };
      templateRepo.findOne!.mockResolvedValue(template);

      const result = await service.getTemplate('t-1');

      expect(result).toEqual(template);
    });

    it('should throw NotFoundException when template not found', async () => {
      templateRepo.findOne!.mockResolvedValue(null);

      await expect(service.getTemplate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTemplate', () => {
    it('should create a template with isActive=true and isSystem=false', async () => {
      const data = { name: 'New Template', titleRu: 'Title' };
      templateRepo.create!.mockReturnValue({ ...data, isActive: true, isSystem: false });
      templateRepo.save!.mockResolvedValue({ id: 't-1', ...data, isActive: true, isSystem: false });

      const result = await service.createTemplate(data as any);

      expect(templateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true, isSystem: false }),
      );
    });
  });

  // ==========================================================================
  // Campaigns
  // ==========================================================================

  describe('createCampaign', () => {
    it('should create a campaign with estimated recipients from targetUserIds', async () => {
      const dto = {
        organizationId: 'org-1',
        name: 'Test Campaign',
        title: 'Hello',
        body: 'World',
        targetType: 'custom' as const,
        targetUserIds: ['u-1', 'u-2', 'u-3'],
        channels: [NotificationChannel.PUSH],
      };
      campaignRepo.create!.mockReturnValue({ ...dto, estimatedRecipients: 3 });
      campaignRepo.save!.mockResolvedValue({ id: 'c-1', ...dto, estimatedRecipients: 3 });

      const result = await service.createCampaign(dto);

      expect(campaignRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ estimatedRecipients: 3 }),
      );
    });
  });

  describe('startCampaign', () => {
    it('should start a draft campaign', async () => {
      const campaign = { id: 'c-1', status: 'draft' };
      campaignRepo.findOne!.mockResolvedValue(campaign);
      campaignRepo.save!.mockResolvedValue({ ...campaign, status: 'in_progress' });

      const result = await service.startCampaign('c-1');

      expect(campaign.status).toBe('in_progress');
    });

    it('should throw NotFoundException when campaign not found', async () => {
      campaignRepo.findOne!.mockResolvedValue(null);

      await expect(service.startCampaign('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when campaign already in progress', async () => {
      const campaign = { id: 'c-1', status: 'in_progress' };
      campaignRepo.findOne!.mockResolvedValue(campaign);

      await expect(service.startCampaign('c-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // Push Subscriptions
  // ==========================================================================

  describe('subscribePush', () => {
    it('should create a new push subscription', async () => {
      pushSubscriptionRepo.findOne!.mockResolvedValue(null);
      const sub = { user_id: 'u-1', endpoint: 'https://push.example.com' };
      pushSubscriptionRepo.create!.mockReturnValue(sub);
      pushSubscriptionRepo.save!.mockResolvedValue({ id: 'ps-1', ...sub });

      const result = await service.subscribePush('u-1', 'org-1', 'https://push.example.com', 'p256dh', 'auth');

      expect(pushSubscriptionRepo.create).toHaveBeenCalled();
      expect(result.user_id).toBe('u-1');
    });

    it('should update existing subscription when endpoint already exists', async () => {
      const existing = {
        id: 'ps-1',
        endpoint: 'https://push.example.com',
        user_id: 'old-user',
        is_active: false,
        user_agent: 'old-ua',
      };
      pushSubscriptionRepo.findOne!.mockResolvedValue(existing);
      pushSubscriptionRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.subscribePush('new-user', 'org-1', 'https://push.example.com', 'new-p256dh', 'new-auth');

      expect(result.user_id).toBe('new-user');
      expect(result.is_active).toBe(true);
    });
  });

  describe('unsubscribePush', () => {
    it('should deactivate a push subscription', async () => {
      const sub = { id: 'ps-1', endpoint: 'https://push.example.com', is_active: true };
      pushSubscriptionRepo.findOne!.mockResolvedValue(sub);
      pushSubscriptionRepo.save!.mockImplementation((s) => Promise.resolve(s));

      await service.unsubscribePush('https://push.example.com');

      expect(sub.is_active).toBe(false);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      pushSubscriptionRepo.findOne!.mockResolvedValue(null);

      await expect(service.unsubscribePush('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // FCM Tokens
  // ==========================================================================

  describe('registerFcm', () => {
    it('should create a new FCM token', async () => {
      fcmTokenRepo.findOne!.mockResolvedValue(null);
      const token = { user_id: 'u-1', token: 'fcm-token-123', device_type: DeviceType.ANDROID };
      fcmTokenRepo.create!.mockReturnValue(token);
      fcmTokenRepo.save!.mockResolvedValue({ id: 'ft-1', ...token });

      const result = await service.registerFcm('u-1', 'org-1', 'fcm-token-123', DeviceType.ANDROID);

      expect(fcmTokenRepo.create).toHaveBeenCalled();
    });

    it('should update existing FCM token', async () => {
      const existing = {
        id: 'ft-1',
        token: 'fcm-token-123',
        user_id: 'old-user',
        device_type: DeviceType.IOS,
        is_active: false,
        device_name: 'Old',
        device_id: 'old-id',
      };
      fcmTokenRepo.findOne!.mockResolvedValue(existing);
      fcmTokenRepo.save!.mockImplementation((s) => Promise.resolve(s));

      const result = await service.registerFcm('new-user', 'org-1', 'fcm-token-123', DeviceType.ANDROID, 'New Phone');

      expect(result.user_id).toBe('new-user');
      expect(result.device_type).toBe(DeviceType.ANDROID);
      expect(result.is_active).toBe(true);
    });
  });

  describe('unregisterFcm', () => {
    it('should deactivate an FCM token', async () => {
      const token = { id: 'ft-1', token: 'fcm-token-123', is_active: true };
      fcmTokenRepo.findOne!.mockResolvedValue(token);
      fcmTokenRepo.save!.mockImplementation((s) => Promise.resolve(s));

      await service.unregisterFcm('fcm-token-123');

      expect(token.is_active).toBe(false);
    });

    it('should throw NotFoundException when token not found', async () => {
      fcmTokenRepo.findOne!.mockResolvedValue(null);

      await expect(service.unregisterFcm('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
