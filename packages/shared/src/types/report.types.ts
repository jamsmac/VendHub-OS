/**
 * Report Types for VendHub OS
 * Reporting and analytics system
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ReportType {
  // Sales
  SALES_SUMMARY = "sales_summary",
  SALES_BY_PRODUCT = "sales_by_product",
  SALES_BY_MACHINE = "sales_by_machine",
  SALES_BY_LOCATION = "sales_by_location",
  SALES_BY_PERIOD = "sales_by_period",
  SALES_COMPARISON = "sales_comparison",

  // Machine
  MACHINE_PERFORMANCE = "machine_performance",
  MACHINE_UPTIME = "machine_uptime",
  MACHINE_ERRORS = "machine_errors",
  MACHINE_MAINTENANCE = "machine_maintenance",

  // Inventory
  INVENTORY_LEVELS = "inventory_levels",
  INVENTORY_MOVEMENTS = "inventory_movements",
  INVENTORY_TURNOVER = "inventory_turnover",
  INVENTORY_EXPIRATION = "inventory_expiration",
  INVENTORY_VALUATION = "inventory_valuation",

  // Financial
  REVENUE_REPORT = "revenue_report",
  PROFIT_LOSS = "profit_loss",
  CASH_FLOW = "cash_flow",
  TAX_REPORT = "tax_report",
  PAYMENT_METHODS = "payment_methods",

  // Operations
  TASK_REPORT = "task_report",
  COMPLAINT_REPORT = "complaint_report",
  ROUTE_EFFICIENCY = "route_efficiency",
  OPERATOR_PERFORMANCE = "operator_performance",

  // Custom
  CUSTOM = "custom",
}

export enum ReportCategory {
  SALES = "sales",
  MACHINES = "machines",
  INVENTORY = "inventory",
  FINANCIAL = "financial",
  OPERATIONS = "operations",
  ANALYTICS = "analytics",
}

export enum ReportFormat {
  PDF = "pdf",
  EXCEL = "excel",
  CSV = "csv",
  JSON = "json",
  HTML = "html",
}

export enum ReportStatus {
  DRAFT = "draft",
  PENDING = "pending",
  GENERATING = "generating",
  COMPLETED = "completed",
  FAILED = "failed",
  EXPIRED = "expired",
}

export enum ScheduleFrequency {
  ONCE = "once",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export enum WidgetType {
  NUMBER = "number",
  CHART_LINE = "chart_line",
  CHART_BAR = "chart_bar",
  CHART_PIE = "chart_pie",
  CHART_DONUT = "chart_donut",
  CHART_AREA = "chart_area",
  TABLE = "table",
  MAP = "map",
  GAUGE = "gauge",
  TREND = "trend",
  LIST = "list",
  HEATMAP = "heatmap",
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IReportDefinition {
  id: string;
  organizationId?: string;
  code: string;
  name: string;
  description?: string;

  type: ReportType;
  category: ReportCategory;

  // Configuration
  parameters?: IReportParameter[];
  defaultFilters?: Record<string, unknown>;
  availableFormats: ReportFormat[];

  // SQL/Query
  queryTemplate?: string;
  dataSourceType?: "sql" | "api" | "aggregation";

  // Layout
  sections?: IReportSection[];
  headerTemplate?: string;
  footerTemplate?: string;

  // Permissions
  allowedRoles?: string[];
  isPublic: boolean;
  isSystem: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface IReportParameter {
  name: string;
  label: { ru: string; uz: string };
  type:
    | "string"
    | "number"
    | "date"
    | "daterange"
    | "select"
    | "multiselect"
    | "boolean";
  required: boolean;
  defaultValue?: unknown;
  options?: { value: unknown; label: { ru: string; uz: string } }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface IReportSection {
  id: string;
  name: string;
  type: "text" | "table" | "chart" | "summary";
  order: number;
  config: Record<string, unknown>;
}

export interface IScheduledReport {
  id: string;
  organizationId: string;
  reportDefinitionId: string;
  name: string;

  // Schedule
  frequency: ScheduleFrequency;
  scheduleConfig: {
    time?: string; // HH:mm
    dayOfWeek?: number; // 0-6
    dayOfMonth?: number; // 1-31
    month?: number; // 1-12
    timezone?: string;
  };
  nextRunAt?: Date;
  lastRunAt?: Date;

  // Parameters
  parameters: Record<string, unknown>;
  format: ReportFormat;

  // Delivery
  deliveryMethod: "email" | "telegram" | "storage" | "webhook";
  deliveryConfig: {
    emails?: string[];
    telegramChatIds?: string[];
    storagePath?: string;
    webhookUrl?: string;
  };

  // Status
  isActive: boolean;
  runCount: number;
  failCount: number;
  lastError?: string;

  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGeneratedReport {
  id: string;
  organizationId: string;
  reportDefinitionId?: string;
  scheduledReportId?: string;
  name: string;

  // Generation info
  type: ReportType;
  format: ReportFormat;
  parameters: Record<string, unknown>;
  dateFrom?: Date;
  dateTo?: Date;

  // File
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  checksum?: string;

  // Status
  status: ReportStatus;
  errorMessage?: string;
  generationDurationMs?: number;

  // Metadata
  rowCount?: number;
  summary?: Record<string, unknown>;

  generatedById?: string;
  generatedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface IDashboard {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  slug?: string;

  // Layout
  layout: "grid" | "freeform";
  columns?: number;
  rowHeight?: number;

  // Widgets
  widgets: IDashboardWidget[];

  // Settings
  refreshInterval?: number; // seconds
  dateRangeDefault?: string; // 'today', 'week', 'month', 'custom'

  // Permissions
  isPublic: boolean;
  isDefault: boolean;
  allowedRoles?: string[];
  viewCount: number;

  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDashboardWidget {
  id: string;
  dashboardId: string;
  name: string;
  type: WidgetType;

  // Position (grid layout)
  x: number;
  y: number;
  width: number;
  height: number;

  // Data source
  dataSource: {
    type: "query" | "api" | "static";
    query?: string;
    endpoint?: string;
    data?: unknown;
    refreshInterval?: number;
  };

  // Configuration
  config: {
    // Chart config
    xAxis?: string;
    yAxis?: string;
    series?: string[];
    colors?: string[];
    showLegend?: boolean;

    // Number config
    format?: string;
    prefix?: string;
    suffix?: string;
    comparison?: "previous_period" | "previous_year";

    // Table config
    columns?: { key: string; label: string; format?: string }[];
    sortable?: boolean;
    pagination?: boolean;

    // General
    title?: string;
    subtitle?: string;
    icon?: string;
    thresholds?: { value: number; color: string }[];
  };

  isVisible: boolean;
  order: number;
}

export interface ISavedReportFilter {
  id: string;
  organizationId: string;
  userId: string;
  reportDefinitionId: string;
  name: string;
  filters: Record<string, unknown>;
  isDefault: boolean;
  createdAt: Date;
}

// ============================================================================
// CREATE DTOs
// ============================================================================

export interface IGenerateReportDto {
  reportDefinitionId?: string;
  type?: ReportType;
  name?: string;
  format: ReportFormat;
  parameters?: Record<string, unknown>;
  dateFrom?: Date;
  dateTo?: Date;
  delivery?: {
    method: "download" | "email" | "storage";
    emails?: string[];
    storagePath?: string;
  };
}

export interface ICreateDashboardDto {
  name: string;
  description?: string;
  layout?: "grid" | "freeform";
  columns?: number;
  isPublic?: boolean;
  widgets?: Omit<IDashboardWidget, "id" | "dashboardId">[];
}

export interface ICreateWidgetDto {
  dashboardId: string;
  name: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  dataSource: IDashboardWidget["dataSource"];
  config: IDashboardWidget["config"];
}

// ============================================================================
// LABELS
// ============================================================================

export const REPORT_TYPE_LABELS: Record<
  ReportType,
  { ru: string; uz: string }
> = {
  [ReportType.SALES_SUMMARY]: { ru: "Сводка продаж", uz: "Sotuvlar xulosasi" },
  [ReportType.SALES_BY_PRODUCT]: {
    ru: "Продажи по товарам",
    uz: "Mahsulotlar bo'yicha sotuvlar",
  },
  [ReportType.SALES_BY_MACHINE]: {
    ru: "Продажи по автоматам",
    uz: "Avtomatlar bo'yicha sotuvlar",
  },
  [ReportType.SALES_BY_LOCATION]: {
    ru: "Продажи по локациям",
    uz: "Joylashuvlar bo'yicha sotuvlar",
  },
  [ReportType.SALES_BY_PERIOD]: {
    ru: "Продажи по периодам",
    uz: "Davrlar bo'yicha sotuvlar",
  },
  [ReportType.SALES_COMPARISON]: {
    ru: "Сравнение продаж",
    uz: "Sotuvlarni taqqoslash",
  },
  [ReportType.MACHINE_PERFORMANCE]: {
    ru: "Эффективность автоматов",
    uz: "Avtomatlar samaradorligi",
  },
  [ReportType.MACHINE_UPTIME]: {
    ru: "Время работы автоматов",
    uz: "Avtomatlar ish vaqti",
  },
  [ReportType.MACHINE_ERRORS]: {
    ru: "Ошибки автоматов",
    uz: "Avtomat xatolari",
  },
  [ReportType.MACHINE_MAINTENANCE]: {
    ru: "Обслуживание автоматов",
    uz: "Avtomatlarni texnik xizmati",
  },
  [ReportType.INVENTORY_LEVELS]: {
    ru: "Уровни запасов",
    uz: "Zaxira darajalari",
  },
  [ReportType.INVENTORY_MOVEMENTS]: {
    ru: "Движение запасов",
    uz: "Zaxiralar harakati",
  },
  [ReportType.INVENTORY_TURNOVER]: {
    ru: "Оборачиваемость запасов",
    uz: "Zaxiralar aylanmasi",
  },
  [ReportType.INVENTORY_EXPIRATION]: {
    ru: "Сроки годности",
    uz: "Yaroqlilik muddatlari",
  },
  [ReportType.INVENTORY_VALUATION]: {
    ru: "Оценка запасов",
    uz: "Zaxiralarni baholash",
  },
  [ReportType.REVENUE_REPORT]: {
    ru: "Отчет о выручке",
    uz: "Daromad hisoboti",
  },
  [ReportType.PROFIT_LOSS]: { ru: "Прибыли и убытки", uz: "Foyda va zararlar" },
  [ReportType.CASH_FLOW]: { ru: "Движение денежных средств", uz: "Pul oqimi" },
  [ReportType.TAX_REPORT]: { ru: "Налоговый отчет", uz: "Soliq hisoboti" },
  [ReportType.PAYMENT_METHODS]: { ru: "Способы оплаты", uz: "To'lov usullari" },
  [ReportType.TASK_REPORT]: {
    ru: "Отчет по задачам",
    uz: "Vazifalar hisoboti",
  },
  [ReportType.COMPLAINT_REPORT]: {
    ru: "Отчет по жалобам",
    uz: "Shikoyatlar hisoboti",
  },
  [ReportType.ROUTE_EFFICIENCY]: {
    ru: "Эффективность маршрутов",
    uz: "Marshrutlar samaradorligi",
  },
  [ReportType.OPERATOR_PERFORMANCE]: {
    ru: "Эффективность операторов",
    uz: "Operatorlar samaradorligi",
  },
  [ReportType.CUSTOM]: { ru: "Пользовательский", uz: "Maxsus" },
};

export const REPORT_CATEGORY_LABELS: Record<
  ReportCategory,
  { ru: string; uz: string }
> = {
  [ReportCategory.SALES]: { ru: "Продажи", uz: "Sotuvlar" },
  [ReportCategory.MACHINES]: { ru: "Автоматы", uz: "Avtomatlar" },
  [ReportCategory.INVENTORY]: { ru: "Запасы", uz: "Zaxiralar" },
  [ReportCategory.FINANCIAL]: { ru: "Финансы", uz: "Moliya" },
  [ReportCategory.OPERATIONS]: { ru: "Операции", uz: "Operatsiyalar" },
  [ReportCategory.ANALYTICS]: { ru: "Аналитика", uz: "Analitika" },
};

export const REPORT_FORMAT_LABELS: Record<
  ReportFormat,
  { ru: string; uz: string }
> = {
  [ReportFormat.PDF]: { ru: "PDF", uz: "PDF" },
  [ReportFormat.EXCEL]: { ru: "Excel", uz: "Excel" },
  [ReportFormat.CSV]: { ru: "CSV", uz: "CSV" },
  [ReportFormat.JSON]: { ru: "JSON", uz: "JSON" },
  [ReportFormat.HTML]: { ru: "HTML", uz: "HTML" },
};

export const SCHEDULE_FREQUENCY_LABELS: Record<
  ScheduleFrequency,
  { ru: string; uz: string }
> = {
  [ScheduleFrequency.ONCE]: { ru: "Однократно", uz: "Bir marta" },
  [ScheduleFrequency.DAILY]: { ru: "Ежедневно", uz: "Har kuni" },
  [ScheduleFrequency.WEEKLY]: { ru: "Еженедельно", uz: "Har hafta" },
  [ScheduleFrequency.MONTHLY]: { ru: "Ежемесячно", uz: "Har oy" },
  [ScheduleFrequency.QUARTERLY]: { ru: "Ежеквартально", uz: "Har chorak" },
  [ScheduleFrequency.YEARLY]: { ru: "Ежегодно", uz: "Har yil" },
};

export const WIDGET_TYPE_LABELS: Record<
  WidgetType,
  { ru: string; uz: string }
> = {
  [WidgetType.NUMBER]: { ru: "Число", uz: "Raqam" },
  [WidgetType.CHART_LINE]: { ru: "Линейный график", uz: "Chiziqli grafik" },
  [WidgetType.CHART_BAR]: {
    ru: "Столбчатая диаграмма",
    uz: "Ustunli diagramma",
  },
  [WidgetType.CHART_PIE]: { ru: "Круговая диаграмма", uz: "Dumaloq diagramma" },
  [WidgetType.CHART_DONUT]: {
    ru: "Кольцевая диаграмма",
    uz: "Halqa diagramma",
  },
  [WidgetType.CHART_AREA]: {
    ru: "Диаграмма с областями",
    uz: "Maydonli diagramma",
  },
  [WidgetType.TABLE]: { ru: "Таблица", uz: "Jadval" },
  [WidgetType.MAP]: { ru: "Карта", uz: "Xarita" },
  [WidgetType.GAUGE]: { ru: "Индикатор", uz: "Indikator" },
  [WidgetType.TREND]: { ru: "Тренд", uz: "Trend" },
  [WidgetType.LIST]: { ru: "Список", uz: "Ro'yxat" },
  [WidgetType.HEATMAP]: { ru: "Тепловая карта", uz: "Issiqlik xaritasi" },
};

// ============================================================================
// ICONS
// ============================================================================

export const REPORT_CATEGORY_ICONS: Record<ReportCategory, string> = {
  [ReportCategory.SALES]: "💰",
  [ReportCategory.MACHINES]: "🤖",
  [ReportCategory.INVENTORY]: "📦",
  [ReportCategory.FINANCIAL]: "📊",
  [ReportCategory.OPERATIONS]: "⚙️",
  [ReportCategory.ANALYTICS]: "📈",
};

export const WIDGET_TYPE_ICONS: Record<WidgetType, string> = {
  [WidgetType.NUMBER]: "🔢",
  [WidgetType.CHART_LINE]: "📈",
  [WidgetType.CHART_BAR]: "📊",
  [WidgetType.CHART_PIE]: "🥧",
  [WidgetType.CHART_DONUT]: "🍩",
  [WidgetType.CHART_AREA]: "📉",
  [WidgetType.TABLE]: "📋",
  [WidgetType.MAP]: "🗺️",
  [WidgetType.GAUGE]: "⏱️",
  [WidgetType.TREND]: "📈",
  [WidgetType.LIST]: "📝",
  [WidgetType.HEATMAP]: "🌡️",
};
