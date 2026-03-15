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
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { WorkLogsService } from "./work-logs.service";
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
} from "./dto/work-log.dto";
import { WorkLog, TimeOffRequest, Timesheet } from "./entities/work-log.entity";

import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentOrganizationId,
  ICurrentUser,
} from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { BulkApproveWorkLogsDto } from "./dto/work-log-operations.dto";

@ApiTags("Work Logs")
@ApiBearerAuth()
@Controller("work-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkLogsController {
  constructor(private readonly workLogsService: WorkLogsService) {}

  // ========================================================================
  // WORK LOGS
  // ========================================================================

  @Post()
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Create work log" })
  @ApiResponse({ status: 201, description: "Work log created", type: WorkLog })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createWorkLog(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateWorkLogDto,
  ): Promise<WorkLog> {
    return this.workLogsService.createWorkLog(organizationId, dto);
  }

  @Get()
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "List work logs" })
  @ApiResponse({
    status: 200,
    description: "Returns list of work logs",
    type: [WorkLog],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAllWorkLogs(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: WorkLogQueryDto,
  ) {
    return this.workLogsService.findAllWorkLogs(organizationId, query);
  }

  @Get("stats")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Get work log statistics" })
  @ApiResponse({ status: 200, description: "Returns work log statistics" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getStats(
    @CurrentOrganizationId() organizationId: string,
    @Query("employeeId") employeeId?: string,
    @Query("startDate") startDate?: Date,
    @Query("endDate") endDate?: Date,
  ) {
    return this.workLogsService.getWorkLogStats(
      organizationId,
      employeeId,
      startDate,
      endDate,
    );
  }

  @Get("attendance")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Get attendance report" })
  @ApiResponse({ status: 200, description: "Returns attendance report" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getAttendance(
    @CurrentOrganizationId() organizationId: string,
    @Query("startDate") startDate: Date,
    @Query("endDate") endDate: Date,
  ) {
    return this.workLogsService.getAttendanceReport(
      organizationId,
      startDate,
      endDate,
    );
  }

  @Get("time-off")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "List time off requests" })
  @ApiResponse({
    status: 200,
    description: "Returns list of time off requests",
    type: [TimeOffRequest],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAllTimeOffRequests(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: TimeOffQueryDto,
  ) {
    return this.workLogsService.findAllTimeOffRequests(organizationId, query);
  }

  @Get("timesheets")
  @Roles("manager", "admin", "owner", "accountant")
  @ApiOperation({ summary: "List timesheets" })
  @ApiResponse({
    status: 200,
    description: "Returns list of timesheets",
    type: [Timesheet],
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAllTimesheets(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: TimesheetQueryDto,
  ) {
    return this.workLogsService.findAllTimesheets(organizationId, query);
  }

  @Get(":id")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get work log by ID" })
  @ApiResponse({ status: 200, description: "Work log found", type: WorkLog })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Work log not found" })
  @ApiParam({ name: "id", type: "string" })
  async findOneWorkLog(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<WorkLog> {
    return this.workLogsService.findOneWorkLog(organizationId, id);
  }

  @Put(":id")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Update work log" })
  @ApiResponse({ status: 200, description: "Work log updated", type: WorkLog })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Work log not found" })
  @ApiParam({ name: "id", type: "string" })
  async updateWorkLog(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkLogDto,
  ): Promise<WorkLog> {
    return this.workLogsService.updateWorkLog(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Delete work log" })
  @ApiResponse({ status: 204, description: "Work log deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Work log not found" })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkLog(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.workLogsService.deleteWorkLog(organizationId, id);
  }

  // ========================================================================
  // CLOCK IN/OUT
  // ========================================================================

  @Post("clock-in")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Clock in" })
  @ApiResponse({
    status: 201,
    description: "Clocked in successfully",
    type: WorkLog,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async clockIn(
    @CurrentOrganizationId() organizationId: string,

    @CurrentUser() user: ICurrentUser,
    @Body() dto: ClockInDto,
  ): Promise<WorkLog> {
    return this.workLogsService.clockIn(organizationId, user.id, dto);
  }

  @Post("clock-out")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Clock out" })
  @ApiResponse({
    status: 201,
    description: "Clocked out successfully",
    type: WorkLog,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async clockOut(
    @CurrentOrganizationId() organizationId: string,

    @CurrentUser() user: ICurrentUser,
    @Body() dto: ClockOutDto,
  ): Promise<WorkLog> {
    return this.workLogsService.clockOut(organizationId, user.id, dto);
  }

  // ========================================================================
  // WORK LOG WORKFLOW
  // ========================================================================

  @Post(":id/submit")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Submit work log for approval" })
  @ApiResponse({
    status: 201,
    description: "Work log submitted",
    type: WorkLog,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Work log not found" })
  @ApiParam({ name: "id", type: "string" })
  async submitWorkLog(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<WorkLog> {
    return this.workLogsService.submitWorkLog(organizationId, id);
  }

  @Post(":id/approve")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Approve work log" })
  @ApiResponse({ status: 201, description: "Work log approved", type: WorkLog })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Work log not found" })
  @ApiParam({ name: "id", type: "string" })
  async approveWorkLog(
    @CurrentOrganizationId() organizationId: string,

    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveWorkLogDto,
  ): Promise<WorkLog> {
    return this.workLogsService.approveWorkLog(
      organizationId,
      id,
      user.id,
      dto,
    );
  }

  @Post(":id/reject")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Reject work log" })
  @ApiResponse({ status: 201, description: "Work log rejected", type: WorkLog })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Work log not found" })
  @ApiParam({ name: "id", type: "string" })
  async rejectWorkLog(
    @CurrentOrganizationId() organizationId: string,

    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectWorkLogDto,
  ): Promise<WorkLog> {
    return this.workLogsService.rejectWorkLog(organizationId, id, user.id, dto);
  }

  @Post("bulk-approve")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Bulk approve work logs" })
  @ApiResponse({ status: 201, description: "Work logs bulk approved" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async bulkApprove(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: BulkApproveWorkLogsDto,
  ) {
    return this.workLogsService.bulkApprove(organizationId, dto.ids, user.id);
  }

  // ========================================================================
  // TIME OFF REQUESTS
  // ========================================================================

  @Post("time-off")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Create time off request" })
  @ApiResponse({
    status: 201,
    description: "Time off request created",
    type: TimeOffRequest,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createTimeOffRequest(
    @CurrentOrganizationId() organizationId: string,

    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateTimeOffRequestDto,
  ): Promise<TimeOffRequest> {
    return this.workLogsService.createTimeOffRequest(
      organizationId,
      user.id,
      dto,
    );
  }

  @Post("time-off/:id/approve")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Approve time off request" })
  @ApiResponse({
    status: 201,
    description: "Time off request approved",
    type: TimeOffRequest,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Time off request not found" })
  @ApiParam({ name: "id", type: "string" })
  async approveTimeOff(
    @CurrentOrganizationId() organizationId: string,

    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveTimeOffDto,
  ): Promise<TimeOffRequest> {
    return this.workLogsService.approveTimeOff(
      organizationId,
      id,
      user.id,
      dto,
    );
  }

  @Post("time-off/:id/reject")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Reject time off request" })
  @ApiResponse({
    status: 201,
    description: "Time off request rejected",
    type: TimeOffRequest,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Time off request not found" })
  @ApiParam({ name: "id", type: "string" })
  async rejectTimeOff(
    @CurrentOrganizationId() organizationId: string,

    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectTimeOffDto,
  ): Promise<TimeOffRequest> {
    return this.workLogsService.rejectTimeOff(organizationId, id, user.id, dto);
  }

  @Post("time-off/:id/cancel")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Cancel time off request" })
  @ApiResponse({
    status: 201,
    description: "Time off request cancelled",
    type: TimeOffRequest,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Time off request not found" })
  @ApiParam({ name: "id", type: "string" })
  async cancelTimeOff(
    @CurrentOrganizationId() organizationId: string,

    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<TimeOffRequest> {
    return this.workLogsService.cancelTimeOff(organizationId, id, user.id);
  }

  // ========================================================================
  // TIMESHEETS
  // ========================================================================

  @Post("timesheets")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Create timesheet" })
  @ApiResponse({
    status: 201,
    description: "Timesheet created",
    type: Timesheet,
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async createTimesheet(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: CreateTimesheetDto,
  ): Promise<Timesheet> {
    return this.workLogsService.createTimesheet(organizationId, dto);
  }

  @Post("timesheets/:id/submit")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Submit timesheet for approval" })
  @ApiResponse({
    status: 201,
    description: "Timesheet submitted",
    type: Timesheet,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Timesheet not found" })
  @ApiParam({ name: "id", type: "string" })
  async submitTimesheet(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Timesheet> {
    return this.workLogsService.submitTimesheet(organizationId, id);
  }

  @Post("timesheets/:id/approve")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Approve timesheet" })
  @ApiResponse({
    status: 201,
    description: "Timesheet approved",
    type: Timesheet,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Timesheet not found" })
  @ApiParam({ name: "id", type: "string" })
  async approveTimesheet(
    @CurrentOrganizationId() organizationId: string,

    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveTimesheetDto,
  ): Promise<Timesheet> {
    return this.workLogsService.approveTimesheet(
      organizationId,
      id,
      user.id,
      dto,
    );
  }

  @Post("timesheets/:id/mark-paid")
  @Roles("accountant", "admin", "owner")
  @ApiOperation({ summary: "Mark timesheet as paid" })
  @ApiResponse({
    status: 201,
    description: "Timesheet marked as paid",
    type: Timesheet,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Timesheet not found" })
  @ApiParam({ name: "id", type: "string" })
  async markTimesheetPaid(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Timesheet> {
    return this.workLogsService.markTimesheetPaid(organizationId, id);
  }
}
