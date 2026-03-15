/**
 * Complaint Enums
 * Перечисления для системы жалоб и обращений
 */

/**
 * Категория жалобы
 */
export enum ComplaintCategory {
  // Проблемы с автоматом
  MACHINE_NOT_WORKING = "machine_not_working", // Автомат не работает
  MACHINE_ERROR = "machine_error", // Ошибка автомата
  PAYMENT_FAILED = "payment_failed", // Проблема с оплатой
  CARD_NOT_ACCEPTED = "card_not_accepted", // Карта не принимается
  CASH_NOT_ACCEPTED = "cash_not_accepted", // Наличные не принимаются
  NO_CHANGE = "no_change", // Нет сдачи

  // Проблемы с продуктом
  PRODUCT_NOT_DISPENSED = "product_not_dispensed", // Товар не выдан
  PRODUCT_STUCK = "product_stuck", // Товар застрял
  WRONG_PRODUCT = "wrong_product", // Выдан не тот товар
  PRODUCT_EXPIRED = "product_expired", // Товар просрочен
  PRODUCT_DAMAGED = "product_damaged", // Товар поврежден
  PRODUCT_QUALITY = "product_quality", // Качество товара
  PRODUCT_OUT_OF_STOCK = "product_out_of_stock", // Товар закончился

  // Возврат средств
  REFUND_REQUEST = "refund_request", // Запрос на возврат
  DOUBLE_CHARGE = "double_charge", // Двойное списание
  CHARGE_WITHOUT_PRODUCT = "charge_without_product", // Списание без выдачи

  // Гигиена и безопасность
  MACHINE_DIRTY = "machine_dirty", // Автомат грязный
  HYGIENE_ISSUE = "hygiene_issue", // Проблема гигиены
  SAFETY_CONCERN = "safety_concern", // Проблема безопасности

  // Предложения
  SUGGESTION = "suggestion", // Предложение
  PRODUCT_REQUEST = "product_request", // Запрос продукта
  PRICE_FEEDBACK = "price_feedback", // Отзыв о цене

  // Другое
  OTHER = "other", // Другое
}

/**
 * Приоритет жалобы
 */
export enum ComplaintPriority {
  LOW = "low", // Низкий (предложения)
  MEDIUM = "medium", // Средний (мелкие проблемы)
  HIGH = "high", // Высокий (возвраты, неработающий автомат)
  CRITICAL = "critical", // Критический (безопасность, массовые проблемы)
}

/**
 * Статус жалобы
 */
export enum ComplaintStatus {
  // Начальные
  NEW = "new", // Новая
  PENDING = "pending", // Ожидает обработки

  // В работе
  IN_PROGRESS = "in_progress", // В работе
  ASSIGNED = "assigned", // Назначена исполнителю
  INVESTIGATING = "investigating", // Расследование
  AWAITING_CUSTOMER = "awaiting_customer", // Ожидает клиента
  AWAITING_PARTS = "awaiting_parts", // Ожидает запчастей

  // Финальные
  RESOLVED = "resolved", // Решена
  CLOSED = "closed", // Закрыта
  REJECTED = "rejected", // Отклонена
  DUPLICATE = "duplicate", // Дубликат

  // Эскалация
  ESCALATED = "escalated", // Эскалирована
  REOPENED = "reopened", // Открыта повторно
}

/**
 * Источник жалобы
 */
export enum ComplaintSource {
  QR_CODE = "qr_code", // Через QR-код на автомате
  MOBILE_APP = "mobile_app", // Мобильное приложение
  WEB_PORTAL = "web_portal", // Веб-портал
  TELEGRAM_BOT = "telegram_bot", // Telegram бот
  PHONE_CALL = "phone_call", // Звонок
  EMAIL = "email", // Email
  SOCIAL_MEDIA = "social_media", // Социальные сети
  LOCATION_CONTACT = "location_contact", // Контакт от локации
  INTERNAL = "internal", // Внутренняя (от сотрудников)
}

/**
 * Тип действия по жалобе
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
 * Тип возврата
 */
export enum RefundType {
  FULL = "full", // Полный возврат
  PARTIAL = "partial", // Частичный возврат
  PRODUCT_REPLACEMENT = "product_replacement", // Замена товара
  CREDIT = "credit", // Кредит на будущие покупки
  COMPENSATION = "compensation", // Компенсация
}

/**
 * Статус возврата
 */
export enum ComplaintRefundStatus {
  PENDING = "pending", // Ожидает
  APPROVED = "approved", // Одобрен
  PROCESSING = "processing", // В обработке
  COMPLETED = "completed", // Завершен
  REJECTED = "rejected", // Отклонен
  CANCELLED = "cancelled", // Отменен
}

/**
 * Рейтинг удовлетворенности
 */
export enum SatisfactionRating {
  VERY_DISSATISFIED = 1,
  DISSATISFIED = 2,
  NEUTRAL = 3,
  SATISFIED = 4,
  VERY_SATISFIED = 5,
}
