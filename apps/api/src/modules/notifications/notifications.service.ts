/**
 * Notifications Service for VendHub OS
 * Multi-channel notification delivery system
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, IsNull, LessThan, MoreThan } from "typeorm";
// BullMQ is optional - queue functionality can be disabled
// import { InjectQueue } from '@nestjs/bullmq';
// import { Queue } from 'bullmq';
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
import { UpdateNotificationSettingsDto } from "./dto/update-notification-settings.dto";
import {
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
} from "./dto/notification-template.dto";
import { PushNotificationService } from "./services/push-notification.service";
import { NotificationDeliveryService } from "./services/notification-delivery.service";

// ============================================================================
// DTOs
// ============================================================================

export interface CreateNotificationDto {
  organizationId: string;
  userId?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  body: string;
  titleUz?: string;
  bodyUz?: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;
  channels: NotificationChannel[];
  scheduledFor?: Date;
  expiresAt?: Date;
  groupKey?: string;
}

export interface SendTemplatedNotificationDto {
  templateCode: string;
  organizationId: string;
  recipientUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientTelegramId?: string;
  variables: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  scheduledFor?: Date;
  language?: "ru" | "uz";
}

export interface CreateCampaignDto {
  organizationId: string;
  name: string;
  description?: string;
  templateId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  targetType: "all" | "role" | "custom" | "filter";
  targetRoles?: string[];
  targetUserIds?: string[];
  targetFilter?: Record<string, unknown>;
  channels: NotificationChannel[];
  scheduledFor?: Date;
}

export interface QueryNotificationsDto {
  userId?: string;
  organizationId?: string;
  type?: NotificationType[];
  status?: NotificationStatus[];
  isRead?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(UserNotificationSettings)
    private settingsRepo: Repository<UserNotificationSettings>,
    @InjectRepository(NotificationRule)
    private ruleRepo: Repository<NotificationRule>,
    @InjectRepository(NotificationQueueEntity)
    private queueRepo: Repository<NotificationQueueEntity>,
    @InjectRepository(NotificationLog)
    private logRepo: Repository<NotificationLog>,
    @InjectRepository(NotificationCampaign)
    private campaignRepo: Repository<NotificationCampaign>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private readonly pushNotificationService: PushNotificationService,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  // ============================================================================
  // NOTIFICATION CRUD
  // ============================================================================

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      organizationId: dto.organizationId,
      userId: dto.userId,
      type: dto.type,
      priority: dto.priority || NotificationPriority.NORMAL,
      status: dto.scheduledFor
        ? NotificationStatus.PENDING
        : NotificationStatus.QUEUED,
      content: {
        title: dto.title,
        body: dto.body,
        titleUz: dto.titleUz,
        bodyUz: dto.bodyUz,
        actionUrl: dto.actionUrl,
        imageUrl: dto.imageUrl,
      },
      channels: dto.channels,
      scheduledAt: dto.scheduledFor,
      expiresAt: dto.expiresAt,
      metadata: dto.data ? { ...dto.data } : {},
      deliveryStatus: [],
    });

    const saved = await this.notificationRepo.save(notification);

    // Queue for sending if not scheduled
    if (!dto.scheduledFor) {
      await this.deliveryService.queueNotification(saved);
    }

    return saved;
  }

  async findById(id: string, organizationId?: string): Promise<Notification> {
    const where: Record<string, string> = { id };
    if (organizationId) where.organizationId = organizationId;
    const notification = await this.notificationRepo.findOne({ where });
    if (!notification) {
      throw new NotFoundException(`Уведомление ${id} не найдено`);
    }
    return notification;
  }

  async query(query: QueryNotificationsDto) {
    const {
      userId,
      organizationId,
      type,
      status,
      isRead,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.notificationRepo.createQueryBuilder("n");

    if (userId) {
      qb.andWhere("n.userId = :userId", { userId });
    }

    if (organizationId) {
      qb.andWhere("n.organizationId = :organizationId", { organizationId });
    }

    if (type?.length) {
      qb.andWhere("n.type IN (:...type)", { type });
    }

    if (status?.length) {
      qb.andWhere("n.status IN (:...status)", { status });
    }

    if (isRead !== undefined) {
      if (isRead) {
        qb.andWhere("n.readAt IS NOT NULL");
      } else {
        qb.andWhere("n.readAt IS NULL");
      }
    }

    if (dateFrom) {
      qb.andWhere("n.createdAt >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("n.createdAt <= :dateTo", { dateTo });
    }

    // Exclude expired
    qb.andWhere("(n.expiresAt IS NULL OR n.expiresAt > :now)", {
      now: new Date(),
    });

    const total = await qb.getCount();

    qb.orderBy("n.createdAt", "DESC");
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount: userId ? await this.getUnreadCount(userId) : 0,
    };
  }

  async markAsRead(id: string, userId?: string): Promise<Notification> {
    const notification = await this.findById(id);
    if (userId && notification.userId !== userId) {
      throw new ForbiddenException("Нет доступа к этому уведомлению");
    }
    notification.readAt = new Date();
    notification.status = NotificationStatus.READ;
    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationRepo.update(
      { userId, readAt: IsNull() },
      { readAt: new Date(), status: NotificationStatus.READ },
    );
    return result.affected || 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: {
        userId,
        readAt: IsNull(),
        status: In([NotificationStatus.SENT, NotificationStatus.DELIVERED]),
      },
    });
  }

  async delete(id: string, userId?: string): Promise<void> {
    if (userId) {
      const notification = await this.findById(id);
      if (notification.userId !== userId) {
        throw new ForbiddenException("Нет доступа к этому уведомлению");
      }
    }
    await this.notificationRepo.softDelete(id);
  }

  // ============================================================================
  // ADDITIONAL CRUD METHODS
  // ============================================================================

  /**
   * Найти все уведомления организации с пагинацией
   */
  async findAll(
    organizationId: string,
    options?: {
      page?: number;
      limit?: number;
      userId?: string;
      type?: NotificationType;
      status?: NotificationStatus;
    },
  ) {
    const { page = 1, limit = 20, userId, type, status } = options || {};

    const qb = this.notificationRepo.createQueryBuilder("n");
    qb.where("n.organizationId = :organizationId", { organizationId });

    if (userId) {
      qb.andWhere("n.userId = :userId", { userId });
    }

    if (type) {
      qb.andWhere("n.type = :type", { type });
    }

    if (status) {
      qb.andWhere("n.status = :status", { status });
    }

    const total = await qb.getCount();

    qb.orderBy("n.createdAt", "DESC");
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Обновить уведомление
   */
  async update(
    id: string,
    data: Partial<{
      title: string;
      body: string;
      status: NotificationStatus;
      priority: NotificationPriority;
      data: Record<string, unknown>;
      scheduledFor: Date;
      expiresAt: Date;
    }>,
  ): Promise<Notification> {
    const notification = await this.findById(id);

    if (data.title || data.body) {
      notification.content = {
        ...notification.content,
        ...(data.title && { title: data.title }),
        ...(data.body && { body: data.body }),
      };
    }
    if (data.status) notification.status = data.status;
    if (data.priority) notification.priority = data.priority;
    if (data.data)
      notification.metadata = { ...notification.metadata, ...data.data };
    if (data.scheduledFor) notification.scheduledAt = data.scheduledFor;
    if (data.expiresAt) notification.expiresAt = data.expiresAt;

    return this.notificationRepo.save(notification);
  }

  /**
   * Отменить запланированное уведомление
   */
  async cancel(id: string): Promise<Notification> {
    const notification = await this.findById(id);

    if (
      notification.status !== NotificationStatus.PENDING &&
      notification.status !== NotificationStatus.QUEUED
    ) {
      throw new BadRequestException(
        "Можно отменить только ожидающие уведомления",
      );
    }

    notification.status = NotificationStatus.CANCELLED;
    notification.updatedAt = new Date();

    // Удалить из очереди
    await this.queueRepo.softDelete({ notificationId: id });

    return this.notificationRepo.save(notification);
  }

  /**
   * Повторно отправить уведомление
   */
  async resend(id: string): Promise<Notification> {
    const notification = await this.findById(id);

    // Создать новое уведомление на основе существующего
    return this.create({
      organizationId: notification.organizationId,
      userId: notification.userId,
      type: notification.type,
      priority: notification.priority,
      title: notification.content?.title || "",
      body: notification.content?.body || "",
      titleUz: notification.content?.titleUz,
      bodyUz: notification.content?.bodyUz,
      data: notification.metadata,
      imageUrl: notification.content?.imageUrl,
      actionUrl: notification.content?.actionUrl,
      channels: notification.channels,
    });
  }

  /**
   * Получить статистику уведомлений
   */
  async getStats(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const qb = this.notificationRepo.createQueryBuilder("n");
    qb.where("n.organizationId = :organizationId", { organizationId });

    if (dateFrom) {
      qb.andWhere("n.createdAt >= :dateFrom", { dateFrom });
    }
    if (dateTo) {
      qb.andWhere("n.createdAt <= :dateTo", { dateTo });
    }

    const total = await qb.getCount();

    const byStatus = await this.notificationRepo
      .createQueryBuilder("n")
      .select("n.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("n.organizationId = :organizationId", { organizationId })
      .groupBy("n.status")
      .getRawMany();

    const byType = await this.notificationRepo
      .createQueryBuilder("n")
      .select("n.type", "type")
      .addSelect("COUNT(*)", "count")
      .where("n.organizationId = :organizationId", { organizationId })
      .groupBy("n.type")
      .getRawMany();

    const byChannel = await this.logRepo
      .createQueryBuilder("l")
      .innerJoin("l.notification", "n")
      .select("l.channel", "channel")
      .addSelect("COUNT(*)", "count")
      .addSelect(
        "SUM(CASE WHEN l.status = 'delivered' THEN 1 ELSE 0 END)",
        "delivered",
      )
      .addSelect(
        "SUM(CASE WHEN l.status = 'failed' THEN 1 ELSE 0 END)",
        "failed",
      )
      .where("n.organizationId = :organizationId", { organizationId })
      .groupBy("l.channel")
      .getRawMany();

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }),
        {},
      ),
      byType: byType.reduce(
        (acc, row) => ({ ...acc, [row.type]: parseInt(row.count) }),
        {},
      ),
      byChannel,
    };
  }

  /**
   * Массовое удаление уведомлений
   */
  async bulkDelete(ids: string[]): Promise<number> {
    const result = await this.notificationRepo.softDelete({ id: In(ids) });
    return result.affected || 0;
  }

  /**
   * Массовая пометка как прочитанные
   */
  async bulkMarkAsRead(ids: string[]): Promise<number> {
    const result = await this.notificationRepo.update(
      { id: In(ids), readAt: IsNull() },
      { readAt: new Date(), status: NotificationStatus.READ },
    );
    return result.affected || 0;
  }

  async deleteOld(olderThanDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.notificationRepo.softDelete({
      createdAt: LessThan(cutoff),
      status: In([NotificationStatus.READ, NotificationStatus.DELIVERED]),
    });

    return result.affected || 0;
  }

  // ============================================================================
  // TEMPLATED NOTIFICATIONS
  // ============================================================================

  async sendTemplated(
    dto: SendTemplatedNotificationDto,
  ): Promise<Notification> {
    const template = await this.templateRepo.findOne({
      where: { code: dto.templateCode, isActive: true },
    });

    if (!template) {
      throw new NotFoundException(`Шаблон ${dto.templateCode} не найден`);
    }

    // Get user settings if userId provided
    let userSettings: UserNotificationSettings | null = null;
    if (dto.recipientUserId) {
      userSettings = await this.settingsRepo.findOne({
        where: { userId: dto.recipientUserId },
      });
    }

    // Determine channels
    const channels = dto.channels || template.defaultChannels;
    const filteredChannels = userSettings
      ? channels.filter((ch) => {
          // Check channel-specific settings
          if (ch === NotificationChannel.PUSH && !userSettings.pushEnabled)
            return false;
          if (ch === NotificationChannel.EMAIL && !userSettings.emailEnabled)
            return false;
          if (ch === NotificationChannel.SMS && !userSettings.smsEnabled)
            return false;
          if (
            ch === NotificationChannel.TELEGRAM &&
            !userSettings.telegramEnabled
          )
            return false;
          if (ch === NotificationChannel.IN_APP && !userSettings.inAppEnabled)
            return false;
          return true;
        })
      : channels;

    // Determine language
    const language = dto.language || userSettings?.language || "ru";

    // Interpolate template
    const title = this.interpolate(
      language === "uz" ? template.titleUz : template.titleRu,
      dto.variables,
    );
    const body = this.interpolate(
      language === "uz" ? template.bodyUz : template.bodyRu,
      dto.variables,
    );

    return this.create({
      organizationId: dto.organizationId,
      userId: dto.recipientUserId,
      type: template.type,
      priority: dto.priority || template.defaultPriority,
      title,
      body,
      data: dto.variables,
      channels: filteredChannels,
      scheduledFor: dto.scheduledFor,
    });
  }

  private interpolate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  // ============================================================================
  // USER SETTINGS
  // ============================================================================

  async getSettings(userId: string): Promise<UserNotificationSettings | null> {
    return this.settingsRepo.findOne({ where: { userId } });
  }

  async updateSettings(
    userId: string,
    organizationId: string,
    updates: UpdateNotificationSettingsDto,
  ): Promise<UserNotificationSettings> {
    let settings = await this.settingsRepo.findOne({ where: { userId } });

    if (settings) {
      Object.assign(settings, updates);
    } else {
      settings = this.settingsRepo.create({
        userId,
        organizationId,
        enabled: true,
        language: "ru",
        typeSettings: {},
        ...updates,
      });
    }

    return this.settingsRepo.save(settings);
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  async getTemplates(organizationId?: string): Promise<NotificationTemplate[]> {
    return this.templateRepo.find({
      where: [
        { organizationId, isActive: true },
        { isSystem: true, isActive: true },
      ],
      order: { type: "ASC", name: "ASC" },
    });
  }

  async getTemplate(
    id: string,
    organizationId: string,
  ): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findOne({
      where: [
        { id, organizationId },
        { id, isSystem: true },
      ],
    });
    if (!template) {
      throw new NotFoundException(`Шаблон ${id} не найден`);
    }
    return template;
  }

  async createTemplate(
    data: CreateNotificationTemplateDto & { organizationId: string },
  ): Promise<NotificationTemplate> {
    const template = this.templateRepo.create({
      ...data,
      isActive: true,
      isSystem: false,
    } as Partial<NotificationTemplate>);
    return this.templateRepo.save(template) as Promise<NotificationTemplate>;
  }

  async updateTemplate(
    id: string,
    organizationId: string,
    data: UpdateNotificationTemplateDto,
  ): Promise<NotificationTemplate> {
    const template = await this.getTemplate(id, organizationId);
    Object.assign(template, data);
    template.updatedAt = new Date();
    return this.templateRepo.save(template);
  }

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  async createCampaign(dto: CreateCampaignDto): Promise<NotificationCampaign> {
    // Calculate total recipients
    const totalRecipients = await this.calculateCampaignRecipients(dto);

    const campaign = this.campaignRepo.create({
      organizationId: dto.organizationId,
      name: dto.name,
      description: dto.description,
      templateId: dto.templateId,
      content: {
        title: dto.title,
        body: dto.body,
      },
      channels: dto.channels,
      audienceType:
        dto.targetType === "custom"
          ? "users"
          : dto.targetType === "role"
            ? "roles"
            : dto.targetType,
      roles: dto.targetRoles,
      userIds: dto.targetUserIds || [],
      filter: dto.targetFilter ? { conditions: [] } : undefined,
      scheduledAt: dto.scheduledFor,
      status: dto.scheduledFor ? "scheduled" : "draft",
      estimatedRecipients: totalRecipients,
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalFailed: 0,
    });

    return this.campaignRepo.save(campaign);
  }

  async startCampaign(id: string): Promise<NotificationCampaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Кампания ${id} не найдена`);
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new BadRequestException("Кампания уже запущена");
    }

    campaign.status = "in_progress";
    campaign.startedAt = new Date();
    await this.campaignRepo.save(campaign);

    // Queue campaign processing (disabled)
    // await this.notificationQueue.add('process-campaign', { campaignId: id });

    return campaign;
  }

  async getCampaigns(organizationId: string): Promise<NotificationCampaign[]> {
    return this.campaignRepo.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
    });
  }

  private async calculateCampaignRecipients(
    dto: CreateCampaignDto,
  ): Promise<number> {
    // This would query users based on targeting criteria
    // Simplified for now
    if (dto.targetUserIds?.length) {
      return dto.targetUserIds.length;
    }
    return 0;
  }

  // ============================================================================
  // QUEUE & DELIVERY (delegated to NotificationDeliveryService)
  // ============================================================================

  async processQueue(): Promise<void> {
    return this.deliveryService.processQueue();
  }

  // ============================================================================
  // EVENT HANDLERS (for rules)
  // ============================================================================

  async triggerByEvent(
    organizationId: string,
    eventType: NotificationType,
    data: Record<string, unknown>,
  ): Promise<void> {
    const rules = await this.ruleRepo.find({
      where: {
        organizationId,
        notificationType: eventType,
        isActive: true,
      },
    });

    for (const rule of rules) {
      // Check conditions
      if (!this.checkRuleConditions(rule, data)) continue;

      // Apply delay if configured
      const scheduledFor = rule.delayMinutes
        ? new Date(Date.now() + rule.delayMinutes * 60000)
        : undefined;

      // Check cooldown
      if (rule.cooldownMinutes) {
        const recent = await this.notificationRepo.count({
          where: {
            organizationId,
            type: eventType,
            createdAt: MoreThan(
              new Date(Date.now() - rule.cooldownMinutes * 60000),
            ),
          },
        });
        if (recent > 0) continue;
      }

      // Send notification
      if (rule.templateId) {
        await this.sendTemplated({
          templateCode: rule.templateId,
          organizationId,
          recipientUserId: this.resolveRecipient(rule, data),
          variables: data,
          channels: rule.channels,
          priority: rule.priority,
          scheduledFor,
        });
      }
    }
  }

  private checkRuleConditions(
    rule: NotificationRule,
    data: Record<string, unknown>,
  ): boolean {
    if (!rule.conditions?.length) return true;

    for (const condition of rule.conditions) {
      const value = data[condition.field];

      switch (condition.operator) {
        case "equals":
          if (value !== condition.value) return false;
          break;
        case "not_equals":
          if (value === condition.value) return false;
          break;
        case "greater_than":
          if (Number(value) <= Number(condition.value)) return false;
          break;
        case "less_than":
          if (Number(value) >= Number(condition.value)) return false;
          break;
        case "in":
          if (!(condition.value as unknown[]).includes(value)) return false;
          break;
        case "not_in":
          if ((condition.value as unknown[]).includes(value)) return false;
          break;
        case "contains":
          if (!String(value).includes(String(condition.value))) return false;
          break;
      }
    }

    return true;
  }

  private resolveRecipient(
    rule: NotificationRule,
    data: Record<string, unknown>,
  ): string | undefined {
    if (
      rule.recipientType === "specific_users" &&
      rule.specificUserIds?.length
    ) {
      return rule.specificUserIds[0];
    }
    // For assignee or manager types, try to get from data
    if (rule.recipientType === "assignee" && data.assigneeId) {
      return data.assigneeId as string;
    }
    if (rule.recipientType === "manager" && data.managerId) {
      return data.managerId as string;
    }
    return undefined;
  }

  // ============================================================================
  // PUSH SUBSCRIPTIONS & FCM TOKENS (delegated to PushNotificationService)
  // ============================================================================

  async subscribePush(
    userId: string,
    organizationId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent?: string,
  ): Promise<PushSubscription> {
    return this.pushNotificationService.subscribePush(
      userId,
      organizationId,
      endpoint,
      p256dh,
      auth,
      userAgent,
    );
  }

  async unsubscribePush(endpoint: string): Promise<void> {
    return this.pushNotificationService.unsubscribePush(endpoint);
  }

  async registerFcm(
    userId: string,
    organizationId: string,
    token: string,
    deviceType: DeviceType,
    deviceName?: string,
    deviceId?: string,
  ): Promise<FcmToken> {
    return this.pushNotificationService.registerFcm(
      userId,
      organizationId,
      token,
      deviceType,
      deviceName,
      deviceId,
    );
  }

  async unregisterFcm(token: string): Promise<void> {
    return this.pushNotificationService.unregisterFcm(token);
  }
}
