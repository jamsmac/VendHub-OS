/**
 * Complaint Constants
 * i18n labels и SLA конфигурации для системы жалоб
 */

import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ComplaintSource,
} from "./complaint.enums";

/**
 * SLA конфигурация
 */
interface SlaConfig {
  responseTimeHours: number; // Время до первого ответа
  resolutionTimeHours: number; // Время до решения
  escalationTimeHours: number; // Время до эскалации
}

/**
 * SLA конфигурация по приоритету
 */
export const DEFAULT_SLA_CONFIG: Record<ComplaintPriority, SlaConfig> = {
  [ComplaintPriority.CRITICAL]: {
    responseTimeHours: 1,
    resolutionTimeHours: 4,
    escalationTimeHours: 2,
  },
  [ComplaintPriority.HIGH]: {
    responseTimeHours: 2,
    resolutionTimeHours: 8,
    escalationTimeHours: 4,
  },
  [ComplaintPriority.MEDIUM]: {
    responseTimeHours: 4,
    resolutionTimeHours: 24,
    escalationTimeHours: 8,
  },
  [ComplaintPriority.LOW]: {
    responseTimeHours: 8,
    resolutionTimeHours: 72,
    escalationTimeHours: 24,
  },
};

/**
 * Labels для категорий жалоб
 */
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
  [ComplaintCategory.PAYMENT_FAILED]: {
    ru: "Проблема с оплатой",
    uz: "To'lov muammosi",
  },
  [ComplaintCategory.CARD_NOT_ACCEPTED]: {
    ru: "Карта не принимается",
    uz: "Karta qabul qilinmayapti",
  },
  [ComplaintCategory.CASH_NOT_ACCEPTED]: {
    ru: "Наличные не принимаются",
    uz: "Naqd pul qabul qilinmayapti",
  },
  [ComplaintCategory.NO_CHANGE]: { ru: "Нет сдачи", uz: "Qaytim yo'q" },
  [ComplaintCategory.PRODUCT_NOT_DISPENSED]: {
    ru: "Товар не выдан",
    uz: "Mahsulot berilmadi",
  },
  [ComplaintCategory.PRODUCT_STUCK]: {
    ru: "Товар застрял",
    uz: "Mahsulot tiqilib qoldi",
  },
  [ComplaintCategory.WRONG_PRODUCT]: {
    ru: "Выдан не тот товар",
    uz: "Noto'g'ri mahsulot berildi",
  },
  [ComplaintCategory.PRODUCT_EXPIRED]: {
    ru: "Товар просрочен",
    uz: "Mahsulot muddati o'tgan",
  },
  [ComplaintCategory.PRODUCT_DAMAGED]: {
    ru: "Товар поврежден",
    uz: "Mahsulot shikastlangan",
  },
  [ComplaintCategory.PRODUCT_QUALITY]: {
    ru: "Качество товара",
    uz: "Mahsulot sifati",
  },
  [ComplaintCategory.PRODUCT_OUT_OF_STOCK]: {
    ru: "Товар закончился",
    uz: "Mahsulot tugadi",
  },
  [ComplaintCategory.REFUND_REQUEST]: {
    ru: "Запрос на возврат",
    uz: "Qaytarish so'rovi",
  },
  [ComplaintCategory.DOUBLE_CHARGE]: {
    ru: "Двойное списание",
    uz: "Ikki marta yechildi",
  },
  [ComplaintCategory.CHARGE_WITHOUT_PRODUCT]: {
    ru: "Списание без выдачи",
    uz: "Mahsulotsiz yechim",
  },
  [ComplaintCategory.MACHINE_DIRTY]: {
    ru: "Автомат грязный",
    uz: "Avtomat iflos",
  },
  [ComplaintCategory.HYGIENE_ISSUE]: {
    ru: "Проблема гигиены",
    uz: "Gigiena muammosi",
  },
  [ComplaintCategory.SAFETY_CONCERN]: {
    ru: "Проблема безопасности",
    uz: "Xavfsizlik muammosi",
  },
  [ComplaintCategory.SUGGESTION]: { ru: "Предложение", uz: "Taklif" },
  [ComplaintCategory.PRODUCT_REQUEST]: {
    ru: "Запрос продукта",
    uz: "Mahsulot so'rovi",
  },
  [ComplaintCategory.PRICE_FEEDBACK]: {
    ru: "Отзыв о цене",
    uz: "Narx haqida fikr",
  },
  [ComplaintCategory.OTHER]: { ru: "Другое", uz: "Boshqa" },
};

/**
 * Labels для статусов жалоб
 */
