/**
 * Bot Menu Service
 * UI screens: main menu, profile, stats, reports, team, warehouse, manager features.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, LessThan, MoreThan } from "typeorm";
import { Telegraf, Markup } from "telegraf";
import { User } from "../../users/entities/user.entity";
import { Task, TaskStatus } from "../../tasks/entities/task.entity";
import { Machine, MachineStatus } from "../../machines/entities/machine.entity";
import { UserRole } from "../../../common/enums";
import { BotContext, TelegramSession } from "./bot-types";

@Injectable()
export class BotMenuService {
  private readonly logger = new Logger(BotMenuService.name);
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, TelegramSession>;

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Task) private taskRepository: Repository<Task>,
    @InjectRepository(Machine) private machineRepository: Repository<Machine>,
  ) {}

  setBot(bot: Telegraf<BotContext>, sessions: Map<number, TelegramSession>) {
    this.bot = bot;
    this.sessions = sessions;
  }

  // ============================================================================
  // UNREGISTERED USER
  // ============================================================================

  async handleUnregisteredUser(ctx: BotContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📝 Запросить доступ", "request_access")],
    ]);

    await ctx.reply(
      "👋 Добро пожаловать в VendHub!\n\n" +
        "Для работы необходима регистрация.\n" +
        "Обратитесь к администратору или запросите доступ.",
      keyboard,
    );
  }

  // ============================================================================
  // MAIN MENU
  // ============================================================================

  async showMainMenu(ctx: BotContext) {
    const user = ctx.user;
    if (!user) return;

    const roleLabels: Record<string, string> = {
      owner: "Владелец",
      admin: "Администратор",
      manager: "Менеджер",
      operator: "Оператор",
      warehouse: "Складской менеджер",
      accountant: "Бухгалтер",
      viewer: "Наблюдатель",
    };

    // Count active tasks
    const activeTaskCount = await this.taskRepository.count({
      where: {
        assignedToUserId: user.id,
        status: In([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
      },
    });

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    // Common buttons
    buttons.push([
      Markup.button.callback(
        `📋 Мои задачи${activeTaskCount > 0 ? ` (${activeTaskCount})` : ""}`,
        "tasks",
      ),
      Markup.button.callback("🏭 Мои аппараты", "machines"),
    ]);

    // Role-specific buttons
    if (
      [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER].includes(
        user.role as UserRole,
      )
    ) {
      buttons.push([
        Markup.button.callback("📊 Отчёты", "reports"),
        Markup.button.callback("👥 Команда", "team"),
      ]);
    }

    if ([UserRole.WAREHOUSE].includes(user.role as UserRole)) {
      buttons.push([
        Markup.button.callback("📦 Склад", "warehouse"),
        Markup.button.callback("📝 Заявки", "material_requests"),
      ]);
    }

    buttons.push([
      Markup.button.callback("👤 Профиль", "profile"),
      Markup.button.callback("❓ Помощь", "help"),
    ]);

    const keyboard = Markup.inlineKeyboard(buttons);

    const message =
      `👋 Привет, ${user.firstName}!\n` +
      `🎭 Роль: ${roleLabels[user.role] || user.role}\n\n` +
      `Выберите действие:`;

    // Edit or send new message
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

  // ============================================================================
  // STATS & PROFILE
  // ============================================================================

  async showMyStats(ctx: BotContext) {
    if (!ctx.user) return;

    // Get stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completedTasks = await this.taskRepository.count({
      where: {
        assignedToUserId: ctx.user.id,
        status: TaskStatus.COMPLETED,
        completedAt: MoreThan(thirtyDaysAgo),
      },
    });

    const totalTasks = await this.taskRepository.count({
      where: {
        assignedToUserId: ctx.user.id,
        created_at: MoreThan(thirtyDaysAgo),
      },
    });

    const overdueTasks = await this.taskRepository.count({
      where: {
        assignedToUserId: ctx.user.id,
        status: In([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
        dueDate: LessThan(new Date()),
      },
    });

    const message =
      `📊 Ваша статистика за 30 дней:\n\n` +
      `✅ Завершено задач: ${completedTasks}\n` +
      `📋 Всего задач: ${totalTasks}\n` +
      `⚠️ Просрочено: ${overdueTasks}\n` +
      `📈 Выполнено: ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("« В меню", "menu")],
    ]);

    await ctx.reply(message, keyboard);
  }

  async showProfile(ctx: BotContext) {
    if (!ctx.user) return;

    const roleLabels: Record<string, string> = {
      owner: "Владелец",
      admin: "Администратор",
      manager: "Менеджер",
      operator: "Оператор",
      warehouse: "Складской менеджер",
      accountant: "Бухгалтер",
      viewer: "Наблюдатель",
    };

    const message =
      `👤 Ваш профиль:\n\n` +
      `📛 Имя: ${ctx.user.firstName} ${ctx.user.lastName || ""}\n` +
      `📧 Email: ${ctx.user.email}\n` +
      `📱 Телефон: ${ctx.user.phone || "Не указан"}\n` +
      `🎭 Роль: ${roleLabels[ctx.user.role]}\n` +
      `📅 Регистрация: ${new Date(ctx.user.created_at).toLocaleDateString("ru-RU")}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("« В меню", "menu")],
    ]);

    await ctx.reply(message, keyboard);
  }

  async showOverdueTasks(ctx: BotContext) {
    if (!ctx.user) return;

    const overdueTasks = await this.taskRepository.find({
      where: {
        assignedToUserId: ctx.user.id,
        status: In([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
        dueDate: LessThan(new Date()),
      },
      relations: ["machine"],
      order: { dueDate: "ASC" },
    });

    if (overdueTasks.length === 0) {
      await ctx.reply("✅ У вас нет просроченных задач!");
      return;
    }

    let message = `⚠️ Просроченные задачи (${overdueTasks.length}):\n\n`;

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    overdueTasks.forEach((task, index) => {
      const daysOverdue = Math.ceil(
        (new Date().getTime() - new Date(task.dueDate!).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      message += `${index + 1}. ${task.machine?.name || "Аппарат"}\n`;
      message += `   ⏰ Просрочено на ${daysOverdue} дн.\n\n`;

      buttons.push([
        Markup.button.callback(`${index + 1}. Открыть`, `task:${task.id}`),
      ]);
    });

    buttons.push([Markup.button.callback("« В меню", "menu")]);

    const keyboard = Markup.inlineKeyboard(buttons);
    await ctx.reply(message, keyboard);
  }

  // ============================================================================
  // REPORTS, TEAM, WAREHOUSE
  // ============================================================================

  async showReports(ctx: BotContext) {
    if (!ctx.user || !ctx.organizationId) return;

    // Get organization stats for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const completedTasks = await this.taskRepository.count({
      where: {
        organizationId: ctx.organizationId,
        status: TaskStatus.COMPLETED,
        completedAt: MoreThan(sevenDaysAgo),
      },
    });

    const totalMachines = await this.machineRepository.count({
      where: { organizationId: ctx.organizationId },
    });

    const activeMachines = await this.machineRepository.count({
      where: {
        organizationId: ctx.organizationId,
        status: MachineStatus.ACTIVE,
      },
    });

    const errorMachines = await this.machineRepository.count({
      where: {
        organizationId: ctx.organizationId,
        status: MachineStatus.ERROR,
      },
    });

    const pendingTasks = await this.taskRepository.count({
      where: {
        organizationId: ctx.organizationId,
        status: In([TaskStatus.PENDING, TaskStatus.ASSIGNED]),
      },
    });

    const message =
      `📊 Отчёт за 7 дней:\n\n` +
      `🏭 Аппараты:\n` +
      `   • Всего: ${totalMachines}\n` +
      `   • Активно: ${activeMachines} 🟢\n` +
      `   • С ошибками: ${errorMachines} 🔴\n\n` +
      `📋 Задачи:\n` +
      `   • Выполнено: ${completedTasks} ✅\n` +
      `   • Ожидают: ${pendingTasks} ⏳\n`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📈 Подробнее в системе", "menu")],
      [Markup.button.callback("« В меню", "menu")],
    ]);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  async showTeam(ctx: BotContext) {
    if (!ctx.user || !ctx.organizationId) return;

    const users = await this.userRepository.find({
      where: { organizationId: ctx.organizationId, isActive: true },
      order: { firstName: "ASC" },
      take: 20,
    });

    const roleLabels: Record<string, string> = {
      owner: "👑",
      admin: "🔑",
      manager: "📊",
      operator: "👷",
      warehouse: "📦",
      accountant: "💰",
      viewer: "👁",
    };

    let message = `👥 Команда (${users.length}):\n\n`;

    users.forEach((user, index) => {
      const roleIcon = roleLabels[user.role] || "👤";
      const onlineStatus = user.telegramId ? "🟢" : "⚪";
      message += `${index + 1}. ${roleIcon} ${user.firstName} ${user.lastName || ""}\n`;
      message += `   ${onlineStatus} ${user.role}\n`;
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("« В меню", "menu")],
    ]);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  async showWarehouse(ctx: BotContext) {
    if (!ctx.user) return;

    // Basic warehouse info (would need inventory repository for full data)
    const message =
      `📦 Склад\n\n` +
      `Для полной информации о складе,\n` +
      `используйте веб-интерфейс.\n\n` +
      `В Telegram доступно:\n` +
      `• Просмотр заявок на материалы\n` +
      `• Уведомления о низком остатке`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("📝 Заявки на материалы", "material_requests")],
      [Markup.button.callback("« В меню", "menu")],
    ]);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  async showMaterialRequests(ctx: BotContext) {
    if (!ctx.user || !ctx.organizationId) return;

    // Would need material request repository for full implementation
    const message =
      `📝 Заявки на материалы\n\n` +
      `Для просмотра и создания заявок\n` +
      `используйте веб-интерфейс.\n\n` +
      `Уведомления о новых заявках\n` +
      `будут приходить сюда автоматически.`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback("« Назад", "warehouse")],
      [Markup.button.callback("« В меню", "menu")],
    ]);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  // ============================================================================
  // HELP
  // ============================================================================

  getHelpMessage(_role?: string): string {
    let help =
      "❓ Справка VendHub Bot\n\n" +
      "📋 Основные команды:\n" +
      "/start - Главное меню\n" +
      "/mytasks - Мои задачи\n" +
      "/machines - Мои аппараты\n" +
      "/stats - Моя статистика\n" +
      "/profile - Мой профиль\n" +
      "/overdue - Просроченные задачи\n" +
      "/help - Эта справка\n\n";

    help +=
      "💡 Подсказки:\n" +
      "• Делайте фото ДО и ПОСЛЕ выполнения задачи\n" +
      "• Указывайте точную сумму при инкассации\n" +
      "• Своевременно завершайте задачи\n";

    return help;
  }
}
