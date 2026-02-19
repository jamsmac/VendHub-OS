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
      where: { telegramId },
    });

    if (telegramUser) {
      // Update existing user with latest info
      telegramUser.chatId = chatId;
      telegramUser.username = username ?? telegramUser.username;
      telegramUser.firstName = firstName ?? telegramUser.firstName;
      telegramUser.lastName = lastName ?? telegramUser.lastName;
      telegramUser.lastInteractionAt = new Date();
      if (organizationId) {
        telegramUser.organizationId = organizationId;
      }
      return this.telegramUserRepo.save(telegramUser);
    }

    // Create new user
    telegramUser = this.telegramUserRepo.create({
      telegramId,
      chatId,
      username,
      firstName,
      lastName,
      botType,
      organizationId: organizationId || null,
      language: TelegramLanguage.RU,
      status: TelegramUserStatus.ACTIVE,
      isVerified: false,
      lastInteractionAt: new Date(),
      notificationPreferences: { tasks: true, machines: true, alerts: true },
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
      telegramUserId: data.telegramUserId,
      chatId: data.chatId,
      direction: data.direction,
      messageType: data.messageType,
      command: data.command || null,
      messageText: data.messageText
        ? data.messageText.substring(0, 1000)
        : null,
      telegramMessageId: data.telegramMessageId || null,
      status: data.status,
      responseTimeMs: data.responseTimeMs || null,
      organizationId: data.organizationId || null,
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
      telegramUserId: data.telegramUserId || null,
      userId: data.userId || null,
      botType: data.botType,
      eventType: data.eventType,
      actionName: data.actionName,
      actionCategory: data.actionCategory || null,
      responseTimeMs: data.responseTimeMs || null,
      success: data.success,
      errorMessage: data.errorMessage || null,
      organizationId: data.organizationId || null,
      sessionId: data.sessionId || null,
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
      where: { telegramId },
    });

    if (!telegramUser) {
      return { success: false, message: "Telegram user not found" };
    }

    if (telegramUser.isVerified) {
      return { success: false, message: "User is already verified" };
    }

    if (!telegramUser.verificationCode) {
      return { success: false, message: "No verification code set" };
    }

    if (
      telegramUser.verificationExpiresAt &&
      new Date() > telegramUser.verificationExpiresAt
    ) {
      return { success: false, message: "Verification code has expired" };
    }

    if (telegramUser.verificationCode !== verificationCode) {
      return { success: false, message: "Invalid verification code" };
    }

    // Mark as verified
    telegramUser.isVerified = true;
    telegramUser.verificationCode = null;
    telegramUser.verificationExpiresAt = null;
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

    telegramUser.notificationPreferences = {
      ...(telegramUser.notificationPreferences || {}),
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
      qb.andWhere("tu.organizationId = :organizationId", { organizationId });
    }

    if (query.status) {
      qb.andWhere("tu.status = :status", { status: query.status });
    }

    if (query.botType) {
      qb.andWhere("tu.botType = :botType", { botType: query.botType });
    }

    if (query.isVerified !== undefined) {
      const isVerified = query.isVerified === "true";
      qb.andWhere("tu.isVerified = :isVerified", { isVerified });
    }

    if (query.search) {
      qb.andWhere(
        "(tu.username ILIKE :search OR tu.firstName ILIKE :search OR tu.lastName ILIKE :search OR tu.phone ILIKE :search)",
        { search: `%${query.search}%` },
      );
    }

    qb.andWhere("tu.deletedAt IS NULL");
    qb.orderBy("tu.lastInteractionAt", "DESC", "NULLS LAST");
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
      where: { telegramUserId: id },
    });

    const totalCommands = await this.messageLogRepo.count({
      where: {
        telegramUserId: id,
        messageType: TelegramMessageType.COMMAND,
      },
    });

    const lastMessage = await this.messageLogRepo.findOne({
      where: { telegramUserId: id },
      order: { createdAt: "DESC" },
    });

    return {
      user,
      stats: {
        totalMessages,
        totalCommands,
        lastMessageAt: lastMessage?.createdAt || null,
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
      .where("tu.deletedAt IS NULL");
    if (organizationId) {
      userQb.andWhere("tu.organizationId = :organizationId", {
        organizationId,
      });
    }
    const totalUsers = await userQb.getCount();

    // Active users (interacted in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUserQb = this.telegramUserRepo
      .createQueryBuilder("tu")
      .where("tu.deletedAt IS NULL")
      .andWhere("tu.lastInteractionAt > :sevenDaysAgo", { sevenDaysAgo });
    if (organizationId) {
      activeUserQb.andWhere("tu.organizationId = :organizationId", {
        organizationId,
      });
    }
    const activeUsers = await activeUserQb.getCount();

    // Analytics events
    const eventQb = this.analyticsRepo
      .createQueryBuilder("a")
      .where("a.deletedAt IS NULL");
    if (organizationId) {
      eventQb.andWhere("a.organizationId = :organizationId", {
        organizationId,
      });
    }
    if (dateFrom) {
      eventQb.andWhere("a.createdAt >= :dateFrom", {
        dateFrom: new Date(dateFrom),
      });
    }
    if (dateTo) {
      eventQb.andWhere("a.createdAt <= :dateTo", { dateTo: new Date(dateTo) });
    }

    const totalEvents = await eventQb.getCount();

    // Events by type
    const eventsByTypeRaw = await this.analyticsRepo
      .createQueryBuilder("a")
      .select("a.eventType", "event_type")
      .addSelect("COUNT(*)", "count")
      .where("a.deletedAt IS NULL")
      .andWhere(organizationId ? "a.organizationId = :organizationId" : "1=1", {
        organizationId,
      })
      .andWhere(dateFrom ? "a.createdAt >= :dateFrom" : "1=1", {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      })
      .andWhere(dateTo ? "a.createdAt <= :dateTo" : "1=1", {
        dateTo: dateTo ? new Date(dateTo) : undefined,
      })
      .groupBy("a.eventType")
      .getRawMany();

    const eventsByType: Record<string, number> = {};
    eventsByTypeRaw.forEach((row) => {
      eventsByType[row.event_type] = parseInt(row.count, 10);
    });

    // Events by bot type
    const eventsByBotTypeRaw = await this.analyticsRepo
      .createQueryBuilder("a")
      .select("a.botType", "bot_type")
      .addSelect("COUNT(*)", "count")
      .where("a.deletedAt IS NULL")
      .andWhere(organizationId ? "a.organizationId = :organizationId" : "1=1", {
        organizationId,
      })
      .andWhere(dateFrom ? "a.createdAt >= :dateFrom" : "1=1", {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      })
      .andWhere(dateTo ? "a.createdAt <= :dateTo" : "1=1", {
        dateTo: dateTo ? new Date(dateTo) : undefined,
      })
      .groupBy("a.botType")
      .getRawMany();

    const eventsByBotType: Record<string, number> = {};
    eventsByBotTypeRaw.forEach((row) => {
      eventsByBotType[row.bot_type] = parseInt(row.count, 10);
    });

    // Average response time
    const avgResponseRaw = await this.analyticsRepo
      .createQueryBuilder("a")
      .select("AVG(a.responseTimeMs)", "avg_response")
      .where("a.deletedAt IS NULL")
      .andWhere("a.responseTimeMs IS NOT NULL")
      .andWhere(organizationId ? "a.organizationId = :organizationId" : "1=1", {
        organizationId,
      })
      .andWhere(dateFrom ? "a.createdAt >= :dateFrom" : "1=1", {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      })
      .andWhere(dateTo ? "a.createdAt <= :dateTo" : "1=1", {
        dateTo: dateTo ? new Date(dateTo) : undefined,
      })
      .getRawOne();

    const averageResponseTime = avgResponseRaw?.avg_response
      ? Math.round(parseFloat(avgResponseRaw.avg_response))
      : null;

    // Success rate
    const successCount = await this.analyticsRepo
      .createQueryBuilder("a")
      .where("a.deletedAt IS NULL")
      .andWhere("a.success = true")
      .andWhere(organizationId ? "a.organizationId = :organizationId" : "1=1", {
        organizationId,
      })
      .andWhere(dateFrom ? "a.createdAt >= :dateFrom" : "1=1", {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      })
      .andWhere(dateTo ? "a.createdAt <= :dateTo" : "1=1", {
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
      .leftJoinAndSelect("ml.telegramUser", "tu");

    if (organizationId) {
      qb.andWhere("ml.organizationId = :organizationId", { organizationId });
    }

    if (query.telegramUserId) {
      qb.andWhere("ml.telegramUserId = :telegramUserId", {
        telegramUserId: query.telegramUserId,
      });
    }

    if (query.messageType) {
      qb.andWhere("ml.messageType = :messageType", {
        messageType: query.messageType,
      });
    }

    if (query.direction) {
      qb.andWhere("ml.direction = :direction", { direction: query.direction });
    }

    if (query.dateFrom) {
      qb.andWhere("ml.createdAt >= :dateFrom", {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      qb.andWhere("ml.createdAt <= :dateTo", {
        dateTo: new Date(query.dateTo),
      });
    }

    qb.andWhere("ml.deletedAt IS NULL");
    qb.orderBy("ml.createdAt", "DESC");
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }
}
