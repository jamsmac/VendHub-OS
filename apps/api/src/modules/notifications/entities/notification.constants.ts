/**
 * Notification Constants
 * i18n labels для типов, каналов и приоритетов уведомлений
 */

import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "./notification.enums";

/**
 * Labels для типов уведомлений
 */
export const NOTIFICATION_TYPE_LABELS: Record<
  NotificationType,
  { ru: string; uz: string; icon: string }
> = {
  [NotificationType.SYSTEM]: { ru: "Системное", uz: "Tizim", icon: "⚙️" },
  [NotificationType.ANNOUNCEMENT]: {
    ru: "Объявление",
    uz: "E'lon",
    icon: "📢",
  },
  [NotificationType.MAINTENANCE]: {
    ru: "Техобслуживание",
    uz: "Texnik xizmat",
    icon: "🔧",
  },
  [NotificationType.MACHINE_ALERT]: {
    ru: "Алерт автомата",
    uz: "Avtomat ogohi",
    icon: "🤖",
  },
  [NotificationType.MACHINE_ERROR]: {
    ru: "Ошибка автомата",
    uz: "Avtomat xatosi",
    icon: "❌",
  },
  [NotificationType.MACHINE_OFFLINE]: {
    ru: "Автомат оффлайн",
    uz: "Avtomat oflayn",
    icon: "📴",
  },
  [NotificationType.MACHINE_LOW_STOCK]: {
    ru: "Низкий запас",
    uz: "Kam zaxira",
    icon: "📉",
  },
  [NotificationType.MACHINE_OUT_OF_STOCK]: {
    ru: "Нет в наличии",
    uz: "Tugadi",
    icon: "🚫",
  },
  [NotificationType.MACHINE_TEMPERATURE]: {
    ru: "Температура",
    uz: "Harorat",
    icon: "🌡️",
  },
  [NotificationType.TASK_ASSIGNED]: {
    ru: "Задача назначена",
    uz: "Vazifa tayinlandi",
    icon: "📋",
  },
  [NotificationType.TASK_UPDATED]: {
    ru: "Задача обновлена",
    uz: "Vazifa yangilandi",
    icon: "✏️",
  },
  [NotificationType.TASK_COMPLETED]: {
    ru: "Задача завершена",
    uz: "Vazifa tugadi",
    icon: "✅",
  },
  [NotificationType.TASK_OVERDUE]: {
    ru: "Задача просрочена",
    uz: "Vazifa kechikdi",
    icon: "⏰",
  },
  [NotificationType.TASK_REMINDER]: {
    ru: "Напоминание",
    uz: "Eslatma",
    icon: "🔔",
  },
  [NotificationType.COMPLAINT_NEW]: {
    ru: "Новая жалоба",
    uz: "Yangi shikoyat",
    icon: "📨",
  },
  [NotificationType.COMPLAINT_ASSIGNED]: {
    ru: "Жалоба назначена",
    uz: "Shikoyat tayinlandi",
    icon: "👤",
  },
  [NotificationType.COMPLAINT_UPDATED]: {
    ru: "Жалоба обновлена",
    uz: "Shikoyat yangilandi",
    icon: "🔄",
  },
  [NotificationType.COMPLAINT_RESOLVED]: {
    ru: "Жалоба решена",
    uz: "Shikoyat hal qilindi",
    icon: "✅",
  },
  [NotificationType.COMPLAINT_SLA_WARNING]: {
    ru: "SLA предупреждение",
    uz: "SLA ogohlantirish",
    icon: "⚠️",
  },
  [NotificationType.INVENTORY_LOW]: {
    ru: "Низкий запас",
    uz: "Kam zaxira",
    icon: "📦",
  },
  [NotificationType.INVENTORY_EXPIRING]: {
    ru: "Срок истекает",
    uz: "Muddat tugayapti",
    icon: "⏳",
  },
  [NotificationType.INVENTORY_TRANSFER]: {
    ru: "Перемещение",
    uz: "Ko'chirish",
    icon: "🔄",
  },
  [NotificationType.TRANSACTION_ALERT]: {
    ru: "Транзакция",
    uz: "Tranzaksiya",
    icon: "💳",
  },
  [NotificationType.COLLECTION_DUE]: {
    ru: "Пора инкассировать",
    uz: "Inkassatsiya vaqti",
    icon: "💰",
  },
  [NotificationType.COLLECTION_COMPLETED]: {
    ru: "Инкассация",
    uz: "Inkassatsiya",
    icon: "✅",
  },
  [NotificationType.PAYMENT_RECEIVED]: {
    ru: "Платеж получен",
    uz: "To'lov qabul qilindi",
    icon: "💵",
  },
  [NotificationType.REVENUE_MILESTONE]: {
    ru: "Достижение",
    uz: "Muvaffaqiyat",
    icon: "🏆",
  },
  [NotificationType.USER_LOGIN]: { ru: "Вход", uz: "Kirish", icon: "🔐" },
  [NotificationType.USER_INVITED]: {
    ru: "Приглашение",
    uz: "Taklif",
    icon: "✉️",
  },
  [NotificationType.PASSWORD_CHANGED]: {
    ru: "Пароль изменен",
    uz: "Parol o'zgardi",
    icon: "🔑",
  },
  [NotificationType.ROLE_CHANGED]: {
    ru: "Роль изменена",
    uz: "Rol o'zgardi",
    icon: "👥",
  },
  [NotificationType.CONTRACT_EXPIRING]: {
    ru: "Контракт истекает",
    uz: "Shartnoma tugayapti",
    icon: "📄",
  },
  [NotificationType.CONTRACT_EXPIRED]: {
    ru: "Контракт истек",
    uz: "Shartnoma tugadi",
    icon: "📄",
  },
  [NotificationType.CONTRACT_PAYMENT_DUE]: {
    ru: "Срок оплаты",
    uz: "To'lov muddati",
    icon: "💳",
  },
  [NotificationType.REPORT_READY]: {
    ru: "Отчет готов",
    uz: "Hisobot tayyor",
    icon: "📊",
  },
  [NotificationType.REPORT_SCHEDULED]: {
    ru: "Запланированный отчет",
    uz: "Rejalashtirilgan hisobot",
    icon: "📅",
  },
  [NotificationType.CUSTOM]: { ru: "Кастомное", uz: "Maxsus", icon: "📝" },
};

