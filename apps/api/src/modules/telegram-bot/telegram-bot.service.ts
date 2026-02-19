/**
 * Telegram Bot Service for VendHub OS
 * Orchestrator: initializes the bot and delegates to sub-services.
 *
 * Public API surface is preserved for TelegramBotController and external consumers.
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Telegraf } from "telegraf";
import { User } from "../users/entities/user.entity";
import { Task } from "../tasks/entities/task.entity";
import { Machine } from "../machines/entities/machine.entity";
import { TelegramUser } from "./entities/telegram-user.entity";
import {
  TelegramMessageLog,
  TelegramMessageType,
  TelegramMessageStatus,
} from "./entities/telegram-message-log.entity";
import {
  TelegramBotAnalytics,
  TelegramEventType,
} from "./entities/telegram-bot-analytics.entity";
import { TelegramSettings } from "./entities/telegram-settings.entity";
import { QueryTelegramUsersDto } from "./dto/telegram-user.dto";
import { QueryMessagesDto } from "./dto/telegram-settings.dto";
import { BotContext, TelegramSession } from "./services/bot-types";
import { BotHandlersService } from "./services/bot-handlers.service";
import { BotTaskOpsService } from "./services/bot-task-ops.service";
import { BotMachineOpsService } from "./services/bot-machine-ops.service";
import { BotMenuService } from "./services/bot-menu.service";
import { BotNotificationsService } from "./services/bot-notifications.service";
import { BotAdminService } from "./services/bot-admin.service";

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
    @InjectRepository(TelegramUser)
    private telegramUserRepo: Repository<TelegramUser>,
    @InjectRepository(TelegramMessageLog)
    private messageLogRepo: Repository<TelegramMessageLog>,
    @InjectRepository(TelegramBotAnalytics)
    private analyticsRepo: Repository<TelegramBotAnalytics>,
    @InjectRepository(TelegramSettings)
    private settingsRepo: Repository<TelegramSettings>,
    // Sub-services
    private readonly handlersService: BotHandlersService,
    private readonly taskOpsService: BotTaskOpsService,
    private readonly machineOpsService: BotMachineOpsService,
    private readonly menuService: BotMenuService,
    private readonly notificationsService: BotNotificationsService,
    private readonly adminService: BotAdminService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      this.logger.warn("TELEGRAM_BOT_TOKEN not set, bot disabled");
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

    // Wire sub-services with bot instance and shared sessions
    this.taskOpsService.setBot(this.bot, this.sessions);
    this.machineOpsService.setBot(this.bot, this.sessions);
    this.menuService.setBot(this.bot, this.sessions);
    this.notificationsService.setBot(this.bot, this.sessions);

    // Wire cross-service callback: task ops needs showMainMenu from menu service
    this.taskOpsService.setShowMainMenuFn(
      this.menuService.showMainMenu.bind(this.menuService),
    );

    // Handlers service registers all bot commands/callbacks/messages
    this.handlersService.setBot(this.bot, this.sessions);

    // Start bot
    try {
      await this.bot.launch();
      this.logger.log("Telegram bot started");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      this.logger.error("Failed to start bot:", error);
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop();
    }
  }

  // ============================================================================
  // PUBLIC API — delegated to sub-services
  // All public methods below preserve the original TelegramBotService API
  // so that TelegramBotController and external consumers continue to work.
  // ============================================================================

  // --- Notifications ---

  async sendTaskAssignedNotification(userId: string, task: Task) {
    return this.notificationsService.sendTaskAssignedNotification(userId, task);
  }

  async sendTaskOverdueNotification(userId: string, task: Task) {
    return this.notificationsService.sendTaskOverdueNotification(userId, task);
  }

  async sendMachineAlertNotification(
    userId: string,
    machine: Machine,
    alertType: string,
  ) {
    return this.notificationsService.sendMachineAlertNotification(
      userId,
      machine,
      alertType,
    );
  }

  // --- Admin / Analytics ---

  async findOrCreateTelegramUser(
    telegramId: string,
    chatId: string,
    username: string | null,
    firstName: string | null,
    lastName: string | null,
    botType: string,
    organizationId?: string,
  ): Promise<TelegramUser> {
    return this.adminService.findOrCreateTelegramUser(
      telegramId,
      chatId,
      username,
      firstName,
      lastName,
      botType,
      organizationId,
    );
  }

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
    metadata?: Record<string, unknown>;
  }): Promise<TelegramMessageLog> {
    return this.adminService.logMessage(data);
  }

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
    metadata?: Record<string, unknown>;
  }): Promise<TelegramBotAnalytics> {
    return this.adminService.trackAnalytics(data);
  }

  async verifyUser(
    telegramId: string,
    verificationCode: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.adminService.verifyUser(telegramId, verificationCode);
  }

  async updateNotificationPreferences(
    telegramUserId: string,
    preferences: Record<string, unknown>,
  ): Promise<TelegramUser> {
    return this.adminService.updateNotificationPreferences(
      telegramUserId,
      preferences,
    );
  }

  async getTelegramUsers(
    query: QueryTelegramUsersDto,
    organizationId?: string,
  ): Promise<{
    data: TelegramUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.adminService.getTelegramUsers(query, organizationId);
  }

  async getTelegramUser(id: string): Promise<{
    user: TelegramUser;
    stats: {
      totalMessages: number;
      totalCommands: number;
      lastMessageAt: Date | null;
    };
  }> {
    return this.adminService.getTelegramUser(id);
  }

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
    return this.adminService.getAnalyticsSummary(
      organizationId,
      dateFrom,
      dateTo,
    );
  }

  async getMessageLog(
    query: QueryMessagesDto,
    organizationId?: string,
  ): Promise<{
    data: TelegramMessageLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.adminService.getMessageLog(query, organizationId);
  }
}
