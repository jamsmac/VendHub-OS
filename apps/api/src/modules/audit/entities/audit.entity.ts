/**
 * Audit Module Entities for VendHub OS
 * Tracks all changes to entities for compliance and debugging
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum AuditAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  SOFT_DELETE = "soft_delete",
  RESTORE = "restore",
  LOGIN = "login",
  LOGOUT = "logout",
  LOGIN_FAILED = "login_failed",
  PASSWORD_CHANGE = "password_change",
  PASSWORD_RESET = "password_reset",
  PERMISSION_CHANGE = "permission_change",
  SETTINGS_CHANGE = "settings_change",
  EXPORT = "export",
  IMPORT = "import",
  BULK_UPDATE = "bulk_update",
  BULK_DELETE = "bulk_delete",
  API_CALL = "api_call",
  WEBHOOK_RECEIVED = "webhook_received",
  PAYMENT_PROCESSED = "payment_processed",
  REFUND_ISSUED = "refund_issued",
  REPORT_GENERATED = "report_generated",
  NOTIFICATION_SENT = "notification_sent",
  TASK_ASSIGNED = "task_assigned",
  TASK_COMPLETED = "task_completed",
  MACHINE_STATUS_CHANGE = "machine_status_change",
  INVENTORY_ADJUSTMENT = "inventory_adjustment",
  FISCAL_OPERATION = "fiscal_operation",
}

export enum AuditSeverity {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

export enum AuditCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  DATA_ACCESS = "data_access",
  DATA_MODIFICATION = "data_modification",
  SYSTEM = "system",
  SECURITY = "security",
  COMPLIANCE = "compliance",
  FINANCIAL = "financial",
  OPERATIONAL = "operational",
  INTEGRATION = "integration",
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface AuditChanges {
  field: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldValue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newValue: any;
  fieldType?: string;
}

export interface AuditContext {
  module?: string;
  controller?: string;
  method?: string;
  endpoint?: string;
  httpMethod?: string;
  queryParams?: Record<string, unknown>;
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
  duration?: number;
}

export interface AuditDeviceInfo {
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "bot";
  isMobile?: boolean;
}

export interface AuditGeoLocation {
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

// ============================================================================
// CONSTANTS
// ============================================================================

export const AUDIT_ACTION_LABELS: Record<
  AuditAction,
  { ru: string; uz: string }
> = {
  [AuditAction.CREATE]: { ru: "Создание", uz: "Yaratish" },
  [AuditAction.UPDATE]: { ru: "Обновление", uz: "Yangilash" },
  [AuditAction.DELETE]: { ru: "Удаление", uz: "O'chirish" },
  [AuditAction.SOFT_DELETE]: { ru: "Мягкое удаление", uz: "Yumshoq o'chirish" },
  [AuditAction.RESTORE]: { ru: "Восстановление", uz: "Tiklash" },
  [AuditAction.LOGIN]: { ru: "Вход в систему", uz: "Tizimga kirish" },
  [AuditAction.LOGOUT]: { ru: "Выход из системы", uz: "Tizimdan chiqish" },
  [AuditAction.LOGIN_FAILED]: {
    ru: "Неудачный вход",
    uz: "Muvaffaqiyatsiz kirish",
  },
  [AuditAction.PASSWORD_CHANGE]: {
    ru: "Смена пароля",
    uz: "Parolni o'zgartirish",
  },
  [AuditAction.PASSWORD_RESET]: { ru: "Сброс пароля", uz: "Parolni tiklash" },
  [AuditAction.PERMISSION_CHANGE]: {
    ru: "Изменение прав",
    uz: "Ruxsatlarni o'zgartirish",
  },
  [AuditAction.SETTINGS_CHANGE]: {
    ru: "Изменение настроек",
    uz: "Sozlamalarni o'zgartirish",
  },
  [AuditAction.EXPORT]: {
    ru: "Экспорт данных",
    uz: "Ma'lumotlarni eksport qilish",
  },
  [AuditAction.IMPORT]: {
    ru: "Импорт данных",
    uz: "Ma'lumotlarni import qilish",
  },
  [AuditAction.BULK_UPDATE]: {
    ru: "Массовое обновление",
    uz: "Ommaviy yangilash",
  },
  [AuditAction.BULK_DELETE]: {
    ru: "Массовое удаление",
    uz: "Ommaviy o'chirish",
  },
  [AuditAction.API_CALL]: { ru: "API вызов", uz: "API chaqiruv" },
  [AuditAction.WEBHOOK_RECEIVED]: {
    ru: "Получен вебхук",
    uz: "Webhook qabul qilindi",
  },
  [AuditAction.PAYMENT_PROCESSED]: {
    ru: "Обработка платежа",
    uz: "To'lovni qayta ishlash",
  },
  [AuditAction.REFUND_ISSUED]: {
    ru: "Возврат средств",
    uz: "Mablag'ni qaytarish",
  },
  [AuditAction.REPORT_GENERATED]: {
    ru: "Генерация отчета",
    uz: "Hisobot yaratish",
  },
  [AuditAction.NOTIFICATION_SENT]: {
    ru: "Отправка уведомления",
    uz: "Xabarnoma yuborish",
  },
  [AuditAction.TASK_ASSIGNED]: {
    ru: "Назначение задачи",
    uz: "Vazifa tayinlash",
  },
  [AuditAction.TASK_COMPLETED]: {
    ru: "Завершение задачи",
    uz: "Vazifani yakunlash",
  },
  [AuditAction.MACHINE_STATUS_CHANGE]: {
    ru: "Изменение статуса автомата",
    uz: "Avtomat holatini o'zgartirish",
  },
  [AuditAction.INVENTORY_ADJUSTMENT]: {
    ru: "Корректировка инвентаря",
    uz: "Inventarni sozlash",
  },
  [AuditAction.FISCAL_OPERATION]: {
    ru: "Фискальная операция",
    uz: "Fiskal operatsiya",
  },
};

export const AUDIT_SEVERITY_LABELS: Record<
  AuditSeverity,
  { ru: string; uz: string }
> = {
  [AuditSeverity.DEBUG]: { ru: "Отладка", uz: "Nosozliklarni tuzatish" },
  [AuditSeverity.INFO]: { ru: "Информация", uz: "Ma'lumot" },
  [AuditSeverity.WARNING]: { ru: "Предупреждение", uz: "Ogohlantirish" },
  [AuditSeverity.ERROR]: { ru: "Ошибка", uz: "Xato" },
  [AuditSeverity.CRITICAL]: { ru: "Критическая ошибка", uz: "Kritik xato" },
};

export const AUDIT_CATEGORY_LABELS: Record<
  AuditCategory,
  { ru: string; uz: string }
> = {
  [AuditCategory.AUTHENTICATION]: {
    ru: "Аутентификация",
    uz: "Autentifikatsiya",
  },
  [AuditCategory.AUTHORIZATION]: { ru: "Авторизация", uz: "Avtorizatsiya" },
  [AuditCategory.DATA_ACCESS]: {
    ru: "Доступ к данным",
    uz: "Ma'lumotlarga kirish",
  },
  [AuditCategory.DATA_MODIFICATION]: {
    ru: "Изменение данных",
    uz: "Ma'lumotlarni o'zgartirish",
  },
  [AuditCategory.SYSTEM]: { ru: "Система", uz: "Tizim" },
  [AuditCategory.SECURITY]: { ru: "Безопасность", uz: "Xavfsizlik" },
  [AuditCategory.COMPLIANCE]: { ru: "Соответствие", uz: "Muvofiqlik" },
  [AuditCategory.FINANCIAL]: { ru: "Финансы", uz: "Moliya" },
  [AuditCategory.OPERATIONAL]: { ru: "Операционные", uz: "Operatsion" },
  [AuditCategory.INTEGRATION]: { ru: "Интеграция", uz: "Integratsiya" },
};

// Sensitive fields that should be masked in audit logs
export const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "password_hash",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "api_key",
  "secret",
  "secretKey",
  "secret_key",
  "pin",
  "pinCode",
  "pin_code",
  "cvv",
  "cardNumber",
  "card_number",
  "bankAccount",
  "bank_account",
  "inn",
  "pinfl",
  "passportNumber",
  "passport_number",
];

// Tables that should be audited
export const AUDITED_ENTITIES = [
  "users",
  "organizations",
  "machines",
  "products",
  "transactions",
  "locations",
  "warehouses",
  "inventory_movements",
  "tasks",
  "complaints",
  "refunds",
  "report_definitions",
  "notification_templates",
];

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * AuditLog - Main audit trail entity
 * Stores all changes and actions in the system
 */
