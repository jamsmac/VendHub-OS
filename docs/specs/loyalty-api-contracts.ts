/**
 * VendHub Loyalty — tRPC API Contracts
 * ═══════════════════════════════════════
 * Версия: 2.0 (после полного аудита)
 * Дата: 2026-02-27
 *
 * Роутеры:
 *   1. loyalty.profile       — профиль, баланс, уровень
 *   2. loyalty.order          — обработка заказов
 *   3. loyalty.badges         — бейджи (13 шт., R25)
 *   4. loyalty.quests         — квесты/челленджи
 *   5. loyalty.referral       — реферальная программа (порог 5K, +10K обоим)
 *   6. loyalty.rewards        — free drinks, промокоды
 *   7. loyalty.transfer       — переводы баллов (R27, Silver+)
 *   8. loyalty.ads            — rewarded ads (6 типов, per-level лимиты)
 *   9. loyalty.notifications  — persistent уведомления (U-22)
 *  10. loyalty.admin          — админские операции
 *  11. loyalty.cron           — CRON-задачи
 *
 * Ключевые паттерны:
 *   - Все мутации через event-driven handler (order.completed)
 *   - Idempotency key: {orderId}:{handlerName}
 *   - Retry 3× (1s/5s/30s) + DLQ
 *   - Append-only balance (INSERT, не UPDATE)
 *   - Кэшбэк от toPay, не от orderTotal
 *   - AND-логика уровней
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════
// SHARED SCHEMAS (Zod)
// ═══════════════════════════════════════════════════════════

const LevelEnum = z.enum(["bronze", "silver", "gold", "platinum", "diamond"]);

const PaginationInput = z.object({
  cursor: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
});

const DateRange = z.object({
  from: z.date(),
  to: z.date(),
});

// ═══════════════════════════════════════════════════════════
// 1. LOYALTY.PROFILE
// ═══════════════════════════════════════════════════════════

export const profileRouter = {
  /**
   * Получить профиль лояльности текущего пользователя.
   * Включает: уровень, баланс, стрик, прогресс до след. уровня.
   */
  "profile.get": {
    type: "query" as const,
    input: z.void(),
    output: z.object({
      userId: z.number(),
      level: LevelEnum,
      balance: z.number(),
      /** availableBalance = (platinum) ? max(0, balance + 50000) : max(0, balance) */
      availableBalance: z.number(),
      totalOrders: z.number(),
      totalSpent: z.number(),
      currentStreak: z.number(),
      longestStreak: z.number(),

      // Прогресс до следующего уровня (AND-логика)
      nextLevel: z.object({
        level: LevelEnum.nullable(),
        ordersRequired: z.number(),
        ordersProgress: z.number(),
        spentRequired: z.number(),
        spentProgress: z.number(),
        /** Оба условия выполнены? */
        ordersConditionMet: z.boolean(),
        spentConditionMet: z.boolean(),
      }),

      // Привилегии текущего уровня
      privileges: z.object({
        cashbackRate: z.number(), // 0.01 - 0.15 (Bronze 1%, Silver 3%, Gold 5%, Platinum 10%, Diamond 15%)
        minCashRate: z.number().nullable(), // 0.50, 0.30, 0.10 или null для Platinum (Diamond 0.10)
        minCashFixed: z.number().nullable(), // 1000 для Platinum только
        freeDrinkEvery: z.number().nullable(), // Gold: 10, Platinum: 5, Diamond: 3, остальные null
        overdraftLimit: z.number(), // 0 или 50000 (только Platinum)
      }),

      // Free Drink
      freeDrinkProgress: z.object({
        current: z.number(), // заказов с последнего Free Drink
        target: z.number().nullable(), // Gold: 10, Platinum: 5, Diamond: 3
        available: z.number(), // накопленных Free Drink (макс 2)
      }),

      // Реферальная
      referralCode: z.string(),
      referralsToday: z.number(),
      referralsThisMonth: z.number(),

      // Grace period
      isInGracePeriod: z.boolean(),
      gracePeriodEndsAt: z.date().nullable(),

      registeredAt: z.date(),
    }),
  },

  /**
   * Регистрация в программе лояльности.
   * Начисляет бонус регистрации 12 500 UZS (включая бейдж «Ранняя пташка» +500).
   */
  "profile.register": {
    type: "mutation" as const,
    input: z.object({
      /** Telegram userId (основной способ авторизации) */
      telegramId: z.number(),
      name: z.string().min(1).max(100),
      phone: z.string().optional(),
      birthday: z.date().optional(),
      referralCode: z.string().optional(),
    }),
    output: z.object({
      profileId: z.number(),
      level: LevelEnum,
      balance: z.number(),
      referralCode: z.string(),
      gracePeriodEndsAt: z.date(),
      /** Начисленные бонусы */
      bonuses: z.array(
        z.object({
          type: z.string(),
          amount: z.number(),
          description: z.string(),
        }),
      ),
    }),
  },

  /**
   * История баланса (append-only журнал).
   * Пагинация cursor-based.
   */
  "profile.balanceHistory": {
    type: "query" as const,
    input: PaginationInput.extend({
      txType: z
        .enum([
          "cashback",
          "quest_reward",
          "badge_reward",
          "streak_reward",
          "referral_reward",
          "registration",
          "birthday",
          "promo",
          "ad_reward",
          "spend",
          "spend_reversal",
          "expiry",
          "transfer_out",
          "transfer_in",
          "admin_adjustment",
          "win_back",
        ])
        .optional(),
    }),
    output: z.object({
      items: z.array(
        z.object({
          id: z.number(),
          txType: z.string(),
          amount: z.number(),
          balanceAfter: z.number(),
          description: z.string().nullable(),
          orderId: z.number().nullable(),
          createdAt: z.date(),
        }),
      ),
      nextCursor: z.number().nullable(),
    }),
  },

  /**
   * Привязка Telegram бота/канала.
   * Одноразовая операция на userId, без срока давности (U-29).
   */
  "profile.linkTelegram": {
    type: "mutation" as const,
    input: z.object({
      type: z.enum(["bot", "channel"]),
    }),
    output: z.object({
      success: z.boolean(),
      bonusAmount: z.number().nullable(),
    }),
  },

  /**
   * Обновление ДР. Админ может исправить 1 раз с документом (U-24).
   */
  "profile.updateBirthday": {
    type: "mutation" as const,
    input: z.object({
      userId: z.number(),
      birthday: z.date(),
      /** Только для админа: основание для изменения */
      adminReason: z.string().optional(),
    }),
    output: z.object({ success: z.boolean() }),
  },
};

