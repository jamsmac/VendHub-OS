/**
 * Analytics Module Entities
 * Daily stats, dashboard widgets, analytics snapshots, and custom reports
 */

import { Entity, Column, Index, Unique } from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// DAILY STATS ENTITY
// ============================================================================

@Entity("daily_stats")
@Unique(["statDate", "organizationId"])
@Index(["statDate"])
@Index(["organizationId"])
export class DailyStats extends BaseEntity {
  @ApiProperty()
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({ example: "2024-11-15", description: "Statistics date" })
  @Column({ type: "date" })
  statDate: Date;

  // --- Sales & Revenue ---

  @ApiProperty({ description: "Total revenue for the day" })
  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @ApiProperty({ description: "Total sales count" })
  @Column({ type: "integer", default: 0 })
  totalSalesCount: number;

  @ApiProperty({ description: "Average sale amount" })
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  averageSaleAmount: number;

  // --- Collections ---

  @ApiProperty({ description: "Total cash collected" })
  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  totalCollections: number;

  @ApiProperty({ description: "Number of collections" })
  @Column({ type: "integer", default: 0 })
  collectionsCount: number;

  // --- Machines ---

  @ApiProperty({ description: "Active machines count" })
  @Column({ type: "integer", default: 0 })
  activeMachinesCount: number;

  @ApiProperty({ description: "Online machines count" })
  @Column({ type: "integer", default: 0 })
  onlineMachinesCount: number;

  @ApiProperty({ description: "Offline machines count" })
  @Column({ type: "integer", default: 0 })
  offlineMachinesCount: number;

  // --- Tasks ---

  @ApiProperty({ description: "Refill tasks completed" })
  @Column({ type: "integer", default: 0 })
  refillTasksCompleted: number;

  @ApiProperty({ description: "Collection tasks completed" })
  @Column({ type: "integer", default: 0 })
  collectionTasksCompleted: number;

  @ApiProperty({ description: "Cleaning tasks completed" })
  @Column({ type: "integer", default: 0 })
  cleaningTasksCompleted: number;

  @ApiProperty({ description: "Repair tasks completed" })
  @Column({ type: "integer", default: 0 })
  repairTasksCompleted: number;

  @ApiProperty({ description: "Total tasks completed" })
  @Column({ type: "integer", default: 0 })
  totalTasksCompleted: number;

  // --- Inventory ---

  @ApiProperty({ description: "Inventory units refilled" })
  @Column({ type: "integer", default: 0 })
  inventoryUnitsRefilled: number;

  @ApiProperty({ description: "Inventory units sold" })
  @Column({ type: "integer", default: 0 })
  inventoryUnitsSold: number;

  // --- Top Products ---

  @ApiPropertyOptional({ description: "Top 10 products by sales" })
  @Column({ type: "jsonb", nullable: true })
  topProducts: Array<{
    nomenclatureId: string;
    name: string;
    quantity: number;
    revenue: number;
  }> | null;

  // --- Top Machines ---

  @ApiPropertyOptional({ description: "Top 10 machines by revenue" })
  @Column({ type: "jsonb", nullable: true })
  topMachines: Array<{
    machineId: string;
    machineNumber: string;
    salesCount: number;
    revenue: number;
  }> | null;

  // --- Operators ---

  @ApiProperty({ description: "Active operators count" })
  @Column({ type: "integer", default: 0 })
  activeOperatorsCount: number;

  // --- Metadata ---

