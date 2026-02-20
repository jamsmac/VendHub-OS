/**
 * Audit Service for VendHub OS
 * Provides methods for querying and managing audit logs
 */

import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuditLog,
  AuditSnapshot,
  AuditRetentionPolicy,
  AuditAlert,
  AuditAlertHistory,
  AuditSession,
  AuditReport,
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditContext,
  AuditDeviceInfo,
  AuditGeoLocation,
} from './entities/audit.entity';

// ============================================================================
// DTOs
// ============================================================================

export interface CreateAuditLogDto {
  organizationId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  action: AuditAction;
  category?: AuditCategory;
  severity?: AuditSeverity;
  description?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: any[];
  affectedFields?: string[];
  context?: AuditContext;
  ipAddress?: string;
  deviceInfo?: AuditDeviceInfo;
  geoLocation?: AuditGeoLocation;
  metadata?: Record<string, any>;
  tags?: string[];
  isSuccess?: boolean;
  errorMessage?: string;
}

export interface QueryAuditLogsDto {
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

export interface CreateSessionDto {
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
  ) {}

  // ============================================================================
  // AUDIT LOG METHODS
  // ============================================================================

  /**
   * Create a manual audit log entry
   */
  async createAuditLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    const retentionDays = await this.getRetentionDays(
      dto.organizationId || '',
      dto.entityType,
    );

    const auditLog = this.auditLogRepo.create({
      ...dto,
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
  async queryAuditLogs(query: QueryAuditLogsDto): Promise<AuditLogsPaginatedResponse> {
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
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.auditLogRepo.createQueryBuilder('audit');

    // Apply filters
    if (organizationId) {
      qb.andWhere('audit.organizationId = :organizationId', { organizationId });
    }

    if (userId) {
      qb.andWhere('audit.userId = :userId', { userId });
    }

    if (entityType) {
      qb.andWhere('audit.entityType = :entityType', { entityType });
    }

    if (entityId) {
      qb.andWhere('audit.entityId = :entityId', { entityId });
    }

    if (actions?.length) {
      qb.andWhere('audit.action IN (:...actions)', { actions });
    }

    if (categories?.length) {
      qb.andWhere('audit.category IN (:...categories)', { categories });
    }

    if (severities?.length) {
      qb.andWhere('audit.severity IN (:...severities)', { severities });
    }

    if (dateFrom) {
      qb.andWhere('audit.createdAt >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('audit.createdAt <= :dateTo', { dateTo });
    }

    if (search) {
      qb.andWhere(
        '(audit.description ILIKE :search OR audit.entityName ILIKE :search OR audit.userEmail ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (tags?.length) {
      qb.andWhere('audit.tags && :tags', { tags });
    }

    if (isSuccess !== undefined) {
      qb.andWhere('audit.isSuccess = :isSuccess', { isSuccess });
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
      order: { created_at: 'DESC' },
      take: options?.limit || 100,
    });

    let snapshots: AuditSnapshot[] | undefined;
    if (options?.includeSnapshots) {
      snapshots = await this.snapshotRepo.find({
        where: { entityType, entityId },
        order: { created_at: 'DESC' },
      });
    }

    return { logs, snapshots };
  }

  /**
   * Get audit statistics for dashboard
   */
  async getStatistics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<AuditStatistics> {
    const qb = this.auditLogRepo.createQueryBuilder('audit');
    qb.where('audit.organizationId = :organizationId', { organizationId });
    qb.andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
      dateFrom,
      dateTo,
    });

    // Total events
    const totalEvents = await qb.getCount();

    // By action
    const byActionRaw = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('audit.organizationId = :organizationId', { organizationId })
      .andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      })
      .groupBy('audit.action')
      .getRawMany();

    const byAction: Record<string, number> = {};
    byActionRaw.forEach((r) => (byAction[r.action] = parseInt(r.count)));