@Entity("audit_logs")
@Index(["organizationId", "createdAt"])
@Index(["entityType", "entityId"])
@Index(["userId", "createdAt"])
@Index(["action", "createdAt"])
@Index(["category", "severity"])
@Index(["createdAt"])
export class AuditLog extends BaseEntity {
  // Organization scope
  @Column({ type: "uuid", nullable: true })
  @Index()
  organizationId: string;

  // Who performed the action
  @Column({ type: "uuid", nullable: true })
  @Index()
  userId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  userEmail: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  userName: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  userRole: string;

  // What was affected
  @Column({ type: "varchar", length: 100 })
  @Index()
  entityType: string;

  @Column({ type: "uuid", nullable: true })
  entityId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  entityName: string;

  // Action details
  @Column({ type: "enum", enum: AuditAction })
  @Index()
  action: AuditAction;

  @Column({
    type: "enum",
    enum: AuditCategory,
    default: AuditCategory.DATA_MODIFICATION,
  })
  category: AuditCategory;

  @Column({ type: "enum", enum: AuditSeverity, default: AuditSeverity.INFO })
  severity: AuditSeverity;

  @Column({ type: "text", nullable: true })
  description: string;

  // Change tracking
  @Column({ type: "jsonb", nullable: true })
  oldValues: Record<string, unknown>;

