/**
 * Quest System Constants
 * Конфигурация системы заданий VendHub
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Тип квеста по периодичности
 */
export enum QuestPeriod {
  DAILY = 'daily',         // Ежедневные
  WEEKLY = 'weekly',       // Еженедельные
  MONTHLY = 'monthly',     // Ежемесячные
  ONE_TIME = 'one_time',   // Разовые (достижения)
  SPECIAL = 'special',     // Специальные/сезонные
}

/**
 * Тип квеста по действию
 */
export enum QuestType {
  // Покупки
  ORDER_COUNT = 'order_count',           // Совершить N заказов
  ORDER_AMOUNT = 'order_amount',         // Заказать на N сум
  ORDER_SINGLE = 'order_single',         // Один заказ на N сум
  ORDER_CATEGORY = 'order_category',     // Заказать из категории N раз
  ORDER_PRODUCT = 'order_product',       // Заказать конкретный продукт
  ORDER_TIME = 'order_time',             // Заказать в определенное время
  ORDER_MACHINE = 'order_machine',       // Заказать с определенного автомата

  // Социальные
  REFERRAL = 'referral',                 // Пригласить N друзей
  REVIEW = 'review',                     // Оставить отзыв
  SHARE = 'share',                       // Поделиться в соцсетях

  // Активность
  VISIT = 'visit',                       // Посетить N автоматов
  LOGIN_STREAK = 'login_streak',         // Заходить N дней подряд
  PROFILE_COMPLETE = 'profile_complete', // Заполнить профиль
  FIRST_ORDER = 'first_order',           // Первый заказ

  // Финансы
  PAYMENT_TYPE = 'payment_type',         // Использовать определенный тип оплаты
  SPEND_POINTS = 'spend_points',         // Потратить N баллов

  // Достижения
  LOYAL_CUSTOMER = 'loyal_customer',     // Достичь уровня лояльности
  COLLECTOR = 'collector',               // Попробовать N разных продуктов
}

/**
 * Статус квеста для пользователя
 */
export enum QuestStatus {
  AVAILABLE = 'available',       // Доступен для начала
  IN_PROGRESS = 'in_progress',   // В процессе выполнения
  COMPLETED = 'completed',       // Выполнен
  CLAIMED = 'claimed',           // Награда получена
  EXPIRED = 'expired',           // Истек
}

/**
 * Сложность квеста
 */
