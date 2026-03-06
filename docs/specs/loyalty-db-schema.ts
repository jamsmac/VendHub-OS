/**
 * VendHub Loyalty — Database Schema (Drizzle ORM + MySQL)
 * ═══════════════════════════════════════════════════════
 * Версия: 2.0 (после полного аудита)
 * Дата: 2026-02-27
 *
 * Таблицы:
 *   1. loyalty_profiles      — профиль лояльности пользователя
 *   2. balance_transactions   — append-only журнал баланса (U-08)
 *   3. loyalty_orders         — привязка заказов к лояльности
 *   4. badges                 — справочник бейджей
 *   5. user_badges            — выданные бейджи
 *   6. quests                 — квесты/челленджи
 *   7. user_quests            — прогресс по квестам
 *   8. referrals              — реферальная программа
 *   9. free_drinks            — учёт бесплатных напитков (R8: order-based auto-activation)
 *  10. notifications          — persistent-уведомления (U-22)
 *  11. streaks                — стрик-журнал
 *  12. promos                 — промо-акции
 *  13. user_promos            — привязка промо к юзерам
 *  14. dead_letter_queue      — DLQ для failed handlers (U-20)
 *  15. idempotency_keys       — идемпотентность обработки (U-20)
 *  16. transfer_logs          — журнал переводов баллов (R27)
 *  17. ad_views               — журнал просмотров рекламы
 *
 * Ключевые паттерны:
 *   - Append-only balance (INSERT + SUM вместо UPDATE)
 *   - AND-логика уровней (оба условия: заказы И сумма)
 *   - Кэшбэк от toPay (не от orderTotal)
 *   - minCash как % (Bronze 50%, Silver 30%, Gold 10%, Platinum фикс 1000, Diamond 10%)
 *   - Овердрафт Platinum до −50K UZS (toPay всегда ≥ 1000 R0)
 *   - Idempotency key: {orderId}:{handlerName}
 *   - Retry 3× (1s/5s/30s) + DLQ
 */