// ═══════════════════════════════════════════════════════════
// 2. LOYALTY.ORDER
// ═══════════════════════════════════════════════════════════

export const orderRouter = {
  /**
   * Предварительный расчёт оплаты (до подтверждения заказа).
   * Вызывается при формировании корзины.
   *
   * ФОРМУЛЫ:
   *   minCash = (platinum) ? 1000 : max(1000, ceil(orderTotal × minCashRate / 100) × 100)
   *   availableBalance = (platinum) ? max(0, balance + 50000) : max(0, balance)
   *   pointsToUse = min(orderTotal - minCash, availableBalance)
   *   toPay = orderTotal - pointsToUse
   *   cashback = floor(toPay × cashbackRate)
   */
  "order.calculatePayment": {
    type: "query" as const,
    input: z.object({
      orderTotal: z.number().min(1000),
      /** Использовать Free Drink? */
      useFreeDrink: z.boolean().default(false),
    }),
    output: z.object({
      orderTotal: z.number(),
      minCash: z.number(),
      maxPointsUsable: z.number(),
      pointsToUse: z.number(),
      toPay: z.number(),
      cashbackPreview: z.number(),
      isFreeDrink: z.boolean(),
      level: LevelEnum,
      /** Детали расчёта для отладки */
      debug: z
        .object({
          minCashRate: z.number().nullable(),
          cashbackRate: z.number(),
          availableBalance: z.number(),
          overdraftUsed: z.number(),
        })
        .optional(),
    }),
  },

  /**
   * Основной event handler: order.completed.
   * Запускает цепочку обработчиков:
   *   1. Списание баллов (spend)
   *   2. Начисление кэшбэка (от toPay)
   *   3. Обновление стрика (мгновенно, U-06)
   *   4. Проверка уровня (AND-логика)
   *   5. Проверка квестов
   *   6. Проверка бейджей
   *   7. Проверка Free Drink
   *   8. Реферальная проверка (conditional, U-30)
   *
   * Payload (U-15): orderId, userId, machineId, orderTotal, toPay,
   *   pointsUsed, items[], isFreeDrink, isFirstOrder
   *
   * Retry: 3× (1s/5s/30s) + DLQ + idempotency (U-20)
   */
  "order.completed": {
    type: "mutation" as const,
    input: z.object({
      orderId: z.number(),
      userId: z.number(),
      machineId: z.number(),
      orderTotal: z.number(),
      toPay: z.number(),
      pointsUsed: z.number(),
      items: z.array(
        z.object({
          productId: z.number(),
          name: z.string(),
          price: z.number(),
          quantity: z.number(),
        }),
      ),
      isFreeDrink: z.boolean(),
      isFirstOrder: z.boolean(),
    }),
    output: z.object({
      success: z.boolean(),
      /** Результаты каждого handler */
      handlers: z.array(
        z.object({
          name: z.string(),
          success: z.boolean(),
          result: z.any().optional(),
          error: z.string().optional(),
          retryCount: z.number().default(0),
        }),
      ),
      /** Итоговый баланс */
      newBalance: z.number(),
      /** Повысился ли уровень */
      levelChanged: z.boolean(),
      newLevel: LevelEnum.optional(),
    }),
  },

  /**
   * Отмена заказа (cancel rollback).
   * Обработчики (U-09, U-10, U-13, U-14):
   *   1. Возврат списанных баллов (spend_reversal)
   *   2. Отмена кэшбэка (-cashback)
   *   3. Откат квеста (только если orderId = completedByOrderId)
   *     - progress = max(0, progress - amount)
   *   4. Откат челленджей (активных order-based)
   *
   * НЕ ОТКАТЫВАЕТСЯ (необратимо):
   *   ❌ Уровень — необратим, не понижается
   *   ❌ Бейджи — навсегда
   *   ❌ Стрик — день уже засчитан
   *   ❌ Промокоды — уже активированные
   *   ❌ Переводы — уже отправленные
   */
  "order.cancelled": {
    type: "mutation" as const,
    input: z.object({
      orderId: z.number(),
      userId: z.number(),
    }),
    output: z.object({
      success: z.boolean(),
      /** Изменение баланса (отрицательное: отмена кэшбэка, положительное: возврат spend) */
      balanceChange: z.number(),
      newBalance: z.number(),
      questsRolledBack: z.number(),
      challengesRolledBack: z.number(),
    }),
  },
};

