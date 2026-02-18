import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { config } from "../config";
import { api } from "../utils/api";
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
  activeTripInline,
  vehicleSelectInline,
  routeSelectInline,
  tripStopsInline,
  tripCompletedInline,
  achievementsInline,
  staffTasksInline,
  staffAlertsInline,
} from "../keyboards/inline";
import { locationKeyboard } from "../keyboards/main";

// ============================================
// Register All Callbacks
// ============================================

export function registerCallbacks(bot: Telegraf<BotContext>) {
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

  // Trip callbacks
  bot.action("trip_start", handleTripStartCb);
  bot.action("trip_history", handleTripHistory);
  bot.action(/^trip_vehicle_(.+)$/, handleTripVehicleSelect);
  bot.action(/^trip_route_(.+)$/, handleTripRouteSelect);
  bot.action(/^trip_end_(.+)$/, handleTripEndCb);
  bot.action(/^trip_stops_(.+)$/, handleTripStopsList);
  bot.action(/^trip_status_(.+)$/, handleTripStatusCb);
  bot.action(/^trip_complete_stop_(.+)_(.+)$/, handleTripCompleteStop);

  // Staff callbacks
  bot.action("staff_tasks_active", handleStaffTasksActive);
  bot.action("staff_tasks_completed", handleStaffTasksCompleted);
  bot.action("staff_show_route", handleStaffShowRoute);
  bot.action("staff_day_stats", handleStaffDayStats);
  bot.action("staff_alerts_critical", handleStaffAlertsCritical);
  bot.action("staff_alerts_read_all", handleStaffAlertsReadAll);

  // Achievements callback
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
  ctx.session.step = "awaiting_location";
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
  ctx.session.step = "awaiting_complaint";

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

  ctx.session.step = "confirming_order";

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
  // Order confirmation logic
}

async function handleCancelOrder(ctx: BotContext) {
  await ctx.answerCbQuery("Заказ отменён");
  ctx.session.step = undefined;

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
  ctx.session.step = "awaiting_phone";

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

  const machineId = ctx.session.data?.machineId;
  const message = ctx.session.data?.complaintMessage;

  if (message) {
    await api.createComplaint(user.id, machineId || null, "other", message);
  }

  ctx.session.step = undefined;
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
  ctx.session.step = undefined;
  ctx.session.data = undefined;

  await ctx.editMessageText("❌ Жалоба отменена.", mainMenuInline);
}

// ============================================
// Trip Callbacks
// ============================================

async function handleTripStartCb(ctx: BotContext) {
  await ctx.answerCbQuery();

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const activeTrip = await api.getActiveTrip(user.id);
  if (activeTrip) {
    await ctx.editMessageText("⚠️ U vas uzhe est' aktivnaya poezdka.", {
      ...activeTripInline(activeTrip.id),
    });
    return;
  }

  const vehicles = await api.getAvailableVehicles();
  if (vehicles.length === 0) {
    await ctx.editMessageText("❌ Net dostupnykh TS.", backToMenuInline);
    return;
  }

  ctx.session.step = "trip_selecting_vehicle";
  ctx.session.data = {};

  await ctx.editMessageText("🚗 *Vybor transporta*\n\nVyberite TS:", {
    parse_mode: "Markdown",
    ...vehicleSelectInline(vehicles),
  });
}

async function handleTripHistory(ctx: BotContext) {
  await ctx.answerCbQuery();

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const trips = await api.getUserTrips(user.id, 5);
  if (trips.length === 0) {
    await ctx.editMessageText("ℹ️ U vas poka net poezdok.", backToMenuInline);
    return;
  }

  const tripsList = trips
    .map((t, i) => {
      const date = t.startedAt
        ? new Date(t.startedAt).toLocaleDateString("ru-RU")
        : "N/A";
      const statusIcon =
        t.status === "completed"
          ? "✅"
          : t.status === "in_progress"
            ? "🚗"
            : "❌";
      return `${i + 1}. ${statusIcon} ${t.routeName || "Bez marshruta"} — ${date}`;
    })
    .join("\n");

  await ctx.editMessageText(`📋 *Poslednie poezdki:*\n\n${tripsList}`, {
    parse_mode: "Markdown",
    ...backToMenuInline,
  });
}

async function handleTripVehicleSelect(ctx: BotContext) {
  await ctx.answerCbQuery();
  const vehicleId = ctx.match?.[1];
  if (!vehicleId) return;

  ctx.session.data = { ...ctx.session.data, vehicleId };
  ctx.session.step = "trip_selecting_route";

  const routes = await api.getAvailableRoutes();
  if (routes.length === 0) {
    // No routes available, start without route
    const user = await api.getUserByTelegramId(ctx.from!.id);
    if (!user) return;

    const trip = await api.startTrip(user.id, vehicleId);
    if (!trip) {
      await ctx.editMessageText(
        "❌ Oshibka sozdaniya poezdki.",
        backToMenuInline,
      );
      return;
    }

    ctx.session.step = "trip_active";
    ctx.session.data = { tripId: trip.id };

    await ctx.editMessageText(
      "✅ *Poezdka nachata!*\n\n" +
        `TS: ${trip.vehiclePlate || "N/A"}\n` +
        "Otpravlyajte geolokatsiu dlya otslezhivaniya.",
      { parse_mode: "Markdown", ...activeTripInline(trip.id) },
    );
    return;
  }

  await ctx.editMessageText(
    "📍 *Vybor marshruta*\n\nVyberite marshrut ili nachnite bez marshruta:",
    { parse_mode: "Markdown", ...routeSelectInline(routes) },
  );
}

