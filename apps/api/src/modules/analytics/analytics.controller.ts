import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { DashboardStatsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUserId,
  CurrentOrganizationId,
} from "../../common/decorators/current-user.decorator";
import {
  DateRangeQueryDto,
  SnapshotQueryDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  ReorderWidgetsDto,
} from "./dto/analytics.dto";

@ApiTags("analytics")
@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: DashboardStatsService) {}

  // ========================================================================
  // DAILY STATS
  // ========================================================================

  @Get("daily")
  @Roles("admin", "manager", "accountant")
  @ApiOperation({ summary: "Get daily stats for date range" })
  @ApiResponse({ status: 200, description: "Daily stats array" })
  async getDailyStats(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.analyticsService.getDailyStats(
      organizationId,
      query.from,
      query.to,
    );
  }

  @Post("aggregate/:date")
  @Roles("admin")
  @ApiOperation({ summary: "Manually trigger daily stats aggregation" })
  @ApiParam({ name: "date", example: "2025-01-15" })
  @ApiResponse({ status: 201, description: "Aggregated daily stats" })
  async aggregateDailyStats(
    @CurrentOrganizationId() organizationId: string,
    @Param("date") date: string,
  ) {
    return this.analyticsService.aggregateDailyStats(organizationId, date);
  }

  // ========================================================================
  // DASHBOARD
  // ========================================================================

  @Get("dashboard")
  @Roles("admin", "manager", "accountant")
  @ApiOperation({ summary: "Get user dashboard with widgets and latest stats" })
  @ApiResponse({ status: 200, description: "Dashboard data" })
  async getDashboard(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.analyticsService.getDashboard(organizationId, userId);
  }

  // ========================================================================
  // WIDGETS
  // ========================================================================

  @Post("widgets")
  @Roles("admin", "manager", "accountant")
  @ApiOperation({ summary: "Create a dashboard widget" })
  @ApiResponse({ status: 201, description: "Created widget" })
  async createWidget(
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateWidgetDto,
  ) {
    return this.analyticsService.createWidget(userId, organizationId, dto);
  }

  @Patch("widgets/:id")
  @Roles("admin", "manager", "accountant")
  @ApiOperation({ summary: "Update a dashboard widget" })
  @ApiParam({ name: "id", description: "Widget UUID" })
  @ApiResponse({ status: 200, description: "Updated widget" })
  async updateWidget(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateWidgetDto,
  ) {
    return this.analyticsService.updateWidget(id, userId, dto);
  }

  @Delete("widgets/:id")
  @Roles("admin", "manager", "accountant")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a dashboard widget" })
  @ApiParam({ name: "id", description: "Widget UUID" })
  @ApiResponse({ status: 204, description: "Widget deleted" })
  async deleteWidget(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.analyticsService.deleteWidget(id, userId);
  }

  @Put("widgets/reorder")
  @Roles("admin", "manager", "accountant")
  @ApiOperation({ summary: "Reorder dashboard widgets" })
  @ApiResponse({ status: 200, description: "Widgets reordered" })
  async reorderWidgets(
    @CurrentUserId() userId: string,
    @Body() dto: ReorderWidgetsDto,
  ) {
    await this.analyticsService.reorderWidgets(userId, dto.widgetIds);
    return { success: true };
  }

  // ========================================================================
  // CHART DATA
  // ========================================================================

  @Get("top-machines")
  @Roles("admin", "manager", "accountant")
  @ApiOperation({ summary: "Get top machines by revenue for date range" })
  @ApiResponse({ status: 200, description: "Top machines array" })
  async getTopMachines(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.analyticsService.getTopMachines(
      organizationId,
      query.from,
      query.to,
    );
  }

  @Get("top-products")
  @Roles("admin", "manager", "accountant")
  @ApiOperation({ summary: "Get top products by revenue for date range" })
  @ApiResponse({ status: 200, description: "Top products array" })
  async getTopProducts(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.analyticsService.getTopProducts(
      organizationId,
      query.from,
      query.to,
    );
  }

  @Get("revenue-trend")
  @Roles("admin", "manager", "accountant")
  @ApiOperation({ summary: "Get daily revenue trend for date range" })
  @ApiResponse({ status: 200, description: "Revenue trend array" })
  async getRevenueTrend(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.analyticsService.getRevenueTrend(
      organizationId,
      query.from,
      query.to,
    );
  }

  // ========================================================================
  // SNAPSHOTS
  // ========================================================================

  @Get("snapshots")
  @Roles("admin", "manager")
  @ApiOperation({ summary: "Get analytics snapshots" })
  @ApiResponse({ status: 200, description: "Snapshot array" })
  async getSnapshots(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: SnapshotQueryDto,
  ) {
    return this.analyticsService.getSnapshots(
      organizationId,
      query.type,
      query.from,
      query.to,
    );
  }
}