// ═══════════════════════════════════════════════════════════
// 3. LOYALTY.BADGES
// ═══════════════════════════════════════════════════════════

export const badgesRouter = {
  /**
   * Все бейджи пользователя (earned + available).
   *
   * Система бейджей (U-07):
   *   ① Ранняя пташка — регистрация (+500 UZS)
   *   ② Первая покупка
   *   ③ Приведи друга
   *   ④ 10 заказов / 50 заказов / 100 заказов
   *   ⑤ Коллекционер — 9 бейджей (order+ref+reg), ON CONFLICT DO NOTHING
   *   ⑥ Level-бейджи: Silver +3K, Gold +10K, Platinum +25K, Diamond +50K
   *   Итого: 13 бейджей, ~149 500 (R25)
   */
  "badges.list": {
    type: "query" as const,
    input: z.void(),
    output: z.object({
      earned: z.array(
        z.object({
          id: z.number(),
          code: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          icon: z.string().nullable(),
          rewardAmount: z.number(),
          earnedAt: z.date(),
        }),
      ),
      available: z.array(
        z.object({
          id: z.number(),
          code: z.string(),
          name: z.string(),
          description: z.string().nullable(),
          icon: z.string().nullable(),
          rewardAmount: z.number(),
          /** Условие в человекочитаемом виде */
          conditionText: z.string(),
          /** Прогресс 0-1 */
          progress: z.number(),
        }),
      ),
      totalEarned: z.number(),
      totalAvailable: z.number(),
    }),
  },
};