  @ApiProperty({ description: "Last updated at" })
  @Index()
  @Column({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  lastUpdatedAt: Date;

  @ApiPropertyOptional({ description: "Last full rebuild timestamp" })
  @Column({ type: "timestamp with time zone", nullable: true })
  lastFullRebuildAt: Date | null;

  @ApiProperty({ description: "Is the day finalized" })
  @Column({ type: "boolean", default: false })
  isFinalized: boolean;

  @ApiPropertyOptional()
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}

// ============================================================================
// DASHBOARD WIDGET ENUMS
// ============================================================================

export enum WidgetType {
  SALES_CHART = "sales_chart",
  REVENUE_CHART = "revenue_chart",
  TOP_MACHINES = "top_machines",
  TOP_PRODUCTS = "top_products",
  MACHINE_STATUS = "machine_status",
  STOCK_LEVELS = "stock_levels",
  TASKS_SUMMARY = "tasks_summary",
  INCIDENTS_MAP = "incidents_map",
  KPI_METRIC = "kpi_metric",
  CUSTOM_CHART = "custom_chart",
}

export enum ChartType {
  KPI = "kpi",
  LINE = "line",
  BAR = "bar",
  PIE = "pie",
  AREA = "area",
  DONUT = "donut",
  HEATMAP = "heatmap",
  SCATTER = "scatter",
}

export enum TimeRange {
  TODAY = "today",
  YESTERDAY = "yesterday",
  LAST_7_DAYS = "last_7_days",
  LAST_30_DAYS = "last_30_days",
  THIS_MONTH = "this_month",
  LAST_MONTH = "last_month",
  THIS_YEAR = "this_year",
  CUSTOM = "custom",
}

// ============================================================================
// DASHBOARD WIDGET ENTITY
// ============================================================================

@Entity("dashboard_widgets")
@Index(["organizationId"])
@Index(["userId"])
export class DashboardWidget extends BaseEntity {
  @ApiProperty()
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty()
  @Column({ type: "uuid" })
  userId: string;

  @ApiProperty()
  @Column({ type: "varchar", length: 255 })
  title: string;

  @ApiProperty({ enum: WidgetType })
  @Column({ type: "enum", enum: WidgetType })
  widgetType: WidgetType;

  @ApiPropertyOptional({ enum: ChartType })
  @Column({ type: "enum", enum: ChartType, nullable: true })
  chartType: ChartType | null;

  @ApiProperty({ enum: TimeRange })
  @Column({ type: "enum", enum: TimeRange, default: TimeRange.LAST_7_DAYS })
  timeRange: TimeRange;

  @ApiProperty()
  @Column({ type: "integer" })
  position: number;

  @ApiProperty({ description: "Grid width (1-12)" })
  @Column({ type: "integer", default: 6 })
  width: number;

  @ApiProperty({ description: "Grid height" })
  @Column({ type: "integer", default: 4 })
  height: number;

  @ApiProperty()
  @Column({ type: "jsonb", default: {} })
  config: {
    filters?: Record<string, unknown>;
    metrics?: string[];
    groupBy?: string;
    sortBy?: string;
    limit?: number;
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    customQuery?: string;
  };

  @ApiProperty()
  @Column({ type: "boolean", default: true })
  isVisible: boolean;

  @ApiPropertyOptional()
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// ANALYTICS SNAPSHOT ENUMS
// ============================================================================

export enum SnapshotType {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

// ============================================================================
// ANALYTICS SNAPSHOT ENTITY
// ============================================================================

@Entity("analytics_snapshots")
@Index(["organizationId"])
@Index(["snapshotType", "snapshotDate"])
@Index(["machineId", "snapshotDate"])
@Index(["locationId", "snapshotDate"])
export class AnalyticsSnapshot extends BaseEntity {
  @ApiProperty()
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({ enum: SnapshotType })
  @Column({ type: "enum", enum: SnapshotType })
  snapshotType: SnapshotType;

  @ApiProperty()
  @Column({ type: "date" })
  snapshotDate: Date;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  machineId: string | null;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  locationId: string | null;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  productId: string | null;

  // --- Sales metrics ---

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  totalTransactions: number;

  @ApiProperty()
  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  totalUnitsSold: number;

  @ApiProperty()
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  averageTransactionValue: number;

  // --- Machine metrics ---

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  uptimeMinutes: number;

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  downtimeMinutes: number;

  @ApiProperty()
  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  availabilityPercentage: number;

  // --- Stock metrics ---

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  stockRefills: number;

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  outOfStockIncidents: number;

  // --- Service metrics ---

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  maintenanceTasksCompleted: number;

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  incidentsReported: number;

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  complaintsReceived: number;

  // --- Financial metrics ---

  @ApiProperty()
  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  operationalCosts: number;

  @ApiProperty()
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  profitMargin: number;

  @ApiPropertyOptional()
  @Column({ type: "jsonb", default: {} })
  detailedMetrics: {
    hourlyDistribution?: Record<string, number>;
    topProducts?: Array<{
      productId: string;
      units: number;
      revenue: number;
    }>;
    paymentMethods?: Record<string, number>;
    errorCodes?: Record<string, number>;
  };

  @ApiPropertyOptional()
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// CUSTOM REPORT ENUMS
// ============================================================================

export enum ReportType {
  SALES = "sales",
  FINANCIAL = "financial",
  INVENTORY = "inventory",
  MACHINES = "machines",
  TASKS = "tasks",
  CUSTOM = "custom",
}

export enum ReportFormat {
  PDF = "pdf",
  EXCEL = "excel",
  CSV = "csv",
  JSON = "json",
}

export enum ScheduleFrequency {
  ONCE = "once",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

// ============================================================================
// CUSTOM REPORT ENTITY
// ============================================================================

@Entity("custom_reports")
@Index(["organizationId"])
@Index(["reportType"])
export class CustomReport extends BaseEntity {
  @ApiProperty()
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty()
  @Column({ type: "varchar", length: 255 })
  name: string;

  @ApiPropertyOptional()
  @Column({ type: "text", nullable: true })
  description: string | null;

  @ApiProperty({ enum: ReportType })
  @Column({ type: "enum", enum: ReportType })
  reportType: ReportType;

  @ApiProperty({ enum: ReportFormat })
  @Column({ type: "enum", enum: ReportFormat, default: ReportFormat.PDF })
  format: ReportFormat;

  @ApiProperty()
  @Column({ type: "jsonb", default: {} })
  config: {
    columns?: string[];
    filters?: Record<string, unknown>;
    groupBy?: string[];
    orderBy?: string[];
    aggregations?: Record<string, string>;
    dateRange?: {
      from: string;
      to: string;
    };
  };

  @ApiProperty()
  @Column({ type: "boolean", default: false })
  isScheduled: boolean;

  @ApiPropertyOptional({ enum: ScheduleFrequency })
  @Column({ type: "enum", enum: ScheduleFrequency, nullable: true })
  scheduleFrequency: ScheduleFrequency | null;

  @ApiPropertyOptional()
  @Column({ type: "time", nullable: true })
  scheduleTime: string | null;

  @ApiPropertyOptional()
  @Column({ type: "simple-array", nullable: true })
  scheduleDays: string[] | null;

  @ApiPropertyOptional()
  @Column({ type: "simple-array", nullable: true })
  recipients: string[] | null;

  @ApiPropertyOptional()
  @Column({ type: "timestamp with time zone", nullable: true })
  lastRunAt: Date | null;

  @ApiPropertyOptional()
  @Column({ type: "timestamp with time zone", nullable: true })
  nextRunAt: Date | null;

  @ApiProperty()
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @ApiPropertyOptional()
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
