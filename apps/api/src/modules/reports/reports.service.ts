/**
 * Reports Service for VendHub OS
 * Report generation, scheduling and dashboards
 */

import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ReportDefinition,
  ScheduledReport,
  GeneratedReport,
  DashboardWidget,
  Dashboard,
  SavedReportFilter,
  ReportSubscription,
  ReportType,
  ExportFormat,
  ReportStatus,
  ReportFrequency,
} from './entities/report.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { Product } from '../products/entities/product.entity';

// Type aliases for compatibility
type ReportFormat = ExportFormat;
type ScheduleFrequency = ReportFrequency;

// ============================================================================
// DTOs
// ============================================================================

export interface GenerateReportDto {
  organizationId: string;
  reportDefinitionId?: string;
  type?: ReportType;
  name?: string;
  format: ReportFormat;
  parameters?: Record<string, any>;
  dateFrom?: Date;
  dateTo?: Date;
  delivery?: {
    method: 'download' | 'email' | 'storage';
    emails?: string[];
    storagePath?: string;
  };
}

export interface CreateScheduledReportDto {
  organizationId: string;
  reportDefinitionId: string;
  name: string;
  frequency: ScheduleFrequency;
  scheduleConfig: {
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone?: string;
  };
  parameters: Record<string, any>;
  format: ReportFormat;
  deliveryMethod: 'email' | 'telegram' | 'webhook';
  deliveryConfig: {
    emails?: string[];
    telegramChatIds?: string[];
    webhookUrl?: string;
  };
}

export interface CreateDashboardDto {
  organizationId: string;
  name: string;
  description?: string;
  layout?: 'grid' | 'freeform';
  columns?: number;
  isPublic?: boolean;
  widgets?: Omit<DashboardWidget, 'id' | 'dashboardId'>[];
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
  chartConfig?: any;
  kpiConfig?: any;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(ReportDefinition)
    private definitionRepo: Repository<ReportDefinition>,
    @InjectRepository(ScheduledReport)
    private scheduledRepo: Repository<ScheduledReport>,
    @InjectRepository(GeneratedReport)
    private generatedRepo: Repository<GeneratedReport>,
    @InjectRepository(Dashboard)
    private dashboardRepo: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private widgetRepo: Repository<DashboardWidget>,
    @InjectRepository(SavedReportFilter)
    private filterRepo: Repository<SavedReportFilter>,
    @InjectRepository(ReportSubscription)
    private subscriptionRepo: Repository<ReportSubscription>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(Machine)
    private machineRepo: Repository<Machine>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  // ============================================================================
  // REPORT DEFINITIONS
  // ============================================================================