  @Column({ type: "jsonb", nullable: true })
  newValues: Record<string, unknown>;

  @Column({ type: "jsonb", nullable: true })
  changes: AuditChanges[];

  @Column({ type: "text", array: true, nullable: true })
  affectedFields: string[];

  // Request context
  @Column({ type: "jsonb", nullable: true })
  context: AuditContext;

  @Column({ type: "inet", nullable: true })
  ipAddress: string;

  @Column({ type: "jsonb", nullable: true })
  deviceInfo: AuditDeviceInfo;

  @Column({ type: "jsonb", nullable: true })
  geoLocation: AuditGeoLocation;

  // Additional metadata
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: "text", array: true, nullable: true })
  tags: string[];

  // Result
  @Column({ type: "boolean", default: true })
  isSuccess: boolean;

  @Column({ type: "text", nullable: true })
  errorMessage: string;

  @Column({ type: "text", nullable: true })
  errorStack: string;

  // TTL for automatic cleanup (in days)
  @Column({ type: "int", default: 365 })
  retentionDays: number;

  @Column({ type: "timestamptz", nullable: true })
  @Index()
  expiresAt: Date;
}

/**
 * AuditSnapshot - Stores complete entity snapshots for compliance
 * Used for regulatory requirements and point-in-time recovery
 */
@Entity("audit_snapshots")
@Index(["organizationId", "entityType", "entityId"])
@Index(["createdAt"])
export class AuditSnapshot extends BaseEntity {
  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  @Column({ type: "varchar", length: 100 })
  @Index()
  entityType: string;

  @Column({ type: "uuid" })
  @Index()
  entityId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  entityName: string;

  // Complete snapshot of entity at this point in time
  @Column({ type: "jsonb" })
  snapshot: Record<string, unknown>;

  // Snapshot metadata
  @Column({ type: "varchar", length: 50, nullable: true })
  version: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  checksum: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  snapshotReason: string;

