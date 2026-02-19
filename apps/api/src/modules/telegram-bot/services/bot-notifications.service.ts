/**
 * Bot Notifications Service
 * Outbound notifications: task assigned, task overdue, machine alerts.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import { User } from "../../users/entities/user.entity";
import { Task } from "../../tasks/entities/task.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { BotContext, TelegramSession } from "./bot-types";

@Injectable()
export class BotNotificationsService {
  private readonly logger = new Logger(BotNotificationsService.name);
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, TelegramSession>;

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  setBot(bot: Telegraf<BotContext>, sessions: Map<number, TelegramSession>) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ============================================================================
  // NOTIFICATIONS (Public methods for other services)
  // ============================================================================

  async sendTaskAssignedNotification(userId: string, task: Task) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.telegramId || !this.bot) return;

    const typeLabels: Record<string, string> = {
      refill: "🔋 Пополнение",
      collection: "💰 Инкассация",
      cleaning: "🧹 Мойка",
      repair: "🔧 Ремонт",
    };

    const message =
      `📢 Новая задача!\n\n` +
      `📝 ${typeLabels[task.typeCode] || task.typeCode}\n` +
      `🏭 ${task.machine?.name || "Аппарат"}\n` +
      (task.dueDate
        ? `📅 Срок: ${new Date(task.dueDate).toLocaleString("ru-RU")}\n`
        : "");

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("👀 Открыть задачу", `task:${task.id}`)],
    ]);

    try {
      await this.bot.telegram.sendMessage(user.telegramId, message, keyboard);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.logger.error(`Failed to send notification to ${userId}:`, error);
    }
  }

  async sendTaskOverdueNotification(userId: string, task: Task) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.telegramId || !this.bot) return;

    const message =
      `⚠️ Просрочена задача!\n\n` +
      `📋 #${task.taskNumber}\n` +
      `🏭 ${task.machine?.name || "Аппарат"}\n` +
      `📅 Срок был: ${new Date(task.dueDate!).toLocaleString("ru-RU")}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("👀 Открыть задачу", `task:${task.id}`)],
    ]);

    try {
      await this.bot.telegram.sendMessage(user.telegramId, message, keyboard);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.logger.error(`Failed to send notification to ${userId}:`, error);
    }
  }

  async sendMachineAlertNotification(
    userId: string,
    machine: Machine,
    alertType: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.telegramId || !this.bot) return;

    const alertMessages: Record<string, string> = {
      low_stock: "📦 Низкий уровень товара",
      error: "🔴 Ошибка аппарата",
      offline: "⚫ Аппарат офлайн",
      cash_full: "💰 Касса заполнена",
    };

    const message =
      `🚨 Внимание!\n\n` +
      `${alertMessages[alertType] || "Требуется внимание"}\n\n` +
      `🏭 ${machine.name}\n` +
      `📍 ${machine.address || "Адрес не указан"}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("👀 Подробнее", `machine:${machine.id}`)],
    ]);

    try {
      await this.bot.telegram.sendMessage(user.telegramId, message, keyboard);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.logger.error(`Failed to send alert to ${userId}:`, error);
    }
  }
}
