/**
 * Notification Enums
 * Core notification enums re-exported from @vendhub/shared (single source of truth).
 * Module-specific enums defined locally.
 */

// Re-exported from @vendhub/shared
export {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from "@vendhub/shared";

/**
 * Категория события для триггера
 */
export enum EventCategory {
  MACHINE = "machine",
  TASK = "task",
  COMPLAINT = "complaint",
  INVENTORY = "inventory",
  TRANSACTION = "transaction",
  USER = "user",
  CONTRACT = "contract",
  SYSTEM = "system",
  REPORT = "report",
}

/**
 * Тип расписания
 */
export enum ScheduleType {
  IMMEDIATE = "immediate",
  SCHEDULED = "scheduled",
  RECURRING = "recurring",
  TRIGGERED = "triggered",
}

/**
 * Частота повторения
 */
export enum RecurrenceFrequency {
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  CUSTOM = "custom",
}