  // Who created the snapshot
  @Column({ type: "uuid", nullable: true })
  createdBy: string;

  // Retention
  @Column({ type: "int", default: 2555 }) // ~7 years for compliance
  retentionDays: number;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt: Date;
}

/**
 * AuditRetentionPolicy - Configures data retention per entity type
 */
@Entity("audit_retention_policies")
@Index(["organizationId", "entityType"], { unique: true })
export class AuditRetentionPolicy extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId: string;

  @Column({ type: "varchar", length: 100 })
  entityType: string;

  // Retention settings
  @Column({ type: "int", default: 365 })
  retentionDays: number;

  @Column({ type: "int", default: 2555 })
  snapshotRetentionDays: number;

  // What to keep
  @Column({ type: "boolean", default: true })
  keepCreate: boolean;

  @Column({ type: "boolean", default: true })
  keepUpdate: boolean;

  @Column({ type: "boolean", default: true })
  keepDelete: boolean;

  @Column({ type: "boolean", default: false })
  createSnapshots: boolean;

  @Column({ type: "boolean", default: true })
  snapshotOnDelete: boolean;

  // Fields to exclude from audit
  @Column({ type: "text", array: true, nullable: true })
  excludedFields: string[];

  // Compliance flags
  @Column({ type: "boolean", default: false })
  isComplianceRequired: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  complianceStandard: string; // e.g., 'GDPR', 'PCI-DSS', 'UZ-LAW'

  @Column({ type: "boolean", default: true })
  isActive: boolean;
}

/**
 * AuditAlert - Configures alerts for specific audit events
 */
@Entity("audit_alerts")
@Index(["organizationId", "isActive"])
export class AuditAlert extends BaseEntity {
  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // Trigger conditions
  @Column({ type: "enum", enum: AuditAction, array: true, nullable: true })
  actions: AuditAction[];

  @Column({ type: "enum", enum: AuditCategory, array: true, nullable: true })
  categories: AuditCategory[];

  @Column({ type: "enum", enum: AuditSeverity, array: true, nullable: true })
  severities: AuditSeverity[];

  @Column({ type: "text", array: true, nullable: true })
  entityTypes: string[];

  // Additional conditions (JSON query)
  @Column({ type: "jsonb", nullable: true })
  conditions: Record<string, unknown>;

  // Threshold settings
  @Column({ type: "int", nullable: true })
  thresholdCount: number;

  @Column({ type: "int", nullable: true })
  thresholdWindowMinutes: number;

  // Notification settings
  @Column({ type: "text", array: true, default: "{}" })
  notificationChannels: string[]; // email, telegram, slack, webhook

  @Column({ type: "jsonb", nullable: true })
  notificationRecipients: {
    emails?: string[];
    telegramChatIds?: string[];
    slackChannels?: string[];
    webhookUrls?: string[];
  };

  @Column({ type: "text", nullable: true })
  notificationTemplate: string;

  // Cooldown
  @Column({ type: "int", default: 15 })
  cooldownMinutes: number;

  @Column({ type: "timestamptz", nullable: true })
  lastTriggeredAt: Date;

  // Status
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "int", default: 0 })
  triggerCount: number;

  // Created by
  @Column({ type: "uuid", nullable: true })
  createdBy: string;
}

/**
 * AuditAlertHistory - History of triggered alerts
 */
@Entity("audit_alert_history")
@Index(["alertId", "triggeredAt"])
@Index(["organizationId", "triggeredAt"])
export class AuditAlertHistory extends BaseEntity {
  @Column({ type: "uuid" })
  @Index()
  alertId: string;

  @ManyToOne(() => AuditAlert, { onDelete: "SET NULL" })
  @JoinColumn({ name: "alert_id" })
  alert: AuditAlert;

  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  // Trigger details
  @Column({ type: "timestamptz" })
  @Index()
  triggeredAt: Date;

  @Column({ type: "text" })
  triggerReason: string;

