import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { config } from "../config";
import { api } from "../utils/api";
import {
  formatWelcomeMessage,
  formatHelpMessage,
  formatLoyaltyMessage,
  formatReferralMessage,
  formatSupportMessage,
} from "../utils/formatters";
import {
  mainMenuInline,
  pointsInline,
  questsInline,
  historyInline,
  referralInline,
  settingsInline,
  tripMenuInline,
  activeTripInline,
  vehicleSelectInline,
  achievementsInline,
  promoInline,
  menuMachineInline,
  staffTasksInline,
  staffRouteInline,
  staffAlertsInline,
} from "../keyboards/inline";
import { locationKeyboard, removeKeyboard } from "../keyboards/main";

// ============================================
// Register All Commands
// ============================================

export function registerCommands(bot: Telegraf<BotContext>) {
  // /start - Main entry point
  bot.command("start", handleStart);

  // /help - Help command
  bot.command("help", handleHelp);

  // /find - Find nearby machines
  bot.command("find", handleFind);

  // /points - Show loyalty points
  bot.command("points", handlePoints);

  // /quests - Show quests
  bot.command("quests", handleQuests);

  // /history - Purchase history
  bot.command("history", handleHistory);

  // /referral - Referral program
  bot.command("referral", handleReferral);

  // /support - Contact support
  bot.command("support", handleSupport);

  // /settings - User settings
  bot.command("settings", handleSettings);

  // /cart - Show cart
  bot.command("cart", handleCart);

  // /cancel - Cancel current action
  bot.command("cancel", handleCancel);

  // /trip - Trip management
  bot.command("trip", handleTrip);

  // /trip_start - Start a new trip
  bot.command("trip_start", handleTripStart);

  // /trip_end - End current trip
  bot.command("trip_end", handleTripEnd);

  // /trip_status - Current trip status
  bot.command("trip_status", handleTripStatus);

  // /menu - Machine menu
  bot.command("menu", handleMenu);

  // /promo - Promo code
  bot.command("promo", handlePromo);

  // /achievements - Achievements
  bot.command("achievements", handleAchievements);

  // Staff commands
  bot.command("tasks", handleStaffTasks);
  bot.command("route", handleStaffRoute);
  bot.command("report", handleStaffReport);
  bot.command("alerts", handleStaffAlerts);
}

// ============================================
// Command Handlers
// ============================================

/**
 * /start command handler
 */
async function handleStart(ctx: BotContext) {
  const telegramId = ctx.from!.id;
  const username = ctx.from!.username;
  const firstName = ctx.from!.first_name;
  const lastName = ctx.from!.last_name;

  // Check for referral code in start parameter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startPayload = (ctx.message as any)?.text?.split(" ")[1];
  let referralCode: string | undefined;

  if (startPayload?.startsWith("ref_")) {
    referralCode = startPayload.replace("ref_", "");
  }

  // Check if user exists
  let user = await api.getUserByTelegramId(telegramId);

  if (!user) {
    // Register new user
    user = await api.registerUser(telegramId, username, firstName, lastName);

    // Apply referral code if provided
    if (user && referralCode) {
      await api.applyReferralCode(user.id, referralCode);
    }
  }

  const name = firstName || username || "друг";
  const welcomeMessage = formatWelcomeMessage(name);

  await ctx.reply(welcomeMessage, {
    parse_mode: "Markdown",
    ...mainMenuInline,
  });
}

/**
 * /help command handler
 */
async function handleHelp(ctx: BotContext) {
  await ctx.reply(formatHelpMessage(), {
    parse_mode: "Markdown",
    ...mainMenuInline,
  });
}

/**
 * /find command handler
 */
async function handleFind(ctx: BotContext) {
  await ctx.reply(
    "📍 Отправьте мне вашу геолокацию, чтобы найти ближайшие автоматы:",
    locationKeyboard,
  );
  ctx.session.step = "awaiting_location";
}

/**
 * /points command handler
 */
async function handlePoints(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);

  if (!user) {
    await ctx.reply(
      "❌ Пользователь не найден. Используйте /start для регистрации.",
    );
    return;
  }

  const loyalty = await api.getUserLoyalty(user.id);

  if (!loyalty) {
    await ctx.reply(
      "💎 У вас пока нет бонусных баллов.\n\n" +
        "Совершите первую покупку, чтобы начать копить баллы!",
      mainMenuInline,
    );
    return;
  }

  await ctx.reply(formatLoyaltyMessage(loyalty), {
    parse_mode: "Markdown",
    ...pointsInline,
  });
}

/**
 * /quests command handler
 */
