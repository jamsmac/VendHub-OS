/**
 * Audit Service for VendHub OS
 * Provides methods for querying and managing audit logs
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, MoreThan, FindOptionsWhere } from "typeorm";
import { NotificationsService } from "../notifications/notifications.service";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "../notifications/entities/notification.entity";
import {
  AuditLog,
  AuditSnapshot,
  AuditRetentionPolicy,
  AuditAlert,
  AuditAlertHistory,
  AuditSession,
  AuditReport,
  AuditAction,
  AuditEventType,
  AuditCategory,
  AuditSeverity,
  AuditContext,
  AuditDeviceInfo,
  AuditGeoLocation,
} from "./entities/audit.entity";
import { AuditReportingService } from "./services/audit-reporting.service";

// ============================================================================
// INTERNAL INTERFACES (for programmatic/service-to-service calls)
// For REST API DTOs with class-validator, see ./dto/
// ============================================================================

export interface CreateAuditLogInput {
  organizationId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  action: AuditAction;
  eventType?: AuditEventType;
  category?: AuditCategory;
  severity?: AuditSeverity;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changes?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  affectedFields?: string[];
  context?: AuditContext;
  ipAddress?: string;
  deviceInfo?: AuditDeviceInfo;
  geoLocation?: AuditGeoLocation;
  metadata?: Record<string, unknown>;
  tags?: string[];
  isSuccess?: boolean;
  errorMessage?: string;
}

export interface QueryAuditLogsInput {
  organizationId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  actions?: AuditAction[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  dateFrom?: Date | string;
  dateTo?: Date | string;
  search?: string;
  tags?: string[];
  isSuccess?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface AuditLogsPaginatedResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStatistics {
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

export interface CreateSessionInput {
  userId: string;
  organizationId?: string;
  ipAddress?: string;
  deviceInfo?: AuditDeviceInfo;
  geoLocation?: AuditGeoLocation;
  loginMethod?: string;
  loginProvider?: string;
  sessionTokenHash?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

const ACTION_TO_EVENT_TYPE: Record<AuditAction, AuditEventType> = {
  [AuditAction.CREATE]: AuditEventType.ACCOUNT_CREATED,
  [AuditAction.UPDATE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.DELETE]: AuditEventType.ACCOUNT_DELETED,
  [AuditAction.SOFT_DELETE]: AuditEventType.ACCOUNT_DELETED,
  [AuditAction.RESTORE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.LOGIN]: AuditEventType.LOGIN_SUCCESS,
  [AuditAction.LOGOUT]: AuditEventType.LOGOUT,
  [AuditAction.LOGIN_FAILED]: AuditEventType.LOGIN_FAILED,
  [AuditAction.PASSWORD_CHANGE]: AuditEventType.PASSWORD_CHANGED,
  [AuditAction.PASSWORD_RESET]: AuditEventType.PASSWORD_RESET_COMPLETED,
  [AuditAction.PERMISSION_CHANGE]: AuditEventType.PERMISSION_CHANGED,
  [AuditAction.SETTINGS_CHANGE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.EXPORT]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.IMPORT]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.BULK_UPDATE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.BULK_DELETE]: AuditEventType.ACCOUNT_DELETED,
  [AuditAction.API_CALL]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.WEBHOOK_RECEIVED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.PAYMENT_PROCESSED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.REFUND_ISSUED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.REPORT_GENERATED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.NOTIFICATION_SENT]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.TASK_ASSIGNED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.TASK_COMPLETED]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.MACHINE_STATUS_CHANGE]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.INVENTORY_ADJUSTMENT]: AuditEventType.ACCOUNT_UPDATED,
  [AuditAction.FISCAL_OPERATION]: AuditEventType.ACCOUNT_UPDATED,
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    @InjectRepository(AuditSnapshot)
    private snapshotRepo: Repository<AuditSnapshot>,
    @InjectRepository(AuditRetentionPolicy)
    private retentionPolicyRepo: Repository<AuditRetentionPolicy>,
    @InjectRepository(AuditAlert)
    private alertRepo: Repository<AuditAlert>,
    @InjectRepository(AuditAlertHistory)
    private alertHistoryRepo: Repository<AuditAlertHistory>,
    @InjectRepository(AuditSession)
    private sessionRepo: Repository<AuditSession>,
    @InjectRepository(AuditReport)
    private reportRepo: Repository<AuditReport>,
    @Optional()
    private readonly notificationsService: NotificationsService,
    private readonly auditReportingService: AuditReportingService,
  ) {}

  // ============================================================================
  // AUDIT LOG METHODS
  // ============================================================================

  /**
   * Create a manual audit log entry
   */
  async createAuditLog(dto: CreateAuditLogInput): Promise<AuditLog> {
    const retentionDays = await this.getRetentionDays(
      dto.organizationId || "",
      dto.entityType,
    );

    const auditLog = this.auditLogRepo.create({
      ...dto,
      eventType:
        dto.eventType ||
        ACTION_TO_EVENT_TYPE[dto.action] ||
        AuditEventType.ACCOUNT_UPDATED,
      category: dto.category || AuditCategory.DATA_MODIFICATION,
      severity: dto.severity || AuditSeverity.INFO,
      isSuccess: dto.isSuccess ?? true,
      retentionDays,
      expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
    });

    const saved = await this.auditLogRepo.save(auditLog);

    // Check for alerts
    await this.checkAlerts(saved);

    return saved;
  }

  /**
   * Query audit logs with filters and pagination
   */
  async queryAuditLogs(
    query: QueryAuditLogsInput,
  ): Promise<AuditLogsPaginatedResponse> {
    const {
      organizationId,
      userId,
      entityType,
      entityId,
      actions,
      categories,
      severities,
      dateFrom,
      dateTo,
      search,
      tags,
      isSuccess,
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = query;

    const qb = this.auditLogRepo.createQueryBuilder("audit");

    // Apply filters
    if (organizationId) {
      qb.andWhere("audit.organizationId = :organizationId", { organizationId });
    }

    if (userId) {
      qb.andWhere("audit.userId = :userId", { userId });
    }

    if (entityType) {
      qb.andWhere("audit.entityType = :entityType", { entityType });
    }

    if (entityId) {
      qb.andWhere("audit.entityId = :entityId", { entityId });
    }

    if (actions?.length) {
      qb.andWhere("audit.action IN (:...actions)", { actions });
    }

    if (categories?.length) {
      qb.andWhere("audit.category IN (:...categories)", { categories });
    }

    if (severities?.length) {
      qb.andWhere("audit.severity IN (:...severities)", { severities });
    }

    if (dateFrom) {
      qb.andWhere("audit.createdAt >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("audit.createdAt <= :dateTo", { dateTo });
    }

    if (search) {
      qb.andWhere(
        "(audit.description ILIKE :search OR audit.entityName ILIKE :search OR audit.userEmail ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (tags?.length) {
      qb.andWhere("audit.tags && :tags", { tags });
    }

    if (isSuccess !== undefined) {
      qb.andWhere("audit.isSuccess = :isSuccess", { isSuccess });
    }

    // Get total count
    const total = await qb.getCount();

    // Apply sorting and pagination
    qb.orderBy(`audit.${sortBy}`, sortOrder);
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
   * Get single audit log by ID
   */
  async getAuditLogById(id: string): Promise<AuditLog> {
    const log = await this.auditLogRepo.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Audit log ${id} not found`);
    }
    return log;
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    options?: { limit?: number; includeSnapshots?: boolean },
  ): Promise<{ logs: AuditLog[]; snapshots?: AuditSnapshot[] }> {
    const logs = await this.auditLogRepo.find({
      where: { entityType, entityId },
      order: { createdAt: "DESC" },
      take: options?.limit || 100,
    });

    let snapshots: AuditSnapshot[] | undefined;
    if (options?.includeSnapshots) {
      snapshots = await this.snapshotRepo.find({
        where: { entityType, entityId },
        order: { createdAt: "DESC" },
      });
    }

    return { logs, snapshots };
  }

  /**
   * Get audit statistics for dashboard — delegated to AuditReportingService
   */
  async getStatistics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<AuditStatistics> {
    return this.auditReportingService.getStatistics(
      organizationId,
      dateFrom,
      dateTo,
    );
  }

  // ============================================================================
  // SNAPSHOT METHODS
  // ============================================================================

  /**
   * Create entity snapshot
   */
  async createSnapshot(
    organizationId: string,
    entityType: string,
    entityId: string,
    snapshot: Record<string, unknown>,
    options?: {
      entityName?: string;
      snapshotReason?: string;
      createdBy?: string;
    },
  ): Promise<AuditSnapshot> {
    const retentionDays = await this.getSnapshotRetentionDays(
      organizationId,
      entityType,
    );

    const entity = this.snapshotRepo.create({
      organizationId,
      entityType,
      entityId,
      entityName: options?.entityName,
      snapshot,
      snapshotReason: options?.snapshotReason,
      createdBy: options?.createdBy,
      retentionDays,
      expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000),
    });

    return this.snapshotRepo.save(entity);
  }

  /**
   * Get snapshots for entity
   */
  async getSnapshots(
    entityType: string,
    entityId: string,
  ): Promise<AuditSnapshot[]> {
    return this.snapshotRepo.find({
      where: { entityType, entityId },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get single snapshot
   */
  async getSnapshot(id: string): Promise<AuditSnapshot> {
    const snapshot = await this.snapshotRepo.findOne({ where: { id } });
    if (!snapshot) {
      throw new NotFoundException(`Snapshot ${id} not found`);
    }
    return snapshot;
  }

  // ============================================================================
  // SESSION METHODS
  // ============================================================================

  /**
   * Create new session
   */
  async createSession(dto: CreateSessionInput): Promise<AuditSession> {
    const session = this.sessionRepo.create({
      ...dto,
      isActive: true,
      actionsCount: 0,
      lastActivityAt: new Date(),
    });

    const saved = await this.sessionRepo.save(session);

    // Log login event
    await this.createAuditLog({
      organizationId: dto.organizationId,
      userId: dto.userId,
      entityType: "session",
      entityId: saved.id,
      action: AuditAction.LOGIN,
      category: AuditCategory.AUTHENTICATION,
      severity: AuditSeverity.INFO,
      description: `User logged in via ${dto.loginMethod || "password"}`,
      ipAddress: dto.ipAddress,
      deviceInfo: dto.deviceInfo,
      geoLocation: dto.geoLocation,
    });

    return saved;
  }

  /**
   * End session
   */
  async endSession(
    sessionId: string,
    reason: string = "logout",
  ): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      return;
    }

    session.isActive = false;
    session.endedAt = new Date();
    session.endReason = reason;

    await this.sessionRepo.save(session);

    // Log logout event
    await this.createAuditLog({
      organizationId: session.organizationId,
      userId: session.userId,
      entityType: "session",
      entityId: sessionId,
      action: AuditAction.LOGOUT,
      category: AuditCategory.AUTHENTICATION,
      severity: AuditSeverity.INFO,
      description: `User logged out (${reason})`,
    });
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      lastActivityAt: new Date(),
      actionsCount: () => "actions_count + 1",
    });
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(
    userId: string,
    activeOnly: boolean = true,
  ): Promise<AuditSession[]> {
    const where: FindOptionsWhere<AuditSession> = { userId };
    if (activeOnly) {
      where.isActive = true;
    }

    return this.sessionRepo.find({
      where,
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Terminate all user sessions
   */
  async terminateAllUserSessions(
    userId: string,
    reason: string = "forced",
  ): Promise<number> {
    const sessions = await this.sessionRepo.find({
      where: { userId, isActive: true },
    });

    for (const session of sessions) {
      await this.endSession(session.id, reason);
    }

    return sessions.length;
  }

  /**
   * Mark session as suspicious
   */
  async markSessionSuspicious(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      isSuspicious: true,
      suspiciousReason: reason,
    });

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (session) {
      await this.createAuditLog({
        organizationId: session.organizationId,
        userId: session.userId,
        entityType: "session",
        entityId: sessionId,
        action: AuditAction.LOGIN,
        category: AuditCategory.SECURITY,
        severity: AuditSeverity.WARNING,
        description: `Session marked as suspicious: ${reason}`,
        tags: ["suspicious", "security"],
      });
    }
  }

  // ============================================================================
  // ALERT METHODS
  // ============================================================================

  /**
   * Check if any alerts should be triggered
   */
  private async checkAlerts(log: AuditLog): Promise<void> {
    try {
      const alerts = await this.alertRepo.find({
        where: {
          organizationId: log.organizationId,
          isActive: true,
        },
      });

      for (const alert of alerts) {
        if (await this.shouldTriggerAlert(alert, log)) {
          await this.triggerAlert(alert, log);
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to check alerts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if alert should be triggered for log
   */
  private async shouldTriggerAlert(
    alert: AuditAlert,
    log: AuditLog,
  ): Promise<boolean> {
    // Check cooldown
    if (alert.lastTriggeredAt) {
      const cooldownMs = alert.cooldownMinutes * 60 * 1000;
      if (Date.now() - alert.lastTriggeredAt.getTime() < cooldownMs) {
        return false;
      }
    }

    // Check actions
    if (alert.actions?.length && !alert.actions.includes(log.action)) {
      return false;
    }

    // Check categories
    if (alert.categories?.length && !alert.categories.includes(log.category)) {
      return false;
    }

    // Check severities
    if (alert.severities?.length && !alert.severities.includes(log.severity)) {
      return false;
    }

    // Check entity types
    if (
      alert.entityTypes?.length &&
      !alert.entityTypes.includes(log.entityType)
    ) {
      return false;
    }

    // Check threshold if configured
    if (alert.thresholdCount && alert.thresholdWindowMinutes) {
      const windowStart = new Date(
        Date.now() - alert.thresholdWindowMinutes * 60 * 1000,
      );
      const count = await this.auditLogRepo.count({
        where: {
          organizationId: log.organizationId,
          action: log.action,
          createdAt: MoreThan(windowStart),
        },
      });

      if (count < alert.thresholdCount) {
        return false;
      }
    }

    return true;
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(alert: AuditAlert, log: AuditLog): Promise<void> {
    // Create alert history
    const history = this.alertHistoryRepo.create({
      alertId: alert.id,
      organizationId: log.organizationId,
      triggeredAt: new Date(),
      triggerReason: `Triggered by ${log.action} on ${log.entityType}`,
      matchedEventsCount: 1,
      matchedEventIds: [log.id],
    });

    await this.alertHistoryRepo.save(history);

    // Update alert
    await this.alertRepo.update(alert.id, {
      lastTriggeredAt: new Date(),
      triggerCount: () => "trigger_count + 1",
    });

    this.logger.warn(
      `Alert "${alert.name}" triggered for org ${log.organizationId}`,
    );

    // Send notification via NotificationsService
    if (this.notificationsService) {
      try {
        await this.notificationsService.create({
          organizationId: log.organizationId,
          userId: log.userId,
          type: NotificationType.SYSTEM,
          title: `Audit Alert: ${alert.name}`,
          body: `Triggered by ${log.action} on ${log.entityType}. ${history.triggerReason}`,
          titleUz: `Audit Ogohlantirish: ${alert.name}`,
          bodyUz: `${log.action} harakati ${log.entityType} da amalga oshirildi`,
          channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
          priority: NotificationPriority.HIGH,
          actionUrl: `/dashboard/audit?alertId=${alert.id}`,
          data: {
            alertId: alert.id,
            alertHistoryId: history.id,
            auditLogId: log.id,
            entityType: log.entityType,
            action: log.action,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to send audit alert notification: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  }

  // ============================================================================
  // RETENTION POLICY METHODS
  // ============================================================================

  /**
   * Get retention days for entity type
   */
  private async getRetentionDays(
    organizationId: string,
    entityType: string,
  ): Promise<number> {
    const policy = await this.retentionPolicyRepo.findOne({
      where: { organizationId, entityType, isActive: true },
    });

    return policy?.retentionDays || 365;
  }

  /**
   * Get snapshot retention days for entity type
   */
  private async getSnapshotRetentionDays(
    organizationId: string,
    entityType: string,
  ): Promise<number> {
    const policy = await this.retentionPolicyRepo.findOne({
      where: { organizationId, entityType, isActive: true },
    });

    return policy?.snapshotRetentionDays || 2555;
  }

  /**
   * Create or update retention policy
   */
  async upsertRetentionPolicy(
    organizationId: string,
    entityType: string,
    data: Partial<AuditRetentionPolicy>,
  ): Promise<AuditRetentionPolicy> {
    let policy = await this.retentionPolicyRepo.findOne({
      where: { organizationId, entityType },
    });

    if (policy) {
      Object.assign(policy, data);
      policy.updatedAt = new Date();
    } else {
      policy = this.retentionPolicyRepo.create({
        organizationId,
        entityType,
        ...data,
      });
    }

    return this.retentionPolicyRepo.save(policy);
  }

  // ============================================================================
  // CLEANUP METHODS
  // ============================================================================

  /**
   * Clean up expired audit logs
   */
  async cleanupExpiredLogs(): Promise<number> {
    const result = await this.auditLogRepo.softDelete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.log(`Cleaned up ${result.affected} expired audit logs`);
    return result.affected || 0;
  }

  /**
   * Clean up expired snapshots
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    const result = await this.snapshotRepo.softDelete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.log(`Cleaned up ${result.affected} expired snapshots`);
    return result.affected || 0;
  }

  // ============================================================================
  // REPORT METHODS — delegated to AuditReportingService
  // ============================================================================

  /**
   * Generate audit report
   */
  async generateReport(
    organizationId: string,
    reportType: string,
    dateFrom: Date,
    dateTo: Date,
    filters?: Record<string, unknown>,
    generatedBy?: string,
  ): Promise<AuditReport> {
    return this.auditReportingService.generateReport(
      organizationId,
      reportType,
      dateFrom,
      dateTo,
      filters,
      generatedBy,
    );
  }

  /**
   * Get reports for organization
   */
  async getReports(
    organizationId: string,
    limit: number = 20,
  ): Promise<AuditReport[]> {
    return this.auditReportingService.getReports(organizationId, limit);
  }
}
