/**
 * Audit Module Entities for VendHub OS
 * Tracks all changes to entities for compliance and debugging
 */

import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

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

export interface AuditChanges {
  field: string;
  oldValue: any;
  newValue: any;
  fieldType?: string;
}

export interface AuditContext {
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

export interface AuditDeviceInfo {
  userAgent?: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'bot';
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

export const AUDIT_ACTION_LABELS: Record<AuditAction, { ru: string; uz: string }> = {
  [AuditAction.CREATE]: { ru: 'Создание', uz: 'Yaratish' },
  [AuditAction.UPDATE]: { ru: 'Обновление', uz: 'Yangilash' },
  [AuditAction.DELETE]: { ru: 'Удаление', uz: "O'chirish" },
  [AuditAction.SOFT_DELETE]: { ru: 'Мягкое удаление', uz: "Yumshoq o'chirish" },
  [AuditAction.RESTORE]: { ru: 'Восстановление', uz: 'Tiklash' },
  [AuditAction.LOGIN]: { ru: 'Вход в систему', uz: 'Tizimga kirish' },
  [AuditAction.LOGOUT]: { ru: 'Выход из системы', uz: 'Tizimdan chiqish' },
  [AuditAction.LOGIN_FAILED]: { ru: 'Неудачный вход', uz: "Muvaffaqiyatsiz kirish" },
  [AuditAction.PASSWORD_CHANGE]: { ru: 'Смена пароля', uz: "Parolni o'zgartirish" },
  [AuditAction.PASSWORD_RESET]: { ru: 'Сброс пароля', uz: 'Parolni tiklash' },
  [AuditAction.PERMISSION_CHANGE]: { ru: 'Изменение прав', uz: "Ruxsatlarni o'zgartirish" },
  [AuditAction.SETTINGS_CHANGE]: { ru: 'Изменение настроек', uz: "Sozlamalarni o'zgartirish" },
  [AuditAction.EXPORT]: { ru: 'Экспорт данных', uz: "Ma'lumotlarni eksport qilish" },
  [AuditAction.IMPORT]: { ru: 'Импорт данных', uz: "Ma'lumotlarni import qilish" },
  [AuditAction.BULK_UPDATE]: { ru: 'Массовое обновление', uz: 'Ommaviy yangilash' },
  [AuditAction.BULK_DELETE]: { ru: 'Массовое удаление', uz: "Ommaviy o'chirish" },
  [AuditAction.API_CALL]: { ru: 'API вызов', uz: 'API chaqiruv' },
  [AuditAction.WEBHOOK_RECEIVED]: { ru: 'Получен вебхук', uz: 'Webhook qabul qilindi' },
  [AuditAction.PAYMENT_PROCESSED]: { ru: 'Обработка платежа', uz: "To'lovni qayta ishlash" },
  [AuditAction.REFUND_ISSUED]: { ru: 'Возврат средств', uz: "Mablag'ni qaytarish" },
  [AuditAction.REPORT_GENERATED]: { ru: 'Генерация отчета', uz: 'Hisobot yaratish' },
  [AuditAction.NOTIFICATION_SENT]: { ru: 'Отправка уведомления', uz: 'Xabarnoma yuborish' },
  [AuditAction.TASK_ASSIGNED]: { ru: 'Назначение задачи', uz: 'Vazifa tayinlash' },
  [AuditAction.TASK_COMPLETED]: { ru: 'Завершение задачи', uz: 'Vazifani yakunlash' },
  [AuditAction.MACHINE_STATUS_CHANGE]: { ru: 'Изменение статуса автомата', uz: "Avtomat holatini o'zgartirish" },
  [AuditAction.INVENTORY_ADJUSTMENT]: { ru: 'Корректировка инвентаря', uz: 'Inventarni sozlash' },
  [AuditAction.FISCAL_OPERATION]: { ru: 'Фискальная операция', uz: 'Fiskal operatsiya' },
};

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, { ru: string; uz: string }> = {
  [AuditSeverity.DEBUG]: { ru: 'Отладка', uz: 'Nosozliklarni tuzatish' },
  [AuditSeverity.INFO]: { ru: 'Информация', uz: "Ma'lumot" },
  [AuditSeverity.WARNING]: { ru: 'Предупреждение', uz: 'Ogohlantirish' },
  [AuditSeverity.ERROR]: { ru: 'Ошибка', uz: 'Xato' },
  [AuditSeverity.CRITICAL]: { ru: 'Критическая ошибка', uz: 'Kritik xato' },
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

// Tables that should be audited
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

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * AuditLog - Main audit trail entity
 * Stores all changes and actions in the system
 */
@Entity('audit_logs')
@Index(['organizationId', 'created_at'])
@Index(['entityType', 'entityId'])
@Index(['userId', 'created_at'])
@Index(['action', 'created_at'])
@Index(['category', 'severity'])
export class AuditLog extends BaseEntity {
  // Organization scope
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  @Index()
  organizationId: string;

  // Who performed the action
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string;

  @Column({ name: 'user_email', type: 'varchar', length: 255, nullable: true })
  userEmail: string;

  @Column({ name: 'user_name', type: 'varchar', length: 255, nullable: true })
  userName: string;

  @Column({ name: 'user_role', type: 'varchar', length: 50, nullable: true })
  userRole: string;

  // What was affected
  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  @Index()
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string;

  @Column({ name: 'entity_name', type: 'varchar', length: 255, nullable: true })
  entityName: string;

  // Action details
  @Column({ type: 'enum', enum: AuditAction })
  @Index()
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditCategory, default: AuditCategory.DATA_MODIFICATION })
  category: AuditCategory;

