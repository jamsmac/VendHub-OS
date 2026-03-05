/**
 * Customer Bot — Orders Sub-Service
 * View order history, order details with items and status.
 *
 * NOTE: The orders tables (client_users, client_orders) do not yet exist
 * in Supabase. All methods show a "coming soon" placeholder until
 * the ordering system is implemented.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Telegraf, Markup } from "telegraf";
import { CustomerBotContext, CustomerSession } from "./customer-types";

@Injectable()
export class CustomerOrdersService {
  private readonly logger = new Logger(CustomerOrdersService.name);
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession>;

  constructor() {}

  setBot(
    bot: Telegraf<CustomerBotContext>,
    sessions: Map<number, CustomerSession>,
  ) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ---------- Order History ----------

  async showOrderHistory(ctx: CustomerBotContext, _page = 1) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📋 Наше меню", "catalog")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    const message =
      "📋 История заказов\n\n" +
      "🚧 Эта функция скоро будет доступна!\n\n" +
      "Совершайте покупки через наши автоматы, " +
      "и здесь появится полная история ваших заказов.\n\n" +
      "📍 Найти ближайший автомат → /start";

    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, keyboard);
      } catch {
        await ctx.reply(message, keyboard);
      }
    } else {
      await ctx.reply(message, keyboard);
    }
  }

  // ---------- Order Details ----------

  async showOrderDetails(ctx: CustomerBotContext, _orderId: string) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("« Мои заказы", "orders")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    await ctx.reply(
      "📋 Детали заказа\n\n🚧 Функция скоро будет доступна.",
      keyboard,
    );
  }
}
