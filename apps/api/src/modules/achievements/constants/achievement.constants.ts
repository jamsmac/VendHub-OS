/**
 * Achievement System Constants
 * Конфигурация системы достижений VendHub
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Тип условия достижения
 */
export enum AchievementConditionType {
  ORDER_COUNT = "order_count", // Количество заказов
  ORDER_AMOUNT = "order_amount", // Сумма заказов (UZS)
  STREAK_DAYS = "streak_days", // Серия дней подряд
  UNIQUE_PRODUCTS = "unique_products", // Уникальных напитков
  UNIQUE_MACHINES = "unique_machines", // Уникальных автоматов
  REFERRAL_COUNT = "referral_count", // Приглашенных друзей
  QUEST_COMPLETED = "quest_completed", // Выполненных квестов
  LOYALTY_LEVEL = "loyalty_level", // Достичь уровня лояльности
  FIRST_ORDER = "first_order", // Первый заказ
  REVIEW_COUNT = "review_count", // Оставленных отзывов
  EARLY_BIRD = "early_bird", // Заказ до 8 утра
  NIGHT_OWL = "night_owl", // Заказ после 22:00
  WEEKEND_WARRIOR = "weekend_warrior", // Заказы в выходные
  PROMO_USED = "promo_used", // Использованных промокодов
}

/**
 * Категория достижения
 */
export enum AchievementCategory {
  BEGINNER = "beginner", // Новичок
  EXPLORER = "explorer", // Исследователь
  LOYAL = "loyal", // Лояльный
  SOCIAL = "social", // Социальный
  COLLECTOR = "collector", // Коллекционер
  SPECIAL = "special", // Особые
}

/**
 * Редкость достижения
 */
export enum AchievementRarity {
  COMMON = "common", // Обычное
  UNCOMMON = "uncommon", // Необычное
  RARE = "rare", // Редкое
  EPIC = "epic", // Эпическое
  LEGENDARY = "legendary", // Легендарное
}

// ============================================================================
// DEFAULT ACHIEVEMENTS
// ============================================================================

/**
 * Предустановленные достижения для организации
 */
