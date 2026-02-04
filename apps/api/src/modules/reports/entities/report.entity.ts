/**
 * Report Entities for VendHub OS
 * Система отчетов и аналитики
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Тип отчета
 */
export enum ReportType {
  // Продажи
  SALES_SUMMARY = 'sales_summary',              // Сводка продаж
  SALES_BY_MACHINE = 'sales_by_machine',        // Продажи по автоматам
  SALES_BY_PRODUCT = 'sales_by_product',        // Продажи по продуктам
  SALES_BY_LOCATION = 'sales_by_location',      // Продажи по локациям
  SALES_BY_PERIOD = 'sales_by_period',          // Продажи по периодам
  SALES_TREND = 'sales_trend',                  // Тренд продаж

  // Автоматы
  MACHINE_PERFORMANCE = 'machine_performance',  // Производительность автоматов
  MACHINE_UPTIME = 'machine_uptime',            // Время работы
  MACHINE_ERRORS = 'machine_errors',            // Ошибки автоматов
  MACHINE_MAINTENANCE = 'machine_maintenance',  // Техобслуживание

  // Инвентарь
  INVENTORY_LEVELS = 'inventory_levels',        // Уровни запасов
  INVENTORY_MOVEMENT = 'inventory_movement',    // Движение товаров
  INVENTORY_EXPIRY = 'inventory_expiry',        // Сроки годности
  STOCK_OUT = 'stock_out',                      // Отчет о дефицитах

  // Финансы
  REVENUE_REPORT = 'revenue_report',            // Отчет по выручке
  COLLECTION_REPORT = 'collection_report',      // Отчет по инкассации
  PROFIT_LOSS = 'profit_loss',                  // Прибыль и убытки
  COMMISSION_REPORT = 'commission_report',      // Отчет по комиссиям
  CONTRACT_PAYMENTS = 'contract_payments',      // Платежи по контрактам

  // Операции
  TASK_REPORT = 'task_report',                  // Отчет по задачам
  OPERATOR_PERFORMANCE = 'operator_performance', // Производительность операторов
  ROUTE_EFFICIENCY = 'route_efficiency',        // Эффективность маршрутов

  // Клиенты и жалобы
  COMPLAINT_REPORT = 'complaint_report',        // Отчет по жалобам
  COMPLAINT_SLA = 'complaint_sla',              // SLA по жалобам
  CUSTOMER_SATISFACTION = 'customer_satisfaction', // Удовлетворенность клиентов

  // Локации
  LOCATION_PERFORMANCE = 'location_performance', // Производительность локаций
  LOCATION_COMPARISON = 'location_comparison',   // Сравнение локаций

  // Кастомные
  CUSTOM = 'custom',                            // Кастомный отчет
  DASHBOARD = 'dashboard',                      // Дашборд
}

/**
 * Категория отчета
 */
export enum ReportCategory {
  SALES = 'sales',
  MACHINES = 'machines',
  INVENTORY = 'inventory',
  FINANCE = 'finance',
  OPERATIONS = 'operations',
  COMPLAINTS = 'complaints',
  LOCATIONS = 'locations',
  ANALYTICS = 'analytics',
  CUSTOM = 'custom',
}

/**
 * Формат экспорта
 */
export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
  HTML = 'html',
}

/**
 * Статус отчета
 */
export enum ReportStatus {
  DRAFT = 'draft',                  // Черновик
  SCHEDULED = 'scheduled',          // Запланирован
  GENERATING = 'generating',        // Генерируется
  COMPLETED = 'completed',          // Готов
  FAILED = 'failed',                // Ошибка
  CANCELLED = 'cancelled',          // Отменен
  EXPIRED = 'expired',              // Истек срок хранения
}

/**
 * Частота генерации
 */
export enum ReportFrequency {
  ONCE = 'once',                    // Однократно
  DAILY = 'daily',                  // Ежедневно
  WEEKLY = 'weekly',                // Еженедельно
  MONTHLY = 'monthly',              // Ежемесячно
  QUARTERLY = 'quarterly',          // Ежеквартально
  YEARLY = 'yearly',                // Ежегодно
  CUSTOM = 'custom',                // Кастомный интервал
}

/**
 * Тип агрегации
 */
export enum AggregationType {
  SUM = 'sum',
  AVG = 'avg',
  COUNT = 'count',
  MIN = 'min',
  MAX = 'max',
  FIRST = 'first',
  LAST = 'last',
}