  @Column({ type: 'enum', enum: AuditSeverity, default: AuditSeverity.INFO })
  severity: AuditSeverity;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Change tracking
  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  changes: AuditChanges[];

  @Column({ name: 'affected_fields', type: 'text', array: true, nullable: true })
  affectedFields: string[];

  // Request context
  @Column({ type: 'jsonb', nullable: true })
  context: AuditContext;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo: AuditDeviceInfo;

  @Column({ name: 'geo_location', type: 'jsonb', nullable: true })
  geoLocation: AuditGeoLocation;

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[];

  // Result
  @Column({ name: 'is_success', type: 'boolean', default: true })
  isSuccess: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack: string;

  // TTL for automatic cleanup (in days)
  @Column({ name: 'retention_days', type: 'int', default: 365 })
  retentionDays: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  @Index()
  expiresAt: Date;
}

/**
 * AuditSnapshot - Stores complete entity snapshots for compliance
 * Used for regulatory requirements and point-in-time recovery
 */
@Entity('audit_snapshots')
@Index(['organizationId', 'entityType', 'entityId'])
export class AuditSnapshot extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  @Index()
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  @Index()
  entityId: string;

  @Column({ name: 'entity_name', type: 'varchar', length: 255, nullable: true })
  entityName: string;

  // Complete snapshot of entity at this point in time
  @Column({ type: 'jsonb' })
  snapshot: Record<string, any>;

  // Snapshot metadata
  @Column({ type: 'varchar', length: 50, nullable: true })
  version: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string;

  @Column({ name: 'snapshot_reason', type: 'varchar', length: 100, nullable: true })
  snapshotReason: string;

  // Who created the snapshot
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  // Retention
  @Column({ name: 'retention_days', type: 'int', default: 2555 }) // ~7 years for compliance
  retentionDays: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;
}

/**
 * AuditRetentionPolicy - Configures data retention per entity type
 */
@Entity('audit_retention_policies')
@Index(['organizationId', 'entityType'], { unique: true })
export class AuditRetentionPolicy extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType: string;

  // Retention settings
  @Column({ name: 'retention_days', type: 'int', default: 365 })
  retentionDays: number;

  @Column({ name: 'snapshot_retention_days', type: 'int', default: 2555 })
  snapshotRetentionDays: number;

  // What to keep
  @Column({ name: 'keep_create', type: 'boolean', default: true })
  keepCreate: boolean;

  @Column({ name: 'keep_update', type: 'boolean', default: true })
  keepUpdate: boolean;

  @Column({ name: 'keep_delete', type: 'boolean', default: true })
  keepDelete: boolean;

  @Column({ name: 'create_snapshots', type: 'boolean', default: false })
  createSnapshots: boolean;

  @Column({ name: 'snapshot_on_delete', type: 'boolean', default: true })
  snapshotOnDelete: boolean;

  // Fields to exclude from audit
  @Column({ name: 'excluded_fields', type: 'text', array: true, nullable: true })
  excludedFields: string[];

  // Compliance flags
  @Column({ name: 'is_compliance_required', type: 'boolean', default: false })
  isComplianceRequired: boolean;

  @Column({ name: 'compliance_standard', type: 'varchar', length: 50, nullable: true })
  complianceStandard: string; // e.g., 'GDPR', 'PCI-DSS', 'UZ-LAW'

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}

/**
 * AuditAlert - Configures alerts for specific audit events
 */
@Entity('audit_alerts')
@Index(['organizationId', 'isActive'])
export class AuditAlert extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Trigger conditions
  @Column({ type: 'enum', enum: AuditAction, array: true, nullable: true })
  actions: AuditAction[];

  @Column({ type: 'enum', enum: AuditCategory, array: true, nullable: true })
  categories: AuditCategory[];

  @Column({ type: 'enum', enum: AuditSeverity, array: true, nullable: true })
  severities: AuditSeverity[];

  @Column({ name: 'entity_types', type: 'text', array: true, nullable: true })
  entityTypes: string[];

  // Additional conditions (JSON query)
  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>;

  // Threshold settings
  @Column({ name: 'threshold_count', type: 'int', nullable: true })
  thresholdCount: number;

  @Column({ name: 'threshold_window_minutes', type: 'int', nullable: true })
  thresholdWindowMinutes: number;

  // Notification settings
  @Column({ name: 'notification_channels', type: 'text', array: true, default: '{}' })
  notificationChannels: string[]; // email, telegram, slack, webhook

  @Column({ name: 'notification_recipients', type: 'jsonb', nullable: true })
  notificationRecipients: {
    emails?: string[];
    telegramChatIds?: string[];
    slackChannels?: string[];
    webhookUrls?: string[];
  };

  @Column({ name: 'notification_template', type: 'text', nullable: true })
  notificationTemplate: string;

  // Cooldown
  @Column({ name: 'cooldown_minutes', type: 'int', default: 15 })
  cooldownMinutes: number;

  @Column({ name: 'last_triggered_at', type: 'timestamptz', nullable: true })
  lastTriggeredAt: Date;

  // Status
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'trigger_count', type: 'int', default: 0 })
  triggerCount: number;

  // Created by
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;
}

