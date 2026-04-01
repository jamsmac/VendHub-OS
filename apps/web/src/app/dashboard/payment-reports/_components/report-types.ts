export type ReportType =
  | "PAYME"
  | "CLICK"
  | "VENDHUB_ORDERS"
  | "VENDHUB_CSV"
  | "KASSA_FISCAL"
  | "UNKNOWN";

export type UploadStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "DUPLICATE";

export interface ReportUpload {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  reportType: ReportType;
  detectionConfidence: number;
  status: UploadStatus;
  errorMessage?: string;
  reportMeta?: Record<string, unknown>;
  periodFrom?: string;
  periodTo?: string;
  totalRows: number;
  processedRows: number;
  newRows: number;
  duplicateRows: number;
  totalAmount?: number;
  currency: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Import tracking (Phase 1)
  importedRows?: number;
  importErrors?: number;
  importedAt?: string;
  importedBy?: string;
}

export interface ReportRow {
  id: string;
  uploadId: string;
  reportType: ReportType;
  rowIndex: number;
  externalId?: string;
  orderNumber?: string;
  paymentTime?: string;
  amount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
  cardNumber?: string;
  clientPhone?: string;
  goodsName?: string;
  machineCode?: string;
  location?: string;
  rawData: Record<string, unknown>;
  isDuplicate: boolean;
  createdAt: string;
}

export interface PaginatedRows {
  data: ReportRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RowFilters {
  paymentMethods: string[];
  paymentStatuses: string[];
}

export interface ReconcileResult {
  uploadA: { id: string; type: ReportType; fileName: string };
  uploadB: { id: string; type: ReportType; fileName: string };
  summary: {
    totalA: number;
    totalB: number;
    matched: number;
    mismatched: number;
    onlyInA: number;
    onlyInB: number;
  };
  mismatched: {
    orderNumber: string;
    amountA: number;
    amountB: number;
    diff: number;
  }[];
  onlyInA: ReportRow[];
  onlyInB: ReportRow[];
}

// ─────────────────────────────────────────────
// UI конфиги для типов отчётов
// ─────────────────────────────────────────────

export const REPORT_TYPE_CONFIG: Record<
  ReportType,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  PAYME: {
    label: "Payme",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: "💳",
  },
  CLICK: {
    label: "Click",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: "⚡",
  },
  VENDHUB_ORDERS: {
    label: "VendHub Заказы",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
    icon: "📦",
  },
  VENDHUB_CSV: {
    label: "VendHub CSV",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
    icon: "📊",
  },
  KASSA_FISCAL: {
    label: "Касса",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: "🧾",
  },
  UNKNOWN: {
    label: "Неизвестный",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: "❓",
  },
};

export const UPLOAD_STATUS_CONFIG: Record<
  UploadStatus,
  { label: string; color: string; bgColor: string }
> = {
  PENDING: {
    label: "Ожидание",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  PROCESSING: {
    label: "Обработка...",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  COMPLETED: {
    label: "Завершено",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  FAILED: { label: "Ошибка", color: "text-red-700", bgColor: "bg-red-100" },
  DUPLICATE: {
    label: "Дубликат",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
};

// Колонки для каждого типа отчёта
export const REPORT_COLUMNS: Record<
  ReportType,
  { key: keyof ReportRow; label: string; sortable?: boolean }[]
> = {
  PAYME: [
    { key: "paymentTime", label: "Время оплаты", sortable: true },
    { key: "amount", label: "Сумма (UZS)", sortable: true },
    { key: "paymentMethod", label: "Процессинг", sortable: true },
    { key: "paymentStatus", label: "Статус", sortable: true },
    { key: "cardNumber", label: "Карта" },
    { key: "location", label: "Касса" },
    { key: "orderNumber", label: "№ Заказа", sortable: true },
    { key: "externalId", label: "ID платежа" },
  ],
  CLICK: [
    { key: "paymentTime", label: "Дата", sortable: true },
    { key: "amount", label: "Сумма", sortable: true },
    { key: "paymentMethod", label: "Способ оплаты" },
    { key: "paymentStatus", label: "Статус", sortable: true },
    { key: "clientPhone", label: "Клиент" },
    { key: "externalId", label: "Click ID" },
    { key: "orderNumber", label: "Идент-р" },
  ],
  VENDHUB_ORDERS: [
    { key: "paymentTime", label: "Время оплаты", sortable: true },
    { key: "goodsName", label: "Товар", sortable: true },
    { key: "amount", label: "Цена", sortable: true },
    { key: "paymentStatus", label: "Статус", sortable: true },
    { key: "paymentMethod", label: "Ресурс", sortable: true },
    { key: "machineCode", label: "Машина", sortable: true },
    { key: "location", label: "Адрес" },
    { key: "orderNumber", label: "№ Заказа" },
  ],
  VENDHUB_CSV: [
    { key: "paymentTime", label: "Время", sortable: true },
    { key: "goodsName", label: "Товар", sortable: true },
    { key: "amount", label: "Цена", sortable: true },
    { key: "paymentMethod", label: "Оплата", sortable: true },
    { key: "machineCode", label: "Машина", sortable: true },
    { key: "location", label: "Категория" },
    { key: "orderNumber", label: "№ Заказа" },
  ],
  KASSA_FISCAL: [
    { key: "paymentTime", label: "Дата и время", sortable: true },
    { key: "paymentStatus", label: "Операция", sortable: true },
    { key: "amount", label: "Сумма операции", sortable: true },
    { key: "paymentMethod", label: "Способ" },
    { key: "externalId", label: "№ Чека" },
    { key: "location", label: "Торговый пункт" },
  ],
  UNKNOWN: [
    { key: "rowIndex", label: "№ строки" },
    { key: "paymentTime", label: "Дата" },
    { key: "amount", label: "Сумма" },
  ],
};

export function formatAmount(amount?: number, currency = "UZS"): string {
  if (amount === undefined || amount === null) return "—";
  return (
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(
      amount,
    ) +
    " " +
    currency
  );
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
