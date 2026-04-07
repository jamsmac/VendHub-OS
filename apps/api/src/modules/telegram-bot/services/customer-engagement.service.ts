/**
 * Customer Bot — Engagement Sub-Service
 * Referrals, promo codes, quests, achievements.
 * Uses TypeORM for direct DB access.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import {
  CustomerBotContext,
  CustomerSession,
  CustomerSessionState,
} from "./customer-types";
import { ClientUser } from "../../client/entities/client-user.entity";
import { Referral } from "../../referrals/entities/referral.entity";
import { PromoCode } from "../../promo-codes/entities/promo-code.entity";
import { Quest } from "../../quests/entities/quest.entity";
import { UserQuest } from "../../quests/entities/user-quest.entity";
import { Achievement } from "../../achievements/entities/achievement.entity";
import { UserAchievement } from "../../achievements/entities/user-achievement.entity";

function formatNumber(n: number): string {
  return n.toLocaleString("ru-RU");
}

@Injectable()
export class CustomerEngagementService {
  private readonly logger = new Logger(CustomerEngagementService.name);
  private bot: Telegraf<CustomerBotContext>;
  private sessions: Map<number, CustomerSession>;

  constructor(
    @InjectRepository(ClientUser)
    private readonly clientUserRepo: Repository<ClientUser>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    @InjectRepository(PromoCode)
    private readonly promoCodeRepo: Repository<PromoCode>,
    @InjectRepository(Quest)
    private readonly questRepo: Repository<Quest>,
    @InjectRepository(UserQuest)
    private readonly userQuestRepo: Repository<UserQuest>,
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
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
      return await this.clientUserRepo.findOne({ where: { telegramId } });
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

  // ========================================================================
  // REFERRALS
  // ========================================================================

  async showReferralInfo(ctx: CustomerBotContext) {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const clientUser = await this.getClientUser(telegramId);
    const botUsername = ctx.botInfo?.username ?? "VendHubBot";

    if (!clientUser) {
      await this.replyOrEdit(
        ctx,
        "👥 Реферальная программа\n\n" +
          "Зарегистрируйтесь, чтобы получить свою реферальную ссылку!",
        Markup.inlineKeyboard([[Markup.button.callback("🏠 В меню", "menu")]]),
      );
      return;
    }

    // Count referrals
    let referralCount = 0;
    try {
      referralCount = await this.referralRepo.count({
        where: { referrerId: clientUser.id },
      });
    } catch {
      // Table may not exist
    }

    const refCode = clientUser.id.substring(0, 8).toUpperCase();
    const refLink = `https://t.me/${botUsername}?start=ref_${refCode}`;

    const message =
      `👥 Реферальная программа\n\n` +
      `🔗 Ваша ссылка:\n${refLink}\n\n` +
      `👥 Приглашено друзей: ${referralCount}\n` +
      `💰 Бонус за приглашение: 500 баллов\n\n` +
      `Поделитесь ссылкой с друзьями, и вы оба получите бонусные баллы!`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.switchToChat(
          "📤 Поделиться",
          `Присоединяйся к VendHub! Получи бонусы: ${refLink}`,
        ),
      ],
      [Markup.button.callback("🏠 В меню", "menu")],
    ]);

    await this.replyOrEdit(ctx, message, keyboard);
  }

  // ========================================================================
  // PROMO CODES
  // ========================================================================

  async askForPromoCode(ctx: CustomerBotContext) {
    const session = this.sessions.get(ctx.from!.id) ?? {
      state: CustomerSessionState.IDLE,
      data: {},
    };
    session.state = CustomerSessionState.AWAITING_PROMO_CODE;
    this.sessions.set(ctx.from!.id, session);

    await ctx.reply(
      "🎟 Введите промокод:",
      Markup.inlineKeyboard([[Markup.button.callback("❌ Отмена", "cancel")]]),
    );
  }

  async handlePromoCode(ctx: CustomerBotContext, code: string) {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    const session = this.sessions.get(ctx.from!.id);
    if (session) {
      session.state = CustomerSessionState.IDLE;
    }

    let promoCode: PromoCode | null = null;
    try {
      promoCode = await this.promoCodeRepo.findOne({
        where: { code: code.toUpperCase() },
      });
    } catch {
      // Table may not exist
    }

    if (!promoCode) {
      await ctx.reply(
        "❌ Промокод не найден. Проверьте и попробуйте снова.",
        Markup.inlineKeyboard([
          [Markup.button.callback("🎟 Ввести другой", "promo")],
          [Markup.button.callback("🏠 В меню", "menu")],
        ]),
      );
      return;
    }

    const isActive = (promoCode as unknown as Record<string, unknown>).isActive;
    if (isActive === false) {
      await ctx.reply(
        "⏰ Этот промокод больше не действует.",
        Markup.inlineKeyboard([[Markup.button.callback("🏠 В меню", "menu")]]),
      );
      return;
    }

    await ctx.reply(
      `✅ Промокод ${code.toUpperCase()} активирован!\n\n` +
        `Скидка будет применена при следующем заказе.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🛒 К покупкам", "catalog")],
        [Markup.button.callback("🏠 В меню", "menu")],
      ]),
    );
  }

  // ========================================================================
  // QUESTS
  // ========================================================================

  async showQuests(ctx: CustomerBotContext) {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    let quests: Quest[] = [];
    let userQuests: UserQuest[] = [];

    try {
      quests = await this.questRepo.find({
        where: { isActive: true } as unknown as Record<string, unknown>,
        order: { createdAt: "DESC" },
        take: 10,
      });

      const clientUser = await this.getClientUser(telegramId);
      if (clientUser) {
        userQuests = await this.userQuestRepo.find({
          where: { userId: clientUser.id } as unknown as Record<
            string,
            unknown
          >,
        });
      }
    } catch {
      // Tables may not exist
    }

    if (quests.length === 0) {
      await this.replyOrEdit(
        ctx,
        "🎯 Задания\n\nСейчас нет активных заданий. Загляните позже!",
        Markup.inlineKeyboard([[Markup.button.callback("🏠 В меню", "menu")]]),
      );
      return;
    }

    const completedIds = new Set(
      userQuests
        .filter(
          (uq) =>
            (uq as unknown as Record<string, unknown>).status === "completed",
        )
        .map(
          (uq) => (uq as unknown as Record<string, unknown>).questId as string,
        ),
    );

    let message = "🎯 Активные задания\n\n";
    for (const quest of quests) {
      const done = completedIds.has(quest.id);
      const icon = done ? "✅" : "🔸";
      const name =
        (quest as unknown as Record<string, unknown>).title ??
        (quest as unknown as Record<string, unknown>).name ??
        "Задание";
      const reward =
        (quest as unknown as Record<string, unknown>).rewardPoints ?? 0;
      message += `${icon} ${name}\n`;
      if (reward)
        message += `   🎁 Награда: ${formatNumber(Number(reward))} баллов\n`;
      message += "\n";
    }

    await this.replyOrEdit(
      ctx,
      message,
      Markup.inlineKeyboard([[Markup.button.callback("🏠 В меню", "menu")]]),
    );
  }

  // ========================================================================
  // ACHIEVEMENTS
  // ========================================================================

  async showAchievements(ctx: CustomerBotContext) {
    const telegramId = ctx.from?.id?.toString();
    if (!telegramId) return;

    let achievements: Achievement[] = [];
    let userAchievements: UserAchievement[] = [];

    try {
      achievements = await this.achievementRepo.find({
        order: { createdAt: "ASC" },
      });

      const clientUser = await this.getClientUser(telegramId);
      if (clientUser) {
        userAchievements = await this.userAchievementRepo.find({
          where: { userId: clientUser.id },
        });
      }
    } catch {
      // Tables may not exist
    }

    if (achievements.length === 0) {
      await this.replyOrEdit(
        ctx,
        "🏆 Достижения\n\nСкоро появятся достижения! Следите за обновлениями.",
        Markup.inlineKeyboard([[Markup.button.callback("🏠 В меню", "menu")]]),
      );
      return;
    }

    const unlockedIds = new Set(
      userAchievements.map(
        (ua) =>
          (ua as unknown as Record<string, unknown>).achievementId as string,
      ),
    );

    let message = `🏆 Достижения (${unlockedIds.size}/${achievements.length})\n\n`;
    for (const ach of achievements) {
      const unlocked = unlockedIds.has(ach.id);
      const icon = unlocked ? "🏆" : "🔒";
      const name =
        (ach as unknown as Record<string, unknown>).title ??
        (ach as unknown as Record<string, unknown>).name ??
        "Достижение";
      message += `${icon} ${name}\n`;
    }

    await this.replyOrEdit(
      ctx,
      message,
      Markup.inlineKeyboard([[Markup.button.callback("🏠 В меню", "menu")]]),
    );
  }
}
