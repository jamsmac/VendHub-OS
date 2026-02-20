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
} from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import {
  CreateMachineDto,
  UpdateMachineDto,
  QueryMachinesDto,
} from './dto/create-machine.dto';
import { CreateMachineSlotDto, UpdateMachineSlotDto, RefillSlotDto } from './dto/machine-slot.dto';
import { InstallComponentDto } from './dto/machine-component.dto';
import {
  MoveMachineDto,
  LogErrorDto,
  ResolveErrorDto,
  ScheduleMaintenanceDto,
  CompleteMaintenanceDto,
} from './dto/machine-location.dto';
import { MachineStatus } from './entities/machine.entity';

@ApiTags('machines')
@Controller('machines')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  // ============================================================================
  // MACHINE CRUD
  // ============================================================================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new machine' })
  @ApiResponse({ status: 201, description: 'Machine created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() dto: CreateMachineDto, @CurrentUser() user: User) {
    return this.machinesService.create({
      ...dto,
      organizationId: dto.organizationId || user.organizationId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all machines with pagination' })
  @ApiResponse({ status: 200, description: 'List of machines' })
  findAll(@CurrentUser() user: User, @Query() query: QueryMachinesDto) {
    const organizationId =
      user.role === UserRole.OWNER && query.organizationId
        ? query.organizationId
        : user.organizationId;

    return this.machinesService.findAll(organizationId, {
      status: query.status as MachineStatus,
      type: query.type,
      locationId: query.locationId,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get machine statistics by status' })
  @ApiResponse({ status: 200, description: 'Machine statistics' })
  getStats(@CurrentUser() user: User) {
    return this.machinesService.getStatsByOrganization(user.organizationId);
  }

  @Get('map')
  @ApiOperation({ summary: 'Get machines for map view (lightweight, with coordinates only)' })
  @ApiResponse({ status: 200, description: 'Machines with coordinates for map rendering' })
  getMachinesForMap(@CurrentUser() user: User) {
    return this.machinesService.getMachinesForMap(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get machine by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Machine found' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const machine = await this.machinesService.findById(id);

    if (machine && machine.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this machine');
      }
    }

    return machine;
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Update machine' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Machine updated' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMachineDto,
    @CurrentUser() user: User,
  ) {
    const machine = await this.machinesService.findById(id);
    if (machine && machine.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this machine');
      }
    }

    return this.machinesService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Update machine status' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: MachineStatus,
    @CurrentUser() user: User,
  ) {
    const machine = await this.machinesService.findById(id);
    if (machine && machine.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this machine');
      }
    }

    return this.machinesService.updateStatus(id, status);
  }

  @Patch(':id/telemetry')
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Update machine telemetry (from machine IoT)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Telemetry updated' })
  async updateTelemetry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() telemetry: Record<string, unknown>,
    @CurrentUser() user: User,
  ) {
    const machine = await this.machinesService.findById(id);
    if (machine && machine.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this machine');
      }
    }

    return this.machinesService.updateTelemetry(id, telemetry);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete machine (soft delete)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Machine deleted' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const machine = await this.machinesService.findById(id);
    if (machine && machine.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this machine');
      }
    }

    return this.machinesService.remove(id);
  }

  // ============================================================================
  // SLOT MANAGEMENT
  // ============================================================================

  @Get(':id/slots')
  @ApiOperation({ summary: 'Get all slots for a machine' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of machine slots' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async getSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.getSlots(id);
  }

  @Post(':id/slots')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new slot for a machine' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Slot created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or duplicate slot number' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async createSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMachineSlotDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.createSlot(id, dto, user.id);
  }

  @Patch(':id/slots/:slotId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Update a machine slot' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'slotId', description: 'Slot UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Slot updated successfully' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  async updateSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: UpdateMachineSlotDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.updateSlot(slotId, dto, user.id);
  }

  @Post(':id/slots/:slotId/refill')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Refill a machine slot with additional product quantity' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'slotId', description: 'Slot UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Slot refilled successfully' })
  @ApiResponse({ status: 400, description: 'Refill would exceed capacity' })
  @ApiResponse({ status: 404, description: 'Slot not found' })
  async refillSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() dto: RefillSlotDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.refillSlot(slotId, dto, user.id);
  }

  // ============================================================================
  // LOCATION HISTORY
  // ============================================================================

  @Post(':id/move')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Move machine to a new location' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Machine moved successfully, location history created' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async moveToLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveMachineDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.moveToLocation(id, dto, user.id);
  }

  @Get(':id/location-history')
  @ApiOperation({ summary: 'Get machine location history' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Location history list' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async getLocationHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.getLocationHistory(id);
  }

  // ============================================================================
  // COMPONENT TRACKING
  // ============================================================================

  @Get(':id/components')
  @ApiOperation({ summary: 'Get all components installed on a machine' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of machine components' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async getComponents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.getComponents(id);
  }

  @Post(':id/components')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Install a new component on a machine' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Component installed successfully' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async installComponent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InstallComponentDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.installComponent(id, dto, user.id);
  }

  @Delete(':id/components/:componentId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Remove a component from a machine' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'componentId', description: 'Component UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Component removed successfully' })
  @ApiResponse({ status: 404, description: 'Component not found' })
  async removeComponent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('componentId', ParseUUIDPipe) componentId: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.removeComponent(componentId, user.id);
  }

  // ============================================================================
  // ERROR LOG
  // ============================================================================

  @Get(':id/errors')
  @ApiOperation({ summary: 'Get machine error history' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Error history list' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async getErrorHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.getErrorHistory(id);
  }

  @Post(':id/errors')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Log a new error for a machine' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Error logged successfully' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async logError(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogErrorDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.logError(id, dto, user.id);
  }

  @Patch(':id/errors/:errorId/resolve')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Resolve a machine error' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'errorId', description: 'Error log UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Error resolved successfully' })
  @ApiResponse({ status: 400, description: 'Error already resolved' })
  @ApiResponse({ status: 404, description: 'Error not found' })
  async resolveError(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('errorId', ParseUUIDPipe) errorId: string,
    @Body() dto: ResolveErrorDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.resolveError(errorId, dto, user.id);
  }

  // ============================================================================
  // MAINTENANCE SCHEDULE
  // ============================================================================

  @Get(':id/maintenance')
  @ApiOperation({ summary: 'Get upcoming maintenance schedule for a machine' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Maintenance schedule list' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async getUpcomingMaintenance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.getUpcomingMaintenance(id);
  }

  @Post(':id/maintenance')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Schedule maintenance for a machine' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Maintenance scheduled successfully' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async scheduleMaintenance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleMaintenanceDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.scheduleMaintenance(id, dto, user.id);
  }

  @Patch(':id/maintenance/:scheduleId/complete')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OPERATOR, UserRole.OWNER)
  @ApiOperation({ summary: 'Complete a scheduled maintenance' })
  @ApiParam({ name: 'id', description: 'Machine UUID', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'scheduleId', description: 'Maintenance schedule UUID', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Maintenance completed successfully' })
  @ApiResponse({ status: 400, description: 'Maintenance already completed' })
  @ApiResponse({ status: 404, description: 'Maintenance schedule not found' })
  async completeMaintenance(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('scheduleId', ParseUUIDPipe) scheduleId: string,
    @Body() dto: CompleteMaintenanceDto,
    @CurrentUser() user: User,
  ) {
    await this.verifyMachineAccess(id, user);
    return this.machinesService.completeMaintenance(scheduleId, dto, user.id);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Verify that the current user has access to the machine's organization.
   * Throws ForbiddenException if the user does not have access.
   */
  private async verifyMachineAccess(
    machineId: string,
    user: User,
  ): Promise<void> {
    const machine = await this.machinesService.findById(machineId);
    if (machine && machine.organizationId !== user.organizationId) {
      if (user.role !== UserRole.OWNER) {
        throw new ForbiddenException('Access denied to this machine');
      }
    }
  }
}
