/**
 * Notification Entities for VendHub OS
 * Система уведомлений через все каналы
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Organization } from "../../organizations/entities/organization.entity";

// Re-export enums and constants for backward compatibility
export {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  EventCategory,
  ScheduleType,
  RecurrenceFrequency,
} from "./notification.enums";

export {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_CHANNEL_LABELS,
  NOTIFICATION_PRIORITY_LABELS,
} from "./notification.constants";

import {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  EventCategory,
  ScheduleType,
  RecurrenceFrequency,
} from "./notification.enums";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Контент уведомления
 */
interface NotificationContent {
  // Основной контент
  title: string;
  body: string;
  shortBody?: string; // Для SMS/Push

  // Локализация
  titleUz?: string;
  bodyUz?: string;

  // Форматирование
  htmlBody?: string; // HTML версия для email
  markdown?: string; // Markdown версия

  // Действия
  actionUrl?: string; // URL для перехода
  actionText?: string; // Текст кнопки
  secondaryActionUrl?: string;
  secondaryActionText?: string;

  // Медиа
  imageUrl?: string;
  iconUrl?: string;
  attachments?: {
    filename: string;
    url: string;
    mimeType: string;
  }[];
}

/**
 * Получатель уведомления
 */
interface NotificationRecipient {
  userId?: string;
  userName?: string;
  email?: string;
  phone?: string;
  telegramId?: string;
  telegramUsername?: string;
  deviceTokens?: string[];
  webhookUrl?: string;
  language?: "ru" | "uz" | "en";
}

/**
 * Данные доставки
 */
interface DeliveryData {
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  errorCode?: string;
  externalId?: string; // ID во внешней системе
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Настройки уведомления для пользователя (interface)
 * Planned for future use
 */

interface _IUserNotificationSettings {
  // Глобальные
  enabled: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string; // "08:00"
  timezone?: string;

  // По каналам
  channels: {
    [key in NotificationChannel]?: {
      enabled: boolean;
      address?: string; // email/phone/telegramId
    };
  };

  // По типам
  types: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
    };
  };
}

/**
 * Условие триггера
 */
interface TriggerCondition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "in"
    | "not_in";
  value: unknown;
}

/**
 * Настройки расписания
 */
interface ScheduleConfig {
  type: ScheduleType;
  scheduledAt?: Date; // Для scheduled
  recurrence?: {
    frequency: RecurrenceFrequency;
    interval?: number; // Каждые N периодов
    daysOfWeek?: number[]; // 0-6 (воскресенье-суббота)
    dayOfMonth?: number; // 1-31
    time?: string; // "09:00"
    timezone?: string;
  };
  expiresAt?: Date; // Когда перестать отправлять
}

/**
 * Шаблон переменных
 */
interface TemplateVariables {
  // Пользователь
  user_name?: string;
  user_email?: string;
  user_role?: string;

  // Организация
  org_name?: string;
  org_logo?: string;

  // Автомат
  machine_name?: string;
  machine_code?: string;
  machine_location?: string;
  machine_error?: string;

  // Задача
  task_title?: string;
  task_description?: string;
  task_deadline?: string;

  // Жалоба
  complaint_number?: string;
  complaint_category?: string;
  complaint_status?: string;

  // Продукт
  product_name?: string;
  product_quantity?: number;
  product_expiry?: string;

  // Финансы
  amount?: number;
  currency?: string;
  transaction_id?: string;

  // Даты
  date?: string;
  time?: string;
  datetime?: string;

  // Кастомные
  [key: string]: unknown;
}

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * Уведомление
 */
@Entity("notifications")
@Index(["organizationId", "status", "createdAt"])
@Index(["userId", "status"])
@Index(["type", "status"])
@Index(["scheduledAt", "status"])
export class Notification extends BaseEntity {
  // ===== Идентификация =====

