/**
 * Loyalty System Constants
 * Конфигурация программы лояльности VendHub
 */

import { LoyaltyLevel } from '../../users/entities/user.entity';

// Re-export for convenience
export { LoyaltyLevel };

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Тип транзакции баллов
 */
export enum PointsTransactionType {
  EARN = 'earn',       // Начисление
  SPEND = 'spend',     // Списание
  ADJUST = 'adjust',   // Корректировка админом
  EXPIRE = 'expire',   // Сгорание
}

/**
 * Источник баллов
 */
export enum PointsSource {
  // Начисления
  ORDER = 'order',                   // За заказ
  WELCOME_BONUS = 'welcome_bonus',   // За регистрацию
  FIRST_ORDER = 'first_order',       // За первый заказ
  REFERRAL = 'referral',             // За приглашенного друга
  REFERRAL_BONUS = 'referral_bonus', // Бонус приглашенному
  ACHIEVEMENT = 'achievement',       // За достижение
  DAILY_QUEST = 'daily_quest',       // За ежедневный квест
  WEEKLY_QUEST = 'weekly_quest',     // За еженедельный квест
  MONTHLY_QUEST = 'monthly_quest',   // За ежемесячный квест
  STREAK_BONUS = 'streak_bonus',     // За серию заказов
  PROMO = 'promo',                   // Промо-акция
  ADMIN = 'admin',                   // Корректировка админом
  BIRTHDAY = 'birthday',             // День рождения