import {
  mysqlTable,
  mysqlEnum,
  int,
  bigint,
  varchar,
  text,
  boolean,
  datetime,
  decimal,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════

const loyaltyLevelEnum = mysqlEnum("loyalty_level", [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]);

const balanceTxTypeEnum = mysqlEnum("tx_type", [
  "cashback", // Кэшбэк за заказ
  "quest_reward", // Награда за квест
  "badge_reward", // Награда за бейдж
  "streak_reward", // Награда за стрик
  "referral_reward", // Реферальный бонус
  "registration", // Бонус за регистрацию
  "birthday", // Бонус ко дню рождения
  "promo", // Промо-начисление
  "ad_reward", // Rewarded ad баллы
  "spend", // Списание баллов при заказе
  "spend_reversal", // Возврат баллов при cancel
  "expiry", // Сгорание баллов (12 мес без заказов)
  "transfer_out", // Перевод другому (R27)
  "transfer_in", // Получение перевода (R27)
  "admin_adjustment", // Корректировка админом
  "win_back", // Win-back промо
]);

const questTypeEnum = mysqlEnum("quest_type", [
  "daily",
  "weekly",
  "monthly",
  "special",
]);

const questMetricEnum = mysqlEnum("quest_metric", [
  "order_count", // Количество заказов
  "spend_amount", // Сумма трат (toPay + pointsUsed, исключая Free Drink)
  "category_buy", // Покупка определённой категории
  "streak_days", // Стрик N дней
  "referral_count", // Количество рефералов
  "ad_views", // Просмотры рекламы
]);

const notificationTypeEnum = mysqlEnum("notification_type", [
  "cashback",
  "level_up",
  "level_down",
  "badge_earned",
  "quest_completed",
  "streak_milestone",
  "free_drink",
  "promo",
  "referral",
  "birthday",
  "expiry_warning",
  "win_back",
]);

const dlqStatusEnum = mysqlEnum("dlq_status", [
  "pending",
  "retrying",
  "resolved",
  "dead",
]);

// ═══════════════════════════════════════════════════════════
// 1. LOYALTY PROFILES
// ═══════════════════════════════════════════════════════════

/**
 * Профиль лояльности пользователя.
 * Кэширует balance (= SUM из balance_transactions).
 * AND-логика: уровень повышается когда ОБА условия выполнены.
 */
export const loyaltyProfiles = mysqlTable(
  "loyalty_profiles",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    // .references(() => users.id) — FK на основную таблицу users

    // === Уровень ===
    level: loyaltyLevelEnum.notNull().default("bronze"),
    totalOrders: int("total_orders").notNull().default(0),
    /** Кумулятивная сумма toPay (для AND-логики уровней) */
    totalSpent: bigint("total_spent", { mode: "number" }).notNull().default(0),

    // === Баланс (кэш, источник правды = SUM(balance_transactions)) ===
    /** Кэшированный баланс в UZS. Может быть отрицательным для Platinum (овердрафт до −50K) */
    balance: bigint("balance", { mode: "number" }).notNull().default(0),

    // === Стрик ===
    currentStreak: int("current_streak").notNull().default(0),
    longestStreak: int("longest_streak").notNull().default(0),
    /** Был ли order.completed сегодня (Asia/Tashkent). CRON 00:05 сбрасывает */
    hasOrderToday: boolean("has_order_today").notNull().default(false),

    // === Free Drink ===
    /** Счётчик заказов до следующего Free Drink (Gold: /10, Platinum: /5, Diamond: /3) R8 */
    ordersSinceLastFreeDrink: int("orders_since_last_free_drink")
      .notNull()
      .default(0),

    // === Реферальная ===
    referralCode: varchar("referral_code", { length: 20 }).notNull(),
    /** userId того, кто пригласил (бессрочная привязка) */
    referredBy: int("referred_by"),
    referralsToday: int("referrals_today").notNull().default(0),
    referralsThisMonth: int("referrals_this_month").notNull().default(0),

    // === Персональные данные ===
    birthday: datetime("birthday"),
    /** Админ может изменить ДР 1 раз с документом */
    birthdayEditedByAdmin: boolean("birthday_edited_by_admin")
      .notNull()
      .default(false),

    // === Telegram ===
    telegramBotLinked: boolean("telegram_bot_linked").notNull().default(false),
    telegramChannelLinked: boolean("telegram_channel_linked")
      .notNull()
      .default(false),

    // === Grace Period ===
    /** registeredAt + 24h (U-21: строгие 24 часа, не до полуночи) */
    gracePeriodEndsAt: datetime("grace_period_ends_at").notNull(),

    // === Win-back ===
    lastOrderAt: datetime("last_order_at"),
    winBackLevel: int("win_back_level").notNull().default(0), // 0=none, 1=5K sent, 2=10K sent
    winBackResetAt: datetime("win_back_reset_at"),

    // === Сгорание ===
    /** Последний order.completed — только он сбрасывает 12-мес таймер (U-23) */
    lastCompletedOrderAt: datetime("last_completed_order_at"),

    // === Мета ===
    registeredAt: datetime("registered_at").notNull().defaultNow(),
    createdAt: datetime("created_at").notNull().defaultNow(),
    updatedAt: datetime("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    userIdx: uniqueIndex("loyalty_profiles_user_idx").on(table.userId),
    levelIdx: index("loyalty_profiles_level_idx").on(table.level),
    referralCodeIdx: uniqueIndex("loyalty_profiles_referral_code_idx").on(
      table.referralCode,
    ),
    lastCompletedIdx: index("loyalty_profiles_last_completed_idx").on(
      table.lastCompletedOrderAt,
    ),
    winBackIdx: index("loyalty_profiles_win_back_idx").on(
      table.winBackLevel,
      table.lastOrderAt,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 2. BALANCE TRANSACTIONS (append-only, U-08)
// ═══════════════════════════════════════════════════════════

/**
 * Append-only журнал баланса.
 * balance = SELECT SUM(amount) FROM balance_transactions WHERE userId = ?
 * Кэшируется в loyalty_profiles.balance
 */
export const balanceTransactions = mysqlTable(
  "balance_transactions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    txType: balanceTxTypeEnum.notNull(),

    /** Сумма в UZS. Положительная = начисление, отрицательная = списание */
    amount: bigint("amount", { mode: "number" }).notNull(),

    /** Баланс ПОСЛЕ этой транзакции (для быстрой сверки) */
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),

    /** Привязка к заказу (если есть) */
    orderId: int("order_id"),

    /** Описание для истории в приложении */
    description: varchar("description", { length: 500 }),

    /** Дополнительные данные: {questId, badgeId, promoId, referralUserId, ...} */
    metadata: json("metadata"),

    /** Идемпотентность: {orderId}:{handlerName} */
    idempotencyKey: varchar("idempotency_key", { length: 100 }),

    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("balance_tx_user_idx").on(table.userId),
    userTypeIdx: index("balance_tx_user_type_idx").on(
      table.userId,
      table.txType,
    ),
    orderIdx: index("balance_tx_order_idx").on(table.orderId),
    idempotencyIdx: uniqueIndex("balance_tx_idempotency_idx").on(
      table.idempotencyKey,
    ),
    createdAtIdx: index("balance_tx_created_idx").on(table.createdAt),
  }),
);

// ═══════════════════════════════════════════════════════════
// 3. LOYALTY ORDERS
// ═══════════════════════════════════════════════════════════

/**
 * Связь заказа с лояльностью — расширенный payload (U-15).
 * Хранит расчёты minCash, toPay, cashback для каждого заказа.
 */
export const loyaltyOrders = mysqlTable(
  "loyalty_orders",
  {
    id: int("id").primaryKey().autoincrement(),
    orderId: int("order_id").notNull(),
    userId: int("user_id").notNull(),
    machineId: int("machine_id").notNull(),

    // === Расчёт оплаты ===
    orderTotal: bigint("order_total", { mode: "number" }).notNull(),
    /** minCash = (platinum) ? 1000 : max(1000, ceil(orderTotal × rate / 100) × 100) */
    minCash: bigint("min_cash", { mode: "number" }).notNull(),
    /** pointsToUse = min(orderTotal - minCash, availableBalance) */
    pointsUsed: bigint("points_used", { mode: "number" }).notNull().default(0),
    /** toPay = orderTotal - pointsUsed */
    toPay: bigint("to_pay", { mode: "number" }).notNull(),
    /** cashback = floor(toPay × cashbackRate) */
    cashback: bigint("cashback", { mode: "number" }).notNull().default(0),

    // === Контекст заказа (U-15: +4 поля) ===
    levelAtOrder: loyaltyLevelEnum.notNull(),
    isFirstOrder: boolean("is_first_order").notNull().default(false),
    isFreeDrink: boolean("is_free_drink").notNull().default(false),
    /** JSON массив [{productId, name, price, qty}] */
    items: json("items"),

    // === Статус ===
    status: mysqlEnum("status", ["pending", "completed", "cancelled"])
      .notNull()
      .default("pending"),
    completedAt: datetime("completed_at"),
    cancelledAt: datetime("cancelled_at"),

    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: uniqueIndex("loyalty_orders_order_idx").on(table.orderId),
    userIdx: index("loyalty_orders_user_idx").on(table.userId),
    /** Для isFirstOrder race condition protection (U-19) */
    firstOrderIdx: uniqueIndex("loyalty_orders_first_order_idx").on(
      table.userId,
      table.isFirstOrder,
    ),
    statusIdx: index("loyalty_orders_status_idx").on(table.status),
  }),
);

