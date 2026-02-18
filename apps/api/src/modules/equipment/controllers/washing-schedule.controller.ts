/**
 * Washing Schedule Controller
 * REST API endpoints for washing/cleaning schedules
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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { WashingScheduleService } from "../services/washing-schedule.service";
import {
  CreateWashingScheduleDto,
  UpdateWashingScheduleDto,
  WashingScheduleQueryDto,
} from "../dto/create-washing-schedule.dto";
import { WashingSchedule } from "../entities/equipment-component.entity";

import { Roles } from "../../../common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentOrganizationId,
  ICurrentUser,
} from "../../../common/decorators/current-user.decorator";

@ApiTags("Washing Schedules")
@ApiBearerAuth()
@Controller("washing-schedules")
export class WashingScheduleController {
  constructor(
    private readonly washingScheduleService: WashingScheduleService,
  ) {}

  @Post()
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Create washing schedule" })
  @ApiResponse({ status: 201, type: WashingSchedule })
  async create(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateWashingScheduleDto,
  ): Promise<WashingSchedule> {
    return this.washingScheduleService.create(organizationId, user.id, dto);
  }

  @Get()
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "List washing schedules" })
  @ApiResponse({ status: 200 })
  async findAll(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: WashingScheduleQueryDto,
  ) {
    return this.washingScheduleService.findAll(organizationId, query);
  }

  @Get(":id")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get washing schedule by ID" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: WashingSchedule })
  async findOne(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<WashingSchedule> {
    return this.washingScheduleService.findOne(organizationId, id);
  }

  @Put(":id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Update washing schedule" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: WashingSchedule })
  async update(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateWashingScheduleDto,
  ): Promise<WashingSchedule> {
    return this.washingScheduleService.update(organizationId, id, dto);
  }

  @Post(":id/complete")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Mark wash as completed and advance next date" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: WashingSchedule })
  async completeWash(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<WashingSchedule> {
    return this.washingScheduleService.completeWash(organizationId, id);
  }

  @Delete(":id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Delete washing schedule (soft delete)" })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.washingScheduleService.delete(organizationId, id);
  }
}
