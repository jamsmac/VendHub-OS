/**
 * Complaint Types for VendHub OS
 * QR-code based complaint and support system
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ComplaintStatus {
  NEW = "new",
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  ASSIGNED = "assigned",
  INVESTIGATING = "investigating",
  AWAITING_CUSTOMER = "awaiting_customer",
  AWAITING_PARTS = "awaiting_parts",
  RESOLVED = "resolved",
  CLOSED = "closed",
  REJECTED = "rejected",
  DUPLICATE = "duplicate",
  ESCALATED = "escalated",
  REOPENED = "reopened",
}

export enum ComplaintPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum ComplaintCategory {
  // Machine issues
  MACHINE_NOT_WORKING = "machine_not_working",
  MACHINE_ERROR = "machine_error",
  MACHINE_DIRTY = "machine_dirty",
  // Payment issues
  PAYMENT_FAILED = "payment_failed",
  CARD_NOT_ACCEPTED = "card_not_accepted",
  CASH_NOT_ACCEPTED = "cash_not_accepted",
  NO_CHANGE = "no_change",
  DOUBLE_CHARGE = "double_charge",
  CHARGE_WITHOUT_PRODUCT = "charge_without_product",
  // Product issues
  PRODUCT_NOT_DISPENSED = "product_not_dispensed",
  PRODUCT_STUCK = "product_stuck",
  WRONG_PRODUCT = "wrong_product",
  PRODUCT_EXPIRED = "product_expired",
  PRODUCT_DAMAGED = "product_damaged",
  PRODUCT_QUALITY = "product_quality",
  PRODUCT_OUT_OF_STOCK = "product_out_of_stock",
  // Hygiene & safety
  HYGIENE_ISSUE = "hygiene_issue",
  SAFETY_CONCERN = "safety_concern",
  // Financial
  REFUND_REQUEST = "refund_request",
  // Feedback
  SUGGESTION = "suggestion",
  PRODUCT_REQUEST = "product_request",
  PRICE_FEEDBACK = "price_feedback",
  // Other
  OTHER = "other",
}

export enum ComplaintSource {
  QR_CODE = "qr_code",
  TELEGRAM_BOT = "telegram_bot",
  PHONE = "phone",
  EMAIL = "email",
  WEB_FORM = "web_form",
  MOBILE_APP = "mobile_app",
  INTERNAL = "internal",
}

export enum RefundStatus {
  PENDING = "pending",
  APPROVED = "approved",
  PROCESSING = "processing",
  COMPLETED = "completed",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

export enum RefundMethod {
  CASH = "cash",
  CARD = "card",
  PAYME = "payme",
  CLICK = "click",
  UZUM = "uzum",
  PRODUCT = "product",
  BONUS = "bonus",
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IComplaint {
  id: string;
  organizationId: string;
  machineId?: string;
  locationId?: string;
  transactionId?: string;
  assignedToId?: string;

  // Identification
  complaintNumber: string;

  // Customer info
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerTelegramId?: string;

  // Classification
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  source: ComplaintSource;

  // Content
  subject: string;
  description: string;
  attachments?: string[];

  // SLA
  slaDeadline?: Date;
  slaBreached: boolean;

  // Resolution
  resolution?: string;
  resolvedAt?: Date;
  resolvedById?: string;
  satisfactionRating?: number;
  feedbackComment?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export interface IComplaintComment {
  id: string;
  complaintId: string;
  userId?: string;
  isInternal: boolean;
  content: string;
  attachments?: string[];
  createdAt: Date;
}

export interface IComplaintAction {
  id: string;
  complaintId: string;
  performedById: string;
  actionType: string;
  oldStatus?: ComplaintStatus;
  newStatus?: ComplaintStatus;
  description?: string;
  createdAt: Date;
}

export interface IComplaintRefund {
  id: string;
  complaintId: string;
  transactionId?: string;
  amount: number;
  currency: string;
  method: RefundMethod;
  status: RefundStatus;
  reason: string;
  requestedById?: string;
  approvedById?: string;
  processedById?: string;
  processedAt?: Date;
  referenceNumber?: string;
  bankDetails?: Record<string, unknown>;
  createdAt: Date;
}

export interface IComplaintQrCode {
  id: string;
  organizationId: string;
  machineId: string;
  code: string;
  url: string;
  isActive: boolean;
  scanCount: number;
  lastScannedAt?: Date;
  createdAt: Date;
}

export interface IComplaintTemplate {
  id: string;
  organizationId: string;
  category: ComplaintCategory;
  name: string;
  titleTemplate: string;
  responseTemplate: string;
  autoAssignRole?: string;
  autoPriority?: ComplaintPriority;
  slaHours?: number;
  isActive: boolean;
}

// ============================================================================
// CREATE/UPDATE DTOs
// ============================================================================

export interface IComplaintCreate {
  organizationId: string;
  machineId?: string;
  transactionId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  category: ComplaintCategory;
  source: ComplaintSource;
  subject: string;
  description: string;
  attachments?: string[];
  priority?: ComplaintPriority;
}

export interface IComplaintUpdate {
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
  category?: ComplaintCategory;
  assignedToId?: string | null;
  subject?: string;
  description?: string;
  resolution?: string;
  tags?: string[];
}

export interface IRefundCreate {
  complaintId: string;
  transactionId?: string;
  amount: number;
  currency?: string;
  method: RefundMethod;
  reason: string;
  bankDetails?: Record<string, unknown>;
}

// ============================================================================
// LABELS (RU/UZ)
// ============================================================================

export const COMPLAINT_STATUS_LABELS: Record<
  ComplaintStatus,
  { ru: string; uz: string }
> = {
  [ComplaintStatus.NEW]: { ru: "Новая", uz: "Yangi" },
  [ComplaintStatus.PENDING]: { ru: "Ожидает", uz: "Kutmoqda" },
  [ComplaintStatus.IN_PROGRESS]: { ru: "В обработке", uz: "Jarayonda" },
  [ComplaintStatus.ASSIGNED]: { ru: "Назначена", uz: "Tayinlandi" },
  [ComplaintStatus.INVESTIGATING]: { ru: "Расследуется", uz: "Tekshirilmoqda" },
  [ComplaintStatus.AWAITING_CUSTOMER]: {
    ru: "Ожидает клиента",
    uz: "Mijozni kutmoqda",
  },
  [ComplaintStatus.AWAITING_PARTS]: {
    ru: "Ожидает запчасти",
    uz: "Ehtiyot qismlarni kutmoqda",
  },
  [ComplaintStatus.RESOLVED]: { ru: "Решена", uz: "Hal qilindi" },
  [ComplaintStatus.CLOSED]: { ru: "Закрыта", uz: "Yopildi" },
  [ComplaintStatus.REJECTED]: { ru: "Отклонена", uz: "Rad etildi" },
  [ComplaintStatus.DUPLICATE]: { ru: "Дубликат", uz: "Dublikat" },
  [ComplaintStatus.ESCALATED]: {
    ru: "Эскалирована",
    uz: "Escalatsiya qilindi",
  },
  [ComplaintStatus.REOPENED]: { ru: "Переоткрыта", uz: "Qayta ochildi" },
};

export const COMPLAINT_PRIORITY_LABELS: Record<
  ComplaintPriority,
  { ru: string; uz: string }
> = {
  [ComplaintPriority.LOW]: { ru: "Низкий", uz: "Past" },
  [ComplaintPriority.MEDIUM]: { ru: "Средний", uz: "O'rtacha" },
  [ComplaintPriority.HIGH]: { ru: "Высокий", uz: "Yuqori" },
  [ComplaintPriority.URGENT]: { ru: "Срочный", uz: "Shoshilinch" },
};

export const COMPLAINT_CATEGORY_LABELS: Record<
  ComplaintCategory,
  { ru: string; uz: string }
> = {
  [ComplaintCategory.MACHINE_NOT_WORKING]: {
    ru: "Автомат не работает",
    uz: "Avtomat ishlamayapti",
  },
  [ComplaintCategory.MACHINE_ERROR]: {
    ru: "Ошибка автомата",
    uz: "Avtomat xatosi",
  },
  [ComplaintCategory.MACHINE_DIRTY]: {
    ru: "Автомат грязный",
    uz: "Avtomat iflos",
  },
  [ComplaintCategory.PAYMENT_FAILED]: {
    ru: "Ошибка оплаты",
    uz: "To'lov xatosi",
  },
  [ComplaintCategory.CARD_NOT_ACCEPTED]: {
    ru: "Карта не принимается",
    uz: "Karta qabul qilinmadi",
  },
  [ComplaintCategory.CASH_NOT_ACCEPTED]: {
    ru: "Наличные не принимаются",
    uz: "Naqd qabul qilinmadi",
  },
  [ComplaintCategory.NO_CHANGE]: { ru: "Нет сдачи", uz: "Qaytim yo'q" },
  [ComplaintCategory.DOUBLE_CHARGE]: {
    ru: "Двойное списание",
    uz: "Ikki marta yechildi",
  },
  [ComplaintCategory.CHARGE_WITHOUT_PRODUCT]: {
    ru: "Списание без товара",
    uz: "Mahsulotsiz yechildi",
  },
  [ComplaintCategory.PRODUCT_NOT_DISPENSED]: {
    ru: "Товар не выдан",
    uz: "Mahsulot berilmadi",
  },
  [ComplaintCategory.PRODUCT_STUCK]: {
    ru: "Товар застрял",
    uz: "Mahsulot tiqilib qoldi",
  },
  [ComplaintCategory.WRONG_PRODUCT]: {
    ru: "Неверный товар",
    uz: "Noto'g'ri mahsulot",
  },
  [ComplaintCategory.PRODUCT_EXPIRED]: {
    ru: "Просроченный товар",
    uz: "Muddati o'tgan mahsulot",
  },
  [ComplaintCategory.PRODUCT_DAMAGED]: {
    ru: "Повреждённый товар",
    uz: "Shikastlangan mahsulot",
  },
  [ComplaintCategory.PRODUCT_QUALITY]: {
    ru: "Качество товара",
    uz: "Mahsulot sifati",
  },
  [ComplaintCategory.PRODUCT_OUT_OF_STOCK]: {
    ru: "Товар закончился",
    uz: "Mahsulot tugadi",
  },
  [ComplaintCategory.HYGIENE_ISSUE]: { ru: "Гигиена", uz: "Gigiena" },
  [ComplaintCategory.SAFETY_CONCERN]: { ru: "Безопасность", uz: "Xavfsizlik" },
  [ComplaintCategory.REFUND_REQUEST]: {
    ru: "Запрос возврата",
    uz: "Qaytarish so'rovi",
  },
  [ComplaintCategory.SUGGESTION]: { ru: "Предложение", uz: "Taklif" },
  [ComplaintCategory.PRODUCT_REQUEST]: {
    ru: "Запрос товара",
    uz: "Mahsulot so'rovi",
  },
  [ComplaintCategory.PRICE_FEEDBACK]: {
    ru: "Отзыв о цене",
    uz: "Narx haqida fikr",
  },
  [ComplaintCategory.OTHER]: { ru: "Другое", uz: "Boshqa" },
};

export const COMPLAINT_SOURCE_LABELS: Record<
  ComplaintSource,
  { ru: string; uz: string }
> = {
  [ComplaintSource.QR_CODE]: { ru: "QR-код", uz: "QR-kod" },
  [ComplaintSource.TELEGRAM_BOT]: { ru: "Telegram бот", uz: "Telegram bot" },
  [ComplaintSource.PHONE]: { ru: "Телефон", uz: "Telefon" },
  [ComplaintSource.EMAIL]: { ru: "Email", uz: "Email" },
  [ComplaintSource.WEB_FORM]: { ru: "Веб-форма", uz: "Veb-forma" },
  [ComplaintSource.MOBILE_APP]: {
    ru: "Мобильное приложение",
    uz: "Mobil ilova",
  },
  [ComplaintSource.INTERNAL]: { ru: "Внутренняя", uz: "Ichki" },
};

export const REFUND_STATUS_LABELS: Record<
  RefundStatus,
  { ru: string; uz: string }
> = {
  [RefundStatus.PENDING]: { ru: "Ожидает", uz: "Kutmoqda" },
  [RefundStatus.APPROVED]: { ru: "Одобрен", uz: "Tasdiqlandi" },
  [RefundStatus.PROCESSING]: { ru: "Обрабатывается", uz: "Jarayonda" },
  [RefundStatus.COMPLETED]: { ru: "Выполнен", uz: "Bajarildi" },
  [RefundStatus.REJECTED]: { ru: "Отклонен", uz: "Rad etildi" },
  [RefundStatus.CANCELLED]: { ru: "Отменен", uz: "Bekor qilindi" },
};

export const REFUND_METHOD_LABELS: Record<
  RefundMethod,
  { ru: string; uz: string }
> = {
  [RefundMethod.CASH]: { ru: "Наличные", uz: "Naqd" },
  [RefundMethod.CARD]: { ru: "Карта", uz: "Karta" },
  [RefundMethod.PAYME]: { ru: "Payme", uz: "Payme" },
  [RefundMethod.CLICK]: { ru: "Click", uz: "Click" },
  [RefundMethod.UZUM]: { ru: "Uzum", uz: "Uzum" },
  [RefundMethod.PRODUCT]: { ru: "Товаром", uz: "Mahsulot bilan" },
  [RefundMethod.BONUS]: { ru: "Бонусами", uz: "Bonus bilan" },
};

// ============================================================================
// SLA CONFIGURATION
// ============================================================================

export const DEFAULT_SLA_HOURS: Record<ComplaintPriority, number> = {
  [ComplaintPriority.LOW]: 72, // 3 days
  [ComplaintPriority.MEDIUM]: 24, // 1 day
  [ComplaintPriority.HIGH]: 8, // 8 hours
  [ComplaintPriority.URGENT]: 2, // 2 hours
};

// ============================================================================
// ICONS
// ============================================================================

export const COMPLAINT_STATUS_ICONS: Record<ComplaintStatus, string> = {
  [ComplaintStatus.NEW]: "🆕",
  [ComplaintStatus.PENDING]: "⏳",
  [ComplaintStatus.IN_PROGRESS]: "🔄",
  [ComplaintStatus.ASSIGNED]: "👤",
  [ComplaintStatus.INVESTIGATING]: "🔍",
  [ComplaintStatus.AWAITING_CUSTOMER]: "⏳",
  [ComplaintStatus.AWAITING_PARTS]: "🔧",
  [ComplaintStatus.RESOLVED]: "✅",
  [ComplaintStatus.CLOSED]: "📁",
  [ComplaintStatus.REJECTED]: "❌",
  [ComplaintStatus.DUPLICATE]: "📋",
  [ComplaintStatus.ESCALATED]: "⚠️",
  [ComplaintStatus.REOPENED]: "🔁",
};

export const COMPLAINT_PRIORITY_ICONS: Record<ComplaintPriority, string> = {
  [ComplaintPriority.LOW]: "🟢",
  [ComplaintPriority.MEDIUM]: "🟡",
  [ComplaintPriority.HIGH]: "🟠",
  [ComplaintPriority.URGENT]: "🔴",
};

export const COMPLAINT_CATEGORY_ICONS: Record<ComplaintCategory, string> = {
  [ComplaintCategory.MACHINE_NOT_WORKING]: "🔧",
  [ComplaintCategory.MACHINE_ERROR]: "⚙️",
  [ComplaintCategory.MACHINE_DIRTY]: "🧹",
  [ComplaintCategory.PAYMENT_FAILED]: "💳",
  [ComplaintCategory.CARD_NOT_ACCEPTED]: "💳",
  [ComplaintCategory.CASH_NOT_ACCEPTED]: "💵",
  [ComplaintCategory.NO_CHANGE]: "🪙",
  [ComplaintCategory.DOUBLE_CHARGE]: "⚠️",
  [ComplaintCategory.CHARGE_WITHOUT_PRODUCT]: "⚠️",
  [ComplaintCategory.PRODUCT_NOT_DISPENSED]: "📦",
  [ComplaintCategory.PRODUCT_STUCK]: "📦",
  [ComplaintCategory.WRONG_PRODUCT]: "🔀",
  [ComplaintCategory.PRODUCT_EXPIRED]: "📅",
  [ComplaintCategory.PRODUCT_DAMAGED]: "💥",
  [ComplaintCategory.PRODUCT_QUALITY]: "⭐",
  [ComplaintCategory.PRODUCT_OUT_OF_STOCK]: "🚫",
  [ComplaintCategory.HYGIENE_ISSUE]: "🧼",
  [ComplaintCategory.SAFETY_CONCERN]: "🛡️",
  [ComplaintCategory.REFUND_REQUEST]: "💸",
  [ComplaintCategory.SUGGESTION]: "💡",
  [ComplaintCategory.PRODUCT_REQUEST]: "🛒",
  [ComplaintCategory.PRICE_FEEDBACK]: "💰",
  [ComplaintCategory.OTHER]: "❓",
};