  // Списания
  PURCHASE = 'purchase',             // Покупка за баллы
  REFUND = 'refund',                 // Возврат при отмене заказа
  EXPIRY = 'expiry',                 // Истечение срока
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Конфигурация уровней лояльности
 */
export const LOYALTY_LEVELS = {
  [LoyaltyLevel.BRONZE]: {
    name: 'Бронза',
    nameUz: 'Bronza',
    minPoints: 0,
    cashbackPercent: 1,      // 1% кэшбэк
    bonusMultiplier: 1,      // x1 множитель бонусов
    color: '#CD7F32',
    icon: '🥉',
  },
  [LoyaltyLevel.SILVER]: {
    name: 'Серебро',
    nameUz: 'Kumush',
    minPoints: 1000,
    cashbackPercent: 2,      // 2% кэшбэк
    bonusMultiplier: 1.2,    // x1.2 множитель бонусов
    color: '#C0C0C0',
    icon: '🥈',
  },
  [LoyaltyLevel.GOLD]: {
    name: 'Золото',
    nameUz: 'Oltin',
    minPoints: 5000,
    cashbackPercent: 3,      // 3% кэшбэк
    bonusMultiplier: 1.5,    // x1.5 множитель бонусов
    color: '#FFD700',
    icon: '🥇',
  },
  [LoyaltyLevel.PLATINUM]: {
    name: 'Платина',
    nameUz: 'Platina',
    minPoints: 20000,
    cashbackPercent: 5,      // 5% кэшбэк
    bonusMultiplier: 2,      // x2 множитель бонусов
    color: '#E5E4E2',
    icon: '💎',
  },
} as const;

/**
 * Бонусы программы лояльности
 */
export const LOYALTY_BONUSES = {
  // Разовые бонусы
  welcome: 100,              // За регистрацию
  firstOrder: 50,            // За первый заказ
  referral: 200,             // Кто пригласил
  referralBonus: 100,        // Кого пригласили
  birthday: 500,             // День рождения

  // Бонусы за серию (streak) - дней подряд
  streakDays: [3, 5, 7, 14, 30],         // Дни для бонусов
  streakBonus: [10, 20, 30, 50, 100],    // Соответствующие бонусы
} as const;

/**
 * Правила начисления баллов
 */
export const POINTS_RULES = {
  // Начисление за покупки
  pointsPerSum: 100,         // 1 балл за каждые 100 сум
  minOrderAmount: 5000,      // Минимальная сумма для начисления
  maxPointsPerOrder: 1000,   // Максимум баллов за один заказ

  // Истечение срока
  expiryDays: 365,           // Баллы сгорают через год
  expiryWarningDays: 30,     // Предупреждение за 30 дней

  // Использование баллов
  minPointsToSpend: 100,     // Минимум для списания
  maxPointsPercent: 50,      // Максимум 50% заказа баллами
  pointsValue: 1,            // 1 балл = 1 сум
} as const;

/**
 * Streak milestone descriptions
 */
export const STREAK_MILESTONES = [
  { days: 3, bonus: 10, message: '🔥 3 дня подряд!' },
  { days: 5, bonus: 20, message: '🔥🔥 5 дней подряд!' },
  { days: 7, bonus: 30, message: '🔥🔥🔥 Неделя подряд!' },
  { days: 14, bonus: 50, message: '⭐ 2 недели подряд!' },
  { days: 30, bonus: 100, message: '🏆 Месяц подряд!' },
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Определить уровень по количеству баллов
 */
export function getLoyaltyLevelByPoints(totalPoints: number): LoyaltyLevel {
  if (totalPoints >= LOYALTY_LEVELS.platinum.minPoints) return LoyaltyLevel.PLATINUM;
  if (totalPoints >= LOYALTY_LEVELS.gold.minPoints) return LoyaltyLevel.GOLD;
  if (totalPoints >= LOYALTY_LEVELS.silver.minPoints) return LoyaltyLevel.SILVER;
  return LoyaltyLevel.BRONZE;
}

/**
 * Получить следующий уровень
 */
export function getNextLevel(currentLevel: LoyaltyLevel): LoyaltyLevel | null {
  const levels = Object.values(LoyaltyLevel);
  const currentIndex = levels.indexOf(currentLevel);
  if (currentIndex < levels.length - 1) {
    return levels[currentIndex + 1];
  }
  return null;
}

/**
 * Рассчитать баллы до следующего уровня
 */
export function getPointsToNextLevel(currentPoints: number): { nextLevel: LoyaltyLevel | null; pointsNeeded: number } {
  const currentLevel = getLoyaltyLevelByPoints(currentPoints);
  const nextLevel = getNextLevel(currentLevel);

  if (!nextLevel) {
    return { nextLevel: null, pointsNeeded: 0 };
  }

  const pointsNeeded = LOYALTY_LEVELS[nextLevel].minPoints - currentPoints;
  return { nextLevel, pointsNeeded };
}

/**
 * Рассчитать баллы за заказ
 */
export function calculateOrderPoints(orderAmount: number, loyaltyLevel: LoyaltyLevel): number {
  if (orderAmount < POINTS_RULES.minOrderAmount) {
    return 0;
  }

  const levelConfig = LOYALTY_LEVELS[loyaltyLevel];
  const basePoints = Math.floor(orderAmount / POINTS_RULES.pointsPerSum);
  const multipliedPoints = Math.floor(basePoints * levelConfig.bonusMultiplier);

  return Math.min(multipliedPoints, POINTS_RULES.maxPointsPerOrder);
}

/**
 * Рассчитать кэшбэк
 */
export function calculateCashback(orderAmount: number, loyaltyLevel: LoyaltyLevel): number {
  const levelConfig = LOYALTY_LEVELS[loyaltyLevel];
  return Math.floor(orderAmount * (levelConfig.cashbackPercent / 100));
}

/**
 * Проверить достижение streak milestone
 */
export function getStreakBonus(currentStreak: number): { bonus: number; message: string } | null {
  const milestone = STREAK_MILESTONES.find(m => m.days === currentStreak);
  if (milestone) {
    return { bonus: milestone.bonus, message: milestone.message };
  }
  return null;
}

/**
 * Рассчитать дату истечения баллов
 */
export function calculateExpiryDate(earnedAt: Date = new Date()): Date {
  const expiryDate = new Date(earnedAt);
  expiryDate.setDate(expiryDate.getDate() + POINTS_RULES.expiryDays);
  return expiryDate;
}

/**
 * Проверить, можно ли потратить баллы
 */
export function validatePointsSpend(
  pointsBalance: number,
  pointsToSpend: number,
  orderAmount: number,
): { valid: boolean; error?: string } {
  if (pointsToSpend < POINTS_RULES.minPointsToSpend) {
    return { valid: false, error: `Минимум ${POINTS_RULES.minPointsToSpend} баллов для списания` };
  }

  if (pointsToSpend > pointsBalance) {
    return { valid: false, error: 'Недостаточно баллов' };
  }

  const maxPointsForOrder = Math.floor(orderAmount * (POINTS_RULES.maxPointsPercent / 100));
  if (pointsToSpend > maxPointsForOrder) {
    return { valid: false, error: `Максимум ${maxPointsForOrder} баллов для этого заказа (${POINTS_RULES.maxPointsPercent}%)` };
  }

  return { valid: true };
}
