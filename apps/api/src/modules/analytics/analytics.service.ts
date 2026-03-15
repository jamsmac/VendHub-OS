import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  DailyStats,
  DashboardWidget,
  AnalyticsSnapshot,
  SnapshotType,
} from "./entities/analytics.entity";
import { CreateWidgetDto, UpdateWidgetDto } from "./dto/analytics.dto";
import {
  Transaction,
  TransactionStatus,
} from "../transactions/entities/transaction.entity";
import { Machine, MachineStatus } from "../machines/entities/machine.entity";
import { Task, TaskStatus, TaskType } from "../tasks/entities/task.entity";

@Injectable()
export class DashboardStatsService {
  private readonly logger = new Logger(DashboardStatsService.name);

  constructor(
    @InjectRepository(DailyStats)
    private readonly dailyStatsRepo: Repository<DailyStats>,
    @InjectRepository(DashboardWidget)
    private readonly widgetRepo: Repository<DashboardWidget>,
    @InjectRepository(AnalyticsSnapshot)
    private readonly snapshotRepo: Repository<AnalyticsSnapshot>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  // ========================================================================
  // DAILY STATS
  // ========================================================================

  async aggregateDailyStats(
    organizationId: string,
    date: string,
  ): Promise<DailyStats> {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);

    // Transactions for the day
    const transactions = await this.transactionRepo.find({
      where: {
        organizationId,
        status: TransactionStatus.COMPLETED,
        transactionDate: Between(dayStart, dayEnd),
      },
    });

    const totalRevenue = transactions.reduce(
      (sum, t) => sum + Number(t.totalAmount || 0),
      0,
    );
    const totalSalesCount = transactions.length;
    const averageSaleAmount =
      totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

    // Machines
    const machines = await this.machineRepo.find({
      where: { organizationId },
      select: ["id", "status", "lastPingAt"],
    });

    const activeMachinesCount = machines.filter(
      (m) =>
        m.status === MachineStatus.ACTIVE ||
        m.status === MachineStatus.LOW_STOCK,
    ).length;
    const now = Date.now();
    const tenMin = 10 * 60 * 1000;
    const onlineMachinesCount = machines.filter(
      (m) => m.lastPingAt && now - new Date(m.lastPingAt).getTime() <= tenMin,
    ).length;
    const offlineMachinesCount = machines.length - onlineMachinesCount;

    // Tasks completed on this date
    const completedTasks = await this.taskRepo.find({
      where: {
        organizationId,
        status: TaskStatus.COMPLETED,
      },
    });

    // Filter by updatedAt (completion date) within our day range
    const dayTasks = completedTasks.filter((t) => {
      const updated = new Date(t.updatedAt);
      return updated >= dayStart && updated <= dayEnd;
    });

    const refillTasksCompleted = dayTasks.filter(
      (t) => t.typeCode === TaskType.REFILL,
    ).length;
    const collectionTasksCompleted = dayTasks.filter(
      (t) => t.typeCode === TaskType.COLLECTION,
    ).length;
    const cleaningTasksCompleted = dayTasks.filter(
      (t) => t.typeCode === TaskType.CLEANING,
    ).length;
    const repairTasksCompleted = dayTasks.filter(
      (t) => t.typeCode === TaskType.REPAIR,
    ).length;

    // Upsert daily stats
    let stats = await this.dailyStatsRepo.findOne({
      where: { organizationId, statDate: new Date(date) },
    });

    // Top products by revenue
    const productMap = new Map<
      string,
      {
        nomenclatureId: string;
        name: string;
        quantity: number;
        revenue: number;
      }
    >();
    for (const t of transactions) {
      const items = (t as unknown as Record<string, unknown>).items as
        | Array<{
            nomenclatureId?: string;
            productName?: string;
            quantity?: number;
            totalPrice?: number;
          }>
        | undefined;
      if (!items) continue;
      for (const item of items) {
        const key = item.nomenclatureId || "unknown";
        const existing = productMap.get(key) || {
          nomenclatureId: key,
          name: item.productName || key,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += Number(item.quantity || 1);
        existing.revenue += Number(item.totalPrice || 0);
        productMap.set(key, existing);
      }
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top machines by revenue
    const machineRevenueMap = new Map<
      string,
      {
        machineId: string;
        machineNumber: string;
        salesCount: number;
        revenue: number;
      }
    >();
    for (const t of transactions) {
      const mId = (t as unknown as Record<string, unknown>).machineId as
        | string
        | undefined;
      if (!mId) continue;
      const existing = machineRevenueMap.get(mId) || {
        machineId: mId,
        machineNumber: "",
        salesCount: 0,
        revenue: 0,
      };
      existing.salesCount += 1;
      existing.revenue += Number(t.totalAmount || 0);
      machineRevenueMap.set(mId, existing);
    }
    // Fill machine numbers
    for (const m of machines) {
      const entry = machineRevenueMap.get(m.id);
      if (entry) {
        entry.machineNumber =
          ((m as unknown as Record<string, unknown>).machineNumber as string) ||
          m.id.slice(0, 8);
      }
    }
    const topMachines = Array.from(machineRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const data = {
      organizationId,
      statDate: new Date(date),
      totalRevenue,
      totalSalesCount,
      averageSaleAmount: Math.round(averageSaleAmount * 100) / 100,
      activeMachinesCount,
      onlineMachinesCount,
      offlineMachinesCount,
      refillTasksCompleted,
      collectionTasksCompleted,
      cleaningTasksCompleted,
      repairTasksCompleted,
      totalTasksCompleted: dayTasks.length,
      topProducts: topProducts.length > 0 ? topProducts : null,
      topMachines: topMachines.length > 0 ? topMachines : null,
      lastUpdatedAt: new Date(),
    };

    if (stats) {
      Object.assign(stats, data);
    } else {
      stats = this.dailyStatsRepo.create(data);
    }

    const saved = await this.dailyStatsRepo.save(stats);
    this.logger.log(
      `Aggregated daily stats for ${date} (org: ${organizationId})`,
    );
    return saved;
  }

  async getDailyStats(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<DailyStats[]> {
    return this.dailyStatsRepo.find({
      where: {
        organizationId,
        statDate: Between(new Date(from), new Date(to)),
      },
      order: { statDate: "ASC" },
    });
  }

  // ========================================================================
  // DASHBOARD WIDGETS
  // ========================================================================

  async getDashboard(
    organizationId: string,
    userId: string,
  ): Promise<{
    widgets: DashboardWidget[];
    latestStats: DailyStats | null;
  }> {
    const widgets = await this.widgetRepo.find({
      where: { organizationId, userId, isVisible: true },
      order: { position: "ASC" },
    });

    const latestStats = await this.dailyStatsRepo.findOne({
      where: { organizationId },
      order: { statDate: "DESC" },
    });

    return { widgets, latestStats };
  }

  async createWidget(
    userId: string,
    organizationId: string,
    dto: CreateWidgetDto,
  ): Promise<DashboardWidget> {
    // Auto-assign position if not provided
    if (dto.position === undefined) {
      const count = await this.widgetRepo.count({
        where: { organizationId, userId },
      });
      dto.position = count;
    }

    const widget = this.widgetRepo.create({
      userId,
      organizationId,
      title: dto.title,
      widgetType: dto.widgetType,
      chartType: dto.chartType || null,
      timeRange: dto.timeRange,
      position: dto.position,
      width: dto.width || 6,
      height: dto.height || 4,
      config: dto.config || {},
    });

    return this.widgetRepo.save(widget);
  }

  async updateWidget(
    id: string,
    userId: string,
    dto: UpdateWidgetDto,
  ): Promise<DashboardWidget> {
    const widget = await this.widgetRepo.findOne({ where: { id } });
    if (!widget) throw new NotFoundException("Widget not found");
    if (widget.userId !== userId)
      throw new ForbiddenException("Not your widget");

    Object.assign(widget, dto);
    return this.widgetRepo.save(widget);
  }

  async deleteWidget(id: string, userId: string): Promise<void> {
    const widget = await this.widgetRepo.findOne({ where: { id } });
    if (!widget) throw new NotFoundException("Widget not found");
    if (widget.userId !== userId)
      throw new ForbiddenException("Not your widget");

    await this.widgetRepo.softDelete(id);
  }

  async reorderWidgets(userId: string, widgetIds: string[]): Promise<void> {
    for (let i = 0; i < widgetIds.length; i++) {
      await this.widgetRepo.update(
        { id: widgetIds[i], userId },
        { position: i },
      );
    }
  }

  // ========================================================================
  // SNAPSHOTS
  // ========================================================================

  async getSnapshots(
    organizationId: string,
    type: SnapshotType,
    from: string,
    to: string,
  ): Promise<AnalyticsSnapshot[]> {
    return this.snapshotRepo.find({
      where: {
        organizationId,
        snapshotType: type,
        snapshotDate: Between(new Date(from), new Date(to)),
      },
      order: { snapshotDate: "ASC" },
    });
  }

  // ========================================================================
  // CRON: NIGHTLY REBUILD
  // ========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async nightlyRebuild(): Promise<void> {
    this.logger.log("Starting nightly stats rebuild...");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];

    // Get distinct organizationIds from machines
    const orgs = await this.machineRepo
      .createQueryBuilder("m")
      .select("DISTINCT m.organizationId", "organizationId")
      .where("m.organizationId IS NOT NULL")
      .getRawMany<{ organizationId: string }>();

    let successCount = 0;
    for (const { organizationId } of orgs) {
      try {
        await this.aggregateDailyStats(organizationId, dateStr);
        successCount++;
      } catch (error) {
        this.logger.error(
          `Failed to aggregate stats for org ${organizationId}: ${error}`,
        );
      }
    }

    this.logger.log(
      `Nightly rebuild complete: ${successCount}/${orgs.length} orgs for ${dateStr}`,
    );
  }

  // ========================================================================
  // CHART DATA: TOP MACHINES / TOP PRODUCTS / REVENUE TREND
  // ========================================================================

  async getTopMachines(
    organizationId: string,
    from: string,
    to: string,
    limit = 10,
  ): Promise<
    Array<{
      machineId: string;
      machineNumber: string;
      salesCount: number;
      revenue: number;
    }>
  > {
    const stats = await this.getDailyStats(organizationId, from, to);

    const machineMap = new Map<
      string,
      {
        machineId: string;
        machineNumber: string;
        salesCount: number;
        revenue: number;
      }
    >();

    for (const day of stats) {
      if (!day.topMachines) continue;
      for (const m of day.topMachines) {
        const existing = machineMap.get(m.machineId) || {
          machineId: m.machineId,
          machineNumber: m.machineNumber,
          salesCount: 0,
          revenue: 0,
        };
        existing.salesCount += m.salesCount;
        existing.revenue += m.revenue;
        machineMap.set(m.machineId, existing);
      }
    }

    return Array.from(machineMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getTopProducts(
    organizationId: string,
    from: string,
    to: string,
    limit = 10,
  ): Promise<
    Array<{
      nomenclatureId: string;
      name: string;
      quantity: number;
      revenue: number;
    }>
  > {
    const stats = await this.getDailyStats(organizationId, from, to);

    const productMap = new Map<
      string,
      {
        nomenclatureId: string;
        name: string;
        quantity: number;
        revenue: number;
      }
    >();

    for (const day of stats) {
      if (!day.topProducts) continue;
      for (const p of day.topProducts) {
        const existing = productMap.get(p.nomenclatureId) || {
          nomenclatureId: p.nomenclatureId,
          name: p.name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += p.quantity;
        existing.revenue += p.revenue;
        productMap.set(p.nomenclatureId, existing);
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getRevenueTrend(
    organizationId: string,
    from: string,
    to: string,
  ): Promise<
    Array<{
      date: string;
      revenue: number;
      salesCount: number;
      averageSale: number;
    }>
  > {
    const stats = await this.getDailyStats(organizationId, from, to);

    return stats.map((s) => ({
      date:
        s.statDate instanceof Date
          ? s.statDate.toISOString().split("T")[0]
          : String(s.statDate),
      revenue: Number(s.totalRevenue),
      salesCount: s.totalSalesCount,
      averageSale: Number(s.averageSaleAmount),
    }));
  }
}
