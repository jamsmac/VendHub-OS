/**
 * Report Entities for VendHub OS
 * Система отчетов и аналитики
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Organization } from "../../organizations/entities/organization.entity";

// Re-export enums and constants for backward compatibility
export {
  ReportType,
  ReportCategory,
  ExportFormat,
  ReportStatus,
  ReportFrequency,
  AggregationType,
  PeriodType,
  ChartType,
} from "./report.enums";

export {
  REPORT_TYPE_LABELS,
  REPORT_CATEGORY_LABELS,
  PERIOD_TYPE_LABELS,
  EXPORT_FORMAT_LABELS,
} from "./report.constants";

import {
  ReportType,
  ReportCategory,
  ExportFormat,
  ReportStatus,
  ReportFrequency,
  AggregationType,
  PeriodType,
  ChartType,
} from "./report.enums";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Фильтры отчета
 */
interface ReportFilters {
  // Период
  periodType?: PeriodType;
  dateFrom?: Date;
  dateTo?: Date;

  // Сущности
  machineIds?: string[];
  locationIds?: string[];
  productIds?: string[];
  categoryIds?: string[];
  userIds?: string[];

  // Дополнительные
  status?: string[];
  types?: string[];
  tags?: string[];

  // Кастомные

  custom?: Record<string, unknown>;
}

/**
 * Группировка
 */
interface ReportGrouping {
  field: string; // Поле для группировки
  label?: string; // Название
  interval?: "hour" | "day" | "week" | "month" | "year"; // Для дат
}

/**
 * Сортировка
 */
interface ReportSorting {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Колонка отчета
 */
interface ReportColumn {
  field: string;
  label: string;
  labelUz?: string;
  type:
    | "string"
    | "number"
    | "currency"
    | "percent"
    | "date"
    | "datetime"
    | "boolean";
  aggregation?: AggregationType;
  format?: string; // Формат отображения
  width?: number;
  align?: "left" | "center" | "right";
  isVisible?: boolean;
  isSortable?: boolean;
}

/**
 * Конфигурация графика
 */
interface ChartConfig {
  type: ChartType;
  title?: string;
  titleUz?: string;
  xAxis?: {
    field: string;
    label?: string;
    type?: "category" | "time" | "value";
  };
  yAxis?: {
    field: string;
    label?: string;
    min?: number;
    max?: number;
  };
  series?: {
    field: string;
    label: string;
    color?: string;
    type?: ChartType;
  }[];
  legend?: boolean;
  tooltip?: boolean;
  colors?: string[];
}

/**
 * KPI виджет
 */
interface KpiWidget {
  id: string;
  title: string;
  titleUz?: string;
  value: number | string;
  previousValue?: number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  format?: "number" | "currency" | "percent";
  icon?: string;
  color?: string;
  sparkline?: number[];
}

/**
 * Секция отчета
 */
interface ReportSection {
  id: string;
  title: string;
  titleUz?: string;
  type: "kpi" | "chart" | "table" | "text" | "summary";
  order: number;
  config: {
    kpis?: KpiWidget[];
    chart?: ChartConfig;
    columns?: ReportColumn[];
    text?: string;
    textUz?: string;
  };
  filters?: ReportFilters;
  isVisible?: boolean;
}

/**
 * Параметры генерации
 */
interface GenerationParams {
  // Формат
  format: ExportFormat;

  // Опции
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeRawData?: boolean;

  // Брендинг
  includeHeader?: boolean;
  includeLogo?: boolean;
  customLogo?: string;
  customColors?: {
    primary?: string;
    secondary?: string;
  };

  // Локализация
  language?: "ru" | "uz" | "en";
  timezone?: string;
  currency?: string;
  numberFormat?: string;
  dateFormat?: string;

  // Размеры (для PDF)
  pageSize?: "A4" | "A3" | "Letter";
  orientation?: "portrait" | "landscape";
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

/**
 * Расписание отчета
 */
interface ReportSchedule {
  frequency: ReportFrequency;

  // Для recurring
  dayOfWeek?: number; // 0-6 (для weekly)
  dayOfMonth?: number; // 1-31 (для monthly)
  monthOfYear?: number; // 1-12 (для yearly)
  time?: string; // "09:00"
  timezone?: string;

  // Доставка
  deliveryChannels?: ("email" | "telegram" | "webhook")[];
  recipients?: {
    userId?: string;
    email?: string;
    telegramId?: string;
    webhookUrl?: string;
  }[];

  // Опции
  format?: ExportFormat;
  onlyIfData?: boolean; // Отправлять только если есть данные
  includeComparison?: boolean; // Сравнение с предыдущим периодом
}

/**
 * Результат отчета
 */
interface ReportResult {
  // Данные
  data: unknown[];

  summary?: Record<string, unknown>;

  // Метаданные
  rowCount: number;
  generatedAt: Date;
  generationTimeMs: number;

