/**
 * Client-facing Callback Handlers
 * Navigation, Points, Machine, Cart, Order, Payment, Rating,
 * Settings, Complaint, Achievement callbacks for end-users.
 * Split from callbacks.ts
 */

import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { config } from "../config";
import { api } from "../utils/api";
import { transitionStep, resetStep } from "../states";
import { formatLoyaltyMessage, formatMachineInfo } from "../utils/formatters";
import {
  mainMenuInline,
  pointsInline,
  questsInline,
  historyInline,
  redeemPointsInline,
  machineInline,
  settingsInline,
  languageInline,
  notificationsInline,
  backToMenuInline,
  achievementsInline,
} from "../keyboards/inline";
import { locationKeyboard } from "../keyboards/main";

// ============================================
// Register Client Callbacks
// ============================================

export function registerClientCallbacks(bot: Telegraf<BotContext>) {
  // Navigation callbacks
  bot.action("back_to_menu", handleBackToMenu);
  bot.action("find_machines", handleFindMachines);
  bot.action("my_points", handleMyPoints);
  bot.action("quests", handleQuests);
  bot.action("history", handleHistory);
  bot.action("help", handleHelp);

  // Points callbacks
  bot.action("redeem_points", handleRedeemPoints);

  // Machine callbacks
  bot.action(/^machine_(.+)$/, handleMachineDetails);
  bot.action(/^report_machine_(.+)$/, handleReportMachine);

  // Cart callbacks
  bot.action("checkout", handleCheckout);
  bot.action("clear_cart", handleClearCart);
  bot.action("edit_cart", handleEditCart);

  // Order callbacks
  bot.action(/^confirm_order_(.+)$/, handleConfirmOrder);
  bot.action(/^cancel_order_(.+)$/, handleCancelOrder);

  // Payment callbacks
  bot.action(/^pay_payme_(.+)$/, handlePayPayme);
  bot.action(/^pay_click_(.+)$/, handlePayClick);
  bot.action(/^pay_points_(.+)$/, handlePayPoints);
  bot.action("confirm_points_payment", handleConfirmPointsPayment);

  // Rating callbacks
  bot.action(/^rate_order_(.+)$/, handleRateOrder);
  bot.action(/^rate_(.+)_(\d)$/, handleSubmitRating);

  // Settings callbacks
  bot.action("settings", handleSettings);
  bot.action("settings_language", handleLanguageSettings);
  bot.action("settings_notifications", handleNotificationSettings);
  bot.action("settings_phone", handlePhoneSettings);
  bot.action(/^lang_(.+)$/, handleLanguageChange);
  bot.action("toggle_notifications", handleToggleNotifications);

  // Complaint callbacks
  bot.action("send_complaint", handleSendComplaint);
  bot.action("cancel_complaint", handleCancelComplaint);

  // Achievement callbacks
  bot.action("my_achievements", handleMyAchievements);
  bot.action("achievements_all", handleAchievementsAll);

  // Misc callbacks
  bot.action("noop", (ctx) => ctx.answerCbQuery());
}

// ============================================
// Navigation Callbacks
// ============================================

async function handleBackToMenu(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.editMessageText("📱 *Главное меню*\n\nВыберите действие:", {
    parse_mode: "Markdown",
    ...mainMenuInline,
  });
}

async function handleFindMachines(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.reply("📍 Отправьте мне вашу геолокацию:", locationKeyboard);
  transitionStep(ctx, "awaiting_location");
}

async function handleMyPoints(ctx: BotContext) {
  await ctx.answerCbQuery();

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.answerCbQuery("Пользователь не найден", { show_alert: true });
    return;
  }

  const loyalty = await api.getUserLoyalty(user.id);
  if (loyalty) {
    await ctx.editMessageText(formatLoyaltyMessage(loyalty), {
      parse_mode: "Markdown",
      ...pointsInline,
    });
  } else {
    await ctx.editMessageText(
      "💎 У вас пока нет бонусных баллов.\n\nСовершите первую покупку!",
      mainMenuInline,
    );
  }
}

async function handleQuests(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🎯 *Ваши задания*\n\n" + "Выполняйте задания и получайте бонусные баллы!",
    {
      parse_mode: "Markdown",
      ...questsInline,
    },
  );
}

async function handleHistory(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "📜 *История покупок*\n\nНажмите кнопку для просмотра:",
    {
      parse_mode: "Markdown",
      ...historyInline,
    },
  );
}

async function handleHelp(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.reply("❓ Используйте команду /help для получения справки");
}

// ============================================
// Points Callbacks
// ============================================

async function handleRedeemPoints(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🎁 *Обмен баллов*\n\n" + "Откройте приложение, чтобы выбрать награду:",
    {
      parse_mode: "Markdown",
      ...redeemPointsInline,
    },
  );
}

