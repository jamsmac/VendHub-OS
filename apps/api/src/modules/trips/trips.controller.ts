import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import {
  StartTripDto,
  EndTripDto,
  CancelTripDto,
  AddPointDto,
  AddPointsBatchDto,
  UpdateLiveLocationDto,
  LinkTaskDto,
  CompleteLinkedTaskDto,
  ResolveAnomalyDto,
  ListAnomaliesQueryDto,
  PerformReconciliationDto,
  ListTripsQueryDto,
  TripAnalyticsQueryDto,
} from './dto/create-trip.dto';
import { TripTaskType } from './entities/trip.entity';

@ApiTags('trips')
@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // ============================================================================
  // TRIP LIFECYCLE
  // ============================================================================

  @Post('start')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Start a new trip' })
  @ApiResponse({ status: 201, description: 'Trip started' })
  @ApiResponse({ status: 409, description: 'Employee already has an active trip' })
  startTrip(@Body() dto: StartTripDto, @CurrentUser() user: User) {
    return this.tripsService.startTrip({
      organizationId: user.organizationId,
      employeeId: user.id,
      vehicleId: dto.vehicleId,
      taskType: dto.taskType,
      startOdometer: dto.startOdometer,
      taskIds: dto.taskIds,
      notes: dto.notes,
      userId: user.id,
    });
  }

  @Post(':id/end')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'End an active trip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Trip ended' })
  @ApiResponse({ status: 400, description: 'Trip is not active' })
  async endTrip(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndTripDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.endTrip(id, dto, user.id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Cancel an active trip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Trip cancelled' })
  async cancelTrip(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelTripDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.cancelTrip(id, dto.reason, user.id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get current user active trip' })
  @ApiResponse({ status: 200, description: 'Active trip or null' })
  getActiveTrip(@CurrentUser() user: User) {
    return this.tripsService.getActiveTrip(user.id);
  }

  // ============================================================================
  // TRIP QUERIES
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'List trips with filters and pagination' })
  @ApiQuery({ name: 'employeeId', required: false, type: String })
  @ApiQuery({ name: 'vehicleId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'taskType', required: false, enum: TripTaskType })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listTrips(@CurrentUser() user: User, @Query() query: ListTripsQueryDto) {
    return this.tripsService.listTrips(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip by ID with relations' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTripById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const trip = await this.tripsService.getTripById(id);
    if (trip.organizationId !== user.organizationId && user.role !== UserRole.OWNER) {
      throw new ForbiddenException();
    }
    return trip;
  }

  @Get(':id/route')
  @ApiOperation({ summary: 'Get trip GPS route (valid points)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTripRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.getTripRoute(id);
  }

  @Get(':id/stops')
  @ApiOperation({ summary: 'Get trip stops' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTripStops(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.getTripStops(id);
  }

  @Get(':id/anomalies')
  @ApiOperation({ summary: 'Get trip anomalies' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTripAnomalies(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.getTripAnomalies(id);
  }

  // ============================================================================
  // GPS TRACKING
  // ============================================================================

  @Post(':id/points')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Add a GPS point to a trip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Point added' })
  async addPoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPointDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.addPoint(id, dto);
  }

  @Post(':id/points/batch')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Add batch of GPS points' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async addPointsBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPointsBatchDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.addPointsBatch(id, dto.points);
  }

  @Patch(':id/live-location')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Update Telegram Live Location status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async updateLiveLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLiveLocationDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.updateLiveLocationStatus(
      id,
      dto.isActive,
      dto.telegramMessageId,
    );
  }

  // ============================================================================
  // TASK LINKS
  // ============================================================================

  @Get(':id/tasks')
  @ApiOperation({ summary: 'Get tasks linked to a trip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getTripTasks(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.getTripTasks(id);
  }

  @Post(':id/tasks')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Link a task to a trip' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Task linked' })
  @ApiResponse({ status: 409, description: 'Task already linked' })
  async linkTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkTaskDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(id, user);
    return this.tripsService.linkTask(id, dto.taskId, user.id);
  }

  @Post(':tripId/tasks/:taskId/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Mark a linked task as completed' })
  @ApiParam({ name: 'tripId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'taskId', type: 'string', format: 'uuid' })
  async completeLinkedTask(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CompleteLinkedTaskDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyTripAccess(tripId, user);
    return this.tripsService.completeLinkedTask(tripId, taskId, dto.notes, user.id);
  }

  // ============================================================================
  // ANOMALIES
  // ============================================================================

  @Get('anomalies/unresolved')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'List unresolved anomalies' })
  listUnresolvedAnomalies(
    @CurrentUser() user: User,
    @Query() query: ListAnomaliesQueryDto,
  ) {
    return this.tripsService.listUnresolvedAnomalies(user.organizationId, query);
  }

  @Post('anomalies/:id/resolve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Resolve an anomaly' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  resolveAnomaly(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAnomalyDto,
    @CurrentUser() user: User,
  ) {
    return this.tripsService.resolveAnomaly(id, user.id, user.organizationId, dto.notes);
  }

  // ============================================================================
  // RECONCILIATION
  // ============================================================================

  @Post('reconciliation')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Perform mileage reconciliation' })
  @ApiResponse({ status: 201, description: 'Reconciliation performed' })
  performReconciliation(
    @Body() dto: PerformReconciliationDto,
    @CurrentUser() user: User,
  ) {
    return this.tripsService.performReconciliation({
      organizationId: user.organizationId,
      vehicleId: dto.vehicleId,
      actualOdometer: dto.actualOdometer,
      performedById: user.id,
      notes: dto.notes,
    });
  }

  @Get('reconciliation/:vehicleId/history')
  @ApiOperation({ summary: 'Get reconciliation history for a vehicle' })
  @ApiParam({ name: 'vehicleId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getReconciliationHistory(
    @CurrentUser() user: User,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query('limit') limit?: string,
  ) {
    return this.tripsService.getReconciliationHistory(
      vehicleId,
      user.organizationId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  @Get('analytics/employee')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Get employee trip statistics' })
  getEmployeeStats(
    @CurrentUser() user: User,
    @Query() query: TripAnalyticsQueryDto,
  ) {
    return this.tripsService.getEmployeeStats({
      organizationId: user.organizationId,
      employeeId: query.employeeId || user.id,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  @Get('analytics/machines')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Get machine visit statistics' })
  getMachineVisitStats(
    @CurrentUser() user: User,
    @Query() query: TripAnalyticsQueryDto,
  ) {
    return this.tripsService.getMachineVisitStats({
      organizationId: user.organizationId,
      machineId: query.machineId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  @Get('analytics/summary')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Get overall trip summary' })
  getTripsSummary(
    @CurrentUser() user: User,
    @Query() query: TripAnalyticsQueryDto,
  ) {
    return this.tripsService.getTripsSummary({
      organizationId: user.organizationId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async verifyTripAccess(tripId: string, user: User): Promise<void> {
    const trip = await this.tripsService.getTripById(tripId);
    if (trip.organizationId !== user.organizationId && user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Access denied to this trip');
    }
  }
}
