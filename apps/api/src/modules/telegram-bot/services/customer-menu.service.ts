/**
 * Customer Bot — Main Menu Sub-Service
 * Shows the main menu and help, language selection.
 */

import { Injectable } from "@nestjs/common";
import { Telegraf, Markup } from "telegraf";
import { CustomerBotContext, CustomerSession } from "./customer-types";

@Injectable()
export class CustomerMenuService {
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession>;

  setBot(
    bot: Telegraf<CustomerBotContext>,
    sessions: Map<number, CustomerSession>,
  ) {
    this.bot = bot;
    this.sessions = sessions;
  }

  async showMainMenu(ctx: CustomerBotContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📋 Наше меню", "catalog")],
      [Markup.button.callback("⭐ Мои бонусы", "loyalty")],
      [Markup.button.callback("📦 Мои заказы", "orders")],
      [Markup.button.callback("📍 Автоматы", "machines")],
      [Markup.button.callback("📝 Оставить жалобу", "new_complaint")],
      [Markup.button.callback("🔍 Статус покупки", "check_status")],
      [Markup.button.callback("💰 Запросить возврат", "request_refund")],
      [Markup.button.callback("📋 Мои обращения", "my_complaints")],
      [
        Markup.button.callback("🇷🇺", "lang:ru"),
        Markup.button.callback("🇺🇿", "lang:uz"),
        Markup.button.callback("🇬🇧", "lang:en"),
      ],
    ]);

    const name = ctx.from?.first_name || "друг";

    const message =
      `👋 Привет, ${name}! Добро пожаловать в VendHub!\n\n` +
      "☕ Здесь вы можете:\n" +
      "• Посмотреть меню и цены\n" +
      "• Проверить свои бонусы и уровень\n" +
      "• Посмотреть историю заказов\n" +
      "• Найти ближайший автомат\n" +
      "• Оставить жалобу или запросить возврат\n\n" +
      "Выберите действие:";

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

  getHelpMessage(): string {
    return (
      "❓ Справка VendHub\n\n" +
      "📋 Команды:\n" +
      "/start — Главное меню\n" +
      "/menu — Каталог товаров\n" +
      "/bonuses — Мои бонусы и уровень\n" +
      "/orders — История заказов\n" +
      "/complaint — Оставить жалобу\n" +
      "/status — Проверить статус покупки\n" +
      "/refund — Запросить возврат\n" +
      "/mycomplaints — Мои обращения\n" +
      "/help — Эта справка\n\n" +
      "📞 Служба поддержки:\n" +
      "☎️ +998 71 200 39 99\n" +
      "📧 support@vendhub.uz"
    );
  }
}
