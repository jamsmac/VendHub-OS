/**
 * Bot Admin Service
 * Analytics, user tracking, verification, message logging, settings queries.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  TelegramUser,
  TelegramUserStatus,
  TelegramLanguage,
} from "../entities/telegram-user.entity";
import {
  TelegramMessageLog,
  TelegramMessageType,
  TelegramMessageStatus,
} from "../entities/telegram-message-log.entity";
import {
  TelegramBotAnalytics,
  TelegramEventType,
} from "../entities/telegram-bot-analytics.entity";
import { TelegramSettings } from "../entities/telegram-settings.entity";
import { QueryTelegramUsersDto } from "../dto/telegram-user.dto";
import { QueryMessagesDto } from "../dto/telegram-settings.dto";

@Injectable()
export class BotAdminService {
  private readonly logger = new Logger(BotAdminService.name);

  constructor(
    @InjectRepository(TelegramUser)
    private telegramUserRepo: Repository<TelegramUser>,
    @InjectRepository(TelegramMessageLog)
    private messageLogRepo: Repository<TelegramMessageLog>,
    @InjectRepository(TelegramBotAnalytics)
    private analyticsRepo: Repository<TelegramBotAnalytics>,
    @InjectRepository(TelegramSettings)
    private settingsRepo: Repository<TelegramSettings>,
  ) {}

  // ============================================================================
  // Expose settingsRepo for controller bracket-access compatibility
  // ============================================================================

  getSettingsRepo(): Repository<TelegramSettings> {
    return this.settingsRepo;
  }

  // ============================================================================
  // TELEGRAM USER TRACKING & ANALYTICS
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
    metadata?: Record<string, unknown>;
  }): Promise<TelegramMessageLog> {
    const log = this.messageLogRepo.create({
      telegram_user_id: data.telegramUserId,
      chat_id: data.chatId,
      direction: data.direction,
      message_type: data.messageType,
      command: data.command || null,
      message_text: data.messageText
        ? data.messageText.substring(0, 1000)
        : null,
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
    metadata?: Record<string, unknown>;
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
      return { success: false, message: "Telegram user not found" };
    }

    if (telegramUser.is_verified) {
      return { success: false, message: "User is already verified" };
    }

    if (!telegramUser.verification_code) {
      return { success: false, message: "No verification code set" };
    }

    if (
      telegramUser.verification_expires_at &&
      new Date() > telegramUser.verification_expires_at
    ) {
      return { success: false, message: "Verification code has expired" };
    }

    if (telegramUser.verification_code !== verificationCode) {
      return { success: false, message: "Invalid verification code" };
    }

    // Mark as verified
    telegramUser.is_verified = true;
    telegramUser.verification_code = null;
    telegramUser.verification_expires_at = null;
    await this.telegramUserRepo.save(telegramUser);

    return { success: true, message: "User verified successfully" };
  }

  /**
   * Update notification preferences for a Telegram user
   */
  async updateNotificationPreferences(
    telegramUserId: string,
    preferences: Record<string, unknown>,
  ): Promise<TelegramUser> {
    const telegramUser = await this.telegramUserRepo.findOne({
      where: { id: telegramUserId },
    });

    if (!telegramUser) {
      throw new NotFoundException("Telegram user not found");
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
  ): Promise<{
    data: TelegramUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.telegramUserRepo.createQueryBuilder("tu");

    if (organizationId) {
      qb.andWhere("tu.organization_id = :organizationId", { organizationId });
    }

    if (query.status) {
      qb.andWhere("tu.status = :status", { status: query.status });
    }

    if (query.botType) {
      qb.andWhere("tu.bot_type = :botType", { botType: query.botType });
    }

    if (query.isVerified !== undefined) {
      const isVerified = query.isVerified === "true";
      qb.andWhere("tu.is_verified = :isVerified", { isVerified });
    }

    if (query.search) {
      qb.andWhere(
        "(tu.username ILIKE :search OR tu.first_name ILIKE :search OR tu.last_name ILIKE :search OR tu.phone ILIKE :search)",
        { search: `%${query.search}%` },
      );
    }

    qb.andWhere("tu.deleted_at IS NULL");
    qb.orderBy("tu.last_interaction_at", "DESC", "NULLS LAST");
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
      throw new NotFoundException("Telegram user not found");
    }

    const totalMessages = await this.messageLogRepo.count({
      where: { telegram_user_id: id },
    });

    const totalCommands = await this.messageLogRepo.count({
      where: {
        telegram_user_id: id,
        message_type: TelegramMessageType.COMMAND,
      },
    });

    const lastMessage = await this.messageLogRepo.findOne({
      where: { telegram_user_id: id },
      order: { created_at: "DESC" },
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
    const userQb = this.telegramUserRepo
      .createQueryBuilder("tu")
      .where("tu.deleted_at IS NULL");
    if (organizationId) {
      userQb.andWhere("tu.organization_id = :organizationId", {
        organizationId,
      });
    }
    const totalUsers = await userQb.getCount();

    // Active users (interacted in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUserQb = this.telegramUserRepo
      .createQueryBuilder("tu")
      .where("tu.deleted_at IS NULL")
      .andWhere("tu.last_interaction_at > :sevenDaysAgo", { sevenDaysAgo });
    if (organizationId) {
      activeUserQb.andWhere("tu.organization_id = :organizationId", {
        organizationId,
      });
    }
    const activeUsers = await activeUserQb.getCount();

    // Analytics events
    const eventQb = this.analyticsRepo
      .createQueryBuilder("a")
      .where("a.deleted_at IS NULL");
    if (organizationId) {
      eventQb.andWhere("a.organization_id = :organizationId", {
        organizationId,
      });
    }
    if (dateFrom) {
      eventQb.andWhere("a.created_at >= :dateFrom", {
        dateFrom: new Date(dateFrom),
      });
    }
    if (dateTo) {
      eventQb.andWhere("a.created_at <= :dateTo", { dateTo: new Date(dateTo) });
    }

    const totalEvents = await eventQb.getCount();

    // Events by type
    const eventsByTypeRaw = await this.analyticsRepo
      .createQueryBuilder("a")
      .select("a.event_type", "event_type")
      .addSelect("COUNT(*)", "count")
      .where("a.deleted_at IS NULL")
      .andWhere(
        organizationId ? "a.organization_id = :organizationId" : "1=1",
        { organizationId },
      )
      .andWhere(dateFrom ? "a.created_at >= :dateFrom" : "1=1", {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      })
      .andWhere(dateTo ? "a.created_at <= :dateTo" : "1=1", {
        dateTo: dateTo ? new Date(dateTo) : undefined,
      })
      .groupBy("a.event_type")
      .getRawMany();

    const eventsByType: Record<string, number> = {};
    eventsByTypeRaw.forEach((row) => {
      eventsByType[row.event_type] = parseInt(row.count, 10);
    });

    // Events by bot type
    const eventsByBotTypeRaw = await this.analyticsRepo
      .createQueryBuilder("a")
      .select("a.bot_type", "bot_type")
      .addSelect("COUNT(*)", "count")
      .where("a.deleted_at IS NULL")
      .andWhere(
        organizationId ? "a.organization_id = :organizationId" : "1=1",
        { organizationId },
      )
      .andWhere(dateFrom ? "a.created_at >= :dateFrom" : "1=1", {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      })
      .andWhere(dateTo ? "a.created_at <= :dateTo" : "1=1", {
        dateTo: dateTo ? new Date(dateTo) : undefined,
      })
      .groupBy("a.bot_type")
      .getRawMany();

    const eventsByBotType: Record<string, number> = {};
    eventsByBotTypeRaw.forEach((row) => {
      eventsByBotType[row.bot_type] = parseInt(row.count, 10);
    });

    // Average response time
    const avgResponseRaw = await this.analyticsRepo
      .createQueryBuilder("a")
      .select("AVG(a.response_time_ms)", "avg_response")
      .where("a.deleted_at IS NULL")
      .andWhere("a.response_time_ms IS NOT NULL")
      .andWhere(
        organizationId ? "a.organization_id = :organizationId" : "1=1",
        { organizationId },
      )
      .andWhere(dateFrom ? "a.created_at >= :dateFrom" : "1=1", {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      })
      .andWhere(dateTo ? "a.created_at <= :dateTo" : "1=1", {
        dateTo: dateTo ? new Date(dateTo) : undefined,
      })
      .getRawOne();

    const averageResponseTime = avgResponseRaw?.avg_response
      ? Math.round(parseFloat(avgResponseRaw.avg_response))
      : null;

    // Success rate
    const successCount = await this.analyticsRepo
      .createQueryBuilder("a")
      .where("a.deleted_at IS NULL")
      .andWhere("a.success = true")
      .andWhere(
        organizationId ? "a.organization_id = :organizationId" : "1=1",
        { organizationId },
      )
      .andWhere(dateFrom ? "a.created_at >= :dateFrom" : "1=1", {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      })
      .andWhere(dateTo ? "a.created_at <= :dateTo" : "1=1", {
        dateTo: dateTo ? new Date(dateTo) : undefined,
      })
      .getCount();

    const successRate =
      totalEvents > 0 ? Math.round((successCount / totalEvents) * 100) : 100;

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
  ): Promise<{
    data: TelegramMessageLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.messageLogRepo
      .createQueryBuilder("ml")
      .leftJoinAndSelect("ml.telegram_user", "tu");

    if (organizationId) {
      qb.andWhere("ml.organization_id = :organizationId", { organizationId });
    }

    if (query.telegramUserId) {
      qb.andWhere("ml.telegram_user_id = :telegramUserId", {
        telegramUserId: query.telegramUserId,
      });
    }

    if (query.messageType) {
      qb.andWhere("ml.message_type = :messageType", {
        messageType: query.messageType,
      });
    }

    if (query.direction) {
      qb.andWhere("ml.direction = :direction", { direction: query.direction });
    }

    if (query.dateFrom) {
      qb.andWhere("ml.created_at >= :dateFrom", {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      qb.andWhere("ml.created_at <= :dateTo", {
        dateTo: new Date(query.dateTo),
      });
    }

    qb.andWhere("ml.deleted_at IS NULL");
    qb.orderBy("ml.created_at", "DESC");
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }
}
