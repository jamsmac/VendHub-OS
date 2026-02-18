/**
 * Alerts Controller
 * REST API endpoints for alert rules and alert history
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

import { AlertsService } from "./alerts.service";
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AlertRuleQueryDto,
  AlertHistoryQueryDto,
} from "./dto/create-alert-rule.dto";
import {
  AcknowledgeAlertDto,
  ResolveAlertDto,
  DismissAlertDto,
} from "./dto/acknowledge-alert.dto";
import { AlertRule, AlertHistory } from "./entities/alert-rule.entity";

import { Roles } from "../../common/decorators/roles.decorator";
import {
  CurrentUser,
  CurrentOrganizationId,
  ICurrentUser,
} from "../../common/decorators/current-user.decorator";

@ApiTags("Alerts")
@ApiBearerAuth()
@Controller("alerts")
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ========================================================================
  // ALERT RULES
  // ========================================================================

  @Post("rules")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Create alert rule" })
  @ApiResponse({ status: 201, type: AlertRule })
  async createRule(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Body() dto: CreateAlertRuleDto,
  ): Promise<AlertRule> {
    return this.alertsService.createRule(organizationId, user.id, dto);
  }

  @Get("rules")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "List alert rules" })
  @ApiResponse({ status: 200 })
  async findAllRules(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: AlertRuleQueryDto,
  ) {
    return this.alertsService.findAllRules(organizationId, query);
  }

  @Get("rules/:id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Get alert rule by ID" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: AlertRule })
  async findOneRule(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AlertRule> {
    return this.alertsService.findOneRule(organizationId, id);
  }

  @Put("rules/:id")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Update alert rule" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: AlertRule })
  async updateRule(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
  ): Promise<AlertRule> {
    return this.alertsService.updateRule(organizationId, id, dto);
  }

  @Delete("rules/:id")
  @Roles("admin", "owner")
  @ApiOperation({ summary: "Delete alert rule (soft delete)" })
  @ApiParam({ name: "id", type: "string" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(
    @CurrentOrganizationId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.alertsService.deleteRule(organizationId, id);
  }

  // ========================================================================
  // ALERT HISTORY
  // ========================================================================

  @Get("history")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get alert history" })
  @ApiResponse({ status: 200 })
  async getAlertHistory(
    @CurrentOrganizationId() organizationId: string,
    @Query() query: AlertHistoryQueryDto,
  ) {
    return this.alertsService.getAlertHistory(organizationId, query);
  }

  @Get("active")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Get active (unresolved) alerts" })
  @ApiResponse({ status: 200, type: [AlertHistory] })
  async getActiveAlerts(
    @CurrentOrganizationId() organizationId: string,
    @Query("machineId") machineId?: string,
  ): Promise<AlertHistory[]> {
    return this.alertsService.getActiveAlerts(organizationId, machineId);
  }

  // ========================================================================
  // ALERT LIFECYCLE
  // ========================================================================

  @Post(":id/acknowledge")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Acknowledge an active alert" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: AlertHistory })
  async acknowledgeAlert(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeAlertDto,
  ): Promise<AlertHistory> {
    return this.alertsService.acknowledgeAlert(
      organizationId,
      id,
      user.id,
      dto,
    );
  }

  @Post(":id/resolve")
  @Roles("operator", "manager", "admin", "owner")
  @ApiOperation({ summary: "Resolve an alert" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: AlertHistory })
  async resolveAlert(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolveAlertDto,
  ): Promise<AlertHistory> {
    return this.alertsService.resolveAlert(organizationId, id, user.id, dto);
  }

  @Post(":id/dismiss")
  @Roles("manager", "admin", "owner")
  @ApiOperation({ summary: "Dismiss an alert" })
  @ApiParam({ name: "id", type: "string" })
  @ApiResponse({ status: 200, type: AlertHistory })
  async dismissAlert(
    @CurrentOrganizationId() organizationId: string,
    @CurrentUser() user: ICurrentUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DismissAlertDto,
  ): Promise<AlertHistory> {
    return this.alertsService.dismissAlert(organizationId, id, user.id, dto);
  }
}