export const DEFAULT_ACHIEVEMENTS = [
  // === Beginner ===
  {
    name: "Первый глоток",
    nameUz: "Birinchi qultum",
    description: "Сделайте свой первый заказ",
    descriptionUz: "Birinchi buyurtmangizni bering",
    conditionType: AchievementConditionType.FIRST_ORDER,
    conditionValue: 1,
    bonusPoints: 50,
    icon: "☕",
    category: AchievementCategory.BEGINNER,
    rarity: AchievementRarity.COMMON,
  },
  {
    name: "Завсегдатай",
    nameUz: "Doimiy mijoz",
    description: "Сделайте 10 заказов",
    descriptionUz: "10 ta buyurtma bering",
    conditionType: AchievementConditionType.ORDER_COUNT,
    conditionValue: 10,
    bonusPoints: 100,
    icon: "⭐",
    category: AchievementCategory.BEGINNER,
    rarity: AchievementRarity.COMMON,
  },
  {
    name: "Кофеман",
    nameUz: "Qahvaxo'r",
    description: "Сделайте 50 заказов",
    descriptionUz: "50 ta buyurtma bering",
    conditionType: AchievementConditionType.ORDER_COUNT,
    conditionValue: 50,
    bonusPoints: 300,
    icon: "🏅",
    category: AchievementCategory.BEGINNER,
    rarity: AchievementRarity.UNCOMMON,
  },
  {
    name: "Легенда",
    nameUz: "Afsonaviy",
    description: "Сделайте 200 заказов",
    descriptionUz: "200 ta buyurtma bering",
    conditionType: AchievementConditionType.ORDER_COUNT,
    conditionValue: 200,
    bonusPoints: 1000,
    icon: "👑",
    category: AchievementCategory.BEGINNER,
    rarity: AchievementRarity.LEGENDARY,
  },

  // === Explorer ===
  {
    name: "Исследователь",
    nameUz: "Tadqiqotchi",
    description: "Попробуйте 5 разных напитков",
    descriptionUz: "5 xil ichimlikni sinab ko'ring",
    conditionType: AchievementConditionType.UNIQUE_PRODUCTS,
    conditionValue: 5,
    bonusPoints: 75,
    icon: "🔍",
    category: AchievementCategory.EXPLORER,
    rarity: AchievementRarity.COMMON,
  },
  {
    name: "Гурман",
    nameUz: "Gurman",
    description: "Попробуйте 15 разных напитков",
    descriptionUz: "15 xil ichimlikni sinab ko'ring",
    conditionType: AchievementConditionType.UNIQUE_PRODUCTS,
    conditionValue: 15,
    bonusPoints: 200,
    icon: "🍷",
    category: AchievementCategory.EXPLORER,
    rarity: AchievementRarity.RARE,
  },
  {
    name: "Путешественник",
    nameUz: "Sayohatchi",
    description: "Купите напитки в 5 разных автоматах",
    descriptionUz: "5 xil avtomatdan ichimlik sotib oling",
    conditionType: AchievementConditionType.UNIQUE_MACHINES,
    conditionValue: 5,
    bonusPoints: 150,
    icon: "🗺️",
    category: AchievementCategory.EXPLORER,
    rarity: AchievementRarity.UNCOMMON,
  },

  // === Loyal ===
  {
    name: "Огненная серия",
    nameUz: "Olovli seriya",
    description: "Делайте заказы 7 дней подряд",
    descriptionUz: "7 kun ketma-ket buyurtma bering",
    conditionType: AchievementConditionType.STREAK_DAYS,
    conditionValue: 7,
    bonusPoints: 200,
    icon: "🔥",
    category: AchievementCategory.LOYAL,
    rarity: AchievementRarity.UNCOMMON,
  },
  {
    name: "Несокрушимый",
    nameUz: "Buzilmas",
    description: "Делайте заказы 30 дней подряд",
    descriptionUz: "30 kun ketma-ket buyurtma bering",
    conditionType: AchievementConditionType.STREAK_DAYS,
    conditionValue: 30,
    bonusPoints: 500,
    icon: "💎",
    category: AchievementCategory.LOYAL,
    rarity: AchievementRarity.EPIC,
  },

  // === Social ===
  {
    name: "Дружелюбный",
    nameUz: "Do'stona",
    description: "Пригласите 3 друзей",
    descriptionUz: "3 do'stingizni taklif qiling",
    conditionType: AchievementConditionType.REFERRAL_COUNT,
    conditionValue: 3,
    bonusPoints: 300,
    icon: "🤝",
    category: AchievementCategory.SOCIAL,
    rarity: AchievementRarity.UNCOMMON,
  },
  {
    name: "Амбассадор",
    nameUz: "Elchi",
    description: "Пригласите 10 друзей",
    descriptionUz: "10 do'stingizni taklif qiling",
    conditionType: AchievementConditionType.REFERRAL_COUNT,
    conditionValue: 10,
    bonusPoints: 1000,
    icon: "🌟",
    category: AchievementCategory.SOCIAL,
    rarity: AchievementRarity.EPIC,
  },

  // === Special ===
  {
    name: "Ранняя пташка",
    nameUz: "Erta qush",
    description: "Сделайте заказ до 8:00 утра",
    descriptionUz: "Ertalab 8:00 gacha buyurtma bering",
    conditionType: AchievementConditionType.EARLY_BIRD,
    conditionValue: 1,
    bonusPoints: 50,
    icon: "🌅",
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.UNCOMMON,
  },
  {
    name: "Ночная сова",
    nameUz: "Tun boymi",
    description: "Сделайте заказ после 22:00",
    descriptionUz: "Kechqurun 22:00 dan keyin buyurtma bering",
    conditionType: AchievementConditionType.NIGHT_OWL,
    conditionValue: 1,
    bonusPoints: 50,
    icon: "🦉",
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.UNCOMMON,
  },
] as const;

// ============================================================================
// RARITY CONFIG
// ============================================================================

export const RARITY_CONFIG = {
  [AchievementRarity.COMMON]: {
    name: "Обычное",
    nameUz: "Oddiy",
    color: "#9E9E9E",
    multiplier: 1,
  },
  [AchievementRarity.UNCOMMON]: {
    name: "Необычное",
    nameUz: "Noodatiy",
    color: "#4CAF50",
    multiplier: 1.25,
  },
  [AchievementRarity.RARE]: {
    name: "Редкое",
    nameUz: "Noyob",
    color: "#2196F3",
    multiplier: 1.5,
  },
  [AchievementRarity.EPIC]: {
    name: "Эпическое",
    nameUz: "Epik",
    color: "#9C27B0",
    multiplier: 2,
  },
  [AchievementRarity.LEGENDARY]: {
    name: "Легендарное",
    nameUz: "Afsonaviy",
    color: "#FF9800",
    multiplier: 3,
  },
} as const;
