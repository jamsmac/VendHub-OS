/**
 * Telegram Customer Bot Service for VendHub OS
 * Orchestrator: initializes the customer bot and delegates to sub-services.
 *
 * Bot for customers: catalog, bonuses, orders, complaints, referrals, quests, promo codes.
 * Uses separate TELEGRAM_CUSTOMER_BOT_TOKEN (optional).
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Telegraf } from "telegraf";
import { ClientUser } from "../client/entities/client-user.entity";
import { CustomerBotContext, CustomerSession } from "./services/customer-types";
import { CustomerHandlersService } from "./services/customer-handlers.service";
import { CustomerMenuService } from "./services/customer-menu.service";
import { CustomerCatalogService } from "./services/customer-catalog.service";
import { CustomerLoyaltyService } from "./services/customer-loyalty.service";
import { CustomerOrdersService } from "./services/customer-orders.service";
import { CustomerComplaintsService } from "./services/customer-complaints.service";
import { CustomerLocationService } from "./services/customer-location.service";
import { CustomerCartService } from "./services/customer-cart.service";
import { CustomerEngagementService } from "./services/customer-engagement.service";

@Injectable()
export class TelegramCustomerBotService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TelegramCustomerBotService.name);
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession> = new Map();

  constructor(
    private configService: ConfigService,
    @InjectRepository(ClientUser)
    private clientUserRepo: Repository<ClientUser>,
    // Sub-services
    private readonly handlersService: CustomerHandlersService,
    private readonly menuService: CustomerMenuService,
    private readonly catalogService: CustomerCatalogService,
    private readonly loyaltyService: CustomerLoyaltyService,
    private readonly ordersService: CustomerOrdersService,
    private readonly complaintsService: CustomerComplaintsService,
    private readonly locationService: CustomerLocationService,
    private readonly cartService: CustomerCartService,
    private readonly engagementService: CustomerEngagementService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>("TELEGRAM_CUSTOMER_BOT_TOKEN");
    if (!token) {
      this.logger.warn(
        "TELEGRAM_CUSTOMER_BOT_TOKEN not set, customer bot disabled",
      );
      return;
    }

    this.bot = new Telegraf<CustomerBotContext>(token);

    // Global error handler
    this.bot.catch((err: unknown, ctx) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Customer bot error for ${ctx.from?.username || "unknown"}: ${msg}`,
      );
    });

    // Middleware: resolve client user
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        ctx.telegramId = ctx.from.id.toString();
        try {
          const clientUser = await this.clientUserRepo.findOne({
            where: { telegramId: ctx.from.id.toString() },
          });
          if (clientUser) {
            ctx.clientUser = clientUser;
          }
        } catch {
          // DB table may not exist yet — continue without auth
        }
      }
      return next();
    });

    // Wire sub-services with bot instance and shared sessions
    this.catalogService.setBot(this.bot, this.sessions);
    this.loyaltyService.setBot(this.bot, this.sessions);
    this.ordersService.setBot(this.bot, this.sessions);
    this.complaintsService.setBot(this.bot, this.sessions);
    this.locationService.setBot(this.bot, this.sessions);
    this.cartService.setBot(this.bot, this.sessions);
    this.engagementService.setBot(this.bot, this.sessions);
    this.menuService.setBot(this.bot, this.sessions);

    // Handlers service registers all bot commands/callbacks/messages
    this.handlersService.setBot(this.bot, this.sessions);

    // Start bot polling in background
    const skipPolling =
      this.configService.get<string>("DISABLE_BOT_POLLING") === "true";
    if (skipPolling) {
      this.logger.log(
        "DISABLE_BOT_POLLING=true — customer bot initialized for sending only",
      );
    } else {
      this.launchBotInBackground();
    }
  }

  private launchBotInBackground() {
    (async () => {
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await this.bot.launch({ dropPendingUpdates: true });
          this.logger.log("Telegram customer bot started");
          return;
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          if (
            (msg.includes("409") || msg.includes("Conflict")) &&
            attempt < 5
          ) {
            this.logger.warn(
              `Customer bot 409 Conflict (attempt ${attempt}/5) — retrying in 10s...`,
            );
            await new Promise((r) => setTimeout(r, 10_000));
          } else {
            this.logger.error(`Failed to start customer bot: ${msg}`);
            return;
          }
        }
      }
    })().catch((err) => {
      this.logger.error(`Customer bot background launch error: ${err}`);
    });
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop();
    }
  }

  async handleUpdate(update: unknown): Promise<void> {
    if (!this.bot) {
      this.logger.warn("Customer bot not initialized, dropping webhook update");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.bot.handleUpdate(update as any);
  }

  // ============================================================================
  // PUBLIC API — for sending messages from other modules
  // ============================================================================

  /**
   * Send a message to a customer by their Telegram ID.
   * Used by other modules (e.g., orders, complaints) to notify customers.
   */
  async sendMessage(telegramId: string, message: string): Promise<boolean> {
    if (!this.bot) return false;
    try {
      await this.bot.telegram.sendMessage(telegramId, message, {
        parse_mode: "HTML",
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send message to ${telegramId}: ${err}`);
      return false;
    }
  }

  /**
   * Notify customer about order status change.
   */
  async sendOrderStatusNotification(
    telegramId: string,
    orderNumber: string,
    status: string,
  ): Promise<boolean> {
    const statusLabels: Record<string, string> = {
      PAID: "✅ Оплачен",
      DISPENSING: "🔄 Выдача товара",
      COMPLETED: "✅ Выполнен",
      FAILED: "❌ Ошибка выдачи",
      REFUNDED: "💸 Средства возвращены",
    };

    const label = statusLabels[status] ?? status;
    const message = `📦 Заказ #${orderNumber}\n\nСтатус: ${label}`;
    return this.sendMessage(telegramId, message);
  }

  /**
   * Notify customer about complaint status change.
   */
  async sendComplaintStatusNotification(
    telegramId: string,
    complaintNumber: string,
    status: string,
  ): Promise<boolean> {
    const message = `📝 Жалоба #${complaintNumber}\n\nСтатус обновлён: ${status}`;
    return this.sendMessage(telegramId, message);
  }
}