// ═══════════════════════════════════════════════════════════
// 4. LOYALTY.QUESTS
// ═══════════════════════════════════════════════════════════

export const questsRouter = {
  /**
   * Активные квесты пользователя.
   * Weekly: ×4 полных недели в месяц (U-33).
   * Spend = toPay + pointsUsed, исключая Free Drink (U-17).
   * Overflow: progress ≥ target → выполнен, заморожен (U-26).
   */
  "quests.active": {
    type: "query" as const,
    input: z.void(),
    output: z.object({
      quests: z.array(
        z.object({
          id: z.number(),
          questId: z.number(),
          name: z.string(),
          description: z.string().nullable(),
          icon: z.string().nullable(),
          questType: z.enum(["daily", "weekly", "monthly", "special"]),
          metric: z.string(),
          targetValue: z.number(),
          progress: z.number(),
          isCompleted: z.boolean(),
          completedAt: z.date().nullable(),
          rewardAmount: z.number(),
          rewardPaid: z.boolean(),
          /** Время до окончания */
          endsAt: z.date(),
          remainingSeconds: z.number(),
        }),
      ),
    }),
  },

  /**
   * История завершённых квестов.
   */
  "quests.history": {
    type: "query" as const,
    input: PaginationInput,
    output: z.object({
      items: z.array(
        z.object({
          questName: z.string(),
          questType: z.string(),
          rewardAmount: z.number(),
          completedAt: z.date(),
        }),
      ),
      nextCursor: z.number().nullable(),
    }),
  },
};

// ═══════════════════════════════════════════════════════════
// 5. LOYALTY.REFERRAL
// ═══════════════════════════════════════════════════════════

export const referralRouter = {
  /**
   * Статистика рефералов.
   * Порог: 5K UZS (U-12).
   * Лимит: 5/день + 50/месяц (C03).
   * Ссылка бессрочная (U-25).
   */
  "referral.stats": {
    type: "query" as const,
    input: z.void(),
    output: z.object({
      referralCode: z.string(),
      referralLink: z.string(),
      totalReferred: z.number(),
      qualifiedReferred: z.number(),
      pendingReferred: z.number(),
      totalEarned: z.number(),
      todayCount: z.number(),
      todayLimit: z.number(), // 5
      monthCount: z.number(),
      monthLimit: z.number(), // 50
      /** Список рефералов */
      referrals: z.array(
        z.object({
          userId: z.number(),
          name: z.string(),
          isQualified: z.boolean(),
          qualifiedAt: z.date().nullable(),
          bonusPaid: z.boolean(),
          createdAt: z.date(),
        }),
      ),
    }),
  },
};

// ═══════════════════════════════════════════════════════════
// 6. LOYALTY.REWARDS
// ═══════════════════════════════════════════════════════════

export const rewardsRouter = {
  /**
   * Список доступных Free Drink (R8: order-based auto-activation).
   * FIFO по дате выдачи (сначала старый).
   * Auto-activation: Gold /10, Platinum /5, Diamond /3 (по счётчику заказов).
   * Diamond: авто-активация при каждом 3-м заказе (без накопления).
   * Макс. накопление: 2 (кроме Diamond). Expiry: 1 месяц.
   * Каждый Free Drink = оплата 1 000 UZS (R0).
   */
  "rewards.freeDrinks": {
    type: "query" as const,
    input: z.void(),
    output: z.object({
      available: z.array(
        z.object({
          id: z.number(),
          /** Номер заказа, на котором заработан */
          earnedAtOrderNumber: z.number(),
          earnedByOrderId: z.number().nullable(),
          expiresAt: z.date(),
          daysUntilExpiry: z.number(),
        }),
      ),
      totalAvailable: z.number(),
      /** Прогресс до следующего */
      nextProgress: z.object({
        current: z.number(), // ordersSinceLastFreeDrink
        target: z.number().nullable(), // Gold: 10, Platinum: 5, Diamond: 3
      }),
    }),
  },

  /**
   * Применить промо-код.
   */
  "rewards.applyPromo": {
    type: "mutation" as const,
    input: z.object({
      promoCode: z.string(),
    }),
    output: z.object({
      success: z.boolean(),
      promoType: z.string(),
      value: z.number(),
      description: z.string(),
    }),
  },
};

