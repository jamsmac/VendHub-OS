import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { Telegraf } from "telegraf";
import { config } from "../config";
import { BotContext } from "../types";
import {
  redis,
  createSessionMiddleware,
  rateLimiter,
} from "../utils/session";
import { registerAllHandlers } from "../handlers";

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot: Telegraf<BotContext>;
  private isRunning = false;

  constructor() {
    this.bot = new Telegraf<BotContext>(config.botToken);
    this.setupMiddleware();
    registerAllHandlers(this.bot);
  }

  private setupMiddleware(): void {
    // Rate limiting
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        const isLimited = await rateLimiter.isLimited(ctx.from.id);
        if (isLimited) {
          this.logger.warn(`Rate limited user: ${ctx.from.id}`);
          return;
        }
      }
      await next();
    });

    // Session
    this.bot.use(createSessionMiddleware());

    // Logging
    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const duration = Date.now() - start;
      if (ctx.updateType) {
        this.logger.debug(
          `[${ctx.updateType}] ${ctx.from?.username || ctx.from?.id} - ${duration}ms`,
        );
      }
    });

    // Error handler
    this.bot.catch((err, ctx) => {
      this.logger.error(`Bot error for ${ctx.updateType}`, err);
    });
  }

  async onModuleInit(): Promise<void> {
    const useWebhook =
      config.webhookDomain &&
      !config.webhookDomain.includes("localhost") &&
      process.env.NODE_ENV === "production";

    if (useWebhook) {
      const webhookUrl = `${config.webhookDomain}/bot${config.botToken}`;
      await this.bot.telegram.setWebhook(webhookUrl, {
        secret_token: config.webhookSecret,
      });
      this.logger.log(`Webhook set: ${config.webhookDomain}/bot***`);
    } else {
      await this.bot.launch();
      this.logger.log("Bot started in long-polling mode");
    }

    this.isRunning = true;
  }

  async onModuleDestroy(): Promise<void> {
    this.bot.stop("NestJS shutdown");
    this.isRunning = false;
    await redis.quit().catch(() => {});
    this.logger.log("Bot stopped");
  }

  getBot(): Telegraf<BotContext> {
    return this.bot;
  }

  isHealthy(): boolean {
    return this.isRunning;
  }
}