  @Column({ length: 50, unique: true })
  notificationId: string; // "NTF-2024-XXXXX"

  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  @Column({
    type: "enum",
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({
    type: "enum",
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  // ===== Контент =====

  @Column({ type: "jsonb" })
  content: NotificationContent;

  // ===== Получатель =====

  @Column({ type: "uuid", nullable: true })
  userId: string; // Конкретный пользователь

  @Column({ type: "jsonb", nullable: true })
  recipient: NotificationRecipient;

  @Column({ type: "boolean", default: false })
  isBroadcast: boolean; // Массовая рассылка

  // ===== Каналы доставки =====

  @Column({
    type: "enum",
    enum: NotificationChannel,
    array: true,
    default: [NotificationChannel.IN_APP],
  })
  channels: NotificationChannel[];

  @Column({ type: "jsonb", default: [] })
  deliveryStatus: DeliveryData[];

  // ===== Расписание =====

  @Column({ type: "jsonb", nullable: true })
  schedule: ScheduleConfig;

  @Column({ type: "timestamp", nullable: true })
  scheduledAt: Date;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;

  // ===== Связанные сущности =====

  @Column({
    type: "enum",
    enum: EventCategory,
    nullable: true,
  })
  eventCategory: EventCategory;

  @Column({ type: "uuid", nullable: true })
  relatedEntityId: string;

  @Column({ length: 50, nullable: true })
  relatedEntityType: string;

  // ===== Шаблон =====

  @Column({ type: "uuid", nullable: true })
  templateId: string;

  @Column({ type: "jsonb", nullable: true })
  variables: TemplateVariables;

  // ===== Метаданные =====

  @Column({ type: "jsonb", default: {} })
  metadata: {
    source?: string; // Источник уведомления
    triggeredBy?: string; // Что вызвало
    batchId?: string; // ID пакетной отправки
    campaignId?: string; // ID кампании
    retryOf?: string; // Повтор какого уведомления
    [key: string]: unknown;
  };

  @Column({ type: "simple-array", nullable: true })
  tags: string[];

  // ===== Статистика =====

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: "timestamp", nullable: true })
  sentAt: Date;

  @Column({ type: "timestamp", nullable: true })
  deliveredAt: Date;

  @Column({ type: "timestamp", nullable: true })
  readAt: Date;

  @Column({ type: "timestamp", nullable: true })
  failedAt: Date;

  @Column({ type: "text", nullable: true })
  errorMessage: string;

  // ===== Multi-tenant =====

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Hooks =====

  @BeforeInsert()
  generateNotificationId() {
    if (!this.notificationId) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      this.notificationId = `NTF-${timestamp}-${random}`;
    }
  }
}

/**
 * Шаблон уведомления
 */
@Entity("notification_templates")
@Index(["organizationId", "type"])
@Index(["organizationId", "code"])
@Index(["isActive"])
export class NotificationTemplate extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  code: string; // "TASK_ASSIGNED", "MACHINE_OFFLINE"

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: NotificationType,
  })
  type: NotificationType;

  // ===== Контент =====

  // Русский (основной)
  @Column({ length: 255 })
  titleRu: string;

  @Column({ type: "text" })
  bodyRu: string;

  @Column({ type: "text", nullable: true })
  shortBodyRu: string;

  @Column({ type: "text", nullable: true })
  htmlBodyRu: string;

  // Узбекский
  @Column({ length: 255, nullable: true })
  titleUz: string;

  @Column({ type: "text", nullable: true })
  bodyUz: string;

  @Column({ type: "text", nullable: true })
  shortBodyUz: string;

  // Английский
  @Column({ length: 255, nullable: true })
  titleEn: string;

  @Column({ type: "text", nullable: true })
  bodyEn: string;

  // ===== Настройки =====

  @Column({
    type: "enum",
    enum: NotificationChannel,
    array: true,
    default: [NotificationChannel.IN_APP],
  })
  defaultChannels: NotificationChannel[];

  @Column({
    type: "enum",
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  defaultPriority: NotificationPriority;

  // Переменные
  @Column({ type: "jsonb", default: [] })
  availableVariables: {
    name: string;
    description: string;
    required: boolean;
    defaultValue?: unknown;
  }[];

  // Действия
  @Column({ type: "text", nullable: true })
  actionUrl: string;

  @Column({ length: 100, nullable: true })
  actionTextRu: string;

  @Column({ length: 100, nullable: true })
  actionTextUz: string;

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSystem: boolean; // Системный шаблон (нельзя удалить)

  // ===== Статистика =====

  @Column({ default: 0 })
  usageCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date;
}

/**
 * Настройки уведомлений пользователя
 */
@Entity("user_notification_settings")
@Index(["userId"], { unique: true })
@Index(["organizationId"])
export class UserNotificationSettings extends BaseEntity {
  @Column({ type: "uuid", unique: true })
  userId: string;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Глобальные настройки =====

  @Column({ default: true })
  enabled: boolean;

  @Column({ length: 5, nullable: true })
  quietHoursStart: string; // "22:00"

  @Column({ length: 5, nullable: true })
  quietHoursEnd: string; // "08:00"

  @Column({ length: 50, default: "Asia/Tashkent" })
  timezone: string;

  @Column({ length: 5, default: "ru" })
  language: string;

  // ===== Каналы =====

  @Column({ default: true })
  pushEnabled: boolean;

  @Column({ default: true })
  emailEnabled: boolean;

  @Column({ default: false })
  smsEnabled: boolean;

  @Column({ default: true })
  telegramEnabled: boolean;

  @Column({ default: true })
  inAppEnabled: boolean;

  // ===== Адреса доставки =====

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 50, nullable: true })
  telegramId: string;

  @Column({ type: "jsonb", default: [] })
  deviceTokens: {
    token: string;
    platform: "ios" | "android" | "web";
    deviceName?: string;
    lastUsedAt?: Date;
  }[];

  // ===== Настройки по типам =====

  @Column({ type: "jsonb", default: {} })
  typeSettings: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels?: NotificationChannel[];
      minPriority?: NotificationPriority;
    };
  };

  // ===== Дайджест =====

  @Column({ default: false })
  digestEnabled: boolean;

  @Column({
    type: "enum",
    enum: ["daily", "weekly", "none"],
    default: "none",
  })
  digestFrequency: "daily" | "weekly" | "none";

  @Column({ length: 5, nullable: true })
  digestTime: string; // "09:00"

  @Column({ type: "enum", enum: NotificationChannel, array: true, default: [] })
  digestChannels: NotificationChannel[];
}

