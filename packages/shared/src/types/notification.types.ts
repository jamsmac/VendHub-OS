/**
 * Notification Types for VendHub OS
 * Multi-channel notification system
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum NotificationChannel {
  IN_APP = 'in_app',
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  WEBHOOK = 'webhook',
}

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationType {
  // System
  SYSTEM_ALERT = 'system_alert',
  SYSTEM_UPDATE = 'system_update',

  // Machine
  MACHINE_OFFLINE = 'machine_offline',
  MACHINE_ONLINE = 'machine_online',
  MACHINE_LOW_STOCK = 'machine_low_stock',
  MACHINE_ERROR = 'machine_error',
  MACHINE_MAINTENANCE = 'machine_maintenance',

  // Tasks
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',

  // Complaints
  COMPLAINT_NEW = 'complaint_new',
  COMPLAINT_UPDATED = 'complaint_updated',
  COMPLAINT_RESOLVED = 'complaint_resolved',
  COMPLAINT_SLA_WARNING = 'complaint_sla_warning',

  // Inventory
  INVENTORY_LOW = 'inventory_low',
  INVENTORY_EXPIRING = 'inventory_expiring',
  INVENTORY_RECEIVED = 'inventory_received',

  // Financial
  TRANSACTION_COMPLETED = 'transaction_completed',
  PAYMENT_FAILED = 'payment_failed',
  DAILY_REPORT = 'daily_report',
  REVENUE_ALERT = 'revenue_alert',

  // User
  USER_WELCOME = 'user_welcome',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_SECURITY = 'account_security',

  // Custom
  CUSTOM = 'custom',
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
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;

  // Delivery
  channels: NotificationChannel[];
  status: NotificationStatus;

  // Status tracking per channel
  channelStatuses?: Record<NotificationChannel, {
    status: NotificationStatus;
    sentAt?: Date;
    deliveredAt?: Date;
    errorMessage?: string;
  }>;

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
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
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
  channelSettings: Record<NotificationChannel, {
    enabled: boolean;
    address?: string; // email, phone, telegram chat id
  }>;

  // Type preferences (which types to receive)
  typeSettings: Record<NotificationType, {
    enabled: boolean;
    channels?: NotificationChannel[];
  }>;

  // Language preference
  language: 'ru' | 'uz' | 'en';

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
  recipientType: 'user' | 'role' | 'dynamic';
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
  data?: Record<string, any>;

  // Targeting
  targetType: 'all' | 'role' | 'custom' | 'filter';
  targetRoles?: string[];
  targetUserIds?: string[];
  targetFilter?: Record<string, any>;

  // Delivery
  channels: NotificationChannel[];
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';

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
  data?: Record<string, any>;
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
  variables: Record<string, any>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  scheduledFor?: Date;
}

// ============================================================================
// LABELS
// ============================================================================

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, { ru: string; uz: string }> = {
  [NotificationChannel.IN_APP]: { ru: 'В приложении', uz: 'Ilovada' },
  [NotificationChannel.PUSH]: { ru: 'Push-уведомление', uz: 'Push-xabar' },
  [NotificationChannel.EMAIL]: { ru: 'Email', uz: 'Email' },
  [NotificationChannel.SMS]: { ru: 'SMS', uz: 'SMS' },
  [NotificationChannel.TELEGRAM]: { ru: 'Telegram', uz: 'Telegram' },
  [NotificationChannel.WHATSAPP]: { ru: 'WhatsApp', uz: 'WhatsApp' },
  [NotificationChannel.WEBHOOK]: { ru: 'Webhook', uz: 'Webhook' },
};

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, { ru: string; uz: string }> = {
  [NotificationStatus.PENDING]: { ru: 'Ожидает', uz: 'Kutmoqda' },
  [NotificationStatus.QUEUED]: { ru: 'В очереди', uz: 'Navbatda' },
  [NotificationStatus.SENT]: { ru: 'Отправлено', uz: 'Yuborildi' },
  [NotificationStatus.DELIVERED]: { ru: 'Доставлено', uz: 'Yetkazildi' },
  [NotificationStatus.READ]: { ru: 'Прочитано', uz: "O'qildi" },
  [NotificationStatus.FAILED]: { ru: 'Ошибка', uz: 'Xato' },
  [NotificationStatus.CANCELLED]: { ru: 'Отменено', uz: 'Bekor qilindi' },
};

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, { ru: string; uz: string }> = {
  [NotificationPriority.LOW]: { ru: 'Низкий', uz: 'Past' },
  [NotificationPriority.NORMAL]: { ru: 'Обычный', uz: 'Oddiy' },
  [NotificationPriority.HIGH]: { ru: 'Высокий', uz: 'Yuqori' },
  [NotificationPriority.URGENT]: { ru: 'Срочный', uz: 'Shoshilinch' },
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { ru: string; uz: string }> = {
  [NotificationType.SYSTEM_ALERT]: { ru: 'Системное оповещение', uz: 'Tizim ogohlantirishlari' },
  [NotificationType.SYSTEM_UPDATE]: { ru: 'Обновление системы', uz: 'Tizim yangilanishi' },
  [NotificationType.MACHINE_OFFLINE]: { ru: 'Автомат оффлайн', uz: 'Avtomat oflayn' },
  [NotificationType.MACHINE_ONLINE]: { ru: 'Автомат онлайн', uz: 'Avtomat onlayn' },
  [NotificationType.MACHINE_LOW_STOCK]: { ru: 'Низкий запас', uz: 'Kam zaxira' },
  [NotificationType.MACHINE_ERROR]: { ru: 'Ошибка автомата', uz: 'Avtomat xatosi' },
  [NotificationType.MACHINE_MAINTENANCE]: { ru: 'Обслуживание', uz: "Texnik xizmat" },
  [NotificationType.TASK_ASSIGNED]: { ru: 'Задача назначена', uz: 'Vazifa tayinlandi' },
  [NotificationType.TASK_UPDATED]: { ru: 'Задача обновлена', uz: 'Vazifa yangilandi' },
  [NotificationType.TASK_COMPLETED]: { ru: 'Задача завершена', uz: 'Vazifa yakunlandi' },
  [NotificationType.TASK_OVERDUE]: { ru: 'Просроченная задача', uz: 'Muddati o\'tgan vazifa' },
  [NotificationType.COMPLAINT_NEW]: { ru: 'Новая жалоба', uz: 'Yangi shikoyat' },
  [NotificationType.COMPLAINT_UPDATED]: { ru: 'Жалоба обновлена', uz: 'Shikoyat yangilandi' },
  [NotificationType.COMPLAINT_RESOLVED]: { ru: 'Жалоба решена', uz: 'Shikoyat hal qilindi' },
  [NotificationType.COMPLAINT_SLA_WARNING]: { ru: 'Предупреждение SLA', uz: 'SLA ogohlantirishi' },
  [NotificationType.INVENTORY_LOW]: { ru: 'Низкий запас на складе', uz: 'Omborda kam zaxira' },
  [NotificationType.INVENTORY_EXPIRING]: { ru: 'Истекающий срок годности', uz: 'Yaroqlilik muddati tugayapti' },
  [NotificationType.INVENTORY_RECEIVED]: { ru: 'Товар получен', uz: 'Mahsulot qabul qilindi' },
  [NotificationType.TRANSACTION_COMPLETED]: { ru: 'Транзакция завершена', uz: 'Tranzaksiya yakunlandi' },
  [NotificationType.PAYMENT_FAILED]: { ru: 'Ошибка платежа', uz: "To'lov xatosi" },
  [NotificationType.DAILY_REPORT]: { ru: 'Ежедневный отчет', uz: 'Kunlik hisobot' },
  [NotificationType.REVENUE_ALERT]: { ru: 'Уведомление о выручке', uz: 'Daromad haqida xabar' },
  [NotificationType.USER_WELCOME]: { ru: 'Приветствие', uz: 'Xush kelibsiz' },
  [NotificationType.PASSWORD_RESET]: { ru: 'Сброс пароля', uz: 'Parolni tiklash' },
  [NotificationType.ACCOUNT_SECURITY]: { ru: 'Безопасность аккаунта', uz: 'Hisob xavfsizligi' },
  [NotificationType.CUSTOM]: { ru: 'Пользовательское', uz: 'Maxsus' },
};

// ============================================================================
// ICONS
// ============================================================================

export const NOTIFICATION_CHANNEL_ICONS: Record<NotificationChannel, string> = {
  [NotificationChannel.IN_APP]: '📱',
  [NotificationChannel.PUSH]: '🔔',
  [NotificationChannel.EMAIL]: '📧',
  [NotificationChannel.SMS]: '📲',
  [NotificationChannel.TELEGRAM]: '✈️',
  [NotificationChannel.WHATSAPP]: '💬',
  [NotificationChannel.WEBHOOK]: '🔗',
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  [NotificationType.SYSTEM_ALERT]: '⚠️',
  [NotificationType.SYSTEM_UPDATE]: '🔄',
  [NotificationType.MACHINE_OFFLINE]: '🔴',
  [NotificationType.MACHINE_ONLINE]: '🟢',
  [NotificationType.MACHINE_LOW_STOCK]: '📦',
  [NotificationType.MACHINE_ERROR]: '❌',
  [NotificationType.MACHINE_MAINTENANCE]: '🔧',
  [NotificationType.TASK_ASSIGNED]: '📋',
  [NotificationType.TASK_UPDATED]: '✏️',
  [NotificationType.TASK_COMPLETED]: '✅',
  [NotificationType.TASK_OVERDUE]: '⏰',
  [NotificationType.COMPLAINT_NEW]: '🆕',
  [NotificationType.COMPLAINT_UPDATED]: '📝',
  [NotificationType.COMPLAINT_RESOLVED]: '✅',
  [NotificationType.COMPLAINT_SLA_WARNING]: '⚠️',
  [NotificationType.INVENTORY_LOW]: '📉',
  [NotificationType.INVENTORY_EXPIRING]: '⏳',
  [NotificationType.INVENTORY_RECEIVED]: '📥',
  [NotificationType.TRANSACTION_COMPLETED]: '💰',
  [NotificationType.PAYMENT_FAILED]: '💳',
  [NotificationType.DAILY_REPORT]: '📊',
  [NotificationType.REVENUE_ALERT]: '💵',
  [NotificationType.USER_WELCOME]: '👋',
  [NotificationType.PASSWORD_RESET]: '🔑',
  [NotificationType.ACCOUNT_SECURITY]: '🔒',
  [NotificationType.CUSTOM]: '📢',
};