    // By category
    const byCategoryRaw = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('audit.organizationId = :organizationId', { organizationId })
      .andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      })
      .groupBy('audit.category')
      .getRawMany();

    const byCategory: Record<string, number> = {};
    byCategoryRaw.forEach((r) => (byCategory[r.category] = parseInt(r.count)));

    // By severity
    const bySeverityRaw = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where('audit.organizationId = :organizationId', { organizationId })
      .andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      })
      .groupBy('audit.severity')
      .getRawMany();

    const bySeverity: Record<string, number> = {};
    bySeverityRaw.forEach((r) => (bySeverity[r.severity] = parseInt(r.count)));

    // By entity type
    const byEntityTypeRaw = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.entityType', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .where('audit.organizationId = :organizationId', { organizationId })
      .andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      })
      .groupBy('audit.entityType')
      .getRawMany();

    const byEntityType: Record<string, number> = {};
    byEntityTypeRaw.forEach(
      (r) => (byEntityType[r.entityType] = parseInt(r.count)),
    );

    // By user (top 10)
    const byUserRaw = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select('audit.userId', 'userId')
      .addSelect('audit.userName', 'userName')
      .addSelect('COUNT(*)', 'count')
      .where('audit.organizationId = :organizationId', { organizationId })
      .andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      })
      .andWhere('audit.userId IS NOT NULL')
      .groupBy('audit.userId')
      .addGroupBy('audit.userName')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const byUser = byUserRaw.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      count: parseInt(r.count),
    }));

    // Recent activity (last 30 days)
    const recentActivityRaw = await this.auditLogRepo
      .createQueryBuilder('audit')
      .select("DATE_TRUNC('day', audit.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('audit.organizationId = :organizationId', { organizationId })
      .andWhere('audit.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom,
        dateTo,
      })
      .groupBy("DATE_TRUNC('day', audit.createdAt)")
      .orderBy('date', 'ASC')
      .getRawMany();

    const recentActivity = recentActivityRaw.map((r) => ({
      date: r.date,
      count: parseInt(r.count),
    }));

    // Security events
    const securityEvents = await this.auditLogRepo.count({
      where: {
        organizationId,
        category: AuditCategory.SECURITY,
        created_at: Between(dateFrom, dateTo),
      },
    });

    // Failed operations
    const failedOperations = await this.auditLogRepo.count({
      where: {
        organizationId,
        isSuccess: false,
        created_at: Between(dateFrom, dateTo),
      },
    });

    return {
      totalEvents,
      byAction,
      byCategory,
      bySeverity,
      byEntityType,
      byUser,
      recentActivity,
      securityEvents,
      failedOperations,
    };
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
    snapshot: Record<string, any>,
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
      order: { created_at: 'DESC' },
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
  async createSession(dto: CreateSessionDto): Promise<AuditSession> {
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
      entityType: 'session',
      entityId: saved.id,
      action: AuditAction.LOGIN,
      category: AuditCategory.AUTHENTICATION,
      severity: AuditSeverity.INFO,
      description: `User logged in via ${dto.loginMethod || 'password'}`,
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
    reason: string = 'logout',
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
      entityType: 'session',
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
      actionsCount: () => 'actions_count + 1',
    });
  }

  /**
   * Get active sessions for user
   */
  async getUserSessions(
    userId: string,
    activeOnly: boolean = true,
  ): Promise<AuditSession[]> {
    const where: any = { userId };
    if (activeOnly) {
      where.isActive = true;
    }

    return this.sessionRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Terminate all user sessions
   */
  async terminateAllUserSessions(
    userId: string,
    reason: string = 'forced',
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
        entityType: 'session',
        entityId: sessionId,
        action: AuditAction.LOGIN,
        category: AuditCategory.SECURITY,
        severity: AuditSeverity.WARNING,
        description: `Session marked as suspicious: ${reason}`,
        tags: ['suspicious', 'security'],
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
    } catch (error: any) {
      this.logger.error(`Failed to check alerts: ${error.message}`);
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
          created_at: MoreThan(windowStart),
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
      triggerCount: () => 'trigger_count + 1',
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
          type: 'system' as any,
          title: `Audit Alert: ${alert.name}`,
          body: `Triggered by ${log.action} on ${log.entityType}. ${history.triggerReason}`,
          titleUz: `Audit Ogohlantirish: ${alert.name}`,
          bodyUz: `${log.action} harakati ${log.entityType} da amalga oshirildi`,
          channels: ['in_app', 'push'] as any[],
          priority: 'high' as any,
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
      policy.updated_at = new Date();
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
    const result = await this.auditLogRepo.delete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.log(`Cleaned up ${result.affected} expired audit logs`);
    return result.affected || 0;
  }

  /**
   * Clean up expired snapshots
   */
  async cleanupExpiredSnapshots(): Promise<number> {
    const result = await this.snapshotRepo.delete({
      expiresAt: LessThan(new Date()),
    });

    this.logger.log(`Cleaned up ${result.affected} expired snapshots`);
    return result.affected || 0;
  }

  // ============================================================================
  // REPORT METHODS
  // ============================================================================

  /**
   * Generate audit report
   */
  async generateReport(
    organizationId: string,
    reportType: string,
    dateFrom: Date,
    dateTo: Date,
    filters?: Record<string, any>,
    generatedBy?: string,
  ): Promise<AuditReport> {
    const startTime = Date.now();

    // Create report record
    const report = this.reportRepo.create({
      organizationId,
      name: `${reportType} Report - ${dateFrom.toISOString().split('T')[0]}`,
      reportType,
      dateFrom,
      dateTo,
      filters,
      generatedBy,
      status: 'generating',
    });

    await this.reportRepo.save(report);

    try {
      // Get statistics
      const stats = await this.getStatistics(organizationId, dateFrom, dateTo);

      report.summary = {
        totalEvents: stats.totalEvents,
        byAction: stats.byAction,
        byCategory: stats.byCategory,
        bySeverity: stats.bySeverity,
        byUser: stats.byUser.reduce(
          (acc, u) => ({ ...acc, [u.userId]: u.count }),
          {},
        ),
        byEntity: stats.byEntityType,
      };

      report.highlights = {
        securityEvents: stats.securityEvents,
        failedLogins: stats.byAction[AuditAction.LOGIN_FAILED] || 0,
        dataExports: stats.byAction[AuditAction.EXPORT] || 0,
        permissionChanges: stats.byAction[AuditAction.PERMISSION_CHANGE] || 0,
        suspiciousActivities: stats.securityEvents,
      };

      report.status = 'completed';
      report.generationDurationMs = Date.now() - startTime;

      await this.reportRepo.save(report);

      return report;
    } catch (error: any) {
      report.status = 'failed';
      report.errorMessage = error.message;
      await this.reportRepo.save(report);
      throw error;
    }
  }

  /**
   * Get reports for organization
   */
  async getReports(
    organizationId: string,
    limit: number = 20,
  ): Promise<AuditReport[]> {
    return this.reportRepo.find({
      where: { organizationId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
