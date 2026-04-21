import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseUUIDPipe,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { RoutesService } from "./routes.service";
import { RouteOptimizationService } from "./route-optimization.service";
import { RouteOptimizerService } from "./services/route-optimizer.service";
import { RouteAnalyticsService } from "./services/route-analytics.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User, UserRole } from "../users/entities/user.entity";
import { CreateRouteDto, UpdateRouteDto } from "./dto/create-route.dto";
import {
  CreateRouteStopDto,
  UpdateRouteStopDto,
  ReorderStopsDto,
} from "./dto/create-route-stop.dto";
import { AutoGenerateRouteDto } from "./dto/auto-generate-route.dto";
import {
  StartRouteDto,
  EndRouteDto,
  CancelRouteDto,
  RecordPointDto,
  RecordPointsBatchDto,
  UpdateLiveLocationDto,
  LinkTaskDto,
  CompleteLinkedTaskDto,
  ResolveAnomalyDto,
  ListAnomaliesQueryDto,
  RouteAnalyticsQueryDto,
} from "./dto/start-route.dto";
import { RouteType, RouteStatus } from "./entities/route.entity";
import { resolveOrganizationId } from "../../common/utils";

@ApiTags("routes")
@Controller("routes")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly routeOptimizationService: RouteOptimizationService,
    private readonly routeOptimizerService: RouteOptimizerService,
    private readonly routeAnalyticsService: RouteAnalyticsService,
  ) {}

  // ============================================================================
  // STATIC/MULTI-SEGMENT ROUTES (must be before :id)
  // ============================================================================

  @Get("active")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: "Get all currently active routes (live tracking)" })
  @ApiResponse({ status: 200, description: "Active routes list" })
  getActiveRoutes(@CurrentUser() user: User) {
    return this.routesService.getActiveRoutes(user.organizationId);
  }

  @Get("analytics")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Get route analytics summary" })
  @ApiResponse({ status: 200, description: "Analytics data" })
  getAnalytics(
    @CurrentUser() user: User,
    @Query() query: RouteAnalyticsQueryDto,
  ) {
    return this.routesService.getRoutesSummary({
      organizationId: user.organizationId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  @Get("analytics/main")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Main analytics dashboard with period comparison" })
  getMainDashboard(
    @CurrentUser() user: User,
    @Query() query: RouteAnalyticsQueryDto,
  ) {
    return this.routeAnalyticsService.getMainDashboard(
      user.organizationId,
      new Date(query.dateFrom),
      new Date(query.dateTo),
    );
  }

  @Get("analytics/activity")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: "Activity dashboard: distance by day, routes by hour",
  })
  getActivityDashboard(
    @CurrentUser() user: User,
    @Query() query: RouteAnalyticsQueryDto,
  ) {
    return this.routeAnalyticsService.getActivityDashboard(
      user.organizationId,
      new Date(query.dateFrom),
      new Date(query.dateTo),
    );
  }

  @Get("analytics/employees")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: "Employee dashboard: ranking by distance, anomalies",
  })
  getEmployeeDashboard(
    @CurrentUser() user: User,
    @Query() query: RouteAnalyticsQueryDto,
  ) {
    return this.routeAnalyticsService.getEmployeeDashboard(
      user.organizationId,
      new Date(query.dateFrom),
      new Date(query.dateTo),
    );
  }

  @Get("analytics/vehicles")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Vehicles dashboard: stats per vehicle" })
  getVehiclesDashboard(
    @CurrentUser() user: User,
    @Query() query: RouteAnalyticsQueryDto,
  ) {
    return this.routeAnalyticsService.getVehiclesDashboard(
      user.organizationId,
      new Date(query.dateFrom),
      new Date(query.dateTo),
    );
  }

  @Get("analytics/anomalies")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Anomalies dashboard: breakdown by type, severity" })
  getAnomaliesDashboard(
    @CurrentUser() user: User,
    @Query() query: RouteAnalyticsQueryDto,
  ) {
    return this.routeAnalyticsService.getAnomaliesDashboard(
      user.organizationId,
      new Date(query.dateFrom),
      new Date(query.dateTo),
    );
  }

  @Get("analytics/taxi")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Taxi expense dashboard" })
  getTaxiDashboard(
    @CurrentUser() user: User,
    @Query() query: RouteAnalyticsQueryDto,
  ) {
    return this.routeAnalyticsService.getTaxiDashboard(
      user.organizationId,
      new Date(query.dateFrom),
      new Date(query.dateTo),
    );
  }

  @Get("anomalies/unresolved")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "List unresolved anomalies across all routes" })
  listUnresolvedAnomalies(
    @CurrentUser() user: User,
    @Query() query: ListAnomaliesQueryDto,
  ) {
    return this.routesService.listUnresolvedAnomalies(
      user.organizationId,
      query,
    );
  }

  // ============================================================================
  // ROUTE CRUD
  // ============================================================================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Create a new route" })
  @ApiResponse({ status: 201, description: "Route created successfully" })
  create(@Body() dto: CreateRouteDto, @CurrentUser() user: User) {
    const organizationId = resolveOrganizationId(user, dto.organizationId);
    return this.routesService.create({ ...dto, organizationId }, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: "Get all routes with pagination and filters" })
  @ApiResponse({ status: 200, description: "List of routes" })
  @ApiQuery({ name: "operatorId", required: false, type: String })
  @ApiQuery({ name: "type", required: false, enum: RouteType })
  @ApiQuery({ name: "status", required: false, enum: RouteStatus })
  @ApiQuery({ name: "plannedDateFrom", required: false, type: String })
  @ApiQuery({ name: "plannedDateTo", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(
    @CurrentUser() user: User,
    @Query("operatorId") operatorId?: string,
    @Query("type") type?: RouteType,
    @Query("status") status?: RouteStatus,
    @Query("plannedDateFrom") plannedDateFrom?: string,
    @Query("plannedDateTo") plannedDateTo?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.routesService.findAll(user.organizationId, {
      ...(operatorId !== undefined && { operatorId }),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
      ...(plannedDateFrom !== undefined && { plannedDateFrom }),
      ...(plannedDateTo !== undefined && { plannedDateTo }),
      ...(search !== undefined && { search }),
      ...(page !== undefined && { page: parseInt(page, 10) }),
      ...(limit !== undefined && { limit: parseInt(limit, 10) }),
    });
  }

  @Post("auto-generate")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({
    summary: "Auto-generate optimal refill route from recommendations",
  })
  @ApiResponse({
    status: 201,
    description: "DRAFT route created with optimized stops",
  })
  async autoGenerate(
    @Body() dto: AutoGenerateRouteDto,
    @CurrentUser() user: User,
  ) {
    const organizationId = resolveOrganizationId(user, undefined);
    return this.routeOptimizerService.generateOptimalRoute(
      organizationId,
      dto.operatorId ?? user.id,
      dto.includeRefillSoon ?? false,
    );
  }

  @Get(":id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: "Get route by ID with stops, tasks, anomalies" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.routesService.findById(id, user.organizationId);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Update route" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.update(id, dto, user.organizationId, user.id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Delete route (soft delete)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.verifyRouteAccess(id, user);
    await this.routesService.remove(id, user.organizationId);
  }

  // ============================================================================
  // ROUTE LIFECYCLE
  // ============================================================================

  @Post(":id/start")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "Start a planned route (PLANNED → ACTIVE)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async startRoute(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StartRouteDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.startRoute(id, user.id, user.organizationId, dto);
  }

  @Post(":id/end")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "End an active route (ACTIVE → COMPLETED)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async endRoute(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EndRouteDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.endRoute(id, user.id, user.organizationId, dto);
  }

  @Post(":id/cancel")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Cancel a route" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async cancelRoute(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelRouteDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.cancelRoute(
      id,
      user.id,
      user.organizationId,
      dto.reason,
    );
  }

  // ============================================================================
  // GPS TRACKING
  // ============================================================================

  @Post(":id/points")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "Record a GPS point on active route" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async recordPoint(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RecordPointDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.addPoint(id, user.organizationId, dto);
  }

  @Post(":id/points/batch")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "Record multiple GPS points in batch" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async recordPointsBatch(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RecordPointsBatchDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.addPointsBatch(
      id,
      user.organizationId,
      dto.points,
    );
  }

  @Get(":id/track")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.VIEWER)
  @ApiOperation({ summary: "Get GPS track for a route" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async getRouteTrack(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.getRouteTrack(id);
  }

  @Patch(":id/live-location")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "Update live location tracking status" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async updateLiveLocation(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLiveLocationDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.updateLiveLocationStatus(
      id,
      dto.isActive,
      dto.telegramMessageId,
    );
  }

  // ============================================================================
  // ROUTE OPTIMIZATION
  // ============================================================================

  @Post(":id/optimize")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Optimize route stop order" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async optimizeRoute(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routeOptimizationService.optimizeRoute(id);
  }

  // ============================================================================
  // ROUTE STOPS
  // ============================================================================

  @Get(":id/stops")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR)
  @ApiOperation({ summary: "Get all stops for a route (ordered by sequence)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async getStops(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.getStops(id);
  }

  @Post(":id/stops")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Add a stop to a route" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async addStop(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateRouteStopDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.addStop(id, dto, user.id);
  }

  @Patch(":id/stops/:stopId")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "Update a route stop" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiParam({ name: "stopId", type: "string", format: "uuid" })
  async updateStop(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("stopId", ParseUUIDPipe) stopId: string,
    @Body() dto: UpdateRouteStopDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.updateStop(stopId, dto, user.id);
  }

  @Delete(":id/stops/:stopId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Remove a stop from a route (soft delete)" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiParam({ name: "stopId", type: "string", format: "uuid" })
  async removeStop(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("stopId", ParseUUIDPipe) stopId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.verifyRouteAccess(id, user);
    await this.routesService.removeStop(stopId);
  }

  @Post(":id/stops/reorder")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Reorder stops on a route" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async reorderStops(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReorderStopsDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.reorderStops(id, dto.stopIds, user.id);
  }

  // ============================================================================
  // TASK LINKS
  // ============================================================================

  @Get(":id/tasks")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "Get tasks linked to this route" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async getRouteTasks(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.getRouteTasks(id);
  }

  @Post(":id/tasks")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "Link a task to this route" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async linkTask(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: LinkTaskDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.linkTask(id, dto.taskId, user.id);
  }

  @Post(":id/tasks/:taskId/complete")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "Mark a linked task as completed" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  @ApiParam({ name: "taskId", type: "string", format: "uuid" })
  async completeLinkedTask(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Body() dto: CompleteLinkedTaskDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.completeLinkedTask(
      id,
      taskId,
      dto.notes,
      user.id,
    );
  }

  // ============================================================================
  // ANOMALIES
  // ============================================================================

  @Get(":id/anomalies")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: "Get anomalies for a route" })
  @ApiParam({ name: "id", type: "string", format: "uuid" })
  async getRouteAnomalies(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.getRouteAnomalies(id);
  }

  @Post("anomalies/:anomalyId/resolve")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: "Resolve an anomaly" })
  @ApiParam({ name: "anomalyId", type: "string", format: "uuid" })
  async resolveAnomaly(
    @Param("anomalyId", ParseUUIDPipe) anomalyId: string,
    @Body() dto: ResolveAnomalyDto,
    @CurrentUser() user: User,
  ) {
    return this.routesService.resolveAnomaly(
      anomalyId,
      user.id,
      user.organizationId,
      dto.notes,
    );
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async verifyRouteAccess(routeId: string, user: User): Promise<void> {
    const route = await this.routesService.findById(
      routeId,
      user.organizationId,
    );
    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }
  }
}
