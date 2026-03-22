/**
 * Dashboard Analytics Service for VendHub OS
 *
 * Extracted from AnalyticsService to handle dashboard-specific data compilation:
 * - Today's stats with yesterday comparison
 * - Revenue trends (30-day)
 * - Payment method distribution
 * - Top machines by revenue
 * - Recent transactions
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";

import {
  Transaction,
  TransactionType,
} from "../../transactions/entities/transaction.entity";
import {
  Machine,
  MachineConnectionStatus,
} from "../../machines/entities/machine.entity";
import { Task, TaskStatus } from "../../tasks/entities/task.entity";

@Injectable()
export class DashboardAnalyticsService {
  private readonly logger = new Logger(DashboardAnalyticsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,

    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,

    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  /**
   * Get dashboard data for the organization
   * Returns today's stats, yesterday's stats for comparison,
   * and trend data for the last 7 and 30 days.
   */
  async getDashboardData(organizationId: string) {
    const today = new Date();
    const todayStr = this.toDateString(today);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.toDateString(yesterday);

    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 29);
    const monthAgoStr = this.toDateString(monthAgo);

    // Run all queries in parallel for performance
    const [
      todayRevenue,
      yesterdayRevenue,
      todayTxCount,
      yesterdayTxCount,
      machineStats,
      todayTasksCompleted,
      recentTransactions,
      revenueTrendRaw,
      paymentMethodsRaw,
      topMachinesRaw,
    ] = await Promise.all([
      // Revenue today
      this.transactionRepo
        .createQueryBuilder("t")
        .select("COALESCE(SUM(t.totalAmount), 0)", "total")
        .where("t.organizationId = :organizationId", { organizationId })
        .andWhere("t.type = :type", { type: TransactionType.SALE })
        .andWhere("t.saleDate = :date", { date: todayStr })
        .getRawOne<{ total: string }>(),

      // Revenue yesterday
      this.transactionRepo
        .createQueryBuilder("t")
        .select("COALESCE(SUM(t.totalAmount), 0)", "total")
        .where("t.organizationId = :organizationId", { organizationId })
        .andWhere("t.type = :type", { type: TransactionType.SALE })
        .andWhere("t.saleDate = :date", { date: yesterdayStr })
        .getRawOne<{ total: string }>(),

      // Transaction count today
      this.transactionRepo
        .createQueryBuilder("t")
        .where("t.organizationId = :organizationId", { organizationId })
        .andWhere("t.type = :type", { type: TransactionType.SALE })
        .andWhere("t.saleDate = :date", { date: todayStr })
        .getCount(),

      // Transaction count yesterday
      this.transactionRepo
        .createQueryBuilder("t")
        .where("t.organizationId = :organizationId", { organizationId })
        .andWhere("t.type = :type", { type: TransactionType.SALE })
        .andWhere("t.saleDate = :date", { date: yesterdayStr })
        .getCount(),

      // Machine counts
      Promise.all([
        this.machineRepo.count({
          where: { organizationId, deletedAt: IsNull() },
        }),
        this.machineRepo.count({
          where: {
            organizationId,
            connectionStatus: MachineConnectionStatus.ONLINE,
            deletedAt: IsNull(),
          },
        }),
      ]),

      // Tasks completed today
      this.taskRepo
        .createQueryBuilder("t")
        .where("t.organizationId = :organizationId", { organizationId })
        .andWhere("t.status = :status", { status: TaskStatus.COMPLETED })
        .andWhere("DATE(t.completedAt) = :date", { date: todayStr })
        .getCount(),

      // Recent transactions (last 5)
      this.transactionRepo
        .createQueryBuilder("t")
        .leftJoin("t.machine", "m")
        .select([
          "t.id",
          "t.createdAt",
          "t.type",
          "t.totalAmount",
          "t.status",
          "m.name",
        ])
        .where("t.organizationId = :organizationId", { organizationId })
        .orderBy("t.createdAt", "DESC")
        .limit(5)
        .getMany(),

      // Revenue trend (30 days) - from transaction_daily_summaries
      this.transactionRepo
        .createQueryBuilder("t")
        .select("t.saleDate", "date")
        .addSelect("COALESCE(SUM(t.totalAmount), 0)", "revenue")
        .where("t.organizationId = :organizationId", { organizationId })
        .andWhere("t.type = :type", { type: TransactionType.SALE })
        .andWhere("t.saleDate >= :from", { from: monthAgoStr })
        .groupBy("t.saleDate")
        .orderBy("t.saleDate", "ASC")
        .getRawMany<{ date: string; revenue: string }>(),

      // Payment method distribution (30 days)
      this.transactionRepo
        .createQueryBuilder("t")
        .select("t.paymentMethod", "method")
        .addSelect("COUNT(*)", "cnt")
        .where("t.organizationId = :organizationId", { organizationId })
        .andWhere("t.type = :type", { type: TransactionType.SALE })
        .andWhere("t.saleDate >= :from", { from: monthAgoStr })
        .groupBy("t.paymentMethod")
        .orderBy("cnt", "DESC")
        .getRawMany<{ method: string; cnt: string }>(),

      // Top 5 machines by revenue (30 days)
      this.transactionRepo
        .createQueryBuilder("t")
        .leftJoin("t.machine", "m")
        .select("m.name", "name")
        .addSelect("COALESCE(SUM(t.totalAmount), 0)", "revenue")
        .where("t.organizationId = :organizationId", { organizationId })
        .andWhere("t.type = :type", { type: TransactionType.SALE })
        .andWhere("t.saleDate >= :from", { from: monthAgoStr })
        .groupBy("m.name")
        .orderBy("revenue", "DESC")
        .limit(5)
        .getRawMany<{ name: string; revenue: string }>(),
    ]);

    // Compute derived values
    const todayRev = Number(todayRevenue?.total ?? 0);
    const yesterdayRev = Number(yesterdayRevenue?.total ?? 0);
    const revenueChangePercent =
      yesterdayRev > 0
        ? ((todayRev - yesterdayRev) / yesterdayRev) * 100
        : todayRev > 0
          ? 100
          : 0;

    const txChangePercent =
      yesterdayTxCount > 0
        ? ((todayTxCount - yesterdayTxCount) / yesterdayTxCount) * 100
        : todayTxCount > 0
          ? 100
          : 0;

    // Payment methods as percentages
    const totalTx = paymentMethodsRaw.reduce(
      (sum, r) => sum + Number(r.cnt),
      0,
    );
    const paymentMethods = paymentMethodsRaw.map((r) => ({
      name: r.method ?? "other",
      value: totalTx > 0 ? Math.round((Number(r.cnt) / totalTx) * 100) : 0,
    }));

    return {
      revenue: {
        today: todayRev,
        yesterday: yesterdayRev,
        changePercent: Math.round(revenueChangePercent * 10) / 10,
      },
      transactions: {
        today: todayTxCount,
        yesterday: yesterdayTxCount,
        changePercent: Math.round(txChangePercent * 10) / 10,
      },
      machines: {
        total: machineStats[0],
        active: machineStats[1],
      },
      tasks: {
        completedToday: todayTasksCompleted,
      },
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        time: new Date(tx.createdAt).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: tx.type,
        machineName: tx.machine?.name ?? "\u2014",
        amount: Number(tx.totalAmount),
        status: tx.status,
      })),
      revenueTrend: revenueTrendRaw.map((r) => ({
        date: r.date,
        revenue: Number(r.revenue),
      })),
      paymentMethods,
      topMachines: topMachinesRaw.map((r) => ({
        name: r.name ?? "\u2014",
        revenue: Number(r.revenue),
      })),
    };
  }

  /**
   * Format a date as YYYY-MM-DD string
   */
  private toDateString(date: Date): string {
    return date.toISOString().split("T")[0]!;
  }
}