/**
 * Тип периода
 */
export enum PeriodType {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'this_week',
  LAST_WEEK = 'last_week',
  THIS_MONTH = 'this_month',
  LAST_MONTH = 'last_month',
  THIS_QUARTER = 'this_quarter',
  LAST_QUARTER = 'last_quarter',
  THIS_YEAR = 'this_year',
  LAST_YEAR = 'last_year',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  CUSTOM = 'custom',
}

/**
 * Тип визуализации
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  AREA = 'area',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  TABLE = 'table',
  KPI = 'kpi',
  MAP = 'map',
  FUNNEL = 'funnel',
  GAUGE = 'gauge',
}

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
  custom?: Record<string, any>;
}

/**
 * Группировка
 */
interface ReportGrouping {
  field: string;                    // Поле для группировки
  label?: string;                   // Название
  interval?: 'hour' | 'day' | 'week' | 'month' | 'year';  // Для дат
}

/**
 * Сортировка
 */
interface ReportSorting {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Колонка отчета
 */
interface ReportColumn {
  field: string;
  label: string;
  labelUz?: string;
  type: 'string' | 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'boolean';
  aggregation?: AggregationType;
  format?: string;                  // Формат отображения
  width?: number;
  align?: 'left' | 'center' | 'right';
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
    type?: 'category' | 'time' | 'value';
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
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'number' | 'currency' | 'percent';
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
  type: 'kpi' | 'chart' | 'table' | 'text' | 'summary';
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
  language?: 'ru' | 'uz' | 'en';
  timezone?: string;
  currency?: string;
  numberFormat?: string;
  dateFormat?: string;

  // Размеры (для PDF)
  pageSize?: 'A4' | 'A3' | 'Letter';
  orientation?: 'portrait' | 'landscape';
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
  dayOfWeek?: number;               // 0-6 (для weekly)
  dayOfMonth?: number;              // 1-31 (для monthly)
  monthOfYear?: number;             // 1-12 (для yearly)
  time?: string;                    // "09:00"
  timezone?: string;

  // Доставка
  deliveryChannels?: ('email' | 'telegram' | 'webhook')[];
  recipients?: {
    userId?: string;
    email?: string;
    telegramId?: string;
    webhookUrl?: string;
  }[];

  // Опции
  format?: ExportFormat;
  onlyIfData?: boolean;             // Отправлять только если есть данные
  includeComparison?: boolean;      // Сравнение с предыдущим периодом
}

/**
 * Результат отчета
 */
interface ReportResult {
  // Данные
  data: any[];
  summary?: Record<string, any>;

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
@Entity('report_definitions')
@Index(['organizationId', 'type'])
@Index(['organizationId', 'category'])
@Index(['organizationId', 'isActive'])
export class ReportDefinition extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // ===== Основная информация =====

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, nullable: true })
  nameUz: string;

  @Column({ length: 50, unique: true })
  code: string;                     // "SALES_DAILY", "INVENTORY_MONTHLY"

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  descriptionUz: string;

  @Column({
    type: 'enum',
    enum: ReportType,
  })
  type: ReportType;

  @Column({
    type: 'enum',
    enum: ReportCategory,
  })
  category: ReportCategory;

  // ===== Структура отчета =====

  @Column({ type: 'jsonb', default: [] })
  sections: ReportSection[];

  @Column({ type: 'jsonb', default: [] })
  columns: ReportColumn[];

  @Column({ type: 'jsonb', nullable: true })
  defaultFilters: ReportFilters;

  @Column({ type: 'jsonb', nullable: true })
  grouping: ReportGrouping[];

  @Column({ type: 'jsonb', nullable: true })
  sorting: ReportSorting[];

  // ===== Параметры генерации =====

  @Column({ type: 'jsonb', default: {} })
  generationParams: GenerationParams;

  @Column({ type: 'enum', enum: ExportFormat, array: true, default: [ExportFormat.PDF, ExportFormat.EXCEL] })
  availableFormats: ExportFormat[];

  // ===== SQL запрос (для кастомных) =====

  @Column({ type: 'text', nullable: true })
  sqlQuery: string;                 // Безопасный SQL для кастомных отчетов

  @Column({ type: 'jsonb', default: [] })
  queryParameters: {
    name: string;
    type: 'string' | 'number' | 'date' | 'array';
    required: boolean;
    defaultValue?: any;
  }[];

  // ===== Права доступа =====

  @Column({ type: 'simple-array', default: [] })
  allowedRoles: string[];           // Кто может видеть отчет

  @Column({ default: false })
  isPublic: boolean;                // Доступен всем в организации

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isSystem: boolean;                // Системный отчет (нельзя удалить)

  @Column({ default: false })
  isFavorite: boolean;

  // ===== Статистика =====

  @Column({ default: 0 })
  runCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ type: 'int', nullable: true })
  averageGenerationTimeMs: number;

}