// ============================================
// Machine Callbacks
// ============================================

async function handleMachineDetails(ctx: BotContext) {
  await ctx.answerCbQuery();

  const machineId = ctx.match?.[1];
  if (!machineId) {
    await ctx.answerCbQuery("Автомат не найден", { show_alert: true });
    return;
  }
  const machine = await api.getMachine(machineId);

  if (!machine) {
    await ctx.answerCbQuery("Автомат не найден", { show_alert: true });
    return;
  }

  await ctx.editMessageText(formatMachineInfo(machine), {
    parse_mode: "Markdown",
    ...machineInline(machine),
  });
}

async function handleReportMachine(ctx: BotContext) {
  await ctx.answerCbQuery();

  const machineId = ctx.match?.[1];
  if (!machineId) {
    await ctx.answerCbQuery("Автомат не найден", { show_alert: true });
    return;
  }
  ctx.session.data = { machineId };
  transitionStep(ctx, "awaiting_complaint");

  await ctx.reply(
    "📢 *Сообщить о проблеме*\n\n" + "Опишите проблему с автоматом:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [["❌ Отмена"]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    },
  );
}

// ============================================
// Cart Callbacks
// ============================================

async function handleCheckout(ctx: BotContext) {
  await ctx.answerCbQuery();

  const cart = ctx.session.cart || [];
  if (cart.length === 0) {
    await ctx.answerCbQuery("Корзина пуста", { show_alert: true });
    return;
  }

  transitionStep(ctx, "confirming_order");

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  await ctx.editMessageText(
    "✅ *Подтверждение заказа*\n\n" +
      `💰 Сумма: ${total.toLocaleString()} UZS\n\n` +
      "Выберите способ оплаты:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "💳 Payme", callback_data: "pay_payme_new" }],
          [{ text: "💳 Click", callback_data: "pay_click_new" }],
          [{ text: "💎 Баллами", callback_data: "pay_points_new" }],
          [{ text: "❌ Отмена", callback_data: "clear_cart" }],
        ],
      },
    },
  );
}

async function handleClearCart(ctx: BotContext) {
  await ctx.answerCbQuery("Корзина очищена");
  ctx.session.cart = [];
  ctx.session.machineId = undefined;

  await ctx.editMessageText(
    "🗑 Корзина очищена.\n\n📱 Главное меню:",
    mainMenuInline,
  );
}

async function handleEditCart(ctx: BotContext) {
  await ctx.answerCbQuery();
  // Redirect to cart view
  await ctx.reply("🛒 Используйте /cart для просмотра корзины");
}

// ============================================
// Order Callbacks
// ============================================

async function handleConfirmOrder(ctx: BotContext) {
  await ctx.answerCbQuery("Заказ оформляется...");

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.editMessageText(
      "❌ Пользователь не найден. Используйте /start для регистрации.",
    );
    return;
  }

  const cart = ctx.session.cart || [];
  const machineId = ctx.session.machineId;

  if (cart.length === 0) {
    await ctx.editMessageText(
      "🛒 Корзина пуста. Выберите товар для заказа.\n\n📱 Главное меню:",
      mainMenuInline,
    );
    return;
  }

  if (!machineId) {
    await ctx.editMessageText(
      "❌ Автомат не выбран. Отсканируйте QR-код автомата.\n\n📱 Главное меню:",
      mainMenuInline,
    );
    return;
  }

  try {
    const items = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const order = await api.createOrder(user.id, machineId, items);

    if (!order) {
      await ctx.editMessageText(
        "❌ Не удалось создать заказ. Попробуйте позже.\n\n📱 Главное меню:",
        mainMenuInline,
      );
      return;
    }

    // Clear cart on success
    ctx.session.cart = [];
    ctx.session.machineId = undefined;
    resetStep(ctx);

    const total = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    await ctx.editMessageText(
      "✅ *Заказ оформлен!*\n\n" +
        `📋 Номер: ${order.orderNumber}\n` +
        `💰 Сумма: ${total.toLocaleString()} UZS\n` +
        `📦 Товаров: ${cart.length}\n` +
        (order.pointsEarned > 0
          ? `💎 Начислено баллов: +${order.pointsEarned}\n`
          : "") +
        "\nСпасибо за покупку! 🎉",
      {
        parse_mode: "Markdown",
        ...mainMenuInline,
      },
    );
  } catch {
    await ctx.editMessageText(
      "❌ Ошибка при оформлении заказа. Попробуйте позже.\n\n📱 Главное меню:",
      mainMenuInline,
    );
  }
}