async function handleTripRouteSelect(ctx: BotContext) {
  await ctx.answerCbQuery();
  const routeId = ctx.match?.[1];
  const vehicleId = ctx.session.data?.vehicleId;

  if (!vehicleId) {
    await ctx.editMessageText(
      "❌ Oshibka: transport ne vybran.",
      backToMenuInline,
    );
    return;
  }

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const trip = await api.startTrip(
    user.id,
    vehicleId,
    routeId === "none" ? undefined : routeId,
  );

  if (!trip) {
    await ctx.editMessageText(
      "❌ Oshibka sozdaniya poezdki.",
      backToMenuInline,
    );
    return;
  }

  ctx.session.step = "trip_active";
  ctx.session.data = { tripId: trip.id };

  await ctx.editMessageText(
    "✅ *Poezdka nachata!*\n\n" +
      `Marshrut: ${trip.routeName || "Bez marshruta"}\n` +
      `TS: ${trip.vehiclePlate || "N/A"}\n\n` +
      "📍 Otpravlyajte geolokatsiu dlya otslezhivaniya.",
    { parse_mode: "Markdown", ...activeTripInline(trip.id) },
  );
}

async function handleTripEndCb(ctx: BotContext) {
  await ctx.answerCbQuery();
  const tripId = ctx.match?.[1];
  if (!tripId) return;

  const result = await api.endTrip(tripId);
  if (!result) {
    await ctx.editMessageText(
      "❌ Oshibka zaversheniya poezdki.",
      backToMenuInline,
    );
    return;
  }

  ctx.session.step = undefined;
  ctx.session.data = undefined;

  const duration =
    result.startedAt && result.completedAt
      ? Math.round(
          (new Date(result.completedAt).getTime() -
            new Date(result.startedAt).getTime()) /
            60000,
        )
      : 0;

  await ctx.editMessageText(
    `✅ *Poezdka zavershena!*\n\n` +
      `Marshrut: ${result.routeName || "Bez marshruta"}\n` +
      `Dlitel\'nost\': ${duration} min\n` +
      `Ostanovki: ${result.stopsCompleted}/${result.stopsTotal}\n` +
      `Anomalij: ${result.anomaliesCount}`,
    { parse_mode: "Markdown", ...tripCompletedInline(tripId) },
  );
}

async function handleTripStopsList(ctx: BotContext) {
  await ctx.answerCbQuery();
  const tripId = ctx.match?.[1];
  if (!tripId) return;

  const stops = await api.getTripStops(tripId);
  if (stops.length === 0) {
    await ctx.editMessageText(
      "ℹ️ V poezdke net ostanovok.",
      activeTripInline(tripId),
    );
    return;
  }

  const stopsList = stops
    .map((s) => {
      const icon =
        s.status === "completed" ? "✅" : s.status === "arrived" ? "📍" : "⬜️";
      return `${icon} ${s.sequence}. ${s.name}${s.address ? ` — ${s.address}` : ""}`;
    })
    .join("\n");

  await ctx.editMessageText(
    `📍 *Ostanovki:*\n\n${stopsList}\n\nNazhmite na ostanovku dlya otmetki:`,
    { parse_mode: "Markdown", ...tripStopsInline(tripId, stops) },
  );
}

async function handleTripStatusCb(ctx: BotContext) {
  await ctx.answerCbQuery();
  const tripId = ctx.match?.[1];
  if (!tripId) return;

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const activeTrip = await api.getActiveTrip(user.id);
  if (!activeTrip) {
    await ctx.editMessageText("ℹ️ Poezdka ne najdena.", backToMenuInline);
    return;
  }

  const elapsed = activeTrip.startedAt
    ? Math.round(
        (Date.now() - new Date(activeTrip.startedAt).getTime()) / 60000,
      )
    : 0;

  await ctx.editMessageText(
    `🚗 *Status poezdki*\n\n` +
      `Marshrut: ${activeTrip.routeName || "Bez marshruta"}\n` +
      `TS: ${activeTrip.vehiclePlate || "N/A"}\n` +
      `V puti: ${elapsed} min\n` +
      `Ostanovki: ${activeTrip.stopsCompleted}/${activeTrip.stopsTotal}\n` +
      `Anomalij: ${activeTrip.anomaliesCount}`,
    { parse_mode: "Markdown", ...activeTripInline(activeTrip.id) },
  );
}