// ═══════════════════════════════════════════════════════════
// 4. BADGES (справочник)
// ═══════════════════════════════════════════════════════════

export const badges = mysqlTable(
  "badges",
  {
    id: int("id").primaryKey().autoincrement(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    description: varchar("description", { length: 500 }),
    icon: varchar("icon", { length: 100 }),

    /** Награда в UZS за получение бейджа */
    rewardAmount: bigint("reward_amount", { mode: "number" })
      .notNull()
      .default(0),

    /** Категория: registration, order, referral, level, streak, quest, special */
    category: varchar("category", { length: 30 }).notNull(),

    /** Условие получения (JSON): {type: "order_count", value: 10} */
    condition: json("condition"),

    isActive: boolean("is_active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),

    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("badges_code_idx").on(table.code),
  }),
);

// ═══════════════════════════════════════════════════════════
// 5. USER BADGES
// ═══════════════════════════════════════════════════════════

/**
 * Выданные бейджи. ON CONFLICT DO NOTHING (U-11).
 * badge ⑤ (Ранняя пташка) проверяет только 9 бейджей (order+ref+reg).
 */
export const userBadges = mysqlTable(
  "user_badges",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    badgeId: int("badge_id").notNull(),
    /** Заказ, который триггернул бейдж (для rollback при cancel) */
    earnedByOrderId: int("earned_by_order_id"),
    earnedAt: datetime("earned_at").notNull().defaultNow(),
  },
  (table) => ({
    /** UNIQUE: 1 бейдж на юзера (ON CONFLICT DO NOTHING) */
    userBadgeIdx: uniqueIndex("user_badges_unique_idx").on(
      table.userId,
      table.badgeId,
    ),
    userIdx: index("user_badges_user_idx").on(table.userId),
  }),
);

