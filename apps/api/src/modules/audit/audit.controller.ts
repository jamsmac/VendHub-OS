// @ts-nocheck -- Railway build cache workaround
/**
 * Audit Controller for VendHub OS
 * REST API endpoints for audit trail management
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { AuditService, CreateAuditLogInput } from "./audit.service";
import {
  AuditLog,
  AuditSnapshot,
  AuditSession,
  AuditReport,
} from "./entities/audit.entity";
import { QueryAuditLogsDto } from "./dto/query-audit-logs.dto";
import { CreateAuditLogDto } from "./dto/create-audit-log.dto";
import { CreateSnapshotDto } from "./dto/create-snapshot.dto";
import { GenerateReportDto } from "./dto/generate-report.dto";
import { QueryStatisticsDto } from "./dto/query-statistics.dto";
import {
  EndSessionDto,
  TerminateAllSessionsDto,
  MarkSessionSuspiciousDto,
  QueryUserSessionsDto,
} from "./dto/audit-session.dto";
import { QueryEntityHistoryDto } from "./dto/query-entity-history.dto";
import { QueryReportsDto } from "./dto/query-reports.dto";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ICurrentUser } from "../../common/decorators/current-user.decorator";
import { UserRole } from "../../common/enums";

@ApiTags("Audit")
@ApiBearerAuth()
@Controller("audit")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  @Get("logs")
  @ApiOperation({ summary: "Query audit logs with filters" })
  @ApiResponse({ status: 200, description: "Paginated list of audit logs" })
  @Roles("owner", "admin", "manager")
  async queryLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditService.queryAuditLogs({
      organizationId: query.organization_id,
      userId: query.user_id,
      entityType: query.entity_type,
      entityId: query.entity_id,
      actions: query.actions,
      categories: query.categories,
      severities: query.severities,
      dateFrom: query.date_from,
      dateTo: query.date_to,
      search: query.search,
      tags: query.tags,
      isSuccess: query.is_success,
      page: query.page,
      limit: query.limit,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
    });
  }

  @Get("logs/:id")
  @ApiOperation({ summary: "Get audit log by ID" })
  @ApiParam({ name: "id", type: String, description: "Audit log UUID" })
  @ApiResponse({ status: 200, description: "Audit log details" })
  @ApiResponse({ status: 404, description: "Audit log not found" })
  @Roles("owner", "admin", "manager")
  async getLog(@Param("id", ParseUUIDPipe) id: string): Promise<AuditLog> {
    return this.auditService.getAuditLogById(id);
  }

  @Post("logs")
  @ApiOperation({ summary: "Create manual audit log entry" })
  @ApiResponse({ status: 201, description: "Audit log created" })
  @HttpCode(HttpStatus.CREATED)
  @Roles("owner", "admin")
  async createLog(
    @Body() dto: CreateAuditLogDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<AuditLog> {
    const organizationId =
      user.role === UserRole.OWNER && dto.organization_id
        ? dto.organization_id
        : user.organizationId;
    return this.auditService.createAuditLog({
      organizationId,
      userId: dto.user_id,
      userEmail: dto.user_email,
      userName: dto.user_name,
      userRole: dto.user_role,
      entityType: dto.entity_type,
      entityId: dto.entity_id,
      entityName: dto.entity_name,
      action: dto.action,
      category: dto.category,
      severity: dto.severity,
      description: dto.description,
      oldValues: dto.old_values,
      newValues: dto.new_values,
      changes: dto.changes as CreateAuditLogInput["changes"],
      affectedFields: dto.affected_fields,
      context: dto.context,
      ipAddress: dto.ip_address,
      deviceInfo: dto.device_info,
      geoLocation: dto.geo_location,
      metadata: dto.metadata,
      tags: dto.tags,
      isSuccess: dto.is_success,
      errorMessage: dto.error_message,
    });
  }

  // ============================================================================
  // ENTITY HISTORY
  // ============================================================================

  @Get("history/:entityType/:entityId")
  @ApiOperation({ summary: "Get audit history for specific entity" })
  @ApiParam({
    name: "entityType",
    type: String,
    description: "Entity type (table name)",
  })
  @ApiParam({ name: "entityId", type: String, description: "Entity UUID" })
  @ApiResponse({ status: 200, description: "Entity audit history" })
  @Roles("owner", "admin", "manager")
  async getEntityHistory(
    @Param("entityType") entityType: string,
    @Param("entityId", ParseUUIDPipe) entityId: string,
    @Query() query: QueryEntityHistoryDto,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId, {
      limit: query.limit,
      includeSnapshots: query.include_snapshots,
    });
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  @Get("statistics")
  @ApiOperation({ summary: "Get audit statistics for dashboard" })
  @ApiResponse({ status: 200, description: "Audit statistics" })
  @Roles("owner", "admin", "manager")
  async getStatistics(
    @Query() query: QueryStatisticsDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();
    return this.auditService.getStatistics(
      user.organizationId,
      dateFrom,
      dateTo,
    );
  }

  // ============================================================================
  // SNAPSHOTS
  // ============================================================================

  @Get("snapshots/:entityType/:entityId")
  @ApiOperation({ summary: "Get snapshots for entity" })
  @ApiParam({
    name: "entityType",
    type: String,
    description: "Entity type (table name)",
  })
  @ApiParam({ name: "entityId", type: String, description: "Entity UUID" })
  @ApiResponse({ status: 200, description: "List of entity snapshots" })
  @Roles("owner", "admin")
  async getSnapshots(
    @Param("entityType") entityType: string,
    @Param("entityId", ParseUUIDPipe) entityId: string,
  ): Promise<AuditSnapshot[]> {
    return this.auditService.getSnapshots(entityType, entityId);
  }

  @Get("snapshots/detail/:id")
  @ApiOperation({ summary: "Get snapshot by ID" })
  @ApiParam({ name: "id", type: String, description: "Snapshot UUID" })
  @ApiResponse({ status: 200, description: "Snapshot details" })
  @ApiResponse({ status: 404, description: "Snapshot not found" })
  @Roles("owner", "admin")
  async getSnapshot(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AuditSnapshot> {
    return this.auditService.getSnapshot(id);
  }

  @Post("snapshots")
  @ApiOperation({ summary: "Create entity snapshot" })
  @ApiResponse({ status: 201, description: "Snapshot created" })
  @HttpCode(HttpStatus.CREATED)
  @Roles("owner", "admin")
  async createSnapshot(
    @Body() dto: CreateSnapshotDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<AuditSnapshot> {
    const organizationId =
      user.role === UserRole.OWNER && dto.organization_id
        ? dto.organization_id
        : user.organizationId;
    return this.auditService.createSnapshot(
      organizationId,
      dto.entity_type,
      dto.entity_id,
      dto.snapshot,
      {
        entityName: dto.entity_name,
        snapshotReason: dto.snapshot_reason,
      },
    );
  }

  // ============================================================================
  // SESSIONS
  // ============================================================================

  @Get("sessions/user/:userId")
  @ApiOperation({ summary: "Get sessions for user" })
  @ApiParam({ name: "userId", type: String, description: "User UUID" })
  @ApiResponse({ status: 200, description: "List of user sessions" })
  @Roles("owner", "admin")
  async getUserSessions(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Query() query: QueryUserSessionsDto,
  ): Promise<AuditSession[]> {
    return this.auditService.getUserSessions(
      userId,
      query.active_only !== false,
    );
  }

  @Post("sessions/:sessionId/end")
  @ApiOperation({ summary: "End a session" })
  @ApiParam({ name: "sessionId", type: String, description: "Session UUID" })
  @ApiResponse({ status: 200, description: "Session ended" })
  @HttpCode(HttpStatus.OK)
  @Roles("owner", "admin")
  async endSession(
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
    @Body() dto: EndSessionDto,
  ): Promise<void> {
    return this.auditService.endSession(
      sessionId,
      dto.reason || "admin_forced",
    );
  }

  @Post("sessions/user/:userId/terminate-all")
  @ApiOperation({ summary: "Terminate all user sessions" })
  @ApiParam({ name: "userId", type: String, description: "User UUID" })
  @ApiResponse({ status: 200, description: "Sessions terminated" })
  @HttpCode(HttpStatus.OK)
  @Roles("owner", "admin")
  async terminateAllUserSessions(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() dto: TerminateAllSessionsDto,
  ): Promise<{ terminated: number }> {
    const count = await this.auditService.terminateAllUserSessions(
      userId,
      dto.reason || "admin_forced",
    );
    return { terminated: count };
  }

  @Post("sessions/:sessionId/suspicious")
  @ApiOperation({ summary: "Mark session as suspicious" })
  @ApiParam({ name: "sessionId", type: String, description: "Session UUID" })
  @ApiResponse({ status: 200, description: "Session marked as suspicious" })
  @HttpCode(HttpStatus.OK)
  @Roles("owner", "admin")
  async markSessionSuspicious(
    @Param("sessionId", ParseUUIDPipe) sessionId: string,
    @Body() dto: MarkSessionSuspiciousDto,
  ): Promise<void> {
    return this.auditService.markSessionSuspicious(sessionId, dto.reason);
  }

  // ============================================================================
  // REPORTS
  // ============================================================================

  @Get("reports")
  @ApiOperation({ summary: "Get audit reports for organization" })
  @ApiResponse({ status: 200, description: "List of audit reports" })
  @Roles("owner", "admin", "manager")
  async getReports(@Query() query: QueryReportsDto): Promise<AuditReport[]> {
    return this.auditService.getReports(query.organization_id, query.limit);
  }

  @Post("reports/generate")
  @ApiOperation({ summary: "Generate audit report" })
  @ApiResponse({ status: 201, description: "Report generated" })
  @HttpCode(HttpStatus.CREATED)
  @Roles("owner", "admin")
  async generateReport(
    @Body() dto: GenerateReportDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<AuditReport> {
    const organizationId =
      user.role === UserRole.OWNER && dto.organization_id
        ? dto.organization_id
        : user.organizationId;
    return this.auditService.generateReport(
      organizationId,
      dto.report_type,
      new Date(dto.date_from),
      new Date(dto.date_to),
      dto.filters,
    );
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  @Post("cleanup/logs")
  @ApiOperation({ summary: "Clean up expired audit logs" })
  @ApiResponse({ status: 200, description: "Cleanup completed" })
  @HttpCode(HttpStatus.OK)
  @Roles("owner")
  async cleanupLogs(): Promise<{ deleted: number }> {
    const count = await this.auditService.cleanupExpiredLogs();
    return { deleted: count };
  }

  @Post("cleanup/snapshots")
  @ApiOperation({ summary: "Clean up expired snapshots" })
  @ApiResponse({ status: 200, description: "Cleanup completed" })
  @HttpCode(HttpStatus.OK)
  @Roles("owner")
  async cleanupSnapshots(): Promise<{ deleted: number }> {
    const count = await this.auditService.cleanupExpiredSnapshots();
    return { deleted: count };
  }
}