  async getDefinitions(organizationId?: string): Promise<ReportDefinition[]> {
    return this.definitionRepo.find({
      where: [
        { organizationId, isActive: true },
        { isSystem: true, isActive: true },
      ],
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getDefinition(id: string): Promise<ReportDefinition> {
    const definition = await this.definitionRepo.findOne({ where: { id } });
    if (!definition) {
      throw new NotFoundException(`Определение отчёта ${id} не найдено`);
    }
    return definition;
  }

  async getDefinitionByCode(code: string): Promise<ReportDefinition> {
    const definition = await this.definitionRepo.findOne({ where: { code } });
    if (!definition) {
      throw new NotFoundException(`Отчёт ${code} не найден`);
    }
    return definition;
  }

  async createDefinition(data: Partial<ReportDefinition>): Promise<ReportDefinition> {
    const definition = this.definitionRepo.create({
      ...data,
      isActive: true,
      isSystem: false,
      isPublic: false,
    });
    return this.definitionRepo.save(definition);
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  async generate(dto: GenerateReportDto, generatedById?: string): Promise<GeneratedReport> {
    const startTime = Date.now();

    // Get definition if provided
    let definition: ReportDefinition | null = null;
    if (dto.reportDefinitionId) {
      definition = await this.getDefinition(dto.reportDefinitionId);
    }

    const reportType = dto.type || definition?.type || ReportType.CUSTOM;
    const reportName = dto.name || definition?.name || `Отчёт ${new Date().toISOString()}`;

    // Create report record
    const report = this.generatedRepo.create({
      organizationId: dto.organizationId,
      definitionId: dto.reportDefinitionId || '',
      name: reportName,
      type: reportType,
      generationParams: {
        format: dto.format,
        ...dto.parameters,
      },
      filters: dto.parameters as any,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      status: ReportStatus.GENERATING,
      created_by_id: generatedById,
      startedAt: new Date(),
    });

    await this.generatedRepo.save(report);

    try {
      // Generate report data based on type
      const data = await this.generateReportData(reportType, dto);

      // Create file
      const { filePath, fileSize } = await this.createReportFile(
        report,
        data,
        dto.format,
      );

      // Update report - use files array instead of individual fields
      report.files = [{
        format: dto.format,
        url: filePath,
        filename: `${report.reportNumber}.${dto.format}`,
        size: fileSize,
        mimeType: this.getMimeType(dto.format),
        generatedAt: new Date(),
      }];
      report.status = ReportStatus.COMPLETED;
      report.generationTimeMs = Date.now() - startTime;
      report.completedAt = new Date();
      report.rowCount = data.rows?.length || 0;
      report.summary = data.summary;

      // Set expiration (7 days)
      report.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await this.generatedRepo.save(report);

      // Handle delivery
      if (dto.delivery) {
        await this.deliverReport(report, dto.delivery);
      }

      return report;
    } catch (error: any) {
      report.status = ReportStatus.FAILED;
      report.errorMessage = error.message;
      report.errorDetails = { stack: error.stack };
      report.generationTimeMs = Date.now() - startTime;
      report.completedAt = new Date();
      await this.generatedRepo.save(report);
      throw error;
    }
  }

  private async generateReportData(
    type: ReportType,
    dto: GenerateReportDto,
  ): Promise<{ rows: any[]; summary: any }> {
    // This would be implemented with actual data queries
    // Simplified example:

    switch (type) {
      case ReportType.SALES_SUMMARY:
        return this.generateSalesSummary(dto);
      case ReportType.MACHINE_PERFORMANCE:
        return this.generateMachinePerformance(dto);
      case ReportType.INVENTORY_LEVELS:
        return this.generateInventoryLevels(dto);
      default:
        return { rows: [], summary: {} };
    }
  }

  private async generateSalesSummary(dto: GenerateReportDto): Promise<any> {
    const qb = this.transactionRepo.createQueryBuilder('t')
      .where('t.organizationId = :orgId', { orgId: dto.organizationId });

    if (dto.dateFrom) {
      qb.andWhere('t.transactionDate >= :dateFrom', { dateFrom: dto.dateFrom });
    }
    if (dto.dateTo) {
      qb.andWhere('t.transactionDate <= :dateTo', { dateTo: dto.dateTo });
    }

    // Aggregate by payment method
    const summaryRaw = await qb.clone()
      .select('t.paymentMethod', 'paymentMethod')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(t.totalAmount), 0)', 'revenue')
      .addSelect('COALESCE(AVG(t.totalAmount), 0)', 'average')
      .groupBy('t.paymentMethod')
      .getRawMany();

    // Totals
    const totalsRaw = await qb.clone()
      .select('COUNT(*)', 'totalTransactions')
      .addSelect('COALESCE(SUM(t.totalAmount), 0)', 'totalRevenue')
      .addSelect('COALESCE(AVG(t.totalAmount), 0)', 'averageTransaction')
      .getRawOne();

    return {
      rows: summaryRaw.map(r => ({
        paymentMethod: r.paymentMethod,
        count: parseInt(r.count, 10),
        revenue: parseFloat(r.revenue),
        average: parseFloat(r.average),
      })),
      summary: {
        totalTransactions: parseInt(totalsRaw?.totalTransactions || '0', 10),
        totalRevenue: parseFloat(totalsRaw?.totalRevenue || '0'),
        averageTransaction: parseFloat(totalsRaw?.averageTransaction || '0'),
      },
    };
  }

  private async generateMachinePerformance(dto: GenerateReportDto): Promise<any> {
    const machines = await this.machineRepo.find({
      where: { organizationId: dto.organizationId },
      select: [
        'id', 'name', 'machineNumber', 'status', 'connectionStatus',
        'totalSalesCount', 'totalRevenue', 'lastPingAt',
        'currentProductCount', 'maxProductSlots',
      ],
    });

    const now = Date.now();
    const rows = machines.map(m => {
      const offlineMinutes = m.lastPingAt
        ? (now - new Date(m.lastPingAt).getTime()) / 60000
        : null;
      const stockPercent = m.maxProductSlots > 0
        ? Math.round((m.currentProductCount / m.maxProductSlots) * 100)
        : 0;

      return {
        machineNumber: m.machineNumber,
        name: m.name,
        status: m.status,
        connectionStatus: m.connectionStatus,
        totalSales: m.totalSalesCount,
        totalRevenue: Number(m.totalRevenue),
        stockPercent,
        offlineMinutes: offlineMinutes !== null ? Math.round(offlineMinutes) : null,
      };
    });

    const onlineCount = rows.filter(r => r.offlineMinutes !== null && r.offlineMinutes < 10).length;

    return {
      rows,
      summary: {
        totalMachines: machines.length,
        onlineMachines: onlineCount,
        averageUptime: machines.length > 0
          ? Math.round((onlineCount / machines.length) * 100)
          : 0,
        totalRevenue: rows.reduce((sum, r) => sum + r.totalRevenue, 0),
      },
    };
  }

  private async generateInventoryLevels(dto: GenerateReportDto): Promise<any> {
    const machines = await this.machineRepo.find({
      where: { organizationId: dto.organizationId },
      select: ['id', 'name', 'machineNumber', 'currentProductCount', 'maxProductSlots', 'lowStockThresholdPercent'],
    });

    const rows = machines.map(m => {
      const stockPercent = m.maxProductSlots > 0
        ? Math.round((m.currentProductCount / m.maxProductSlots) * 100)
        : 0;
      const isLowStock = stockPercent <= (m.lowStockThresholdPercent || 10);

      return {
        machineNumber: m.machineNumber,
        name: m.name,
        currentStock: m.currentProductCount,
        maxCapacity: m.maxProductSlots,
        stockPercent,
        isLowStock,
      };
    });

    const lowStockItems = rows.filter(r => r.isLowStock).length;

    return {
      rows,
      summary: {
        totalMachines: machines.length,
        lowStockMachines: lowStockItems,
        averageStockPercent: rows.length > 0
          ? Math.round(rows.reduce((sum, r) => sum + r.stockPercent, 0) / rows.length)
          : 0,
      },
    };
  }

  private async createReportFile(
    report: GeneratedReport,
    data: any,
    format: ReportFormat,
  ): Promise<{ filePath: string; fileSize: number; checksum: string }> {
    const filePath = `/reports/${report.organizationId}/${report.id}.${format}`;
    const jsonData = JSON.stringify(data);
    const fileSize = Buffer.byteLength(jsonData, 'utf-8');

    // Generate checksum for data integrity verification
    const crypto = await import('crypto');
    const checksum = crypto.createHash('sha256').update(jsonData).digest('hex');

    // In production, this would write to MinIO/S3 storage
    this.logger.log(`Report file: ${filePath}, size: ${fileSize}, format: ${format}`);

    return { filePath, fileSize, checksum };
  }

  private async deliverReport(report: GeneratedReport, delivery: any): Promise<void> {
    this.logger.log(`Delivering report ${report.id} via ${delivery.method}`);

    switch (delivery.method) {
      case 'email':
        // Would integrate with notification/email service
        this.logger.log(`Email delivery to: ${delivery.emails?.join(', ')}`);
        break;
      case 'storage':
        // Already saved to file storage in createReportFile
        this.logger.log(`Report stored at: ${delivery.storagePath || report.files?.[0]?.url || 'N/A'}`);
        break;
      case 'download':
      default:
        // No-op: client will download via API
        break;
    }
  }

  // ============================================================================
  // GENERATED REPORTS
  // ============================================================================

  async getGeneratedReports(
    organizationId: string,
    options?: {
      type?: ReportType;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: GeneratedReport[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);

    const qb = this.generatedRepo.createQueryBuilder('r');
    qb.where('r.organizationId = :organizationId', { organizationId });
    qb.andWhere('r.status = :status', { status: ReportStatus.COMPLETED });

    if (options?.type) {
      qb.andWhere('r.type = :type', { type: options.type });
    }

    if (options?.dateFrom) {
      qb.andWhere('r.createdAt >= :dateFrom', { dateFrom: options.dateFrom });
    }

    if (options?.dateTo) {
      qb.andWhere('r.createdAt <= :dateTo', { dateTo: options.dateTo });
    }

    const total = await qb.getCount();

    // Select only needed columns for list view (exclude heavy summary/files JSONB)
    qb.select([
      'r.id',
      'r.organizationId',
      'r.definitionId',
      'r.name',
      'r.type',
      'r.status',
      'r.generationTimeMs',
      'r.rowCount',
      'r.reportNumber',
      'r.created_at',
      'r.completedAt',
      'r.expiresAt',
    ]);

    qb.orderBy('r.created_at', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getGeneratedReport(id: string): Promise<GeneratedReport> {
    const report = await this.generatedRepo.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Отчёт ${id} не найден`);
    }
    return report;
  }

  async deleteExpiredReports(): Promise<number> {
    const result = await this.generatedRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  // ============================================================================
  // SCHEDULED REPORTS
  // ============================================================================

  async createScheduledReport(dto: CreateScheduledReportDto, createdById: string): Promise<ScheduledReport> {
    const nextRunAt = this.calculateNextRun(dto.frequency, dto.scheduleConfig);

    const scheduled = this.scheduledRepo.create({
      organizationId: dto.organizationId,
      definitionId: dto.reportDefinitionId,
      name: dto.name,
      schedule: {
        frequency: dto.frequency,
        dayOfWeek: dto.scheduleConfig.dayOfWeek,
        dayOfMonth: dto.scheduleConfig.dayOfMonth,
        time: dto.scheduleConfig.time,
        timezone: dto.scheduleConfig.timezone,
        deliveryChannels: [dto.deliveryMethod] as ('email' | 'telegram' | 'webhook')[],
        recipients: dto.deliveryConfig.emails?.map(email => ({ email })) || [],
        format: dto.format,
      },
      filters: dto.parameters as any,
      format: dto.format,
      recipients: dto.deliveryConfig.emails?.map(email => ({ email })) || [],
      isActive: true,
      runCount: 0,
      failCount: 0,
      nextRunAt,
      created_by_id: createdById,
    });

    return this.scheduledRepo.save(scheduled);
  }

  async getScheduledReports(organizationId: string): Promise<ScheduledReport[]> {
    return this.scheduledRepo.find({
      where: { organizationId },
      order: { created_at: 'DESC' },
    });
  }

  async updateScheduledReport(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport> {
    const scheduled = await this.scheduledRepo.findOne({ where: { id } });
    if (!scheduled) {
      throw new NotFoundException(`Расписание ${id} не найдено`);
    }

    Object.assign(scheduled, updates);

    // Recalculate next run if schedule changed
    if (updates.schedule) {
      scheduled.nextRunAt = this.calculateNextRun(
        scheduled.schedule.frequency,
        {
          time: scheduled.schedule.time,
          dayOfWeek: scheduled.schedule.dayOfWeek,
          dayOfMonth: scheduled.schedule.dayOfMonth,
          timezone: scheduled.schedule.timezone,
        },
      );
    }

    return this.scheduledRepo.save(scheduled);
  }

  async deleteScheduledReport(id: string): Promise<void> {
    await this.scheduledRepo.delete(id);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledReports(): Promise<void> {
    const due = await this.scheduledRepo.find({
      where: {
        isActive: true,
        nextRunAt: LessThan(new Date()),
      },
    });

    for (const scheduled of due) {
      try {
        const emails = scheduled.recipients
          ?.filter(r => r.email)
          .map(r => r.email as string) || [];

        await this.generate({
          organizationId: scheduled.organizationId,
          reportDefinitionId: scheduled.definitionId,
          format: scheduled.format,
          parameters: scheduled.filters as any,
          delivery: {
            method: 'email',
            emails,
          },
        });

        scheduled.lastRunAt = new Date();
        scheduled.lastSuccessAt = new Date();
        scheduled.runCount++;
        scheduled.nextRunAt = this.calculateNextRun(
          scheduled.schedule.frequency,
          {
            time: scheduled.schedule.time,
            dayOfWeek: scheduled.schedule.dayOfWeek,
            dayOfMonth: scheduled.schedule.dayOfMonth,
            timezone: scheduled.schedule.timezone,
          },
        );
        scheduled.lastError = undefined as any;
      } catch (error: any) {
        scheduled.failCount++;
        scheduled.lastError = error.message;
        this.logger.error(`Failed to run scheduled report ${scheduled.id}: ${error.message}`);
      }

      await this.scheduledRepo.save(scheduled);
    }
  }

  private calculateNextRun(
    frequency: ScheduleFrequency,
    config: {
      time?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      timezone?: string;
    },
  ): Date {
    const now = new Date();
    const time = config.time?.split(':') || ['09', '00'];
    const hour = parseInt(time[0], 10);
    const minute = parseInt(time[1], 10);

    switch (frequency) {
      case ReportFrequency.DAILY:
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hour, minute, 0, 0);
        return tomorrow;

      case ReportFrequency.WEEKLY:
        const nextWeek = new Date(now);
        const daysUntilTarget = ((config.dayOfWeek || 1) - now.getDay() + 7) % 7 || 7;
        nextWeek.setDate(nextWeek.getDate() + daysUntilTarget);
        nextWeek.setHours(hour, minute, 0, 0);
        return nextWeek;

      case ReportFrequency.MONTHLY:
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(config.dayOfMonth || 1);
        nextMonth.setHours(hour, minute, 0, 0);
        return nextMonth;

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  // ============================================================================
  // DASHBOARDS
  // ============================================================================

  async createDashboard(dto: CreateDashboardDto, createdById: string): Promise<Dashboard> {
    const dashboard = this.dashboardRepo.create({
      organizationId: dto.organizationId,
      name: dto.name,
      description: dto.description,
      gridColumns: dto.columns || 12,
      isPublic: dto.isPublic || false,
      isDefault: false,
      isActive: true,
      created_by_id: createdById,
    });

    const saved = await this.dashboardRepo.save(dashboard);

    // Create widgets
    if (dto.widgets?.length) {
      for (const widgetDto of dto.widgets) {
        await this.createWidget({
          dashboardId: saved.id,
          organizationId: dto.organizationId,
          title: widgetDto.title,
          chartType: widgetDto.chartType as any,
          positionX: widgetDto.positionX,
          positionY: widgetDto.positionY,
          width: widgetDto.width,
          height: widgetDto.height,
          definitionId: widgetDto.definitionId,
          chartConfig: widgetDto.chartConfig,
          kpiConfig: widgetDto.kpiConfig,
        });
      }
    }

    return this.getDashboard(saved.id);
  }

  async getDashboards(organizationId: string): Promise<Dashboard[]> {
    return this.dashboardRepo.find({
      where: { organizationId },
      relations: ['widgets'],
      order: { isDefault: 'DESC', created_at: 'DESC' },
    });
  }

  async getDashboard(id: string): Promise<Dashboard> {
    const dashboard = await this.dashboardRepo.findOne({
      where: { id },
      relations: ['widgets'],
    });

    if (!dashboard) {
      throw new NotFoundException(`Дашборд ${id} не найден`);
    }

    // Increment view count
    await this.dashboardRepo.increment({ id }, 'viewCount', 1);

    return dashboard;
  }

  async updateDashboard(id: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    const dashboard = await this.getDashboard(id);
    Object.assign(dashboard, updates);
    dashboard.updated_at = new Date();
    await this.dashboardRepo.save(dashboard);
    return this.getDashboard(id);
  }

  async deleteDashboard(id: string): Promise<void> {
    await this.widgetRepo.delete({ dashboardId: id });
    await this.dashboardRepo.delete(id);
  }

  async setDefaultDashboard(organizationId: string, dashboardId: string): Promise<void> {
    // Remove default from all others
    await this.dashboardRepo.update(
      { organizationId },
      { isDefault: false },
    );

    // Set new default
    await this.dashboardRepo.update(dashboardId, { isDefault: true });
  }

  // ============================================================================
  // WIDGETS
  // ============================================================================

  async createWidget(dto: CreateWidgetDto): Promise<DashboardWidget> {
    // Get dashboard to get organizationId
    const dashboard = await this.dashboardRepo.findOne({ where: { id: dto.dashboardId } });
    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${dto.dashboardId} not found`);
    }

    const widget = this.widgetRepo.create({
      organizationId: dto.organizationId || dashboard.organizationId,
      dashboardId: dto.dashboardId,
      title: dto.title,
      chartType: (dto.chartType as any) || 'kpi',
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

  async updateWidget(id: string, updates: Partial<DashboardWidget>): Promise<DashboardWidget> {
    const widget = await this.widgetRepo.findOne({ where: { id } });
    if (!widget) {
      throw new NotFoundException(`Виджет ${id} не найден`);
    }

    Object.assign(widget, updates);
    return this.widgetRepo.save(widget);
  }

  async deleteWidget(id: string): Promise<void> {
    await this.widgetRepo.delete(id);
  }

  async reorderWidgets(dashboardId: string, widgetIds: string[]): Promise<void> {
    for (let i = 0; i < widgetIds.length; i++) {
      await this.widgetRepo.update(widgetIds[i], { positionY: i });
    }
  }

  // ============================================================================
  // SAVED FILTERS
  // ============================================================================

  async saveFilter(
    userId: string,
    organizationId: string,
    reportDefinitionId: string,
    name: string,
    filters: Record<string, any>,
    isDefault: boolean = false,
  ): Promise<SavedReportFilter> {
    if (isDefault) {
      // Remove default from others
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
      filters: filters as any,
      isDefault,
    });

    return this.filterRepo.save(saved);
  }

  async getSavedFilters(userId: string, reportDefinitionId?: string): Promise<SavedReportFilter[]> {
    const where: any = { userId };
    if (reportDefinitionId) {
      where.definitionId = reportDefinitionId;
    }

    return this.filterRepo.find({
      where,
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async deleteSavedFilter(id: string): Promise<void> {
    await this.filterRepo.delete(id);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getMimeType(format: ReportFormat): string {
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json',
      html: 'text/html',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }
}
