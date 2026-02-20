/**
 * Analytics Controller for VendHub OS
 *
 * Provides REST endpoints for:
 * - Querying pre-aggregated analytics snapshots
 * - Querying daily organization statistics
 * - Triggering manual snapshot/stats rebuilds (admin only)
 * - Dashboard data (today + trends)
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AnalyticsService } from '../services/analytics.service';
import {
  QuerySnapshotsDto,
  QueryDailyStatsDto,
  RebuildSnapshotDto,
  RebuildDailyStatsDto,
  DashboardResponseDto,
  PaginatedSnapshotsResponseDto,
} from '../dto/analytics.dto';
import { SnapshotType } from '../entities/analytics-snapshot.entity';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ============================================================================
  // SNAPSHOTS
  // ============================================================================

  @Get('snapshots')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.VIEWER)
  @ApiOperation({
    summary: 'List analytics snapshots',
    description: 'Returns paginated list of analytics snapshots with optional filters by type, machine, location, product, and date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of analytics snapshots',
    type: PaginatedSnapshotsResponseDto,
  })
  async getSnapshots(
    @CurrentUser('organizationId') organizationId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: QuerySnapshotsDto,
  ) {
    return this.analyticsService.getSnapshots(organizationId, query);
  }

  @Get('snapshots/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get single analytics snapshot',
    description: 'Returns a single analytics snapshot by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Snapshot UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'The analytics snapshot',
  })
  @ApiResponse({
    status: 404,
    description: 'Snapshot not found',
  })
  async getSnapshot(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.analyticsService.getSnapshot(id);
  }

  @Post('snapshots/rebuild')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rebuild analytics snapshot',
    description: 'Triggers a rebuild of an analytics snapshot for the specified date and type. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Snapshot rebuilt successfully',
  })
  async rebuildSnapshot(
    @CurrentUser('organizationId') organizationId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: RebuildSnapshotDto,
  ) {
    const date = new Date(body.date);

    switch (body.snapshotType) {
      case SnapshotType.DAILY:
        return this.analyticsService.createDailySnapshot(organizationId, date);
      case SnapshotType.WEEKLY:
        return this.analyticsService.createWeeklySnapshot(organizationId, date);
      case SnapshotType.MONTHLY:
        return this.analyticsService.createMonthlySnapshot(organizationId, date);
      default:
        return this.analyticsService.createDailySnapshot(organizationId, date);
    }
  }

  // ============================================================================
  // DAILY STATS
  // ============================================================================

  @Get('daily-stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get daily stats for date range',
    description: 'Returns daily organization statistics for the specified date range.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of daily stats ordered by date ascending',
  })
  async getDailyStats(
    @CurrentUser('organizationId') organizationId: string,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: QueryDailyStatsDto,
  ) {
    return this.analyticsService.getDailyStats(
      organizationId,
      query.dateFrom,
      query.dateTo,
    );
  }

  @Post('daily-stats/rebuild')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rebuild daily stats',
    description: 'Triggers a recalculation of daily stats for the specified date. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily stats rebuilt successfully',
  })
  async rebuildDailyStats(
    @CurrentUser('organizationId') organizationId: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: RebuildDailyStatsDto,
  ) {
    return this.analyticsService.updateDailyStats(organizationId, body.date);
  }

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  @Get('dashboard')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get dashboard analytics data',
    description: `Returns a dashboard view including:
- Today's stats
- Yesterday's stats (for comparison / change indicators)
- Last 7 days trend (week trend)
- Last 30 days trend (month trend)`,
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard analytics data',
    type: DashboardResponseDto,
  })
  async getDashboard(
    @CurrentUser('organizationId') organizationId: string,
  ) {
    return this.analyticsService.getDashboardData(organizationId);
  }
}
