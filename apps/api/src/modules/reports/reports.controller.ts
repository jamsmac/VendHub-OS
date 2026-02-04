/**
 * Reports Controller for VendHub OS
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  ReportsService,
  GenerateReportDto,
  CreateScheduledReportDto,
  CreateDashboardDto,
  CreateWidgetDto,
} from './reports.service';
import { ReportType, ExportFormat } from './entities/report.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUserId, CurrentOrganizationId } from '../../common/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ============================================================================
  // Report Definitions
  // ============================================================================

  @Get('definitions')
  @ApiOperation({ summary: 'Get available report definitions' })
  @Roles('owner', 'admin', 'manager', 'accountant')
  async getDefinitions(@CurrentOrganizationId() orgId: string) {
    return this.reportsService.getDefinitions(orgId);
  }

  @Get('definitions/:id')
  @ApiOperation({ summary: 'Get report definition by ID' })
  @Roles('owner', 'admin', 'manager', 'accountant')
  async getDefinition(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.getDefinition(id);
  }

  @Post('definitions')
  @ApiOperation({ summary: 'Create custom report definition' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createDefinition(
    @Body() data: any,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.reportsService.createDefinition({
      ...data,
      organizationId: orgId,
    });
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  @Post('generate')
  @ApiOperation({ summary: 'Generate report' })
  @Roles('owner', 'admin', 'manager', 'accountant')
  @HttpCode(HttpStatus.CREATED)
  async generate(
    @Body() dto: GenerateReportDto,
    @CurrentOrganizationId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.reportsService.generate(
      { ...dto, organizationId: dto.organizationId || orgId },
      userId,
    );
  }

  @Get('generated')
  @ApiOperation({ summary: 'Get generated reports' })
  @ApiQuery({ name: 'type', required: false, enum: ReportType })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles('owner', 'admin', 'manager', 'accountant')
  async getGeneratedReports(
    @CurrentOrganizationId() orgId: string,
    @Query('type') type?: ReportType,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: number,
  ) {
    return this.reportsService.getGeneratedReports(orgId, {
      type,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit,
    });
  }

  @Get('generated/:id')
  @ApiOperation({ summary: 'Get generated report by ID' })
  @Roles('owner', 'admin', 'manager', 'accountant')
  async getGeneratedReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.getGeneratedReport(id);
  }

  // ============================================================================
  // Scheduled Reports
  // ============================================================================

  @Get('scheduled')
  @ApiOperation({ summary: 'Get scheduled reports' })
  @Roles('owner', 'admin', 'manager')
  async getScheduledReports(@CurrentOrganizationId() orgId: string) {
    return this.reportsService.getScheduledReports(orgId);
  }

  @Post('scheduled')
  @ApiOperation({ summary: 'Create scheduled report' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.CREATED)
  async createScheduledReport(
    @Body() dto: CreateScheduledReportDto,
    @CurrentOrganizationId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.reportsService.createScheduledReport(
      { ...dto, organizationId: dto.organizationId || orgId },
      userId,
    );
  }

  @Patch('scheduled/:id')
  @ApiOperation({ summary: 'Update scheduled report' })
  @Roles('owner', 'admin')
  async updateScheduledReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updates: any,
  ) {
    return this.reportsService.updateScheduledReport(id, updates);
  }

  @Delete('scheduled/:id')
  @ApiOperation({ summary: 'Delete scheduled report' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteScheduledReport(@Param('id', ParseUUIDPipe) id: string) {
    await this.reportsService.deleteScheduledReport(id);
  }

  // ============================================================================
  // Dashboards
  // ============================================================================

  @Get('dashboards')
  @ApiOperation({ summary: 'Get dashboards' })
  async getDashboards(@CurrentOrganizationId() orgId: string) {
    return this.reportsService.getDashboards(orgId);
  }

  @Get('dashboards/:id')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  async getDashboard(@Param('id', ParseUUIDPipe) id: string) {
    return this.reportsService.getDashboard(id);
  }

  @Post('dashboards')
  @ApiOperation({ summary: 'Create dashboard' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async createDashboard(
    @Body() dto: CreateDashboardDto,
    @CurrentOrganizationId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.reportsService.createDashboard(
      { ...dto, organizationId: dto.organizationId || orgId },
      userId,
    );
  }

  @Patch('dashboards/:id')
  @ApiOperation({ summary: 'Update dashboard' })
  @Roles('owner', 'admin', 'manager')
  async updateDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updates: any,
  ) {
    return this.reportsService.updateDashboard(id, updates);
  }

  @Delete('dashboards/:id')
  @ApiOperation({ summary: 'Delete dashboard' })
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDashboard(@Param('id', ParseUUIDPipe) id: string) {
    await this.reportsService.deleteDashboard(id);
  }

  @Post('dashboards/:id/set-default')
  @ApiOperation({ summary: 'Set dashboard as default' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.OK)
  async setDefaultDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    await this.reportsService.setDefaultDashboard(orgId, id);
    return { success: true };
  }

  // ============================================================================
  // Widgets
  // ============================================================================

  @Post('widgets')
  @ApiOperation({ summary: 'Create widget' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  async createWidget(@Body() dto: CreateWidgetDto) {
    return this.reportsService.createWidget(dto);
  }

  @Patch('widgets/:id')
  @ApiOperation({ summary: 'Update widget' })
  @Roles('owner', 'admin', 'manager')
  async updateWidget(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updates: any,
  ) {
    return this.reportsService.updateWidget(id, updates);
  }

  @Delete('widgets/:id')
  @ApiOperation({ summary: 'Delete widget' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWidget(@Param('id', ParseUUIDPipe) id: string) {
    await this.reportsService.deleteWidget(id);
  }

  @Post('dashboards/:id/reorder-widgets')
  @ApiOperation({ summary: 'Reorder widgets' })
  @Roles('owner', 'admin', 'manager')
  @HttpCode(HttpStatus.OK)
  async reorderWidgets(
    @Param('id', ParseUUIDPipe) dashboardId: string,
    @Body('widgetIds') widgetIds: string[],
  ) {
    await this.reportsService.reorderWidgets(dashboardId, widgetIds);
    return { success: true };
  }

  // ============================================================================
  // Saved Filters
  // ============================================================================

  @Get('filters')
  @ApiOperation({ summary: 'Get saved filters' })
  @ApiQuery({ name: 'reportDefinitionId', required: false })
  async getSavedFilters(
    @CurrentUserId() userId: string,
    @Query('reportDefinitionId') reportDefinitionId?: string,
  ) {
    return this.reportsService.getSavedFilters(userId, reportDefinitionId);
  }

  @Post('filters')
  @ApiOperation({ summary: 'Save filter' })
  @HttpCode(HttpStatus.CREATED)
  async saveFilter(
    @Body() body: {
      reportDefinitionId: string;
      name: string;
      filters: Record<string, any>;
      isDefault?: boolean;
    },
    @CurrentUserId() userId: string,
    @CurrentOrganizationId() orgId: string,
  ) {
    return this.reportsService.saveFilter(
      userId,
      orgId,
      body.reportDefinitionId,
      body.name,
      body.filters,
      body.isDefault,
    );
  }

  @Delete('filters/:id')
  @ApiOperation({ summary: 'Delete saved filter' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSavedFilter(@Param('id', ParseUUIDPipe) id: string) {
    await this.reportsService.deleteSavedFilter(id);
  }

  // ============================================================================
  // Quick Reports (Legacy endpoints for compatibility)
  // ============================================================================

  @Get('sales')
  @ApiOperation({ summary: 'Quick sales report' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'machineId', required: false })
  @Roles('owner', 'admin', 'manager', 'accountant')
  async getSalesReport(
    @CurrentOrganizationId() orgId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('machineId') machineId?: string,
  ) {
    return this.reportsService.generate({
      organizationId: orgId,
      type: ReportType.SALES_SUMMARY,
      format: ExportFormat.JSON,
      dateFrom: dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dateTo: dateTo ? new Date(dateTo) : new Date(),
      parameters: { machineId },
    });
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Quick inventory report' })
  @Roles('owner', 'admin', 'manager', 'warehouse')
  async getInventoryReport(@CurrentOrganizationId() orgId: string) {
    return this.reportsService.generate({
      organizationId: orgId,
      type: ReportType.INVENTORY_LEVELS,
      format: ExportFormat.JSON,
    });
  }

  @Get('machines')
  @ApiOperation({ summary: 'Quick machines report' })
  @Roles('owner', 'admin', 'manager')
  async getMachinesReport(@CurrentOrganizationId() orgId: string) {
    return this.reportsService.generate({
      organizationId: orgId,
      type: ReportType.MACHINE_PERFORMANCE,
      format: ExportFormat.JSON,
    });
  }
}
