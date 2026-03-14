/**
 * Audit Reporting Service — extracted from AuditService
 * Handles statistics aggregation, report generation, and report listing
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import {
  AuditLog,
  AuditReport,
  AuditAction,
  AuditCategory,
} from "../entities/audit.entity";
import type { AuditStatistics } from "../audit.service";

@Injectable()
export class AuditReportingService {
  private readonly logger = new Logger(AuditReportingService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>,
    @InjectRepository(AuditReport)
    private reportRepo: Repository<AuditReport>,
  ) {}

  // ============================================================================
  // STATISTICS
  // ============================================================================

  async getStatistics(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<AuditStatistics> {
    const qb = this.auditLogRepo.createQueryBuilder("audit");
    qb.where("audit.organizationId = :organizationId", { organizationId });
    qb.andWhere("audit.createdAt BETWEEN :dateFrom AND :dateTo", {
      dateFrom,
      dateTo,
    });

    // Total events
    const totalEvents = await qb.getCount();

    // By action
    const byActionRaw = await this.auditLogRepo
      .createQueryBuilder("audit")
      .select("audit.action", "action")
      .addSelect("COUNT(*)", "count")
      .where("audit.organizationId = :organizationId", { organizationId })
      .andWhere("audit.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .groupBy("audit.action")
      .getRawMany();

    const byAction: Record<string, number> = {};
    byActionRaw.forEach((r) => (byAction[r.action] = parseInt(r.count)));

    // By category
    const byCategoryRaw = await this.auditLogRepo
      .createQueryBuilder("audit")
      .select("audit.category", "category")
      .addSelect("COUNT(*)", "count")
      .where("audit.organizationId = :organizationId", { organizationId })
      .andWhere("audit.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .groupBy("audit.category")
      .getRawMany();

    const byCategory: Record<string, number> = {};
    byCategoryRaw.forEach((r) => (byCategory[r.category] = parseInt(r.count)));

    // By severity
    const bySeverityRaw = await this.auditLogRepo
      .createQueryBuilder("audit")
      .select("audit.severity", "severity")
      .addSelect("COUNT(*)", "count")
      .where("audit.organizationId = :organizationId", { organizationId })
      .andWhere("audit.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .groupBy("audit.severity")
      .getRawMany();

    const bySeverity: Record<string, number> = {};
    bySeverityRaw.forEach((r) => (bySeverity[r.severity] = parseInt(r.count)));

    // By entity type
    const byEntityTypeRaw = await this.auditLogRepo
      .createQueryBuilder("audit")
      .select("audit.entityType", "entityType")
      .addSelect("COUNT(*)", "count")
      .where("audit.organizationId = :organizationId", { organizationId })
      .andWhere("audit.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .groupBy("audit.entityType")
      .getRawMany();

    const byEntityType: Record<string, number> = {};
    byEntityTypeRaw.forEach(
      (r) => (byEntityType[r.entityType] = parseInt(r.count)),
    );

    // By user (top 10)
    const byUserRaw = await this.auditLogRepo
      .createQueryBuilder("audit")
      .select("audit.userId", "userId")
      .addSelect("audit.userName", "userName")
      .addSelect("COUNT(*)", "count")
      .where("audit.organizationId = :organizationId", { organizationId })
      .andWhere("audit.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .andWhere("audit.userId IS NOT NULL")
      .groupBy("audit.userId")
      .addGroupBy("audit.userName")
      .orderBy("count", "DESC")
      .limit(10)
      .getRawMany();

    const byUser = byUserRaw.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      count: parseInt(r.count),
    }));

    // Recent activity (last 30 days)
    const recentActivityRaw = await this.auditLogRepo
      .createQueryBuilder("audit")
      .select("DATE_TRUNC('day', audit.createdAt)", "date")
      .addSelect("COUNT(*)", "count")
      .where("audit.organizationId = :organizationId", { organizationId })
      .andWhere("audit.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .groupBy("DATE_TRUNC('day', audit.createdAt)")
      .orderBy("date", "ASC")
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
        createdAt: Between(dateFrom, dateTo),
      },
    });

    // Failed operations
    const failedOperations = await this.auditLogRepo.count({
      where: {
        organizationId,
        isSuccess: false,
        createdAt: Between(dateFrom, dateTo),
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
  // REPORT METHODS
  // ============================================================================

  async generateReport(
    organizationId: string,
    reportType: string,
    dateFrom: Date,
    dateTo: Date,
    filters?: Record<string, unknown>,
    generatedBy?: string,
  ): Promise<AuditReport> {
    const startTime = Date.now();

    // Create report record
    const report = this.reportRepo.create({
      organizationId,
      name: `${reportType} Report - ${dateFrom.toISOString().split("T")[0]}`,
      reportType,
      dateFrom,
      dateTo,
      filters,
      generatedBy,
      status: "generating",
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

      report.status = "completed";
      report.generationDurationMs = Date.now() - startTime;

      await this.reportRepo.save(report);

      return report;
    } catch (error: unknown) {
      report.status = "failed";
      report.errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.reportRepo.save(report);
      throw error;
    }
  }

  async getReports(
    organizationId: string,
    limit: number = 20,
  ): Promise<AuditReport[]> {
    return this.reportRepo.find({
      where: { organizationId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
