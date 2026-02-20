/**
 * Telegram Bot Service for VendHub OS
 * Complete bot service for operators and managers
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan, Between, ILike } from 'typeorm';
import { Telegraf, Context, Markup } from 'telegraf';
import { User } from '../users/entities/user.entity';
import { Task, TaskStatus, TaskType } from '../tasks/entities/task.entity';
import { Machine, MachineStatus } from '../machines/entities/machine.entity';
import { TelegramUser, TelegramUserStatus, TelegramLanguage } from './entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType, TelegramMessageStatus } from './entities/telegram-message-log.entity';
import { TelegramBotAnalytics, TelegramEventType } from './entities/telegram-bot-analytics.entity';
import { TelegramSettings } from './entities/telegram-settings.entity';
import { QueryTelegramUsersDto } from './dto/telegram-user.dto';
import { QueryAnalyticsDto, QueryMessagesDto } from './dto/telegram-settings.dto';
// Local enum since @vendhub/shared may not be available
enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  WAREHOUSE = 'warehouse',
  ACCOUNTANT = 'accountant',
  VIEWER = 'viewer',
}

// ============================================================================
// TYPES
// ============================================================================

interface BotContext extends Context {
  user?: User;
  organizationId?: string;
}

interface TelegramSession {
  state: SessionState;
  data: Record<string, unknown>;
}

enum SessionState {
  IDLE = 'idle',
  AWAITING_TASK_COMPLETE = 'awaiting_task_complete',
  AWAITING_PHOTO_BEFORE = 'awaiting_photo_before',
  AWAITING_PHOTO_AFTER = 'awaiting_photo_after',
  AWAITING_COMMENT = 'awaiting_comment',
  AWAITING_CASH_AMOUNT = 'awaiting_cash_amount',
  AWAITING_REJECTION_REASON = 'awaiting_rejection_reason',
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf<BotContext>;
  private sessions: Map<number, TelegramSession> = new Map();

  constructor(
    private configService: ConfigService,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Task) private taskRepository: Repository<Task>,
    @InjectRepository(Machine) private machineRepository: Repository<Machine>,
    @InjectRepository(TelegramUser) private telegramUserRepo: Repository<TelegramUser>,
    @InjectRepository(TelegramMessageLog) private messageLogRepo: Repository<TelegramMessageLog>,
    @InjectRepository(TelegramBotAnalytics) private analyticsRepo: Repository<TelegramBotAnalytics>,
    @InjectRepository(TelegramSettings) private settingsRepo: Repository<TelegramSettings>,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set, bot disabled');
      return;
    }

    this.bot = new Telegraf<BotContext>(token);

    // Middleware: Auth
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        const user = await this.userRepository.findOne({
          where: { telegramId: ctx.from.id.toString() },
        });
        if (user) {
          ctx.user = user;
          ctx.organizationId = user.organizationId;
        }
      }
      return next();
    });

    // Register handlers
    this.registerCommands();
    this.registerCallbacks();
    this.registerMessages();

    // Start bot
    try {
      await this.bot.launch();
      this.logger.log('Telegram bot started');
    } catch (error: any) {
      this.logger.error('Failed to start bot:', error);
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop();
    }
  }

  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================

  private registerCommands() {
    // /start - Registration and main menu
    this.bot.command('start', async (ctx) => {
      if (!ctx.user) {
        await this.handleUnregisteredUser(ctx);
        return;
      }
      await this.showMainMenu(ctx);
    });

    // /help - Help message
    this.bot.command('help', async (ctx) => {
      await ctx.reply(this.getHelpMessage(ctx.user?.role));
    });

    // /mytasks - My active tasks
    this.bot.command('mytasks', async (ctx) => {
      if (!ctx.user) {
        await ctx.reply('❌ Вы не зарегистрированы. Используйте /start');
        return;
      }
      await this.showMyTasks(ctx);
    });

    // /task {id} - Task details
    this.bot.command('task', async (ctx) => {
      if (!ctx.user) return;

      const taskId = ctx.message.text.split(' ')[1];
      if (!taskId) {
        await ctx.reply('❌ Укажите ID задачи: /task {id}');
        return;
      }

      await this.showTaskDetails(ctx, taskId);
    });

    // /machines - My machines
    this.bot.command('machines', async (ctx) => {
      if (!ctx.user) return;
      await this.showMyMachines(ctx);
    });

    // /stats - My statistics
    this.bot.command('stats', async (ctx) => {
      if (!ctx.user) return;
      await this.showMyStats(ctx);
    });

    // /profile - My profile
    this.bot.command('profile', async (ctx) => {
      if (!ctx.user) return;
      await this.showProfile(ctx);
    });

    // /overdue - Overdue tasks
    this.bot.command('overdue', async (ctx) => {
      if (!ctx.user) return;
      await this.showOverdueTasks(ctx);
    });
  }

  // ============================================================================
  // CALLBACK HANDLERS
  // ============================================================================

  private registerCallbacks() {
    // Menu navigation
    this.bot.action('menu', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showMainMenu(ctx);
    });

    this.bot.action('tasks', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showMyTasks(ctx);
    });

    this.bot.action('machines', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showMyMachines(ctx);
    });

    this.bot.action('profile', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showProfile(ctx);
    });

    this.bot.action('help', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply(this.getHelpMessage(ctx.user?.role));
    });

    this.bot.action('reports', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showReports(ctx);
    });

    this.bot.action('team', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showTeam(ctx);
    });

    this.bot.action('warehouse', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showWarehouse(ctx);
    });

    this.bot.action('material_requests', async (ctx) => {
      await ctx.answerCbQuery();
      await this.showMaterialRequests(ctx);
    });

    // Task actions
    this.bot.action(/task:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.showTaskDetails(ctx, taskId);
    });

    this.bot.action(/task_start:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.startTask(ctx, taskId);
    });

    this.bot.action(/task_complete:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.initiateTaskComplete(ctx, taskId);
    });

    this.bot.action(/task_postpone:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.postponeTask(ctx, taskId);
    });

    this.bot.action(/task_photo_before:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.requestPhotoBefore(ctx, taskId);
    });

    this.bot.action(/task_photo_after:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.requestPhotoAfter(ctx, taskId);
    });

    // Confirm actions
    this.bot.action(/confirm_complete:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];
      await this.completeTask(ctx, taskId);
    });

    this.bot.action('cancel', async (ctx) => {
      await ctx.answerCbQuery('Отменено');
      this.clearSession(ctx.from!.id);
      await this.showMainMenu(ctx);
    });

    // Machine actions
    this.bot.action(/machine:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const machineId = ctx.match[1];
      await this.showMachineDetails(ctx, machineId);
    });

    this.bot.action(/machine_refill:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const machineId = ctx.match[1];
      await this.createRefillTask(ctx, machineId);
    });

    this.bot.action(/machine_collection:(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const machineId = ctx.match[1];
      await this.createCollectionTask(ctx, machineId);
    });

    // Pagination
    this.bot.action(/page:tasks:(\d+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const page = parseInt(ctx.match[1]);
      await this.showMyTasks(ctx, page);
    });

    this.bot.action(/page:machines:(\d+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const page = parseInt(ctx.match[1]);
      await this.showMyMachines(ctx, page);
    });
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  private registerMessages() {
    // Photo handler
    this.bot.on('photo', async (ctx) => {
      const session = this.getSession(ctx.from!.id);
      if (!session || !session.data.taskId) return;

      const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Largest size
      const fileId = photo.file_id;

      if (session.state === SessionState.AWAITING_PHOTO_BEFORE) {
        await this.saveTaskPhoto(ctx, session.data.taskId as string, fileId, 'before');
      } else if (session.state === SessionState.AWAITING_PHOTO_AFTER) {
        await this.saveTaskPhoto(ctx, session.data.taskId as string, fileId, 'after');
      }
    });

    // Text handler for comments and amounts
    this.bot.on('text', async (ctx) => {
      const session = this.getSession(ctx.from!.id);
      if (!session) return;

      if (session.state === SessionState.AWAITING_COMMENT) {
        await this.saveTaskComment(ctx, session.data.taskId as string, ctx.message.text);
      } else if (session.state === SessionState.AWAITING_CASH_AMOUNT) {
        const amount = parseFloat(ctx.message.text.replace(/[^\d.]/g, ''));
        if (isNaN(amount)) {
          await ctx.reply('❌ Введите корректную сумму');
          return;
        }
        await this.saveCashAmount(ctx, session.data.taskId as string, amount);
      } else if (session.state === SessionState.AWAITING_REJECTION_REASON) {
        await this.saveRejectionReason(ctx, session.data.taskId as string, ctx.message.text);
      }
    });

    // Location handler
    this.bot.on('location', async (ctx) => {
      const session = this.getSession(ctx.from!.id);
      if (!session?.data.taskId) return;

      const { latitude, longitude } = ctx.message.location;
      await this.saveTaskLocation(ctx, session.data.taskId as string, latitude, longitude);
    });
  }

  // ============================================================================
  // MENU FUNCTIONS
  // ============================================================================

  private async handleUnregisteredUser(ctx: BotContext) {
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('📝 Запросить доступ', 'request_access')],
    ]);

    await ctx.reply(
      '👋 Добро пожаловать в VendHub!\n\n' +
        'Для работы необходима регистрация.\n' +
        'Обратитесь к администратору или запросите доступ.',
      keyboard,
    );
  }

  private async showMainMenu(ctx: BotContext) {
    const user = ctx.user;
    if (!user) return;

    const roleLabels: Record<string, string> = {
      owner: 'Владелец',
      admin: 'Администратор',
      manager: 'Менеджер',
      operator: 'Оператор',
      warehouse: 'Складской менеджер',
      accountant: 'Бухгалтер',
      viewer: 'Наблюдатель',
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
      Markup.button.callback(`📋 Мои задачи${activeTaskCount > 0 ? ` (${activeTaskCount})` : ''}`, 'tasks'),
      Markup.button.callback('🏭 Мои аппараты', 'machines'),
    ]);

    // Role-specific buttons
    if ([UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER].includes(user.role as UserRole)) {
      buttons.push([
        Markup.button.callback('📊 Отчёты', 'reports'),
        Markup.button.callback('👥 Команда', 'team'),
      ]);
    }

    if ([UserRole.WAREHOUSE].includes(user.role as UserRole)) {
      buttons.push([
        Markup.button.callback('📦 Склад', 'warehouse'),
        Markup.button.callback('📝 Заявки', 'material_requests'),
      ]);
    }

    buttons.push([
      Markup.button.callback('👤 Профиль', 'profile'),
      Markup.button.callback('❓ Помощь', 'help'),
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
  // TASK FUNCTIONS
  // ============================================================================

  private async showMyTasks(ctx: BotContext, page = 1) {
    if (!ctx.user) return;

    const pageSize = 5;
    const skip = (page - 1) * pageSize;

    const [tasks, total] = await this.taskRepository.findAndCount({
      where: {
        assignedToUserId: ctx.user.id,
        status: In([TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
      },
      relations: ['machine'],
      order: { created_at: 'DESC' },
      take: pageSize,
      skip,
    });

    if (tasks.length === 0) {
      const keyboard = Markup.inlineKeyboard([[Markup.button.callback('« Назад', 'menu')]]);
      await ctx.editMessageText('📋 У вас нет активных задач', keyboard);
      return;
    }

    const taskTypeLabels: Record<string, string> = {
      refill: '🔋 Пополнение',
      collection: '💰 Инкассация',
      cleaning: '🧹 Мойка',
      repair: '🔧 Ремонт',
      install: '📦 Установка',
      removal: '📤 Снятие',
      audit: '📊 Ревизия',
      inspection: '🔍 Осмотр',
    };

    const statusEmojis: Record<string, string> = {
      pending: '⏳',
      assigned: '📌',
      in_progress: '🔄',
    };

    let message = `📋 Ваши задачи (${total}):\n\n`;

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    tasks.forEach((task, index) => {
      const typeLabel = taskTypeLabels[task.typeCode] || task.typeCode;
      const statusEmoji = statusEmojis[task.status] || '📋';
      const machineName = task.machine?.name || 'Неизвестный аппарат';
      const dueDate = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('ru-RU')
        : 'Без срока';

      message += `${index + 1}. ${statusEmoji} ${typeLabel}\n`;
      message += `   🏭 ${machineName}\n`;
      message += `   📅 ${dueDate}\n\n`;

      buttons.push([Markup.button.callback(`${index + 1}. ${typeLabel}`, `task:${task.id}`)]);
    });

    // Pagination
    const totalPages = Math.ceil(total / pageSize);
    const paginationButtons: ReturnType<typeof Markup.button.callback>[] = [];

    if (page > 1) {
      paginationButtons.push(Markup.button.callback('« Пред.', `page:tasks:${page - 1}`));
    }
    if (page < totalPages) {
      paginationButtons.push(Markup.button.callback('След. »', `page:tasks:${page + 1}`));
    }

    if (paginationButtons.length > 0) {
      buttons.push(paginationButtons);
    }

    buttons.push([Markup.button.callback('« В меню', 'menu')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  private async showTaskDetails(ctx: BotContext, taskId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['machine', 'items'],
    });

    if (!task) {
      await ctx.reply('❌ Задача не найдена');
      return;
    }

    const typeLabels: Record<string, string> = {
      refill: '🔋 Пополнение',
      collection: '💰 Инкассация',
      cleaning: '🧹 Мойка',
      repair: '🔧 Ремонт',
    };

    const statusLabels: Record<string, string> = {
      pending: '⏳ Ожидает',
      assigned: '📌 Назначена',
      in_progress: '🔄 Выполняется',
      completed: '✅ Завершена',
      rejected: '❌ Отклонена',
      postponed: '⏸ Отложена',
    };

    let message =
      `📋 Задача #${task.taskNumber}\n\n` +
      `📝 Тип: ${typeLabels[task.typeCode] || task.typeCode}\n` +
      `📊 Статус: ${statusLabels[task.status]}\n` +
      `🏭 Аппарат: ${task.machine?.name || 'N/A'}\n` +
      `📍 Адрес: ${task.machine?.address || 'N/A'}\n`;

    if (task.dueDate) {
      message += `📅 Срок: ${new Date(task.dueDate).toLocaleString('ru-RU')}\n`;
    }

    if (task.priority && task.priority !== 'normal') {
      const priorityLabels: Record<string, string> = {
        low: '🟢 Низкий',
        normal: '🟡 Обычный',
        high: '🟠 Высокий',
        urgent: '🔴 Срочный',
      };
      message += `⚡ Приоритет: ${priorityLabels[task.priority]}\n`;
    }

    if (task.description) {
      message += `\n📄 Описание:\n${task.description}\n`;
    }

    // Items list
    if (task.items && task.items.length > 0) {
      message += '\n📦 Товары:\n';
      task.items.forEach((item) => {
        message += `• Товар: ${item.plannedQuantity} ${item.unitOfMeasure || 'шт'}\n`;
      });
    }

    // Expected cash for collection
    if (task.typeCode === 'collection' && task.expectedCashAmount) {
      message += `\n💵 Ожидаемая сумма: ${Number(task.expectedCashAmount).toLocaleString()} сум\n`;
    }

    // Build action buttons based on status
    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    if (task.status === TaskStatus.ASSIGNED) {
      buttons.push([Markup.button.callback('▶️ Начать выполнение', `task_start:${task.id}`)]);
    }

    if (task.status === TaskStatus.IN_PROGRESS) {
      buttons.push([Markup.button.callback('✅ Завершить', `task_complete:${task.id}`)]);

      // Photo buttons
      if (!task.hasPhotoBefore) {
        buttons.push([Markup.button.callback('📷 Фото ДО', `task_photo_before:${task.id}`)]);
      }
      if (!task.hasPhotoAfter) {
        buttons.push([Markup.button.callback('📷 Фото ПОСЛЕ', `task_photo_after:${task.id}`)]);
      }
    }

    if ([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS].includes(task.status)) {
      buttons.push([Markup.button.callback('⏸ Отложить', `task_postpone:${task.id}`)]);
    }

    // Navigation
    if (task.machine?.latitude && task.machine?.longitude) {
      buttons.push([
        Markup.button.url(
          '🗺 Навигация',
          `https://yandex.ru/maps/?rtext=~${task.machine.latitude},${task.machine.longitude}`,
        ) as unknown as ReturnType<typeof Markup.button.callback>,
      ]);
    }

    buttons.push([Markup.button.callback('« Назад к задачам', 'tasks')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  private async startTask(ctx: BotContext, taskId: string) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task || task.status !== TaskStatus.ASSIGNED) {
      await ctx.reply('❌ Невозможно начать выполнение задачи');
      return;
    }

    await this.taskRepository.update(taskId, {
      status: TaskStatus.IN_PROGRESS,
      startedAt: new Date(),
    });

    await ctx.reply('▶️ Задача начата!\n\nНе забудьте сделать фото ДО начала работы.');
    await this.showTaskDetails(ctx, taskId);
  }

  private async initiateTaskComplete(ctx: BotContext, taskId: string) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task || task.status !== TaskStatus.IN_PROGRESS) {
      await ctx.reply('❌ Задача не может быть завершена');
      return;
    }

    // Check photo requirements
    if (!task.hasPhotoBefore || !task.hasPhotoAfter) {
      const missingPhotos: string[] = [];
      if (!task.hasPhotoBefore) missingPhotos.push('фото ДО');
      if (!task.hasPhotoAfter) missingPhotos.push('фото ПОСЛЕ');

      await ctx.reply(
        `⚠️ Необходимо загрузить: ${missingPhotos.join(', ')}\n\n` +
          'Вы уверены, что хотите завершить без фото?',
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ Да, завершить', `confirm_complete:${taskId}`)],
          [Markup.button.callback('❌ Отмена', 'cancel')],
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
      await ctx.reply('💰 Введите фактическую сумму инкассации (в сумах):');
      return;
    }

    await this.completeTask(ctx, taskId);
  }

  private async completeTask(ctx: BotContext, taskId: string, actualCashAmount?: number) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) return;

    await this.taskRepository.update(taskId, {
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
      actualCashAmount: actualCashAmount ?? task.actualCashAmount,
    });

    this.clearSession(ctx.from!.id);

    await ctx.reply('✅ Задача успешно завершена!\n\nСпасибо за работу.');
    await this.showMainMenu(ctx);
  }

  private async postponeTask(ctx: BotContext, taskId: string) {
    this.setSession(ctx.from!.id, {
      state: SessionState.AWAITING_COMMENT,
      data: { taskId, action: 'postpone' },
    });
    await ctx.reply('📝 Укажите причину отложения задачи:');
  }

  private async requestPhotoBefore(ctx: BotContext, taskId: string) {
    this.setSession(ctx.from!.id, {
      state: SessionState.AWAITING_PHOTO_BEFORE,
      data: { taskId },
    });
    await ctx.reply('📷 Отправьте фото ДО начала работы.\n\nНужно сфотографировать аппарат и рабочую зону.');
  }

  private async requestPhotoAfter(ctx: BotContext, taskId: string) {
    this.setSession(ctx.from!.id, {
      state: SessionState.AWAITING_PHOTO_AFTER,
      data: { taskId },
    });
    await ctx.reply('📷 Отправьте фото ПОСЛЕ завершения работы.\n\nПокажите результат выполненной задачи.');
  }

  // ============================================================================
  // PHOTO & DATA HANDLERS
  // ============================================================================

  private async saveTaskPhoto(ctx: BotContext, taskId: string, fileId: string, type: 'before' | 'after') {
    const updateData: Partial<Task> = {};

    if (type === 'before') {
      updateData.hasPhotoBefore = true;
      updateData.metadata = { ...(await this.getTaskMetadata(taskId)), photoBeforeFileId: fileId };
    } else {
      updateData.hasPhotoAfter = true;
      updateData.metadata = { ...(await this.getTaskMetadata(taskId)), photoAfterFileId: fileId };
    }

    await this.taskRepository.update(taskId, updateData as Parameters<typeof this.taskRepository.update>[1]);
    this.clearSession(ctx.from!.id);

    const typeLabel = type === 'before' ? 'ДО' : 'ПОСЛЕ';
    await ctx.reply(`✅ Фото ${typeLabel} сохранено!`);
    await this.showTaskDetails(ctx, taskId);
  }

  private async saveTaskComment(ctx: BotContext, taskId: string, comment: string) {
    const session = this.getSession(ctx.from!.id);
    if (!session) return;

    if (session.data.action === 'postpone') {
      await this.taskRepository.update(taskId, {
        status: TaskStatus.POSTPONED,
        postponeReason: comment,
      });
      this.clearSession(ctx.from!.id);
      await ctx.reply('⏸ Задача отложена');
      await this.showMainMenu(ctx);
    }
  }

  private async saveCashAmount(ctx: BotContext, taskId: string, amount: number) {
    await this.taskRepository.update(taskId, { actualCashAmount: amount });
    await this.completeTask(ctx, taskId, amount);
  }

  private async saveRejectionReason(ctx: BotContext, taskId: string, reason: string) {
    await this.taskRepository.update(taskId, {
      rejectionReason: reason,
    });
    this.clearSession(ctx.from!.id);
    await ctx.reply('✅ Сохранено');
    await this.showTaskDetails(ctx, taskId);
  }

  private async saveTaskLocation(ctx: BotContext, taskId: string, lat: number, lon: number) {
    const metadata = await this.getTaskMetadata(taskId);
    const newMetadata = { ...metadata, completionLocation: { lat, lon, timestamp: new Date() } };
    await this.taskRepository.update(taskId, {
      metadata: newMetadata,
    } as unknown as Parameters<typeof this.taskRepository.update>[1]);
    await ctx.reply('📍 Местоположение сохранено');
  }

  // ============================================================================
  // MACHINE FUNCTIONS
  // ============================================================================

  private async showMyMachines(ctx: BotContext, page = 1) {
    if (!ctx.user) return;

    const pageSize = 5;
    const skip = (page - 1) * pageSize;

    const [machines, total] = await this.machineRepository.findAndCount({
      where: { assignedOperatorId: ctx.user.id },
      order: { name: 'ASC' },
      take: pageSize,
      skip,
    });

    if (machines.length === 0) {
      const keyboard = Markup.inlineKeyboard([[Markup.button.callback('« Назад', 'menu')]]);
      await ctx.editMessageText('🏭 За вами не закреплены аппараты', keyboard);
      return;
    }

    const statusEmojis: Record<string, string> = {
      active: '🟢',
      low_stock: '🟡',
      error: '🔴',
      maintenance: '🔧',
      offline: '⚫',
      disabled: '⛔',
    };

    let message = `🏭 Ваши аппараты (${total}):\n\n`;
    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    machines.forEach((machine, index) => {
      const statusEmoji = statusEmojis[machine.status] || '⚪';
      message += `${index + 1}. ${statusEmoji} ${machine.name}\n`;
      message += `   📍 ${machine.address || 'Адрес не указан'}\n\n`;

      buttons.push([Markup.button.callback(`${index + 1}. ${machine.name}`, `machine:${machine.id}`)]);
    });

    // Pagination
    const totalPages = Math.ceil(total / pageSize);
    const paginationButtons: ReturnType<typeof Markup.button.callback>[] = [];
    if (page > 1) paginationButtons.push(Markup.button.callback('«', `page:machines:${page - 1}`));
    if (page < totalPages) paginationButtons.push(Markup.button.callback('»', `page:machines:${page + 1}`));
    if (paginationButtons.length > 0) buttons.push(paginationButtons);

    buttons.push([Markup.button.callback('« В меню', 'menu')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  private async showMachineDetails(ctx: BotContext, machineId: string) {
    const machine = await this.machineRepository.findOne({ where: { id: machineId } });
    if (!machine) {
      await ctx.reply('❌ Аппарат не найден');
      return;
    }

    const statusLabels: Record<string, string> = {
      active: '🟢 Активен',
      low_stock: '🟡 Мало товара',
      error: '🔴 Ошибка',
      maintenance: '🔧 На обслуживании',
      offline: '⚫ Офлайн',
      disabled: '⛔ Отключен',
    };

    let message =
      `🏭 ${machine.name}\n\n` +
      `📊 Статус: ${statusLabels[machine.status]}\n` +
      `🔢 Номер: ${machine.machineNumber}\n` +
      `📍 Адрес: ${machine.address || 'Не указан'}\n`;

    if (machine.lastRefillDate) {
      message += `🔋 Последнее пополнение: ${new Date(machine.lastRefillDate).toLocaleDateString('ru-RU')}\n`;
    }
    if (machine.lastCollectionDate) {
      message += `💰 Последняя инкассация: ${new Date(machine.lastCollectionDate).toLocaleDateString('ru-RU')}\n`;
    }
    if (machine.currentCashAmount) {
      message += `💵 В кассе: ~${Number(machine.currentCashAmount).toLocaleString()} сум\n`;
    }

    const buttons: any[][] = [
      [
        Markup.button.callback('🔋 Пополнить', `machine_refill:${machine.id}`),
        Markup.button.callback('💰 Инкассация', `machine_collection:${machine.id}`),
      ],
    ];

    if (machine.latitude && machine.longitude) {
      buttons.push([
        Markup.button.url(
          '🗺 Навигация',
          `https://yandex.ru/maps/?rtext=~${machine.latitude},${machine.longitude}`,
        ),
      ]);
    }

    buttons.push([Markup.button.callback('« Назад', 'machines')]);

    const keyboard = Markup.inlineKeyboard(buttons);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  private async createRefillTask(ctx: BotContext, machineId: string) {
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
    await ctx.reply('✅ Задача на пополнение создана!');
    await this.showTaskDetails(ctx, task.id);
  }

  private async createCollectionTask(ctx: BotContext, machineId: string) {
    if (!ctx.user) return;

    const machine = await this.machineRepository.findOne({ where: { id: machineId } });
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
    await ctx.reply('✅ Задача на инкассацию создана!');
    await this.showTaskDetails(ctx, task.id);
  }

  // ============================================================================
  // STATS & PROFILE
  // ============================================================================

  private async showMyStats(ctx: BotContext) {
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

    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('« В меню', 'menu')]]);

    await ctx.reply(message, keyboard);
  }

  private async showProfile(ctx: BotContext) {
    if (!ctx.user) return;

    const roleLabels: Record<string, string> = {
      owner: 'Владелец',
      admin: 'Администратор',
      manager: 'Менеджер',
      operator: 'Оператор',
      warehouse: 'Складской менеджер',
      accountant: 'Бухгалтер',
      viewer: 'Наблюдатель',
    };

    const message =
      `👤 Ваш профиль:\n\n` +
      `📛 Имя: ${ctx.user.firstName} ${ctx.user.lastName || ''}\n` +
      `📧 Email: ${ctx.user.email}\n` +
      `📱 Телефон: ${ctx.user.phone || 'Не указан'}\n` +
      `🎭 Роль: ${roleLabels[ctx.user.role]}\n` +
      `📅 Регистрация: ${new Date(ctx.user.created_at).toLocaleDateString('ru-RU')}`;

    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('« В меню', 'menu')]]);

    await ctx.reply(message, keyboard);
  }

  private async showOverdueTasks(ctx: BotContext) {
    if (!ctx.user) return;

    const overdueTasks = await this.taskRepository.find({
      where: {
        assignedToUserId: ctx.user.id,
        status: In([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
        dueDate: LessThan(new Date()),
      },
      relations: ['machine'],
      order: { dueDate: 'ASC' },
    });

    if (overdueTasks.length === 0) {
      await ctx.reply('✅ У вас нет просроченных задач!');
      return;
    }

    let message = `⚠️ Просроченные задачи (${overdueTasks.length}):\n\n`;

    const buttons: ReturnType<typeof Markup.button.callback>[][] = [];

    overdueTasks.forEach((task, index) => {
      const daysOverdue = Math.ceil(
        (new Date().getTime() - new Date(task.dueDate!).getTime()) / (1000 * 60 * 60 * 24),
      );
      message += `${index + 1}. ${task.machine?.name || 'Аппарат'}\n`;
      message += `   ⏰ Просрочено на ${daysOverdue} дн.\n\n`;

      buttons.push([Markup.button.callback(`${index + 1}. Открыть`, `task:${task.id}`)]);
    });

    buttons.push([Markup.button.callback('« В меню', 'menu')]);

    const keyboard = Markup.inlineKeyboard(buttons);
    await ctx.reply(message, keyboard);
  }

  // ============================================================================
  // REPORTS, TEAM, WAREHOUSE FUNCTIONS
  // ============================================================================

  private async showReports(ctx: BotContext) {
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
      where: { organizationId: ctx.organizationId, status: MachineStatus.ACTIVE },
    });

    const errorMachines = await this.machineRepository.count({
      where: { organizationId: ctx.organizationId, status: MachineStatus.ERROR },
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
      [Markup.button.callback('📈 Подробнее в системе', 'menu')],
      [Markup.button.callback('« В меню', 'menu')],
    ]);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  private async showTeam(ctx: BotContext) {
    if (!ctx.user || !ctx.organizationId) return;

    const users = await this.userRepository.find({
      where: { organizationId: ctx.organizationId, isActive: true },
      order: { firstName: 'ASC' },
      take: 20,
    });

    const roleLabels: Record<string, string> = {
      owner: '👑',
      admin: '🔑',
      manager: '📊',
      operator: '👷',
      warehouse: '📦',
      accountant: '💰',
      viewer: '👁',
    };

    let message = `👥 Команда (${users.length}):\n\n`;

    users.forEach((user, index) => {
      const roleIcon = roleLabels[user.role] || '👤';
      const onlineStatus = user.telegramId ? '🟢' : '⚪';
      message += `${index + 1}. ${roleIcon} ${user.firstName} ${user.lastName || ''}\n`;
      message += `   ${onlineStatus} ${user.role}\n`;
    });

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('« В меню', 'menu')],
    ]);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  private async showWarehouse(ctx: BotContext) {
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
      [Markup.button.callback('📝 Заявки на материалы', 'material_requests')],
      [Markup.button.callback('« В меню', 'menu')],
    ]);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  private async showMaterialRequests(ctx: BotContext) {
    if (!ctx.user || !ctx.organizationId) return;

    // Would need material request repository for full implementation
    const message =
      `📝 Заявки на материалы\n\n` +
      `Для просмотра и создания заявок\n` +
      `используйте веб-интерфейс.\n\n` +
      `Уведомления о новых заявках\n` +
      `будут приходить сюда автоматически.`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('« Назад', 'warehouse')],
      [Markup.button.callback('« В меню', 'menu')],
    ]);

    try {
      await ctx.editMessageText(message, keyboard);
    } catch {
      await ctx.reply(message, keyboard);
    }
  }

  // ============================================================================
  // NOTIFICATIONS (Public methods for other services)
  // ============================================================================

  async sendTaskAssignedNotification(userId: string, task: Task) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.telegramId || !this.bot) return;

    const typeLabels: Record<string, string> = {
      refill: '🔋 Пополнение',
      collection: '💰 Инкассация',
      cleaning: '🧹 Мойка',
      repair: '🔧 Ремонт',
    };

    const message =
      `📢 Новая задача!\n\n` +
      `📝 ${typeLabels[task.typeCode] || task.typeCode}\n` +
      `🏭 ${task.machine?.name || 'Аппарат'}\n` +
      (task.dueDate ? `📅 Срок: ${new Date(task.dueDate).toLocaleString('ru-RU')}\n` : '');

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👀 Открыть задачу', `task:${task.id}`)],
    ]);

    try {
      await this.bot.telegram.sendMessage(user.telegramId, message, keyboard);
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
      `🏭 ${task.machine?.name || 'Аппарат'}\n` +
      `📅 Срок был: ${new Date(task.dueDate!).toLocaleString('ru-RU')}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👀 Открыть задачу', `task:${task.id}`)],
    ]);

    try {
      await this.bot.telegram.sendMessage(user.telegramId, message, keyboard);
    } catch (error: any) {
      this.logger.error(`Failed to send notification to ${userId}:`, error);
    }
  }

  async sendMachineAlertNotification(userId: string, machine: Machine, alertType: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.telegramId || !this.bot) return;

    const alertMessages: Record<string, string> = {
      low_stock: '📦 Низкий уровень товара',
      error: '🔴 Ошибка аппарата',
      offline: '⚫ Аппарат офлайн',
      cash_full: '💰 Касса заполнена',
    };

    const message =
      `🚨 Внимание!\n\n` +
      `${alertMessages[alertType] || 'Требуется внимание'}\n\n` +
      `🏭 ${machine.name}\n` +
      `📍 ${machine.address || 'Адрес не указан'}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('👀 Подробнее', `machine:${machine.id}`)],
    ]);

    try {
      await this.bot.telegram.sendMessage(user.telegramId, message, keyboard);
    } catch (error: any) {
      this.logger.error(`Failed to send alert to ${userId}:`, error);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getHelpMessage(_role?: string): string {
    let help =
      '❓ Справка VendHub Bot\n\n' +
      '📋 Основные команды:\n' +
      '/start - Главное меню\n' +
      '/mytasks - Мои задачи\n' +
      '/machines - Мои аппараты\n' +
      '/stats - Моя статистика\n' +
      '/profile - Мой профиль\n' +
      '/overdue - Просроченные задачи\n' +
      '/help - Эта справка\n\n';

    help +=
      '💡 Подсказки:\n' +
      '• Делайте фото ДО и ПОСЛЕ выполнения задачи\n' +
      '• Указывайте точную сумму при инкассации\n' +
      '• Своевременно завершайте задачи\n';

    return help;
  }

  private getSession(userId: number): TelegramSession | undefined {
    return this.sessions.get(userId);
  }

  private setSession(userId: number, session: TelegramSession) {
    this.sessions.set(userId, session);
  }

  private clearSession(userId: number) {
    this.sessions.delete(userId);
  }

  private async getTaskMetadata(taskId: string): Promise<Record<string, unknown>> {
    const task = await this.taskRepository.findOne({ where: { id: taskId }, select: ['metadata'] });
    return task?.metadata || {};
  }

  // ============================================================================
  // TELEGRAM USER TRACKING & ANALYTICS (New methods - Phase 4 Batch 1.2)
  // ============================================================================

  /**
   * Find or create a TelegramUser record (upsert pattern)
   */
  async findOrCreateTelegramUser(
    telegramId: string,
    chatId: string,
    username: string | null,
    firstName: string | null,
    lastName: string | null,
    botType: string,
    organizationId?: string,
  ): Promise<TelegramUser> {
    let telegramUser = await this.telegramUserRepo.findOne({
      where: { telegram_id: telegramId },
    });

    if (telegramUser) {
      // Update existing user with latest info
      telegramUser.chat_id = chatId;
      telegramUser.username = username ?? telegramUser.username;
      telegramUser.first_name = firstName ?? telegramUser.first_name;
      telegramUser.last_name = lastName ?? telegramUser.last_name;
      telegramUser.last_interaction_at = new Date();
      if (organizationId) {
        telegramUser.organization_id = organizationId;
      }
      return this.telegramUserRepo.save(telegramUser);
    }

    // Create new user
    telegramUser = this.telegramUserRepo.create({
      telegram_id: telegramId,
      chat_id: chatId,
      username,
      first_name: firstName,
      last_name: lastName,
      bot_type: botType,
      organization_id: organizationId || null,
      language: TelegramLanguage.RU,
      status: TelegramUserStatus.ACTIVE,
      is_verified: false,
      last_interaction_at: new Date(),
      notification_preferences: { tasks: true, machines: true, alerts: true },
    });

    return this.telegramUserRepo.save(telegramUser);
  }

  /**
   * Log an incoming or outgoing Telegram message
   */
  async logMessage(data: {
    telegramUserId: string;
    chatId: string;
    direction: string;
    messageType: TelegramMessageType;
    command?: string;
    messageText?: string;
    telegramMessageId?: number;
    status: TelegramMessageStatus;
    responseTimeMs?: number;
    organizationId?: string;
    metadata?: Record<string, any>;
  }): Promise<TelegramMessageLog> {
    const log = this.messageLogRepo.create({
      telegram_user_id: data.telegramUserId,
      chat_id: data.chatId,
      direction: data.direction,
      message_type: data.messageType,
      command: data.command || null,
      message_text: data.messageText ? data.messageText.substring(0, 1000) : null,
      telegram_message_id: data.telegramMessageId || null,
      status: data.status,
      response_time_ms: data.responseTimeMs || null,
      organization_id: data.organizationId || null,
      metadata: data.metadata || null,
    });

    return this.messageLogRepo.save(log);
  }

  /**
   * Track a bot analytics event
   */
  async trackAnalytics(data: {
    telegramUserId?: string;
    userId?: string;
    botType: string;
    eventType: TelegramEventType;
    actionName: string;
    actionCategory?: string;
    responseTimeMs?: number;
    success: boolean;
    errorMessage?: string;
    organizationId?: string;
    sessionId?: string;
    metadata?: Record<string, any>;
  }): Promise<TelegramBotAnalytics> {
    const event = this.analyticsRepo.create({
      telegram_user_id: data.telegramUserId || null,
      user_id: data.userId || null,
      bot_type: data.botType,
      event_type: data.eventType,
      action_name: data.actionName,
      action_category: data.actionCategory || null,
      response_time_ms: data.responseTimeMs || null,
      success: data.success,
      error_message: data.errorMessage || null,
      organization_id: data.organizationId || null,
      session_id: data.sessionId || null,
      metadata: data.metadata || null,
    });

    return this.analyticsRepo.save(event);
  }

  /**
   * Verify a Telegram user with a verification code
   */
  async verifyUser(
    telegramId: string,
    verificationCode: string,
  ): Promise<{ success: boolean; message: string }> {
    const telegramUser = await this.telegramUserRepo.findOne({
      where: { telegram_id: telegramId },
    });

    if (!telegramUser) {
      return { success: false, message: 'Telegram user not found' };
    }

    if (telegramUser.is_verified) {
      return { success: false, message: 'User is already verified' };
    }

    if (!telegramUser.verification_code) {
      return { success: false, message: 'No verification code set' };
    }

    if (
      telegramUser.verification_expires_at &&
      new Date() > telegramUser.verification_expires_at
    ) {
      return { success: false, message: 'Verification code has expired' };
    }

    if (telegramUser.verification_code !== verificationCode) {
      return { success: false, message: 'Invalid verification code' };
    }

    // Mark as verified
    telegramUser.is_verified = true;
    telegramUser.verification_code = null;
    telegramUser.verification_expires_at = null;
    await this.telegramUserRepo.save(telegramUser);

    return { success: true, message: 'User verified successfully' };
  }

  /**
   * Update notification preferences for a Telegram user
   */
  async updateNotificationPreferences(
    telegramUserId: string,
    preferences: Record<string, any>,
  ): Promise<TelegramUser> {
    const telegramUser = await this.telegramUserRepo.findOne({
      where: { id: telegramUserId },
    });

    if (!telegramUser) {
      throw new NotFoundException('Telegram user not found');
    }

    telegramUser.notification_preferences = {
      ...(telegramUser.notification_preferences || {}),
      ...preferences,
    };

    return this.telegramUserRepo.save(telegramUser);
  }

  /**
   * Get paginated list of Telegram users with filters
   */
  async getTelegramUsers(
    query: QueryTelegramUsersDto,
    organizationId?: string,
  ): Promise<{ data: TelegramUser[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.telegramUserRepo.createQueryBuilder('tu');

    if (organizationId) {
      qb.andWhere('tu.organization_id = :organizationId', { organizationId });
    }

    if (query.status) {
      qb.andWhere('tu.status = :status', { status: query.status });
    }

    if (query.botType) {
      qb.andWhere('tu.bot_type = :botType', { botType: query.botType });
    }

    if (query.isVerified !== undefined) {
      const isVerified = query.isVerified === 'true';
      qb.andWhere('tu.is_verified = :isVerified', { isVerified });
    }

    if (query.search) {
      qb.andWhere(
        '(tu.username ILIKE :search OR tu.first_name ILIKE :search OR tu.last_name ILIKE :search OR tu.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.andWhere('tu.deleted_at IS NULL');
    qb.orderBy('tu.last_interaction_at', 'DESC', 'NULLS LAST');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get a single Telegram user with stats
   */
  async getTelegramUser(id: string): Promise<{
    user: TelegramUser;
    stats: {
      totalMessages: number;
      totalCommands: number;
      lastMessageAt: Date | null;
    };
  }> {
    const user = await this.telegramUserRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Telegram user not found');
    }

    const totalMessages = await this.messageLogRepo.count({
      where: { telegram_user_id: id },
    });

    const totalCommands = await this.messageLogRepo.count({
      where: { telegram_user_id: id, message_type: TelegramMessageType.COMMAND },
    });

    const lastMessage = await this.messageLogRepo.findOne({
      where: { telegram_user_id: id },
      order: { created_at: 'DESC' },
    });

    return {
      user,
      stats: {
        totalMessages,
        totalCommands,
        lastMessageAt: lastMessage?.created_at || null,
      },
    };
  }

  /**
   * Get analytics summary (aggregate stats)
   */
  async getAnalyticsSummary(
    organizationId?: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByBotType: Record<string, number>;
    averageResponseTime: number | null;
    successRate: number;
  }> {
    // Total registered users
    const userQb = this.telegramUserRepo.createQueryBuilder('tu')
      .where('tu.deleted_at IS NULL');
    if (organizationId) {
      userQb.andWhere('tu.organization_id = :organizationId', { organizationId });
    }
    const totalUsers = await userQb.getCount();

    // Active users (interacted in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUserQb = this.telegramUserRepo.createQueryBuilder('tu')
      .where('tu.deleted_at IS NULL')
      .andWhere('tu.last_interaction_at > :sevenDaysAgo', { sevenDaysAgo });
    if (organizationId) {
      activeUserQb.andWhere('tu.organization_id = :organizationId', { organizationId });
    }
    const activeUsers = await activeUserQb.getCount();

    // Analytics events
    const eventQb = this.analyticsRepo.createQueryBuilder('a')
      .where('a.deleted_at IS NULL');
    if (organizationId) {
      eventQb.andWhere('a.organization_id = :organizationId', { organizationId });
    }
    if (dateFrom) {
      eventQb.andWhere('a.created_at >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      eventQb.andWhere('a.created_at <= :dateTo', { dateTo: new Date(dateTo) });
    }

    const totalEvents = await eventQb.getCount();

    // Events by type
    const eventsByTypeRaw = await this.analyticsRepo.createQueryBuilder('a')
      .select('a.event_type', 'event_type')
      .addSelect('COUNT(*)', 'count')
      .where('a.deleted_at IS NULL')
      .andWhere(organizationId ? 'a.organization_id = :organizationId' : '1=1', { organizationId })
      .andWhere(dateFrom ? 'a.created_at >= :dateFrom' : '1=1', { dateFrom: dateFrom ? new Date(dateFrom) : undefined })
      .andWhere(dateTo ? 'a.created_at <= :dateTo' : '1=1', { dateTo: dateTo ? new Date(dateTo) : undefined })
      .groupBy('a.event_type')
      .getRawMany();

    const eventsByType: Record<string, number> = {};
    eventsByTypeRaw.forEach((row) => {
      eventsByType[row.event_type] = parseInt(row.count, 10);
    });

    // Events by bot type
    const eventsByBotTypeRaw = await this.analyticsRepo.createQueryBuilder('a')
      .select('a.bot_type', 'bot_type')
      .addSelect('COUNT(*)', 'count')
      .where('a.deleted_at IS NULL')
      .andWhere(organizationId ? 'a.organization_id = :organizationId' : '1=1', { organizationId })
      .andWhere(dateFrom ? 'a.created_at >= :dateFrom' : '1=1', { dateFrom: dateFrom ? new Date(dateFrom) : undefined })
      .andWhere(dateTo ? 'a.created_at <= :dateTo' : '1=1', { dateTo: dateTo ? new Date(dateTo) : undefined })
      .groupBy('a.bot_type')
      .getRawMany();

    const eventsByBotType: Record<string, number> = {};
    eventsByBotTypeRaw.forEach((row) => {
      eventsByBotType[row.bot_type] = parseInt(row.count, 10);
    });

    // Average response time
    const avgResponseRaw = await this.analyticsRepo.createQueryBuilder('a')
      .select('AVG(a.response_time_ms)', 'avg_response')
      .where('a.deleted_at IS NULL')
      .andWhere('a.response_time_ms IS NOT NULL')
      .andWhere(organizationId ? 'a.organization_id = :organizationId' : '1=1', { organizationId })
      .andWhere(dateFrom ? 'a.created_at >= :dateFrom' : '1=1', { dateFrom: dateFrom ? new Date(dateFrom) : undefined })
      .andWhere(dateTo ? 'a.created_at <= :dateTo' : '1=1', { dateTo: dateTo ? new Date(dateTo) : undefined })
      .getRawOne();

    const averageResponseTime = avgResponseRaw?.avg_response
      ? Math.round(parseFloat(avgResponseRaw.avg_response))
      : null;

    // Success rate
    const successCount = await this.analyticsRepo.createQueryBuilder('a')
      .where('a.deleted_at IS NULL')
      .andWhere('a.success = true')
      .andWhere(organizationId ? 'a.organization_id = :organizationId' : '1=1', { organizationId })
      .andWhere(dateFrom ? 'a.created_at >= :dateFrom' : '1=1', { dateFrom: dateFrom ? new Date(dateFrom) : undefined })
      .andWhere(dateTo ? 'a.created_at <= :dateTo' : '1=1', { dateTo: dateTo ? new Date(dateTo) : undefined })
      .getCount();

    const successRate = totalEvents > 0 ? Math.round((successCount / totalEvents) * 100) : 100;

    return {
      totalUsers,
      activeUsers,
      totalEvents,
      eventsByType,
      eventsByBotType,
      averageResponseTime,
      successRate,
    };
  }

  /**
   * Get paginated message log with filters
   */
  async getMessageLog(
    query: QueryMessagesDto,
    organizationId?: string,
  ): Promise<{ data: TelegramMessageLog[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.messageLogRepo.createQueryBuilder('ml')
      .leftJoinAndSelect('ml.telegram_user', 'tu');

    if (organizationId) {
      qb.andWhere('ml.organization_id = :organizationId', { organizationId });
    }

    if (query.telegramUserId) {
      qb.andWhere('ml.telegram_user_id = :telegramUserId', {
        telegramUserId: query.telegramUserId,
      });
    }

    if (query.messageType) {
      qb.andWhere('ml.message_type = :messageType', { messageType: query.messageType });
    }

    if (query.direction) {
      qb.andWhere('ml.direction = :direction', { direction: query.direction });
    }

    if (query.dateFrom) {
      qb.andWhere('ml.created_at >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
    }

    if (query.dateTo) {
      qb.andWhere('ml.created_at <= :dateTo', { dateTo: new Date(query.dateTo) });
    }

    qb.andWhere('ml.deleted_at IS NULL');
    qb.orderBy('ml.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }
}
