/**
 * Report Constants
 * i18n labels для типов, категорий, периодов и форматов отчетов
 */

import {
  ReportType,
  ReportCategory,
  PeriodType,
  ExportFormat,
} from "./report.enums";

/**
 * Labels для типов отчетов
 */
export const REPORT_TYPE_LABELS: Record<
  ReportType,
  { ru: string; uz: string; icon: string }
> = {
  [ReportType.SALES_SUMMARY]: {
    ru: "Сводка продаж",
    uz: "Savdo xulosasi",
    icon: "📊",
  },
  [ReportType.SALES_BY_MACHINE]: {
    ru: "Продажи по автоматам",
    uz: "Avtomatlar bo'yicha savdo",
    icon: "🤖",
  },
  [ReportType.SALES_BY_PRODUCT]: {
    ru: "Продажи по продуктам",
    uz: "Mahsulotlar bo'yicha savdo",
    icon: "📦",
  },
  [ReportType.SALES_BY_LOCATION]: {
    ru: "Продажи по локациям",
    uz: "Lokatsiyalar bo'yicha savdo",
    icon: "📍",
  },
  [ReportType.SALES_BY_PERIOD]: {
    ru: "Продажи по периодам",
    uz: "Davrlar bo'yicha savdo",
    icon: "📅",
  },
  [ReportType.SALES_TREND]: {
    ru: "Тренд продаж",
    uz: "Savdo trendi",
    icon: "📈",
  },
  [ReportType.MACHINE_PERFORMANCE]: {
    ru: "Производительность автоматов",
    uz: "Avtomatlar samaradorligi",
    icon: "⚡",
  },
  [ReportType.MACHINE_UPTIME]: {
    ru: "Время работы",
    uz: "Ishlash vaqti",
    icon: "⏱️",
  },
  [ReportType.MACHINE_ERRORS]: {
    ru: "Ошибки автоматов",
    uz: "Avtomat xatolari",
    icon: "❌",
  },
  [ReportType.MACHINE_MAINTENANCE]: {
    ru: "Техобслуживание",
    uz: "Texnik xizmat",
    icon: "🔧",
  },
  [ReportType.INVENTORY_LEVELS]: {
    ru: "Уровни запасов",
    uz: "Zaxira darajalari",
    icon: "📦",
  },
  [ReportType.INVENTORY_MOVEMENT]: {
    ru: "Движение товаров",
    uz: "Tovar harakati",
    icon: "🔄",
  },
  [ReportType.INVENTORY_EXPIRY]: {
    ru: "Сроки годности",
    uz: "Yaroqlilik muddati",
    icon: "⏳",
  },
  [ReportType.STOCK_OUT]: { ru: "Дефициты", uz: "Yetishmovchilik", icon: "🚫" },
  [ReportType.REVENUE_REPORT]: {
    ru: "Отчет по выручке",
    uz: "Daromad hisoboti",
    icon: "💰",
  },
  [ReportType.COLLECTION_REPORT]: {
    ru: "Отчет по инкассации",
    uz: "Inkassatsiya hisoboti",
    icon: "💵",
  },
  [ReportType.PROFIT_LOSS]: {
    ru: "Прибыль и убытки",
    uz: "Foyda va zarar",
    icon: "📉",
  },
  [ReportType.COMMISSION_REPORT]: {
    ru: "Отчет по комиссиям",
    uz: "Komissiya hisoboti",
    icon: "💳",
  },
  [ReportType.CONTRACT_PAYMENTS]: {
    ru: "Платежи по контрактам",
    uz: "Shartnoma to'lovlari",
    icon: "📄",
  },
  [ReportType.TASK_REPORT]: {
    ru: "Отчет по задачам",
    uz: "Vazifalar hisoboti",
    icon: "📋",
  },
  [ReportType.OPERATOR_PERFORMANCE]: {
    ru: "Производительность операторов",
    uz: "Operatorlar samaradorligi",
    icon: "👷",
  },
  [ReportType.ROUTE_EFFICIENCY]: {
    ru: "Эффективность маршрутов",
    uz: "Yo'nalishlar samaradorligi",
    icon: "🛣️",
  },
  [ReportType.COMPLAINT_REPORT]: {
    ru: "Отчет по жалобам",
    uz: "Shikoyatlar hisoboti",
    icon: "📨",
  },
  [ReportType.COMPLAINT_SLA]: {
    ru: "SLA по жалобам",
    uz: "Shikoyatlar SLA",
    icon: "⏰",
  },
  [ReportType.CUSTOMER_SATISFACTION]: {
    ru: "Удовлетворенность клиентов",
    uz: "Mijozlar qoniqishi",
    icon: "😊",
  },
  [ReportType.LOCATION_PERFORMANCE]: {
    ru: "Производительность локаций",
    uz: "Lokatsiyalar samaradorligi",
    icon: "📍",
  },
  [ReportType.LOCATION_COMPARISON]: {
    ru: "Сравнение локаций",
    uz: "Lokatsiyalar taqqoslash",
    icon: "⚖️",
  },
  [ReportType.CUSTOM]: {
    ru: "Кастомный отчет",
    uz: "Maxsus hisobot",
    icon: "📝",
  },
  [ReportType.DASHBOARD]: { ru: "Дашборд", uz: "Dashboard", icon: "📊" },
};