// ═══════════════════════════════════════════════════════════
// 7. LOYALTY.TRANSFER (R27: Silver+ переводы баллов)
// ═══════════════════════════════════════════════════════════

export const transferRouter = {
  /**
   * Перевод баллов другому пользователю (R27).
   * Silver+ могут отправлять. Получатель — любой уровень.
   * Min 5K, кратность 100, max 3/день, max 50K/день.
   * Комиссия 0%.
   */
  "transfer.send": {
    type: "mutation" as const,
    input: z.object({
      /** Получатель по referralCode или userId */
      recipientCode: z.string().optional(),
      recipientUserId: z.number().optional(),
      /** Сумма (min 5000, кратность 100) */
      amount: z.number().min(5000),
    }),
    output: z.object({
      success: z.boolean(),
      transferId: z.number(),
      newBalance: z.number(),
      recipientName: z.string(),
    }),
  },

  /**
   * Лимиты и доступность переводов.
   */
  "transfer.limits": {
    type: "query" as const,
    input: z.void(),
    output: z.object({
      /** Silver+ может переводить */
      canTransfer: z.boolean(),
      /** Причина блокировки (если Bronze) */
      blockedReason: z.string().nullable(),
      transfersToday: z.number(),
      transfersTodayLimit: z.number(), // 3
      amountToday: z.number(),
      amountTodayLimit: z.number(), // 50000
      minAmount: z.number(), // 5000
      balance: z.number(),
    }),
  },

  /**
   * История переводов.
   */
  "transfer.history": {
    type: "query" as const,
    input: PaginationInput,
    output: z.object({
      items: z.array(
        z.object({
          id: z.number(),
          direction: z.enum(["sent", "received"]),
          counterpartyName: z.string(),
          amount: z.number(),
          createdAt: z.date(),
        }),
      ),
      nextCursor: z.number().nullable(),
    }),
  },
};

// ═══════════════════════════════════════════════════════════
// 8. LOYALTY.ADS (Rewarded Ads с per-level лимитами)
// ═══════════════════════════════════════════════════════════

export const adsRouter = {
  /**
   * Доступный рекламный контент (6 типов).
   * Лимиты/день: Bronze 3, Silver 5, Gold 50, Platinum 100, Diamond ∞.
   * CPV (UZS): Bronze/Silver 500, Gold 700, Platinum 1000, Diamond 1500.
   * Grace period: День 2+ (после 24ч).
   */
  "ads.available": {
    type: "query" as const,
    input: z.void(),
    output: z.object({
      /** Доступен ли раздел (День 2+ и лимит не исчерпан) */
      isAvailable: z.boolean(),
      blockedReason: z.string().nullable(), // "grace_period" | "daily_limit" | null
      viewsToday: z.number(),
      dailyLimit: z.number(), // 3/5/50/100/Infinity
      /** Доступные рекламные единицы */
      ads: z.array(
        z.object({
          adId: z.number(),
          adType: z.enum([
            "video",
            "banner",
            "quiz",
            "survey",
            "mini_game",
            "promo_story",
          ]),
          title: z.string(),
          description: z.string().nullable(),
          /** Потенциальная награда в UZS */
          rewardRange: z.object({
            min: z.number(),
            max: z.number(),
          }),
          durationSeconds: z.number().nullable(),
        }),
      ),
    }),
  },

  /**
   * Зачислить баллы за просмотр рекламы (rewarded ad).
   * Reward зависит от уровня (CPV) и типа контента.
   * Skip = 0 баллов.
   */
  "ads.viewed": {
    type: "mutation" as const,
    input: z.object({
      adId: z.number(),
      adType: z.enum([
        "video",
        "banner",
        "quiz",
        "survey",
        "mini_game",
        "promo_story",
      ]),
      /** Доля просмотра (0-1). 1 = полный, <1 = скипнул → 0 баллов */
      completionRate: z.number().min(0).max(1),
      viewDurationMs: z.number(),
      /** Результат квиза (если применимо) */
      quizResult: z
        .object({
          correctAnswers: z.number(),
          totalQuestions: z.number(),
          isPerfect: z.boolean(),
        })
        .optional(),
    }),
    output: z.object({
      success: z.boolean(),
      pointsEarned: z.number(),
      newBalance: z.number(),
      remainingViews: z.number(),
    }),
  },
};

