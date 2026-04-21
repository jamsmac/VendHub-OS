/**
 * Achievement Service
 * Бизнес-логика достижений и бейджей программы лояльности
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Achievement,
  AchievementCategory,
  AchievementConditionType,
  AchievementRarity,
} from "../entities/achievement.model";
import { UserAchievement } from "../entities/user-achievement.model";
import { User } from "../../users/entities/user.entity";
import { LoyaltyService } from "../loyalty.service";
import { PointsSource } from "../constants/loyalty.constants";
import {
  LoyaltyCreateAchievementDto,
  LoyaltyUpdateAchievementDto,
  AchievementResponseDto,
  UserAchievementResponseDto,
  LoyaltyAchievementStatsDto,
} from "../dto/achievement.dto";

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly loyaltyService: LoyaltyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // ADMIN CRUD
  // ============================================================================

  /**
   * Create a new achievement definition
   */
  async createAchievement(
    organizationId: string,
    dto: LoyaltyCreateAchievementDto,
  ): Promise<AchievementResponseDto> {
    const achievement = this.achievementRepo.create({
      organizationId,
      ...dto,
    });

    const saved = await this.achievementRepo.save(achievement);
    this.logger.log(
      `Achievement created: ${saved.title} (${saved.id}) for org ${organizationId}`,
    );

    return this.mapToResponseDto(saved);
  }

  /**
   * Update an existing achievement
   */
  async updateAchievement(
    id: string,
    organizationId: string,
    dto: LoyaltyUpdateAchievementDto,
  ): Promise<AchievementResponseDto> {
    const achievement = await this.achievementRepo.findOne({
      where: { id, organizationId },
    });

    if (!achievement) {
      throw new NotFoundException("Achievement not found");
    }

    Object.assign(achievement, dto);
    const saved = await this.achievementRepo.save(achievement);

    this.logger.log(`Achievement updated: ${saved.title} (${saved.id})`);
    return this.mapToResponseDto(saved);
  }

  /**
   * Soft delete an achievement
   */
  async deleteAchievement(id: string, organizationId: string): Promise<void> {
    const achievement = await this.achievementRepo.findOne({
      where: { id, organizationId },
    });

    if (!achievement) {
      throw new NotFoundException("Achievement not found");
    }

    await this.achievementRepo.softDelete(id);
    this.logger.log(`Achievement deleted: ${achievement.title} (${id})`);
  }

  // ============================================================================
  // PUBLIC QUERIES
  // ============================================================================

  /**
   * Get all achievements for an organization.
   * Optionally enriched with user unlock status.
   * Hidden achievements only shown if unlocked by the user.
   */
  async getAchievements(
    organizationId: string,
    userId?: string,
    category?: string,
  ): Promise<AchievementResponseDto[]> {
    const qb = this.achievementRepo
      .createQueryBuilder("a")
      .where("a.organizationId = :organizationId", { organizationId })
      .andWhere("a.isActive = :isActive", { isActive: true })
      .orderBy("a.sortOrder", "ASC")
      .addOrderBy("a.createdAt", "ASC");

    if (category) {
      qb.andWhere("a.category = :category", { category });
    }

    const achievements = await qb.getMany();

    // Get unlock counts
    const unlockCounts = await this.userAchievementRepo
      .createQueryBuilder("ua")
      .select("ua.achievementId", "achievementId")
      .addSelect("COUNT(*)", "count")
      .where("ua.organizationId = :organizationId", { organizationId })
      .groupBy("ua.achievementId")
      .getRawMany();

    const countMap = new Map<string, number>(
      unlockCounts.map((r) => [r.achievementId, parseInt(r.count) || 0]),
    );

    // Get user's unlocked achievements if userId provided
    let userUnlockMap = new Map<string, Date>();
    if (userId) {
      const userAchievements = await this.userAchievementRepo.find({
        where: { userId, organizationId },
        take: 1000,
      });
      userUnlockMap = new Map(
        userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt]),
      );
    }

    // Filter hidden achievements: show only if user has unlocked them
    const visibleAchievements = achievements.filter((a) => {
      if (!a.isHidden) return true;
      return userId ? userUnlockMap.has(a.id) : false;
    });

    return visibleAchievements.map((a) => ({
      ...this.mapToResponseDto(a),
      unlockedCount: countMap.get(a.id) || 0,
      ...(userId ? { unlocked: userUnlockMap.has(a.id) } : {}),
      ...(userId ? { unlockedAt: userUnlockMap.get(a.id) || null } : {}),
    }));
  }

  /**
   * Get all achievements for admin (including inactive, with unlock counts)
   */
  async getAchievementsAdmin(
    organizationId: string,
    category?: string,
  ): Promise<AchievementResponseDto[]> {
    const qb = this.achievementRepo
      .createQueryBuilder("a")
      .where("a.organizationId = :organizationId", { organizationId })
      .orderBy("a.sortOrder", "ASC")
      .addOrderBy("a.createdAt", "ASC");

    if (category) {
      qb.andWhere("a.category = :category", { category });
    }

    const achievements = await qb.getMany();

    // Get unlock counts
    const unlockCounts = await this.userAchievementRepo
      .createQueryBuilder("ua")
      .select("ua.achievementId", "achievementId")
      .addSelect("COUNT(*)", "count")
      .where("ua.organizationId = :organizationId", { organizationId })
      .groupBy("ua.achievementId")
      .getRawMany();

    const countMap = new Map<string, number>(
      unlockCounts.map((r) => [r.achievementId, parseInt(r.count) || 0]),
    );

    return achievements.map((a) => ({
      ...this.mapToResponseDto(a),
      unlockedCount: countMap.get(a.id) || 0,
    }));
  }

  /**
   * Get a user's unlocked achievements
   */
  async getUserAchievements(
    userId: string,
    organizationId: string,
  ): Promise<UserAchievementResponseDto[]> {
    const userAchievements = await this.userAchievementRepo.find({
      where: { userId, organizationId },
      relations: ["achievement"],
      order: { unlockedAt: "DESC" },
      take: 1000,
    });

    return userAchievements.map((ua) => ({
      id: ua.id,
      achievement: this.mapToResponseDto(ua.achievement),
      unlockedAt: ua.unlockedAt,
      pointsAwarded: ua.pointsAwarded,
    }));
  }

  /**
   * Get achievement stats (admin)
   */
  async getStats(organizationId: string): Promise<LoyaltyAchievementStatsDto> {
    const [totalAchievements, totalUnlocked, rewardsResult] = await Promise.all(
      [
        this.achievementRepo.count({
          where: { organizationId },
        }),
        this.userAchievementRepo.count({
          where: { organizationId },
        }),
        this.userAchievementRepo
          .createQueryBuilder("ua")
          .select("COALESCE(SUM(ua.pointsAwarded), 0)", "total")
          .where("ua.organizationId = :organizationId", { organizationId })
          .getRawOne(),
      ],
    );

    return {
      totalAchievements,
      totalUnlocked,
      totalRewardsClaimed: parseInt(rewardsResult?.total) || 0,
    };
  }

  // ============================================================================
  // ACHIEVEMENT CHECKING & UNLOCKING
  // ============================================================================

  /**
   * Check if a user qualifies for any new achievements and unlock them.
   * Called after events like order completion, streak update, etc.
   */
  async checkAndUnlock(
    userId: string,
    organizationId: string,
    eventType: string,
    eventData?: Record<string, unknown>,
  ): Promise<UserAchievementResponseDto[]> {
    // Get all active achievements for the organization
    const achievements = await this.achievementRepo.find({
      where: { organizationId, isActive: true },
      take: 1000,
    });

    if (achievements.length === 0) return [];

    // Get user's already unlocked achievement IDs
    const unlocked = await this.userAchievementRepo.find({
      where: { userId, organizationId },
      select: ["achievementId"],
      take: 1000,
    });
    const unlockedIds = new Set(unlocked.map((ua) => ua.achievementId));

    // Filter to not-yet-unlocked achievements
    const candidates = achievements.filter((a) => !unlockedIds.has(a.id));
    if (candidates.length === 0) return [];

    // Get user data for condition checks
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return [];

    const newlyUnlocked: UserAchievementResponseDto[] = [];

    for (const achievement of candidates) {
      const qualifies = this.evaluateCondition(
        achievement,
        user,
        eventType,
        eventData,
      );

      if (qualifies) {
        const result = await this.unlockAchievement(
          userId,
          organizationId,
          achievement,
        );
        if (result) {
          newlyUnlocked.push(result);
        }
      }
    }

    return newlyUnlocked;
  }

  /**
   * Seed default achievements for an organization
   */
  async seedDefaults(
    organizationId: string,
  ): Promise<AchievementResponseDto[]> {
    const defaults: Partial<Achievement>[] = [
      {
        title: "Первый шаг",
        titleUz: "Birinchi qadam",
        description: "Сделайте свой первый заказ",
        descriptionUz: "Birinchi buyurtmangizni bering",
        icon: "🎉",
        category: AchievementCategory.BEGINNER,
        rarity: AchievementRarity.COMMON,
        conditionType: AchievementConditionType.FIRST_ORDER,
        conditionValue: 1,
        pointsReward: 50,
        sortOrder: 1,
      },
      {
        title: "Постоянный клиент",
        titleUz: "Doimiy mijoz",
        description: "Сделайте 10 заказов",
        descriptionUz: "10 ta buyurtma bering",
        icon: "⭐",
        category: AchievementCategory.LOYAL,
        rarity: AchievementRarity.UNCOMMON,
        conditionType: AchievementConditionType.TOTAL_ORDERS,
        conditionValue: 10,
        pointsReward: 100,
        sortOrder: 2,
      },
      {
        title: "Марафонец",
        titleUz: "Marafonchi",
        description: "Сделайте 100 заказов",
        descriptionUz: "100 ta buyurtma bering",
        icon: "🏆",
        category: AchievementCategory.LOYAL,
        rarity: AchievementRarity.EPIC,
        conditionType: AchievementConditionType.TOTAL_ORDERS,
        conditionValue: 100,
        pointsReward: 500,
        sortOrder: 3,
      },
      {
        title: "Серия побед",
        titleUz: "G'alabalar seriyasi",
        description: "Делайте заказы 7 дней подряд",
        descriptionUz: "7 kun ketma-ket buyurtma bering",
        icon: "🔥",
        category: AchievementCategory.LOYAL,
        rarity: AchievementRarity.RARE,
        conditionType: AchievementConditionType.STREAK_DAYS,
        conditionValue: 7,
        pointsReward: 200,
        sortOrder: 4,
      },
      {
        title: "Друг привёл друга",
        titleUz: "Do'st do'stni olib keldi",
        description: "Пригласите 5 друзей",
        descriptionUz: "5 ta do'stingizni taklif qiling",
        icon: "👥",
        category: AchievementCategory.SOCIAL,
        rarity: AchievementRarity.RARE,
        conditionType: AchievementConditionType.REFERRALS_COUNT,
        conditionValue: 5,
        pointsReward: 300,
        sortOrder: 5,
      },
      {
        title: "Ночная покупка",
        titleUz: "Tungi xarid",
        description: "Сделайте заказ ночью (с 00:00 до 06:00)",
        descriptionUz: "Tungi vaqtda buyurtma bering (00:00 dan 06:00 gacha)",
        icon: "🌙",
        category: AchievementCategory.SPECIAL,
        rarity: AchievementRarity.UNCOMMON,
        conditionType: AchievementConditionType.NIGHT_ORDER,
        conditionValue: 1,
        pointsReward: 75,
        sortOrder: 6,
      },
    ];

    const created: AchievementResponseDto[] = [];
    for (const def of defaults) {
      const where: Record<string, unknown> = { organizationId };
      if (def.conditionType !== undefined)
        where.conditionType = def.conditionType;
      if (def.conditionValue !== undefined)
        where.conditionValue = def.conditionValue;
      const exists = await this.achievementRepo.findOne({
        where: where as FindOptionsWhere<Achievement>,
      });
      if (!exists) {
        const achievement = this.achievementRepo.create({
          ...def,
          organizationId,
        });
        const saved = await this.achievementRepo.save(achievement);
        created.push(this.mapToResponseDto(saved));
      }
    }

    this.logger.log(
      `Seeded ${created.length} default achievements for org ${organizationId}`,
    );
    return created;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Evaluate whether a user meets the condition for an achievement
   */
  private evaluateCondition(
    achievement: Achievement,
    user: User,
    eventType: string,
    eventData?: Record<string, unknown>,
  ): boolean {
    const { conditionType, conditionValue } = achievement;

    switch (conditionType) {
      case AchievementConditionType.TOTAL_ORDERS:
        return (user.totalOrders || 0) >= conditionValue;

      case AchievementConditionType.TOTAL_SPENT:
        return Number(user.totalSpent || 0) >= conditionValue;

      case AchievementConditionType.STREAK_DAYS:
        return (user.currentStreak || 0) >= conditionValue;

      case AchievementConditionType.LEVEL_REACHED: {
        const levelOrder = ["bronze", "silver", "gold", "platinum"];
        const userLevelIndex = levelOrder.indexOf(
          user.loyaltyLevel || "bronze",
        );
        return userLevelIndex >= conditionValue - 1;
      }

      case AchievementConditionType.FIRST_ORDER:
        return eventType === "order.completed" && (user.totalOrders || 0) >= 1;

      case AchievementConditionType.NIGHT_ORDER: {
        if (eventType !== "order.completed") return false;
        const hour = eventData?.orderHour as number | undefined;
        if (hour !== undefined) {
          return hour >= 0 && hour < 6;
        }
        const now = new Date();
        const currentHour = now.getHours();
        return currentHour >= 0 && currentHour < 6;
      }

      case AchievementConditionType.WEEKEND_ORDER: {
        if (eventType !== "order.completed") return false;
        const day =
          (eventData?.orderDay as number | undefined) ?? new Date().getDay();
        return day === 0 || day === 6;
      }

      case AchievementConditionType.REFERRALS_COUNT: {
        // referralCount is not on User entity; use eventData if provided
        const referralCount = eventData?.referralCount as number | undefined;
        return (referralCount || 0) >= conditionValue;
      }

      case AchievementConditionType.TOTAL_POINTS_EARNED: {
        const totalEarned = eventData?.totalPointsEarned as number | undefined;
        return (totalEarned || 0) >= conditionValue;
      }

      case AchievementConditionType.UNIQUE_MACHINES: {
        const uniqueMachines = eventData?.uniqueMachines as number | undefined;
        return (uniqueMachines || 0) >= conditionValue;
      }

      case AchievementConditionType.UNIQUE_PRODUCTS: {
        const uniqueProducts = eventData?.uniqueProducts as number | undefined;
        return (uniqueProducts || 0) >= conditionValue;
      }

      case AchievementConditionType.REVIEWS_COUNT: {
        const reviewsCount = eventData?.reviewsCount as number | undefined;
        return (reviewsCount || 0) >= conditionValue;
      }

      case AchievementConditionType.QUESTS_COMPLETED: {
        const questsCompleted = eventData?.questsCompleted as
          | number
          | undefined;
        return (questsCompleted || 0) >= conditionValue;
      }

      default:
        return false;
    }
  }

  /**
   * Unlock an achievement for a user and award points
   */
  private async unlockAchievement(
    userId: string,
    organizationId: string,
    achievement: Achievement,
  ): Promise<UserAchievementResponseDto | null> {
    try {
      // Check for existing unlock (race condition guard)
      const existing = await this.userAchievementRepo.findOne({
        where: { userId, achievementId: achievement.id },
      });
      if (existing) return null;

      const userAchievement = this.userAchievementRepo.create({
        userId,
        organizationId,
        achievementId: achievement.id,
        unlockedAt: new Date(),
        pointsAwarded: achievement.pointsReward,
      });

      const saved = await this.userAchievementRepo.save(userAchievement);

      // Award points if configured
      if (achievement.pointsReward > 0) {
        const earnDto: Parameters<typeof this.loyaltyService.earnPoints>[0] = {
          userId,
          organizationId,
          amount: achievement.pointsReward,
          source: PointsSource.ACHIEVEMENT,
          referenceId: achievement.id,
          referenceType: "achievement",
          description: `Достижение: ${achievement.title}`,
        };
        if (achievement.titleUz) {
          earnDto.descriptionUz = `Yutuq: ${achievement.titleUz}`;
        }
        await this.loyaltyService.earnPoints(earnDto);
      }

      // Emit event
      this.eventEmitter.emit("achievement.unlocked", {
        userId,
        organizationId,
        achievementId: achievement.id,
        achievementTitle: achievement.title,
        pointsAwarded: achievement.pointsReward,
      });

      this.logger.log(
        `Achievement unlocked: "${achievement.title}" for user ${userId} (+${achievement.pointsReward} pts)`,
      );

      return {
        id: saved.id,
        achievement: this.mapToResponseDto(achievement),
        unlockedAt: saved.unlockedAt,
        pointsAwarded: saved.pointsAwarded,
      };
    } catch (error) {
      // Unique constraint violation means already unlocked (race condition)
      if (error instanceof Error && error.message.includes("duplicate key")) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Map Achievement entity to response DTO
   */
  private mapToResponseDto(achievement: Achievement): AchievementResponseDto {
    return {
      id: achievement.id,
      title: achievement.title,
      titleUz: achievement.titleUz || null,
      description: achievement.description,
      descriptionUz: achievement.descriptionUz || null,
      icon: achievement.icon,
      category: achievement.category,
      rarity: achievement.rarity,
      conditionType: achievement.conditionType,
      conditionValue: achievement.conditionValue,
      pointsReward: achievement.pointsReward,
      isActive: achievement.isActive,
      isHidden: achievement.isHidden,
      sortOrder: achievement.sortOrder,
      createdAt: achievement.createdAt,
    };
  }
}
