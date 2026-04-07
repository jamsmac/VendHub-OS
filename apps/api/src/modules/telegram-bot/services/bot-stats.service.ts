/**
 * Staff Bot — Stats & Alerts Sub-Service
 * Daily statistics, alerts/notifications for staff.
 * Uses TypeORM for direct DB access.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import { BotContext, TelegramSession } from "./bot-types";
import { Task } from "../../tasks/entities/task.entity";
import { Route, RouteStatus } from "../../routes/entities/route.entity";

@Injectable()
export class BotStatsService {
  private readonly logger = new Logger(BotStatsService.name);
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, TelegramSession>;

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
  ) {}

  setBot(bot: Telegraf<BotContext>, sessions: Map<number, TelegramSession>) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ---------- Day Stats ----------

  async showDayStats(ctx: BotContext) {
    if (!ctx.user) {
      await ctx.reply("❌ Вы не зарегистрированы. Используйте /start");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let totalTasks = 0;
    let completedTasks = 0;
    let routesCompleted = 0;

    try {
      // Tasks for today
      totalTasks = await this.taskRepo.count({
        where: {
          assigneeId: ctx.user.id,
          createdAt: Between(today, tomorrow),
        } as unknown as Record<string, unknown>,
      });

      completedTasks = await this.taskRepo.count({
        where: {
          assigneeId: ctx.user.id,
          status: "completed" as unknown,
          createdAt: Between(today, tomorrow),
        } as unknown as Record<string, unknown>,
      });

      // Routes completed today
      routesCompleted = await this.routeRepo.count({
        where: {
          operatorId: ctx.user.id,
          status: RouteStatus.COMPLETED,
          createdAt: Between(today, tomorrow),
        } as unknown as Record<string, unknown>,
      });
    } catch {
      // Tables may not exist
    }

    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const message =
      `📊 Статистика за сегодня\n\n` +
      `📋 Задачи: ${completedTasks}/${totalTasks}` +
      (totalTasks > 0 ? ` (${completionRate}%)` : "") +
      `\n` +
      `🗺 Маршрутов завершено: ${routesCompleted}\n` +
      `\n` +
      (completionRate === 100 && totalTasks > 0
        ? "🎉 Все задачи выполнены! Отличная работа!"
        : completionRate >= 80
          ? "👍 Хороший темп! Продолжайте в том же духе."
          : "💪 Продолжайте работу!");

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📋 Мои задачи", "tasks")],
      [Markup.button.callback("🗺 Маршруты", "routes")],
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

  // ---------- Alerts ----------

  async showAlerts(ctx: BotContext) {
    if (!ctx.user) {
      await ctx.reply("❌ Вы не зарегистрированы. Используйте /start");
      return;
    }

    // Overdue tasks as alerts
    let overdueTasks: Task[] = [];
    try {
      const now = new Date();
      overdueTasks = await this.taskRepo
        .createQueryBuilder("t")
        .where("t.assignee_id = :userId", { userId: ctx.user.id })
        .andWhere("t.status NOT IN (:...statuses)", {
          statuses: ["completed", "cancelled"],
        })
        .andWhere("t.due_date < :now", { now })
        .andWhere("t.deleted_at IS NULL")
        .orderBy("t.due_date", "ASC")
        .take(10)
        .getMany();
    } catch {
      // Table may not exist
    }

    if (overdueTasks.length === 0) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("📋 Мои задачи", "tasks")],
        [Markup.button.callback("🏠 В меню", "menu")],
      ]);
      await ctx.reply(
        "🔔 Уведомления\n\n✅ Нет просроченных задач. Всё в порядке!",
        keyboard,
      );
      return;
    }

    let message = `🔔 Внимание! Просроченных задач: ${overdueTasks.length}\n\n`;

    for (const task of overdueTasks) {
      const dueDate = (task as unknown as Record<string, unknown>).dueDate;
      const dateStr = dueDate
        ? new Date(dueDate as string).toLocaleDateString("ru-RU")
        : "—";
      const title =
        (task as unknown as Record<string, unknown>).title ?? "Задача";
      message += `⚠️ ${title}\n   Срок: ${dateStr}\n\n`;
    }

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📋 Мои задачи", "tasks")],
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