// ═══════════════════════════════════════════════════════════
// 9. LOYALTY.NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

export const notificationsRouter = {
  /**
   * Уведомления пользователя (U-22: persistent + бейджик «N новых»).
   * TTL: 90 дней.
   */
  "notifications.list": {
    type: "query" as const,
    input: PaginationInput.extend({
      unreadOnly: z.boolean().default(false),
    }),
    output: z.object({
      items: z.array(
        z.object({
          id: z.number(),
          type: z.enum([
            "cashback",
            "level_up",
            "badge_earned",
            "quest_completed",
            "streak_milestone",
            "free_drink",
            "promo",
            "referral",
            "birthday",
            "expiry_warning",
            "win_back",
          ]),
          title: z.string(),
          body: z.string(),
          data: z.any().nullable(),
          isRead: z.boolean(),
          createdAt: z.date(),
        }),
      ),
      unreadCount: z.number(),
      nextCursor: z.number().nullable(),
    }),
  },

  /**
   * Отметить уведомления прочитанными.
   */
  "notifications.markRead": {
    type: "mutation" as const,
    input: z.object({
      notificationIds: z.array(z.number()).min(1),
    }),
    output: z.object({ success: z.boolean() }),
  },

  /**
   * Количество непрочитанных (для бейджика).
   */
  "notifications.unreadCount": {
    type: "query" as const,
    input: z.void(),
    output: z.object({ count: z.number() }),
  },
};

// ═══════════════════════════════════════════════════════════
// 10. LOYALTY.ADMIN
// ═══════════════════════════════════════════════════════════

