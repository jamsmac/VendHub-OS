/**
 * Report Enums
 * Перечисления для системы отчетов и аналитики
 */

/**
 * Тип отчета
 */
export enum ReportType {
  // Продажи
  SALES_SUMMARY = "sales_summary", // Сводка продаж
  SALES_BY_MACHINE = "sales_by_machine", // Продажи по автоматам
  SALES_BY_PRODUCT = "sales_by_product", // Продажи по продуктам
  SALES_BY_LOCATION = "sales_by_location", // Продажи по локациям
  SALES_BY_PERIOD = "sales_by_period", // Продажи по периодам
  SALES_TREND = "sales_trend", // Тренд продаж

  // Автоматы
  MACHINE_PERFORMANCE = "machine_performance", // Производительность автоматов
  MACHINE_UPTIME = "machine_uptime", // Время работы
  MACHINE_ERRORS = "machine_errors", // Ошибки автоматов
  MACHINE_MAINTENANCE = "machine_maintenance", // Техобслуживание

  // Инвентарь
  INVENTORY_LEVELS = "inventory_levels", // Уровни запасов
  INVENTORY_MOVEMENT = "inventory_movement", // Движение товаров
  INVENTORY_EXPIRY = "inventory_expiry", // Сроки годности
  STOCK_OUT = "stock_out", // Отчет о дефицитах

  // Финансы
  REVENUE_REPORT = "revenue_report", // Отчет по выручке
  COLLECTION_REPORT = "collection_report", // Отчет по инкассации
  PROFIT_LOSS = "profit_loss", // Прибыль и убытки
  COMMISSION_REPORT = "commission_report", // Отчет по комиссиям
  CONTRACT_PAYMENTS = "contract_payments", // Платежи по контрактам

  // Операции
  TASK_REPORT = "task_report", // Отчет по задачам
  OPERATOR_PERFORMANCE = "operator_performance", // Производительность операторов
  ROUTE_EFFICIENCY = "route_efficiency", // Эффективность маршрутов

  // Клиенты и жалобы
  COMPLAINT_REPORT = "complaint_report", // Отчет по жалобам
  COMPLAINT_SLA = "complaint_sla", // SLA по жалобам
  CUSTOMER_SATISFACTION = "customer_satisfaction", // Удовлетворенность клиентов

  // Локации
  LOCATION_PERFORMANCE = "location_performance", // Производительность локаций
  LOCATION_COMPARISON = "location_comparison", // Сравнение локаций

  // Кастомные
  CUSTOM = "custom", // Кастомный отчет
  DASHBOARD = "dashboard", // Дашборд
}

/**
 * Категория отчета
 */
export enum ReportCategory {
  SALES = "sales",
  MACHINES = "machines",
  INVENTORY = "inventory",
  FINANCE = "finance",
  OPERATIONS = "operations",
  COMPLAINTS = "complaints",
  LOCATIONS = "locations",
  ANALYTICS = "analytics",
  CUSTOM = "custom",
}

/**
 * Формат экспорта
 */
export enum ExportFormat {
  PDF = "pdf",
  EXCEL = "excel",
  CSV = "csv",
  JSON = "json",
  HTML = "html",
}

/**
 * Статус отчета
 */
export enum ReportStatus {
  DRAFT = "draft", // Черновик
  SCHEDULED = "scheduled", // Запланирован
  GENERATING = "generating", // Генерируется
  COMPLETED = "completed", // Готов
  FAILED = "failed", // Ошибка
  CANCELLED = "cancelled", // Отменен
  EXPIRED = "expired", // Истек срок хранения
}

/**
 * Частота генерации
 */
export enum ReportFrequency {
  ONCE = "once", // Однократно
  DAILY = "daily", // Ежедневно
  WEEKLY = "weekly", // Еженедельно
  MONTHLY = "monthly", // Ежемесячно
  QUARTERLY = "quarterly", // Ежеквартально
  YEARLY = "yearly", // Ежегодно
  CUSTOM = "custom", // Кастомный интервал
}

/**
 * Тип агрегации
 */
export enum AggregationType {
  SUM = "sum",
  AVG = "avg",
  COUNT = "count",
  MIN = "min",
  MAX = "max",
  FIRST = "first",
  LAST = "last",
}

/**
 * Тип периода
 */
export enum PeriodType {
  TODAY = "today",
  YESTERDAY = "yesterday",
  THIS_WEEK = "this_week",
  LAST_WEEK = "last_week",
  THIS_MONTH = "this_month",
  LAST_MONTH = "last_month",
  THIS_QUARTER = "this_quarter",
  LAST_QUARTER = "last_quarter",
  THIS_YEAR = "this_year",
  LAST_YEAR = "last_year",
  LAST_7_DAYS = "last_7_days",
  LAST_30_DAYS = "last_30_days",
  LAST_90_DAYS = "last_90_days",
  CUSTOM = "custom",
}

/**
 * Тип визуализации
 */
export enum ChartType {
  LINE = "line",
  BAR = "bar",
  PIE = "pie",
  DOUGHNUT = "doughnut",
  AREA = "area",
  SCATTER = "scatter",
  HEATMAP = "heatmap",
  TABLE = "table",
  KPI = "kpi",
  MAP = "map",
  FUNNEL = "funnel",
  GAUGE = "gauge",
}
