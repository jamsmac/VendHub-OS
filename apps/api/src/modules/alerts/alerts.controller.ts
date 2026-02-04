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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { AlertsService } from './alerts.service';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AlertRuleQueryDto,
  AlertHistoryQueryDto,
} from './dto/create-alert-rule.dto';
import {
  AcknowledgeAlertDto,
  ResolveAlertDto,
  DismissAlertDto,
} from './dto/acknowledge-alert.dto';
import { AlertRule, AlertHistory } from './entities/alert-rule.entity';

// Placeholder decorators (same pattern as other modules)
interface UserPayload {
  id: string;
  [key: string]: unknown;
}
const Roles = (..._roles: string[]) => (target: object, key?: string, descriptor?: PropertyDescriptor) => descriptor || target;
const CurrentUser = () => (_target: object, _key: string, _index: number) => {};
const Organization = () => (_target: object, _key: string, _index: number) => {};

@ApiTags('Alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // ========================================================================
  // ALERT RULES
  // ========================================================================

  @Post('rules')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Create alert rule' })
  @ApiResponse({ status: 201, type: AlertRule })
  async createRule(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateAlertRuleDto,
  ): Promise<AlertRule> {
    return this.alertsService.createRule(organizationId, user.id, dto);
  }

  @Get('rules')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'List alert rules' })
  @ApiResponse({ status: 200 })
  async findAllRules(
    @Organization() organizationId: string,
    @Query() query: AlertRuleQueryDto,
  ) {
    return this.alertsService.findAllRules(organizationId, query);
  }

  @Get('rules/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get alert rule by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: AlertRule })
  async findOneRule(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AlertRule> {
    return this.alertsService.findOneRule(organizationId, id);
  }

  @Put('rules/:id')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Update alert rule' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: AlertRule })
  async updateRule(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAlertRuleDto,
  ): Promise<AlertRule> {
    return this.alertsService.updateRule(organizationId, id, dto);
  }

  @Delete('rules/:id')
  @Roles('admin', 'owner')
  @ApiOperation({ summary: 'Delete alert rule (soft delete)' })
  @ApiParam({ name: 'id', type: 'string' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(
    @Organization() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.alertsService.deleteRule(organizationId, id);
  }

  // ========================================================================
  // ALERT HISTORY
  // ========================================================================

  @Get('history')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get alert history' })
  @ApiResponse({ status: 200 })
  async getAlertHistory(
    @Organization() organizationId: string,
    @Query() query: AlertHistoryQueryDto,
  ) {
    return this.alertsService.getAlertHistory(organizationId, query);
  }

  @Get('active')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Get active (unresolved) alerts' })
  @ApiResponse({ status: 200, type: [AlertHistory] })
  async getActiveAlerts(
    @Organization() organizationId: string,
    @Query('machineId') machineId?: string,
  ): Promise<AlertHistory[]> {
    return this.alertsService.getActiveAlerts(organizationId, machineId);
  }

  // ========================================================================
  // ALERT LIFECYCLE
  // ========================================================================

  @Post(':id/acknowledge')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Acknowledge an active alert' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: AlertHistory })
  async acknowledgeAlert(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeAlertDto,
  ): Promise<AlertHistory> {
    return this.alertsService.acknowledgeAlert(organizationId, id, user.id, dto);
  }

  @Post(':id/resolve')
  @Roles('operator', 'manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: AlertHistory })
  async resolveAlert(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveAlertDto,
  ): Promise<AlertHistory> {
    return this.alertsService.resolveAlert(organizationId, id, user.id, dto);
  }

  @Post(':id/dismiss')
  @Roles('manager', 'admin', 'owner')
  @ApiOperation({ summary: 'Dismiss an alert' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: AlertHistory })
  async dismissAlert(
    @Organization() organizationId: string,
    @CurrentUser() user: UserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DismissAlertDto,
  ): Promise<AlertHistory> {
    return this.alertsService.dismissAlert(organizationId, id, user.id, dto);
  }
}