export const adminRouter = {
  /**
   * Дашборд лояльности (для админ-панели).
   */
  "admin.dashboard": {
    type: "query" as const,
    input: DateRange.optional(),
    output: z.object({
      totalUsers: z.number(),
      activeUsers30d: z.number(),
      levelDistribution: z.object({
        bronze: z.number(),
        silver: z.number(),
        gold: z.number(),
        platinum: z.number(),
        diamond: z.number(),
      }),
      totalPointsIssued: z.number(),
      totalPointsSpent: z.number(),
      totalPointsBalance: z.number(),
      avgCashbackPerOrder: z.number(),
      subsidyThisMonth: z.number(),
      rewardedAdsRevenue: z.number(),
      /** NET = rewardedAdsRevenue - subsidyThisMonth */
      netLoyaltyCost: z.number(),
      topReferrers: z
        .array(
          z.object({
            userId: z.number(),
            name: z.string(),
            referralCount: z.number(),
          }),
        )
        .max(10),
    }),
  },

  /**
   * Корректировка баланса (admin_adjustment).
   */
  "admin.adjustBalance": {
    type: "mutation" as const,
    input: z.object({
      userId: z.number(),
      amount: z.number(), // может быть отрицательным
      reason: z.string().min(5),
    }),
    output: z.object({
      success: z.boolean(),
      newBalance: z.number(),
      txId: z.number(),
    }),
  },

  /**
   * Управление квестами (CRUD).
   */
  "admin.createQuest": {
    type: "mutation" as const,
    input: z.object({
      code: z.string(),
      name: z.string(),
      description: z.string().optional(),
      questType: z.enum(["daily", "weekly", "monthly", "special"]),
      metric: z.enum([
        "order_count",
        "spend_amount",
        "category_buy",
        "streak_days",
        "referral_count",
        "ad_views",
      ]),
      targetValue: z.number().min(1),
      rewardAmount: z.number().min(0),
      minLevel: LevelEnum.default("bronze"),
      startsAt: z.date(),
      endsAt: z.date(),
      maxActivations: z.number().default(1),
    }),
    output: z.object({ questId: z.number() }),
  },

  /**
   * Управление промо (CRUD).
   */
  "admin.createPromo": {
    type: "mutation" as const,
    input: z.object({
      code: z.string(),
      name: z.string(),
      promoType: z.enum(["bonus", "discount", "free_drink", "win_back"]),
      value: z.number().min(1),
      isGiftable: z.boolean().default(false),
      transferLimit: z.number().default(1),
      minLevel: LevelEnum.default("bronze"),
      maxUses: z.number().nullable().default(null),
      startsAt: z.date(),
      endsAt: z.date(),
    }),
    output: z.object({ promoId: z.number() }),
  },

  /**
   * DLQ мониторинг.
   */
  "admin.dlqList": {
    type: "query" as const,
    input: PaginationInput.extend({
      status: z.enum(["pending", "retrying", "resolved", "dead"]).optional(),
    }),
    output: z.object({
      items: z.array(
        z.object({
          id: z.number(),
          handlerName: z.string(),
          idempotencyKey: z.string(),
          errorMessage: z.string().nullable(),
          status: z.string(),
          retryCount: z.number(),
          createdAt: z.date(),
        }),
      ),
      counts: z.object({
        pending: z.number(),
        retrying: z.number(),
        dead: z.number(),
      }),
      nextCursor: z.number().nullable(),
    }),
  },

  /**
   * Retry DLQ item вручную.
   */
  "admin.dlqRetry": {
    type: "mutation" as const,
    input: z.object({ dlqId: z.number() }),
    output: z.object({ success: z.boolean() }),
  },

  /**
   * Антифрод-алерты (U-16: >75K/день).
   */
  "admin.fraudAlerts": {
    type: "query" as const,
    input: DateRange,
    output: z.object({
      alerts: z.array(
        z.object({
          userId: z.number(),
          userName: z.string(),
          dailyTotal: z.number(),
          threshold: z.number(), // 75000
          date: z.date(),
          details: z.array(
            z.object({
              txType: z.string(),
              amount: z.number(),
              time: z.date(),
            }),
          ),
        }),
      ),
    }),
  },
};

// ═══════════════════════════════════════════════════════════
// 11. LOYALTY.CRON
// ═══════════════════════════════════════════════════════════

export const cronRouter = {
  /**
   * CRON 00:05 Asia/Tashkent — Сброс стриков.
   * Только reset: если hasOrderToday=false → streak=0 (U-06).
   * НЕ инкрементирует (инкремент мгновенный при order.completed).
   */
  "cron.resetStreaks": {
    type: "mutation" as const,
    input: z.object({
      /** Дата в Asia/Tashkent (YYYY-MM-DD) для идемпотентности */
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    output: z.object({
      processed: z.number(),
      reset: z.number(),
      maintained: z.number(),
    }),
  },

  /**
   * CRON ежедневно — Сброс дневных лимитов рефералов.
   */
  "cron.resetDailyLimits": {
    type: "mutation" as const,
    input: z.object({ date: z.string() }),
    output: z.object({ updated: z.number() }),
  },

  /**
   * CRON 1-го числа — Сброс месячных лимитов рефералов + проверка expiry Free Drink.
   * Free Drink: order-based модель (R8). Нет rollover — expiry через 1 месяц с момента выдачи.
   */
  "cron.monthlyReset": {
    type: "mutation" as const,
    input: z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }),
    output: z.object({
      referralsReset: z.number(),
      freeDrinksExpired: z.number(),
    }),
  },

  /**
   * CRON еженедельно — Проверка сгорания баллов.
   * 12 месяцев без order.completed → сгорание (U-23).
   */
  "cron.checkExpiry": {
    type: "mutation" as const,
    input: z.void(),
    output: z.object({
      warningsSent: z.number(), // 30-дневное предупреждение
      expired: z.number(),
      totalPointsExpired: z.number(),
    }),
  },

  /**
   * CRON еженедельно — Win-back проверка (U-34).
   * 14 дней → 5K промо. 30 дней после 1-го → 10K промо.
   * Сброс при возвращении (order.completed).
   */
  "cron.winBack": {
    type: "mutation" as const,
    input: z.void(),
    output: z.object({
      level1Sent: z.number(), // 5K промо
      level2Sent: z.number(), // 10K промо
    }),
  },

  /**
   * CRON ежедневно — Очистка просроченных уведомлений (TTL 90 дней).
   */
  "cron.cleanupNotifications": {
    type: "mutation" as const,
    input: z.void(),
    output: z.object({ deleted: z.number() }),
  },

  /**
   * CRON ежечасно — Retry DLQ items.
   */
  "cron.retryDLQ": {
    type: "mutation" as const,
    input: z.void(),
    output: z.object({
      retried: z.number(),
      succeeded: z.number(),
      failed: z.number(),
      movedToDead: z.number(),
    }),
  },

  /**
   * CRON еженедельно — Очистка idempotency keys (TTL 7 дней).
   */
  "cron.cleanupIdempotencyKeys": {
    type: "mutation" as const,
    input: z.void(),
    output: z.object({ deleted: z.number() }),
  },
};

