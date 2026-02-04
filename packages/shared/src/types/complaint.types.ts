/**
 * Complaint Types for VendHub OS
 * QR-code based complaint and support system
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ComplaintStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  WAITING_CUSTOMER = 'waiting_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated',
  REJECTED = 'rejected',
}

export enum ComplaintPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ComplaintCategory {
  PAYMENT = 'payment',
  PRODUCT_NOT_DISPENSED = 'product_not_dispensed',
  PRODUCT_QUALITY = 'product_quality',
  WRONG_PRODUCT = 'wrong_product',
  MACHINE_MALFUNCTION = 'machine_malfunction',
  PRICE_ISSUE = 'price_issue',
  REFUND_REQUEST = 'refund_request',
  SUGGESTION = 'suggestion',
  OTHER = 'other',
}

export enum ComplaintSource {
  QR_CODE = 'qr_code',
  TELEGRAM_BOT = 'telegram_bot',
  PHONE = 'phone',
  EMAIL = 'email',
  WEB_FORM = 'web_form',
  MOBILE_APP = 'mobile_app',
  INTERNAL = 'internal',
}

export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum RefundMethod {
  CASH = 'cash',
  CARD = 'card',
  PAYME = 'payme',
  CLICK = 'click',
  UZUM = 'uzum',
  PRODUCT = 'product',
  BONUS = 'bonus',
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
  metadata?: Record<string, any>;
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
  bankDetails?: Record<string, any>;
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
  bankDetails?: Record<string, any>;
}

// ============================================================================
// LABELS (RU/UZ)
// ============================================================================

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, { ru: string; uz: string }> = {
  [ComplaintStatus.NEW]: { ru: 'Новая', uz: 'Yangi' },
  [ComplaintStatus.IN_PROGRESS]: { ru: 'В обработке', uz: 'Jarayonda' },
  [ComplaintStatus.WAITING_CUSTOMER]: { ru: 'Ожидает клиента', uz: 'Mijozni kutmoqda' },
  [ComplaintStatus.RESOLVED]: { ru: 'Решена', uz: 'Hal qilindi' },
  [ComplaintStatus.CLOSED]: { ru: 'Закрыта', uz: 'Yopildi' },
  [ComplaintStatus.ESCALATED]: { ru: 'Эскалирована', uz: 'Escalatsiya qilindi' },
  [ComplaintStatus.REJECTED]: { ru: 'Отклонена', uz: 'Rad etildi' },
};

export const COMPLAINT_PRIORITY_LABELS: Record<ComplaintPriority, { ru: string; uz: string }> = {
  [ComplaintPriority.LOW]: { ru: 'Низкий', uz: 'Past' },
  [ComplaintPriority.MEDIUM]: { ru: 'Средний', uz: "O'rtacha" },
  [ComplaintPriority.HIGH]: { ru: 'Высокий', uz: 'Yuqori' },
  [ComplaintPriority.URGENT]: { ru: 'Срочный', uz: 'Shoshilinch' },
};

export const COMPLAINT_CATEGORY_LABELS: Record<ComplaintCategory, { ru: string; uz: string }> = {
  [ComplaintCategory.PAYMENT]: { ru: 'Проблема с оплатой', uz: "To'lov muammosi" },
  [ComplaintCategory.PRODUCT_NOT_DISPENSED]: { ru: 'Товар не выдан', uz: 'Mahsulot berilmadi' },
  [ComplaintCategory.PRODUCT_QUALITY]: { ru: 'Качество товара', uz: 'Mahsulot sifati' },
  [ComplaintCategory.WRONG_PRODUCT]: { ru: 'Неверный товар', uz: "Noto'g'ri mahsulot" },
  [ComplaintCategory.MACHINE_MALFUNCTION]: { ru: 'Неисправность автомата', uz: 'Avtomat nosozligi' },
  [ComplaintCategory.PRICE_ISSUE]: { ru: 'Проблема с ценой', uz: 'Narx muammosi' },
  [ComplaintCategory.REFUND_REQUEST]: { ru: 'Запрос возврата', uz: "Qaytarish so'rovi" },
  [ComplaintCategory.SUGGESTION]: { ru: 'Предложение', uz: 'Taklif' },
  [ComplaintCategory.OTHER]: { ru: 'Другое', uz: 'Boshqa' },
};

export const COMPLAINT_SOURCE_LABELS: Record<ComplaintSource, { ru: string; uz: string }> = {
  [ComplaintSource.QR_CODE]: { ru: 'QR-код', uz: 'QR-kod' },
  [ComplaintSource.TELEGRAM_BOT]: { ru: 'Telegram бот', uz: 'Telegram bot' },
  [ComplaintSource.PHONE]: { ru: 'Телефон', uz: 'Telefon' },
  [ComplaintSource.EMAIL]: { ru: 'Email', uz: 'Email' },
  [ComplaintSource.WEB_FORM]: { ru: 'Веб-форма', uz: 'Veb-forma' },
  [ComplaintSource.MOBILE_APP]: { ru: 'Мобильное приложение', uz: 'Mobil ilova' },
  [ComplaintSource.INTERNAL]: { ru: 'Внутренняя', uz: 'Ichki' },
};

export const REFUND_STATUS_LABELS: Record<RefundStatus, { ru: string; uz: string }> = {
  [RefundStatus.PENDING]: { ru: 'Ожидает', uz: 'Kutmoqda' },
  [RefundStatus.APPROVED]: { ru: 'Одобрен', uz: 'Tasdiqlandi' },
  [RefundStatus.PROCESSING]: { ru: 'Обрабатывается', uz: 'Jarayonda' },
  [RefundStatus.COMPLETED]: { ru: 'Выполнен', uz: 'Bajarildi' },
  [RefundStatus.REJECTED]: { ru: 'Отклонен', uz: 'Rad etildi' },
  [RefundStatus.CANCELLED]: { ru: 'Отменен', uz: 'Bekor qilindi' },
};

export const REFUND_METHOD_LABELS: Record<RefundMethod, { ru: string; uz: string }> = {
  [RefundMethod.CASH]: { ru: 'Наличные', uz: 'Naqd' },
  [RefundMethod.CARD]: { ru: 'Карта', uz: 'Karta' },
  [RefundMethod.PAYME]: { ru: 'Payme', uz: 'Payme' },
  [RefundMethod.CLICK]: { ru: 'Click', uz: 'Click' },
  [RefundMethod.UZUM]: { ru: 'Uzum', uz: 'Uzum' },
  [RefundMethod.PRODUCT]: { ru: 'Товаром', uz: 'Mahsulot bilan' },
  [RefundMethod.BONUS]: { ru: 'Бонусами', uz: 'Bonus bilan' },
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
  [ComplaintStatus.NEW]: '🆕',
  [ComplaintStatus.IN_PROGRESS]: '🔄',
  [ComplaintStatus.WAITING_CUSTOMER]: '⏳',
  [ComplaintStatus.RESOLVED]: '✅',
  [ComplaintStatus.CLOSED]: '📁',
  [ComplaintStatus.ESCALATED]: '⚠️',
  [ComplaintStatus.REJECTED]: '❌',
};

export const COMPLAINT_PRIORITY_ICONS: Record<ComplaintPriority, string> = {
  [ComplaintPriority.LOW]: '🟢',
  [ComplaintPriority.MEDIUM]: '🟡',
  [ComplaintPriority.HIGH]: '🟠',
  [ComplaintPriority.URGENT]: '🔴',
};

export const COMPLAINT_CATEGORY_ICONS: Record<ComplaintCategory, string> = {
  [ComplaintCategory.PAYMENT]: '💳',
  [ComplaintCategory.PRODUCT_NOT_DISPENSED]: '📦',
  [ComplaintCategory.PRODUCT_QUALITY]: '⭐',
  [ComplaintCategory.WRONG_PRODUCT]: '🔀',
  [ComplaintCategory.MACHINE_MALFUNCTION]: '🔧',
  [ComplaintCategory.PRICE_ISSUE]: '💰',
  [ComplaintCategory.REFUND_REQUEST]: '💸',
  [ComplaintCategory.SUGGESTION]: '💡',
  [ComplaintCategory.OTHER]: '❓',
};
