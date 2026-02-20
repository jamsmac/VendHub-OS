/**
 * Maintenance Controller
 * REST API endpoints for maintenance management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { MaintenanceService } from './maintenance.service';
import {
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto,
  ApproveMaintenanceRequestDto,
  RejectMaintenanceRequestDto,
  AssignTechnicianDto,
  StartMaintenanceDto,
  CompleteMaintenanceDto,
  VerifyMaintenanceDto,
  MaintenanceQueryDto,
  CreateMaintenancePartDto,
  UpdateMaintenancePartDto,
  CreateMaintenanceWorkLogDto,
  UpdateMaintenanceWorkLogDto,
  CreateMaintenanceScheduleDto,
  UpdateMaintenanceScheduleDto,
  ScheduleQueryDto,
} from './dto/maintenance.dto';
import {
  MaintenanceRequest,
  MaintenancePart,
  MaintenanceWorkLog,
  MaintenanceSchedule,
} from './entities/maintenance.entity';

// Assume these decorators exist in your project
// import { Roles } from '../../common/decorators/roles.decorator';
// import { CurrentUser } from '../../common/decorators/current-user.decorator';
// import { Organization } from '../../common/decorators/organization.decorator';

// User interface for type safety
interface UserPayload {
  id: string;
  [key: string]: unknown;
}

// Placeholder decorators
const Roles = (..._roles: string[]) => (target: object, key?: string, descriptor?: PropertyDescriptor) => descriptor || target;
const CurrentUser = () => (_target: object, _key: string, _index: number) => {};
const Organization = () => (_target: object, _key: string, _index: number) => {};

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // ========================================================================
  // MAINTENANCE REQUESTS
  // ========================================================================

  @Post()
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create maintenance request' })
  @ApiResponse({ status: 201, type: MaintenanceRequest })
  async create(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.create(organizationId, user.id, dto);
  }

  @Get()
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List maintenance requests' })
  @ApiResponse({ status: 200 })
  async findAll(
    @Organization() organizationId: string,
    @Query() query: MaintenanceQueryDto,
  ) {
    return this.maintenanceService.findAll(organizationId, query);
  }

  @Get('stats')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get maintenance statistics' })
  async getStats(
    @Organization() organizationId: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.maintenanceService.getStats(organizationId, startDate, endDate);
  }

  @Get(':id')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get maintenance request by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: MaintenanceRequest })
  async findOne(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.findOne(organizationId, id);
  }

  @Put(':id')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update maintenance request' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: MaintenanceRequest })
  async update(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Delete maintenance request' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.maintenanceService.delete(organizationId, id);
  }

  // ========================================================================
  // WORKFLOW ENDPOINTS
  // ========================================================================

  @Post(':id/submit')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Submit maintenance request for approval' })
  @ApiParam({ name: 'id', type: 'string' })
  async submit(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.submit(organizationId, id, user.id);
  }

  @Post(':id/approve')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Approve maintenance request' })
  @ApiParam({ name: 'id', type: 'string' })
  async approve(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.approve(organizationId, id, user.id, dto);
  }

  @Post(':id/reject')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Reject maintenance request' })
  @ApiParam({ name: 'id', type: 'string' })
  async reject(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.reject(organizationId, id, user.id, dto);
  }

  @Post(':id/assign')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Assign technician to maintenance' })
  @ApiParam({ name: 'id', type: 'string' })
  async assign(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTechnicianDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.assignTechnician(organizationId, id, user.id, dto);
  }

  @Post(':id/start')
  @Roles('technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Start maintenance work' })
  @ApiParam({ name: 'id', type: 'string' })
  async start(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.start(organizationId, id, user.id, dto);
  }

  @Post(':id/awaiting-parts')
  @Roles('technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Set maintenance to awaiting parts' })
  @ApiParam({ name: 'id', type: 'string' })
  async awaitingParts(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.setAwaitingParts(organizationId, id, user.id);
  }

  @Post(':id/complete')
  @Roles('technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Complete maintenance' })
  @ApiParam({ name: 'id', type: 'string' })
  async complete(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.complete(organizationId, id, user.id, dto);
  }

  @Post(':id/verify')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Verify completed maintenance' })
  @ApiParam({ name: 'id', type: 'string' })
  async verify(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.verify(organizationId, id, user.id, dto);
  }

  @Post(':id/cancel')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Cancel maintenance request' })
  @ApiParam({ name: 'id', type: 'string' })
  async cancel(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.cancel(organizationId, id, user.id, reason);
  }

  // ========================================================================
  // PARTS ENDPOINTS
  // ========================================================================

  @Post(':id/parts')
  @Roles('technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Add part to maintenance' })
  @ApiParam({ name: 'id', type: 'string' })
  async addPart(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenancePartDto,
  ): Promise<MaintenancePart> {
    return this.maintenanceService.addPart(organizationId, id, dto);
  }

  @Put(':id/parts/:partId')
  @Roles('technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update part' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'partId', type: 'string' })
  async updatePart(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partId', ParseUUIDPipe) partId: string,
    @Body() dto: UpdateMaintenancePartDto,
  ): Promise<MaintenancePart> {
    return this.maintenanceService.updatePart(organizationId, id, partId, dto);
  }

  @Delete(':id/parts/:partId')
  @Roles('technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Remove part from maintenance' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'partId', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePart(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('partId', ParseUUIDPipe) partId: string,
  ): Promise<void> {
    return this.maintenanceService.removePart(organizationId, id, partId);
  }

  // ========================================================================
  // WORK LOG ENDPOINTS
  // ========================================================================

  @Post(':id/work-logs')
  @Roles('technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Add work log to maintenance' })
  @ApiParam({ name: 'id', type: 'string' })
  async addWorkLog(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenanceWorkLogDto,
  ): Promise<MaintenanceWorkLog> {
    return this.maintenanceService.addWorkLog(organizationId, id, user.id, dto);
  }

  @Put(':id/work-logs/:logId')
  @Roles('technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update work log' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'logId', type: 'string' })
  async updateWorkLog(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('logId', ParseUUIDPipe) logId: string,
    @Body() dto: UpdateMaintenanceWorkLogDto,
  ): Promise<MaintenanceWorkLog> {
    return this.maintenanceService.updateWorkLog(organizationId, id, logId, dto);
  }

  @Delete(':id/work-logs/:logId')
  @Roles('technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Remove work log' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'logId', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeWorkLog(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('logId', ParseUUIDPipe) logId: string,
  ): Promise<void> {
    return this.maintenanceService.removeWorkLog(organizationId, id, logId);
  }

  // ========================================================================
  // SCHEDULES ENDPOINTS
  // ========================================================================

  @Post('schedules')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create maintenance schedule' })
  async createSchedule(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateMaintenanceScheduleDto,
  ): Promise<MaintenanceSchedule> {
    return this.maintenanceService.createSchedule(organizationId, user.id, dto);
  }

  @Get('schedules')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List maintenance schedules' })
  async findAllSchedules(
    @Organization() organizationId: string,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.maintenanceService.findAllSchedules(organizationId, query);
  }

  @Put('schedules/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update maintenance schedule' })
  @ApiParam({ name: 'id', type: 'string' })
  async updateSchedule(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceScheduleDto,
  ): Promise<MaintenanceSchedule> {
    return this.maintenanceService.updateSchedule(organizationId, id, dto);
  }

  @Delete('schedules/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Delete maintenance schedule' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.maintenanceService.deleteSchedule(organizationId, id);
  }
}