/**
 * Правило автоматических уведомлений
 */
@Entity("notification_rules")
@Index(["organizationId", "isActive"])
@Index(["eventCategory", "isActive"])
export class NotificationRule extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // ===== Триггер =====

  @Column({
    type: "enum",
    enum: EventCategory,
  })
  eventCategory: EventCategory;

  @Column({ length: 100 })
  eventType: string; // "machine.offline", "task.created"

  @Column({ type: "jsonb", default: [] })
  conditions: TriggerCondition[];

  @Column({ default: false })
  allConditionsMustMatch: boolean; // AND vs OR

  // ===== Действия =====

  @Column({ type: "uuid", nullable: true })
  templateId: string;

  @Column({
    type: "enum",
    enum: NotificationType,
  })
  notificationType: NotificationType;

  @Column({ type: "enum", enum: NotificationChannel, array: true })
  channels: NotificationChannel[];

  @Column({
    type: "enum",
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  // ===== Получатели =====

  @Column({
    type: "enum",
    enum: ["specific_users", "role", "assignee", "manager", "all"],
    default: "assignee",
  })
  recipientType: "specific_users" | "role" | "assignee" | "manager" | "all";

  @Column({ type: "uuid", array: true, default: [] })
  specificUserIds: string[];

  @Column({ type: "simple-array", nullable: true })
  roles: string[]; // ["operator", "manager"]

  // ===== Дополнительно =====

  @Column({ type: "int", default: 0 })
  delayMinutes: number; // Задержка перед отправкой

  @Column({ default: false })
  groupSimilar: boolean; // Группировать похожие

  @Column({ type: "int", default: 0 })
  groupWindowMinutes: number; // Окно группировки

  @Column({ type: "int", nullable: true })
  cooldownMinutes: number; // Не отправлять чаще чем

  // ===== Расписание =====

  @Column({ type: "jsonb", nullable: true })
  schedule: {
    activeDays?: number[]; // 0-6
    activeHoursStart?: string;
    activeHoursEnd?: string;
    timezone?: string;
  };

  // ===== Статистика =====

  @Column({ default: 0 })
  triggerCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastTriggeredAt: Date;

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder: number; // Порядок выполнения
}

/**
 * Очередь отправки уведомлений
 */
@Entity("notification_queue")
@Index(["status", "scheduledAt"])
@Index(["channel", "status"])
@Index(["retryCount", "status"])
export class NotificationQueue extends BaseEntity {
  @Column()
  organizationId: string;

  @Column({ type: "uuid" })
  notificationId: string;

  @ManyToOne(() => Notification, { onDelete: "SET NULL" })
  @JoinColumn({ name: "notification_id" })
  notification: Notification;

  @Column({
    type: "enum",
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({
    type: "enum",
    enum: NotificationStatus,
    default: NotificationStatus.QUEUED,
  })
  status: NotificationStatus;

  // ===== Получатель =====

  @Column({ type: "uuid", nullable: true })
  userId: string;

  @Column({ type: "jsonb" })
  recipient: {
    email?: string;
    phone?: string;
    telegramId?: string;
    deviceToken?: string;
    webhookUrl?: string;
  };

  // ===== Контент =====

  @Column({ type: "jsonb" })
  content: {
    title: string;
    body: string;
    htmlBody?: string;
    actionUrl?: string;
    attachments?: unknown[];
  };

  // ===== Расписание =====

  @Column({ type: "timestamp" })
  scheduledAt: Date;

  @Column({ type: "timestamp", nullable: true })
  processedAt: Date;

  // ===== Повторы =====

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: "int", default: 3 })
  maxRetries: number;

  @Column({ type: "timestamp", nullable: true })
  nextRetryAt: Date;

  @Column({ type: "text", nullable: true })
  lastError: string;

  // ===== Результат =====

  @Column({ type: "text", nullable: true })
  externalId: string; // ID во внешней системе

  @Column({ type: "jsonb", nullable: true })
  response: Record<string, unknown>; // Ответ от провайдера
}

/**
 * Лог отправки уведомлений
 */
@Entity("notification_logs")
@Index(["organizationId", "createdAt"])
@Index(["notificationId"])
@Index(["channel", "status"])
export class NotificationLog extends BaseEntity {
  @Column()
  organizationId: string;

  @Column({ type: "uuid" })
  notificationId: string;

  @Column({ type: "uuid", nullable: true })
  queueId: string;

  @Column({
    type: "enum",
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({
    type: "enum",
    enum: NotificationStatus,
  })
  status: NotificationStatus;

  // ===== Данные =====

  @Column({ type: "uuid", nullable: true })
  userId: string;

  @Column({ length: 255, nullable: true })
  recipient: string; // email/phone/telegramId

  // ===== Детали =====

  @Column({ type: "text", nullable: true })
  externalId: string;

  @Column({ type: "text", nullable: true })
  errorMessage: string;

  @Column({ length: 50, nullable: true })
  errorCode: string;

  @Column({ type: "jsonb", nullable: true })
  providerResponse: Record<string, unknown>;

  // ===== Метрики =====

  @Column({ type: "int", nullable: true })
  durationMs: number; // Время отправки
}

/**
 * Массовая рассылка
 */
@Entity("notification_campaigns")
@Index(["organizationId", "status"])
@Index(["scheduledAt", "status"])
export class NotificationCampaign extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // ===== Контент =====

  @Column({ type: "uuid", nullable: true })
  templateId: string;

  @Column({ type: "jsonb" })
  content: NotificationContent;

  @Column({ type: "jsonb", nullable: true })
  variables: TemplateVariables;

  // ===== Каналы =====

  @Column({ type: "enum", enum: NotificationChannel, array: true })
  channels: NotificationChannel[];

  // ===== Аудитория =====

  @Column({
    type: "enum",
    enum: ["all", "roles", "users", "filter"],
    default: "all",
  })
  audienceType: "all" | "roles" | "users" | "filter";

  @Column({ type: "simple-array", nullable: true })
  roles: string[];

  @Column({ type: "uuid", array: true, default: [] })
  userIds: string[];

  @Column({ type: "jsonb", nullable: true })
  filter: {
    conditions: TriggerCondition[];
  };

  @Column({ default: 0 })
  estimatedRecipients: number;

  // ===== Расписание =====

  @Column({ type: "timestamp", nullable: true })
  scheduledAt: Date;

  @Column({ type: "timestamp", nullable: true })
  startedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date;

  // ===== Статус =====

  @Column({
    type: "enum",
    enum: [
      "draft",
      "scheduled",
      "in_progress",
      "completed",
      "paused",
      "cancelled",
    ],
    default: "draft",
  })
  status:
    | "draft"
    | "scheduled"
    | "in_progress"
    | "completed"
    | "paused"
    | "cancelled";

  // ===== Статистика =====

  @Column({ default: 0 })
  totalSent: number;

  @Column({ default: 0 })
  totalDelivered: number;

  @Column({ default: 0 })
  totalRead: number;

  @Column({ default: 0 })
  totalFailed: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  deliveryRate: number; // % доставленных

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  readRate: number; // % прочитанных
}
