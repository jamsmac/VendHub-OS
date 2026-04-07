/**
 * Customer Bot — Loyalty & Wallet Sub-Service
 * View bonus balance, loyalty tier, points history, wallet balance.
 * Uses TypeORM to query client_loyalty_accounts and client_loyalty_ledger.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import { CustomerBotContext, CustomerSession } from "./customer-types";
import { ClientLoyaltyAccount } from "../../client/entities/client-loyalty-account.entity";
import { ClientLoyaltyLedger } from "../../client/entities/client-loyalty-ledger.entity";
import { ClientUser } from "../../client/entities/client-user.entity";

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

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

@Injectable()
export class CustomerLoyaltyService {
  private readonly logger = new Logger(CustomerLoyaltyService.name);
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession>;

  constructor(
    @InjectRepository(ClientUser)
    private readonly clientUserRepo: Repository<ClientUser>,
    @InjectRepository(ClientLoyaltyAccount)
    private readonly loyaltyRepo: Repository<ClientLoyaltyAccount>,
    @InjectRepository(ClientLoyaltyLedger)
    private readonly ledgerRepo: Repository<ClientLoyaltyLedger>,
  ) {}

  setBot(
    bot: Telegraf<CustomerBotContext>,
    sessions: Map<number, CustomerSession>,
  ) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ---------- Helpers ----------

  private async getClientUser(telegramId: string): Promise<ClientUser | null> {
    try {
      return await this.clientUserRepo.findOne({
        where: { telegramId },
      });
    } catch {
      return null;
    }
  }

  private async replyOrEdit(
    ctx: CustomerBotContext,
    message: string,
    keyboard: ReturnType<typeof Markup.inlineKeyboard>,
  ) {
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

  // ---------- Loyalty Overview ----------

  async showLoyaltyOverview(ctx: CustomerBotContext) {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const clientUser = await this.getClientUser(telegramId);

    if (!clientUser) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("🏅 Уровни", "loyalty_tiers")],
        [Markup.button.callback("🏠 В меню", "menu")],
      ]);
      await this.replyOrEdit(
        ctx,
        "⭐ Бонусная программа VendHub\n\n" +
          "Зарегистрируйтесь, чтобы начать копить баллы!\n" +
          "Совершите первую покупку через автомат VendHub.",
        keyboard,
      );
      return;
    }

    // Try to load loyalty account
    let account: ClientLoyaltyAccount | null = null;
    try {
      account = await this.loyaltyRepo.findOne({
        where: { clientUserId: clientUser.id },
      });
    } catch {
      // Table may not exist yet
    }

    const balance = account?.pointsBalance ?? 0;
    const totalEarned = account?.totalEarned ?? 0;
    const tier = account?.tier ?? "bronze";
    const tierInfo = TIER_INFO[tier] ?? TIER_INFO.bronze!;

    const message =
      `⭐ Бонусная программа VendHub\n\n` +
      `${tierInfo.icon} Ваш уровень: ${tierInfo.label}\n` +
      `💰 Баланс: ${formatNumber(balance)} баллов\n` +
      `📊 Всего заработано: ${formatNumber(totalEarned)} баллов\n` +
      `🔄 Кэшбэк: ${tierInfo.cashback}\n` +
      (tierInfo.nextTier
        ? `\n⬆️ Следующий уровень: ${TIER_INFO[tierInfo.nextTier]?.label ?? tierInfo.nextTier}`
        : "\n🏆 Максимальный уровень достигнут!");

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📜 История баллов", "loyalty_history")],
      [Markup.button.callback("🏅 Уровни", "loyalty_tiers")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    await this.replyOrEdit(ctx, message, keyboard);
  }

  // ---------- Points History ----------

  async showPointsHistory(ctx: CustomerBotContext) {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const clientUser = await this.getClientUser(telegramId);

    let entries: ClientLoyaltyLedger[] = [];

    if (clientUser) {
      try {
        const account = await this.loyaltyRepo.findOne({
          where: { clientUserId: clientUser.id },
        });
        if (account) {
          entries = await this.ledgerRepo.find({
            where: { loyaltyAccountId: account.id },
            order: { createdAt: "DESC" },
            take: 10,
          });
        }
      } catch {
        // Tables may not exist
      }
    }

    let message: string;

    if (entries.length === 0) {
      message =
        "📜 История баллов\n\n" +
        "Пока нет начислений. Совершите покупку через автомат VendHub, " +
        "и баллы начнут копиться автоматически!";
    } else {
      message = "📜 Последние начисления\n\n";
      for (const entry of entries) {
        const sign = entry.points >= 0 ? "+" : "";
        const date = entry.createdAt
          ? new Date(entry.createdAt).toLocaleDateString("ru-RU")
          : "";
        message += `${sign}${formatNumber(entry.points)} баллов — ${entry.reason ?? "Покупка"} (${date})\n`;
      }
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("« Бонусы", "loyalty")],
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    await this.replyOrEdit(ctx, message, keyboard);
  }

  // ---------- Tiers Info (static content) ----------

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

    await this.replyOrEdit(ctx, message, keyboard);
  }
}
