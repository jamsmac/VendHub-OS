/**
 * Bot Machine Operations Service
 * Machine listing, details, and task creation from machine context.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import { Task, TaskStatus, TaskType } from "../../tasks/entities/task.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { BotContext, TelegramSession } from "./bot-types";
import { BotTaskOpsService } from "./bot-task-ops.service";

@Injectable()
export class BotMachineOpsService {
  private readonly logger = new Logger(BotMachineOpsService.name);
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, TelegramSession>;

  constructor(
    @InjectRepository(Task) private taskRepository: Repository<Task>,
    @InjectRepository(Machine) private machineRepository: Repository<Machine>,
    private readonly taskOpsService: BotTaskOpsService,
  ) {}

  setBot(bot: Telegraf<BotContext>, sessions: Map<number, TelegramSession>) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ============================================================================
  // MACHINE LIST
  // ============================================================================

  async showMyMachines(ctx: BotContext, page = 1) {
    if (!ctx.user) return;

    const pageSize = 5;
    const skip = (page - 1) * pageSize;

    const [machines, total] = await this.machineRepository.findAndCount({
      where: {
        organizationId: ctx.user.organizationId,
        assignedOperatorId: ctx.user.id,
      },
      order: { name: "ASC" },
      take: pageSize,
      skip,
    });

    if (machines.length === 0) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("« Назад", "menu")],
      ]);
      await ctx.editMessageText("🏭 За вами не закреплены аппараты", keyboard);
      return;
    }

    const statusEmojis: Record<string, string> = {
      active: "🟢",
      low_stock: "🟡",
      error: "🔴",
      maintenance: "🔧",
      offline: "⚫",
      disabled: "⛔",
    };

    let message = `🏭 Ваши аппараты (${total}):\n\n`;
    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    machines.forEach((machine, index) => {
      const statusEmoji = statusEmojis[machine.status] || "⚪";
      message += `${index + 1}. ${statusEmoji} ${machine.name}\n`;
      message += `   📍 ${machine.address || "Адрес не указан"}\n\n`;

      buttons.push([
        Markup.button.callback(
          `${index + 1}. ${machine.name}`,
          `machine:${machine.id}`,
        ),
      ]);
    });

    // Pagination
    const totalPages = Math.ceil(total / pageSize);
    const paginationButtons: ReturnType<typeof Markup.button.callback>[] = [];
    if (page > 1)
      paginationButtons.push(
        Markup.button.callback("«", `page:machines:${page - 1}`),
      );
    if (page < totalPages)
      paginationButtons.push(
        Markup.button.callback("»", `page:machines:${page + 1}`),
      );
    if (paginationButtons.length > 0) buttons.push(paginationButtons);

    buttons.push([Markup.button.callback("« В меню", "menu")]);

    const keyboard = Markup.inlineKeyboard(buttons);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  // ============================================================================
  // MACHINE DETAILS
  // ============================================================================

  async showMachineDetails(ctx: BotContext, machineId: string) {
    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
    });
    if (!machine) {
      await ctx.reply("❌ Аппарат не найден");
      return;
    }

    const statusLabels: Record<string, string> = {
      active: "🟢 Активен",
      low_stock: "🟡 Мало товара",
      error: "🔴 Ошибка",
      maintenance: "🔧 На обслуживании",
      offline: "⚫ Офлайн",
      disabled: "⛔ Отключен",
    };

    let message =
      `🏭 ${machine.name}\n\n` +
      `📊 Статус: ${statusLabels[machine.status]}\n` +
      `🔢 Номер: ${machine.machineNumber}\n` +
      `📍 Адрес: ${machine.address || "Не указан"}\n`;

    if (machine.lastRefillDate) {
      message += `🔋 Последнее пополнение: ${new Date(machine.lastRefillDate).toLocaleDateString("ru-RU")}\n`;
    }
    if (machine.lastCollectionDate) {
      message += `💰 Последняя инкассация: ${new Date(machine.lastCollectionDate).toLocaleDateString("ru-RU")}\n`;
    }
    if (machine.currentCashAmount) {
      message += `💵 В кассе: ~${Number(machine.currentCashAmount).toLocaleString()} сум\n`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buttons: any[][] = [
      [
        Markup.button.callback("🔋 Пополнить", `machine_refill:${machine.id}`),
        Markup.button.callback(
          "💰 Инкассация",
          `machine_collection:${machine.id}`,
        ),
      ],
    ];

    if (machine.latitude && machine.longitude) {
      buttons.push([
        Markup.button.url(
          "🗺 Навигация",
          `https://yandex.ru/maps/?rtext=~${machine.latitude},${machine.longitude}`,
        ),
      ]);
    }

    buttons.push([Markup.button.callback("« Назад", "machines")]);

    const keyboard = Markup.inlineKeyboard(buttons);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  // ============================================================================
  // TASK CREATION FROM MACHINE
  // ============================================================================

  async createRefillTask(ctx: BotContext, machineId: string) {
    if (!ctx.user) return;

    const taskNumber = `TSK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const task = this.taskRepository.create({
      organizationId: ctx.user.organizationId,
      taskNumber,
      machineId,
      typeCode: TaskType.REFILL,
      status: TaskStatus.ASSIGNED,
      assignedToUserId: ctx.user.id,
      createdByUserId: ctx.user.id,
    });

    await this.taskRepository.save(task);
    await ctx.reply("✅ Задача на пополнение создана!");
    await this.taskOpsService.showTaskDetails(ctx, task.id);
  }

  async createCollectionTask(ctx: BotContext, machineId: string) {
    if (!ctx.user) return;

    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
    });
    const taskNumber = `TSK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const task = this.taskRepository.create({
      organizationId: ctx.user.organizationId,
      taskNumber,
      machineId,
      typeCode: TaskType.COLLECTION,
      status: TaskStatus.ASSIGNED,
      assignedToUserId: ctx.user.id,
      createdByUserId: ctx.user.id,
      expectedCashAmount: machine?.currentCashAmount || 0,
    });

    await this.taskRepository.save(task);
    await ctx.reply("✅ Задача на инкассацию создана!");
    await this.taskOpsService.showTaskDetails(ctx, task.id);
  }
}
