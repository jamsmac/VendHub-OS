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

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Канал доставки уведомления
 */
export enum NotificationChannel {
  PUSH = "push", // Push-уведомление (мобильное)
  EMAIL = "email", // Email
  SMS = "sms", // SMS
  TELEGRAM = "telegram", // Telegram
  WHATSAPP = "whatsapp", // WhatsApp
  IN_APP = "in_app", // В приложении
  WEBHOOK = "webhook", // Webhook
  SLACK = "slack", // Slack
}

/**
 * Тип уведомления
 */
export enum NotificationType {
  // Системные
  SYSTEM = "system", // Системное уведомление
  ANNOUNCEMENT = "announcement", // Объявление
  MAINTENANCE = "maintenance", // Техническое обслуживание

  // Автоматы
  MACHINE_ALERT = "machine_alert", // Алерт автомата
  MACHINE_ERROR = "machine_error", // Ошибка автомата
  MACHINE_OFFLINE = "machine_offline", // Автомат оффлайн
  MACHINE_LOW_STOCK = "machine_low_stock", // Низкий запас
  MACHINE_OUT_OF_STOCK = "machine_out_of_stock", // Товар закончился
  MACHINE_TEMPERATURE = "machine_temperature", // Температура

  // Задачи
  TASK_ASSIGNED = "task_assigned", // Задача назначена
  TASK_UPDATED = "task_updated", // Задача обновлена
  TASK_COMPLETED = "task_completed", // Задача завершена
  TASK_OVERDUE = "task_overdue", // Задача просрочена
  TASK_REMINDER = "task_reminder", // Напоминание о задаче

  // Жалобы
  COMPLAINT_NEW = "complaint_new", // Новая жалоба
  COMPLAINT_ASSIGNED = "complaint_assigned", // Жалоба назначена
  COMPLAINT_UPDATED = "complaint_updated", // Жалоба обновлена
  COMPLAINT_RESOLVED = "complaint_resolved", // Жалоба решена
  COMPLAINT_SLA_WARNING = "complaint_sla_warning", // SLA предупреждение

  // Инвентарь
  INVENTORY_LOW = "inventory_low", // Низкий запас на складе
  INVENTORY_EXPIRING = "inventory_expiring", // Товар скоро истечет
  INVENTORY_TRANSFER = "inventory_transfer", // Перемещение товара

  // Финансы
  TRANSACTION_ALERT = "transaction_alert", // Алерт транзакции
  COLLECTION_DUE = "collection_due", // Пора инкассировать
  COLLECTION_COMPLETED = "collection_completed", // Инкассация завершена
  PAYMENT_RECEIVED = "payment_received", // Платеж получен
  REVENUE_MILESTONE = "revenue_milestone", // Достижение по выручке

  // Пользователи
  USER_LOGIN = "user_login", // Вход пользователя
  USER_INVITED = "user_invited", // Пользователь приглашен
  PASSWORD_CHANGED = "password_changed", // Пароль изменен
  ROLE_CHANGED = "role_changed", // Роль изменена

  // Контракты
  CONTRACT_EXPIRING = "contract_expiring", // Контракт истекает
  CONTRACT_EXPIRED = "contract_expired", // Контракт истек
  CONTRACT_PAYMENT_DUE = "contract_payment_due", // Срок оплаты контракта

  // Отчеты
  REPORT_READY = "report_ready", // Отчет готов
  REPORT_SCHEDULED = "report_scheduled", // Отчет по расписанию

  // Другое
  CUSTOM = "custom", // Кастомное уведомление
}

/**
 * Приоритет уведомления
 */
export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

/**
 * Статус уведомления
 */
export enum NotificationStatus {
  PENDING = "pending", // Ожидает отправки
  QUEUED = "queued", // В очереди
  SENDING = "sending", // Отправляется
  SENT = "sent", // Отправлено
  DELIVERED = "delivered", // Доставлено
  READ = "read", // Прочитано
  FAILED = "failed", // Ошибка отправки
  CANCELLED = "cancelled", // Отменено
  EXPIRED = "expired", // Истекло
}

/**
 * Категория события для триггера
 */
export enum EventCategory {
  MACHINE = "machine",
  TASK = "task",
  COMPLAINT = "complaint",
  INVENTORY = "inventory",
  TRANSACTION = "transaction",
  USER = "user",
  CONTRACT = "contract",
  SYSTEM = "system",
  REPORT = "report",
}

