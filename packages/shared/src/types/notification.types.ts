/**
 * Notification Types for VendHub OS
 * Multi-channel notification system
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum NotificationChannel {
  IN_APP = "in_app",
  PUSH = "push",
  EMAIL = "email",
  SMS = "sms",
  TELEGRAM = "telegram",
  WHATSAPP = "whatsapp",
  WEBHOOK = "webhook",
}

export enum NotificationStatus {
  PENDING = "pending",
  QUEUED = "queued",
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

export enum NotificationType {
  // System
  SYSTEM = "system",
  ANNOUNCEMENT = "announcement",
  MAINTENANCE = "maintenance",

  // Machine
  MACHINE_ALERT = "machine_alert",
  MACHINE_ERROR = "machine_error",
  MACHINE_OFFLINE = "machine_offline",
  MACHINE_LOW_STOCK = "machine_low_stock",
  MACHINE_OUT_OF_STOCK = "machine_out_of_stock",
  MACHINE_TEMPERATURE = "machine_temperature",

  // Tasks
  TASK_ASSIGNED = "task_assigned",
  TASK_UPDATED = "task_updated",
  TASK_COMPLETED = "task_completed",
  TASK_OVERDUE = "task_overdue",
  TASK_REMINDER = "task_reminder",

  // Complaints
  COMPLAINT_NEW = "complaint_new",
  COMPLAINT_ASSIGNED = "complaint_assigned",
  COMPLAINT_UPDATED = "complaint_updated",
  COMPLAINT_RESOLVED = "complaint_resolved",
  COMPLAINT_SLA_WARNING = "complaint_sla_warning",

  // Inventory
  INVENTORY_LOW = "inventory_low",
  INVENTORY_EXPIRING = "inventory_expiring",
  INVENTORY_TRANSFER = "inventory_transfer",

  // Financial
  TRANSACTION_ALERT = "transaction_alert",
  COLLECTION_DUE = "collection_due",
  COLLECTION_COMPLETED = "collection_completed",
  PAYMENT_RECEIVED = "payment_received",
  REVENUE_MILESTONE = "revenue_milestone",

  // User
  USER_LOGIN = "user_login",
  USER_INVITED = "user_invited",
  PASSWORD_CHANGED = "password_changed",
  ROLE_CHANGED = "role_changed",

  // Contracts
  CONTRACT_EXPIRING = "contract_expiring",
  CONTRACT_EXPIRED = "contract_expired",
  CONTRACT_PAYMENT_DUE = "contract_payment_due",

  // Reports
  REPORT_READY = "report_ready",
  REPORT_SCHEDULED = "report_scheduled",

  // Custom
  CUSTOM = "custom",
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface INotification {
  id: string;
  organizationId: string;
  userId?: string;
  type: NotificationType;
  priority: NotificationPriority;

  // Content
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;

  // Delivery
  channels: NotificationChannel[];
  status: NotificationStatus;

  // Status tracking per channel
  channelStatuses?: Record<
    NotificationChannel,
    {
      status: NotificationStatus;
      sentAt?: Date;
      deliveredAt?: Date;
      errorMessage?: string;
    }
  >;

  // Scheduling
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
  expiresAt?: Date;

  // Grouping
  groupKey?: string;
  batchId?: string;

  createdAt: Date;
}

export interface INotificationTemplate {
  id: string;
  organizationId?: string;
  code: string;
  name: string;
  type: NotificationType;

  // Localized content
  titleRu: string;
  titleUz: string;
  bodyRu: string;
  bodyUz: string;

  // Template variables (e.g., {{machine_name}}, {{task_title}})
  variables?: string[];

  // Delivery settings
  defaultChannels: NotificationChannel[];
  defaultPriority: NotificationPriority;

  // Conditions
  conditions?: INotificationCondition[];

  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
}

export interface INotificationCondition {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "in"
    | "nin"
    | "contains";
  value: unknown;
}

export interface IUserNotificationSettings {
  id: string;
  userId: string;
  organizationId: string;

  // Global settings
  globalEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string; // HH:mm

  // Channel preferences
  channelSettings: Record<
    NotificationChannel,
    {
      enabled: boolean;
      address?: string; // email, phone, telegram chat id
    }
  >;

  // Type preferences (which types to receive)
  typeSettings: Record<
    NotificationType,
    {
      enabled: boolean;
      channels?: NotificationChannel[];
    }
  >;

  // Language preference
  language: "ru" | "uz" | "en";

  updatedAt: Date;
}

export interface INotificationRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;

  // Trigger
  triggerType: NotificationType;
  triggerConditions?: INotificationCondition[];

  // Actions
  templateId?: string;
  customTitle?: string;
  customBody?: string;
  channels: NotificationChannel[];
  priority: NotificationPriority;

  // Recipients
  recipientType: "user" | "role" | "dynamic";
  recipientIds?: string[];
  recipientRoles?: string[];
  recipientExpression?: string;

  // Scheduling
  delayMinutes?: number;
  throttleMinutes?: number;

  isActive: boolean;
  createdAt: Date;
}

export interface INotificationCampaign {
  id: string;
  organizationId: string;
  name: string;
  description?: string;

  // Content
  templateId?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;

  // Targeting
  targetType: "all" | "role" | "custom" | "filter";
  targetRoles?: string[];
  targetUserIds?: string[];
  targetFilter?: Record<string, unknown>;

  // Delivery
  channels: NotificationChannel[];
  scheduledFor?: Date;
  status: "draft" | "scheduled" | "sending" | "completed" | "cancelled";

  // Stats
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;

  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// CREATE DTOs
// ============================================================================

export interface INotificationCreate {
  organizationId: string;
  userId?: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;
  channels: NotificationChannel[];
  scheduledFor?: Date;
  expiresAt?: Date;
  groupKey?: string;
}

export interface ISendNotificationDto {
  templateCode: string;
  recipientUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientTelegramId?: string;
  variables: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  scheduledFor?: Date;
}

// ============================================================================
// LABELS
// ============================================================================

export const NOTIFICATION_CHANNEL_LABELS: Record<
  NotificationChannel,
  { ru: string; uz: string }
> = {
  [NotificationChannel.IN_APP]: { ru: "В приложении", uz: "Ilovada" },
  [NotificationChannel.PUSH]: { ru: "Push-уведомление", uz: "Push-xabar" },
  [NotificationChannel.EMAIL]: { ru: "Email", uz: "Email" },
  [NotificationChannel.SMS]: { ru: "SMS", uz: "SMS" },
  [NotificationChannel.TELEGRAM]: { ru: "Telegram", uz: "Telegram" },
  [NotificationChannel.WHATSAPP]: { ru: "WhatsApp", uz: "WhatsApp" },
  [NotificationChannel.WEBHOOK]: { ru: "Webhook", uz: "Webhook" },
};

export const NOTIFICATION_STATUS_LABELS: Record<
  NotificationStatus,
  { ru: string; uz: string }
> = {
  [NotificationStatus.PENDING]: { ru: "Ожидает", uz: "Kutmoqda" },
  [NotificationStatus.QUEUED]: { ru: "В очереди", uz: "Navbatda" },
  [NotificationStatus.SENT]: { ru: "Отправлено", uz: "Yuborildi" },
  [NotificationStatus.DELIVERED]: { ru: "Доставлено", uz: "Yetkazildi" },
  [NotificationStatus.READ]: { ru: "Прочитано", uz: "O'qildi" },
  [NotificationStatus.FAILED]: { ru: "Ошибка", uz: "Xato" },
  [NotificationStatus.CANCELLED]: { ru: "Отменено", uz: "Bekor qilindi" },
};

export const NOTIFICATION_PRIORITY_LABELS: Record<
  NotificationPriority,
  { ru: string; uz: string }
> = {
  [NotificationPriority.LOW]: { ru: "Низкий", uz: "Past" },
  [NotificationPriority.NORMAL]: { ru: "Обычный", uz: "Oddiy" },
  [NotificationPriority.HIGH]: { ru: "Высокий", uz: "Yuqori" },
  [NotificationPriority.URGENT]: { ru: "Срочный", uz: "Shoshilinch" },
};

export const NOTIFICATION_TYPE_LABELS: Partial<
  Record<NotificationType, { ru: string; uz: string }>
> = {
  [NotificationType.SYSTEM]: { ru: "Системное", uz: "Tizim" },
  [NotificationType.ANNOUNCEMENT]: { ru: "Объявление", uz: "E'lon" },
  [NotificationType.MAINTENANCE]: { ru: "Обслуживание", uz: "Texnik xizmat" },
  [NotificationType.MACHINE_ALERT]: {
    ru: "Оповещение автомата",
    uz: "Avtomat ogohlantirishi",
  },
  [NotificationType.MACHINE_ERROR]: {
    ru: "Ошибка автомата",
    uz: "Avtomat xatosi",
  },
  [NotificationType.MACHINE_OFFLINE]: {
    ru: "Автомат оффлайн",
    uz: "Avtomat oflayn",
  },
  [NotificationType.MACHINE_LOW_STOCK]: {
    ru: "Низкий запас",
    uz: "Kam zaxira",
  },
  [NotificationType.MACHINE_OUT_OF_STOCK]: {
    ru: "Нет товара",
    uz: "Mahsulot yo'q",
  },
  [NotificationType.MACHINE_TEMPERATURE]: { ru: "Температура", uz: "Harorat" },
  [NotificationType.TASK_ASSIGNED]: {
    ru: "Задача назначена",
    uz: "Vazifa tayinlandi",
  },
  [NotificationType.TASK_UPDATED]: {
    ru: "Задача обновлена",
    uz: "Vazifa yangilandi",
  },
  [NotificationType.TASK_COMPLETED]: {
    ru: "Задача завершена",
    uz: "Vazifa yakunlandi",
  },
  [NotificationType.TASK_OVERDUE]: {
    ru: "Просроченная задача",
    uz: "Muddati o'tgan vazifa",
  },
  [NotificationType.TASK_REMINDER]: { ru: "Напоминание", uz: "Eslatma" },
  [NotificationType.COMPLAINT_NEW]: {
    ru: "Новая жалоба",
    uz: "Yangi shikoyat",
  },
  [NotificationType.COMPLAINT_ASSIGNED]: {
    ru: "Жалоба назначена",
    uz: "Shikoyat tayinlandi",
  },
  [NotificationType.COMPLAINT_UPDATED]: {
    ru: "Жалоба обновлена",
    uz: "Shikoyat yangilandi",
  },
  [NotificationType.COMPLAINT_RESOLVED]: {
    ru: "Жалоба решена",
    uz: "Shikoyat hal qilindi",
  },
  [NotificationType.COMPLAINT_SLA_WARNING]: {
    ru: "Предупреждение SLA",
    uz: "SLA ogohlantirishi",
  },
  [NotificationType.INVENTORY_LOW]: { ru: "Низкий запас", uz: "Kam zaxira" },
  [NotificationType.INVENTORY_EXPIRING]: {
    ru: "Истекает срок",
    uz: "Muddati tugayapti",
  },
  [NotificationType.INVENTORY_TRANSFER]: {
    ru: "Перемещение товара",
    uz: "Mahsulot ko'chirish",
  },
  [NotificationType.TRANSACTION_ALERT]: { ru: "Оповещение", uz: "Tranzaksiya" },
  [NotificationType.COLLECTION_DUE]: { ru: "Инкассация", uz: "Inkassatsiya" },
  [NotificationType.COLLECTION_COMPLETED]: {
    ru: "Инкассация завершена",
    uz: "Inkassatsiya yakunlandi",
  },
  [NotificationType.PAYMENT_RECEIVED]: {
    ru: "Платёж получен",
    uz: "To'lov qabul qilindi",
  },
  [NotificationType.REVENUE_MILESTONE]: { ru: "Выручка", uz: "Daromad" },
  [NotificationType.USER_LOGIN]: { ru: "Вход в систему", uz: "Tizimga kirish" },
  [NotificationType.USER_INVITED]: { ru: "Приглашение", uz: "Taklif" },
  [NotificationType.PASSWORD_CHANGED]: {
    ru: "Пароль изменён",
    uz: "Parol o'zgartirildi",
  },
  [NotificationType.ROLE_CHANGED]: {
    ru: "Роль изменена",
    uz: "Rol o'zgartirildi",
  },
  [NotificationType.CONTRACT_EXPIRING]: {
    ru: "Контракт истекает",
    uz: "Shartnoma tugayapti",
  },
  [NotificationType.CONTRACT_EXPIRED]: {
    ru: "Контракт истёк",
    uz: "Shartnoma tugadi",
  },
  [NotificationType.CONTRACT_PAYMENT_DUE]: {
    ru: "Оплата контракта",
    uz: "Shartnoma to'lovi",
  },
  [NotificationType.REPORT_READY]: { ru: "Отчёт готов", uz: "Hisobot tayyor" },
  [NotificationType.REPORT_SCHEDULED]: {
    ru: "Отчёт запланирован",
    uz: "Hisobot rejalashtirildi",
  },
  [NotificationType.CUSTOM]: { ru: "Пользовательское", uz: "Maxsus" },
};

// ============================================================================
// ICONS
// ============================================================================

export const NOTIFICATION_CHANNEL_ICONS: Record<NotificationChannel, string> = {
  [NotificationChannel.IN_APP]: "📱",
  [NotificationChannel.PUSH]: "🔔",
  [NotificationChannel.EMAIL]: "📧",
  [NotificationChannel.SMS]: "📲",
  [NotificationChannel.TELEGRAM]: "✈️",
  [NotificationChannel.WHATSAPP]: "💬",
  [NotificationChannel.WEBHOOK]: "🔗",
};

export const NOTIFICATION_TYPE_ICONS: Partial<
  Record<NotificationType, string>
> = {
  [NotificationType.SYSTEM]: "⚙️",
  [NotificationType.ANNOUNCEMENT]: "📢",
  [NotificationType.MAINTENANCE]: "🔧",
  [NotificationType.MACHINE_ALERT]: "⚠️",
  [NotificationType.MACHINE_ERROR]: "❌",
  [NotificationType.MACHINE_OFFLINE]: "🔴",
  [NotificationType.MACHINE_LOW_STOCK]: "📦",
  [NotificationType.MACHINE_OUT_OF_STOCK]: "🚫",
  [NotificationType.MACHINE_TEMPERATURE]: "🌡️",
  [NotificationType.TASK_ASSIGNED]: "📋",
  [NotificationType.TASK_UPDATED]: "✏️",
  [NotificationType.TASK_COMPLETED]: "✅",
  [NotificationType.TASK_OVERDUE]: "⏰",
  [NotificationType.TASK_REMINDER]: "🔔",
  [NotificationType.COMPLAINT_NEW]: "🆕",
  [NotificationType.COMPLAINT_ASSIGNED]: "👤",
  [NotificationType.COMPLAINT_UPDATED]: "📝",
  [NotificationType.COMPLAINT_RESOLVED]: "✅",
  [NotificationType.COMPLAINT_SLA_WARNING]: "⚠️",
  [NotificationType.INVENTORY_LOW]: "📉",
  [NotificationType.INVENTORY_EXPIRING]: "⏳",
  [NotificationType.INVENTORY_TRANSFER]: "📥",
  [NotificationType.TRANSACTION_ALERT]: "💰",
  [NotificationType.COLLECTION_DUE]: "💵",
  [NotificationType.COLLECTION_COMPLETED]: "✅",
  [NotificationType.PAYMENT_RECEIVED]: "💳",
  [NotificationType.REVENUE_MILESTONE]: "🎯",
  [NotificationType.USER_LOGIN]: "🔑",
  [NotificationType.USER_INVITED]: "👋",
  [NotificationType.PASSWORD_CHANGED]: "🔐",
  [NotificationType.ROLE_CHANGED]: "👤",
  [NotificationType.CONTRACT_EXPIRING]: "📋",
  [NotificationType.CONTRACT_EXPIRED]: "📋",
  [NotificationType.CONTRACT_PAYMENT_DUE]: "💰",
  [NotificationType.REPORT_READY]: "📊",
  [NotificationType.REPORT_SCHEDULED]: "📅",
  [NotificationType.CUSTOM]: "📢",
};