/**
 * Labels для каналов
 */
export const NOTIFICATION_CHANNEL_LABELS: Record<
  NotificationChannel,
  { ru: string; uz: string; icon: string }
> = {
  [NotificationChannel.PUSH]: {
    ru: "Push-уведомление",
    uz: "Push-xabar",
    icon: "📱",
  },
  [NotificationChannel.EMAIL]: { ru: "Email", uz: "Email", icon: "📧" },
  [NotificationChannel.SMS]: { ru: "SMS", uz: "SMS", icon: "💬" },
  [NotificationChannel.TELEGRAM]: {
    ru: "Telegram",
    uz: "Telegram",
    icon: "✈️",
  },
  [NotificationChannel.WHATSAPP]: {
    ru: "WhatsApp",
    uz: "WhatsApp",
    icon: "💚",
  },
  [NotificationChannel.IN_APP]: {
    ru: "В приложении",
    uz: "Ilovada",
    icon: "📲",
  },
  [NotificationChannel.WEBHOOK]: { ru: "Webhook", uz: "Webhook", icon: "🔗" },
  [NotificationChannel.SLACK]: { ru: "Slack", uz: "Slack", icon: "💼" },
};

/**
 * Labels для приоритетов
 */
export const NOTIFICATION_PRIORITY_LABELS: Record<
  NotificationPriority,
  { ru: string; uz: string; color: string }
> = {
  [NotificationPriority.LOW]: { ru: "Низкий", uz: "Past", color: "#6B7280" },
  [NotificationPriority.NORMAL]: {
    ru: "Обычный",
    uz: "Oddiy",
    color: "#3B82F6",
  },
  [NotificationPriority.HIGH]: {
    ru: "Высокий",
    uz: "Yuqori",
    color: "#F59E0B",
  },
  [NotificationPriority.URGENT]: {
    ru: "Срочный",
    uz: "Shoshilinch",
    color: "#EF4444",
  },
};