async function handleQuests(ctx: BotContext) {
  await ctx.reply(
    "🎯 *Ваши задания*\n\n" +
      "Выполняйте задания и получайте бонусные баллы!\n\n" +
      "Нажмите кнопку ниже, чтобы посмотреть доступные задания:",
    {
      parse_mode: "Markdown",
      ...questsInline,
    },
  );
}

/**
 * /history command handler
 */
async function handleHistory(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);

  if (!user) {
    await ctx.reply(
      "❌ Пользователь не найден. Используйте /start для регистрации.",
    );
    return;
  }

  const orders = await api.getUserOrders(user.id, 5);

  if (orders.length === 0) {
    await ctx.reply(
      "📜 *История покупок*\n\n" +
        "У вас пока нет покупок.\n" +
        "Найдите ближайший автомат и сделайте первый заказ!",
      {
        parse_mode: "Markdown",
        ...historyInline,
      },
    );
    return;
  }

  // Show last orders summary
  const ordersList = orders
    .map((o, i) => {
      const date = new Date(o.createdAt).toLocaleDateString("ru-RU");
      return `${i + 1}. #${o.orderNumber} — ${o.totalAmount.toLocaleString()} UZS (${date})`;
    })
    .join("\n");

  await ctx.reply(
    `📜 *Последние покупки:*\n\n${ordersList}\n\n` +
      `Нажмите кнопку ниже для полной истории:`,
    {
      parse_mode: "Markdown",
      ...historyInline,
    },
  );
}

/**
 * /referral command handler
 */
async function handleReferral(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);

  if (!user) {
    await ctx.reply(
      "❌ Пользователь не найден. Используйте /start для регистрации.",
    );
    return;
  }

  const referralCode = user.referralCode || `VH${ctx.from!.id}`;
  const referralLink = `https://t.me/${config.botToken.split(":")[0]}?start=ref_${referralCode}`;

  await ctx.reply(
    formatReferralMessage(referralCode, referralLink, user.referralsCount || 0),
    {
      parse_mode: "Markdown",
      ...referralInline(referralLink),
    },
  );
}

/**
 * /support command handler
 */
async function handleSupport(ctx: BotContext) {
  await ctx.reply(
    formatSupportMessage(
      config.supportUsername,
      config.supportEmail,
      config.supportPhone,
    ),
    { parse_mode: "Markdown" },
  );
}

/**
 * /settings command handler
 */
async function handleSettings(ctx: BotContext) {
  await ctx.reply("⚙️ *Настройки*\n\n" + "Выберите, что хотите изменить:", {
    parse_mode: "Markdown",
    ...settingsInline,
  });
}

/**
 * /cart command handler
 */
async function handleCart(ctx: BotContext) {
  const cart = ctx.session.cart || [];

  if (cart.length === 0) {
    await ctx.reply(
      "🛒 Ваша корзина пуста.\n\n" + "Найдите автомат и добавьте товары!",
      mainMenuInline,
    );
    return;
  }

  const items = cart
    .map(
      (item, i) =>
        `${i + 1}. ${item.name} x${item.quantity} — ${(item.price * item.quantity).toLocaleString()} UZS`,
    )
    .join("\n");

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  await ctx.reply(
    `🛒 *Ваша корзина:*\n\n${items}\n\n` +
      `💰 *Итого: ${total.toLocaleString()} UZS*`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Оформить заказ", callback_data: "checkout" }],
          [{ text: "🗑 Очистить", callback_data: "clear_cart" }],
          [{ text: "🔙 Меню", callback_data: "back_to_menu" }],
        ],
      },
    },
  );
}

/**
 * /cancel command handler
 */
async function handleCancel(ctx: BotContext) {
  ctx.session.step = undefined;
  ctx.session.data = undefined;

  await ctx.reply("❌ Действие отменено.", removeKeyboard);

  // Show main menu
  await ctx.reply("📱 Главное меню:", mainMenuInline);
}

// ============================================
// Trip Command Handlers
// ============================================

/**
 * /trip command handler - Trip menu
 */
