/**
 * Bot Task Operations Service
 * Task workflow: list, details, start, complete, postpone, photos, comments.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import { Task, TaskStatus, TaskType } from "../../tasks/entities/task.entity";
import { BotContext, TelegramSession, SessionState } from "./bot-types";

@Injectable()
export class BotTaskOpsService {
  private readonly logger = new Logger(BotTaskOpsService.name);
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, TelegramSession>;

  constructor(
    @InjectRepository(Task) private taskRepository: Repository<Task>,
  ) {}

  setBot(bot: Telegraf<BotContext>, sessions: Map<number, TelegramSession>) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ============================================================================
  // TASK LIST
  // ============================================================================

  async showMyTasks(ctx: BotContext, page = 1) {
    if (!ctx.user) return;

    const pageSize = 5;
    const skip = (page - 1) * pageSize;

    const [tasks, total] = await this.taskRepository.findAndCount({
      where: {
        assignedToUserId: ctx.user.id,
        status: In([
          TaskStatus.PENDING,
          TaskStatus.ASSIGNED,
          TaskStatus.IN_PROGRESS,
        ]),
      },
      relations: ["machine"],
      order: { created_at: "DESC" },
      take: pageSize,
      skip,
    });

    if (tasks.length === 0) {
      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback("« Назад", "menu")],
      ]);
      await ctx.editMessageText("📋 У вас нет активных задач", keyboard);
      return;
    }

    const taskTypeLabels: Record<string, string> = {
      refill: "🔋 Пополнение",
      collection: "💰 Инкассация",
      cleaning: "🧹 Мойка",
      repair: "🔧 Ремонт",
      install: "📦 Установка",
      removal: "📤 Снятие",
      audit: "📊 Ревизия",
      inspection: "🔍 Осмотр",
    };

    const statusEmojis: Record<string, string> = {
      pending: "⏳",
      assigned: "📌",
      in_progress: "🔄",
    };

    let message = `📋 Ваши задачи (${total}):\n\n`;

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    tasks.forEach((task, index) => {
      const typeLabel = taskTypeLabels[task.typeCode] || task.typeCode;
      const statusEmoji = statusEmojis[task.status] || "📋";
      const machineName = task.machine?.name || "Неизвестный аппарат";
      const dueDate = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("ru-RU")
        : "Без срока";

      message += `${index + 1}. ${statusEmoji} ${typeLabel}\n`;
      message += `   🏭 ${machineName}\n`;
      message += `   📅 ${dueDate}\n\n`;

      buttons.push([
        Markup.button.callback(`${index + 1}. ${typeLabel}`, `task:${task.id}`),
      ]);
    });

    // Pagination
    const totalPages = Math.ceil(total / pageSize);
    const paginationButtons: ReturnType<typeof Markup.button.callback>[] = [];

    if (page > 1) {
      paginationButtons.push(
        Markup.button.callback("« Пред.", `page:tasks:${page - 1}`),
      );
    }
    if (page < totalPages) {
      paginationButtons.push(
        Markup.button.callback("След. »", `page:tasks:${page + 1}`),
      );
    }

    if (paginationButtons.length > 0) {
      buttons.push(paginationButtons);
    }

    buttons.push([Markup.button.callback("« В меню", "menu")]);

    const keyboard = Markup.inlineKeyboard(buttons);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  // ============================================================================
  // TASK DETAILS
  // ============================================================================

  async showTaskDetails(ctx: BotContext, taskId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ["machine", "items"],
    });

    if (!task) {
      await ctx.reply("❌ Задача не найдена");
      return;
    }

    const typeLabels: Record<string, string> = {
      refill: "🔋 Пополнение",
      collection: "💰 Инкассация",
      cleaning: "🧹 Мойка",
      repair: "🔧 Ремонт",
    };

    const statusLabels: Record<string, string> = {
      pending: "⏳ Ожидает",
      assigned: "📌 Назначена",
      in_progress: "🔄 Выполняется",
      completed: "✅ Завершена",
      rejected: "❌ Отклонена",
      postponed: "⏸ Отложена",
    };

    let message =
      `📋 Задача #${task.taskNumber}\n\n` +
      `📝 Тип: ${typeLabels[task.typeCode] || task.typeCode}\n` +
      `📊 Статус: ${statusLabels[task.status]}\n` +
      `🏭 Аппарат: ${task.machine?.name || "N/A"}\n` +
      `📍 Адрес: ${task.machine?.address || "N/A"}\n`;

    if (task.dueDate) {
      message += `📅 Срок: ${new Date(task.dueDate).toLocaleString("ru-RU")}\n`;
    }

    if (task.priority && task.priority !== "normal") {
      const priorityLabels: Record<string, string> = {
        low: "🟢 Низкий",
        normal: "🟡 Обычный",
        high: "🟠 Высокий",
        urgent: "🔴 Срочный",
      };
      message += `⚡ Приоритет: ${priorityLabels[task.priority]}\n`;
    }

    if (task.description) {
      message += `\n📄 Описание:\n${task.description}\n`;
    }

    // Items list
    if (task.items && task.items.length > 0) {
      message += "\n📦 Товары:\n";
      task.items.forEach((item) => {
        message += `• Товар: ${item.plannedQuantity} ${item.unitOfMeasure || "шт"}\n`;
      });
    }

    // Expected cash for collection
    if (task.typeCode === "collection" && task.expectedCashAmount) {
      message += `\n💵 Ожидаемая сумма: ${Number(task.expectedCashAmount).toLocaleString()} сум\n`;
    }

    // Build action buttons based on status
    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    if (task.status === TaskStatus.ASSIGNED) {
      buttons.push([
        Markup.button.callback("▶️ Начать выполнение", `task_start:${task.id}`),
      ]);
    }

    if (task.status === TaskStatus.IN_PROGRESS) {
      buttons.push([
        Markup.button.callback("✅ Завершить", `task_complete:${task.id}`),
      ]);

      // Photo buttons
      if (!task.hasPhotoBefore) {
        buttons.push([
          Markup.button.callback("📷 Фото ДО", `task_photo_before:${task.id}`),
        ]);
      }
      if (!task.hasPhotoAfter) {
        buttons.push([
          Markup.button.callback(
            "📷 Фото ПОСЛЕ",
            `task_photo_after:${task.id}`,
          ),
        ]);
      }
    }

    if ([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS].includes(task.status)) {
      buttons.push([
        Markup.button.callback("⏸ Отложить", `task_postpone:${task.id}`),
      ]);
    }

    // Navigation
    if (task.machine?.latitude && task.machine?.longitude) {
      buttons.push([
        Markup.button.url(
          "🗺 Навигация",
          `https://yandex.ru/maps/?rtext=~${task.machine.latitude},${task.machine.longitude}`,
        ) as unknown as ReturnType<typeof Markup.button.callback>,
      ]);
    }

    buttons.push([Markup.button.callback("« Назад к задачам", "tasks")]);

    const keyboard = Markup.inlineKeyboard(buttons);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  // ============================================================================
  // TASK ACTIONS
  // ============================================================================

  async startTask(ctx: BotContext, taskId: string) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task || task.status !== TaskStatus.ASSIGNED) {
      await ctx.reply("❌ Невозможно начать выполнение задачи");
      return;
    }

    await this.taskRepository.update(taskId, {
      status: TaskStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    await ctx.reply(
      "▶️ Задача начата!\n\nНе забудьте сделать фото ДО начала работы.",
    );
    await this.showTaskDetails(ctx, taskId);
  }

  async initiateTaskComplete(ctx: BotContext, taskId: string) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task || task.status !== TaskStatus.IN_PROGRESS) {
      await ctx.reply("❌ Задача не может быть завершена");
      return;
    }

    // Check photo requirements
    if (!task.hasPhotoBefore || !task.hasPhotoAfter) {
      const missingPhotos: string[] = [];
      if (!task.hasPhotoBefore) missingPhotos.push("фото ДО");
      if (!task.hasPhotoAfter) missingPhotos.push("фото ПОСЛЕ");

      await ctx.reply(
        `⚠️ Необходимо загрузить: ${missingPhotos.join(", ")}\n\n` +
          "Вы уверены, что хотите завершить без фото?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "✅ Да, завершить",
              `confirm_complete:${taskId}`,
            ),
          ],
          [Markup.button.callback("❌ Отмена", "cancel")],
        ]),
      );
      return;
    }

    // For collection tasks, request cash amount
    if (task.typeCode === TaskType.COLLECTION) {
      this.setSession(ctx.from!.id, {
        state: SessionState.AWAITING_CASH_AMOUNT,
        data: { taskId },
      });
      await ctx.reply("💰 Введите фактическую сумму инкассации (в сумах):");
      return;
    }

    await this.completeTask(ctx, taskId);
  }

  async completeTask(
    ctx: BotContext,
    taskId: string,
    actualCashAmount?: number,
  ) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) return;

    await this.taskRepository.update(taskId, {
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
      actualCashAmount: actualCashAmount ?? task.actualCashAmount,
    });

    this.clearSession(ctx.from!.id);

    await ctx.reply("✅ Задача успешно завершена!\n\nСпасибо за работу.");
    // showMainMenu is called by the orchestrator's menuService via the handler
    // We need access to menuService for showMainMenu — but we can use callback "menu"
    // Instead, replicate the original behavior by emitting menu display inline
    // The original called this.showMainMenu(ctx) which is in BotMenuService
    // We'll call it through a reference set during init
    if (this.showMainMenuFn) {
      await this.showMainMenuFn(ctx);
    }
  }

  async postponeTask(ctx: BotContext, taskId: string) {
    this.setSession(ctx.from!.id, {
      state: SessionState.AWAITING_COMMENT,
      data: { taskId, action: "postpone" },
    });
    await ctx.reply("📝 Укажите причину отложения задачи:");
  }

  async requestPhotoBefore(ctx: BotContext, taskId: string) {
    this.setSession(ctx.from!.id, {
      state: SessionState.AWAITING_PHOTO_BEFORE,
      data: { taskId },
    });
    await ctx.reply(
      "📷 Отправьте фото ДО начала работы.\n\nНужно сфотографировать аппарат и рабочую зону.",
    );
  }

  async requestPhotoAfter(ctx: BotContext, taskId: string) {
    this.setSession(ctx.from!.id, {
      state: SessionState.AWAITING_PHOTO_AFTER,
      data: { taskId },
    });
    await ctx.reply(
      "📷 Отправьте фото ПОСЛЕ завершения работы.\n\nПокажите результат выполненной задачи.",
    );
  }

  // ============================================================================
  // PHOTO & DATA HANDLERS
  // ============================================================================

  async saveTaskPhoto(
    ctx: BotContext,
    taskId: string,
    fileId: string,
    type: "before" | "after",
  ) {
    const updateData: Partial<Task> = {};

    if (type === "before") {
      updateData.hasPhotoBefore = true;
      updateData.metadata = {
        ...(await this.getTaskMetadata(taskId)),
        photoBeforeFileId: fileId,
      };
    } else {
      updateData.hasPhotoAfter = true;
      updateData.metadata = {
        ...(await this.getTaskMetadata(taskId)),
        photoAfterFileId: fileId,
      };
    }

    await this.taskRepository.update(
      taskId,
      updateData as Parameters<typeof this.taskRepository.update>[1],
    );
    this.clearSession(ctx.from!.id);

    const typeLabel = type === "before" ? "ДО" : "ПОСЛЕ";
    await ctx.reply(`✅ Фото ${typeLabel} сохранено!`);
    await this.showTaskDetails(ctx, taskId);
  }

  async saveTaskComment(ctx: BotContext, taskId: string, comment: string) {
    const session = this.getSession(ctx.from!.id);
    if (!session) return;

    if (session.data.action === "postpone") {
      await this.taskRepository.update(taskId, {
        status: TaskStatus.POSTPONED,
        postponeReason: comment,
      });
      this.clearSession(ctx.from!.id);
      await ctx.reply("⏸ Задача отложена");
      if (this.showMainMenuFn) {
        await this.showMainMenuFn(ctx);
      }
    }
  }

  async saveCashAmount(ctx: BotContext, taskId: string, amount: number) {
    await this.taskRepository.update(taskId, { actualCashAmount: amount });
    await this.completeTask(ctx, taskId, amount);
  }

  async saveRejectionReason(ctx: BotContext, taskId: string, reason: string) {
    await this.taskRepository.update(taskId, {
      rejectionReason: reason,
    });
    this.clearSession(ctx.from!.id);
    await ctx.reply("✅ Сохранено");
    await this.showTaskDetails(ctx, taskId);
  }

  async saveTaskLocation(
    ctx: BotContext,
    taskId: string,
    lat: number,
    lon: number,
  ) {
    const metadata = await this.getTaskMetadata(taskId);
    const newMetadata = {
      ...metadata,
      completionLocation: { lat, lon, timestamp: new Date() },
    };
    await this.taskRepository.update(taskId, {
      metadata: newMetadata,
    } as unknown as Parameters<typeof this.taskRepository.update>[1]);
    await ctx.reply("📍 Местоположение сохранено");
  }

  // ============================================================================
  // MENU CALLBACK (set by orchestrator to avoid circular dependency)
  // ============================================================================

  private showMainMenuFn: ((ctx: BotContext) => Promise<void>) | null = null;

  setShowMainMenuFn(fn: (ctx: BotContext) => Promise<void>) {
    this.showMainMenuFn = fn;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getSession(userId: number): TelegramSession | undefined {
    return this.sessions.get(userId);
  }

  private setSession(userId: number, session: TelegramSession) {
    this.sessions.set(userId, session);
  }

  private clearSession(userId: number) {
    this.sessions.delete(userId);
  }

  private async getTaskMetadata(
    taskId: string,
  ): Promise<Record<string, unknown>> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      select: ["metadata"],
    });
    return task?.metadata || {};
  }
}
