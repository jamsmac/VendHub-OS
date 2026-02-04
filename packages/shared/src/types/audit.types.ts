/**
 * Audit Types for VendHub OS
 * Audit trail and compliance tracking
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SOFT_DELETE = 'soft_delete',
  RESTORE = 'restore',
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  PERMISSION_CHANGE = 'permission_change',
  SETTINGS_CHANGE = 'settings_change',
  EXPORT = 'export',
  IMPORT = 'import',
  BULK_UPDATE = 'bulk_update',
  BULK_DELETE = 'bulk_delete',
  API_CALL = 'api_call',
  WEBHOOK_RECEIVED = 'webhook_received',
  PAYMENT_PROCESSED = 'payment_processed',
  REFUND_ISSUED = 'refund_issued',
  REPORT_GENERATED = 'report_generated',
  NOTIFICATION_SENT = 'notification_sent',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  MACHINE_STATUS_CHANGE = 'machine_status_change',
  INVENTORY_ADJUSTMENT = 'inventory_adjustment',
  FISCAL_OPERATION = 'fiscal_operation',
}

export enum AuditSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SYSTEM = 'system',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  INTEGRATION = 'integration',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IAuditLog {
  id: string;
  organizationId?: string;

  // Who
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;

  // What
  entityType: string;
  entityId?: string;
  entityName?: string;

  // Action
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  description?: string;

  // Changes
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: IAuditChange[];
  affectedFields?: string[];

  // Context
  context?: IAuditContext;
  ipAddress?: string;
  deviceInfo?: IAuditDeviceInfo;
  geoLocation?: IAuditGeoLocation;

  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];

  // Result
  isSuccess: boolean;
  errorMessage?: string;

  createdAt: Date;
  expiresAt?: Date;
}

export interface IAuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  fieldType?: string;
}

export interface IAuditContext {
  module?: string;
  controller?: string;
  method?: string;
  endpoint?: string;
  httpMethod?: string;
  queryParams?: Record<string, any>;
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
  duration?: number;
}

export interface IAuditDeviceInfo {
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'bot';
  isMobile?: boolean;
}

export interface IAuditGeoLocation {
  ip?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
}

export interface IAuditSnapshot {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  snapshot: Record<string, any>;
  version?: string;
  checksum?: string;
  snapshotReason?: string;
  createdBy?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface IAuditSession {
  id: string;
  organizationId?: string;
  userId: string;

  // Session info
  ipAddress?: string;
  deviceInfo?: IAuditDeviceInfo;
  geoLocation?: IAuditGeoLocation;

  // Login
  loginMethod: string;
  loginProvider?: string;

  // Status
  isActive: boolean;
  isSuspicious: boolean;
  suspiciousReason?: string;

  // Activity
  lastActivityAt?: Date;
  actionsCount: number;

  // Timestamps
  createdAt: Date;
  endedAt?: Date;
  endReason?: string;
}

export interface IAuditRetentionPolicy {
  id: string;
  organizationId?: string;
  entityType: string;
  retentionDays: number;
  snapshotRetentionDays: number;
  keepCreate: boolean;
  keepUpdate: boolean;
  keepDelete: boolean;
  createSnapshots: boolean;
  snapshotOnDelete: boolean;
  excludedFields?: string[];
  isComplianceRequired: boolean;
  complianceStandard?: string;
  isActive: boolean;
}

export interface IAuditAlert {
  id: string;
  organizationId: string;
  name: string;
  description?: string;

  // Triggers
  actions?: AuditAction[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  entityTypes?: string[];
  conditions?: Record<string, any>;

  // Threshold
  thresholdCount?: number;
  thresholdWindowMinutes?: number;

  // Notification
  notificationChannels: string[];
  notificationRecipients?: {
    emails?: string[];
    telegramChatIds?: string[];
    slackChannels?: string[];
    webhookUrls?: string[];
  };

  // Cooldown
  cooldownMinutes: number;
  lastTriggeredAt?: Date;

  isActive: boolean;
  triggerCount: number;
  createdAt: Date;
}

export interface IAuditStatistics {
  totalEvents: number;
  byAction: Record<string, number>;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byEntityType: Record<string, number>;
  byUser: { userId: string; userName: string; count: number }[];
  recentActivity: { date: string; count: number }[];
  securityEvents: number;
  failedOperations: number;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export interface IQueryAuditLogs {
  organizationId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  actions?: AuditAction[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  tags?: string[];
  isSuccess?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface IAuditLogsPaginatedResponse {
  data: IAuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// LABELS
// ============================================================================

export const AUDIT_ACTION_LABELS: Record<AuditAction, { ru: string; uz: string }> = {
  [AuditAction.CREATE]: { ru: 'Создание', uz: 'Yaratish' },
  [AuditAction.UPDATE]: { ru: 'Обновление', uz: 'Yangilash' },
  [AuditAction.DELETE]: { ru: 'Удаление', uz: "O'chirish" },
  [AuditAction.SOFT_DELETE]: { ru: 'Мягкое удаление', uz: "Yumshoq o'chirish" },
  [AuditAction.RESTORE]: { ru: 'Восстановление', uz: 'Tiklash' },
  [AuditAction.LOGIN]: { ru: 'Вход', uz: 'Kirish' },
  [AuditAction.LOGOUT]: { ru: 'Выход', uz: 'Chiqish' },
  [AuditAction.LOGIN_FAILED]: { ru: 'Неудачный вход', uz: "Muvaffaqiyatsiz kirish" },
  [AuditAction.PASSWORD_CHANGE]: { ru: 'Смена пароля', uz: "Parolni o'zgartirish" },
  [AuditAction.PASSWORD_RESET]: { ru: 'Сброс пароля', uz: 'Parolni tiklash' },
  [AuditAction.PERMISSION_CHANGE]: { ru: 'Изменение прав', uz: "Ruxsatlarni o'zgartirish" },
  [AuditAction.SETTINGS_CHANGE]: { ru: 'Изменение настроек', uz: "Sozlamalarni o'zgartirish" },
  [AuditAction.EXPORT]: { ru: 'Экспорт', uz: 'Eksport' },
  [AuditAction.IMPORT]: { ru: 'Импорт', uz: 'Import' },
  [AuditAction.BULK_UPDATE]: { ru: 'Массовое обновление', uz: 'Ommaviy yangilash' },
  [AuditAction.BULK_DELETE]: { ru: 'Массовое удаление', uz: "Ommaviy o'chirish" },
  [AuditAction.API_CALL]: { ru: 'API вызов', uz: 'API chaqiruv' },
  [AuditAction.WEBHOOK_RECEIVED]: { ru: 'Webhook получен', uz: 'Webhook qabul qilindi' },
  [AuditAction.PAYMENT_PROCESSED]: { ru: 'Платеж обработан', uz: "To'lov qayta ishlandi" },
  [AuditAction.REFUND_ISSUED]: { ru: 'Возврат выполнен', uz: 'Qaytarish bajarildi' },
  [AuditAction.REPORT_GENERATED]: { ru: 'Отчет создан', uz: 'Hisobot yaratildi' },
  [AuditAction.NOTIFICATION_SENT]: { ru: 'Уведомление отправлено', uz: 'Xabar yuborildi' },
  [AuditAction.TASK_ASSIGNED]: { ru: 'Задача назначена', uz: 'Vazifa tayinlandi' },
  [AuditAction.TASK_COMPLETED]: { ru: 'Задача завершена', uz: 'Vazifa yakunlandi' },
  [AuditAction.MACHINE_STATUS_CHANGE]: { ru: 'Статус автомата изменен', uz: "Avtomat holati o'zgartirildi" },
  [AuditAction.INVENTORY_ADJUSTMENT]: { ru: 'Корректировка запасов', uz: 'Zaxiralarni sozlash' },
  [AuditAction.FISCAL_OPERATION]: { ru: 'Фискальная операция', uz: 'Fiskal operatsiya' },
};

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, { ru: string; uz: string }> = {
  [AuditSeverity.DEBUG]: { ru: 'Отладка', uz: 'Debug' },
  [AuditSeverity.INFO]: { ru: 'Информация', uz: "Ma'lumot" },
  [AuditSeverity.WARNING]: { ru: 'Предупреждение', uz: 'Ogohlantirish' },
  [AuditSeverity.ERROR]: { ru: 'Ошибка', uz: 'Xato' },
  [AuditSeverity.CRITICAL]: { ru: 'Критическая', uz: 'Kritik' },
};

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, { ru: string; uz: string }> = {
  [AuditCategory.AUTHENTICATION]: { ru: 'Аутентификация', uz: 'Autentifikatsiya' },
  [AuditCategory.AUTHORIZATION]: { ru: 'Авторизация', uz: 'Avtorizatsiya' },
  [AuditCategory.DATA_ACCESS]: { ru: 'Доступ к данным', uz: "Ma'lumotlarga kirish" },
  [AuditCategory.DATA_MODIFICATION]: { ru: 'Изменение данных', uz: "Ma'lumotlarni o'zgartirish" },
  [AuditCategory.SYSTEM]: { ru: 'Система', uz: 'Tizim' },
  [AuditCategory.SECURITY]: { ru: 'Безопасность', uz: 'Xavfsizlik' },
  [AuditCategory.COMPLIANCE]: { ru: 'Соответствие', uz: 'Muvofiqlik' },
  [AuditCategory.FINANCIAL]: { ru: 'Финансы', uz: 'Moliya' },
  [AuditCategory.OPERATIONAL]: { ru: 'Операционные', uz: 'Operatsion' },
  [AuditCategory.INTEGRATION]: { ru: 'Интеграция', uz: 'Integratsiya' },
};

// ============================================================================
// ICONS
// ============================================================================

export const AUDIT_SEVERITY_ICONS: Record<AuditSeverity, string> = {
  [AuditSeverity.DEBUG]: '🔍',
  [AuditSeverity.INFO]: 'ℹ️',
  [AuditSeverity.WARNING]: '⚠️',
  [AuditSeverity.ERROR]: '❌',
  [AuditSeverity.CRITICAL]: '🚨',
};

export const AUDIT_CATEGORY_ICONS: Record<AuditCategory, string> = {
  [AuditCategory.AUTHENTICATION]: '🔐',
  [AuditCategory.AUTHORIZATION]: '🔑',
  [AuditCategory.DATA_ACCESS]: '📖',
  [AuditCategory.DATA_MODIFICATION]: '✏️',
  [AuditCategory.SYSTEM]: '⚙️',
  [AuditCategory.SECURITY]: '🛡️',
  [AuditCategory.COMPLIANCE]: '📋',
  [AuditCategory.FINANCIAL]: '💰',
  [AuditCategory.OPERATIONAL]: '🔧',
  [AuditCategory.INTEGRATION]: '🔗',
};

// ============================================================================
// CONSTANTS
// ============================================================================

// Sensitive fields that should be masked in audit logs
export const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'secret',
  'secretKey',
  'secret_key',
  'pin',
  'pinCode',
  'pin_code',
  'cvv',
  'cardNumber',
  'card_number',
  'bankAccount',
  'bank_account',
  'inn',
  'pinfl',
  'passportNumber',
  'passport_number',
];

// Tables that should be audited by default
export const AUDITED_ENTITIES = [
  'users',
  'organizations',
  'machines',
  'products',
  'transactions',
  'locations',
  'warehouses',
  'inventory_movements',
  'tasks',
  'complaints',
  'refunds',
  'report_definitions',
  'notification_templates',
];

// Default retention in days
export const DEFAULT_AUDIT_RETENTION_DAYS = 365;
export const DEFAULT_SNAPSHOT_RETENTION_DAYS = 2555; // ~7 years for compliance