async function handleTrip(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("Pozhalujsta, zaregistrirujtes' komandoj /start");
    return;
  }

  // Check for active trip
  const activeTrip = await api.getActiveTrip(user.id);
  if (activeTrip) {
    const stopsInfo =
      activeTrip.stopsTotal > 0
        ? `\nOstanovki: ${activeTrip.stopsCompleted}/${activeTrip.stopsTotal}`
        : "";
    const anomalies =
      activeTrip.anomaliesCount > 0
        ? `\nAnomalij: ${activeTrip.anomaliesCount}`
        : "";

    await ctx.reply(
      `🚗 *Aktivnaya poezdka*\n\n` +
        `Status: V puti\n` +
        `Marshrut: ${activeTrip.routeName || "Bez marshruta"}\n` +
        `TS: ${activeTrip.vehiclePlate || "N/A"}` +
        stopsInfo +
        anomalies +
        `\nNachalo: ${activeTrip.startedAt ? new Date(activeTrip.startedAt).toLocaleString("ru-RU") : "N/A"}`,
      { parse_mode: "Markdown", ...activeTripInline(activeTrip.id) },
    );
    return;
  }

  await ctx.reply("🚗 *Upravlenie poezdkami*\n\n" + "Vyberte dejstvie:", {
    parse_mode: "Markdown",
    ...tripMenuInline,
  });
}

/**
 * /trip_start command handler - Start a new trip
 */
async function handleTripStart(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("Pozhalujsta, zaregistrirujtes' komandoj /start");
    return;
  }

  // Check for existing active trip
  const activeTrip = await api.getActiveTrip(user.id);
  if (activeTrip) {
    await ctx.reply(
      "⚠️ U vas uzhe est' aktivnaya poezdka.\n" +
        "Zavershite yeyo komandoj /trip_end",
      activeTripInline(activeTrip.id),
    );
    return;
  }

  // Get available vehicles
  const vehicles = await api.getAvailableVehicles();
  if (vehicles.length === 0) {
    await ctx.reply("❌ Net dostupnykh transportnykh sredstv.");
    return;
  }

  ctx.session.step = "trip_selecting_vehicle";
  ctx.session.data = {};

  await ctx.reply("🚗 *Vybor transporta*\n\nVyberite transportnoe sredstvo:", {
    parse_mode: "Markdown",
    ...vehicleSelectInline(vehicles),
  });
}

/**
 * /trip_end command handler - End current trip
 */
async function handleTripEnd(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("Pozhalujsta, zaregistrirujtes' komandoj /start");
    return;
  }

  const activeTrip = await api.getActiveTrip(user.id);
  if (!activeTrip) {
    await ctx.reply("ℹ️ U vas net aktivnoj poezdki.");
    return;
  }

  const result = await api.endTrip(activeTrip.id);
  if (!result) {
    await ctx.reply("❌ Oshibka zaversheniya poezdki. Poprobujte snova.");
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

  await ctx.reply(
    `✅ *Poezdka zavershena!*\n\n` +
      `Marshrut: ${result.routeName || "Bez marshruta"}\n` +
      `Dlitel\'nost\': ${duration} min\n` +
      `Ostanovki: ${result.stopsCompleted}/${result.stopsTotal}\n` +
      `Anomalij: ${result.anomaliesCount}`,
    { parse_mode: "Markdown" },
  );
}

/**
 * /trip_status command handler - Show current trip status
 */
async function handleTripStatus(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("Pozhalujsta, zaregistrirujtes' komandoj /start");
    return;
  }

  const activeTrip = await api.getActiveTrip(user.id);
  if (!activeTrip) {
    await ctx.reply(
      "ℹ️ U vas net aktivnoj poezdki.\n\nIspol'zujte /trip_start dlya nachala.",
    );
    return;
  }

  const stops = await api.getTripStops(activeTrip.id);
  stops.filter((s) => s.status === "pending" || s.status === "arrived");
  const completedStops = stops.filter((s) => s.status === "completed");

  let stopsText = "";
  if (stops.length > 0) {
    stopsText =
      "\n\n📍 *Ostanovki:*\n" +
      stops
        .map((s) => {
          const icon =
            s.status === "completed"
              ? "✅"
              : s.status === "arrived"
                ? "📍"
                : "⬜️";
          return `${icon} ${s.sequence}. ${s.name}`;
        })
        .join("\n");
  }

  const elapsed = activeTrip.startedAt
    ? Math.round(
        (Date.now() - new Date(activeTrip.startedAt).getTime()) / 60000,
      )
    : 0;

  await ctx.reply(
    `🚗 *Status poezdki*\n\n` +
      `Marshrut: ${activeTrip.routeName || "Bez marshruta"}\n` +
      `TS: ${activeTrip.vehiclePlate || "N/A"}\n` +
      `V puti: ${elapsed} min\n` +
      `Vypolneno: ${completedStops.length}/${stops.length} ostanovok\n` +
      `Anomalij: ${activeTrip.anomaliesCount}` +
      stopsText,
    { parse_mode: "Markdown", ...activeTripInline(activeTrip.id) },
  );
}

// ============================================
// Menu & Promo & Achievements Handlers
// ============================================

/**
 * /menu command handler - Show machine menu
 */
