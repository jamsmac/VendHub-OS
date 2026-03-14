/**
 * Notification Enums
 * Перечисления для системы уведомлений
 */

/**
 * Канал доставки уведомления
 */
export enum NotificationChannel {
  PUSH = "push", // Push-уведомление (мобильное)
  EMAIL = "email", // Email
  SMS = "sms", // SMS
  TELEGRAM = "telegram", // Telegram
  WHATSAPP = "whatsapp", // WhatsApp
  IN_APP = "in_app", // В приложении
  WEBHOOK = "webhook", // Webhook
  SLACK = "slack", // Slack
}

/**
 * Тип уведомления
 */
export enum NotificationType {
  // Системные
  SYSTEM = "system", // Системное уведомление
  ANNOUNCEMENT = "announcement", // Объявление
  MAINTENANCE = "maintenance", // Техническое обслуживание

  // Автоматы
  MACHINE_ALERT = "machine_alert", // Алерт автомата
  MACHINE_ERROR = "machine_error", // Ошибка автомата
  MACHINE_OFFLINE = "machine_offline", // Автомат оффлайн
  MACHINE_LOW_STOCK = "machine_low_stock", // Низкий запас
  MACHINE_OUT_OF_STOCK = "machine_out_of_stock", // Товар закончился
  MACHINE_TEMPERATURE = "machine_temperature", // Температура

  // Задачи
  TASK_ASSIGNED = "task_assigned", // Задача назначена
  TASK_UPDATED = "task_updated", // Задача обновлена
  TASK_COMPLETED = "task_completed", // Задача завершена
  TASK_OVERDUE = "task_overdue", // Задача просрочена
  TASK_REMINDER = "task_reminder", // Напоминание о задаче

  // Жалобы
  COMPLAINT_NEW = "complaint_new", // Новая жалоба
  COMPLAINT_ASSIGNED = "complaint_assigned", // Жалоба назначена
  COMPLAINT_UPDATED = "complaint_updated", // Жалоба обновлена
  COMPLAINT_RESOLVED = "complaint_resolved", // Жалоба решена
  COMPLAINT_SLA_WARNING = "complaint_sla_warning", // SLA предупреждение

  // Инвентарь
  INVENTORY_LOW = "inventory_low", // Низкий запас на складе
  INVENTORY_EXPIRING = "inventory_expiring", // Товар скоро истечет
  INVENTORY_TRANSFER = "inventory_transfer", // Перемещение товара

  // Финансы
  TRANSACTION_ALERT = "transaction_alert", // Алерт транзакции
  COLLECTION_DUE = "collection_due", // Пора инкассировать
  COLLECTION_COMPLETED = "collection_completed", // Инкассация завершена
  PAYMENT_RECEIVED = "payment_received", // Платеж получен
  REVENUE_MILESTONE = "revenue_milestone", // Достижение по выручке

  // Пользователи
  USER_LOGIN = "user_login", // Вход пользователя
  USER_INVITED = "user_invited", // Пользователь приглашен
  PASSWORD_CHANGED = "password_changed", // Пароль изменен
  ROLE_CHANGED = "role_changed", // Роль изменена

  // Контракты
  CONTRACT_EXPIRING = "contract_expiring", // Контракт истекает
  CONTRACT_EXPIRED = "contract_expired", // Контракт истек
  CONTRACT_PAYMENT_DUE = "contract_payment_due", // Срок оплаты контракта

  // Отчеты
  REPORT_READY = "report_ready", // Отчет готов
  REPORT_SCHEDULED = "report_scheduled", // Отчет по расписанию

  // Другое
  CUSTOM = "custom", // Кастомное уведомление
}

/**
 * Приоритет уведомления
 */
export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

/**
 * Статус уведомления
 */
export enum NotificationStatus {
  PENDING = "pending", // Ожидает отправки
  QUEUED = "queued", // В очереди
  SENDING = "sending", // Отправляется
  SENT = "sent", // Отправлено
  DELIVERED = "delivered", // Доставлено
  READ = "read", // Прочитано
  FAILED = "failed", // Ошибка отправки
  CANCELLED = "cancelled", // Отменено
  EXPIRED = "expired", // Истекло
}

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
  IMMEDIATE = "immediate", // Немедленно
  SCHEDULED = "scheduled", // По расписанию
  RECURRING = "recurring", // Повторяющееся
  TRIGGERED = "triggered", // По триггеру
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