async function handleTripCompleteStop(ctx: BotContext) {
  await ctx.answerCbQuery("Otmecheno!");
  const tripId = ctx.match?.[1];
  const stopId = ctx.match?.[2];
  if (!tripId || !stopId) return;

  const success = await api.completeStop(tripId, stopId);
  if (!success) {
    await ctx.answerCbQuery("Oshibka otmetki ostanovki");
    return;
  }

  // Refresh stops list
  const stops = await api.getTripStops(tripId);
  const stopsList = stops
    .map((s) => {
      const icon =
        s.status === "completed" ? "✅" : s.status === "arrived" ? "📍" : "⬜️";
      return `${icon} ${s.sequence}. ${s.name}`;
    })
    .join("\n");

  const completed = stops.filter((s) => s.status === "completed").length;

  await ctx.editMessageText(
    `📍 *Ostanovki (${completed}/${stops.length}):*\n\n${stopsList}`,
    { parse_mode: "Markdown", ...tripStopsInline(tripId, stops) },
  );
}

// ============================================
// Staff Callbacks
// ============================================

async function handleStaffTasksActive(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const tasks = await api.getStaffTasks(user.id, "assigned");
  if (tasks.length === 0) {
    await ctx.editMessageText("✅ Нет активных задач!", staffTasksInline);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = tasks
    .slice(0, 10)
    .map((t: any, i: number) => {
      const typeLabels: Record<string, string> = {
        refill: "📦",
        collection: "💰",
        cleaning: "🧹",
        repair: "🔧",
        audit: "📋",
      };
      return `${i + 1}. ${typeLabels[t.taskType] || "📋"} ${t.machine?.name || ""} — ${t.taskType}`;
    })
    .join("\n");

  await ctx.editMessageText(
    `📋 *Активные задачи (${tasks.length}):*\n\n${list}`,
    { parse_mode: "Markdown", ...staffTasksInline },
  );
}

async function handleStaffTasksCompleted(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const tasks = await api.getStaffTasks(user.id, "completed");
  if (tasks.length === 0) {
    await ctx.editMessageText(
      "📭 Нет завершённых задач за сегодня.",
      staffTasksInline,
    );
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = tasks
    .slice(0, 10)
    .map(
      (t: any, i: number) =>
        `${i + 1}. ✅ ${t.machine?.name || ""} — ${t.taskType}`,
    )
    .join("\n");

  await ctx.editMessageText(
    `✅ *Завершённые задачи (${tasks.length}):*\n\n${list}`,
    { parse_mode: "Markdown", ...staffTasksInline },
  );
}

async function handleStaffShowRoute(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const tasks = await api.getStaffTasks(user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const active = tasks.filter((t: any) =>
    ["assigned", "in_progress"].includes(t.status),
  );

  if (active.length === 0) {
    await ctx.editMessageText("✅ Маршрут пуст!", mainMenuInline);
    return;
  }

  // Group by machine, build route list
  const machines = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active.forEach((t: any) => {
    const mid = t.machineId || t.machine?.id;
    if (mid && !machines.has(mid)) {
      machines.set(mid, t.machine?.name || mid);
    }
  });

  const routeList = Array.from(machines.values())
    .map((name, i) => `${i + 1}. 📍 ${name}`)
    .join("\n");

  await ctx.editMessageText(
    `🗺 *Маршрут:*\n\n${routeList}\n\nВсего: ${machines.size} точек`,
    { parse_mode: "Markdown", ...mainMenuInline },
  );
}

async function handleStaffDayStats(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const stats = await api.getStaffDayStats(user.id);
  if (!stats) {
    await ctx.editMessageText("📊 Нет данных за сегодня.", mainMenuInline);
    return;
  }

  await ctx.editMessageText(
    `📊 *Статистика дня:*\n\n` +
      `✅ Выполнено: ${stats.completedTasks || 0}\n` +
      `📋 В работе: ${stats.inProgressTasks || 0}\n` +
      `🏭 Автоматов: ${stats.machinesServiced || 0}\n` +
      `🚗 Расстояние: ${stats.distanceKm || 0} км`,
    { parse_mode: "Markdown", ...mainMenuInline },
  );
}

async function handleStaffAlertsCritical(ctx: BotContext) {
  await ctx.answerCbQuery();
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) return;

  const alerts = await api.getStaffAlerts(user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const critical = alerts.filter((a: any) => a.severity === "critical");

  if (critical.length === 0) {
    await ctx.editMessageText(
      "✅ Нет критических уведомлений.",
      staffAlertsInline,
    );
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = critical
    .slice(0, 10)
    .map((a: any, i: number) => `${i + 1}. 🔴 ${a.title || a.message}`)
    .join("\n");

  await ctx.editMessageText(
    `🔴 *Критические (${critical.length}):*\n\n${list}`,
    { parse_mode: "Markdown", ...staffAlertsInline },
  );
}

async function handleStaffAlertsReadAll(ctx: BotContext) {
  await ctx.answerCbQuery("Все прочитаны");
  await ctx.editMessageText(
    "✅ Все уведомления отмечены как прочитанные.",
    mainMenuInline,
  );
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = data.achievements
    .slice(0, 10)
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

export default { registerCallbacks };
