/**
 * Analytics Snapshot & Daily Stats Entities for VendHub OS
 * Pre-aggregated analytics data for fast dashboard and reporting queries
 */

import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Snapshot aggregation period type
 */
export enum SnapshotType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

// ============================================================================
// INTERFACES (for JSONB columns)
// ============================================================================

/**
 * Detailed metrics stored as JSONB
 */
export interface DetailedMetrics {
  revenueByPaymentMethod?: Record<string, number>;
  salesByHour?: Record<string, number>;
  topSellingProducts?: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  [key: string]: unknown;
}

/**
 * Top product entry in daily stats
 */
export interface TopProductEntry {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

/**
 * Top machine entry in daily stats
 */
export interface TopMachineEntry {
  machineId: string;
  name: string;
  revenue: number;
  salesCount: number;
}

// ============================================================================
// ANALYTICS SNAPSHOT ENTITY
// ============================================================================

/**
 * AnalyticsSnapshot - Pre-aggregated analytics data
 *
 * Stores daily/weekly/monthly/yearly aggregated metrics
 * for organizations, machines, locations, or products.
 * When machineId/locationId/productId is null, the snapshot
 * represents organization-wide aggregated data.
 */
@Entity('analytics_snapshots')
@Index(['organizationId'])
@Index(['snapshotType', 'snapshotDate'])
@Index(['machineId'])
@Index('UQ_analytics_snapshot_composite', ['organizationId', 'snapshotType', 'snapshotDate', 'machineId', 'locationId', 'productId'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class AnalyticsSnapshot extends BaseEntity {
  // ===== Identification =====

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: SnapshotType,
  })
  snapshotType: SnapshotType;

  @Column({ type: 'date' })
  snapshotDate: Date;

  /**
   * Machine ID - null means org-wide aggregate
   */
  @Column({ type: 'uuid', nullable: true })
  machineId: string | null;

  /**
   * Location ID - null means all locations
   */
  @Column({ type: 'uuid', nullable: true })
  locationId: string | null;

  /**
   * Product ID - null means all products
   */
  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  // ===== Sales Metrics =====

  @Column({ type: 'int', default: 0 })
  totalTransactions: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'int', default: 0 })
  totalUnitsSold: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  averageTransactionValue: number;

  // ===== Uptime Metrics =====

  @Column({ type: 'int', default: 0 })
  uptimeMinutes: number;

  @Column({ type: 'int', default: 0 })
  downtimeMinutes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  availabilityPercentage: number;

  // ===== Operational Metrics =====

  @Column({ type: 'int', default: 0 })
  stockRefills: number;

  @Column({ type: 'int', default: 0 })
  outOfStockIncidents: number;

  @Column({ type: 'int', default: 0 })
  maintenanceTasksCompleted: number;

  @Column({ type: 'int', default: 0 })
  incidentsReported: number;

  @Column({ type: 'int', default: 0 })
  complaintsReceived: number;

  // ===== Financial Metrics =====

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  operationalCosts: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  profitMargin: number;

  // ===== Extended Data =====

  @Column({ type: 'jsonb', default: {} })
  detailedMetrics: DetailedMetrics;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// DAILY STATS ENTITY
// ============================================================================

/**
 * DailyStats - Daily organization-level statistics
 *
 * Provides a single-row snapshot of the entire organization's
 * performance for a given day. Used for dashboard trending
 * and quick comparisons.
 */
@Entity('daily_stats')
@Index(['organizationId'])
@Index(['statDate'])
@Index('UQ_daily_stats_org_date', ['organizationId', 'statDate'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class DailyStats extends BaseEntity {
  // ===== Identification =====

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'date' })
  statDate: Date;

  // ===== Revenue =====

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'int', default: 0 })
  totalSalesCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  averageSaleAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCollections: number;

  @Column({ type: 'int', default: 0 })
  collectionsCount: number;

  // ===== Machines =====

  @Column({ type: 'int', default: 0 })
  activeMachinesCount: number;

  @Column({ type: 'int', default: 0 })
  onlineMachinesCount: number;

  @Column({ type: 'int', default: 0 })
  offlineMachinesCount: number;

  // ===== Tasks =====

  @Column({ type: 'int', default: 0 })
  refillTasksCompleted: number;

  @Column({ type: 'int', default: 0 })
  collectionTasksCompleted: number;

  @Column({ type: 'int', default: 0 })
  cleaningTasksCompleted: number;

  @Column({ type: 'int', default: 0 })
  repairTasksCompleted: number;

  @Column({ type: 'int', default: 0 })
  totalTasksCompleted: number;

  // ===== Inventory =====

  @Column({ type: 'int', default: 0 })
  inventoryUnitsRefilled: number;

  @Column({ type: 'int', default: 0 })
  inventoryUnitsSold: number;

  // ===== Aggregates (JSONB) =====

  @Column({ type: 'jsonb', default: [] })
  topProducts: TopProductEntry[];

  @Column({ type: 'jsonb', default: [] })
  topMachines: TopMachineEntry[];

  // ===== Status =====

  @Column({ type: 'int', default: 0 })
  activeOperatorsCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdatedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastFullRebuildAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isFinalized: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
