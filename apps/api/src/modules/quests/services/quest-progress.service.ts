/**
 * Quest Progress Service
 * Handles progress tracking, event handlers, reward claiming
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { Quest } from "../entities/quest.entity";
import { UserQuest } from "../entities/user-quest.entity";
import { User } from "../../users/entities/user.entity";
import { LoyaltyService } from "../../loyalty/loyalty.service";
import { PointsSource } from "../../loyalty/constants/loyalty.constants";
import {
  QuestPeriod,
  QuestType,
  QuestStatus,
} from "../constants/quest.constants";
import {
  QuestInfoDto,
  UserQuestProgressDto,
  UserQuestsSummaryDto,
  ClaimResultDto,
  ProgressUpdateResultDto,
  QuestProgressEventDto,
} from "../dto/quest.dto";

@Injectable()
export class QuestProgressService {
  private readonly logger = new Logger(QuestProgressService.name);

  constructor(
    @InjectRepository(Quest)
    private readonly questRepo: Repository<Quest>,
    @InjectRepository(UserQuest)
    private readonly userQuestRepo: Repository<UserQuest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly loyaltyService: LoyaltyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // USER QUESTS
  // ============================================================================

  /**
   * Получить сводку квестов пользователя
   */
  async getUserQuestsSummary(
    userId: string,
    ensureUserHasQuestsFn: (userId: string) => Promise<void>,
  ): Promise<UserQuestsSummaryDto> {
    await ensureUserHasQuestsFn(userId);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const userQuests = await this.userQuestRepo
      .createQueryBuilder("uq")
      .leftJoinAndSelect("uq.quest", "q")
      .where("uq.userId = :userId", { userId })
      .andWhere("uq.status IN (:...statuses)", {
        statuses: [QuestStatus.IN_PROGRESS, QuestStatus.COMPLETED],
      })
      .andWhere("(uq.periodEnd IS NULL OR uq.periodEnd >= :now)", { now })
      .orderBy("q.displayOrder", "ASC")
      .getMany();

    const mapToProgress = (uq: UserQuest): UserQuestProgressDto => ({
      id: uq.id,
      questId: uq.questId,
      quest: this.mapToQuestInfo(uq.quest),
      status: uq.status,
      currentValue: uq.currentValue,
      targetValue: uq.targetValue,
      progressPercent: uq.progressPercent,
      remaining: uq.remaining,
      rewardPoints: uq.rewardPoints,
      startedAt: uq.createdAt,
      completedAt: uq.completedAt,
      claimedAt: uq.claimedAt,
      periodStart: uq.periodStart,
      periodEnd: uq.periodEnd,
      canClaim: uq.canClaim,
    });

    const daily = userQuests
      .filter((uq) => uq.quest.period === QuestPeriod.DAILY)
      .map(mapToProgress);
    const weekly = userQuests
      .filter((uq) => uq.quest.period === QuestPeriod.WEEKLY)
      .map(mapToProgress);
    const monthly = userQuests
      .filter((uq) => uq.quest.period === QuestPeriod.MONTHLY)
      .map(mapToProgress);
    const achievements = userQuests
      .filter((uq) => uq.quest.period === QuestPeriod.ONE_TIME)
      .map(mapToProgress);
    const special = userQuests
      .filter((uq) => uq.quest.period === QuestPeriod.SPECIAL)
      .map(mapToProgress);

    const readyToClaim = userQuests.filter(
      (uq) => uq.status === QuestStatus.COMPLETED,
    ).length;
    const completedToday = userQuests.filter(
      (uq) => uq.completedAt && uq.completedAt >= todayStart,
    ).length;
    const pointsAvailable = userQuests
      .filter((uq) => uq.status === QuestStatus.COMPLETED)
      .reduce((sum, uq) => sum + uq.rewardPoints, 0);

    return {
      totalActive: userQuests.length,
      completedToday,
      readyToClaim,
      pointsAvailable,
      daily,
      weekly,
      monthly,
      achievements,
      special,
    };
  }

  /**
   * Получить конкретный квест пользователя
   */
  async getUserQuest(
    userId: string,
    userQuestId: string,
  ): Promise<UserQuestProgressDto> {
    const uq = await this.userQuestRepo.findOne({
      where: { id: userQuestId, userId },
      relations: ["quest"],
    });

    if (!uq) {
      throw new NotFoundException("Quest not found");
    }

    return {
      id: uq.id,
      questId: uq.questId,
      quest: this.mapToQuestInfo(uq.quest),
      status: uq.status,
      currentValue: uq.currentValue,
      targetValue: uq.targetValue,
      progressPercent: uq.progressPercent,
      remaining: uq.remaining,
      rewardPoints: uq.rewardPoints,
      startedAt: uq.createdAt,
      completedAt: uq.completedAt,
      claimedAt: uq.claimedAt,
      periodStart: uq.periodStart,
      periodEnd: uq.periodEnd,
      canClaim: uq.canClaim,
    };
  }

  /**
   * Claim награду за квест
   */
  async claimReward(
    userId: string,
    userQuestId: string,
  ): Promise<ClaimResultDto> {
    const uq = await this.userQuestRepo.findOne({
      where: { id: userQuestId, userId },
      relations: ["quest"],
    });

    if (!uq) {
      throw new NotFoundException("Quest not found");
    }

    if (uq.status !== QuestStatus.COMPLETED) {
      throw new BadRequestException("Quest is not completed");
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const pointsSource = this.getPointsSourceForPeriod(uq.quest.period);
    const result = await this.loyaltyService.earnPoints({
      userId,
      organizationId: user.organizationId,
      amount: uq.rewardPoints,
      source: pointsSource,
      referenceId: uq.id,
      referenceType: "user_quest",
      description: `Квест: ${uq.quest.title}`,
      descriptionUz: `Vazifa: ${uq.quest.titleUz}`,
    });

    uq.status = QuestStatus.CLAIMED;
    uq.claimedAt = new Date();
    uq.pointsClaimed = uq.rewardPoints;
    await this.userQuestRepo.save(uq);

    this.eventEmitter.emit("quest.claimed", {
      userId,
      questId: uq.questId,
      userQuestId: uq.id,
      points: uq.rewardPoints,
    });

    this.logger.log(
      `User ${userId} claimed ${uq.rewardPoints} points for quest ${uq.quest.title}`,
    );

    return {
      success: true,
      pointsEarned: uq.rewardPoints,
      newBalance: result.newBalance,
      additionalRewards: uq.quest.additionalRewards || [],
      message: `Получено ${uq.rewardPoints} баллов!`,
    };
  }

  /**
   * Claim все готовые награды
   */
  async claimAllRewards(userId: string): Promise<ClaimResultDto> {
    const completedQuests = await this.userQuestRepo.find({
      where: { userId, status: QuestStatus.COMPLETED },
      relations: ["quest"],
    });

    if (completedQuests.length === 0) {
      throw new BadRequestException("No rewards to claim");
    }

    let totalPoints = 0;
    const allRewards: unknown[] = [];

    for (const uq of completedQuests) {
      const result = await this.claimReward(userId, uq.id);
      totalPoints += result.pointsEarned;
      allRewards.push(...result.additionalRewards);
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });

    return {
      success: true,
      pointsEarned: totalPoints,
      newBalance: user?.pointsBalance || 0,
      additionalRewards: allRewards,
      message: `Получено ${totalPoints} баллов за ${completedQuests.length} квестов!`,
    };
  }

  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================

  /**
   * Обработать событие для обновления прогресса квестов
   */
  @OnEvent("order.completed")
  async handleOrderCompleted(payload: Record<string, unknown>): Promise<void> {
    const { userId, amount, productIds, categoryIds } = payload;
    const orderId = payload.orderId as string | undefined;
    const machineId = payload.machineId as string | undefined;

    await this.updateProgress({
      userId: userId as string,
      organizationId: payload.organizationId as string,
      eventType: QuestType.ORDER_COUNT,
      value: 1,
      metadata: { orderId },
    });

    await this.updateProgress({
      userId: userId as string,
      organizationId: payload.organizationId as string,
      eventType: QuestType.ORDER_AMOUNT,
      value: amount as number,
      metadata: { orderId },
    });

    await this.updateProgress({
      userId: userId as string,
      organizationId: payload.organizationId as string,
      eventType: QuestType.ORDER_SINGLE,
      value: amount as number,
      metadata: { orderId },
    });

    const hour = new Date().getUTCHours();
    await this.updateProgress({
      userId: userId as string,
      organizationId: payload.organizationId as string,
      eventType: QuestType.ORDER_TIME,
      value: 1,
      metadata: { orderId, hour },
    });

    if (machineId) {
      await this.updateProgress({
        userId: userId as string,
        organizationId: payload.organizationId as string,
        eventType: QuestType.ORDER_MACHINE,
        value: 1,
        metadata: { orderId, machineId },
      });

      await this.updateProgress({
        userId: userId as string,
        organizationId: payload.organizationId as string,
        eventType: QuestType.VISIT,
        value: 1,
        metadata: { machineId },
      });
    }

    if (
      categoryIds &&
      typeof categoryIds === "object" &&
      Array.isArray(categoryIds) &&
      categoryIds.length > 0
    ) {
      for (const categoryId of categoryIds) {
        await this.updateProgress({
          userId: userId as string,
          organizationId: payload.organizationId as string,
          eventType: QuestType.ORDER_CATEGORY,
          value: 1,
          metadata: { orderId, categoryId: categoryId as string },
        });
      }
    }

    const productsArray = Array.isArray(productIds) ? productIds : [];
    if (productsArray.length > 0) {
      for (const productId of productsArray) {
        await this.updateProgress({
          userId: userId as string,
          organizationId: payload.organizationId as string,
          eventType: QuestType.ORDER_PRODUCT,
          value: 1,
          metadata: { orderId, productId: productId as string },
        });
      }

      await this.updateProgress({
        userId: userId as string,
        organizationId: payload.organizationId as string,
        eventType: QuestType.COLLECTOR,
        value: productsArray.length,
        metadata: { productIds },
      });
    }
  }

  @OnEvent("referral.completed")
  async handleReferralCompleted(
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.updateProgress({
      userId: payload.referrerId as string,
      organizationId: payload.organizationId as string,
      eventType: QuestType.REFERRAL,
      value: 1,
      metadata: { referredUserId: payload.referredUserId as unknown as string },
    });
  }

  @OnEvent("loyalty.level_up")
  async handleLevelUp(payload: Record<string, unknown>): Promise<void> {
    await this.updateProgress({
      userId: payload.userId as string,
      organizationId: payload.organizationId as string,
      eventType: QuestType.LOYAL_CUSTOMER,
      value: 1,
      metadata: { newLevel: payload.newLevel as unknown },
    });
  }

  /**
   * Обновить прогресс квестов
   */
  async updateProgress(
    event: QuestProgressEventDto,
  ): Promise<ProgressUpdateResultDto[]> {
    const { userId, eventType, value, metadata } = event;

    const userQuests = await this.userQuestRepo
      .createQueryBuilder("uq")
      .leftJoinAndSelect("uq.quest", "q")
      .where("uq.userId = :userId", { userId })
      .andWhere("q.type = :eventType", { eventType })
      .andWhere("uq.status = :status", { status: QuestStatus.IN_PROGRESS })
      .andWhere("(uq.periodEnd IS NULL OR uq.periodEnd >= :now)", {
        now: new Date(),
      })
      .getMany();

    const results: ProgressUpdateResultDto[] = [];

    for (const uq of userQuests) {
      const quest = uq.quest;

      if (!this.matchesConditions(quest, metadata)) {
        continue;
      }

      const previousValue = uq.currentValue;
      let incrementValue = value;

      if (eventType === QuestType.COLLECTOR && metadata?.productIds) {
        const existing = uq.progressDetails?.triedProducts || [];
        const newProducts = metadata.productIds.filter(
          (id: string) => !existing.includes(id),
        );
        incrementValue = newProducts.length;

        if (incrementValue > 0) {
          uq.progressDetails = {
            ...uq.progressDetails,
            triedProducts: [...existing, ...newProducts],
          };
        }
      }

      if (eventType === QuestType.VISIT && metadata?.machineId) {
        const existing = uq.progressDetails?.visitedMachines || [];
        if (!existing.includes(metadata.machineId)) {
          uq.progressDetails = {
            ...uq.progressDetails,
            visitedMachines: [...existing, metadata.machineId],
          };
          incrementValue = 1;
        } else {
          incrementValue = 0;
        }
      }

      if (incrementValue === 0) {
        continue;
      }

      uq.currentValue = Math.min(
        uq.currentValue + incrementValue,
        uq.targetValue,
      );

      if (
        uq.currentValue >= uq.targetValue &&
        uq.status !== QuestStatus.COMPLETED
      ) {
        uq.status = QuestStatus.COMPLETED;
        uq.completedAt = new Date();

        await this.questRepo.increment({ id: quest.id }, "totalCompleted", 1);

        this.eventEmitter.emit("quest.completed", {
          userId,
          questId: quest.id,
          userQuestId: uq.id,
          rewardPoints: uq.rewardPoints,
        });

        this.logger.log(`User ${userId} completed quest: ${quest.title}`);
      }

      await this.userQuestRepo.save(uq);

      results.push({
        questId: quest.id,
        previousValue,
        currentValue: uq.currentValue,
        targetValue: uq.targetValue,
        isCompleted: uq.status === QuestStatus.COMPLETED,
        canClaim: uq.status === QuestStatus.COMPLETED,
      });
    }

    return results;
  }

  /**
   * Проверить соответствие условиям квеста
   */
  private matchesConditions(
    quest: Quest,
    metadata: Record<string, unknown> | undefined,
  ): boolean {
    if (!quest.metadata) return true;
    if (!metadata) return true;

    if (quest.metadata.beforeHour !== undefined) {
      if ((metadata.hour as number) >= quest.metadata.beforeHour) return false;
    }

    if (quest.metadata.afterHour !== undefined) {
      if ((metadata.hour as number) < quest.metadata.afterHour) return false;
    }

    if (
      quest.metadata.categoryId &&
      metadata.categoryId !== quest.metadata.categoryId
    ) {
      return false;
    }

    if (
      quest.metadata.productId &&
      metadata.productId !== quest.metadata.productId
    ) {
      return false;
    }

    if (
      quest.metadata.machineId &&
      metadata.machineId !== quest.metadata.machineId
    ) {
      return false;
    }

    if (
      quest.metadata.requiredLevel &&
      metadata.newLevel !== quest.metadata.requiredLevel
    ) {
      return false;
    }

    if (
      quest.metadata.minOrderAmount &&
      (metadata.amount as number) < quest.metadata.minOrderAmount
    ) {
      return false;
    }

    return true;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  mapToQuestInfo(quest: Quest): QuestInfoDto {
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
      additionalRewards: quest.additionalRewards || [],
      icon: quest.icon,
      color: quest.color,
      imageUrl: quest.imageUrl,
      startsAt: quest.startsAt,
      endsAt: quest.endsAt,
      isFeatured: quest.isFeatured,
      completionRate: quest.completionRate,
    };
  }

  getPointsSourceForPeriod(period: QuestPeriod): PointsSource {
    switch (period) {
      case QuestPeriod.DAILY:
        return PointsSource.DAILY_QUEST;
      case QuestPeriod.WEEKLY:
        return PointsSource.WEEKLY_QUEST;
      case QuestPeriod.MONTHLY:
        return PointsSource.MONTHLY_QUEST;
      case QuestPeriod.ONE_TIME:
        return PointsSource.ACHIEVEMENT;
      default:
        return PointsSource.ACHIEVEMENT;
    }
  }
}
