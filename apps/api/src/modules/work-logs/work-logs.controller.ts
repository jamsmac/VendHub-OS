/**
 * Work Logs Controller
 * REST API endpoints for time tracking
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

import { WorkLogsService } from './work-logs.service';
import {
  CreateWorkLogDto,
  UpdateWorkLogDto,
  ClockInDto,
  ClockOutDto,
  ApproveWorkLogDto,
  RejectWorkLogDto,
  WorkLogQueryDto,
  CreateTimeOffRequestDto,
  ApproveTimeOffDto,
  RejectTimeOffDto,
  TimeOffQueryDto,
  CreateTimesheetDto,
  ApproveTimesheetDto,
  TimesheetQueryDto,
} from './dto/work-log.dto';
import { WorkLog, TimeOffRequest, Timesheet } from './entities/work-log.entity';

// Placeholder decorators
const Roles = (..._roles: string[]) => (_target: any, _key?: string, descriptor?: any) => descriptor || _target;
const CurrentUser = () => (_target: any, _key: string, _index: number) => {};
const Organization = () => (_target: any, _key: string, _index: number) => {};

@ApiTags('Work Logs')
@ApiBearerAuth()
@Controller('work-logs')
export class WorkLogsController {
  constructor(private readonly workLogsService: WorkLogsService) {}

  // ========================================================================
  // WORK LOGS
  // ========================================================================

  @Post()
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create work log' })
  @ApiResponse({ status: 201, type: WorkLog })
  async createWorkLog(
    @Organization() organizationId: string,
    @Body() dto: CreateWorkLogDto,
  ): Promise<WorkLog> {
    return this.workLogsService.createWorkLog(organizationId, dto);
  }

  @Get()
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List work logs' })
  async findAllWorkLogs(
    @Organization() organizationId: string,
    @Query() query: WorkLogQueryDto,
  ) {
    return this.workLogsService.findAllWorkLogs(organizationId, query);
  }

  @Get('stats')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get work log statistics' })
  async getStats(
    @Organization() organizationId: string,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
  ) {
    return this.workLogsService.getWorkLogStats(organizationId, employeeId, startDate, endDate);
  }

  @Get('attendance')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get attendance report' })
  async getAttendance(
    @Organization() organizationId: string,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ) {
    return this.workLogsService.getAttendanceReport(organizationId, startDate, endDate);
  }

  @Get(':id')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get work log by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOneWorkLog(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkLog> {
    return this.workLogsService.findOneWorkLog(organizationId, id);
  }

  @Put(':id')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update work log' })
  @ApiParam({ name: 'id', type: 'string' })
  async updateWorkLog(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkLogDto,
  ): Promise<WorkLog> {
    return this.workLogsService.updateWorkLog(organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Delete work log' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkLog(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.workLogsService.deleteWorkLog(organizationId, id);
  }

  // ========================================================================
  // CLOCK IN/OUT
  // ========================================================================

  @Post('clock-in')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Clock in' })
  async clockIn(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Body() dto: ClockInDto,
  ): Promise<WorkLog> {
    return this.workLogsService.clockIn(organizationId, user.employeeId || user.id, dto);
  }

  @Post('clock-out')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Clock out' })
  async clockOut(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Body() dto: ClockOutDto,
  ): Promise<WorkLog> {
    return this.workLogsService.clockOut(organizationId, user.employeeId || user.id, dto);
  }

  // ========================================================================
  // WORK LOG WORKFLOW
  // ========================================================================

  @Post(':id/submit')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Submit work log for approval' })
  @ApiParam({ name: 'id', type: 'string' })
  async submitWorkLog(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkLog> {
    return this.workLogsService.submitWorkLog(organizationId, id);
  }

  @Post(':id/approve')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Approve work log' })
  @ApiParam({ name: 'id', type: 'string' })
  async approveWorkLog(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveWorkLogDto,
  ): Promise<WorkLog> {
    return this.workLogsService.approveWorkLog(organizationId, id, user.id, dto);
  }

  @Post(':id/reject')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Reject work log' })
  @ApiParam({ name: 'id', type: 'string' })
  async rejectWorkLog(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectWorkLogDto,
  ): Promise<WorkLog> {
    return this.workLogsService.rejectWorkLog(organizationId, id, user.id, dto);
  }

  @Post('bulk-approve')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Bulk approve work logs' })
  async bulkApprove(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Body('ids') ids: string[],
  ) {
    return this.workLogsService.bulkApprove(organizationId, ids, user.id);
  }

  // ========================================================================
  // TIME OFF REQUESTS
  // ========================================================================

  @Post('time-off')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create time off request' })
  async createTimeOffRequest(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateTimeOffRequestDto,
  ): Promise<TimeOffRequest> {
    return this.workLogsService.createTimeOffRequest(organizationId, user.employeeId || user.id, dto);
  }

  @Get('time-off')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List time off requests' })
  async findAllTimeOffRequests(
    @Organization() organizationId: string,
    @Query() query: TimeOffQueryDto,
  ) {
    return this.workLogsService.findAllTimeOffRequests(organizationId, query);
  }

  @Post('time-off/:id/approve')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Approve time off request' })
  @ApiParam({ name: 'id', type: 'string' })
  async approveTimeOff(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveTimeOffDto,
  ): Promise<TimeOffRequest> {
    return this.workLogsService.approveTimeOff(organizationId, id, user.id, dto);
  }

  @Post('time-off/:id/reject')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Reject time off request' })
  @ApiParam({ name: 'id', type: 'string' })
  async rejectTimeOff(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectTimeOffDto,
  ): Promise<TimeOffRequest> {
    return this.workLogsService.rejectTimeOff(organizationId, id, user.id, dto);
  }

  @Post('time-off/:id/cancel')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Cancel time off request' })
  @ApiParam({ name: 'id', type: 'string' })
  async cancelTimeOff(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TimeOffRequest> {
    return this.workLogsService.cancelTimeOff(organizationId, id, user.employeeId || user.id);
  }

  // ========================================================================
  // TIMESHEETS
  // ========================================================================

  @Post('timesheets')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create timesheet' })
  async createTimesheet(
    @Organization() organizationId: string,
    @Body() dto: CreateTimesheetDto,
  ): Promise<Timesheet> {
    return this.workLogsService.createTimesheet(organizationId, dto);
  }

  @Get('timesheets')
  @Roles('manager', 'admin', 'owner', 'accountant')
  @ApiOperation({ summary: 'List timesheets' })
  async findAllTimesheets(
    @Organization() organizationId: string,
    @Query() query: TimesheetQueryDto,
  ) {
    return this.workLogsService.findAllTimesheets(organizationId, query);
  }

  @Post('timesheets/:id/submit')
  @Roles('operator', 'technician', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Submit timesheet for approval' })
  @ApiParam({ name: 'id', type: 'string' })
  async submitTimesheet(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Timesheet> {
    return this.workLogsService.submitTimesheet(organizationId, id);
  }

  @Post('timesheets/:id/approve')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Approve timesheet' })
  @ApiParam({ name: 'id', type: 'string' })
  async approveTimesheet(
    @Organization() organizationId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveTimesheetDto,
  ): Promise<Timesheet> {
    return this.workLogsService.approveTimesheet(organizationId, id, user.id, dto);
  }

  @Post('timesheets/:id/mark-paid')
  @Roles('accountant', 'admin', 'owner')
  @ApiOperation({ summary: 'Mark timesheet as paid' })
  @ApiParam({ name: 'id', type: 'string' })
  async markTimesheetPaid(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Timesheet> {
    return this.workLogsService.markTimesheetPaid(organizationId, id);
  }
}