/**
 * AuditAlertHistory - History of triggered alerts
 */
@Entity('audit_alert_history')
@Index(['alertId', 'triggeredAt'])
@Index(['organizationId', 'triggeredAt'])
export class AuditAlertHistory extends BaseEntity {
  @Column({ name: 'alert_id', type: 'uuid' })
  @Index()
  alertId: string;

  @ManyToOne(() => AuditAlert, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_id' })
  alert: AuditAlert;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  // Trigger details
  @Column({ name: 'triggered_at', type: 'timestamptz' })
  @Index()
  triggeredAt: Date;

  @Column({ name: 'trigger_reason', type: 'text' })
  triggerReason: string;

  @Column({ name: 'matched_events_count', type: 'int', default: 1 })
  matchedEventsCount: number;

  @Column({ name: 'matched_event_ids', type: 'uuid', array: true, nullable: true })
  matchedEventIds: string[];

  // Notification status
  @Column({ name: 'notification_sent', type: 'boolean', default: false })
  notificationSent: boolean;

  @Column({ name: 'notification_channels_used', type: 'text', array: true, nullable: true })
  notificationChannelsUsed: string[];

  @Column({ name: 'notification_error', type: 'text', nullable: true })
  notificationError: string;

  // Resolution
  @Column({ name: 'is_acknowledged', type: 'boolean', default: false })
  isAcknowledged: boolean;

  @Column({ name: 'acknowledged_by', type: 'uuid', nullable: true })
  acknowledgedBy: string;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt: Date;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;
}

/**
 * AuditSession - Tracks user sessions for security auditing
 */
@Entity('audit_sessions')
@Index(['organizationId', 'userId'])
@Index(['isActive'])
export class AuditSession extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  @Index()
  organizationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'session_token_hash', type: 'varchar', length: 64, nullable: true })
  sessionTokenHash: string;

  // Session info
  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'device_info', type: 'jsonb', nullable: true })
  deviceInfo: AuditDeviceInfo;

  @Column({ name: 'geo_location', type: 'jsonb', nullable: true })
  geoLocation: AuditGeoLocation;

  // Login info
  @Column({ name: 'login_method', type: 'varchar', length: 50, default: 'password' })
  loginMethod: string; // password, sms, oauth, api_key

  @Column({ name: 'login_provider', type: 'varchar', length: 50, nullable: true })
  loginProvider: string; // google, telegram, etc.

  // Status
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_suspicious', type: 'boolean', default: false })
  isSuspicious: boolean;

  @Column({ name: 'suspicious_reason', type: 'text', nullable: true })
  suspiciousReason: string;

  // Activity tracking
  @Column({ name: 'last_activity_at', type: 'timestamptz', nullable: true })
  lastActivityAt: Date;

  @Column({ name: 'actions_count', type: 'int', default: 0 })
  actionsCount: number;

  // Timestamps
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date;

  @Column({ name: 'end_reason', type: 'varchar', length: 50, nullable: true })
  endReason: string; // logout, timeout, forced, token_revoked
}

/**
 * AuditReport - Generated audit reports for compliance
 */
@Entity('audit_reports')
@Index(['organizationId', 'created_at'])
@Index(['reportType'])
export class AuditReport extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'report_type', type: 'varchar', length: 50 })
  reportType: string; // activity, security, compliance, access, changes

  @Column({ type: 'text', nullable: true })
  description: string;

  // Report parameters
  @Column({ name: 'date_from', type: 'timestamptz' })
  dateFrom: Date;

  @Column({ name: 'date_to', type: 'timestamptz' })
  dateTo: Date;

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, any>;

  // Report content
  @Column({ type: 'jsonb', nullable: true })
  summary: {
    totalEvents: number;
    byAction: Record<string, number>;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byUser: Record<string, number>;
    byEntity: Record<string, number>;
  };

  @Column({ type: 'jsonb', nullable: true })
  highlights: {
    securityEvents: number;
    failedLogins: number;
    dataExports: number;
    permissionChanges: number;
    suspiciousActivities: number;
  };

  // File storage
  @Column({ name: 'file_path', type: 'varchar', length: 500, nullable: true })
  filePath: string;

  @Column({ name: 'file_format', type: 'varchar', length: 10, default: 'pdf' })
  fileFormat: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number;

  // Generation info
  @Column({ name: 'generated_by', type: 'uuid', nullable: true })
  generatedBy: string;

  @Column({ name: 'generation_duration_ms', type: 'int', nullable: true })
  generationDurationMs: number;

  @Column({ type: 'varchar', length: 20, default: 'completed' })
  status: string; // pending, generating, completed, failed

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;
}
