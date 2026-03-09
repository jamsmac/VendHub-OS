import * as http from "http";
import { Telegraf } from "telegraf";
import { config, validateConfig } from "./config";
import { BotContext } from "./types";
import { redis, createSessionMiddleware, rateLimiter } from "./utils/session";
import { registerAllHandlers } from "./handlers";
import logger from "./utils/logger";

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
      logger.warn(`Rate limited user: ${ctx.from.id}`);
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
    logger.debug(
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
  logger.error(`Error for ${ctx.updateType}:`, err);

  // Try to send error message to user
  ctx.reply("❌ Произошла ошибка. Попробуйте позже.").catch(() => {
    // Ignore if we can't send message
  });
});

// ============================================
// Launch Bot
// ============================================

async function main() {
  logger.info("Starting VendHub Telegram Bot...");
  logger.info("Version: 2.0.0 (Modular)");

  // Validate configuration
  try {
    validateConfig();
    logger.info("Configuration validated");
  } catch (error) {
    logger.error("Configuration error:", error);
    process.exit(1);
  }

  // Check Redis connection
  try {
    await redis.ping();
    logger.info("Redis connected");
  } catch (error) {
    logger.error("Redis connection failed:", error);
    process.exit(1);
  }

  // Set bot commands — all available commands (handlers enforce auth per role)
  const allCommands = [
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
    { command: "tasks", description: "Мои задачи" },
    { command: "route", description: "Маршрут на сегодня" },
    { command: "report", description: "Дневной отчёт" },
    { command: "alerts", description: "Уведомления" },
    { command: "trip", description: "Управление поездками" },
    { command: "settings", description: "Настройки" },
    { command: "support", description: "Поддержка" },
    { command: "help", description: "Помощь" },
  ];
  await bot.telegram.setMyCommands(allCommands);
  logger.info("Bot commands set");

  // Single HTTP server for both health check and webhook (Railway exposes one PORT)
  const port = config.port;
  let webhookCallback:
    | ((req: http.IncomingMessage, res: http.ServerResponse) => void)
    | null = null;

  if (config.webhookDomain) {
    // Create webhook callback — retry setWebhook with backoff for 429 rate limits
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        webhookCallback = await bot.createWebhook({
          domain: config.webhookDomain,
          path: config.webhookPath,
          secret_token: config.webhookSecret || undefined,
        });
        const webhookUrl = `${config.webhookDomain}${config.webhookPath}`;
        logger.info(`Webhook set: ${webhookUrl}`);
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") && attempt < 5) {
          const delay = attempt * 3000;
          logger.warn(
            `Telegram rate limited (attempt ${attempt}/5), retrying in ${delay}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
  }

  const server = http.createServer(async (req, res) => {
    // Health check
    if (req.url === "/health" && req.method === "GET") {
      try {
        await redis.ping();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "healthy",
            uptime: process.uptime(),
            mode: config.webhookDomain ? "webhook" : "polling",
            timestamp: new Date().toISOString(),
          }),
        );
      } catch {
        res.writeHead(503, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "unhealthy", error: "Redis down" }));
      }
      return;
    }

    // Webhook handler
    if (
      webhookCallback &&
      req.url === config.webhookPath &&
      req.method === "POST"
    ) {
      webhookCallback(req, res);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    logger.info(
      `Server listening on port ${port} (health + ${config.webhookDomain ? "webhook" : "no webhook"})`,
    );
  });

  if (!config.webhookDomain) {
    // Polling mode — drop pending updates to avoid 409 conflict on restart
    await bot.launch({ dropPendingUpdates: true });
    logger.info("Bot started in polling mode");
  }

  logger.info(
    `VendHub Bot is running | Mode: ${config.webhookDomain ? "Webhook" : "Polling"} | API: ${config.apiUrl}`,
  );
}

// ============================================
// Graceful Shutdown
// ============================================

function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  bot.stop(signal);

  try {
    redis.disconnect();
    logger.info("Redis disconnected");
    process.exit(0);
  } catch (err: unknown) {
    logger.error("Error disconnecting Redis:", err);
    process.exit(1);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  shutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// ============================================
// Start
// ============================================

main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