  @Column({ type: "int", default: 1 })
  matchedEventsCount: number;

  @Column({ type: "uuid", array: true, nullable: true })
  matchedEventIds: string[];

  // Notification status
  @Column({ type: "boolean", default: false })
  notificationSent: boolean;

  @Column({ type: "text", array: true, nullable: true })
  notificationChannelsUsed: string[];

  @Column({ type: "text", nullable: true })
  notificationError: string;

  // Resolution
  @Column({ type: "boolean", default: false })
  isAcknowledged: boolean;

  @Column({ type: "uuid", nullable: true })
  acknowledgedBy: string;

  @Column({ type: "timestamptz", nullable: true })
  acknowledgedAt: Date;

  @Column({ type: "text", nullable: true })
  resolutionNotes: string;
}

/**
 * AuditSession - Tracks user sessions for security auditing
 */
@Entity("audit_sessions")
@Index(["organizationId", "userId"])
@Index(["createdAt"])
@Index(["isActive"])
export class AuditSession extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  @Index()
  organizationId: string;

  @Column({ type: "uuid" })
  @Index()
  userId: string;

  @Column({ type: "varchar", length: 64, nullable: true })
  sessionTokenHash: string;

  // Session info
  @Column({ type: "inet", nullable: true })
  ipAddress: string;

  @Column({ type: "jsonb", nullable: true })
  deviceInfo: AuditDeviceInfo;

  @Column({ type: "jsonb", nullable: true })
  geoLocation: AuditGeoLocation;

  // Login info
  @Column({ type: "varchar", length: 50, default: "password" })
  loginMethod: string; // password, sms, oauth, api_key

  @Column({ type: "varchar", length: 50, nullable: true })
  loginProvider: string; // google, telegram, etc.

  // Status
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "boolean", default: false })
  isSuspicious: boolean;

  @Column({ type: "text", nullable: true })
  suspiciousReason: string;

  // Activity tracking
  @Column({ type: "timestamptz", nullable: true })
  lastActivityAt: Date;

  @Column({ type: "int", default: 0 })
  actionsCount: number;

  // Timestamps
  @Column({ type: "timestamptz", nullable: true })
  endedAt: Date;

  @Column({ type: "varchar", length: 50, nullable: true })
  endReason: string; // logout, timeout, forced, token_revoked
}

/**
 * AuditReport - Generated audit reports for compliance
 */
@Entity("audit_reports")
@Index(["organizationId", "createdAt"])
@Index(["reportType"])
export class AuditReport extends BaseEntity {
  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 50 })
  reportType: string; // activity, security, compliance, access, changes

  @Column({ type: "text", nullable: true })
  description: string;

  // Report parameters
  @Column({ type: "timestamptz" })
  dateFrom: Date;

  @Column({ type: "timestamptz" })
  dateTo: Date;

  @Column({ type: "jsonb", nullable: true })
  filters: Record<string, unknown>;

  // Report content
  @Column({ type: "jsonb", nullable: true })
  summary: {
    totalEvents: number;
    byAction: Record<string, number>;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byUser: Record<string, number>;
    byEntity: Record<string, number>;
  };

  @Column({ type: "jsonb", nullable: true })
  highlights: {
    securityEvents: number;
    failedLogins: number;
    dataExports: number;
    permissionChanges: number;
    suspiciousActivities: number;
  };

  // File storage
  @Column({ type: "varchar", length: 500, nullable: true })
  filePath: string;

  @Column({ type: "varchar", length: 10, default: "pdf" })
  fileFormat: string;

  @Column({ type: "int", nullable: true })
  fileSize: number;

  // Generation info
  @Column({ type: "uuid", nullable: true })
  generatedBy: string;

  @Column({ type: "int", nullable: true })
  generationDurationMs: number;

  @Column({ type: "varchar", length: 20, default: "completed" })
  status: string; // pending, generating, completed, failed

  @Column({ type: "text", nullable: true })
  errorMessage: string;
}