  // Файлы
  files?: {
    format: ExportFormat;
    url: string;
    size: number;
    expiresAt?: Date;
  }[];
}

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * Определение отчета (шаблон)
 */
@Entity("report_definitions")
@Index(["organizationId", "type"])
@Index(["organizationId", "category"])
@Index(["organizationId", "isActive"])
export class ReportDefinition extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Основная информация =====

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, nullable: true })
  nameUz: string;

  @Column({ length: 50, unique: true })
  code: string; // "SALES_DAILY", "INVENTORY_MONTHLY"

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  descriptionUz: string;

  @Column({
    type: "enum",
    enum: ReportType,
  })
  type: ReportType;

  @Column({
    type: "enum",
    enum: ReportCategory,
  })
  category: ReportCategory;

  // ===== Структура отчета =====

  @Column({ type: "jsonb", default: [] })
  sections: ReportSection[];

  @Column({ type: "jsonb", default: [] })
  columns: ReportColumn[];

  @Column({ type: "jsonb", nullable: true })
  defaultFilters: ReportFilters;

  @Column({ type: "jsonb", nullable: true })
  grouping: ReportGrouping[];

  @Column({ type: "jsonb", nullable: true })
  sorting: ReportSorting[];

  // ===== Параметры генерации =====

  @Column({ type: "jsonb", default: {} })
  generationParams: GenerationParams;

  @Column({
    type: "enum",
    enum: ExportFormat,
    array: true,
    default: [ExportFormat.PDF, ExportFormat.EXCEL],
  })
  availableFormats: ExportFormat[];

  // ===== SQL запрос (для кастомных) =====

  @Column({ type: "text", nullable: true })
  sqlQuery: string; // Безопасный SQL для кастомных отчетов

  @Column({ type: "jsonb", default: [] })
  queryParameters: {
    name: string;
    type: "string" | "number" | "date" | "array";
    required: boolean;
    defaultValue?: unknown;
  }[];

  // ===== Права доступа =====

  @Column({ type: "simple-array", default: [] })
  allowedRoles: string[]; // Кто может видеть отчет

  @Column({ default: false })
  isPublic: boolean; // Доступен всем в организации

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSystem: boolean; // Системный отчет (нельзя удалить)

  @Column({ default: false })
  isFavorite: boolean;

  // ===== Статистика =====

  @Column({ default: 0 })
  runCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastRunAt: Date;

  @Column({ type: "int", nullable: true })
  averageGenerationTimeMs: number;
}

/**
 * Запланированный отчет
 */
@Entity("scheduled_reports")
@Index(["organizationId", "isActive"])
@Index(["nextRunAt", "isActive"])
export class ScheduledReport extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ type: "uuid", nullable: true })
  definitionId: string;

  @ManyToOne(() => ReportDefinition, { onDelete: "SET NULL" })
  @JoinColumn({ name: "definition_id" })
  definition: ReportDefinition;

  // ===== Информация =====

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // ===== Расписание =====

  @Column({ type: "jsonb" })
  schedule: ReportSchedule;

  @Column({ type: "timestamp", nullable: true })
  nextRunAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastRunAt: Date;

  // ===== Фильтры =====

  @Column({ type: "jsonb", nullable: true })
  filters: ReportFilters;

  @Column({
    type: "enum",
    enum: PeriodType,
    default: PeriodType.LAST_30_DAYS,
  })
  periodType: PeriodType;

  // ===== Доставка =====

  @Column({ type: "jsonb", default: [] })
  recipients: {
    userId?: string;
    email?: string;
    telegramId?: string;
    webhookUrl?: string;
  }[];

  @Column({
    type: "enum",
    enum: ExportFormat,
    default: ExportFormat.PDF,
  })
  format: ExportFormat;

  // ===== Статус =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  runCount: number;

  @Column({ default: 0 })
  failCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastSuccessAt: Date;

  @Column({ type: "text", nullable: true })
  lastError: string;
}

/**
 * Сгенерированный отчет
 */