async function handleMenu(ctx: BotContext) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (ctx.message as any)?.text || "";
  const parts = text.split(" ");
  const machineId = parts[1];

  if (!machineId) {
    await ctx.reply(
      "🍵 *Меню автомата*\n\n" +
        "Укажите ID автомата:\n" +
        "`/menu ABC123`\n\n" +
        "Или найдите автомат командой /find",
      { parse_mode: "Markdown" },
    );
    return;
  }

  const machine = await api.getMachine(machineId);
  if (!machine) {
    await ctx.reply("❌ Автомат не найден. Проверьте код.");
    return;
  }

  const products = await api.getMachineProducts(machineId);
  if (products.length === 0) {
    await ctx.reply(`🏭 *${machine.name}*\n\n📭 Меню пока недоступно.`, {
      parse_mode: "Markdown",
      ...menuMachineInline(machineId),
    });
    return;
  }

  const productsList = products
    .slice(0, 10)
    .map((p, i) => {
      const price = p.price ? `${p.price.toLocaleString()} UZS` : "N/A";
      return `${i + 1}. ${p.name} — ${price}`;
    })
    .join("\n");

  await ctx.reply(
    `🏭 *${machine.name}*\n\n` +
      `🍵 *Меню:*\n${productsList}\n\n` +
      `Всего товаров: ${products.length}`,
    { parse_mode: "Markdown", ...menuMachineInline(machineId) },
  );
}

/**
 * /promo command handler - Promo code
 */
async function handlePromo(ctx: BotContext) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (ctx.message as any)?.text || "";
  const parts = text.split(" ");
  const code = parts[1];

  if (!code) {
    await ctx.reply(
      "🏷 *Промокод*\n\n" + "Введите промокод:\n" + "`/promo MYCODE123`",
      { parse_mode: "Markdown", ...promoInline },
    );
    return;
  }

  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("❌ Пользователь не найден. Используйте /start");
    return;
  }

  // Validate first
  const validation = await api.validatePromoCode(code);
  if (!validation || !validation.valid) {
    await ctx.reply(
      "❌ Промокод недействителен или истёк.\n\nПроверьте правильность кода.",
      promoInline,
    );
    return;
  }

  // Redeem
  const redeemed = await api.redeemPromoCode(user.id, code);
  if (redeemed) {
    const valueText =
      validation.type === "percent"
        ? `${validation.value}% скидка`
        : `${validation.value.toLocaleString()} UZS`;

    await ctx.reply(
      `✅ *Промокод активирован!*\n\n` +
        `🏷 Код: \`${code}\`\n` +
        `🎁 Бонус: ${valueText}\n` +
        `📝 ${validation.description}`,
      { parse_mode: "Markdown", ...mainMenuInline },
    );
  } else {
    await ctx.reply(
      "❌ Не удалось активировать промокод.\nВозможно, он уже был использован.",
      mainMenuInline,
    );
  }
}

/**
 * /achievements command handler
 */
async function handleAchievements(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("❌ Пользователь не найден. Используйте /start");
    return;
  }

  const data = await api.getUserAchievements(user.id);
  if (!data || data.achievements.length === 0) {
    await ctx.reply(
      "🏆 *Достижения*\n\n" +
        "📭 У вас пока нет достижений.\n" +
        "Совершайте покупки и выполняйте задания!",
      { parse_mode: "Markdown", ...achievementsInline },
    );
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = data.achievements
    .slice(0, 8)
    .map((a: any) => {
      const icon = a.unlocked ? "🏆" : "🔒";
      return `${icon} *${a.name}*\n   ${a.description}`;
    })
    .join("\n\n");

  await ctx.reply(
    `🏆 *Достижения* (${data.unlocked}/${data.total})\n\n${list}`,
    { parse_mode: "Markdown", ...achievementsInline },
  );
}

// ============================================
// Staff Command Handlers
// ============================================

/**
 * /tasks command handler - Staff tasks
 */
async function handleStaffTasks(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("❌ Пользователь не найден. Используйте /start");
    return;
  }

  const tasks = await api.getStaffTasks(user.id, "assigned");
  if (tasks.length === 0) {
    await ctx.reply(
      "📋 *Мои задачи*\n\n✅ Нет активных задач!\nОтличная работа!",
      { parse_mode: "Markdown", ...staffTasksInline },
    );
    return;
  }

  const taskTypeLabels: Record<string, string> = {
    refill: "📦 Пополнение",
    collection: "💰 Инкассация",
    cleaning: "🧹 Чистка",
    repair: "🔧 Ремонт",
    audit: "📋 Аудит",
    maintenance: "⚙️ ТО",
  };

  const priorityIcons: Record<string, string> = {
    urgent: "🔴",
    high: "🟠",
    normal: "🔵",
    low: "⚪",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasksList = tasks
    .slice(0, 10)
    .map((t: any, i: number) => {
      const type = taskTypeLabels[t.taskType] || t.taskType;
      const priority = priorityIcons[t.priority] || "⚪";
      const machine = t.machine?.name || t.machineName || "";
      return `${i + 1}. ${priority} ${type}\n   📍 ${machine}`;
    })
    .join("\n\n");

  await ctx.reply(`📋 *Мои задачи* (${tasks.length})\n\n${tasksList}`, {
    parse_mode: "Markdown",
    ...staffTasksInline,
  });
}

