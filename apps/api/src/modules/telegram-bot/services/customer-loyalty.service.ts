/**
 * Customer Bot — Loyalty & Wallet Sub-Service
 * View bonus balance, loyalty tier, points history, wallet balance.
 *
 * NOTE: The loyalty tables (client_users, client_loyalty_accounts,
 * client_loyalty_ledger, client_wallets) do not yet exist in Supabase.
 * Overview and history show "coming soon"; tier info is static content.
 */

import { Injectable, Logger } from "@nestjs/common";
import { Telegraf, Markup } from "telegraf";
import { CustomerBotContext, CustomerSession } from "./customer-types";

const TIER_INFO: Record<
  string,
  { label: string; icon: string; cashback: string; nextTier?: string }
> = {
  bronze: {
    label: "Bronze",
    icon: "🥉",
    cashback: "1%",
    nextTier: "silver",
  },
  silver: {
    label: "Silver",
    icon: "🥈",
    cashback: "3%",
    nextTier: "gold",
  },
  gold: {
    label: "Gold",
    icon: "🥇",
    cashback: "5%",
    nextTier: "platinum",
  },
  platinum: {
    label: "Platinum",
    icon: "💎",
    cashback: "10%",
    nextTier: "diamond",
  },
  diamond: {
    label: "Diamond",
    icon: "👑",
    cashback: "15%",
  },
};

@Injectable()
export class CustomerLoyaltyService {
  private readonly logger = new Logger(CustomerLoyaltyService.name);
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

  // ---------- Loyalty Overview ----------

  async showLoyaltyOverview(ctx: CustomerBotContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("🏅 Уровни", "loyalty_tiers")],
      [Markup.button.callback("📋 Наше меню", "catalog")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    const message =
      "⭐ Бонусная программа VendHub\n\n" +
      "🚧 Бонусная программа скоро будет запущена!\n\n" +
      "Что вас ждёт:\n" +
      "• 5 уровней лояльности (Bronze → Diamond)\n" +
      "• Кэшбэк до 15% с каждой покупки\n" +
      "• Бесплатные напитки для Gold+ уровней\n" +
      "• Ежедневные квесты и достижения\n" +
      "• Реферальная программа\n\n" +
      "Следите за обновлениями!";

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

  // ---------- Points History ----------

  async showPointsHistory(ctx: CustomerBotContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("« Бонусы", "loyalty")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    const message =
      "📜 История баллов\n\n" +
      "🚧 Функция скоро будет доступна.\n\n" +
      "После запуска бонусной программы здесь появится " +
      "полная история начислений и списаний.";

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

  // ---------- Tiers Info (static, no DB) ----------

  async showTiersInfo(ctx: CustomerBotContext) {
    let message = "🏅 Уровни лояльности VendHub\n\n";

    const tiers = Object.entries(TIER_INFO);
    for (const [key, info] of tiers) {
      message += `${info.icon} ${info.label}\n`;
      message += `   Кэшбэк: ${info.cashback}\n`;

      switch (key) {
        case "gold":
          message += "   🎁 Каждый 10-й напиток бесплатно\n";
          break;
        case "platinum":
          message += "   🎁 Каждый 5-й напиток бесплатно\n";
          message += "   💳 Овердрафт до 50 000 сум\n";
          break;
        case "diamond":
          message += "   🎁 Каждый 3-й напиток бесплатно\n";
          break;
      }

      message += "\n";
    }

    message += "Совершайте покупки, чтобы повышать свой уровень!";

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("« Бонусы", "loyalty")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

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
}