export const COMPLAINT_STATUS_LABELS: Record<
  ComplaintStatus,
  { ru: string; uz: string; color: string }
> = {
  [ComplaintStatus.NEW]: { ru: "Новая", uz: "Yangi", color: "#3B82F6" },
  [ComplaintStatus.PENDING]: {
    ru: "Ожидает",
    uz: "Kutmoqda",
    color: "#F59E0B",
  },
  [ComplaintStatus.IN_PROGRESS]: {
    ru: "В работе",
    uz: "Jarayonda",
    color: "#8B5CF6",
  },
  [ComplaintStatus.ASSIGNED]: {
    ru: "Назначена",
    uz: "Tayinlangan",
    color: "#6366F1",
  },
  [ComplaintStatus.INVESTIGATING]: {
    ru: "Расследование",
    uz: "Tekshirilmoqda",
    color: "#EC4899",
  },
  [ComplaintStatus.AWAITING_CUSTOMER]: {
    ru: "Ожидает клиента",
    uz: "Mijozni kutmoqda",
    color: "#F97316",
  },
  [ComplaintStatus.AWAITING_PARTS]: {
    ru: "Ожидает запчасти",
    uz: "Ehtiyot qismlarni kutmoqda",
    color: "#EAB308",
  },
  [ComplaintStatus.RESOLVED]: {
    ru: "Решена",
    uz: "Hal qilindi",
    color: "#10B981",
  },
  [ComplaintStatus.CLOSED]: { ru: "Закрыта", uz: "Yopildi", color: "#6B7280" },
  [ComplaintStatus.REJECTED]: {
    ru: "Отклонена",
    uz: "Rad etildi",
    color: "#EF4444",
  },
  [ComplaintStatus.DUPLICATE]: {
    ru: "Дубликат",
    uz: "Dublikat",
    color: "#9CA3AF",
  },
  [ComplaintStatus.ESCALATED]: {
    ru: "Эскалирована",
    uz: "Eskalatsiya",
    color: "#DC2626",
  },
  [ComplaintStatus.REOPENED]: {
    ru: "Открыта повторно",
    uz: "Qayta ochildi",
    color: "#F59E0B",
  },
};

/**
 * Labels для приоритетов
 */
export const COMPLAINT_PRIORITY_LABELS: Record<
  ComplaintPriority,
  { ru: string; uz: string; color: string; icon: string }
> = {
  [ComplaintPriority.LOW]: {
    ru: "Низкий",
    uz: "Past",
    color: "#6B7280",
    icon: "⬇️",
  },
  [ComplaintPriority.MEDIUM]: {
    ru: "Средний",
    uz: "O'rta",
    color: "#F59E0B",
    icon: "➡️",
  },
  [ComplaintPriority.HIGH]: {
    ru: "Высокий",
    uz: "Yuqori",
    color: "#F97316",
    icon: "⬆️",
  },
  [ComplaintPriority.CRITICAL]: {
    ru: "Критический",
    uz: "Kritik",
    color: "#EF4444",
    icon: "🔥",
  },
};

/**
 * Labels для источников
 */
export const COMPLAINT_SOURCE_LABELS: Record<
  ComplaintSource,
  { ru: string; uz: string; icon: string }
> = {
  [ComplaintSource.QR_CODE]: { ru: "QR-код", uz: "QR-kod", icon: "📱" },
  [ComplaintSource.MOBILE_APP]: {
    ru: "Мобильное приложение",
    uz: "Mobil ilova",
    icon: "📲",
  },
  [ComplaintSource.WEB_PORTAL]: {
    ru: "Веб-портал",
    uz: "Veb-portal",
    icon: "🌐",
  },
  [ComplaintSource.TELEGRAM_BOT]: {
    ru: "Telegram бот",
    uz: "Telegram bot",
    icon: "🤖",
  },
  [ComplaintSource.PHONE_CALL]: { ru: "Звонок", uz: "Qo'ng'iroq", icon: "📞" },
  [ComplaintSource.EMAIL]: { ru: "Email", uz: "Email", icon: "📧" },
  [ComplaintSource.SOCIAL_MEDIA]: {
    ru: "Социальные сети",
    uz: "Ijtimoiy tarmoqlar",
    icon: "💬",
  },
  [ComplaintSource.LOCATION_CONTACT]: {
    ru: "Контакт от локации",
    uz: "Lokatsiya aloqasi",
    icon: "📍",
  },
  [ComplaintSource.INTERNAL]: { ru: "Внутренняя", uz: "Ichki", icon: "🏢" },
};
