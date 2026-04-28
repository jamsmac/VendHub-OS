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
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { MaintenanceService } from "./maintenance.service";
import {
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto,
  ApproveMaintenanceRequestDto,
  RejectMaintenanceRequestDto,
  AssignTechnicianDto,
  StartMaintenanceDto,
  CompleteMaintenanceDto,
  MarkCompletedDto,
  VerifyMaintenanceDto,
  MaintenanceQueryDto,
  CreateMaintenancePartDto,
  UpdateMaintenancePartDto,
  CreateMaintenanceWorkLogDto,
  UpdateMaintenanceWorkLogDto,
  CreateMaintenanceScheduleDto,
  UpdateMaintenanceScheduleDto,
  ScheduleQueryDto,
} from "./dto/maintenance.dto";
import {
  MaintenanceRequest,
  MaintenancePart,
  MaintenanceWorkLog,
  MaintenanceSchedule,
} from "./entities/maintenance.entity";

import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentOrganizationId,
  ICurrentUser,
} from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import { CancelMaintenanceDto } from "./dto/maintenance-operations.dto";

@ApiTags("Maintenance")
@ApiBearerAuth()
@Controller("maintenance")
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // ========================================================================
  // MAINTENANCE REQUESTS
  // ========================================================================

  @Post()
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Create maintenance request" })
  @ApiResponse({ status: 201, type: MaintenanceRequest })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.create(organizationId, user.id, dto);
  }

  @Get()
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "List maintenance requests" })
  @ApiResponse({ status: 200 })
  async findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: MaintenanceQueryDto,
  ) {
    return this.maintenanceService.findAll(organizationId, query);
  }

  @Get("stats")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Get maintenance statistics" })
  async getStats(
    @CurrentOrganizationId() organizationId: string,
    @Query("startDate") startDate?: Date,
    @Query("endDate") endDate?: Date,
  ) {
    return this.maintenanceService.getStats(organizationId, startDate, endDate);
  }

  @Get(":id")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get maintenance request by ID" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: MaintenanceRequest })
  async findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.findOne(organizationId, id);
  }

  @Put(":id")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Update maintenance request" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: MaintenanceRequest })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.update(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Delete maintenance request" })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.maintenanceService.delete(organizationId, id);
  }

  // ========================================================================
  // WORKFLOW ENDPOINTS
  // ========================================================================

  @Post(":id/submit")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Submit maintenance request for approval" })
  @ApiParam({ name: "id", type: "string" })
  async submit(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.submit(organizationId, id, user.id);
  }

  @Post(":id/approve")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Approve maintenance request" })
  @ApiParam({ name: "id", type: "string" })
  async approve(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.approve(organizationId, id, user.id, dto);
  }

  @Post(":id/reject")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Reject maintenance request" })
  @ApiParam({ name: "id", type: "string" })
  async reject(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.reject(organizationId, id, user.id, dto);
  }

  @Post(":id/assign")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Assign technician to maintenance" })
  @ApiParam({ name: "id", type: "string" })
  async assign(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignTechnicianDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.assignTechnician(
      organizationId,
      id,
      user.id,
      dto,
    );
  }

  @Post(":id/start")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Start maintenance work" })
  @ApiParam({ name: "id", type: "string" })
  async start(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: StartMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.start(organizationId, id, user.id, dto);
  }

  @Post(":id/awaiting-parts")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Set maintenance to awaiting parts" })
  @ApiParam({ name: "id", type: "string" })
  async awaitingParts(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.setAwaitingParts(
      organizationId,
      id,
      user.id,
    );
  }

  @Post(":id/complete")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Complete maintenance" })
  @ApiParam({ name: "id", type: "string" })
  async complete(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CompleteMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.complete(organizationId, id, user.id, dto);
  }

  @Post(":id/mark-completed")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({
    summary:
      "Quick-complete maintenance (operator path: photo + notes, skip submit/approve/in-progress)",
  })
  @ApiParam({ name: "id", type: "string" })
  async markCompleted(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: MarkCompletedDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.markCompleted(
      organizationId,
      id,
      user.id,
      dto,
    );
  }

  @Post(":id/verify")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Verify completed maintenance" })
  @ApiParam({ name: "id", type: "string" })
  async verify(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: VerifyMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.verify(organizationId, id, user.id, dto);
  }

  @Post(":id/cancel")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Cancel maintenance request" })
  @ApiParam({ name: "id", type: "string" })
  async cancel(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    return this.maintenanceService.cancel(
      organizationId,
      id,
      user.id,
      dto.reason,
    );
  }

  // ========================================================================
  // PARTS ENDPOINTS
  // ========================================================================

  @Post(":id/parts")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Add part to maintenance" })
  @ApiParam({ name: "id", type: "string" })
  async addPart(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenancePartDto,
  ): Promise<MaintenancePart> {
    return this.maintenanceService.addPart(organizationId, id, dto);
  }

  @Put(":id/parts/:partId")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Update part" })
  @ApiParam({ name: "id", type: "string" })
  @ApiParam({ name: "partId", type: "string" })
  async updatePart(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("partId", ParseUUIDPipe) partId: string,
    @Body() dto: UpdateMaintenancePartDto,
  ): Promise<MaintenancePart> {
    return this.maintenanceService.updatePart(organizationId, id, partId, dto);
  }

  @Delete(":id/parts/:partId")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Remove part from maintenance" })
  @ApiParam({ name: "id", type: "string" })
  @ApiParam({ name: "partId", type: "string" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePart(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("partId", ParseUUIDPipe) partId: string,
  ): Promise<void> {
    return this.maintenanceService.removePart(organizationId, id, partId);
  }

  // ========================================================================
  // WORK LOG ENDPOINTS
  // ========================================================================

  @Post(":id/work-logs")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Add work log to maintenance" })
  @ApiParam({ name: "id", type: "string" })
  async addWorkLog(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenanceWorkLogDto,
  ): Promise<MaintenanceWorkLog> {
    return this.maintenanceService.addWorkLog(organizationId, id, user.id, dto);
  }

  @Put(":id/work-logs/:logId")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Update work log" })
  @ApiParam({ name: "id", type: "string" })
  @ApiParam({ name: "logId", type: "string" })
  async updateWorkLog(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("logId", ParseUUIDPipe) logId: string,
    @Body() dto: UpdateMaintenanceWorkLogDto,
  ): Promise<MaintenanceWorkLog> {
    return this.maintenanceService.updateWorkLog(
      organizationId,
      id,
      logId,
      dto,
    );
  }

  @Delete(":id/work-logs/:logId")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Remove work log" })
  @ApiParam({ name: "id", type: "string" })
  @ApiParam({ name: "logId", type: "string" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeWorkLog(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("logId", ParseUUIDPipe) logId: string,
  ): Promise<void> {
    return this.maintenanceService.removeWorkLog(organizationId, id, logId);
  }

  // ========================================================================
  // SCHEDULES ENDPOINTS
  // ========================================================================

  @Post("schedules")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Create maintenance schedule" })
  async createSchedule(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateMaintenanceScheduleDto,
  ): Promise<MaintenanceSchedule> {
    return this.maintenanceService.createSchedule(organizationId, user.id, dto);
  }

  @Get("schedules")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "List maintenance schedules" })
  async findAllSchedules(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.maintenanceService.findAllSchedules(organizationId, query);
  }

  @Put("schedules/:id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Update maintenance schedule" })
  @ApiParam({ name: "id", type: "string" })
  async updateSchedule(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceScheduleDto,
  ): Promise<MaintenanceSchedule> {
    return this.maintenanceService.updateSchedule(organizationId, id, dto);
  }

  @Delete("schedules/:id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Delete maintenance schedule" })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.maintenanceService.deleteSchedule(organizationId, id);
  }
}
