/**
 * Quest Service
 * Business logic for quests/challenges in the loyalty program
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron } from "@nestjs/schedule";

import { Quest, QuestPeriod, QuestType } from "../entities/quest.model";
import { UserQuest, UserQuestStatus } from "../entities/user-quest.model";
import { LoyaltyService } from "../loyalty.service";
import { PointsSource } from "../constants/loyalty.constants";
import {
  LoyaltyCreateQuestDto,
  LoyaltyUpdateQuestDto,
  QuestQueryDto,
  QuestResponseDto,
  QuestsListResponseDto,
  LoyaltyUserQuestProgressDto,
  ClaimRewardResultDto,
  LoyaltyQuestStatsDto,
} from "../dto/quest.dto";

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    @InjectRepository(Quest)
    private readonly questRepo: Repository<Quest>,
    @InjectRepository(UserQuest)
    private readonly userQuestRepo: Repository<UserQuest>,
    private readonly loyaltyService: LoyaltyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // ADMIN: CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new quest (admin)
   */
  async createQuest(
    organizationId: string,
    dto: LoyaltyCreateQuestDto,
  ): Promise<QuestResponseDto> {
    const quest = this.questRepo.create({
      organizationId,
      title: dto.title,
      titleUz: dto.titleUz,
      description: dto.description,
      descriptionUz: dto.descriptionUz,
      period: dto.period,
      type: dto.type,
      difficulty: dto.difficulty,
      targetValue: dto.targetValue,
      rewardPoints: dto.rewardPoints,
      additionalRewards: dto.additionalRewards,
      metadata: dto.metadata,
      requirements: dto.requirements,
      icon: dto.icon || "🎯",
      color: dto.color || "#4CAF50",
      imageUrl: dto.imageUrl,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      isActive: dto.isActive ?? true,
      isFeatured: dto.isFeatured ?? false,
      displayOrder: dto.displayOrder ?? 0,
    });

    const saved = await this.questRepo.save(quest);
    this.logger.log(`Quest created: ${saved.id} - ${saved.title}`);

    this.eventEmitter.emit("quest.created", {
      questId: saved.id,
      organizationId,
      title: saved.title,
    });

    return this.mapToQuestResponse(saved);
  }

  /**
   * Update an existing quest (admin)
   */
  async updateQuest(
    questId: string,
    organizationId: string,
    dto: LoyaltyUpdateQuestDto,
  ): Promise<QuestResponseDto> {
    const quest = await this.questRepo.findOne({
      where: { id: questId, organizationId },
    });

    if (!quest) {
      throw new NotFoundException("Quest not found");
    }

    // Apply updates
    if (dto.title !== undefined) quest.title = dto.title;
    if (dto.titleUz !== undefined) quest.titleUz = dto.titleUz;
    if (dto.description !== undefined) quest.description = dto.description;
    if (dto.descriptionUz !== undefined)
      quest.descriptionUz = dto.descriptionUz;
    if (dto.period !== undefined) quest.period = dto.period;
    if (dto.type !== undefined) quest.type = dto.type;
    if (dto.difficulty !== undefined) quest.difficulty = dto.difficulty;
    if (dto.targetValue !== undefined) quest.targetValue = dto.targetValue;
    if (dto.rewardPoints !== undefined) quest.rewardPoints = dto.rewardPoints;
    if (dto.additionalRewards !== undefined)
      quest.additionalRewards = dto.additionalRewards;
    if (dto.metadata !== undefined) quest.metadata = dto.metadata;
    if (dto.requirements !== undefined) quest.requirements = dto.requirements;
    if (dto.icon !== undefined) quest.icon = dto.icon;
    if (dto.color !== undefined) quest.color = dto.color;
    if (dto.imageUrl !== undefined) quest.imageUrl = dto.imageUrl;
    if (dto.startsAt !== undefined)
      quest.startsAt = dto.startsAt
        ? new Date(dto.startsAt)
        : (null as unknown as Date);
    if (dto.endsAt !== undefined)
      quest.endsAt = dto.endsAt
        ? new Date(dto.endsAt)
        : (null as unknown as Date);
    if (dto.isActive !== undefined) quest.isActive = dto.isActive;
    if (dto.isFeatured !== undefined) quest.isFeatured = dto.isFeatured;
    if (dto.displayOrder !== undefined) quest.displayOrder = dto.displayOrder;

    const saved = await this.questRepo.save(quest);
    this.logger.log(`Quest updated: ${saved.id}`);

    return this.mapToQuestResponse(saved);
  }

  /**
   * Soft delete a quest (admin)
   */
  async deleteQuest(questId: string, organizationId: string): Promise<void> {
    const quest = await this.questRepo.findOne({
      where: { id: questId, organizationId },
    });

    if (!quest) {
      throw new NotFoundException("Quest not found");
    }

    await this.questRepo.softDelete(questId);
    this.logger.log(`Quest soft-deleted: ${questId}`);
  }

  // ============================================================================
  // ADMIN: LISTING & STATS
  // ============================================================================

  /**
   * Get all quests for admin management (filtered by org)
   */
  async getQuests(
    organizationId: string,
    query: QuestQueryDto,
  ): Promise<QuestsListResponseDto> {
    const { period, type, isActive, page = 1, limit = 50 } = query;

    const qb = this.questRepo
      .createQueryBuilder("q")
      .where("q.organizationId = :organizationId", { organizationId })
      .orderBy("q.displayOrder", "ASC")
      .addOrderBy("q.createdAt", "DESC");

    if (period) {
      qb.andWhere("q.period = :period", { period });
    }

    if (type) {
      qb.andWhere("q.type = :type", { type });
    }

    if (isActive !== undefined) {
      qb.andWhere("q.isActive = :isActive", { isActive });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: items.map((q) => this.mapToQuestResponse(q)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get quest stats for admin dashboard
   */
  async getQuestStats(organizationId: string): Promise<LoyaltyQuestStatsDto> {
    const [totalQuests, activeQuests] = await Promise.all([
      this.questRepo.count({ where: { organizationId } }),
      this.questRepo.count({ where: { organizationId, isActive: true } }),
    ]);

    // Completions
    const completionStats = await this.userQuestRepo
      .createQueryBuilder("uq")
      .innerJoin("uq.quest", "q")
      .select("COUNT(*)", "total")
      .addSelect(
        "SUM(CASE WHEN uq.status IN ('completed', 'claimed') THEN 1 ELSE 0 END)",
        "completed",
      )
      .addSelect(
        "SUM(CASE WHEN uq.status = 'claimed' THEN uq.pointsClaimed ELSE 0 END)",
        "pointsRewarded",
      )
      .where("q.organizationId = :organizationId", { organizationId })
      .getRawOne();

    const totalStarted = parseInt(completionStats?.total) || 0;
    const totalCompleted = parseInt(completionStats?.completed) || 0;
    const totalPointsRewarded = parseInt(completionStats?.pointsRewarded) || 0;

    // By period
    const byPeriodRaw = await this.questRepo
      .createQueryBuilder("q")
      .select("q.period", "period")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(q.totalCompleted)", "completions")
      .where("q.organizationId = :organizationId", { organizationId })
      .groupBy("q.period")
      .getRawMany();

    const byPeriod = byPeriodRaw.map((r) => ({
      period: r.period as string,
      count: parseInt(r.count) || 0,
      completions: parseInt(r.completions) || 0,
    }));

    return {
      totalQuests,
      activeQuests,
      totalCompleted,
      totalPointsRewarded,
      completionRate:
        totalStarted > 0
          ? Math.round((totalCompleted / totalStarted) * 10000) / 100
          : 0,
      byPeriod,
    };
  }

  // ============================================================================
  // USER: QUEST DISCOVERY & PROGRESS
  // ============================================================================

  /**
   * Get active quests available for a user
   */
  async getActiveQuests(organizationId: string): Promise<QuestResponseDto[]> {
    const now = new Date();

    const quests = await this.questRepo
      .createQueryBuilder("q")
      .where("q.organizationId = :organizationId", { organizationId })
      .andWhere("q.isActive = :isActive", { isActive: true })
      .andWhere("(q.startsAt IS NULL OR q.startsAt <= :now)", { now })
      .andWhere("(q.endsAt IS NULL OR q.endsAt >= :now)", { now })
      .orderBy("q.isFeatured", "DESC")
      .addOrderBy("q.displayOrder", "ASC")
      .addOrderBy("q.createdAt", "DESC")
      .getMany();

    return quests.map((q) => this.mapToQuestResponse(q));
  }

  /**
   * Get user's quest progress (my quests)
   */
  async getUserQuests(
    userId: string,
    organizationId: string,
  ): Promise<LoyaltyUserQuestProgressDto[]> {
    // Ensure user has quest entries for active quests
    await this.ensureUserQuests(userId, organizationId);

    const userQuests = await this.userQuestRepo
      .createQueryBuilder("uq")
      .innerJoinAndSelect("uq.quest", "q")
      .where("uq.userId = :userId", { userId })
      .andWhere("q.organizationId = :organizationId", { organizationId })
      .andWhere("q.isActive = :isActive", { isActive: true })
      .andWhere("uq.status NOT IN (:...excludeStatuses)", {
        excludeStatuses: [UserQuestStatus.EXPIRED],
      })
      .orderBy("uq.status", "ASC") // in_progress first, then completed, then claimed
      .addOrderBy("q.isFeatured", "DESC")
      .addOrderBy("q.displayOrder", "ASC")
      .getMany();

    return userQuests.map((uq) => this.mapToUserQuestProgress(uq));
  }

  /**
   * Claim reward for a completed quest
   */
  async claimReward(
    userId: string,
    questId: string,
    organizationId: string,
  ): Promise<ClaimRewardResultDto> {
    // Find the user quest
    const userQuest = await this.userQuestRepo
      .createQueryBuilder("uq")
      .innerJoinAndSelect("uq.quest", "q")
      .where("uq.questId = :questId", { questId })
      .andWhere("uq.userId = :userId", { userId })
      .andWhere("q.organizationId = :organizationId", { organizationId })
      .andWhere("uq.status = :status", { status: UserQuestStatus.COMPLETED })
      .getOne();

    if (!userQuest) {
      throw new BadRequestException(
        "Quest not found, not completed, or already claimed",
      );
    }

    // Determine the points source based on quest period
    const sourceMap: Record<string, PointsSource> = {
      [QuestPeriod.DAILY]: PointsSource.DAILY_QUEST,
      [QuestPeriod.WEEKLY]: PointsSource.WEEKLY_QUEST,
      [QuestPeriod.MONTHLY]: PointsSource.MONTHLY_QUEST,
    };
    const source =
      sourceMap[userQuest.quest.period] || PointsSource.ACHIEVEMENT;

    // Earn points via LoyaltyService
    const earnResult = await this.loyaltyService.earnPoints({
      userId,
      organizationId,
      amount: userQuest.rewardPoints,
      source,
      referenceId: userQuest.id,
      referenceType: "quest",
      description: `Квест: ${userQuest.quest.title}`,
      descriptionUz: userQuest.quest.titleUz
        ? `Vazifa: ${userQuest.quest.titleUz}`
        : undefined,
    });

    // Update user quest status
    userQuest.status = UserQuestStatus.CLAIMED;
    userQuest.claimedAt = new Date();
    userQuest.pointsClaimed = userQuest.rewardPoints;
    await this.userQuestRepo.save(userQuest);

    // Update quest completion stats
    await this.questRepo.increment(
      { id: userQuest.questId },
      "totalCompleted",
      1,
    );

    this.eventEmitter.emit("quest.claimed", {
      userId,
      questId: userQuest.questId,
      pointsEarned: userQuest.rewardPoints,
    });

    this.logger.log(
      `User ${userId} claimed quest ${userQuest.questId} for ${userQuest.rewardPoints} points`,
    );

    return {
      success: true,
      pointsEarned: userQuest.rewardPoints,
      newBalance: earnResult.newBalance,
      message: `Получено ${userQuest.rewardPoints} баллов за квест "${userQuest.quest.title}"`,
    };
  }

  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================

  /**
   * Update quest progress based on events (called from event handlers)
   */
  async updateProgress(
    userId: string,
    organizationId: string,
    eventType: string,
    eventData: Record<string, unknown> = {},
  ): Promise<void> {
    // Map event types to quest types
    const questTypeMap: Record<string, QuestType[]> = {
      "order.completed": [
        QuestType.ORDER_COUNT,
        QuestType.ORDER_AMOUNT,
        QuestType.ORDER_SINGLE,
        QuestType.ORDER_PRODUCT,
        QuestType.ORDER_CATEGORY,
        QuestType.ORDER_MACHINE,
        QuestType.ORDER_TIME,
        QuestType.FIRST_ORDER,
        QuestType.PAYMENT_TYPE,
      ],
      "referral.created": [QuestType.REFERRAL],
      "review.created": [QuestType.REVIEW],
      "share.completed": [QuestType.SHARE],
      "visit.completed": [QuestType.VISIT],
      "login.streak": [QuestType.LOGIN_STREAK],
      "profile.completed": [QuestType.PROFILE_COMPLETE],
      "points.spent": [QuestType.SPEND_POINTS],
    };

    const relevantTypes = questTypeMap[eventType];
    if (!relevantTypes || relevantTypes.length === 0) {
      return;
    }

    // Find active user quests matching the event
    const userQuests = await this.userQuestRepo
      .createQueryBuilder("uq")
      .innerJoinAndSelect("uq.quest", "q")
      .where("uq.userId = :userId", { userId })
      .andWhere("q.organizationId = :organizationId", { organizationId })
      .andWhere("q.type IN (:...types)", { types: relevantTypes })
      .andWhere("q.isActive = :isActive", { isActive: true })
      .andWhere("uq.status = :status", { status: UserQuestStatus.IN_PROGRESS })
      .getMany();

    for (const uq of userQuests) {
      const increment = this.calculateIncrement(uq.quest.type, eventData);
      if (increment <= 0) continue;

      uq.currentValue = Math.min(uq.currentValue + increment, uq.targetValue);

      // Check if quest is now completed
      if (uq.currentValue >= uq.targetValue) {
        uq.status = UserQuestStatus.COMPLETED;
        uq.completedAt = new Date();

        this.eventEmitter.emit("quest.completed", {
          userId,
          questId: uq.questId,
          questTitle: uq.quest.title,
          rewardPoints: uq.rewardPoints,
        });

        this.logger.log(
          `User ${userId} completed quest ${uq.questId}: ${uq.quest.title}`,
        );
      }

      await this.userQuestRepo.save(uq);
    }
  }

  // ============================================================================
  // CRON: EXPIRE OVERDUE QUESTS
  // ============================================================================

  /**
   * Expire overdue quests daily at 02:00 Asia/Tashkent
   */
  @Cron("0 2 * * *", { timeZone: "Asia/Tashkent" })
  async expireOverdueQuests(): Promise<void> {
    this.logger.log("Running quest expiry job");

    const now = new Date();

    // Find in_progress user quests whose period has ended
    const expiredQuests = await this.userQuestRepo
      .createQueryBuilder("uq")
      .where("uq.status = :status", { status: UserQuestStatus.IN_PROGRESS })
      .andWhere("uq.periodEnd IS NOT NULL")
      .andWhere("uq.periodEnd < :now", { now })
      .getMany();

    for (const uq of expiredQuests) {
      uq.status = UserQuestStatus.EXPIRED;
      uq.expiredAt = now;
    }

    if (expiredQuests.length > 0) {
      await this.userQuestRepo.save(expiredQuests);
    }

    // Also deactivate quests past their endsAt date
    const endedQuests = await this.questRepo
      .createQueryBuilder("q")
      .where("q.isActive = :isActive", { isActive: true })
      .andWhere("q.endsAt IS NOT NULL")
      .andWhere("q.endsAt < :now", { now })
      .getMany();

    for (const q of endedQuests) {
      q.isActive = false;
    }

    if (endedQuests.length > 0) {
      await this.questRepo.save(endedQuests);
    }

    this.logger.log(
      `Quest expiry job completed: ${expiredQuests.length} user quests expired, ${endedQuests.length} quests deactivated`,
    );
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Ensure user has user_quest entries for all active quests
   */
  private async ensureUserQuests(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const now = new Date();

    // Get all active quests the user doesn't have an entry for
    const activeQuests = await this.questRepo
      .createQueryBuilder("q")
      .where("q.organizationId = :organizationId", { organizationId })
      .andWhere("q.isActive = :isActive", { isActive: true })
      .andWhere("(q.startsAt IS NULL OR q.startsAt <= :now)", { now })
      .andWhere("(q.endsAt IS NULL OR q.endsAt >= :now)", { now })
      .getMany();

    if (activeQuests.length === 0) return;

    // Find quests user already has entries for
    const existingQuestIds = await this.userQuestRepo
      .createQueryBuilder("uq")
      .select("uq.questId")
      .where("uq.userId = :userId", { userId })
      .andWhere("uq.questId IN (:...questIds)", {
        questIds: activeQuests.map((q) => q.id),
      })
      .andWhere("uq.status NOT IN (:...doneStatuses)", {
        doneStatuses: [UserQuestStatus.EXPIRED],
      })
      .getRawMany()
      .then((rows) => rows.map((r) => r.uq_questId || r.questId));

    const existingSet = new Set(existingQuestIds);
    const newQuests = activeQuests.filter((q) => !existingSet.has(q.id));

    if (newQuests.length === 0) return;

    // Create user quest entries
    const periodDates = this.calculatePeriodDates(now);

    const userQuests = newQuests.map((quest) => {
      const dates = periodDates[quest.period] || { start: null, end: null };
      const uq = this.userQuestRepo.create({
        userId,
        questId: quest.id,
        status: UserQuestStatus.IN_PROGRESS,
        currentValue: 0,
        targetValue: quest.targetValue,
        rewardPoints: quest.rewardPoints,
        startedAt: now,
      });
      if (dates.start) uq.periodStart = dates.start;
      if (dates.end) uq.periodEnd = dates.end;
      return uq;
    });

    await this.userQuestRepo.save(userQuests);

    // Update quest started counts
    for (const quest of newQuests) {
      await this.questRepo.increment({ id: quest.id }, "totalStarted", 1);
    }
  }

  /**
   * Calculate period start/end dates based on quest period
   */
  private calculatePeriodDates(
    now: Date,
  ): Record<string, { start: Date | null; end: Date | null }> {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Weekly: Monday to Sunday
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Monthly: 1st to last day
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    return {
      [QuestPeriod.DAILY]: { start: today, end: endOfDay },
      [QuestPeriod.WEEKLY]: { start: weekStart, end: weekEnd },
      [QuestPeriod.MONTHLY]: { start: monthStart, end: monthEnd },
      [QuestPeriod.ONE_TIME]: { start: null, end: null },
      [QuestPeriod.SPECIAL]: { start: null, end: null },
    };
  }

  /**
   * Calculate progress increment based on event type and data
   */
  private calculateIncrement(
    questType: QuestType,
    eventData: Record<string, unknown>,
  ): number {
    switch (questType) {
      case QuestType.ORDER_COUNT:
      case QuestType.FIRST_ORDER:
      case QuestType.REFERRAL:
      case QuestType.REVIEW:
      case QuestType.SHARE:
      case QuestType.VISIT:
      case QuestType.PROFILE_COMPLETE:
      case QuestType.PAYMENT_TYPE:
      case QuestType.ORDER_MACHINE:
      case QuestType.ORDER_CATEGORY:
      case QuestType.ORDER_PRODUCT:
      case QuestType.COLLECTOR:
        return 1;

      case QuestType.ORDER_AMOUNT:
      case QuestType.SPEND_POINTS:
        return typeof eventData.amount === "number" ? eventData.amount : 0;

      case QuestType.ORDER_SINGLE:
        return typeof eventData.orderAmount === "number"
          ? eventData.orderAmount
          : 0;

      case QuestType.ORDER_TIME:
        return 1;

      case QuestType.LOGIN_STREAK:
        return typeof eventData.streak === "number" ? eventData.streak : 1;

      case QuestType.LOYAL_CUSTOMER:
        return 1;

      default:
        return 1;
    }
  }

  /**
   * Map Quest entity to response DTO
   */
  private mapToQuestResponse(quest: Quest): QuestResponseDto {
    return {
      id: quest.id,
      title: quest.title,
      titleUz: quest.titleUz,
      description: quest.description,
      descriptionUz: quest.descriptionUz,
      period: quest.period,
      type: quest.type,
      difficulty: quest.difficulty,
      targetValue: quest.targetValue,
      rewardPoints: quest.rewardPoints,
      additionalRewards: quest.additionalRewards,
      icon: quest.icon,
      color: quest.color,
      imageUrl: quest.imageUrl,
      startsAt: quest.startsAt,
      endsAt: quest.endsAt,
      isActive: quest.isActive,
      isFeatured: quest.isFeatured,
      displayOrder: quest.displayOrder,
      totalStarted: quest.totalStarted,
      totalCompleted: quest.totalCompleted,
      createdAt: quest.createdAt,
    };
  }

  /**
   * Map UserQuest entity to progress DTO
   */
  private mapToUserQuestProgress(uq: UserQuest): LoyaltyUserQuestProgressDto {
    const progressPercent =
      uq.targetValue > 0
        ? Math.min(100, Math.floor((uq.currentValue / uq.targetValue) * 100))
        : 0;

    return {
      id: uq.id,
      questId: uq.questId,
      title: uq.quest?.title || "",
      titleUz: uq.quest?.titleUz || "",
      description: uq.quest?.description || "",
      descriptionUz: uq.quest?.descriptionUz || "",
      icon: uq.quest?.icon || "🎯",
      color: uq.quest?.color || "#4CAF50",
      period: uq.quest?.period,
      type: uq.quest?.type,
      difficulty: uq.quest?.difficulty,
      currentValue: uq.currentValue,
      targetValue: uq.targetValue,
      progressPercent,
      rewardPoints: uq.rewardPoints,
      status: uq.status,
      periodStart: uq.periodStart,
      periodEnd: uq.periodEnd,
      completedAt: uq.completedAt,
      claimedAt: uq.claimedAt,
    };
  }
}