/**
 * /route command handler - Staff daily route
 */
async function handleStaffRoute(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("❌ Пользователь не найден. Используйте /start");
    return;
  }

  const tasks = await api.getStaffTasks(user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeTasks = tasks.filter((t: any) =>
    ["assigned", "in_progress"].includes(t.status),
  );

  if (activeTasks.length === 0) {
    await ctx.reply(
      "🗺 *Маршрут на сегодня*\n\n" +
        "✅ Маршрут пуст — нет назначенных задач!",
      { parse_mode: "Markdown", ...staffRouteInline },
    );
    return;
  }

  // Group by machine
  const machineMap = new Map<string, { name: string; tasks: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activeTasks.forEach((t: any) => {
    const mid = t.machineId || t.machine?.id;
    if (!mid) return;
    const existing = machineMap.get(mid);
    if (existing) {
      existing.tasks++;
    } else {
      machineMap.set(mid, {
        name: t.machine?.name || t.machineName || mid,
        tasks: 1,
      });
    }
  });

  const stops = Array.from(machineMap.entries())
    .map(([_id, info], i) => `${i + 1}. 📍 ${info.name} — ${info.tasks} задач`)
    .join("\n");

  const totalTime = activeTasks.length * 20; // ~20 min per task

  await ctx.reply(
    `🗺 *Маршрут на сегодня*\n\n` +
      `📍 Точек: ${machineMap.size}\n` +
      `📋 Задач: ${activeTasks.length}\n` +
      `⏱ ~${Math.round(totalTime / 60)}ч ${totalTime % 60}мин\n\n` +
      `*Остановки:*\n${stops}`,
    { parse_mode: "Markdown", ...staffRouteInline },
  );
}

/**
 * /report command handler - Staff daily report
 */
async function handleStaffReport(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("❌ Пользователь не найден. Используйте /start");
    return;
  }

  const stats = await api.getStaffDayStats(user.id);
  if (!stats) {
    await ctx.reply("📊 *Дневной отчёт*\n\n📭 Нет данных за сегодня.", {
      parse_mode: "Markdown",
    });
    return;
  }

  await ctx.reply(
    `📊 *Дневной отчёт*\n\n` +
      `✅ Выполнено задач: ${stats.completedTasks || 0}\n` +
      `📋 В работе: ${stats.inProgressTasks || 0}\n` +
      `⏳ Ожидают: ${stats.pendingTasks || 0}\n` +
      `🚗 Пройдено: ${stats.distanceKm ? `${stats.distanceKm} км` : "N/A"}\n` +
      `⏱ Время работы: ${stats.workHours ? `${stats.workHours}ч` : "N/A"}\n` +
      `🏭 Обслужено автоматов: ${stats.machinesServiced || 0}`,
    { parse_mode: "Markdown", ...mainMenuInline },
  );
}

/**
 * /alerts command handler - Staff alerts
 */
async function handleStaffAlerts(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply("❌ Пользователь не найден. Используйте /start");
    return;
  }

  const alerts = await api.getStaffAlerts(user.id);
  if (alerts.length === 0) {
    await ctx.reply("🔔 *Уведомления*\n\n✅ Нет новых уведомлений.", {
      parse_mode: "Markdown",
      ...staffAlertsInline,
    });
    return;
  }

  const alertIcons: Record<string, string> = {
    critical: "🔴",
    warning: "🟡",
    info: "🔵",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertsList = alerts
    .slice(0, 10)
    .map((a: any, _i: number) => {
      const icon = alertIcons[a.severity] || "🔔";
      const time = a.createdAt
        ? new Date(a.createdAt).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
      return `${icon} ${a.title || a.message}\n   ${time}`;
    })
    .join("\n\n");

  await ctx.reply(`🔔 *Уведомления* (${alerts.length})\n\n${alertsList}`, {
    parse_mode: "Markdown",
    ...staffAlertsInline,
  });
}

export default { registerCommands };