/**
 * Запланированный отчет
 */
@Entity('scheduled_reports')
@Index(['organizationId', 'isActive'])
@Index(['nextRunAt', 'isActive'])
export class ScheduledReport extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid' })
  definitionId: string;

  @ManyToOne(() => ReportDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition: ReportDefinition;

  // ===== Информация =====

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ===== Расписание =====

  @Column({ type: 'jsonb' })
  schedule: ReportSchedule;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  // ===== Фильтры =====

  @Column({ type: 'jsonb', nullable: true })
  filters: ReportFilters;

  @Column({
    type: 'enum',
    enum: PeriodType,
    default: PeriodType.LAST_30_DAYS,
  })
  periodType: PeriodType;

  // ===== Доставка =====

  @Column({ type: 'jsonb', default: [] })
  recipients: {
    userId?: string;
    email?: string;
    telegramId?: string;
    webhookUrl?: string;
  }[];

  @Column({
    type: 'enum',
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

  @Column({ type: 'timestamp', nullable: true })
  lastSuccessAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string;

}

/**
 * Сгенерированный отчет
 */
@Entity('generated_reports')
@Index(['organizationId', 'status', 'created_at'])
@Index(['definitionId', 'created_at'])
@Index(['created_by_id', 'created_at'])
export class GeneratedReport extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid' })
  definitionId: string;

  @ManyToOne(() => ReportDefinition, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'definition_id' })
  definition: ReportDefinition;

  @Column({ type: 'uuid', nullable: true })
  scheduledReportId: string;

  // ===== Идентификация =====

  @Column({ length: 50, unique: true })
  reportNumber: string;             // "RPT-2024-00001"

  @Column({ length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ReportType,
  })
  type: ReportType;

  // ===== Статус =====

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.GENERATING,
  })
  status: ReportStatus;

  // ===== Параметры генерации =====

  @Column({ type: 'jsonb', nullable: true })
  filters: ReportFilters;

  @Column({
    type: 'enum',
    enum: PeriodType,
    nullable: true,
  })
  periodType: PeriodType;

  @Column({ type: 'date', nullable: true })
  dateFrom: Date;

  @Column({ type: 'date', nullable: true })
  dateTo: Date;

  @Column({ type: 'jsonb', nullable: true })
  generationParams: GenerationParams;

  // ===== Результат =====

  @Column({ type: 'jsonb', nullable: true })
  result: ReportResult;

  @Column({ type: 'jsonb', nullable: true })
  summary: Record<string, any>;

  @Column({ default: 0 })
  rowCount: number;

  // ===== Файлы =====

  @Column({ type: 'jsonb', default: [] })
  files: {
    format: ExportFormat;
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    generatedAt: Date;
  }[];

  // ===== Время =====

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', nullable: true })
  generationTimeMs: number;

  // ===== Ошибки =====

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails: Record<string, any>;

  // ===== Срок хранения =====

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  // ===== Hooks =====

  @BeforeInsert()
  generateReportNumber() {
    if (!this.reportNumber) {
      const year = new Date().getFullYear();
      const random = Math.random().toString().substring(2, 7).padStart(5, '0');
      this.reportNumber = `RPT-${year}-${random}`;
    }
  }
}

/**
 * Виджет дашборда
 */
