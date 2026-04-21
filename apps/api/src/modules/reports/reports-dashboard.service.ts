/**
 * Reports Dashboard Service
 * Dashboards, widgets, saved filters
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Dashboard,
  SavedReportFilter,
  ChartType,
} from "./entities/report.entity";
import { DashboardWidget } from "../analytics/entities/analytics.entity";

export interface CreateDashboardDto {
  organizationId: string;
  name: string;
  description?: string;
  layout?: "grid" | "freeform";
  columns?: number;
  isPublic?: boolean;
  widgets?: Partial<DashboardWidget>[];
}

export interface CreateWidgetDto {
  organizationId?: string;
  title: string;
  chartType?: string;
  position?: number;
  width?: number;
  height?: number;
  config?: Record<string, unknown>;
}

@Injectable()
export class ReportsDashboardService {
  constructor(
    @InjectRepository(Dashboard)
    private dashboardRepo: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private widgetRepo: Repository<DashboardWidget>,
    @InjectRepository(SavedReportFilter)
    private filterRepo: Repository<SavedReportFilter>,
  ) {}

  // ── Dashboards ───────────────────────────────────────────

  async createDashboard(
    dto: CreateDashboardDto,
    createdById: string,
  ): Promise<Dashboard> {
    const dashboard = this.dashboardRepo.create({
      organizationId: dto.organizationId,
      name: dto.name,
      ...(dto.description !== undefined && { description: dto.description }),
      gridColumns: dto.columns || 12,
      isPublic: dto.isPublic || false,
      isDefault: false,
      isActive: true,
      createdById: createdById,
    });

    const saved = (await this.dashboardRepo.save(dashboard)) as Dashboard;

    if (dto.widgets?.length) {
      for (let i = 0; i < dto.widgets.length; i++) {
        const w = dto.widgets[i]!;
        const chartType = w.chartType as string | undefined;
        await this.createWidget(
          {
            organizationId: dto.organizationId,
            title: w.title || `Widget ${i + 1}`,
            ...(chartType !== undefined && { chartType }),
            position: w.position ?? i,
            width: w.width ?? 4,
            height: w.height ?? 2,
            config: w.config as Record<string, unknown>,
          },
          dto.organizationId,
        );
      }
    }

    return this.getDashboard(saved.id, dto.organizationId);
  }

  async getDashboards(organizationId: string): Promise<Dashboard[]> {
    return this.dashboardRepo.find({
      where: { organizationId },
      order: { isDefault: "DESC", createdAt: "DESC" },
    });
  }

  async getDashboard(id: string, organizationId: string): Promise<Dashboard> {
    const dashboard = await this.dashboardRepo.findOne({
      where: { id, organizationId },
    });

    if (!dashboard) {
      throw new NotFoundException(`Дашборд ${id} не найден`);
    }

    await this.dashboardRepo.increment({ id }, "viewCount", 1);

    return dashboard;
  }

  async updateDashboard(
    id: string,
    organizationId: string,
    updates: Partial<Dashboard>,
  ): Promise<Dashboard> {
    const dashboard = await this.getDashboard(id, organizationId);
    Object.assign(dashboard, updates);
    dashboard.updatedAt = new Date();
    await this.dashboardRepo.save(dashboard);
    return this.getDashboard(id, organizationId);
  }

  async deleteDashboard(id: string, organizationId: string): Promise<void> {
    await this.getDashboard(id, organizationId);
    await this.widgetRepo.softDelete({ organizationId });
    await this.dashboardRepo.softDelete(id);
  }

  async setDefaultDashboard(
    organizationId: string,
    dashboardId: string,
  ): Promise<void> {
    await this.getDashboard(dashboardId, organizationId);
    await this.dashboardRepo.update({ organizationId }, { isDefault: false });
    await this.dashboardRepo.update(
      { id: dashboardId, organizationId },
      { isDefault: true },
    );
  }

  // ── Widgets ──────────────────────────────────────────────

  async createWidget(
    dto: CreateWidgetDto,
    organizationId: string,
  ): Promise<DashboardWidget> {
    const widget = this.widgetRepo.create({
      organizationId,
      title: dto.title,
      chartType: (dto.chartType || "kpi") as ChartType,
      position: dto.position ?? 0,
      width: dto.width ?? 4,
      height: dto.height ?? 2,
      config: (dto.config || {}) as DashboardWidget["config"],
    } as unknown as Partial<DashboardWidget>);

    return this.widgetRepo.save(widget) as Promise<DashboardWidget>;
  }

  async updateWidget(
    id: string,
    organizationId: string,
    updates: Partial<DashboardWidget>,
  ): Promise<DashboardWidget> {
    const widget = await this.widgetRepo.findOne({
      where: { id, organizationId },
    });
    if (!widget) {
      throw new NotFoundException(`Виджет ${id} не найден`);
    }

    Object.assign(widget, updates);
    return this.widgetRepo.save(widget);
  }

  async deleteWidget(id: string, organizationId: string): Promise<void> {
    const widget = await this.widgetRepo.findOne({
      where: { id, organizationId },
    });
    if (!widget) {
      throw new NotFoundException(`Виджет ${id} не найден`);
    }
    await this.widgetRepo.softDelete(id);
  }

  async reorderWidgets(
    organizationId: string,
    widgetIds: string[],
  ): Promise<void> {
    for (let i = 0; i < widgetIds.length; i++) {
      const widgetId = widgetIds[i];
      if (!widgetId) continue;
      await this.widgetRepo.update(
        { id: widgetId, organizationId },
        { position: i },
      );
    }
  }

  // ── Saved Filters ────────────────────────────────────────

  async saveFilter(
    userId: string,
    organizationId: string,
    reportDefinitionId: string,
    name: string,
    filters: Record<string, unknown>,
    isDefault: boolean = false,
  ): Promise<SavedReportFilter> {
    if (isDefault) {
      await this.filterRepo.update(
        { userId, definitionId: reportDefinitionId },
        { isDefault: false },
      );
    }

    const saved = this.filterRepo.create({
      userId,
      organizationId,
      definitionId: reportDefinitionId,
      name,
      filters: filters as Record<string, unknown>,
      isDefault,
    });

    return this.filterRepo.save(saved);
  }

  async getSavedFilters(
    userId: string,
    organizationId: string,
    reportDefinitionId?: string,
  ): Promise<SavedReportFilter[]> {
    const where: {
      userId?: string;
      organizationId: string;
      definitionId?: string;
      isShared?: boolean;
    } = { organizationId };

    if (reportDefinitionId) {
      where.definitionId = reportDefinitionId;
    }

    return this.filterRepo.find({
      where: [
        { ...where, userId },
        { ...where, isShared: true },
      ],
      order: { isDefault: "DESC", name: "ASC" },
    });
  }

  async deleteSavedFilter(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const filter = await this.filterRepo.findOne({
      where: { id, userId, organizationId },
    });
    if (!filter) {
      throw new NotFoundException(`Фильтр ${id} не найден`);
    }
    await this.filterRepo.softDelete(id);
  }
}
