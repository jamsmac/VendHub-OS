import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import { config } from '../config';
import { api } from '../utils/api';
import {
  formatWelcomeMessage,
  formatHelpMessage,
  formatLoyaltyMessage,
  formatReferralMessage,
  formatSupportMessage,
} from '../utils/formatters';
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
} from '../keyboards/inline';
import { locationKeyboard, removeKeyboard } from '../keyboards/main';

// ============================================
// Register All Commands
// ============================================

export function registerCommands(bot: Telegraf<BotContext>) {
  // /start - Main entry point
  bot.command('start', handleStart);

  // /help - Help command
  bot.command('help', handleHelp);

  // /find - Find nearby machines
  bot.command('find', handleFind);

  // /points - Show loyalty points
  bot.command('points', handlePoints);

  // /quests - Show quests
  bot.command('quests', handleQuests);

  // /history - Purchase history
  bot.command('history', handleHistory);

  // /referral - Referral program
  bot.command('referral', handleReferral);

  // /support - Contact support
  bot.command('support', handleSupport);

  // /settings - User settings
  bot.command('settings', handleSettings);

  // /cart - Show cart
  bot.command('cart', handleCart);

  // /cancel - Cancel current action
  bot.command('cancel', handleCancel);

  // /trip - Trip management
  bot.command('trip', handleTrip);

  // /trip_start - Start a new trip
  bot.command('trip_start', handleTripStart);

  // /trip_end - End current trip
  bot.command('trip_end', handleTripEnd);

  // /trip_status - Current trip status
  bot.command('trip_status', handleTripStatus);
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
  const startPayload = (ctx.message as any)?.text?.split(' ')[1];
  let referralCode: string | undefined;

  if (startPayload?.startsWith('ref_')) {
    referralCode = startPayload.replace('ref_', '');
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

  const name = firstName || username || 'друг';
  const welcomeMessage = formatWelcomeMessage(name);

  await ctx.reply(welcomeMessage, {
    parse_mode: 'Markdown',
    ...mainMenuInline,
  });
}

/**
 * /help command handler
 */
async function handleHelp(ctx: BotContext) {
  await ctx.reply(formatHelpMessage(), {
    parse_mode: 'Markdown',
    ...mainMenuInline,
  });
}

/**
 * /find command handler
 */
async function handleFind(ctx: BotContext) {
  await ctx.reply(
    '📍 Отправьте мне вашу геолокацию, чтобы найти ближайшие автоматы:',
    locationKeyboard
  );
  ctx.session.step = 'awaiting_location';
}

/**
 * /points command handler
 */
async function handlePoints(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);

  if (!user) {
    await ctx.reply(
      '❌ Пользователь не найден. Используйте /start для регистрации.'
    );
    return;
  }

  const loyalty = await api.getUserLoyalty(user.id);

  if (!loyalty) {
    await ctx.reply(
      '💎 У вас пока нет бонусных баллов.\n\n' +
      'Совершите первую покупку, чтобы начать копить баллы!',
      mainMenuInline
    );
    return;
  }

  await ctx.reply(formatLoyaltyMessage(loyalty), {
    parse_mode: 'Markdown',
    ...pointsInline,
  });
}

/**
 * /quests command handler
 */
async function handleQuests(ctx: BotContext) {
  await ctx.reply(
    '🎯 *Ваши задания*\n\n' +
    'Выполняйте задания и получайте бонусные баллы!\n\n' +
    'Нажмите кнопку ниже, чтобы посмотреть доступные задания:',
    {
      parse_mode: 'Markdown',
      ...questsInline,
    }
  );
}

/**
 * /history command handler
 */