@Entity('dashboard_widgets')
@Index(['organizationId', 'dashboardId'])
@Index(['organizationId', 'isActive'])
export class DashboardWidget extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid' })
  dashboardId: string;

  @ManyToOne(() => Dashboard, dashboard => dashboard.widgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dashboard_id' })
  dashboard: Dashboard;

  // ===== Информация =====

  @Column({ length: 100 })
  title: string;

  @Column({ length: 100, nullable: true })
  titleUz: string;

  @Column({
    type: 'enum',
    enum: ChartType,
    default: ChartType.KPI,
  })
  chartType: ChartType;

  // ===== Позиция =====

  @Column({ type: 'int', default: 0 })
  positionX: number;

  @Column({ type: 'int', default: 0 })
  positionY: number;

  @Column({ type: 'int', default: 4 })
  width: number;                    // в сетке 12 колонок

  @Column({ type: 'int', default: 2 })
  height: number;                   // в единицах высоты

  // ===== Данные =====

  @Column({ type: 'uuid', nullable: true })
  definitionId: string;             // Связь с ReportDefinition

  @Column({ type: 'jsonb', nullable: true })
  filters: ReportFilters;

  @Column({
    type: 'enum',
    enum: PeriodType,
    default: PeriodType.THIS_MONTH,
  })
  periodType: PeriodType;

  // ===== Конфигурация =====

  @Column({ type: 'jsonb', nullable: true })
  chartConfig: ChartConfig;

  @Column({ type: 'jsonb', nullable: true })
  kpiConfig: {
    valueField: string;
    format: 'number' | 'currency' | 'percent';
    comparisonPeriod?: PeriodType;
    thresholds?: {
      warning?: number;
      danger?: number;
    };
  };

  // ===== Обновление =====

  @Column({ type: 'int', default: 300 })
  refreshIntervalSeconds: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRefreshAt: Date;

  // ===== Кэш данных =====

  @Column({ type: 'jsonb', nullable: true })
  cachedData: any;

  @Column({ type: 'timestamp', nullable: true })
  cacheExpiresAt: Date;

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  isVisible: boolean;
}

/**
 * Дашборд
 */
@Entity('dashboards')
@Index(['organizationId', 'isDefault'])
@Index(['organizationId', 'isActive'])
export class Dashboard extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // ===== Информация =====

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, nullable: true })
  nameUz: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  // ===== Настройки =====

  @Column({ type: 'int', default: 12 })
  gridColumns: number;

  @Column({ type: 'int', default: 60 })
  rowHeight: number;

  @Column({ type: 'jsonb', nullable: true })
  defaultFilters: ReportFilters;

  @Column({
    type: 'enum',
    enum: PeriodType,
    default: PeriodType.THIS_MONTH,
  })
  defaultPeriod: PeriodType;

  // ===== Права доступа =====

  @Column({ type: 'simple-array', default: [] })
  allowedRoles: string[];

  @Column({ default: false })
  isPublic: boolean;

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean;               // Дашборд по умолчанию

  @Column({ default: false })
  isSystem: boolean;                // Системный дашборд

  // ===== Связи =====

  @OneToMany(() => DashboardWidget, widget => widget.dashboard)
  widgets: DashboardWidget[];

}

/**
 * Сохраненный фильтр отчета
 */
