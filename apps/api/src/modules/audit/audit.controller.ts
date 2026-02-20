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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuditService, QueryAuditLogsDto, CreateAuditLogDto } from './audit.service';
import {
  AuditLog,
  AuditSnapshot,
  AuditSession,
  AuditReport,
  AuditAction,
  AuditCategory,
  AuditSeverity,
} from './entities/audit.entity';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  @Get('logs')
  @ApiOperation({ summary: 'Query audit logs with filters' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction, isArray: true })
  @ApiQuery({ name: 'category', required: false, enum: AuditCategory, isArray: true })
  @ApiQuery({ name: 'severity', required: false, enum: AuditSeverity, isArray: true })
  @ApiQuery({ name: 'dateFrom', required: false, type: Date })
  @ApiQuery({ name: 'dateTo', required: false, type: Date })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  @Roles('owner', 'admin', 'manager')
  async queryLogs(
    @Query() query: QueryAuditLogsDto,
  ) {
    return this.auditService.queryAuditLogs(query);
  }

  @Get('logs/:id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Audit log details' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  @Roles('owner', 'admin', 'manager')
  async getLog(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLog> {
    return this.auditService.getAuditLogById(id);
  }

  @Post('logs')
  @ApiOperation({ summary: 'Create manual audit log entry' })
  @ApiResponse({ status: 201, description: 'Audit log created' })
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'admin')
  async createLog(
    @Body() dto: CreateAuditLogDto,
  ): Promise<AuditLog> {
    return this.auditService.createAuditLog(dto);
  }

  // ============================================================================
  // ENTITY HISTORY
  // ============================================================================

  @Get('history/:entityType/:entityId')
  @ApiOperation({ summary: 'Get audit history for specific entity' })
  @ApiParam({ name: 'entityType', type: String })
  @ApiParam({ name: 'entityId', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeSnapshots', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Entity audit history' })
  @Roles('owner', 'admin', 'manager')
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Query('limit') limit?: number,
    @Query('includeSnapshots') includeSnapshots?: boolean,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId, {
      limit,
      includeSnapshots,
    });
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  @Get('statistics')
  @ApiOperation({ summary: 'Get audit statistics for dashboard' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiQuery({ name: 'dateFrom', required: true, type: Date })
  @ApiQuery({ name: 'dateTo', required: true, type: Date })
  @ApiResponse({ status: 200, description: 'Audit statistics' })
  @Roles('owner', 'admin', 'manager')
  async getStatistics(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.auditService.getStatistics(
      organizationId,
      new Date(dateFrom),
      new Date(dateTo),
    );
  }

  // ============================================================================
  // SNAPSHOTS
  // ============================================================================

  @Get('snapshots/:entityType/:entityId')
  @ApiOperation({ summary: 'Get snapshots for entity' })
  @ApiParam({ name: 'entityType', type: String })
  @ApiParam({ name: 'entityId', type: String })
  @ApiResponse({ status: 200, description: 'List of entity snapshots' })
  @Roles('owner', 'admin')
  async getSnapshots(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<AuditSnapshot[]> {
    return this.auditService.getSnapshots(entityType, entityId);
  }

  @Get('snapshots/detail/:id')
  @ApiOperation({ summary: 'Get snapshot by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Snapshot details' })
  @ApiResponse({ status: 404, description: 'Snapshot not found' })
  @Roles('owner', 'admin')
  async getSnapshot(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditSnapshot> {
    return this.auditService.getSnapshot(id);
  }

  @Post('snapshots')
  @ApiOperation({ summary: 'Create entity snapshot' })
  @ApiResponse({ status: 201, description: 'Snapshot created' })
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'admin')
  async createSnapshot(
    @Body() body: {
      organizationId: string;
      entityType: string;
      entityId: string;
      snapshot: Record<string, any>;
      entityName?: string;
      snapshotReason?: string;
    },
  ): Promise<AuditSnapshot> {
    return this.auditService.createSnapshot(
      body.organizationId,
      body.entityType,
      body.entityId,
      body.snapshot,
      {
        entityName: body.entityName,
        snapshotReason: body.snapshotReason,
      },
    );
  }

  // ============================================================================
  // SESSIONS
  // ============================================================================

  @Get('sessions/user/:userId')
  @ApiOperation({ summary: 'Get sessions for user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of user sessions' })
  @Roles('owner', 'admin')
  async getUserSessions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('activeOnly') activeOnly?: boolean,
  ): Promise<AuditSession[]> {
    return this.auditService.getUserSessions(userId, activeOnly !== false);
  }

  @Post('sessions/:sessionId/end')
  @ApiOperation({ summary: 'End a session' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({ status: 200, description: 'Session ended' })
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin')
  async endSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body('reason') reason?: string,
  ): Promise<void> {
    return this.auditService.endSession(sessionId, reason || 'admin_forced');
  }

  @Post('sessions/user/:userId/terminate-all')
  @ApiOperation({ summary: 'Terminate all user sessions' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 200, description: 'Sessions terminated' })
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin')
  async terminateAllUserSessions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('reason') reason?: string,
  ): Promise<{ terminated: number }> {
    const count = await this.auditService.terminateAllUserSessions(
      userId,
      reason || 'admin_forced',
    );
    return { terminated: count };
  }

  @Post('sessions/:sessionId/suspicious')
  @ApiOperation({ summary: 'Mark session as suspicious' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({ status: 200, description: 'Session marked as suspicious' })
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'admin')
  async markSessionSuspicious(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body('reason') reason: string,
  ): Promise<void> {
    return this.auditService.markSessionSuspicious(sessionId, reason);
  }

  // ============================================================================
  // REPORTS
  // ============================================================================

  @Get('reports')
  @ApiOperation({ summary: 'Get audit reports for organization' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of audit reports' })
  @Roles('owner', 'admin', 'manager')
  async getReports(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('limit') limit?: number,
  ): Promise<AuditReport[]> {
    return this.auditService.getReports(organizationId, limit);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate audit report' })
  @ApiResponse({ status: 201, description: 'Report generated' })
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'admin')
  async generateReport(
    @Body() body: {
      organizationId: string;
      reportType: string;
      dateFrom: string;
      dateTo: string;
      filters?: Record<string, any>;
    },
    // @CurrentUser() user: any,
  ): Promise<AuditReport> {
    return this.auditService.generateReport(
      body.organizationId,
      body.reportType,
      new Date(body.dateFrom),
      new Date(body.dateTo),
      body.filters,
      // user?.id,
    );
  }

  // ============================================================================
  // ADMIN OPERATIONS
  // ============================================================================

  @Post('cleanup/logs')
  @ApiOperation({ summary: 'Clean up expired audit logs' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  @HttpCode(HttpStatus.OK)
  @Roles('owner')
  async cleanupLogs(): Promise<{ deleted: number }> {
    const count = await this.auditService.cleanupExpiredLogs();
    return { deleted: count };
  }

  @Post('cleanup/snapshots')
  @ApiOperation({ summary: 'Clean up expired snapshots' })
  @ApiResponse({ status: 200, description: 'Cleanup completed' })
  @HttpCode(HttpStatus.OK)
  @Roles('owner')
  async cleanupSnapshots(): Promise<{ deleted: number }> {
    const count = await this.auditService.cleanupExpiredSnapshots();
    return { deleted: count };
  }
}