@Entity("generated_reports")
@Index(["organizationId", "status", "createdAt"])
@Index(["definitionId", "createdAt"])
@Index(["createdById", "createdAt"])
export class GeneratedReport extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ type: "uuid", nullable: true })
  definitionId: string | null;

  @ManyToOne(() => ReportDefinition, { onDelete: "SET NULL" })
  @JoinColumn({ name: "definition_id" })
  definition: ReportDefinition;

  @Column({ type: "uuid", nullable: true })
  scheduledReportId: string;

  // ===== Идентификация =====

  @Column({ length: 50, unique: true })
  reportNumber: string; // "RPT-2024-00001"

  @Column({ length: 255 })
  name: string;

  @Column({
    type: "enum",
    enum: ReportType,
  })
  type: ReportType;

  // ===== Статус =====

  @Column({
    type: "enum",
    enum: ReportStatus,
    default: ReportStatus.GENERATING,
  })
  status: ReportStatus;

  // ===== Параметры генерации =====

  @Column({ type: "jsonb", nullable: true })
  filters: ReportFilters;

  @Column({
    type: "enum",
    enum: PeriodType,
    nullable: true,
  })
  periodType: PeriodType;

  @Column({ type: "date", nullable: true })
  dateFrom: Date;

  @Column({ type: "date", nullable: true })
  dateTo: Date;

  @Column({ type: "jsonb", nullable: true })
  generationParams: GenerationParams;

  // ===== Результат =====

  @Column({ type: "jsonb", nullable: true })
  result: ReportResult;

  @Column({ type: "jsonb", nullable: true })
  summary: Record<string, unknown>;

  @Column({ default: 0 })
  rowCount: number;

  // ===== Файлы =====

  @Column({ type: "jsonb", default: [] })
  files: {
    format: ExportFormat;
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    generatedAt: Date;
  }[];

  // ===== Время =====

  @Column({ type: "timestamp", nullable: true })
  startedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt: Date;

  @Column({ type: "int", nullable: true })
  generationTimeMs: number;

  // ===== Ошибки =====

  @Column({ type: "text", nullable: true })
  errorMessage: string;

  @Column({ type: "jsonb", nullable: true })
  errorDetails: Record<string, unknown>;

  // ===== Срок хранения =====

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;

  // ===== Hooks =====

  @BeforeInsert()
  generateReportNumber() {
    if (!this.reportNumber) {
      const year = new Date().getFullYear();
      const random = Math.random().toString().substring(2, 7).padStart(5, "0");
      this.reportNumber = `RPT-${year}-${random}`;
    }
  }
}

/**
 * Дашборд
 */
@Entity("dashboards")
@Index(["organizationId", "isDefault"])
@Index(["organizationId", "isActive"])
export class Dashboard extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Информация =====

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, nullable: true })
  nameUz: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  // ===== Настройки =====

  @Column({ type: "int", default: 12 })
  gridColumns: number;

  @Column({ type: "int", default: 60 })
  rowHeight: number;

  @Column({ type: "jsonb", nullable: true })
  defaultFilters: ReportFilters;

  @Column({
    type: "enum",
    enum: PeriodType,
    default: PeriodType.THIS_MONTH,
  })
  defaultPeriod: PeriodType;

  // ===== Права доступа =====

  @Column({ type: "simple-array", default: [] })
  allowedRoles: string[];

  @Column({ default: false })
  isPublic: boolean;

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean; // Дашборд по умолчанию

  @Column({ default: false })
  isSystem: boolean; // Системный дашборд

  // DashboardWidget managed by analytics module
}

// DashboardWidget — canonical entity in analytics/entities/analytics.entity.ts

/**
 * Сохраненный фильтр отчета
 */
@Entity("saved_report_filters")
@Index(["organizationId", "userId"])
@Index(["definitionId"])
export class SavedReportFilter extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ type: "uuid", nullable: true })
  definitionId: string;

  @ManyToOne(() => ReportDefinition, { onDelete: "SET NULL" })
  @JoinColumn({ name: "definition_id" })
  definition: ReportDefinition;

  @Column({ type: "uuid", nullable: true })
  userId: string; // Если личный фильтр

  // ===== Информация =====

  @Column({ length: 100 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  // ===== Фильтры =====

  @Column({ type: "jsonb" })
  filters: ReportFilters;

  @Column({
    type: "enum",
    enum: PeriodType,
    nullable: true,
  })
  periodType: PeriodType;

  // ===== Флаги =====

  @Column({ default: false })
  isDefault: boolean; // Применять по умолчанию

  @Column({ default: false })
  isShared: boolean; // Доступен всем

  // ===== Статистика =====

  @Column({ default: 0 })
  usageCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date;
}

/**
 * Подписка на отчет
 */
@Entity("report_subscriptions")
@Index(["organizationId", "userId"])
@Index(["scheduledReportId"])
export class ReportSubscription extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ type: "uuid", nullable: true })
  scheduledReportId: string;

  @ManyToOne(() => ScheduledReport, { onDelete: "SET NULL" })
  @JoinColumn({ name: "scheduled_report_id" })
  scheduledReport: ScheduledReport;

  @Column({ type: "uuid" })
  userId: string;

  // ===== Доставка =====

  @Column({
    type: "enum",
    enum: ["email", "telegram", "in_app"],
    default: "email",
  })
  deliveryChannel: "email" | "telegram" | "in_app";

  @Column({ length: 255, nullable: true })
  deliveryAddress: string; // email или telegramId

  @Column({
    type: "enum",
    enum: ExportFormat,
    default: ExportFormat.PDF,
  })
  preferredFormat: ExportFormat;

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;
}