/**
 * Labels для категорий
 */
export const REPORT_CATEGORY_LABELS: Record<
  ReportCategory,
  { ru: string; uz: string }
> = {
  [ReportCategory.SALES]: { ru: "Продажи", uz: "Savdo" },
  [ReportCategory.MACHINES]: { ru: "Автоматы", uz: "Avtomatlar" },
  [ReportCategory.INVENTORY]: { ru: "Инвентарь", uz: "Inventar" },
  [ReportCategory.FINANCE]: { ru: "Финансы", uz: "Moliya" },
  [ReportCategory.OPERATIONS]: { ru: "Операции", uz: "Operatsiyalar" },
  [ReportCategory.COMPLAINTS]: { ru: "Жалобы", uz: "Shikoyatlar" },
  [ReportCategory.LOCATIONS]: { ru: "Локации", uz: "Lokatsiyalar" },
  [ReportCategory.ANALYTICS]: { ru: "Аналитика", uz: "Tahlil" },
  [ReportCategory.CUSTOM]: { ru: "Кастомные", uz: "Maxsus" },
};

/**
 * Labels для периодов
 */
export const PERIOD_TYPE_LABELS: Record<
  PeriodType,
  { ru: string; uz: string }
> = {
  [PeriodType.TODAY]: { ru: "Сегодня", uz: "Bugun" },
  [PeriodType.YESTERDAY]: { ru: "Вчера", uz: "Kecha" },
  [PeriodType.THIS_WEEK]: { ru: "Эта неделя", uz: "Bu hafta" },
  [PeriodType.LAST_WEEK]: { ru: "Прошлая неделя", uz: "O'tgan hafta" },
  [PeriodType.THIS_MONTH]: { ru: "Этот месяц", uz: "Bu oy" },
  [PeriodType.LAST_MONTH]: { ru: "Прошлый месяц", uz: "O'tgan oy" },
  [PeriodType.THIS_QUARTER]: { ru: "Этот квартал", uz: "Bu chorak" },
  [PeriodType.LAST_QUARTER]: { ru: "Прошлый квартал", uz: "O'tgan chorak" },
  [PeriodType.THIS_YEAR]: { ru: "Этот год", uz: "Bu yil" },
  [PeriodType.LAST_YEAR]: { ru: "Прошлый год", uz: "O'tgan yil" },
  [PeriodType.LAST_7_DAYS]: { ru: "Последние 7 дней", uz: "Oxirgi 7 kun" },
  [PeriodType.LAST_30_DAYS]: { ru: "Последние 30 дней", uz: "Oxirgi 30 kun" },
  [PeriodType.LAST_90_DAYS]: { ru: "Последние 90 дней", uz: "Oxirgi 90 kun" },
  [PeriodType.CUSTOM]: { ru: "Произвольный период", uz: "Maxsus davr" },
};

/**
 * Labels для форматов экспорта
 */
export const EXPORT_FORMAT_LABELS: Record<
  ExportFormat,
  { ru: string; uz: string; icon: string; mimeType: string }
> = {
  [ExportFormat.PDF]: {
    ru: "PDF",
    uz: "PDF",
    icon: "📄",
    mimeType: "application/pdf",
  },
  [ExportFormat.EXCEL]: {
    ru: "Excel",
    uz: "Excel",
    icon: "📊",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  [ExportFormat.CSV]: {
    ru: "CSV",
    uz: "CSV",
    icon: "📝",
    mimeType: "text/csv",
  },
  [ExportFormat.JSON]: {
    ru: "JSON",
    uz: "JSON",
    icon: "{}",
    mimeType: "application/json",
  },
  [ExportFormat.HTML]: {
    ru: "HTML",
    uz: "HTML",
    icon: "🌐",
    mimeType: "text/html",
  },
};
