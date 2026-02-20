/**
 * Analytics Service for VendHub OS
 *
 * Handles:
 * - Pre-aggregated analytics snapshots (daily/weekly/monthly/yearly)
 * - Daily organization-level statistics
 * - Cron-based nightly/weekly/monthly data aggregation
 * - Dashboard data compilation
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { Cron } from '@nestjs/schedule';

import {
  AnalyticsSnapshot,
  DailyStats,
  SnapshotType,
  TopProductEntry,
  TopMachineEntry,
} from '../entities/analytics-snapshot.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../transactions/entities/transaction.entity';
import { Machine, MachineStatus, MachineConnectionStatus } from '../../machines/entities/machine.entity';
import { Task, TaskType, TaskStatus } from '../../tasks/entities/task.entity';
import { QuerySnapshotsDto } from '../dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsSnapshot)
    private readonly snapshotRepo: Repository<AnalyticsSnapshot>,

    @InjectRepository(DailyStats)
    private readonly dailyStatsRepo: Repository<DailyStats>,

    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,

    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  // ============================================================================
  // SNAPSHOT QUERIES
  // ============================================================================

  /**
   * Get paginated analytics snapshots with optional filters
   */
  async getSnapshots(
    organizationId: string,
    params: QuerySnapshotsDto,
  ): Promise<{
    data: AnalyticsSnapshot[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.snapshotRepo
      .createQueryBuilder('snapshot')
      .where('snapshot.organizationId = :organizationId', { organizationId })
      .andWhere('snapshot.deleted_at IS NULL');

    if (params.snapshotType) {
      qb.andWhere('snapshot.snapshotType = :snapshotType', {
        snapshotType: params.snapshotType,
      });
    }

    if (params.machineId) {
      qb.andWhere('snapshot.machineId = :machineId', {
        machineId: params.machineId,
      });
    }

    if (params.locationId) {
      qb.andWhere('snapshot.locationId = :locationId', {
        locationId: params.locationId,
      });
    }

    if (params.productId) {
      qb.andWhere('snapshot.productId = :productId', {
        productId: params.productId,
      });
    }

    if (params.dateFrom) {
      qb.andWhere('snapshot.snapshotDate >= :dateFrom', {
        dateFrom: params.dateFrom,
      });
    }

    if (params.dateTo) {
      qb.andWhere('snapshot.snapshotDate <= :dateTo', {
        dateTo: params.dateTo,
      });
    }

    qb.orderBy('snapshot.snapshotDate', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single analytics snapshot by ID
   */
  async getSnapshot(id: string): Promise<AnalyticsSnapshot> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { id },
    });

    if (!snapshot) {
      throw new NotFoundException(`Analytics snapshot with ID "${id}" not found`);
    }

    return snapshot;
  }

  // ============================================================================
  // SNAPSHOT CREATION
  // ============================================================================

  /**
   * Create or update a DAILY snapshot by aggregating transactions for the given date
   */
  async createDailySnapshot(
    organizationId: string,
    date: Date,
  ): Promise<AnalyticsSnapshot> {
    const dateStr = this.toDateString(date);

    // Aggregate transactions for the day
    const transactionAgg = await this.transactionRepo
      .createQueryBuilder('t')
      .select([
        'COUNT(t.id)::int AS "totalTransactions"',
        'COALESCE(SUM(t.totalAmount), 0)::numeric(15,2) AS "totalRevenue"',
        'COALESCE(SUM(t.quantity), 0)::int AS "totalUnitsSold"',
        'COALESCE(AVG(t.totalAmount), 0)::numeric(15,2) AS "averageTransactionValue"',
      ])
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.type = :type', { type: TransactionType.SALE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.saleDate = :date', { date: dateStr })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    // Count tasks completed
    const taskAgg = await this.taskRepo
      .createQueryBuilder('task')
      .select([
        'COUNT(CASE WHEN task.typeCode = :refill THEN 1 END)::int AS "stockRefills"',
        'COUNT(CASE WHEN task.typeCode = :repair THEN 1 END)::int AS "maintenanceTasksCompleted"',
      ])
      .where('task.organizationId = :organizationId', { organizationId })
      .andWhere('task.status = :completed', { completed: TaskStatus.COMPLETED })
      .andWhere('task.completedAt::date = :date', { date: dateStr })
      .andWhere('task.deleted_at IS NULL')
      .setParameter('refill', TaskType.REFILL)
      .setParameter('repair', TaskType.REPAIR)
      .getRawOne();

    // Upsert the snapshot
    const existing = await this.snapshotRepo.findOne({
      where: {
        organizationId,
        snapshotType: SnapshotType.DAILY,
        snapshotDate: date,
        machineId: IsNull(),
        locationId: IsNull(),
        productId: IsNull(),
      },
    });

    const snapshotData: Partial<AnalyticsSnapshot> = {
      organizationId,
      snapshotType: SnapshotType.DAILY,
      snapshotDate: date,
      machineId: null,
      locationId: null,
      productId: null,
      totalTransactions: parseInt(transactionAgg?.totalTransactions ?? '0', 10),
      totalRevenue: parseFloat(transactionAgg?.totalRevenue ?? '0'),
      totalUnitsSold: parseInt(transactionAgg?.totalUnitsSold ?? '0', 10),
      averageTransactionValue: parseFloat(transactionAgg?.averageTransactionValue ?? '0'),
      stockRefills: parseInt(taskAgg?.stockRefills ?? '0', 10),
      maintenanceTasksCompleted: parseInt(taskAgg?.maintenanceTasksCompleted ?? '0', 10),
      metadata: { aggregatedAt: new Date().toISOString() },
    };

    if (existing) {
      Object.assign(existing, snapshotData);
      return this.snapshotRepo.save(existing);
    }

    return this.snapshotRepo.save(this.snapshotRepo.create(snapshotData));
  }

  /**
   * Create or update a WEEKLY snapshot by aggregating daily snapshots for the week
   * The date parameter should be the Monday of the target week
   */
  async createWeeklySnapshot(
    organizationId: string,
    date: Date,
  ): Promise<AnalyticsSnapshot> {
    const weekStart = this.getStartOfWeek(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Aggregate from daily snapshots
    const agg = await this.snapshotRepo
      .createQueryBuilder('s')
      .select([
        'COALESCE(SUM(s.totalTransactions), 0)::int AS "totalTransactions"',
        'COALESCE(SUM(s.totalRevenue), 0)::numeric(15,2) AS "totalRevenue"',
        'COALESCE(SUM(s.totalUnitsSold), 0)::int AS "totalUnitsSold"',
        'COALESCE(SUM(s.stockRefills), 0)::int AS "stockRefills"',
        'COALESCE(SUM(s.maintenanceTasksCompleted), 0)::int AS "maintenanceTasksCompleted"',
        'COALESCE(SUM(s.outOfStockIncidents), 0)::int AS "outOfStockIncidents"',
        'COALESCE(SUM(s.incidentsReported), 0)::int AS "incidentsReported"',
        'COALESCE(SUM(s.complaintsReceived), 0)::int AS "complaintsReceived"',
        'COALESCE(SUM(s.operationalCosts), 0)::numeric(15,2) AS "operationalCosts"',
      ])
      .where('s.organizationId = :organizationId', { organizationId })
      .andWhere('s.snapshotType = :type', { type: SnapshotType.DAILY })
      .andWhere('s.snapshotDate >= :start', { start: this.toDateString(weekStart) })
      .andWhere('s.snapshotDate <= :end', { end: this.toDateString(weekEnd) })
      .andWhere('s.machineId IS NULL')
      .andWhere('s.deleted_at IS NULL')
      .getRawOne();

    const totalTransactions = parseInt(agg?.totalTransactions ?? '0', 10);
    const totalRevenue = parseFloat(agg?.totalRevenue ?? '0');
    const avgTxValue = totalTransactions > 0
      ? Math.round((totalRevenue / totalTransactions) * 100) / 100
      : 0;

    const existing = await this.snapshotRepo.findOne({
      where: {
        organizationId,
        snapshotType: SnapshotType.WEEKLY,
        snapshotDate: weekStart,
        machineId: IsNull(),
        locationId: IsNull(),
        productId: IsNull(),
      },
    });

    const snapshotData: Partial<AnalyticsSnapshot> = {
      organizationId,
      snapshotType: SnapshotType.WEEKLY,
      snapshotDate: weekStart,
      machineId: null,
      locationId: null,
      productId: null,
      totalTransactions,
      totalRevenue,
      totalUnitsSold: parseInt(agg?.totalUnitsSold ?? '0', 10),
      averageTransactionValue: avgTxValue,
      stockRefills: parseInt(agg?.stockRefills ?? '0', 10),
      maintenanceTasksCompleted: parseInt(agg?.maintenanceTasksCompleted ?? '0', 10),
      outOfStockIncidents: parseInt(agg?.outOfStockIncidents ?? '0', 10),
      incidentsReported: parseInt(agg?.incidentsReported ?? '0', 10),
      complaintsReceived: parseInt(agg?.complaintsReceived ?? '0', 10),
      operationalCosts: parseFloat(agg?.operationalCosts ?? '0'),
      metadata: { aggregatedAt: new Date().toISOString(), weekStart: this.toDateString(weekStart), weekEnd: this.toDateString(weekEnd) },
    };

    if (existing) {
      Object.assign(existing, snapshotData);
      return this.snapshotRepo.save(existing);
    }

    return this.snapshotRepo.save(this.snapshotRepo.create(snapshotData));
  }

  /**
   * Create or update a MONTHLY snapshot by aggregating daily snapshots for the month
   * The date parameter should be the first day of the target month
   */
  async createMonthlySnapshot(
    organizationId: string,
    yearMonth: Date,
  ): Promise<AnalyticsSnapshot> {
    const monthStart = new Date(yearMonth.getFullYear(), yearMonth.getMonth(), 1);
    const monthEnd = new Date(yearMonth.getFullYear(), yearMonth.getMonth() + 1, 0);

    // Aggregate from daily snapshots
    const agg = await this.snapshotRepo
      .createQueryBuilder('s')
      .select([
        'COALESCE(SUM(s.totalTransactions), 0)::int AS "totalTransactions"',
        'COALESCE(SUM(s.totalRevenue), 0)::numeric(15,2) AS "totalRevenue"',
        'COALESCE(SUM(s.totalUnitsSold), 0)::int AS "totalUnitsSold"',
        'COALESCE(SUM(s.stockRefills), 0)::int AS "stockRefills"',
        'COALESCE(SUM(s.maintenanceTasksCompleted), 0)::int AS "maintenanceTasksCompleted"',
        'COALESCE(SUM(s.outOfStockIncidents), 0)::int AS "outOfStockIncidents"',
        'COALESCE(SUM(s.incidentsReported), 0)::int AS "incidentsReported"',
        'COALESCE(SUM(s.complaintsReceived), 0)::int AS "complaintsReceived"',
        'COALESCE(SUM(s.operationalCosts), 0)::numeric(15,2) AS "operationalCosts"',
        'COALESCE(SUM(s.uptimeMinutes), 0)::int AS "uptimeMinutes"',
        'COALESCE(SUM(s.downtimeMinutes), 0)::int AS "downtimeMinutes"',
      ])
      .where('s.organizationId = :organizationId', { organizationId })
      .andWhere('s.snapshotType = :type', { type: SnapshotType.DAILY })
      .andWhere('s.snapshotDate >= :start', { start: this.toDateString(monthStart) })
      .andWhere('s.snapshotDate <= :end', { end: this.toDateString(monthEnd) })
      .andWhere('s.machineId IS NULL')
      .andWhere('s.deleted_at IS NULL')
      .getRawOne();

    const totalTransactions = parseInt(agg?.totalTransactions ?? '0', 10);
    const totalRevenue = parseFloat(agg?.totalRevenue ?? '0');
    const operationalCosts = parseFloat(agg?.operationalCosts ?? '0');
    const avgTxValue = totalTransactions > 0
      ? Math.round((totalRevenue / totalTransactions) * 100) / 100
      : 0;
    const uptimeMin = parseInt(agg?.uptimeMinutes ?? '0', 10);
    const downtimeMin = parseInt(agg?.downtimeMinutes ?? '0', 10);
    const totalMinutes = uptimeMin + downtimeMin;
    const availabilityPct = totalMinutes > 0
      ? Math.round((uptimeMin / totalMinutes) * 10000) / 100
      : 0;
    const profitMarginPct = totalRevenue > 0
      ? Math.round(((totalRevenue - operationalCosts) / totalRevenue) * 10000) / 100
      : 0;

    const existing = await this.snapshotRepo.findOne({
      where: {
        organizationId,
        snapshotType: SnapshotType.MONTHLY,
        snapshotDate: monthStart,
        machineId: IsNull(),
        locationId: IsNull(),
        productId: IsNull(),
      },
    });

    const snapshotData: Partial<AnalyticsSnapshot> = {
      organizationId,
      snapshotType: SnapshotType.MONTHLY,
      snapshotDate: monthStart,
      machineId: null,
      locationId: null,
      productId: null,
      totalTransactions,
      totalRevenue,
      totalUnitsSold: parseInt(agg?.totalUnitsSold ?? '0', 10),
      averageTransactionValue: avgTxValue,
      uptimeMinutes: uptimeMin,
      downtimeMinutes: downtimeMin,
      availabilityPercentage: availabilityPct,
      stockRefills: parseInt(agg?.stockRefills ?? '0', 10),
      maintenanceTasksCompleted: parseInt(agg?.maintenanceTasksCompleted ?? '0', 10),
      outOfStockIncidents: parseInt(agg?.outOfStockIncidents ?? '0', 10),
      incidentsReported: parseInt(agg?.incidentsReported ?? '0', 10),
      complaintsReceived: parseInt(agg?.complaintsReceived ?? '0', 10),
      operationalCosts,
      profitMargin: profitMarginPct,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        monthStart: this.toDateString(monthStart),
        monthEnd: this.toDateString(monthEnd),
      },
    };

    if (existing) {
      Object.assign(existing, snapshotData);
      return this.snapshotRepo.save(existing);
    }

    return this.snapshotRepo.save(this.snapshotRepo.create(snapshotData));
  }

  // ============================================================================
  // DAILY STATS
  // ============================================================================

  /**
   * Query daily stats for a date range
   */
  async getDailyStats(
    organizationId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<DailyStats[]> {
    return this.dailyStatsRepo.find({
      where: {
        organizationId,
        statDate: Between(new Date(dateFrom), new Date(dateTo)),
      },
      order: { statDate: 'ASC' },
    });
  }

  /**
   * Recalculate and upsert daily stats for a given date
   *
   * Steps:
   * 1. Count completed SALE transactions for the date
   * 2. Sum revenue by payment method
   * 3. Count COLLECTION transactions
   * 4. Count machines that had transactions (active)
   * 5. Count tasks completed by type
   * 6. Aggregate top products and top machines
   * 7. Upsert into daily_stats
   */
  async updateDailyStats(
    organizationId: string,
    date: string,
  ): Promise<DailyStats> {
    // 1. Sales aggregation
    const salesAgg = await this.transactionRepo
      .createQueryBuilder('t')
      .select([
        'COUNT(t.id)::int AS "totalSalesCount"',
        'COALESCE(SUM(t.totalAmount), 0)::numeric(15,2) AS "totalRevenue"',
        'COALESCE(AVG(t.totalAmount), 0)::numeric(15,2) AS "averageSaleAmount"',
      ])
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.type = :type', { type: TransactionType.SALE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.saleDate = :date', { date })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    // 2. Collections aggregation
    const collectionAgg = await this.transactionRepo
      .createQueryBuilder('t')
      .select([
        'COALESCE(SUM(t.totalAmount), 0)::numeric(15,2) AS "totalCollections"',
        'COUNT(t.id)::int AS "collectionsCount"',
      ])
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.type = :type', { type: TransactionType.COLLECTION })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.saleDate = :date', { date })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    // 3. Active machines (had at least one completed sale transaction)
    const activeMachinesResult = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COUNT(DISTINCT t.machineId)::int', 'activeMachinesCount')
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.type = :type', { type: TransactionType.SALE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.saleDate = :date', { date })
      .andWhere('t.machineId IS NOT NULL')
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    // Machine counts (current state)
    const onlineMachines = await this.machineRepo.count({
      where: {
        organizationId,
        connectionStatus: MachineConnectionStatus.ONLINE,
      },
    });

    const totalMachines = await this.machineRepo.count({
      where: {
        organizationId,
        status: Not(MachineStatus.DISABLED),
      },
    });

    // 4. Tasks completed by type
    const taskAgg = await this.taskRepo
      .createQueryBuilder('task')
      .select([
        'COUNT(task.id)::int AS "totalTasksCompleted"',
        'COUNT(CASE WHEN task.typeCode = :refill THEN 1 END)::int AS "refillTasksCompleted"',
        'COUNT(CASE WHEN task.typeCode = :collection THEN 1 END)::int AS "collectionTasksCompleted"',
        'COUNT(CASE WHEN task.typeCode = :cleaning THEN 1 END)::int AS "cleaningTasksCompleted"',
        'COUNT(CASE WHEN task.typeCode = :repair THEN 1 END)::int AS "repairTasksCompleted"',
      ])
      .where('task.organizationId = :organizationId', { organizationId })
      .andWhere('task.status = :completed', { completed: TaskStatus.COMPLETED })
      .andWhere('task.completedAt::date = :date', { date })
      .andWhere('task.deleted_at IS NULL')
      .setParameter('refill', TaskType.REFILL)
      .setParameter('collection', TaskType.COLLECTION)
      .setParameter('cleaning', TaskType.CLEANING)
      .setParameter('repair', TaskType.REPAIR)
      .getRawOne();

    // 5. Inventory units sold
    const unitsSold = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.quantity), 0)::int', 'inventoryUnitsSold')
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.type = :type', { type: TransactionType.SALE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.saleDate = :date', { date })
      .andWhere('t.deleted_at IS NULL')
      .getRawOne();

    // 6. Top products (top 10 by revenue)
    const topProductsRaw = await this.transactionRepo
      .createQueryBuilder('t')
      .select([
        't.recipeId AS "productId"',
        'COALESCE(SUM(t.quantity), 0)::int AS "quantity"',
        'COALESCE(SUM(t.totalAmount), 0)::numeric(15,2) AS "revenue"',
      ])
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.type = :type', { type: TransactionType.SALE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.saleDate = :date', { date })
      .andWhere('t.recipeId IS NOT NULL')
      .andWhere('t.deleted_at IS NULL')
      .groupBy('t.recipeId')
      .orderBy('"revenue"', 'DESC')
      .limit(10)
      .getRawMany();

    const topProducts: TopProductEntry[] = topProductsRaw.map((row) => ({
      productId: row.productId,
      name: '', // Product name would require a join; stored as empty for now
      quantity: parseInt(row.quantity, 10),
      revenue: parseFloat(row.revenue),
    }));

    // 7. Top machines (top 10 by revenue)
    const topMachinesRaw = await this.transactionRepo
      .createQueryBuilder('t')
      .select([
        't.machineId AS "machineId"',
        'COALESCE(SUM(t.totalAmount), 0)::numeric(15,2) AS "revenue"',
        'COUNT(t.id)::int AS "salesCount"',
      ])
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.type = :type', { type: TransactionType.SALE })
      .andWhere('t.status = :status', { status: TransactionStatus.COMPLETED })
      .andWhere('t.saleDate = :date', { date })
      .andWhere('t.machineId IS NOT NULL')
      .andWhere('t.deleted_at IS NULL')
      .groupBy('t.machineId')
      .orderBy('"revenue"', 'DESC')
      .limit(10)
      .getRawMany();

    const topMachines: TopMachineEntry[] = topMachinesRaw.map((row) => ({
      machineId: row.machineId,
      name: '', // Machine name would require a join; stored as empty for now
      revenue: parseFloat(row.revenue),
      salesCount: parseInt(row.salesCount, 10),
    }));

    // 8. Active operators count
    const activeOperators = await this.taskRepo
      .createQueryBuilder('task')
      .select('COUNT(DISTINCT task.assignedToUserId)::int', 'count')
      .where('task.organizationId = :organizationId', { organizationId })
      .andWhere('task.status = :completed', { completed: TaskStatus.COMPLETED })
      .andWhere('task.completedAt::date = :date', { date })
      .andWhere('task.assignedToUserId IS NOT NULL')
      .andWhere('task.deleted_at IS NULL')
      .getRawOne();

    // Upsert daily stats
    const now = new Date();

    const existing = await this.dailyStatsRepo.findOne({
      where: {
        organizationId,
        statDate: new Date(date),
      },
    });

    const statsData: Partial<DailyStats> = {
      organizationId,
      statDate: new Date(date),
      // Revenue
      totalRevenue: parseFloat(salesAgg?.totalRevenue ?? '0'),
      totalSalesCount: parseInt(salesAgg?.totalSalesCount ?? '0', 10),
      averageSaleAmount: parseFloat(salesAgg?.averageSaleAmount ?? '0'),
      totalCollections: parseFloat(collectionAgg?.totalCollections ?? '0'),
      collectionsCount: parseInt(collectionAgg?.collectionsCount ?? '0', 10),
      // Machines
      activeMachinesCount: parseInt(activeMachinesResult?.activeMachinesCount ?? '0', 10),
      onlineMachinesCount: onlineMachines,
      offlineMachinesCount: totalMachines - onlineMachines,
      // Tasks
      refillTasksCompleted: parseInt(taskAgg?.refillTasksCompleted ?? '0', 10),
      collectionTasksCompleted: parseInt(taskAgg?.collectionTasksCompleted ?? '0', 10),
      cleaningTasksCompleted: parseInt(taskAgg?.cleaningTasksCompleted ?? '0', 10),
      repairTasksCompleted: parseInt(taskAgg?.repairTasksCompleted ?? '0', 10),
      totalTasksCompleted: parseInt(taskAgg?.totalTasksCompleted ?? '0', 10),
      // Inventory
      inventoryUnitsSold: parseInt(unitsSold?.inventoryUnitsSold ?? '0', 10),
      inventoryUnitsRefilled: 0, // Would require inventory movement data
      // Aggregates
      topProducts,
      topMachines,
      // Status
      activeOperatorsCount: parseInt(activeOperators?.count ?? '0', 10),
      lastUpdatedAt: now,
      lastFullRebuildAt: now,
      isFinalized: false,
      metadata: { lastRebuildSource: 'updateDailyStats' },
    };

    if (existing) {
      Object.assign(existing, statsData);
      return this.dailyStatsRepo.save(existing);
    }

    return this.dailyStatsRepo.save(this.dailyStatsRepo.create(statsData));
  }

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  /**
   * Get dashboard data for the organization
   * Returns today's stats, yesterday's stats for comparison,
   * and trend data for the last 7 and 30 days.
   */
  async getDashboardData(organizationId: string): Promise<{
    todayStats: DailyStats | null;
    yesterdayStats: DailyStats | null;
    weekTrend: DailyStats[];
    monthTrend: DailyStats[];
  }> {
    const today = new Date();
    const todayStr = this.toDateString(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.toDateString(yesterday);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 29);

    const [todayStats, yesterdayStats, weekTrend, monthTrend] = await Promise.all([
      this.dailyStatsRepo.findOne({
        where: { organizationId, statDate: new Date(todayStr) },
      }),
      this.dailyStatsRepo.findOne({
        where: { organizationId, statDate: new Date(yesterdayStr) },
      }),
      this.dailyStatsRepo.find({
        where: {
          organizationId,
          statDate: Between(weekAgo, today),
        },
        order: { statDate: 'ASC' },
      }),
      this.dailyStatsRepo.find({
        where: {
          organizationId,
          statDate: Between(monthAgo, today),
        },
        order: { statDate: 'ASC' },
      }),
    ]);

    return {
      todayStats,
      yesterdayStats,
      weekTrend,
      monthTrend,
    };
  }

  // ============================================================================
  // CRON JOBS
  // ============================================================================

  /**
   * Nightly job: rebuild yesterday's daily stats and create daily snapshots
   * Runs at 01:00 AM (Asia/Tashkent) every day
   */
  @Cron('0 1 * * *')
  async nightlyAggregation(): Promise<void> {
    this.logger.log('Starting nightly analytics aggregation...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = this.toDateString(yesterday);

      // Get all distinct organization IDs from transactions
      const orgIds = await this.getActiveOrganizationIds();

      for (const orgId of orgIds) {
        try {
          // Rebuild daily stats for yesterday
          await this.updateDailyStats(orgId, yesterdayStr);

          // Create daily snapshot
          await this.createDailySnapshot(orgId, yesterday);

          this.logger.log(`Nightly aggregation complete for org ${orgId}`);
        } catch (error) {
          this.logger.error(
            `Nightly aggregation failed for org ${orgId}: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }

      this.logger.log('Nightly analytics aggregation finished.');
    } catch (error) {
      this.logger.error(
        `Nightly aggregation failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Weekly job: create weekly snapshots for all organizations
   * Runs at 02:00 AM (Asia/Tashkent) every Monday
   */
  @Cron('0 2 * * 1')
  async weeklyAggregation(): Promise<void> {
    this.logger.log('Starting weekly analytics aggregation...');

    try {
      const lastMonday = this.getStartOfWeek(new Date());
      lastMonday.setDate(lastMonday.getDate() - 7);

      const orgIds = await this.getActiveOrganizationIds();

      for (const orgId of orgIds) {
        try {
          await this.createWeeklySnapshot(orgId, lastMonday);
          this.logger.log(`Weekly snapshot created for org ${orgId}`);
        } catch (error) {
          this.logger.error(
            `Weekly aggregation failed for org ${orgId}: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }

      this.logger.log('Weekly analytics aggregation finished.');
    } catch (error) {
      this.logger.error(
        `Weekly aggregation failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  /**
   * Monthly job: create monthly snapshots for all organizations
   * Runs at 03:00 AM (Asia/Tashkent) on the 1st of every month
   */
  @Cron('0 3 1 * *')
  async monthlyAggregation(): Promise<void> {
    this.logger.log('Starting monthly analytics aggregation...');

    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const orgIds = await this.getActiveOrganizationIds();

      for (const orgId of orgIds) {
        try {
          await this.createMonthlySnapshot(orgId, lastMonth);
          this.logger.log(`Monthly snapshot created for org ${orgId}`);
        } catch (error) {
          this.logger.error(
            `Monthly aggregation failed for org ${orgId}: ${(error as Error).message}`,
            (error as Error).stack,
          );
        }
      }

      this.logger.log('Monthly analytics aggregation finished.');
    } catch (error) {
      this.logger.error(
        `Monthly aggregation failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get all organization IDs that have at least one transaction
   */
  private async getActiveOrganizationIds(): Promise<string[]> {
    const result = await this.transactionRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.organizationId', 'organizationId')
      .where('t.deleted_at IS NULL')
      .getRawMany();

    return result.map((row) => row.organizationId);
  }

  /**
   * Format a date as YYYY-MM-DD string
   */
  private toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get the Monday of the week containing the given date
   */
  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff));
  }
}