@Entity('saved_report_filters')
@Index(['organizationId', 'userId'])
@Index(['definitionId'])
export class SavedReportFilter extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid' })
  definitionId: string;

  @ManyToOne(() => ReportDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'definition_id' })
  definition: ReportDefinition;

  @Column({ type: 'uuid', nullable: true })
  userId: string;                   // Если личный фильтр

  // ===== Информация =====

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // ===== Фильтры =====

  @Column({ type: 'jsonb' })
  filters: ReportFilters;

  @Column({
    type: 'enum',
    enum: PeriodType,
    nullable: true,
  })
  periodType: PeriodType;

  // ===== Флаги =====

  @Column({ default: false })
  isDefault: boolean;               // Применять по умолчанию

  @Column({ default: false })
  isShared: boolean;                // Доступен всем

  // ===== Статистика =====

  @Column({ default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;
}

/**
 * Подписка на отчет
 */
@Entity('report_subscriptions')
@Index(['organizationId', 'userId'])
@Index(['scheduledReportId'])
export class ReportSubscription extends BaseEntity {
  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid' })
  scheduledReportId: string;

  @ManyToOne(() => ScheduledReport, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduled_report_id' })
  scheduledReport: ScheduledReport;

  @Column({ type: 'uuid' })
  userId: string;

  // ===== Доставка =====

  @Column({
    type: 'enum',
    enum: ['email', 'telegram', 'in_app'],
    default: 'email',
  })
  deliveryChannel: 'email' | 'telegram' | 'in_app';

  @Column({ length: 255, nullable: true })
  deliveryAddress: string;          // email или telegramId

  @Column({
    type: 'enum',
    enum: ExportFormat,
    default: ExportFormat.PDF,
  })
  preferredFormat: ExportFormat;

  // ===== Флаги =====

  @Column({ default: true })
  isActive: boolean;
}

// ============================================================================
// HELPER CONSTANTS
// ============================================================================

/**
 * Labels для типов отчетов
 */
export const REPORT_TYPE_LABELS: Record<ReportType, { ru: string; uz: string; icon: string }> = {
  [ReportType.SALES_SUMMARY]: { ru: 'Сводка продаж', uz: 'Savdo xulosasi', icon: '📊' },
  [ReportType.SALES_BY_MACHINE]: { ru: 'Продажи по автоматам', uz: 'Avtomatlar bo\'yicha savdo', icon: '🤖' },
  [ReportType.SALES_BY_PRODUCT]: { ru: 'Продажи по продуктам', uz: 'Mahsulotlar bo\'yicha savdo', icon: '📦' },
  [ReportType.SALES_BY_LOCATION]: { ru: 'Продажи по локациям', uz: 'Lokatsiyalar bo\'yicha savdo', icon: '📍' },
  [ReportType.SALES_BY_PERIOD]: { ru: 'Продажи по периодам', uz: 'Davrlar bo\'yicha savdo', icon: '📅' },
  [ReportType.SALES_TREND]: { ru: 'Тренд продаж', uz: 'Savdo trendi', icon: '📈' },
  [ReportType.MACHINE_PERFORMANCE]: { ru: 'Производительность автоматов', uz: 'Avtomatlar samaradorligi', icon: '⚡' },
  [ReportType.MACHINE_UPTIME]: { ru: 'Время работы', uz: 'Ishlash vaqti', icon: '⏱️' },
  [ReportType.MACHINE_ERRORS]: { ru: 'Ошибки автоматов', uz: 'Avtomat xatolari', icon: '❌' },
  [ReportType.MACHINE_MAINTENANCE]: { ru: 'Техобслуживание', uz: 'Texnik xizmat', icon: '🔧' },
  [ReportType.INVENTORY_LEVELS]: { ru: 'Уровни запасов', uz: 'Zaxira darajalari', icon: '📦' },
  [ReportType.INVENTORY_MOVEMENT]: { ru: 'Движение товаров', uz: 'Tovar harakati', icon: '🔄' },
  [ReportType.INVENTORY_EXPIRY]: { ru: 'Сроки годности', uz: 'Yaroqlilik muddati', icon: '⏳' },
  [ReportType.STOCK_OUT]: { ru: 'Дефициты', uz: 'Yetishmovchilik', icon: '🚫' },
  [ReportType.REVENUE_REPORT]: { ru: 'Отчет по выручке', uz: 'Daromad hisoboti', icon: '💰' },
  [ReportType.COLLECTION_REPORT]: { ru: 'Отчет по инкассации', uz: 'Inkassatsiya hisoboti', icon: '💵' },
  [ReportType.PROFIT_LOSS]: { ru: 'Прибыль и убытки', uz: 'Foyda va zarar', icon: '📉' },
  [ReportType.COMMISSION_REPORT]: { ru: 'Отчет по комиссиям', uz: 'Komissiya hisoboti', icon: '💳' },
  [ReportType.CONTRACT_PAYMENTS]: { ru: 'Платежи по контрактам', uz: 'Shartnoma to\'lovlari', icon: '📄' },
  [ReportType.TASK_REPORT]: { ru: 'Отчет по задачам', uz: 'Vazifalar hisoboti', icon: '📋' },
  [ReportType.OPERATOR_PERFORMANCE]: { ru: 'Производительность операторов', uz: 'Operatorlar samaradorligi', icon: '👷' },
  [ReportType.ROUTE_EFFICIENCY]: { ru: 'Эффективность маршрутов', uz: 'Yo\'nalishlar samaradorligi', icon: '🛣️' },
  [ReportType.COMPLAINT_REPORT]: { ru: 'Отчет по жалобам', uz: 'Shikoyatlar hisoboti', icon: '📨' },
  [ReportType.COMPLAINT_SLA]: { ru: 'SLA по жалобам', uz: 'Shikoyatlar SLA', icon: '⏰' },
  [ReportType.CUSTOMER_SATISFACTION]: { ru: 'Удовлетворенность клиентов', uz: 'Mijozlar qoniqishi', icon: '😊' },
  [ReportType.LOCATION_PERFORMANCE]: { ru: 'Производительность локаций', uz: 'Lokatsiyalar samaradorligi', icon: '📍' },
  [ReportType.LOCATION_COMPARISON]: { ru: 'Сравнение локаций', uz: 'Lokatsiyalar taqqoslash', icon: '⚖️' },
  [ReportType.CUSTOM]: { ru: 'Кастомный отчет', uz: 'Maxsus hisobot', icon: '📝' },
  [ReportType.DASHBOARD]: { ru: 'Дашборд', uz: 'Dashboard', icon: '📊' },
};

/**
 * Labels для категорий
 */
export const REPORT_CATEGORY_LABELS: Record<ReportCategory, { ru: string; uz: string }> = {
  [ReportCategory.SALES]: { ru: 'Продажи', uz: 'Savdo' },
  [ReportCategory.MACHINES]: { ru: 'Автоматы', uz: 'Avtomatlar' },
  [ReportCategory.INVENTORY]: { ru: 'Инвентарь', uz: 'Inventar' },
  [ReportCategory.FINANCE]: { ru: 'Финансы', uz: 'Moliya' },
  [ReportCategory.OPERATIONS]: { ru: 'Операции', uz: 'Operatsiyalar' },
  [ReportCategory.COMPLAINTS]: { ru: 'Жалобы', uz: 'Shikoyatlar' },
  [ReportCategory.LOCATIONS]: { ru: 'Локации', uz: 'Lokatsiyalar' },
  [ReportCategory.ANALYTICS]: { ru: 'Аналитика', uz: 'Tahlil' },
  [ReportCategory.CUSTOM]: { ru: 'Кастомные', uz: 'Maxsus' },
};

/**
 * Labels для периодов
 */
export const PERIOD_TYPE_LABELS: Record<PeriodType, { ru: string; uz: string }> = {
  [PeriodType.TODAY]: { ru: 'Сегодня', uz: 'Bugun' },
  [PeriodType.YESTERDAY]: { ru: 'Вчера', uz: 'Kecha' },
  [PeriodType.THIS_WEEK]: { ru: 'Эта неделя', uz: 'Bu hafta' },
  [PeriodType.LAST_WEEK]: { ru: 'Прошлая неделя', uz: 'O\'tgan hafta' },
  [PeriodType.THIS_MONTH]: { ru: 'Этот месяц', uz: 'Bu oy' },
  [PeriodType.LAST_MONTH]: { ru: 'Прошлый месяц', uz: 'O\'tgan oy' },
  [PeriodType.THIS_QUARTER]: { ru: 'Этот квартал', uz: 'Bu chorak' },
  [PeriodType.LAST_QUARTER]: { ru: 'Прошлый квартал', uz: 'O\'tgan chorak' },
  [PeriodType.THIS_YEAR]: { ru: 'Этот год', uz: 'Bu yil' },
  [PeriodType.LAST_YEAR]: { ru: 'Прошлый год', uz: 'O\'tgan yil' },
  [PeriodType.LAST_7_DAYS]: { ru: 'Последние 7 дней', uz: 'Oxirgi 7 kun' },
  [PeriodType.LAST_30_DAYS]: { ru: 'Последние 30 дней', uz: 'Oxirgi 30 kun' },
  [PeriodType.LAST_90_DAYS]: { ru: 'Последние 90 дней', uz: 'Oxirgi 90 kun' },
  [PeriodType.CUSTOM]: { ru: 'Произвольный период', uz: 'Maxsus davr' },
};

/**
 * Labels для форматов экспорта
 */
export const EXPORT_FORMAT_LABELS: Record<ExportFormat, { ru: string; uz: string; icon: string; mimeType: string }> = {
  [ExportFormat.PDF]: { ru: 'PDF', uz: 'PDF', icon: '📄', mimeType: 'application/pdf' },
  [ExportFormat.EXCEL]: { ru: 'Excel', uz: 'Excel', icon: '📊', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  [ExportFormat.CSV]: { ru: 'CSV', uz: 'CSV', icon: '📝', mimeType: 'text/csv' },
  [ExportFormat.JSON]: { ru: 'JSON', uz: 'JSON', icon: '{}', mimeType: 'application/json' },
  [ExportFormat.HTML]: { ru: 'HTML', uz: 'HTML', icon: '🌐', mimeType: 'text/html' },
};
