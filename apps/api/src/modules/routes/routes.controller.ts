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
import { RoutesService } from './routes.service';
import { RouteOptimizationService } from './route-optimization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateRouteDto, UpdateRouteDto } from './dto/create-route.dto';
import { CreateRouteStopDto, UpdateRouteStopDto, ReorderStopsDto } from './dto/create-route-stop.dto';
import { RouteType, RouteStatus } from './entities/route.entity';

@ApiTags('routes')
@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly routeOptimizationService: RouteOptimizationService,
  ) {}

  // ============================================================================
  // ROUTE CRUD
  // ============================================================================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new route' })
  @ApiResponse({ status: 201, description: 'Route created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateRouteDto, @CurrentUser() user: User) {
    const organizationId = dto.organizationId || user.organizationId;
    return this.routesService.create(
      { ...dto, organizationId },
      user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all routes with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of routes' })
  @ApiQuery({ name: 'operatorId', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: RouteType })
  @ApiQuery({ name: 'status', required: false, enum: RouteStatus })
  @ApiQuery({ name: 'plannedDateFrom', required: false, type: String, description: 'ISO 8601 date' })
  @ApiQuery({ name: 'plannedDateTo', required: false, type: String, description: 'ISO 8601 date' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: User,
    @Query('operatorId') operatorId?: string,
    @Query('type') type?: RouteType,
    @Query('status') status?: RouteStatus,
    @Query('plannedDateFrom') plannedDateFrom?: string,
    @Query('plannedDateTo') plannedDateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.routesService.findAll(user.organizationId, {
      operatorId,
      type,
      status,
      plannedDateFrom,
      plannedDateTo,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route by ID with stops' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route found' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const route = await this.routesService.findById(id);
    if (route && route.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this route');
      }
    }
    return route;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update route' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route updated' })
  @ApiResponse({ status: 400, description: 'Cannot update completed/cancelled route' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete route (soft delete)' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete an in-progress route' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.remove(id);
  }

  // ============================================================================
  // ROUTE LIFECYCLE
  // ============================================================================

  @Post(':id/start')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Start a planned route' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route started' })
  @ApiResponse({ status: 400, description: 'Route is not in planned status' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async startRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.startRoute(id, user.id);
  }

  @Post(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Complete an in-progress route' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Route completed' })
  @ApiResponse({ status: 400, description: 'Route is not in progress' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async completeRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { actualDurationMinutes?: number; actualDistanceKm?: number; notes?: string },
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.completeRoute(id, user.id, body);
  }

  // ============================================================================
  // ROUTE OPTIMIZATION
  // ============================================================================

  @Post(':id/optimize')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Optimize route stop order (stub - future algorithm)' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Optimization result' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async optimizeRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routeOptimizationService.optimizeRoute(id);
  }

  // ============================================================================
  // ROUTE STOPS
  // ============================================================================

  @Get(':id/stops')
  @ApiOperation({ summary: 'Get all stops for a route (ordered by sequence)' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of route stops' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async getStops(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.getStops(id);
  }

  @Post(':id/stops')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Add a stop to a route' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Stop added successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or duplicate sequence' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async addStop(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRouteStopDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.addStop(id, dto, user.id);
  }

  @Patch(':id/stops/:stopId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Update a route stop' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'stopId', description: 'Stop UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Stop updated' })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  async updateStop(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @Body() dto: UpdateRouteStopDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.updateStop(stopId, dto, user.id);
  }

  @Delete(':id/stops/:stopId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Remove a stop from a route (soft delete)' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'stopId', description: 'Stop UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Stop removed' })
  @ApiResponse({ status: 404, description: 'Stop not found' })
  async removeStop(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.removeStop(stopId);
  }

  @Post(':id/stops/reorder')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Reorder stops on a route' })
  @ApiParam({ name: 'id', description: 'Route UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Stops reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid stop IDs or route status' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async reorderStops(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderStopsDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyRouteAccess(id, user);
    return this.routesService.reorderStops(id, dto.stopIds, user.id);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async verifyRouteAccess(
    routeId: string,
    user: User,
  ): Promise<void> {
    const route = await this.routesService.findById(routeId);
    if (route && route.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this route');
      }
    }
  }
}
