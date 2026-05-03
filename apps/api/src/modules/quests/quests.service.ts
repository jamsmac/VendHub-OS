/**
 * Quests Service
 * Бизнес-логика системы квестов VendHub
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Cron } from "@nestjs/schedule";
import { Quest } from "./entities/quest.entity";
import { UserQuest } from "./entities/user-quest.entity";
import { User } from "../users/entities/user.entity";
import {
  QuestPeriod,
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
} from "./constants/quest.constants";
import {
  CreateQuestDto,
  UpdateQuestDto,
  QuestFilterDto,
  UserQuestProgressDto,
  UserQuestsSummaryDto,
  ClaimResultDto,
  QuestStatsDto,
} from "./dto/quest.dto";
import { QuestProgressService } from "./services/quest-progress.service";

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
    private readonly questProgressService: QuestProgressService,
  ) {}

  // ============================================================================
  // QUEST CRUD (Admin)
  // ============================================================================

  /**
   * Создать квест
   */
  async createQuest(
    organizationId: string,
    dto: CreateQuestDto,
  ): Promise<Quest> {
    const quest = this.questRepo.create({
      organizationId,
      ...dto,
      additionalRewards: dto.additionalRewards as Quest["additionalRewards"],
      difficulty: dto.difficulty || QuestDifficulty.MEDIUM,
    });

    await this.questRepo.save(quest);
    this.logger.log(`Created quest ${quest.id}: ${quest.title}`);
    return quest;
  }

  /**
   * Обновить квест
   */
  async updateQuest(
    id: string,
    organizationId: string,
    dto: UpdateQuestDto,
  ): Promise<Quest> {
    const quest = await this.questRepo.findOne({
      where: { id, organizationId },
    });

    if (!quest) {
      throw new NotFoundException("Quest not found");
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
    const result = await this.questRepo.softDelete({ id, organizationId });
    if (result.affected === 0) {
      throw new NotFoundException("Quest not found");
    }
    this.logger.log(`Deleted quest ${id}`);
  }

  /**
   * Получить квесты организации
   */
  async getQuests(
    organizationId: string,
    filter: QuestFilterDto,
  ): Promise<Quest[]> {
    const qb = this.questRepo
      .createQueryBuilder("q")
      .where(
        "(q.organizationId = :organizationId OR q.organizationId IS NULL)",
        { organizationId },
      )
      .orderBy("q.displayOrder", "ASC")
      .addOrderBy("q.createdAt", "DESC");

    if (filter.period) {
      qb.andWhere("q.period = :period", { period: filter.period });
    }

    if (filter.type) {
      qb.andWhere("q.type = :type", { type: filter.type });
    }

    if (filter.difficulty) {
      qb.andWhere("q.difficulty = :difficulty", {
        difficulty: filter.difficulty,
      });
    }

    if (filter.isActive !== undefined) {
      qb.andWhere("q.isActive = :isActive", { isActive: filter.isActive });
    }

    if (filter.isFeatured !== undefined) {
      qb.andWhere("q.isFeatured = :isFeatured", {
        isFeatured: filter.isFeatured,
      });
    }

    if (!filter.includeExpired) {
      qb.andWhere("(q.endsAt IS NULL OR q.endsAt > :now)", { now: new Date() });
    }

    return qb.getMany();
  }

  // ============================================================================
  // USER QUESTS (delegates to QuestProgressService)
  // ============================================================================

  /**
   * Получить сводку квестов пользователя
   */
  async getUserQuestsSummary(userId: string): Promise<UserQuestsSummaryDto> {
    return this.questProgressService.getUserQuestsSummary(
      userId,
      this.ensureUserHasQuests.bind(this),
    );
  }

  /**
   * Получить конкретный квест пользователя
   */
  async getUserQuest(
    userId: string,
    userQuestId: string,
  ): Promise<UserQuestProgressDto> {
    return this.questProgressService.getUserQuest(userId, userQuestId);
  }

  /**
   * Claim награду за квест
   */
  async claimReward(
    userId: string,
    userQuestId: string,
  ): Promise<ClaimResultDto> {
    return this.questProgressService.claimReward(userId, userQuestId);
  }

  /**
   * Claim все готовые награды
   */
  async claimAllRewards(userId: string): Promise<ClaimResultDto> {
    return this.questProgressService.claimAllRewards(userId);
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

    await this.assignPeriodQuests(
      userId,
      user.organizationId,
      QuestPeriod.DAILY,
    );
    await this.assignPeriodQuests(
      userId,
      user.organizationId,
      QuestPeriod.WEEKLY,
    );
    await this.assignPeriodQuests(
      userId,
      user.organizationId,
      QuestPeriod.MONTHLY,
    );
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

    const existing = await this.userQuestRepo.count({
      where: {
        userId,
        periodStart,
        status: In([QuestStatus.IN_PROGRESS, QuestStatus.COMPLETED]),
      },
    });

    if (existing > 0) return;

    let quests = await this.questRepo.find({
      where: {
        organizationId: In([organizationId, null as unknown as string]),
        period,
        isActive: true,
      },
    });

    if (quests.length === 0) {
      quests = await this.createFromTemplates(organizationId, period);
    }

    const count =
      period === QuestPeriod.DAILY ? 3 : period === QuestPeriod.WEEKLY ? 3 : 2;
    const selectedQuests = selectRandomQuests(
      quests,
      Math.min(count, quests.length),
    );

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
      await this.questRepo.increment({ id: quest.id }, "totalStarted", 1);
    }

    this.logger.log(
      `Assigned ${selectedQuests.length} ${period} quests to user ${userId}`,
    );
  }

  /**
   * Назначить достижения
   */
  private async assignAchievements(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    let achievements = await this.questRepo.find({
      where: {
        organizationId: In([organizationId, null as unknown as string]),
        period: QuestPeriod.ONE_TIME,
        isActive: true,
      },
    });

    if (achievements.length === 0) {
      achievements = await this.createAchievements(organizationId);
    }

    const existingIds = await this.userQuestRepo
      .find({
        where: { userId },
        select: ["questId"],
      })
      .then((uqs) => uqs.map((uq) => uq.questId));

    const newAchievements = achievements.filter(
      (a) => !existingIds.includes(a.id),
    );

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
      await this.questRepo.increment({ id: quest.id }, "totalStarted", 1);
    }
  }

  /**
   * Создать квесты из шаблонов
   */
  private async createFromTemplates(
    organizationId: string,
    period: QuestPeriod,
  ): Promise<Quest[]> {
    const templates =
      period === QuestPeriod.DAILY
        ? DAILY_QUEST_TEMPLATES
        : period === QuestPeriod.WEEKLY
          ? WEEKLY_QUEST_TEMPLATES
          : MONTHLY_QUEST_TEMPLATES;

    const quests: Quest[] = [];

    for (const template of templates) {
      const quest = this.questRepo.create({
        organizationId: undefined as unknown as string,
        title: template.title,
        titleUz: template.titleUz,
        description: template.description,
        descriptionUz: template.descriptionUz,
        period,
        type: template.type,
        difficulty: QuestDifficulty.MEDIUM,
        targetValue: template.targetValue,
        rewardPoints: template.baseReward,
        metadata:
          (template as { metadata?: Record<string, unknown> }).metadata || {},
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
      const reward = calculateQuestReward(
        template.baseReward,
        template.difficulty,
      );

      const quest = this.questRepo.create({
        organizationId: undefined as unknown as string,
        title: template.title,
        titleUz: template.titleUz,
        description: template.description,
        descriptionUz: template.descriptionUz,
        period: QuestPeriod.ONE_TIME,
        type: template.type,
        difficulty: template.difficulty,
        targetValue: template.targetValue,
        rewardPoints: reward,
        metadata:
          (template as { metadata?: Record<string, unknown> }).metadata || {},
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
  @Cron("0 0 * * *", { timeZone: "Asia/Tashkent" })
  async resetDailyQuests(): Promise<void> {
    this.logger.log("Running daily quest reset");

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    await this.userQuestRepo
      .createQueryBuilder()
      .update()
      .set({ status: QuestStatus.EXPIRED, expiredAt: new Date() })
      .where("status IN (:...statuses)", {
        statuses: [QuestStatus.IN_PROGRESS, QuestStatus.COMPLETED],
      })
      .andWhere("periodStart < :yesterday", { yesterday })
      .andWhere("periodEnd <= :now", { now: new Date() })
      .execute();

    this.logger.log("Daily quest reset completed");
  }

  /**
   * Еженедельный сброс (понедельник в 00:00)
   */
  @Cron("0 0 * * 1", { timeZone: "Asia/Tashkent" })
  async resetWeeklyQuests(): Promise<void> {
    this.logger.log("Running weekly quest reset");
    this.logger.log("Weekly quest reset completed");
  }

  /**
   * Ежемесячный сброс (1 число в 00:00)
   */
  @Cron("0 0 1 * *", { timeZone: "Asia/Tashkent" })
  async resetMonthlyQuests(): Promise<void> {
    this.logger.log("Running monthly quest reset");
    this.logger.log("Monthly quest reset completed");
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Получить статистику квестов
   */
  async getStats(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<QuestStatsDto> {
    const totalQuests = await this.questRepo.count({
      where: {
        organizationId: In([organizationId, null as unknown as string]),
      },
    });

    const activeQuests = await this.questRepo.count({
      where: {
        organizationId: In([organizationId, null as unknown as string]),
        isActive: true,
      },
    });

    // Raw SQL identifiers in select/where must be snake_case — Postgres
    // case-folds unquoted identifiers, and TypeORM only resolves
    // alias.property in some code paths.
    const userQuestStats = await this.userQuestRepo
      .createQueryBuilder("uq")
      .leftJoin("uq.quest", "q")
      .select([
        "COUNT(DISTINCT uq.user_id) as participants",
        "COUNT(CASE WHEN uq.status = :claimed THEN 1 END) as completed",
        "SUM(CASE WHEN uq.status = :claimed THEN uq.points_claimed ELSE 0 END) as points",
      ])
      .where(
        "q.organization_id = :organizationId OR q.organization_id IS NULL",
        { organizationId },
      )
      // Entity has no `startedAt` field — use BaseEntity's createdAt
      // as the participation timestamp for stats windowing.
      .andWhere("uq.created_at BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .setParameter("claimed", QuestStatus.CLAIMED)
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
          ? Math.round(
              (userQuestStats?.completed / userQuestStats?.participants) * 100,
            )
          : 0,
      byPeriod: [],
      byType: [],
      topQuests: [],
    };
  }
}