// ═══════════════════════════════════════════════════════════
// FULL ROUTER MAP
// ═══════════════════════════════════════════════════════════

export const loyaltyRouter = {
  ...profileRouter,
  ...orderRouter,
  ...badgesRouter,
  ...questsRouter,
  ...referralRouter,
  ...rewardsRouter,
  ...transferRouter,
  ...adsRouter,
  ...notificationsRouter,
  ...adminRouter,
  ...cronRouter,
};

/**
 * SUMMARY:
 *   Queries:  17  (profile.get, balanceHistory, badges.list, quests.active, quests.history,
 *                  referral.stats, rewards.freeDrinks, transfer.limits, transfer.history,
 *                  ads.available, notifications.list, notifications.unreadCount,
 *                  admin.dashboard, admin.dlqList, admin.fraudAlerts, order.calculatePayment)
 *   Mutations: 21  (profile.register, profile.linkTelegram, profile.updateBirthday,
 *                   order.completed, order.cancelled, rewards.applyPromo,
 *                   transfer.send, ads.viewed, notifications.markRead,
 *                   admin.adjustBalance, admin.createQuest, admin.createPromo, admin.dlqRetry,
 *                   cron.* ×8)
 *   CRON jobs: 8  (resetStreaks, resetDailyLimits, monthlyReset, checkExpiry,
 *                  winBack, cleanupNotifications, retryDLQ, cleanupIdempotencyKeys)
 *   Total endpoints: 46
 *
 * ROUTERS: 11 (profile, order, badges, quests, referral, rewards,
 *              transfer, ads, notifications, admin, cron)
 *
 * HANDLERS (order.completed chain):
 *   1. handleSpend          — списание баллов
 *   2. handleCashback       — начисление кэшбэка (от toPay, R2)
 *   3. handleStreak         — инкремент стрика (мгновенно)
 *   4. handleLevelCheck     — AND-логика уровней (R1)
 *   5. handleQuestProgress  — прогресс квестов (spend = toPay + pointsUsed)
 *   6. handleBadgeCheck     — проверка 13 бейджей (ON CONFLICT DO NOTHING, R25)
 *   7. handleFreeDrink      — проверка Free Drink (Gold:10, Platinum:5, Diamond:3, R8)
 *   8. handleReferralCheck  — реферальный бонус (conditional, порог 5K, +10K обоим, R7)
 *
 * HANDLERS (order.cancelled chain):
 *   1. handleSpendReversal  — возврат списанных баллов
 *   2. handleCashbackReversal — отмена кэшбэка
 *   3. handleQuestRollback  — max(0, progress - amount)
 *   4. handleChallengeRollback — откат прогресса активных челленджей
 *   НЕ ОТКАТЫВАЕТСЯ: уровень, бейджи, стрик, промокоды, переводы
 */