/**
 * Тип расписания
 */
export enum ScheduleType {
  IMMEDIATE = "immediate", // Немедленно
  SCHEDULED = "scheduled", // По расписанию
  RECURRING = "recurring", // Повторяющееся
  TRIGGERED = "triggered", // По триггеру
}

/**
 * Частота повторения
 */
export enum RecurrenceFrequency {
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  CUSTOM = "custom",
}

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValue?: any;
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

  @ManyToOne(() => Notification, { onDelete: "CASCADE" })
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachments?: any[];
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

// ============================================================================
// HELPER CONSTANTS
// ============================================================================

/**
 * Labels для типов уведомлений
 */
export const NOTIFICATION_TYPE_LABELS: Record<
  NotificationType,
  { ru: string; uz: string; icon: string }
> = {
  [NotificationType.SYSTEM]: { ru: "Системное", uz: "Tizim", icon: "⚙️" },
  [NotificationType.ANNOUNCEMENT]: {
    ru: "Объявление",
    uz: "E'lon",
    icon: "📢",
  },
  [NotificationType.MAINTENANCE]: {
    ru: "Техобслуживание",
    uz: "Texnik xizmat",
    icon: "🔧",
  },
  [NotificationType.MACHINE_ALERT]: {
    ru: "Алерт автомата",
    uz: "Avtomat ogohi",
    icon: "🤖",
  },
  [NotificationType.MACHINE_ERROR]: {
    ru: "Ошибка автомата",
    uz: "Avtomat xatosi",
    icon: "❌",
  },
  [NotificationType.MACHINE_OFFLINE]: {
    ru: "Автомат оффлайн",
    uz: "Avtomat oflayn",
    icon: "📴",
  },
  [NotificationType.MACHINE_LOW_STOCK]: {
    ru: "Низкий запас",
    uz: "Kam zaxira",
    icon: "📉",
  },
  [NotificationType.MACHINE_OUT_OF_STOCK]: {
    ru: "Нет в наличии",
    uz: "Tugadi",
    icon: "🚫",
  },
  [NotificationType.MACHINE_TEMPERATURE]: {
    ru: "Температура",
    uz: "Harorat",
    icon: "🌡️",
  },
  [NotificationType.TASK_ASSIGNED]: {
    ru: "Задача назначена",
    uz: "Vazifa tayinlandi",
    icon: "📋",
  },
  [NotificationType.TASK_UPDATED]: {
    ru: "Задача обновлена",
    uz: "Vazifa yangilandi",
    icon: "✏️",
  },
  [NotificationType.TASK_COMPLETED]: {
    ru: "Задача завершена",
    uz: "Vazifa tugadi",
    icon: "✅",
  },
  [NotificationType.TASK_OVERDUE]: {
    ru: "Задача просрочена",
    uz: "Vazifa kechikdi",
    icon: "⏰",
  },
  [NotificationType.TASK_REMINDER]: {
    ru: "Напоминание",
    uz: "Eslatma",
    icon: "🔔",
  },
  [NotificationType.COMPLAINT_NEW]: {
    ru: "Новая жалоба",
    uz: "Yangi shikoyat",
    icon: "📨",
  },
  [NotificationType.COMPLAINT_ASSIGNED]: {
    ru: "Жалоба назначена",
    uz: "Shikoyat tayinlandi",
    icon: "👤",
  },
  [NotificationType.COMPLAINT_UPDATED]: {
    ru: "Жалоба обновлена",
    uz: "Shikoyat yangilandi",
    icon: "🔄",
  },
  [NotificationType.COMPLAINT_RESOLVED]: {
    ru: "Жалоба решена",
    uz: "Shikoyat hal qilindi",
    icon: "✅",
  },
  [NotificationType.COMPLAINT_SLA_WARNING]: {
    ru: "SLA предупреждение",
    uz: "SLA ogohlantirish",
    icon: "⚠️",
  },
  [NotificationType.INVENTORY_LOW]: {
    ru: "Низкий запас",
    uz: "Kam zaxira",
    icon: "📦",
  },
  [NotificationType.INVENTORY_EXPIRING]: {
    ru: "Срок истекает",
    uz: "Muddat tugayapti",
    icon: "⏳",
  },
  [NotificationType.INVENTORY_TRANSFER]: {
    ru: "Перемещение",
    uz: "Ko'chirish",
    icon: "🔄",
  },
  [NotificationType.TRANSACTION_ALERT]: {
    ru: "Транзакция",
    uz: "Tranzaksiya",
    icon: "💳",
  },
  [NotificationType.COLLECTION_DUE]: {
    ru: "Пора инкассировать",
    uz: "Inkassatsiya vaqti",
    icon: "💰",
  },
  [NotificationType.COLLECTION_COMPLETED]: {
    ru: "Инкассация",
    uz: "Inkassatsiya",
    icon: "✅",
  },
  [NotificationType.PAYMENT_RECEIVED]: {
    ru: "Платеж получен",
    uz: "To'lov qabul qilindi",
    icon: "💵",
  },
  [NotificationType.REVENUE_MILESTONE]: {
    ru: "Достижение",
    uz: "Muvaffaqiyat",
    icon: "🏆",
  },
  [NotificationType.USER_LOGIN]: { ru: "Вход", uz: "Kirish", icon: "🔐" },
  [NotificationType.USER_INVITED]: {
    ru: "Приглашение",
    uz: "Taklif",
    icon: "✉️",
  },
  [NotificationType.PASSWORD_CHANGED]: {
    ru: "Пароль изменен",
    uz: "Parol o'zgardi",
    icon: "🔑",
  },
  [NotificationType.ROLE_CHANGED]: {
    ru: "Роль изменена",
    uz: "Rol o'zgardi",
    icon: "👥",
  },
  [NotificationType.CONTRACT_EXPIRING]: {
    ru: "Контракт истекает",
    uz: "Shartnoma tugayapti",
    icon: "📄",
  },
  [NotificationType.CONTRACT_EXPIRED]: {
    ru: "Контракт истек",
    uz: "Shartnoma tugadi",
    icon: "📄",
  },
  [NotificationType.CONTRACT_PAYMENT_DUE]: {
    ru: "Срок оплаты",
    uz: "To'lov muddati",
    icon: "💳",
  },
  [NotificationType.REPORT_READY]: {
    ru: "Отчет готов",
    uz: "Hisobot tayyor",
    icon: "📊",
  },
  [NotificationType.REPORT_SCHEDULED]: {
    ru: "Запланированный отчет",
    uz: "Rejalashtirilgan hisobot",
    icon: "📅",
  },
  [NotificationType.CUSTOM]: { ru: "Кастомное", uz: "Maxsus", icon: "📝" },
};

