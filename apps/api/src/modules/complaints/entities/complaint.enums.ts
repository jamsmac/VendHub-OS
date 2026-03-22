/**
 * Complaint Enums
 *
 * Shared enums (ComplaintCategory, ComplaintPriority, ComplaintStatus, ComplaintSource)
 * are re-exported from @vendhub/shared to maintain a single source of truth.
 *
 * Module-specific enums (ComplaintActionType, RefundType, ComplaintRefundStatus,
 * SatisfactionRating) remain here as they are only used within the complaints module.
 */

// Re-export shared enums — single source of truth
export {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintSource,
} from "@vendhub/shared";

/**
 * Тип действия по жалобе (module-specific)
 */
export enum ComplaintActionType {
  // Статус
  CREATED = "created",
  STATUS_CHANGED = "status_changed",
  ASSIGNED = "assigned",
  ESCALATED = "escalated",

  // Коммуникация
  COMMENT_ADDED = "comment_added",
  CUSTOMER_CONTACTED = "customer_contacted",
  CUSTOMER_REPLIED = "customer_replied",

  // Решение
  REFUND_INITIATED = "refund_initiated",
  REFUND_COMPLETED = "refund_completed",
  PRODUCT_REPLACED = "product_replaced",
  MACHINE_SERVICED = "machine_serviced",

  // Другое
  ATTACHMENT_ADDED = "attachment_added",
  MERGED = "merged",
  SPLIT = "split",
  REOPENED = "reopened",
}

/**
 * Тип возврата (module-specific)
 */
export enum RefundType {
  FULL = "full",
  PARTIAL = "partial",
  PRODUCT_REPLACEMENT = "product_replacement",
  CREDIT = "credit",
  COMPENSATION = "compensation",
}

/**
 * Статус возврата (module-specific)
 */
export enum ComplaintRefundStatus {
  PENDING = "pending",
  APPROVED = "approved",
  PROCESSING = "processing",
  COMPLETED = "completed",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

/**
 * Рейтинг удовлетворенности (module-specific)
 */
export enum SatisfactionRating {
  VERY_DISSATISFIED = 1,
  DISSATISFIED = 2,
  NEUTRAL = 3,
  SATISFIED = 4,
  VERY_SATISFIED = 5,
}