export enum QuestDifficulty {
  EASY = 'easy',           // Легкий
  MEDIUM = 'medium',       // Средний
  HARD = 'hard',           // Сложный
  LEGENDARY = 'legendary', // Легендарный
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Множители наград по сложности
 */
export const DIFFICULTY_MULTIPLIERS = {
  [QuestDifficulty.EASY]: 1,
  [QuestDifficulty.MEDIUM]: 1.5,
  [QuestDifficulty.HARD]: 2,
  [QuestDifficulty.LEGENDARY]: 3,
} as const;

/**
 * Иконки по сложности
 */
export const DIFFICULTY_ICONS = {
  [QuestDifficulty.EASY]: '⭐',
  [QuestDifficulty.MEDIUM]: '⭐⭐',
  [QuestDifficulty.HARD]: '⭐⭐⭐',
  [QuestDifficulty.LEGENDARY]: '🌟',
} as const;

/**
 * Цвета по сложности
 */
export const DIFFICULTY_COLORS = {
  [QuestDifficulty.EASY]: '#4CAF50',      // Зеленый
  [QuestDifficulty.MEDIUM]: '#FF9800',    // Оранжевый
  [QuestDifficulty.HARD]: '#F44336',      // Красный
  [QuestDifficulty.LEGENDARY]: '#9C27B0', // Фиолетовый
} as const;

/**
 * Шаблоны ежедневных квестов
 */
export const DAILY_QUEST_TEMPLATES = [
  {
    type: QuestType.ORDER_COUNT,
    targetValue: 1,
    baseReward: 10,
    title: 'Первый заказ дня',
    titleUz: 'Kunning birinchi buyurtmasi',
    description: 'Сделайте хотя бы один заказ',
    descriptionUz: 'Kamida bitta buyurtma bering',
  },
  {
    type: QuestType.ORDER_COUNT,
    targetValue: 3,
    baseReward: 30,
    title: 'Активный покупатель',
    titleUz: 'Faol xaridor',
    description: 'Сделайте 3 заказа за день',
    descriptionUz: 'Kun davomida 3 ta buyurtma bering',
  },
  {
    type: QuestType.ORDER_AMOUNT,
    targetValue: 50000,
    baseReward: 50,
    title: 'Щедрый день',
    titleUz: 'Saxiy kun',
    description: 'Закажите на сумму от 50 000 сум',
    descriptionUz: '50 000 so\'mdan ortiq buyurtma bering',
  },
  {
    type: QuestType.ORDER_TIME,
    targetValue: 1,
    baseReward: 20,
    title: 'Ранняя пташка',
    titleUz: 'Erta qush',
    description: 'Сделайте заказ до 9:00',
    descriptionUz: 'Soat 9:00 gacha buyurtma bering',
    metadata: { beforeHour: 9 },
  },
  {
    type: QuestType.ORDER_TIME,
    targetValue: 1,
    baseReward: 15,
    title: 'Полуночник',
    titleUz: 'Tun qushi',
    description: 'Сделайте заказ после 22:00',
    descriptionUz: 'Soat 22:00 dan keyin buyurtma bering',
    metadata: { afterHour: 22 },
  },
] as const;

/**
 * Шаблоны еженедельных квестов
 */
export const WEEKLY_QUEST_TEMPLATES = [
  {
    type: QuestType.ORDER_COUNT,
    targetValue: 10,
    baseReward: 100,
    title: 'Постоянный клиент',
    titleUz: 'Doimiy mijoz',
    description: 'Сделайте 10 заказов за неделю',
    descriptionUz: 'Hafta davomida 10 ta buyurtma bering',
  },
  {
    type: QuestType.ORDER_AMOUNT,
    targetValue: 200000,
    baseReward: 150,
    title: 'Большие траты',
    titleUz: 'Katta xarajatlar',
    description: 'Закажите на сумму от 200 000 сум',
    descriptionUz: '200 000 so\'mdan ortiq buyurtma bering',
  },
  {
    type: QuestType.VISIT,
    targetValue: 5,
    baseReward: 75,
    title: 'Исследователь',
    titleUz: 'Tadqiqotchi',
    description: 'Сделайте покупки в 5 разных автоматах',
    descriptionUz: '5 ta turli avtomatdan xarid qiling',
  },
  {
    type: QuestType.COLLECTOR,
    targetValue: 7,
    baseReward: 80,
    title: 'Гурман',
    titleUz: 'Gurman',
    description: 'Попробуйте 7 разных продуктов',
    descriptionUz: '7 xil mahsulotni sinab ko\'ring',
  },
  {
    type: QuestType.LOGIN_STREAK,
    targetValue: 7,
    baseReward: 70,
    title: 'Неделя активности',
    titleUz: 'Faollik haftasi',
    description: 'Заходите в приложение 7 дней подряд',
    descriptionUz: 'Ilovaga ketma-ket 7 kun kiring',
  },
] as const;

/**
 * Шаблоны ежемесячных квестов
 */
export const MONTHLY_QUEST_TEMPLATES = [
  {
    type: QuestType.ORDER_COUNT,
    targetValue: 30,
    baseReward: 300,
    title: 'Заказ каждый день',
    titleUz: 'Har kuni buyurtma',
    description: 'Сделайте 30 заказов за месяц',
    descriptionUz: 'Oy davomida 30 ta buyurtma bering',
  },
  {
    type: QuestType.ORDER_AMOUNT,
    targetValue: 500000,
    baseReward: 500,
    title: 'VIP клиент',
    titleUz: 'VIP mijoz',
    description: 'Закажите на сумму от 500 000 сум',
    descriptionUz: '500 000 so\'mdan ortiq buyurtma bering',
  },
  {
    type: QuestType.REFERRAL,
    targetValue: 3,
    baseReward: 400,
    title: 'Популяризатор',
    titleUz: 'Ommalashtiruvchi',
    description: 'Пригласите 3 друзей',
    descriptionUz: '3 ta do\'stingizni taklif qiling',
  },
  {
    type: QuestType.COLLECTOR,
    targetValue: 20,
    baseReward: 250,
    title: 'Коллекционер',
    titleUz: 'Kolleksioner',
    description: 'Попробуйте 20 разных продуктов',
    descriptionUz: '20 xil mahsulotni sinab ko\'ring',
  },
] as const;

/**
 * Разовые достижения
 */
export const ACHIEVEMENT_TEMPLATES = [
  {
    type: QuestType.FIRST_ORDER,
    targetValue: 1,
    baseReward: 50,
    title: 'Первый шаг',
    titleUz: 'Birinchi qadam',
    description: 'Сделайте свой первый заказ',
    descriptionUz: 'Birinchi buyurtmangizni bering',
    difficulty: QuestDifficulty.EASY,
  },
  {
    type: QuestType.PROFILE_COMPLETE,
    targetValue: 1,
    baseReward: 30,
    title: 'Знакомство',
    titleUz: 'Tanishuv',
    description: 'Заполните профиль полностью',
    descriptionUz: 'Profilingizni to\'liq to\'ldiring',
    difficulty: QuestDifficulty.EASY,
  },
  {
    type: QuestType.REFERRAL,
    targetValue: 1,
    baseReward: 100,
    title: 'Первое приглашение',
    titleUz: 'Birinchi taklif',
    description: 'Пригласите друга',
    descriptionUz: 'Do\'stingizni taklif qiling',
    difficulty: QuestDifficulty.EASY,
  },
  {
    type: QuestType.LOYAL_CUSTOMER,
    targetValue: 1,
    baseReward: 100,
    title: 'Серебряный статус',
    titleUz: 'Kumush maqom',
    description: 'Достигните уровня Серебро',
    descriptionUz: 'Kumush darajasiga yeting',
    difficulty: QuestDifficulty.MEDIUM,
    metadata: { requiredLevel: 'silver' },
  },
  {
    type: QuestType.LOYAL_CUSTOMER,
    targetValue: 1,
    baseReward: 200,
    title: 'Золотой статус',
    titleUz: 'Oltin maqom',
    description: 'Достигните уровня Золото',
    descriptionUz: 'Oltin darajasiga yeting',
    difficulty: QuestDifficulty.HARD,
    metadata: { requiredLevel: 'gold' },
  },
  {
    type: QuestType.LOYAL_CUSTOMER,
    targetValue: 1,
    baseReward: 500,
    title: 'Платиновый статус',
    titleUz: 'Platina maqom',
    description: 'Достигните уровня Платина',
    descriptionUz: 'Platina darajasiga yeting',
    difficulty: QuestDifficulty.LEGENDARY,
    metadata: { requiredLevel: 'platinum' },
  },
  {
    type: QuestType.ORDER_COUNT,
    targetValue: 100,
    baseReward: 1000,
    title: 'Сотня заказов',
    titleUz: 'Yuzta buyurtma',
    description: 'Сделайте 100 заказов',
    descriptionUz: '100 ta buyurtma bering',
    difficulty: QuestDifficulty.HARD,
  },
  {
    type: QuestType.COLLECTOR,
    targetValue: 50,
    baseReward: 500,
    title: 'Гурман-эксперт',
    titleUz: 'Gurman-ekspert',
    description: 'Попробуйте 50 разных продуктов',
    descriptionUz: '50 xil mahsulotni sinab ko\'ring',
    difficulty: QuestDifficulty.HARD,
  },
  {
    type: QuestType.VISIT,
    targetValue: 20,
    baseReward: 300,
    title: 'Путешественник',
    titleUz: 'Sayohatchi',
    description: 'Посетите 20 разных автоматов',
    descriptionUz: '20 ta turli avtomatga tashrif buyuring',
    difficulty: QuestDifficulty.HARD,
  },
  {
    type: QuestType.REFERRAL,
    targetValue: 10,
    baseReward: 1000,
    title: 'Амбассадор',
    titleUz: 'Ambassador',
    description: 'Пригласите 10 друзей',
    descriptionUz: '10 ta do\'stingizni taklif qiling',
    difficulty: QuestDifficulty.LEGENDARY,
  },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Получить следующий сброс для периода
 */
export function getNextReset(period: QuestPeriod): Date {
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(0, 0, 0, 0);

  switch (period) {
    case QuestPeriod.DAILY:
      // Завтра в полночь
      reset.setDate(reset.getDate() + 1);
      break;

    case QuestPeriod.WEEKLY:
      // Следующий понедельник
      const daysUntilMonday = (8 - reset.getDay()) % 7 || 7;
      reset.setDate(reset.getDate() + daysUntilMonday);
      break;

    case QuestPeriod.MONTHLY:
      // Первое число следующего месяца
      reset.setMonth(reset.getMonth() + 1, 1);
      break;

    default:
      // Для one_time и special - далеко в будущем
      reset.setFullYear(reset.getFullYear() + 100);
  }

  return reset;
}

/**
 * Получить начало текущего периода
 */
export function getPeriodStart(period: QuestPeriod): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case QuestPeriod.DAILY:
      // Сегодня в полночь
      break;

    case QuestPeriod.WEEKLY:
      // Начало текущей недели (понедельник)
      const dayOfWeek = start.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - daysFromMonday);
      break;

    case QuestPeriod.MONTHLY:
      // Начало текущего месяца
      start.setDate(1);
      break;

    default:
      // Для one_time - с начала времен
      start.setFullYear(2020, 0, 1);
  }

  return start;
}

/**
 * Выбрать случайные квесты из шаблонов
 */
export function selectRandomQuests<T>(templates: readonly T[], count: number): T[] {
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Рассчитать награду с учетом сложности
 */
export function calculateQuestReward(baseReward: number, difficulty: QuestDifficulty): number {
  return Math.floor(baseReward * DIFFICULTY_MULTIPLIERS[difficulty]);
}