async function handleCancelOrder(ctx: BotContext) {
  await ctx.answerCbQuery("Заказ отменён");
  resetStep(ctx);

  await ctx.editMessageText(
    "❌ Заказ отменён.\n\n📱 Главное меню:",
    mainMenuInline,
  );
}

// ============================================
// Payment Callbacks
// ============================================

async function handlePayPayme(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "💳 *Оплата через Payme*\n\n" +
      "Откройте приложение для завершения оплаты:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 Открыть Payme",
              web_app: { url: `${config.miniAppUrl}/payment/payme` },
            },
          ],
          [{ text: "🔙 Назад", callback_data: "checkout" }],
        ],
      },
    },
  );
}

async function handlePayClick(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "💳 *Оплата через Click*\n\n" +
      "Откройте приложение для завершения оплаты:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 Открыть Click",
              web_app: { url: `${config.miniAppUrl}/payment/click` },
            },
          ],
          [{ text: "🔙 Назад", callback_data: "checkout" }],
        ],
      },
    },
  );
}

async function handlePayPoints(ctx: BotContext) {
  await ctx.answerCbQuery();

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.answerCbQuery("Пользователь не найден", { show_alert: true });
    return;
  }

  const loyalty = await api.getUserLoyalty(user.id);
  const cart = ctx.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!loyalty || loyalty.points < total) {
    await ctx.answerCbQuery("Недостаточно баллов", { show_alert: true });
    return;
  }

  await ctx.editMessageText(
    "💎 *Оплата баллами*\n\n" +
      `💰 Сумма: ${total.toLocaleString()} баллов\n` +
      `💎 Ваши баллы: ${loyalty.points.toLocaleString()}\n\n` +
      "Подтвердите оплату:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Оплатить", callback_data: "confirm_points_payment" }],
          [{ text: "🔙 Назад", callback_data: "checkout" }],
        ],
      },
    },
  );
}

async function handleConfirmPointsPayment(ctx: BotContext) {
  await ctx.answerCbQuery();

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.answerCbQuery("Пользователь не найден", { show_alert: true });
    return;
  }

  const cart = ctx.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  try {
    const success = await api.redeemPoints(user.id, total);
    if (success) {
      ctx.session.cart = [];
      await ctx.editMessageText(
        "✅ *Оплата баллами успешна!*\n\n" +
          `Списано: ${total.toLocaleString()} баллов\n\n` +
          "Спасибо за покупку! 🎉",
        { parse_mode: "Markdown" },
      );
    } else {
      await ctx.editMessageText(
        "❌ Не удалось списать баллы. Попробуйте позже.",
        { parse_mode: "Markdown" },
      );
    }
  } catch {
    await ctx.editMessageText(
      "❌ Произошла ошибка при оплате. Попробуйте позже.",
      { parse_mode: "Markdown" },
    );
  }
}

// ============================================
// Rating Callbacks
// ============================================

async function handleRateOrder(ctx: BotContext) {
  await ctx.answerCbQuery();
  const orderId = ctx.match?.[1];
  if (!orderId) return;

  await ctx.editMessageText(
    "⭐️ *Оцените заказ*\n\nВаша оценка поможет нам стать лучше:",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⭐️", callback_data: `rate_${orderId}_1` },
            { text: "⭐️⭐️", callback_data: `rate_${orderId}_2` },
            { text: "⭐️⭐️⭐️", callback_data: `rate_${orderId}_3` },
          ],
          [
            { text: "⭐️⭐️⭐️⭐️", callback_data: `rate_${orderId}_4` },
            { text: "⭐️⭐️⭐️⭐️⭐️", callback_data: `rate_${orderId}_5` },
          ],
          [{ text: "⏭ Пропустить", callback_data: "back_to_menu" }],
        ],
      },
    },
  );
}

async function handleSubmitRating(ctx: BotContext) {
  const orderId = ctx.match?.[1];
  const ratingStr = ctx.match?.[2];
  if (!orderId || !ratingStr) return;

  const rating = parseInt(ratingStr, 10);

  await ctx.answerCbQuery(`Спасибо за оценку: ${"⭐️".repeat(rating)}`);

  const user = ctx.from ? await api.getUserByTelegramId(ctx.from.id) : null;
  if (user && orderId) {
    await api.submitFeedback(user.id, orderId, rating, "");
  }

  await ctx.editMessageText(
    "✅ *Спасибо за отзыв!*\n\n" +
      `Ваша оценка: ${"⭐️".repeat(rating)}\n\n` +
      "Мы ценим ваше мнение!",
    {
      parse_mode: "Markdown",
      ...backToMenuInline,
    },
  );
}

// ============================================
// Settings Callbacks
// ============================================

