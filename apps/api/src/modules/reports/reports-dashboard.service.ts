/**
 * Reports Dashboard Service
 * Dashboards, widgets, saved filters
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Dashboard,
  DashboardWidget,
  SavedReportFilter,
  ChartType,
} from "./entities/report.entity";

export interface CreateDashboardDto {
  organizationId: string;
  name: string;
  description?: string;
  layout?: "grid" | "freeform";
  columns?: number;
  isPublic?: boolean;
  widgets?: Omit<DashboardWidget, "id" | "dashboardId">[];
}

export interface CreateWidgetDto {
  dashboardId: string;
  organizationId?: string;
  title: string;
  chartType?: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  definitionId?: string;
  chartConfig?: DashboardWidget["chartConfig"];
  kpiConfig?: DashboardWidget["kpiConfig"];
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
      description: dto.description,
      gridColumns: dto.columns || 12,
      isPublic: dto.isPublic || false,
      isDefault: false,
      isActive: true,
      createdById: createdById,
    });

    const saved = await this.dashboardRepo.save(dashboard);

    if (dto.widgets?.length) {
      for (const widgetDto of dto.widgets) {
        await this.createWidget(
          {
            dashboardId: saved.id,
            organizationId: dto.organizationId,
            title: widgetDto.title,
            chartType: widgetDto.chartType,
            positionX: widgetDto.positionX,
            positionY: widgetDto.positionY,
            width: widgetDto.width,
            height: widgetDto.height,
            definitionId: widgetDto.definitionId,
            chartConfig: widgetDto.chartConfig,
            kpiConfig: widgetDto.kpiConfig,
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
      relations: ["widgets"],
      order: { isDefault: "DESC", createdAt: "DESC" },
    });
  }

  async getDashboard(id: string, organizationId: string): Promise<Dashboard> {
    const where = { id, organizationId };
    const dashboard = await this.dashboardRepo.findOne({
      where,
      relations: ["widgets"],
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
    const dashboard = await this.getDashboard(id, organizationId);
    await this.widgetRepo.softDelete({ dashboardId: dashboard.id });
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
    const dashboard = await this.dashboardRepo.findOne({
      where: { id: dto.dashboardId, organizationId },
    });
    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${dto.dashboardId} not found`);
    }

    const widget = this.widgetRepo.create({
      organizationId: dashboard.organizationId,
      dashboardId: dto.dashboardId,
      title: dto.title,
      chartType: (dto.chartType || "kpi") as ChartType,
      positionX: dto.positionX,
      positionY: dto.positionY,
      width: dto.width,
      height: dto.height,
      definitionId: dto.definitionId,
      chartConfig: dto.chartConfig,
      kpiConfig: dto.kpiConfig,
      isVisible: true,
      isActive: true,
    });

    return this.widgetRepo.save(widget);
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
    dashboardId: string,
    organizationId: string,
    widgetIds: string[],
  ): Promise<void> {
    await this.getDashboard(dashboardId, organizationId);
    for (let i = 0; i < widgetIds.length; i++) {
      await this.widgetRepo.update(
        { id: widgetIds[i], dashboardId },
        { positionY: i },
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