async function handleHistory(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);

  if (!user) {
    await ctx.reply(
      '❌ Пользователь не найден. Используйте /start для регистрации.'
    );
    return;
  }

  const orders = await api.getUserOrders(user.id, 5);

  if (orders.length === 0) {
    await ctx.reply(
      '📜 *История покупок*\n\n' +
      'У вас пока нет покупок.\n' +
      'Найдите ближайший автомат и сделайте первый заказ!',
      {
        parse_mode: 'Markdown',
        ...historyInline,
      }
    );
    return;
  }

  // Show last orders summary
  const ordersList = orders.map((o, i) => {
    const date = new Date(o.createdAt).toLocaleDateString('ru-RU');
    return `${i + 1}. #${o.orderNumber} — ${o.totalAmount.toLocaleString()} UZS (${date})`;
  }).join('\n');

  await ctx.reply(
    `📜 *Последние покупки:*\n\n${ordersList}\n\n` +
    `Нажмите кнопку ниже для полной истории:`,
    {
      parse_mode: 'Markdown',
      ...historyInline,
    }
  );
}

/**
 * /referral command handler
 */
async function handleReferral(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);

  if (!user) {
    await ctx.reply(
      '❌ Пользователь не найден. Используйте /start для регистрации.'
    );
    return;
  }

  const referralCode = user.referralCode || `VH${ctx.from!.id}`;
  const referralLink = `https://t.me/${config.botToken.split(':')[0]}?start=ref_${referralCode}`;

  await ctx.reply(
    formatReferralMessage(referralCode, referralLink, user.referralsCount || 0),
    {
      parse_mode: 'Markdown',
      ...referralInline(referralLink),
    }
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
      config.supportPhone
    ),
    { parse_mode: 'Markdown' }
  );
}

/**
 * /settings command handler
 */
async function handleSettings(ctx: BotContext) {
  await ctx.reply(
    '⚙️ *Настройки*\n\n' +
    'Выберите, что хотите изменить:',
    {
      parse_mode: 'Markdown',
      ...settingsInline,
    }
  );
}

/**
 * /cart command handler
 */
async function handleCart(ctx: BotContext) {
  const cart = ctx.session.cart || [];

  if (cart.length === 0) {
    await ctx.reply(
      '🛒 Ваша корзина пуста.\n\n' +
      'Найдите автомат и добавьте товары!',
      mainMenuInline
    );
    return;
  }

  const items = cart.map((item, i) =>
    `${i + 1}. ${item.name} x${item.quantity} — ${(item.price * item.quantity).toLocaleString()} UZS`
  ).join('\n');

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  await ctx.reply(
    `🛒 *Ваша корзина:*\n\n${items}\n\n` +
    `💰 *Итого: ${total.toLocaleString()} UZS*`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Оформить заказ', callback_data: 'checkout' }],
          [{ text: '🗑 Очистить', callback_data: 'clear_cart' }],
          [{ text: '🔙 Меню', callback_data: 'back_to_menu' }],
        ],
      },
    }
  );
}

/**
 * /cancel command handler
 */
async function handleCancel(ctx: BotContext) {
  ctx.session.step = undefined;
  ctx.session.data = undefined;

  await ctx.reply(
    '❌ Действие отменено.',
    removeKeyboard
  );

  // Show main menu
  await ctx.reply(
    '📱 Главное меню:',
    mainMenuInline
  );
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
    await ctx.reply('Pozhalujsta, zaregistrirujtes\' komandoj /start');
    return;
  }

  // Check for active trip
  const activeTrip = await api.getActiveTrip(user.id);
  if (activeTrip) {
    const stopsInfo = activeTrip.stopsTotal > 0
      ? `\nOstanovki: ${activeTrip.stopsCompleted}/${activeTrip.stopsTotal}`
      : '';
    const anomalies = activeTrip.anomaliesCount > 0
      ? `\nAnomalij: ${activeTrip.anomaliesCount}`
      : '';

    await ctx.reply(
      `🚗 *Aktivnaya poezdka*\n\n` +
      `Status: V puti\n` +
      `Marshrut: ${activeTrip.routeName || 'Bez marshruta'}\n` +
      `TS: ${activeTrip.vehiclePlate || 'N/A'}` +
      stopsInfo +
      anomalies +
      `\nNachalo: ${activeTrip.startedAt ? new Date(activeTrip.startedAt).toLocaleString('ru-RU') : 'N/A'}`,
      { parse_mode: 'Markdown', ...activeTripInline(activeTrip.id) }
    );
    return;
  }

  await ctx.reply(
    '🚗 *Upravlenie poezdkami*\n\n' +
    'Vyberte dejstvie:',
    { parse_mode: 'Markdown', ...tripMenuInline }
  );
}