/**
 * Labels для каналов
 */
export const NOTIFICATION_CHANNEL_LABELS: Record<
  NotificationChannel,
  { ru: string; uz: string; icon: string }
> = {
  [NotificationChannel.PUSH]: {
    ru: "Push-уведомление",
    uz: "Push-xabar",
    icon: "📱",
  },
  [NotificationChannel.EMAIL]: { ru: "Email", uz: "Email", icon: "📧" },
  [NotificationChannel.SMS]: { ru: "SMS", uz: "SMS", icon: "💬" },
  [NotificationChannel.TELEGRAM]: {
    ru: "Telegram",
    uz: "Telegram",
    icon: "✈️",
  },
  [NotificationChannel.WHATSAPP]: {
    ru: "WhatsApp",
    uz: "WhatsApp",
    icon: "💚",
  },
  [NotificationChannel.IN_APP]: {
    ru: "В приложении",
    uz: "Ilovada",
    icon: "📲",
  },
  [NotificationChannel.WEBHOOK]: { ru: "Webhook", uz: "Webhook", icon: "🔗" },
  [NotificationChannel.SLACK]: { ru: "Slack", uz: "Slack", icon: "💼" },
};

/**
 * Labels для приоритетов
 */
export const NOTIFICATION_PRIORITY_LABELS: Record<
  NotificationPriority,
  { ru: string; uz: string; color: string }
> = {
  [NotificationPriority.LOW]: { ru: "Низкий", uz: "Past", color: "#6B7280" },
  [NotificationPriority.NORMAL]: {
    ru: "Обычный",
    uz: "Oddiy",
    color: "#3B82F6",
  },
  [NotificationPriority.HIGH]: {
    ru: "Высокий",
    uz: "Yuqori",
    color: "#F59E0B",
  },
  [NotificationPriority.URGENT]: {
    ru: "Срочный",
    uz: "Shoshilinch",
    color: "#EF4444",
  },
};
