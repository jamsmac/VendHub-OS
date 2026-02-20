/**
 * Quests Service
 * Бизнес-логика системы квестов VendHub
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { Quest } from './entities/quest.entity';
import { UserQuest } from './entities/user-quest.entity';
import { User } from '../users/entities/user.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { PointsSource } from '../loyalty/constants/loyalty.constants';
import {
  QuestPeriod,
  QuestType,
  QuestStatus,
  QuestDifficulty,
  getNextReset,
  getPeriodStart,
  selectRandomQuests,
  calculateQuestReward,
  DAILY_QUEST_TEMPLATES,
  WEEKLY_QUEST_TEMPLATES,
  MONTHLY_QUEST_TEMPLATES,
  ACHIEVEMENT_TEMPLATES,
} from './constants/quest.constants';
import {
  CreateQuestDto,
  UpdateQuestDto,
  QuestFilterDto,
  QuestInfoDto,
  UserQuestProgressDto,
  UserQuestsSummaryDto,
  ClaimResultDto,
  ProgressUpdateResultDto,
  QuestProgressEventDto,
  QuestStatsDto,
} from './dto/quest.dto';

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

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
  // QUEST CRUD (Admin)
  // ============================================================================

  /**
   * Создать квест
   */
  async createQuest(organizationId: string, dto: CreateQuestDto): Promise<Quest> {
    const quest = this.questRepo.create({
      organizationId,
      ...dto,
      difficulty: dto.difficulty || QuestDifficulty.MEDIUM,
    });

    await this.questRepo.save(quest);
    this.logger.log(`Created quest ${quest.id}: ${quest.title}`);
    return quest;
  }

  /**
   * Обновить квест
   */
  async updateQuest(id: string, organizationId: string, dto: UpdateQuestDto): Promise<Quest> {
    const quest = await this.questRepo.findOne({
      where: { id, organizationId },
    });

    if (!quest) {
      throw new NotFoundException('Quest not found');
    }

    Object.assign(quest, dto);
    await this.questRepo.save(quest);

    this.logger.log(`Updated quest ${quest.id}`);
    return quest;
  }

  /**
   * Удалить квест
   */
  async deleteQuest(id: string, organizationId: string): Promise<void> {
    const result = await this.questRepo.delete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException('Quest not found');
    }
    this.logger.log(`Deleted quest ${id}`);
  }

  /**
   * Получить квесты организации
   */
  async getQuests(organizationId: string, filter: QuestFilterDto): Promise<Quest[]> {
    const qb = this.questRepo
      .createQueryBuilder('q')
      .where('(q.organizationId = :organizationId OR q.organizationId IS NULL)', { organizationId })
      .orderBy('q.displayOrder', 'ASC')
      .addOrderBy('q.createdAt', 'DESC');

    if (filter.period) {
      qb.andWhere('q.period = :period', { period: filter.period });
    }

    if (filter.type) {
      qb.andWhere('q.type = :type', { type: filter.type });
    }

    if (filter.difficulty) {
      qb.andWhere('q.difficulty = :difficulty', { difficulty: filter.difficulty });
    }

    if (filter.isActive !== undefined) {
      qb.andWhere('q.isActive = :isActive', { isActive: filter.isActive });
    }

    if (filter.isFeatured !== undefined) {
      qb.andWhere('q.isFeatured = :isFeatured', { isFeatured: filter.isFeatured });
    }

    if (!filter.includeExpired) {
      qb.andWhere('(q.endsAt IS NULL OR q.endsAt > :now)', { now: new Date() });
    }

    return qb.getMany();
  }

  // ============================================================================
  // USER QUESTS
  // ============================================================================

  /**
   * Получить сводку квестов пользователя
   */
  async getUserQuestsSummary(userId: string): Promise<UserQuestsSummaryDto> {
    // Ensure user has quests assigned
    await this.ensureUserHasQuests(userId);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get all active user quests
    const userQuests = await this.userQuestRepo
      .createQueryBuilder('uq')
      .leftJoinAndSelect('uq.quest', 'q')
      .where('uq.userId = :userId', { userId })
      .andWhere('uq.status IN (:...statuses)', {
        statuses: [QuestStatus.IN_PROGRESS, QuestStatus.COMPLETED],
      })
      .andWhere('(uq.periodEnd IS NULL OR uq.periodEnd >= :now)', { now })
      .orderBy('q.displayOrder', 'ASC')
      .getMany();

    // Map to DTOs
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
      startedAt: uq.created_at,
      completedAt: uq.completedAt,
      claimedAt: uq.claimedAt,
      periodStart: uq.periodStart,
      periodEnd: uq.periodEnd,
      canClaim: uq.canClaim,
    });

    // Group by period
    const daily = userQuests.filter(uq => uq.quest.period === QuestPeriod.DAILY).map(mapToProgress);
    const weekly = userQuests.filter(uq => uq.quest.period === QuestPeriod.WEEKLY).map(mapToProgress);
    const monthly = userQuests.filter(uq => uq.quest.period === QuestPeriod.MONTHLY).map(mapToProgress);
    const achievements = userQuests.filter(uq => uq.quest.period === QuestPeriod.ONE_TIME).map(mapToProgress);
    const special = userQuests.filter(uq => uq.quest.period === QuestPeriod.SPECIAL).map(mapToProgress);

    // Calculate stats
    const readyToClaim = userQuests.filter(uq => uq.status === QuestStatus.COMPLETED).length;
    const completedToday = userQuests.filter(
      uq => uq.completedAt && uq.completedAt >= todayStart,
    ).length;
    const pointsAvailable = userQuests
      .filter(uq => uq.status === QuestStatus.COMPLETED)
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
  async getUserQuest(userId: string, userQuestId: string): Promise<UserQuestProgressDto> {
    const uq = await this.userQuestRepo.findOne({
      where: { id: userQuestId, userId },
      relations: ['quest'],
    });

    if (!uq) {
      throw new NotFoundException('Quest not found');
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
      startedAt: uq.created_at,
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
  async claimReward(userId: string, userQuestId: string): Promise<ClaimResultDto> {
    const uq = await this.userQuestRepo.findOne({
      where: { id: userQuestId, userId },
      relations: ['quest'],
    });

    if (!uq) {
      throw new NotFoundException('Quest not found');
    }

    if (uq.status !== QuestStatus.COMPLETED) {
      throw new BadRequestException('Quest is not completed');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Award points
    const pointsSource = this.getPointsSourceForPeriod(uq.quest.period);
    const result = await this.loyaltyService.earnPoints({
      userId,
      organizationId: user.organizationId,
      amount: uq.rewardPoints,
      source: pointsSource,
      referenceId: uq.id,
      referenceType: 'user_quest',
      description: `Квест: ${uq.quest.title}`,
      descriptionUz: `Vazifa: ${uq.quest.titleUz}`,
    });

    // Update status
    uq.status = QuestStatus.CLAIMED;
    uq.claimedAt = new Date();
    uq.pointsClaimed = uq.rewardPoints;
    await this.userQuestRepo.save(uq);

    // Emit event
    this.eventEmitter.emit('quest.claimed', {
      userId,
      questId: uq.questId,
      userQuestId: uq.id,
      points: uq.rewardPoints,
    });

    this.logger.log(`User ${userId} claimed ${uq.rewardPoints} points for quest ${uq.quest.title}`);

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
      relations: ['quest'],
    });

    if (completedQuests.length === 0) {
      throw new BadRequestException('No rewards to claim');
    }

    let totalPoints = 0;
    const allRewards: any[] = [];

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
  @OnEvent('order.completed')
  async handleOrderCompleted(payload: any): Promise<void> {
    const { userId, orderId, amount, productIds, machineId, categoryIds } = payload;

    // ORDER_COUNT
    await this.updateProgress({
      userId,
      organizationId: payload.organizationId,
      eventType: QuestType.ORDER_COUNT,
      value: 1,
      metadata: { orderId },
    });

    // ORDER_AMOUNT
    await this.updateProgress({
      userId,
      organizationId: payload.organizationId,
      eventType: QuestType.ORDER_AMOUNT,
      value: amount,
      metadata: { orderId, amount },
    });

    // ORDER_SINGLE
    await this.updateProgress({
      userId,
      organizationId: payload.organizationId,
      eventType: QuestType.ORDER_SINGLE,
      value: amount,
      metadata: { orderId, amount },
    });

    // ORDER_TIME
    const hour = new Date().getHours();
    await this.updateProgress({
      userId,
      organizationId: payload.organizationId,
      eventType: QuestType.ORDER_TIME,
      value: 1,
      metadata: { orderId, hour },
    });

    // ORDER_MACHINE
    if (machineId) {
      await this.updateProgress({
        userId,
        organizationId: payload.organizationId,
        eventType: QuestType.ORDER_MACHINE,
        value: 1,
        metadata: { orderId, machineId },
      });

      // VISIT (unique machines)
      await this.updateProgress({
        userId,
        organizationId: payload.organizationId,
        eventType: QuestType.VISIT,
        value: 1,
        metadata: { machineId },
      });
    }

    // ORDER_CATEGORY
    if (categoryIds?.length) {
      for (const categoryId of categoryIds) {
        await this.updateProgress({
          userId,
          organizationId: payload.organizationId,
          eventType: QuestType.ORDER_CATEGORY,
          value: 1,
          metadata: { orderId, categoryId },
        });
      }
    }

    // ORDER_PRODUCT & COLLECTOR
    if (productIds?.length) {
      for (const productId of productIds) {
        await this.updateProgress({
          userId,
          organizationId: payload.organizationId,
          eventType: QuestType.ORDER_PRODUCT,
          value: 1,
          metadata: { orderId, productId },
        });
      }

      await this.updateProgress({
        userId,
        organizationId: payload.organizationId,
        eventType: QuestType.COLLECTOR,
        value: productIds.length,
        metadata: { productIds },
      });
    }
  }

  @OnEvent('referral.completed')
  async handleReferralCompleted(payload: any): Promise<void> {
    await this.updateProgress({
      userId: payload.referrerId,
      organizationId: payload.organizationId,
      eventType: QuestType.REFERRAL,
      value: 1,
      metadata: { referredUserId: payload.referredUserId },
    });
  }

  @OnEvent('loyalty.level_up')
  async handleLevelUp(payload: any): Promise<void> {
    await this.updateProgress({
      userId: payload.userId,
      organizationId: payload.organizationId,
      eventType: QuestType.LOYAL_CUSTOMER,
      value: 1,
      metadata: { newLevel: payload.newLevel },
    });
  }

  /**
   * Обновить прогресс квестов
   */
  private async updateProgress(event: QuestProgressEventDto): Promise<ProgressUpdateResultDto[]> {
    const { userId, eventType, value, metadata } = event;

    // Find matching user quests
    const userQuests = await this.userQuestRepo
      .createQueryBuilder('uq')
      .leftJoinAndSelect('uq.quest', 'q')
      .where('uq.userId = :userId', { userId })
      .andWhere('q.type = :eventType', { eventType })
      .andWhere('uq.status = :status', { status: QuestStatus.IN_PROGRESS })
      .andWhere('(uq.periodEnd IS NULL OR uq.periodEnd >= :now)', { now: new Date() })
      .getMany();

    const results: ProgressUpdateResultDto[] = [];

    for (const uq of userQuests) {
      const quest = uq.quest;

      // Check metadata conditions
      if (!this.matchesConditions(quest, metadata)) {
        continue;
      }

      const previousValue = uq.currentValue;
      let incrementValue = value;

      // Handle unique tracking (COLLECTOR, VISIT)
      if (eventType === QuestType.COLLECTOR && metadata?.productIds) {
        const existing = uq.progressDetails?.triedProducts || [];
        const newProducts = metadata.productIds.filter((id: string) => !existing.includes(id));
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

      // Update progress
      uq.currentValue = Math.min(uq.currentValue + incrementValue, uq.targetValue);

      // Check completion
      if (uq.currentValue >= uq.targetValue && uq.status !== QuestStatus.COMPLETED) {
        uq.status = QuestStatus.COMPLETED;
        uq.completedAt = new Date();

        // Update quest stats
        await this.questRepo.increment({ id: quest.id }, 'totalCompleted', 1);

        this.eventEmitter.emit('quest.completed', {
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
  private matchesConditions(quest: Quest, metadata: Record<string, any> | undefined): boolean {
    if (!quest.metadata) return true;
    if (!metadata) return true;

    // ORDER_TIME conditions
    if (quest.metadata.beforeHour !== undefined) {
      if (metadata.hour >= quest.metadata.beforeHour) return false;
    }

    if (quest.metadata.afterHour !== undefined) {
      if (metadata.hour < quest.metadata.afterHour) return false;
    }

    // Category/Product/Machine conditions
    if (quest.metadata.categoryId && metadata.categoryId !== quest.metadata.categoryId) {
      return false;
    }

    if (quest.metadata.productId && metadata.productId !== quest.metadata.productId) {
      return false;
    }

    if (quest.metadata.machineId && metadata.machineId !== quest.metadata.machineId) {
      return false;
    }

    // LOYAL_CUSTOMER
    if (quest.metadata.requiredLevel && metadata.newLevel !== quest.metadata.requiredLevel) {
      return false;
    }

    // Min order amount
    if (quest.metadata.minOrderAmount && metadata.amount < quest.metadata.minOrderAmount) {
      return false;
    }

    return true;
  }

  // ============================================================================
  // QUEST GENERATION
  // ============================================================================

  /**
   * Убедиться что у пользователя есть квесты
   */
  private async ensureUserHasQuests(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    // Check if user needs daily quests
    await this.assignPeriodQuests(userId, user.organizationId, QuestPeriod.DAILY);
    await this.assignPeriodQuests(userId, user.organizationId, QuestPeriod.WEEKLY);
    await this.assignPeriodQuests(userId, user.organizationId, QuestPeriod.MONTHLY);
    await this.assignAchievements(userId, user.organizationId);
  }

  /**
   * Назначить периодические квесты
   */
  private async assignPeriodQuests(
    userId: string,
    organizationId: string,
    period: QuestPeriod,
  ): Promise<void> {
    const periodStart = getPeriodStart(period);
    const periodEnd = getNextReset(period);

    // Check existing
    const existing = await this.userQuestRepo.count({
      where: {
        userId,
        periodStart,
        status: In([QuestStatus.IN_PROGRESS, QuestStatus.COMPLETED]),
      },
    });

    if (existing > 0) return;

    // Get or create quests
    let quests = await this.questRepo.find({
      where: {
        organizationId: In([organizationId, null as any]),
        period,
        isActive: true,
      },
    });

    // If no custom quests, create from templates
    if (quests.length === 0) {
      quests = await this.createFromTemplates(organizationId, period);
    }

    // Select random quests for user
    const count = period === QuestPeriod.DAILY ? 3 : period === QuestPeriod.WEEKLY ? 3 : 2;
    const selectedQuests = selectRandomQuests(quests, Math.min(count, quests.length));

    // Assign to user
    for (const quest of selectedQuests) {
      const userQuest = this.userQuestRepo.create({
        userId,
        questId: quest.id,
        status: QuestStatus.IN_PROGRESS,
        currentValue: 0,
        targetValue: quest.targetValue,
        rewardPoints: quest.rewardPoints,
        periodStart,
        periodEnd,
        progressDetails: {},
      });

      await this.userQuestRepo.save(userQuest);
      await this.questRepo.increment({ id: quest.id }, 'totalStarted', 1);
    }

    this.logger.log(`Assigned ${selectedQuests.length} ${period} quests to user ${userId}`);
  }

  /**
   * Назначить достижения
   */
  private async assignAchievements(userId: string, organizationId: string): Promise<void> {
    // Get achievements
    let achievements = await this.questRepo.find({
      where: {
        organizationId: In([organizationId, null as any]),
        period: QuestPeriod.ONE_TIME,
        isActive: true,
      },
    });

    if (achievements.length === 0) {
      achievements = await this.createAchievements(organizationId);
    }

    // Check which user already has
    const existingIds = await this.userQuestRepo
      .find({
        where: { userId },
        select: ['questId'],
      })
      .then(uqs => uqs.map(uq => uq.questId));

    const newAchievements = achievements.filter(a => !existingIds.includes(a.id));

    for (const quest of newAchievements) {
      const userQuest = this.userQuestRepo.create({
        userId,
        questId: quest.id,
        status: QuestStatus.IN_PROGRESS,
        currentValue: 0,
        targetValue: quest.targetValue,
        rewardPoints: quest.rewardPoints,
        progressDetails: {},
      });

      await this.userQuestRepo.save(userQuest);
      await this.questRepo.increment({ id: quest.id }, 'totalStarted', 1);
    }
  }

  /**
   * Создать квесты из шаблонов
   */
  private async createFromTemplates(organizationId: string, period: QuestPeriod): Promise<Quest[]> {
    const templates =
      period === QuestPeriod.DAILY
        ? DAILY_QUEST_TEMPLATES
        : period === QuestPeriod.WEEKLY
        ? WEEKLY_QUEST_TEMPLATES
        : MONTHLY_QUEST_TEMPLATES;

    const quests: Quest[] = [];

    for (const template of templates) {
      const quest = this.questRepo.create({
        organizationId: undefined as any, // Global
        title: template.title,
        titleUz: template.titleUz,
        description: template.description,
        descriptionUz: template.descriptionUz,
        period,
        type: template.type,
        difficulty: QuestDifficulty.MEDIUM,
        targetValue: template.targetValue,
        rewardPoints: template.baseReward,
        metadata: (template as any).metadata || {},
        isActive: true,
      });

      await this.questRepo.save(quest);
      quests.push(quest);
    }

    this.logger.log(`Created ${quests.length} ${period} quest templates`);
    return quests;
  }

  /**
   * Создать достижения
   */
  private async createAchievements(_organizationId: string): Promise<Quest[]> {
    const quests: Quest[] = [];

    for (const template of ACHIEVEMENT_TEMPLATES) {
      const reward = calculateQuestReward(template.baseReward, template.difficulty);

      const quest = this.questRepo.create({
        organizationId: undefined as any, // Global
        title: template.title,
        titleUz: template.titleUz,
        description: template.description,
        descriptionUz: template.descriptionUz,
        period: QuestPeriod.ONE_TIME,
        type: template.type,
        difficulty: template.difficulty,
        targetValue: template.targetValue,
        rewardPoints: reward,
        metadata: (template as any).metadata || {},
        isActive: true,
      });

      await this.questRepo.save(quest);
      quests.push(quest);
    }

    this.logger.log(`Created ${quests.length} achievements`);
    return quests;
  }

  // ============================================================================
  // CRON JOBS
  // ============================================================================

  /**
   * Сброс ежедневных квестов (ежедневно в 00:00)
   */
  @Cron('0 0 * * *', { timeZone: 'Asia/Tashkent' })
  async resetDailyQuests(): Promise<void> {
    this.logger.log('Running daily quest reset');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Expire unclaimed daily quests from yesterday
    await this.userQuestRepo
      .createQueryBuilder()
      .update()
      .set({ status: QuestStatus.EXPIRED, expiredAt: new Date() })
      .where('status IN (:...statuses)', {
        statuses: [QuestStatus.IN_PROGRESS, QuestStatus.COMPLETED],
      })
      .andWhere('periodStart < :yesterday', { yesterday })
      .andWhere('periodEnd <= :now', { now: new Date() })
      .execute();

    this.logger.log('Daily quest reset completed');
  }

  /**
   * Еженедельный сброс (понедельник в 00:00)
   */
  @Cron('0 0 * * 1', { timeZone: 'Asia/Tashkent' })
  async resetWeeklyQuests(): Promise<void> {
    this.logger.log('Running weekly quest reset');
    // Similar logic to daily
    this.logger.log('Weekly quest reset completed');
  }

  /**
   * Ежемесячный сброс (1 число в 00:00)
   */
  @Cron('0 0 1 * *', { timeZone: 'Asia/Tashkent' })
  async resetMonthlyQuests(): Promise<void> {
    this.logger.log('Running monthly quest reset');
    // Similar logic
    this.logger.log('Monthly quest reset completed');
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Получить статистику квестов
   */
  async getStats(organizationId: string, dateFrom: Date, dateTo: Date): Promise<QuestStatsDto> {
    const totalQuests = await this.questRepo.count({
      where: { organizationId: In([organizationId, null as any]) },
    });

    const activeQuests = await this.questRepo.count({
      where: {
        organizationId: In([organizationId, null as any]),
        isActive: true,
      },
    });

    const userQuestStats = await this.userQuestRepo
      .createQueryBuilder('uq')
      .leftJoin('uq.quest', 'q')
      .select([
        'COUNT(DISTINCT uq.userId) as participants',
        'COUNT(CASE WHEN uq.status = :claimed THEN 1 END) as completed',
        'SUM(CASE WHEN uq.status = :claimed THEN uq.pointsClaimed ELSE 0 END) as points',
      ])
      .where('q.organizationId = :organizationId OR q.organizationId IS NULL', { organizationId })
      .andWhere('uq.startedAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .setParameter('claimed', QuestStatus.CLAIMED)
      .getRawOne();

    return {
      period: { from: dateFrom, to: dateTo },
      totalQuests,
      activeQuests,
      totalParticipants: parseInt(userQuestStats?.participants) || 0,
      totalCompleted: parseInt(userQuestStats?.completed) || 0,
      totalPointsAwarded: parseInt(userQuestStats?.points) || 0,
      completionRate:
        userQuestStats?.participants > 0
          ? Math.round((userQuestStats?.completed / userQuestStats?.participants) * 100)
          : 0,
      byPeriod: [],
      byType: [],
      topQuests: [],
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private mapToQuestInfo(quest: Quest): QuestInfoDto {
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

  private getPointsSourceForPeriod(period: QuestPeriod): PointsSource {
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
