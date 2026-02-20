/**
 * Analytics Event Listener
 *
 * Listens to domain events (transactions, tasks, collections) and
 * incrementally updates DailyStats in real-time, complementing the
 * nightly cron-based full rebuild in AnalyticsService.
 */

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DailyStats } from "../entities/analytics-snapshot.entity";
import { AnalyticsService } from "./analytics.service";

@Injectable()
export class AnalyticsListener {
  private readonly logger = new Logger(AnalyticsListener.name);

  constructor(
    @InjectRepository(DailyStats)
    private readonly dailyStatsRepo: Repository<DailyStats>,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * When a transaction is completed (sale paid), bump revenue + count.
   * Falls back to full rebuild if incremental update fails.
   */
  @OnEvent("transaction.completed")
  async handleTransactionCompleted(payload: {
    organizationId?: string;
    totalAmount?: number;
    quantity?: number;
  }): Promise<void> {
    const orgId = payload?.organizationId;
    if (!orgId) return;

    try {
      const today = this.todayString();
      const stats = await this.getOrCreateDailyStats(orgId, today);

      stats.totalRevenue =
        Number(stats.totalRevenue) + Number(payload.totalAmount ?? 0);
      stats.totalSalesCount = Number(stats.totalSalesCount) + 1;
      stats.averageSaleAmount =
        stats.totalSalesCount > 0
          ? Number(stats.totalRevenue) / Number(stats.totalSalesCount)
          : 0;
      stats.inventoryUnitsSold =
        Number(stats.inventoryUnitsSold) + Number(payload.quantity ?? 1);
      stats.lastUpdatedAt = new Date();

      await this.dailyStatsRepo.save(stats);
    } catch (error) {
      this.logger.warn(
        `Incremental update failed for transaction.completed, triggering full rebuild: ${(error as Error).message}`,
      );
      await this.safeFullRebuild(orgId);
    }
  }

  /**
   * When a collection is verified, bump collection totals.
   */
  @OnEvent("collection.verified")
  async handleCollectionVerified(payload: {
    organizationId?: string;
    totalAmount?: number;
  }): Promise<void> {
    const orgId = payload?.organizationId;
    if (!orgId) return;

    try {
      const today = this.todayString();
      const stats = await this.getOrCreateDailyStats(orgId, today);

      stats.totalCollections =
        Number(stats.totalCollections) + Number(payload.totalAmount ?? 0);
      stats.collectionsCount = Number(stats.collectionsCount) + 1;
      stats.lastUpdatedAt = new Date();

      await this.dailyStatsRepo.save(stats);
    } catch (error) {
      this.logger.warn(
        `Incremental update failed for collection.verified: ${(error as Error).message}`,
      );
      await this.safeFullRebuild(orgId);
    }
  }

  /**
   * When a task is completed, bump task counters.
   */
  @OnEvent("maintenance.completed")
  async handleTaskCompleted(payload: {
    request?: { organizationId?: string; type?: string };
  }): Promise<void> {
    const orgId = payload?.request?.organizationId;
    if (!orgId) return;

    try {
      const today = this.todayString();
      const stats = await this.getOrCreateDailyStats(orgId, today);

      stats.totalTasksCompleted = Number(stats.totalTasksCompleted) + 1;
      stats.lastUpdatedAt = new Date();

      await this.dailyStatsRepo.save(stats);
    } catch (error) {
      this.logger.warn(
        `Incremental update failed for maintenance.completed: ${(error as Error).message}`,
      );
      await this.safeFullRebuild(orgId);
    }
  }

  /**
   * When an order is completed, trigger a full stats rebuild for accuracy
   * (orders affect multiple metrics).
   */
  @OnEvent("order.completed")
  async handleOrderCompleted(payload: {
    organizationId?: string;
  }): Promise<void> {
    const orgId = payload?.organizationId;
    if (!orgId) return;

    await this.safeFullRebuild(orgId);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private todayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Get existing DailyStats for today or create a blank one.
   */
  private async getOrCreateDailyStats(
    organizationId: string,
    date: string,
  ): Promise<DailyStats> {
    const existing = await this.dailyStatsRepo.findOne({
      where: { organizationId, statDate: new Date(date) },
    });

    if (existing) return existing;

    // Create a blank record — the nightly cron will do a full rebuild later
    const blank = this.dailyStatsRepo.create({
      organizationId,
      statDate: new Date(date),
      totalRevenue: 0,
      totalSalesCount: 0,
      averageSaleAmount: 0,
      totalCollections: 0,
      collectionsCount: 0,
      activeMachinesCount: 0,
      onlineMachinesCount: 0,
      offlineMachinesCount: 0,
      refillTasksCompleted: 0,
      collectionTasksCompleted: 0,
      cleaningTasksCompleted: 0,
      repairTasksCompleted: 0,
      totalTasksCompleted: 0,
      inventoryUnitsRefilled: 0,
      inventoryUnitsSold: 0,
      topProducts: [],
      topMachines: [],
      activeOperatorsCount: 0,
      lastUpdatedAt: new Date(),
      isFinalized: false,
    } as Partial<DailyStats>);

    return this.dailyStatsRepo.save(blank);
  }

  /**
   * Safely trigger a full rebuild — never throw to avoid breaking the event emitter chain.
   */
  private async safeFullRebuild(organizationId: string): Promise<void> {
    try {
      const today = this.todayString();
      await this.analyticsService.updateDailyStats(organizationId, today);
    } catch (error) {
      this.logger.error(
        `Full rebuild failed for org ${organizationId}: ${(error as Error).message}`,
      );
    }
  }
}