// ═══════════════════════════════════════════════════════════
// 6. QUESTS
// ═══════════════════════════════════════════════════════════

/**
 * Квесты/челленджи. ×4 полных недели в месяц (U-33).
 * Spend для квестов = toPay + pointsUsed (исключает Free Drink, U-17).
 */
export const quests = mysqlTable(
  "quests",
  {
    id: int("id").primaryKey().autoincrement(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: varchar("description", { length: 500 }),
    icon: varchar("icon", { length: 100 }),

    questType: questTypeEnum.notNull(),
    metric: questMetricEnum.notNull(),
    targetValue: bigint("target_value", { mode: "number" }).notNull(),

    /** Награда в UZS */
    rewardAmount: bigint("reward_amount", { mode: "number" }).notNull(),

    /** Минимальный уровень для участия */
    minLevel: loyaltyLevelEnum.default("bronze"),

    /** Даты активности */
    startsAt: datetime("starts_at").notNull(),
    endsAt: datetime("ends_at").notNull(),

    /** Максимум активаций за период (×4 для weekly) */
    maxActivations: int("max_activations").notNull().default(1),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("quests_code_idx").on(table.code),
    activeIdx: index("quests_active_idx").on(
      table.isActive,
      table.startsAt,
      table.endsAt,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 7. USER QUESTS
// ═══════════════════════════════════════════════════════════

/**
 * Прогресс по квестам.
 * progress ≥ target → выполнен, заморожен (U-26 overflow).
 * Откат: только если orderId = completedByOrderId (U-13).
 * progress = max(0, progress - amount) при откате (U-14).
 */
export const userQuests = mysqlTable(
  "user_quests",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    questId: int("quest_id").notNull(),

    progress: bigint("progress", { mode: "number" }).notNull().default(0),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: datetime("completed_at"),
    /** orderId, который завершил квест (для проверки при откате) */
    completedByOrderId: int("completed_by_order_id"),

    /** Награда выплачена */
    rewardPaid: boolean("reward_paid").notNull().default(false),
    rewardTxId: bigint("reward_tx_id", { mode: "number" }),

    activationCount: int("activation_count").notNull().default(1),

    createdAt: datetime("created_at").notNull().defaultNow(),
    updatedAt: datetime("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    userQuestIdx: index("user_quests_user_quest_idx").on(
      table.userId,
      table.questId,
    ),
    activeIdx: index("user_quests_active_idx").on(
      table.userId,
      table.isCompleted,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 8. REFERRALS
// ═══════════════════════════════════════════════════════════

/**
 * Реферальная программа.
 * Порог: 5K UZS (U-12). Лимит: 5/день + 50/месяц (C03).
 * Ссылка бессрочная, привязана к userId (U-25).
 */
export const referrals = mysqlTable(
  "referrals",
  {
    id: int("id").primaryKey().autoincrement(),
    referrerId: int("referrer_id").notNull(),
    referredUserId: int("referred_user_id").notNull(),

    /** Реферал засчитан (порог 5K выполнен) */
    isQualified: boolean("is_qualified").notNull().default(false),
    qualifiedAt: datetime("qualified_at"),
    qualifyingOrderId: int("qualifying_order_id"),

    /** Бонус выплачен реферреру */
    referrerBonusPaid: boolean("referrer_bonus_paid").notNull().default(false),
    referrerBonusTxId: bigint("referrer_bonus_tx_id", { mode: "number" }),

    /** Бонус выплачен рефералу */
    referredBonusPaid: boolean("referred_bonus_paid").notNull().default(false),
    referredBonusTxId: bigint("referred_bonus_tx_id", { mode: "number" }),

    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    referredIdx: uniqueIndex("referrals_referred_idx").on(table.referredUserId),
    referrerIdx: index("referrals_referrer_idx").on(table.referrerId),
    referrerDayIdx: index("referrals_referrer_day_idx").on(
      table.referrerId,
      table.createdAt,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 9. FREE DRINKS (R8: order-based auto-activation)
// ═══════════════════════════════════════════════════════════

/**
 * Учёт бесплатных напитков (R8).
 * Авто-активация: Gold /10, Platinum /5, Diamond /3 (по счётчику заказов).
 * Diamond: авто-активация при каждом 3-м заказе (без накопления).
 * Макс. накопление: 2 одновременно (кроме Diamond).
 * Expiry: 1 месяц с момента выдачи.
 * Использование: FIFO по дате выдачи.
 * Каждый free drink = оплата 1,000 UZS (R0).
 */
export const freeDrinks = mysqlTable(
  "free_drinks",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),

    /** Номер заказа, на котором заработан free drink */
    earnedAtOrderNumber: int("earned_at_order_number").notNull(),
    /** orderId, триггернувший выдачу */
    earnedByOrderId: int("earned_by_order_id"),

    isUsed: boolean("is_used").notNull().default(false),
    usedAt: datetime("used_at"),
    usedOrderId: int("used_order_id"),

    expiresAt: datetime("expires_at").notNull(),
    isExpired: boolean("is_expired").notNull().default(false),

    earnedAt: datetime("earned_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("free_drinks_user_idx").on(
      table.userId,
      table.isUsed,
      table.isExpired,
    ),
    expiryIdx: index("free_drinks_expiry_idx").on(
      table.expiresAt,
      table.isExpired,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 10. NOTIFICATIONS (U-22: persistent)
// ═══════════════════════════════════════════════════════════

/**
 * Persistent-уведомления (не только in-app toast).
 * TTL: 90 дней. Пагинация. Бейджик «N новых».
 */
export const notifications = mysqlTable(
  "notifications",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    type: notificationTypeEnum.notNull(),

    title: varchar("title", { length: 200 }).notNull(),
    body: varchar("body", { length: 500 }).notNull(),
    /** Доп. данные: {amount, level, badgeName, questName, ...} */
    data: json("data"),

    isRead: boolean("is_read").notNull().default(false),
    readAt: datetime("read_at"),

    createdAt: datetime("created_at").notNull().defaultNow(),
    /** TTL 90 дней */
    expiresAt: datetime("expires_at").notNull(),
  },
  (table) => ({
    userReadIdx: index("notifications_user_read_idx").on(
      table.userId,
      table.isRead,
    ),
    userCreatedIdx: index("notifications_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    expiryIdx: index("notifications_expiry_idx").on(table.expiresAt),
  }),
);

// ═══════════════════════════════════════════════════════════
// 11. STREAKS
// ═══════════════════════════════════════════════════════════

/**
 * Стрик-журнал.
 * Инкремент: мгновенно при order.completed (U-06).
 * Reset: CRON 00:05 Asia/Tashkent, только если hasOrderToday=false.
 */
export const streakLogs = mysqlTable(
  "streak_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    userId: int("user_id").notNull(),

    /** Дата в Asia/Tashkent (YYYY-MM-DD) */
    streakDate: varchar("streak_date", { length: 10 }).notNull(),
    /** Значение стрика на этот день */
    streakValue: int("streak_value").notNull(),
    /** Был ли сброс */
    wasReset: boolean("was_reset").notNull().default(false),

    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: uniqueIndex("streak_logs_user_date_idx").on(
      table.userId,
      table.streakDate,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 12. PROMOS
// ═══════════════════════════════════════════════════════════

/**
 * Промо-акции. Giftable: transferLimit = 1 (C04).
 */
export const promos = mysqlTable(
  "promos",
  {
    id: int("id").primaryKey().autoincrement(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: varchar("description", { length: 500 }),

    /** Тип: bonus (начисление), discount (скидка %) */
    promoType: mysqlEnum("promo_type", [
      "bonus",
      "discount",
      "free_drink",
      "win_back",
    ]).notNull(),

    /** Сумма бонуса в UZS или % скидки */
    value: bigint("value", { mode: "number" }).notNull(),

    /** Giftable: можно передать другому (C04: transferLimit=1) */
    isGiftable: boolean("is_giftable").notNull().default(false),
    transferLimit: int("transfer_limit").notNull().default(1),

    /** Ограничения */
    minLevel: loyaltyLevelEnum.default("bronze"),
    maxUses: int("max_uses"), // null = unlimited
    currentUses: int("current_uses").notNull().default(0),

    startsAt: datetime("starts_at").notNull(),
    endsAt: datetime("ends_at").notNull(),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: uniqueIndex("promos_code_idx").on(table.code),
    activeIdx: index("promos_active_idx").on(
      table.isActive,
      table.startsAt,
      table.endsAt,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 13. USER PROMOS
// ═══════════════════════════════════════════════════════════

export const userPromos = mysqlTable(
  "user_promos",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    promoId: int("promo_id").notNull(),

    isUsed: boolean("is_used").notNull().default(false),
    usedAt: datetime("used_at"),
    usedOrderId: int("used_order_id"),

    /** Количество передач (для giftable, max = transferLimit) */
    transferCount: int("transfer_count").notNull().default(0),
    /** Кому передан */
    transferredToUserId: int("transferred_to_user_id"),

    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userPromoIdx: index("user_promos_user_promo_idx").on(
      table.userId,
      table.promoId,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 14. DEAD LETTER QUEUE (U-20)
// ═══════════════════════════════════════════════════════════

/**
 * DLQ для событий, которые не удалось обработать после 3 ретраев.
 * Retry: 1s → 5s → 30s. После 3-й попытки → dead.
 */
export const deadLetterQueue = mysqlTable(
  "dead_letter_queue",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),

    /** Название обработчика */
    handlerName: varchar("handler_name", { length: 100 }).notNull(),
    /** Идемпотентный ключ: {orderId}:{handlerName} */
    idempotencyKey: varchar("idempotency_key", { length: 100 }).notNull(),

    /** Входные данные события (JSON) */
    payload: json("payload").notNull(),

    /** Ошибка */
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),

    status: dlqStatusEnum.notNull().default("pending"),
    retryCount: int("retry_count").notNull().default(0),
    maxRetries: int("max_retries").notNull().default(3),
    nextRetryAt: datetime("next_retry_at"),
    resolvedAt: datetime("resolved_at"),

    createdAt: datetime("created_at").notNull().defaultNow(),
    updatedAt: datetime("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    statusIdx: index("dlq_status_idx").on(table.status, table.nextRetryAt),
    handlerIdx: index("dlq_handler_idx").on(table.handlerName),
    idempotencyIdx: index("dlq_idempotency_idx").on(table.idempotencyKey),
  }),
);

// ═══════════════════════════════════════════════════════════
// 15. IDEMPOTENCY KEYS (U-20)
// ═══════════════════════════════════════════════════════════

/**
 * Реестр выполненных операций для гарантии idempotency.
 * Ключ: {orderId}:{handlerName}
 * TTL: 7 дней (достаточно для покрытия retry window).
 */
export const idempotencyKeys = mysqlTable(
  "idempotency_keys",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    key: varchar("key", { length: 100 }).notNull(),
    handlerName: varchar("handler_name", { length: 100 }).notNull(),

    /** Результат обработки */
    result: json("result"),

    createdAt: datetime("created_at").notNull().defaultNow(),
    expiresAt: datetime("expires_at").notNull(),
  },
  (table) => ({
    keyIdx: uniqueIndex("idempotency_keys_key_idx").on(table.key),
    expiryIdx: index("idempotency_keys_expiry_idx").on(table.expiresAt),
  }),
);

// ═══════════════════════════════════════════════════════════
// 16. TRANSFER LOGS (R27: Silver+ переводы баллов)
// ═══════════════════════════════════════════════════════════

/**
 * Журнал переводов баллов между пользователями (R27).
 * Silver+ могут отправлять. Min 5K, max 3/день, 50K/день.
 * Комиссия 0%. Получатель — любой уровень.
 */
export const transferLogs = mysqlTable(
  "transfer_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    senderId: int("sender_id").notNull(),
    recipientId: int("recipient_id").notNull(),

    /** Сумма перевода в UZS (кратность 100, min 5000) */
    amount: bigint("amount", { mode: "number" }).notNull(),

    /** Уровень отправителя на момент перевода */
    senderLevelAtTransfer: loyaltyLevelEnum.notNull(),

    /** Связанные транзакции баланса */
    senderTxId: bigint("sender_tx_id", { mode: "number" }).notNull(),
    recipientTxId: bigint("recipient_tx_id", { mode: "number" }).notNull(),

    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    senderIdx: index("transfer_logs_sender_idx").on(
      table.senderId,
      table.createdAt,
    ),
    recipientIdx: index("transfer_logs_recipient_idx").on(table.recipientId),
    /** Для проверки лимита 3/день и 50K/день */
    senderDayIdx: index("transfer_logs_sender_day_idx").on(
      table.senderId,
      table.createdAt,
    ),
  }),
);

// ═══════════════════════════════════════════════════════════
// 17. AD VIEWS (Rewarded Ads tracking)
// ═══════════════════════════════════════════════════════════

/**
 * Журнал просмотров рекламы (Rewarded Ads).
 * Лимиты/день по уровням: Bronze 3, Silver 5, Gold 50, Platinum 100, Diamond ∞.
 * CPV (UZS): Bronze/Silver 500, Gold 700, Platinum 1000, Diamond 1500.
 */
export const adViews = mysqlTable(
  "ad_views",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    userId: int("user_id").notNull(),

    /** ID рекламного контента */
    adId: int("ad_id").notNull(),
    /** Тип: video, banner, quiz, survey, mini_game, promo_story */
    adType: varchar("ad_type", { length: 30 }).notNull(),

    /** Доля просмотра (0-1). 1 = полный просмотр, <1 = скипнул */
    completionRate: decimal("completion_rate", {
      precision: 3,
      scale: 2,
    }).notNull(),
    /** Награда в UZS (0 если скипнул) */
    reward: bigint("reward", { mode: "number" }).notNull().default(0),
    /** Связанная транзакция баланса */
    balanceTxId: bigint("balance_tx_id", { mode: "number" }),

    /** Уровень на момент просмотра (для CPV расчёта) */
    levelAtView: loyaltyLevelEnum.notNull(),

    /** Дата в Asia/Tashkent (YYYY-MM-DD) для проверки daily limit */
    viewDate: varchar("view_date", { length: 10 }).notNull(),

    createdAt: datetime("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index("ad_views_user_date_idx").on(
      table.userId,
      table.viewDate,
    ),
    adIdx: index("ad_views_ad_idx").on(table.adId),
  }),
);

// ═══════════════════════════════════════════════════════════
// RELATIONS
// ═══════════════════════════════════════════════════════════

export const loyaltyProfilesRelations = relations(
  loyaltyProfiles,
  ({ many }) => ({
    balanceTransactions: many(balanceTransactions),
    loyaltyOrders: many(loyaltyOrders),
    userBadges: many(userBadges),
    userQuests: many(userQuests),
    referralsGiven: many(referrals),
    freeDrinks: many(freeDrinks),
    notifications: many(notifications),
    streakLogs: many(streakLogs),
    userPromos: many(userPromos),
    transfersSent: many(transferLogs),
    adViews: many(adViews),
  }),
);

export const balanceTransactionsRelations = relations(
  balanceTransactions,
  ({ one }) => ({
    profile: one(loyaltyProfiles, {
      fields: [balanceTransactions.userId],
      references: [loyaltyProfiles.userId],
    }),
  }),
);

export const loyaltyOrdersRelations = relations(loyaltyOrders, ({ one }) => ({
  profile: one(loyaltyProfiles, {
    fields: [loyaltyOrders.userId],
    references: [loyaltyProfiles.userId],
  }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  profile: one(loyaltyProfiles, {
    fields: [userBadges.userId],
    references: [loyaltyProfiles.userId],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const userQuestsRelations = relations(userQuests, ({ one }) => ({
  profile: one(loyaltyProfiles, {
    fields: [userQuests.userId],
    references: [loyaltyProfiles.userId],
  }),
  quest: one(quests, {
    fields: [userQuests.questId],
    references: [quests.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(loyaltyProfiles, {
    fields: [referrals.referrerId],
    references: [loyaltyProfiles.userId],
  }),
}));

export const freeDrinksRelations = relations(freeDrinks, ({ one }) => ({
  profile: one(loyaltyProfiles, {
    fields: [freeDrinks.userId],
    references: [loyaltyProfiles.userId],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  profile: one(loyaltyProfiles, {
    fields: [notifications.userId],
    references: [loyaltyProfiles.userId],
  }),
}));

export const userPromosRelations = relations(userPromos, ({ one }) => ({
  profile: one(loyaltyProfiles, {
    fields: [userPromos.userId],
    references: [loyaltyProfiles.userId],
  }),
  promo: one(promos, {
    fields: [userPromos.promoId],
    references: [promos.id],
  }),
}));

export const transferLogsRelations = relations(transferLogs, ({ one }) => ({
  sender: one(loyaltyProfiles, {
    fields: [transferLogs.senderId],
    references: [loyaltyProfiles.userId],
  }),
}));

export const adViewsRelations = relations(adViews, ({ one }) => ({
  profile: one(loyaltyProfiles, {
    fields: [adViews.userId],
    references: [loyaltyProfiles.userId],
  }),
}));

// ═══════════════════════════════════════════════════════════
// LEVEL CONFIG (type-safe constants)
// ═══════════════════════════════════════════════════════════

/**
 * Конфигурация уровней. AND-логика: оба условия обязательны.
 *
 * ФОРМУЛЫ:
 *   minCash = (level === 'platinum')
 *     ? 1000  // фиксированный
 *     : Math.max(1000, Math.ceil(orderTotal * minCashRate / 100) * 100)
 *     // Bronze 50%, Silver 30%, Gold 10%, Platinum фикс 1K, Diamond 10%
 *
 *   availableBalance = (level === 'platinum')
 *     ? Math.max(0, balance + 50000)  // овердрафт до −50K
 *     : Math.max(0, balance)  // все остальные, включая Diamond
 *
 *   pointsToUse = Math.min(orderTotal - minCash, availableBalance)
 *   toPay = orderTotal - pointsToUse
 *   cashback = Math.floor(toPay * cashbackRate)
 */
export const LEVEL_CONFIG = {
  bronze: {
    minOrders: 0,
    minSpent: 0,
    cashbackRate: 0.01,
    minCashRate: 0.5,
    minCashFixed: null,
    freeDrinkEvery: null,
    overdraftLimit: 0,
    questMultiplier: 1, // R23
    birthdayBonus: 10_000, // R26
    adsLimitPerDay: 3, // Canonical ads tab
    adsCPV: 500, // UZS per view
  },
  silver: {
    minOrders: 10,
    minSpent: 200_000,
    cashbackRate: 0.03, // R2: 3% (was 0.02 — FIXED)
    minCashRate: 0.3,
    minCashFixed: null,
    freeDrinkEvery: null,
    overdraftLimit: 0,
    questMultiplier: 1, // R23
    birthdayBonus: 20_000, // R26
    adsLimitPerDay: 5,
    adsCPV: 500,
  },
  gold: {
    minOrders: 30, // R1: 30 (was 25 — FIXED)
    minSpent: 750_000, // R1: 750K (was 500K — FIXED)
    cashbackRate: 0.05, // R2: 5% (was 0.03 — FIXED)
    minCashRate: 0.1,
    minCashFixed: null,
    freeDrinkEvery: 10, // R8
    overdraftLimit: 0,
    questMultiplier: 1.5, // R23
    birthdayBonus: 30_000, // R26
    adsLimitPerDay: 50,
    adsCPV: 700,
  },
  platinum: {
    minOrders: 100, // R1: 100 (was 50 — FIXED)
    minSpent: 2_000_000, // R1: 2M (was 1M — FIXED)
    cashbackRate: 0.1,
    minCashRate: null, // фикс 1000
    minCashFixed: 1000,
    freeDrinkEvery: 5, // R8
    overdraftLimit: 50_000,
    questMultiplier: 2, // R23
    birthdayBonus: 50_000, // R26
    adsLimitPerDay: 100,
    adsCPV: 1000,
  },
  diamond: {
    minOrders: 300, // R1: 300
    minSpent: 6_000_000, // R1: 6M
    cashbackRate: 0.15, // R2: 15%
    minCashRate: 0.1, // R3: 10%
    minCashFixed: null,
    freeDrinkEvery: 3, // R8: авто-активация /3 (без накопления)
    overdraftLimit: 0,
    questMultiplier: 3, // R23
    birthdayBonus: 75_000, // R26
    adsLimitPerDay: Infinity,
    adsCPV: 1500,
  },
} as const;

/**
 * Anti-fraud лимиты
 */
export const ANTI_FRAUD = {
  /** Алерт при начислении > 75K за день (U-16) */
  dailyAlertThreshold: 75_000,
  /** Реферальный лимит: 5/день (C03) */
  referralDailyLimit: 5,
  /** Реферальный лимит: 50/месяц (C03) */
  referralMonthlyLimit: 50,
  /** Реферальный порог: 5K UZS (U-12) */
  referralQualifyThreshold: 5_000,
  /** Сгорание: 12 месяцев без order.completed (U-23) */
  expiryMonths: 12,
  /** Win-back: 1-й уровень через 14 дней (U-34) */
  winBackLevel1Days: 14,
  winBackLevel1Amount: 5_000,
  /** Win-back: 2-й уровень через 30 дней после 1-го (U-34) */
  winBackLevel2Days: 30,
  winBackLevel2Amount: 10_000,
} as const;

/**
 * Retry конфигурация для handler failures (U-20)
 */
export const RETRY_CONFIG = {
  maxRetries: 3,
  delays: [1000, 5000, 30000], // 1s, 5s, 30s
} as const;