/**
 * /trip_start command handler - Start a new trip
 */
async function handleTripStart(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply('Pozhalujsta, zaregistrirujtes\' komandoj /start');
    return;
  }

  // Check for existing active trip
  const activeTrip = await api.getActiveTrip(user.id);
  if (activeTrip) {
    await ctx.reply(
      '⚠️ U vas uzhe est\' aktivnaya poezdka.\n' +
      'Zavershite yeyo komandoj /trip_end',
      activeTripInline(activeTrip.id)
    );
    return;
  }

  // Get available vehicles
  const vehicles = await api.getAvailableVehicles();
  if (vehicles.length === 0) {
    await ctx.reply('❌ Net dostupnykh transportnykh sredstv.');
    return;
  }

  ctx.session.step = 'trip_selecting_vehicle';
  ctx.session.data = {};

  await ctx.reply(
    '🚗 *Vybor transporta*\n\nVyberite transportnoe sredstvo:',
    { parse_mode: 'Markdown', ...vehicleSelectInline(vehicles) }
  );
}

/**
 * /trip_end command handler - End current trip
 */
async function handleTripEnd(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply('Pozhalujsta, zaregistrirujtes\' komandoj /start');
    return;
  }

  const activeTrip = await api.getActiveTrip(user.id);
  if (!activeTrip) {
    await ctx.reply('ℹ️ U vas net aktivnoj poezdki.');
    return;
  }

  const result = await api.endTrip(activeTrip.id);
  if (!result) {
    await ctx.reply('❌ Oshibka zaversheniya poezdki. Poprobujte snova.');
    return;
  }

  ctx.session.step = undefined;
  ctx.session.data = undefined;

  const duration = result.startedAt && result.completedAt
    ? Math.round((new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime()) / 60000)
    : 0;

  await ctx.reply(
    `✅ *Poezdka zavershena!*\n\n` +
    `Marshrut: ${result.routeName || 'Bez marshruta'}\n` +
    `Dlitel\'nost\': ${duration} min\n` +
    `Ostanovki: ${result.stopsCompleted}/${result.stopsTotal}\n` +
    `Anomalij: ${result.anomaliesCount}`,
    { parse_mode: 'Markdown' }
  );
}

/**
 * /trip_status command handler - Show current trip status
 */
async function handleTripStatus(ctx: BotContext) {
  const user = await api.getUserByTelegramId(ctx.from!.id);
  if (!user) {
    await ctx.reply('Pozhalujsta, zaregistrirujtes\' komandoj /start');
    return;
  }

  const activeTrip = await api.getActiveTrip(user.id);
  if (!activeTrip) {
    await ctx.reply('ℹ️ U vas net aktivnoj poezdki.\n\nIspol\'zujte /trip_start dlya nachala.');
    return;
  }

  const stops = await api.getTripStops(activeTrip.id);
  const pendingStops = stops.filter(s => s.status === 'pending' || s.status === 'arrived');
  const completedStops = stops.filter(s => s.status === 'completed');

  let stopsText = '';
  if (stops.length > 0) {
    stopsText = '\n\n📍 *Ostanovki:*\n' + stops.map(s => {
      const icon = s.status === 'completed' ? '✅' : s.status === 'arrived' ? '📍' : '⬜️';
      return `${icon} ${s.sequence}. ${s.name}`;
    }).join('\n');
  }

  const elapsed = activeTrip.startedAt
    ? Math.round((Date.now() - new Date(activeTrip.startedAt).getTime()) / 60000)
    : 0;

  await ctx.reply(
    `🚗 *Status poezdki*\n\n` +
    `Marshrut: ${activeTrip.routeName || 'Bez marshruta'}\n` +
    `TS: ${activeTrip.vehiclePlate || 'N/A'}\n` +
    `V puti: ${elapsed} min\n` +
    `Vypolneno: ${completedStops.length}/${stops.length} ostanovok\n` +
    `Anomalij: ${activeTrip.anomaliesCount}` +
    stopsText,
    { parse_mode: 'Markdown', ...activeTripInline(activeTrip.id) }
  );
}

export default { registerCommands };