async function handleSettings(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "⚙️ *Настройки*\n\nВыберите, что хотите изменить:",
    {
      parse_mode: "Markdown",
      ...settingsInline,
    },
  );
}

async function handleLanguageSettings(ctx: BotContext) {
  await ctx.answerCbQuery();
  await ctx.editMessageText("🌐 *Выберите язык:*", {
    parse_mode: "Markdown",
    ...languageInline,
  });
}

async function handleNotificationSettings(ctx: BotContext) {
  await ctx.answerCbQuery();
  const enabled = ctx.session.data?.notificationsEnabled !== false;

  await ctx.editMessageText(
    "🔔 *Уведомления*\n\n" + `Статус: ${enabled ? "Включены" : "Выключены"}`,
    {
      parse_mode: "Markdown",
      ...notificationsInline(enabled),
    },
  );
}

async function handlePhoneSettings(ctx: BotContext) {
  await ctx.answerCbQuery();
  transitionStep(ctx, "awaiting_phone");

  await ctx.reply("📱 Отправьте ваш номер телефона:", {
    reply_markup: {
      keyboard: [
        [{ text: "📱 Отправить номер", request_contact: true }],
        ["❌ Отмена"],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

async function handleLanguageChange(ctx: BotContext) {
  const langMatch = ctx.match?.[1];
  if (!langMatch) return;
  const lang = langMatch as "ru" | "uz" | "en";
  ctx.session.language = lang;

  const langNames: Record<string, string> = {
    ru: "🇷🇺 Русский",
    uz: "🇺🇿 O'zbekcha",
    en: "🇬🇧 English",
  };

  await ctx.answerCbQuery(`Язык изменён: ${langNames[lang]}`);
  await ctx.editMessageText(
    `✅ Язык изменён: ${langNames[lang]}`,
    backToMenuInline,
  );
}

async function handleToggleNotifications(ctx: BotContext) {
  const currentlyEnabled = ctx.session.data?.notificationsEnabled !== false;
  ctx.session.data = {
    ...ctx.session.data,
    notificationsEnabled: !currentlyEnabled,
  };

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (user) {
    await api
      .updateNotificationSettings(user.id, !currentlyEnabled)
      .catch(() => {});
  }

  await ctx.answerCbQuery(
    !currentlyEnabled ? "Уведомления включены" : "Уведомления выключены",
  );
  await handleNotificationSettings(ctx);
}

// ============================================
// Complaint Callbacks
// ============================================

async function handleSendComplaint(ctx: BotContext) {
  await ctx.answerCbQuery("Отправляем...");

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.answerCbQuery("Пользователь не найден", { show_alert: true });
    return;
  }

  const machineId = (ctx.session.data?.machineId as string) || null;
  const message = ctx.session.data?.complaintMessage as string | undefined;

  if (message) {
    await api.createComplaint(user.id, machineId, "other", message);
  }

  resetStep(ctx);
  ctx.session.data = undefined;

  await ctx.editMessageText(
    "✅ *Жалоба отправлена*\n\n" +
      "Спасибо за обращение! Мы рассмотрим вашу жалобу в ближайшее время.",
    {
      parse_mode: "Markdown",
      ...backToMenuInline,
    },
  );
}

async function handleCancelComplaint(ctx: BotContext) {
  await ctx.answerCbQuery("Отменено");
  resetStep(ctx);
  ctx.session.data = undefined;

  await ctx.editMessageText("❌ Жалоба отменена.", mainMenuInline);
}

// ============================================
// Achievement Callbacks
// ============================================

async function handleMyAchievements(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const data = await api.getUserAchievements(user.id);
  if (!data) {
    await ctx.editMessageText("📭 Нет достижений.", achievementsInline);
    return;
  }

  const unlocked = data.achievements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((a: any) => a.unlocked)
    .slice(0, 8)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a: any) => `🏆 *${a.name}*\n   ${a.description}`)
    .join("\n\n");

  await ctx.editMessageText(
    `🏆 *Разблокированные (${data.unlocked}):*\n\n${unlocked || "Пока нет"}`,
    { parse_mode: "Markdown", ...achievementsInline },
  );
}

async function handleAchievementsAll(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const data = await api.getUserAchievements(user.id);
  if (!data) {
    await ctx.editMessageText("📭 Нет достижений.", achievementsInline);
    return;
  }

  const list = data.achievements
    .slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((a: any) => {
      const icon = a.unlocked ? "🏆" : "🔒";
      return `${icon} ${a.name}`;
    })
    .join("\n");

  await ctx.editMessageText(
    `🏆 *Все достижения (${data.unlocked}/${data.total}):*\n\n${list}`,
    { parse_mode: "Markdown", ...achievementsInline },
  );
}
