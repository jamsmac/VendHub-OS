/**
 * Reports Service — Facade
 * Delegates to ReportsGeneratorService, ReportsSchedulerService, ReportsDashboardService
 */

import { Injectable } from "@nestjs/common";
import {
  ReportDefinition,
  ScheduledReport,
  GeneratedReport,
  Dashboard,
  SavedReportFilter,
  ReportType,
} from "./entities/report.entity";
import { DashboardWidget } from "../analytics/entities/analytics.entity";
import {
  ReportsGeneratorService,
  GenerateReportDto,
} from "./reports-generator.service";
import {
  ReportsSchedulerService,
  CreateScheduledReportDto,
} from "./reports-scheduler.service";
import {
  ReportsDashboardService,
  CreateDashboardDto,
  CreateWidgetDto,
} from "./reports-dashboard.service";

// Re-export DTOs for backward compatibility
export { GenerateReportDto } from "./reports-generator.service";
export { CreateScheduledReportDto } from "./reports-scheduler.service";
export {
  CreateDashboardDto,
  CreateWidgetDto,
} from "./reports-dashboard.service";

@Injectable()
export class ReportsService {
  constructor(
    private readonly generator: ReportsGeneratorService,
    private readonly scheduler: ReportsSchedulerService,
    private readonly dashboard: ReportsDashboardService,
  ) {}

  // ── Report Definitions ───────────────────────────────────

  getDefinitions(organizationId?: string): Promise<ReportDefinition[]> {
    return this.generator.getDefinitions(organizationId);
  }

  getDefinition(id: string, organizationId: string): Promise<ReportDefinition> {
    return this.generator.getDefinition(id, organizationId);
  }

  getDefinitionByCode(code: string): Promise<ReportDefinition> {
    return this.generator.getDefinitionByCode(code);
  }

  createDefinition(data: Partial<ReportDefinition>): Promise<ReportDefinition> {
    return this.generator.createDefinition(data);
  }

  // ── Report Generation ────────────────────────────────────

  generate(
    dto: GenerateReportDto,
    generatedById?: string,
  ): Promise<GeneratedReport> {
    return this.generator.generate(dto, generatedById);
  }

  // ── Generated Reports ────────────────────────────────────

  getGeneratedReports(
    organizationId: string,
    options?: {
      type?: ReportType;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: GeneratedReport[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.generator.getGeneratedReports(organizationId, options);
  }

  getGeneratedReport(
    id: string,
    organizationId: string,
  ): Promise<GeneratedReport> {
    return this.generator.getGeneratedReport(id, organizationId);
  }

  deleteExpiredReports(): Promise<number> {
    return this.generator.deleteExpiredReports();
  }

  // ── Scheduled Reports ────────────────────────────────────

  createScheduledReport(
    dto: CreateScheduledReportDto,
    createdById: string,
  ): Promise<ScheduledReport> {
    return this.scheduler.createScheduledReport(dto, createdById);
  }

  getScheduledReports(organizationId: string): Promise<ScheduledReport[]> {
    return this.scheduler.getScheduledReports(organizationId);
  }

  updateScheduledReport(
    id: string,
    organizationId: string,
    updates: Partial<ScheduledReport>,
  ): Promise<ScheduledReport> {
    return this.scheduler.updateScheduledReport(id, organizationId, updates);
  }

  deleteScheduledReport(id: string, organizationId: string): Promise<void> {
    return this.scheduler.deleteScheduledReport(id, organizationId);
  }

  // ── Dashboards ───────────────────────────────────────────

  createDashboard(
    dto: CreateDashboardDto,
    createdById: string,
  ): Promise<Dashboard> {
    return this.dashboard.createDashboard(dto, createdById);
  }

  getDashboards(organizationId: string): Promise<Dashboard[]> {
    return this.dashboard.getDashboards(organizationId);
  }

  getDashboard(id: string, organizationId: string): Promise<Dashboard> {
    return this.dashboard.getDashboard(id, organizationId);
  }

  updateDashboard(
    id: string,
    organizationId: string,
    updates: Partial<Dashboard>,
  ): Promise<Dashboard> {
    return this.dashboard.updateDashboard(id, organizationId, updates);
  }

  deleteDashboard(id: string, organizationId: string): Promise<void> {
    return this.dashboard.deleteDashboard(id, organizationId);
  }

  setDefaultDashboard(
    organizationId: string,
    dashboardId: string,
  ): Promise<void> {
    return this.dashboard.setDefaultDashboard(organizationId, dashboardId);
  }

  // ── Widgets ──────────────────────────────────────────────

  createWidget(
    dto: CreateWidgetDto,
    organizationId: string,
  ): Promise<DashboardWidget> {
    return this.dashboard.createWidget(dto, organizationId);
  }

  updateWidget(
    id: string,
    organizationId: string,
    updates: Partial<DashboardWidget>,
  ): Promise<DashboardWidget> {
    return this.dashboard.updateWidget(id, organizationId, updates);
  }

  deleteWidget(id: string, organizationId: string): Promise<void> {
    return this.dashboard.deleteWidget(id, organizationId);
  }

  reorderWidgets(
    dashboardId: string,
    organizationId: string,
    widgetIds: string[],
  ): Promise<void> {
    return this.dashboard.reorderWidgets(organizationId, widgetIds);
  }

  // ── Saved Filters ────────────────────────────────────────

  saveFilter(
    userId: string,
    organizationId: string,
    reportDefinitionId: string,
    name: string,
    filters: Record<string, unknown>,
    isDefault?: boolean,
  ): Promise<SavedReportFilter> {
    return this.dashboard.saveFilter(
      userId,
      organizationId,
      reportDefinitionId,
      name,
      filters,
      isDefault,
    );
  }

  getSavedFilters(
    userId: string,
    organizationId: string,
    reportDefinitionId?: string,
  ): Promise<SavedReportFilter[]> {
    return this.dashboard.getSavedFilters(
      userId,
      organizationId,
      reportDefinitionId,
    );
  }

  deleteSavedFilter(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    return this.dashboard.deleteSavedFilter(id, userId, organizationId);
  }
}
