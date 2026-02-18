import { Telegraf } from "telegraf";
import { config, validateConfig } from "./config";
import { BotContext } from "./types";
import { redis, createSessionMiddleware, rateLimiter } from "./utils/session";
import { registerAllHandlers } from "./handlers";

// ============================================
// Bot Initialization
// ============================================

const bot = new Telegraf<BotContext>(config.botToken);

// ============================================
// Middleware
// ============================================

// Rate limiting middleware
bot.use(async (ctx, next) => {
  if (ctx.from) {
    const isLimited = await rateLimiter.isLimited(ctx.from.id);
    if (isLimited) {
      console.log(`Rate limited user: ${ctx.from.id}`);
      return;
    }
  }
  await next();
});

// Session middleware
bot.use(createSessionMiddleware());

// Logging middleware
bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  if (ctx.updateType) {
    console.log(
      `[${ctx.updateType}] ${ctx.from?.username || ctx.from?.id} - ${duration}ms`,
    );
  }
});

// ============================================
// Register Handlers
// ============================================

registerAllHandlers(bot);

// ============================================
// Error Handling
// ============================================

bot.catch((err, ctx) => {
  console.error(`❌ Error for ${ctx.updateType}:`, err);

  // Try to send error message to user
  ctx.reply("❌ Произошла ошибка. Попробуйте позже.").catch(() => {
    // Ignore if we can't send message
  });
});

// ============================================
// Launch Bot
// ============================================

async function main() {
  console.log("🤖 Starting VendHub Telegram Bot...");
  console.log(`📦 Version: 2.0.0 (Modular)`);

  // Validate configuration
  try {
    validateConfig();
    console.log("✅ Configuration validated");
  } catch (error) {
    console.error("❌ Configuration error:", error);
    process.exit(1);
  }

  // Check Redis connection
  try {
    await redis.ping();
    console.log("✅ Redis connected");
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    process.exit(1);
  }

  // Set bot commands
  // Client commands (default)
  await bot.telegram.setMyCommands([
    { command: "start", description: "Главное меню" },
    { command: "find", description: "Найти ближайшие автоматы" },
    { command: "menu", description: "Меню автомата" },
    { command: "points", description: "Мои бонусные баллы" },
    { command: "quests", description: "Мои задания" },
    { command: "achievements", description: "Мои достижения" },
    { command: "promo", description: "Активировать промокод" },
    { command: "history", description: "История покупок" },
    { command: "referral", description: "Реферальная программа" },
    { command: "cart", description: "Корзина" },
    { command: "settings", description: "Настройки" },
    { command: "support", description: "Поддержка" },
    { command: "help", description: "Помощь" },
  ]);

  // Staff-specific commands (shown in group chats or via BotFather scope)
  await bot.telegram.setMyCommands(
    [
      { command: "tasks", description: "Мои задачи" },
      { command: "route", description: "Маршрут на сегодня" },
      { command: "report", description: "Дневной отчёт" },
      { command: "alerts", description: "Уведомления" },
      { command: "trip", description: "Управление поездками" },
      { command: "find", description: "Найти автомат" },
      { command: "settings", description: "Настройки" },
      { command: "help", description: "Помощь" },
    ],
    { scope: { type: "all_group_chats" } },
  );
  console.log("✅ Bot commands set");

  // Launch bot
  if (config.webhookDomain) {
    // Webhook mode for production
    const webhookUrl = `${config.webhookDomain}${config.webhookPath}`;

    await bot.telegram.setWebhook(webhookUrl);
    console.log(`🌐 Webhook set: ${webhookUrl}`);

    await bot.launch({
      webhook: {
        domain: config.webhookDomain,
        path: config.webhookPath,
        port: config.port,
      },
    });

    console.log(`🚀 Bot started in webhook mode on port ${config.port}`);
  } else {
    // Long polling mode for development
    await bot.launch();
    console.log("🔄 Bot started in polling mode");
  }

  console.log("");
  console.log("╔════════════════════════════════════════╗");
  console.log("║     🤖 VendHub Bot is running!         ║");
  console.log("║                                        ║");
  console.log(
    `║     Mode: ${config.webhookDomain ? "Webhook" : "Polling"}                      ║`,
  );
  console.log(`║     API: ${config.apiUrl}      ║`);
  console.log("╚════════════════════════════════════════╝");
  console.log("");
}

// ============================================
// Graceful Shutdown
// ============================================

function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  bot.stop(signal);

  try {
    redis.disconnect();
    console.log("✅ Redis disconnected");
    process.exit(0);
  } catch (err: unknown) {
    console.error("Error disconnecting Redis:", err);
    process.exit(1);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  shutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// ============================================
// Start
// ============================================

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
