/**
 * Achievements Service
 * Бизнес-логика системы достижений VendHub
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Achievement } from "./entities/achievement.entity";
import { UserAchievement } from "./entities/user-achievement.entity";
import {
  CreateAchievementDto,
  UpdateAchievementDto,
  AchievementFilterDto,
  UserAchievementDto,
  UserAchievementsSummaryDto,
  ClaimAchievementResultDto,
  AchievementStatsDto,
} from "./dto/achievement.dto";
import {
  AchievementConditionType,
  DEFAULT_ACHIEVEMENTS,
} from "./constants/achievement.constants";
import { LoyaltyService } from "../loyalty/loyalty.service";
import { PointsSource } from "../loyalty/constants/loyalty.constants";

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
    private readonly loyaltyService: LoyaltyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // ADMIN: CRUD
  // ============================================================================

  async getAchievements(
    organizationId: string,
    filter?: AchievementFilterDto,
  ): Promise<Achievement[]> {
    const qb = this.achievementRepo
      .createQueryBuilder("a")
      .where("(a.organizationId = :orgId OR a.organizationId IS NULL)", {
        orgId: organizationId,
      })
      .orderBy("a.displayOrder", "ASC")
      .addOrderBy("a.createdAt", "ASC");

    if (filter?.category) {
      qb.andWhere("a.category = :category", { category: filter.category });
    }
    if (filter?.rarity) {
      qb.andWhere("a.rarity = :rarity", { rarity: filter.rarity });
    }
    if (filter?.isActive !== undefined) {
      qb.andWhere("a.isActive = :isActive", { isActive: filter.isActive });
    }

    return qb.getMany();
  }

  async getAchievementById(
    id: string,
    organizationId: string,
  ): Promise<Achievement> {
    const achievement = await this.achievementRepo.findOne({
      where: [
        { id, organizationId },
        { id, organizationId: IsNull() },
      ],
    });

    if (!achievement) {
      throw new NotFoundException(`Achievement ${id} not found`);
    }
    return achievement;
  }

  async createAchievement(
    organizationId: string,
    dto: CreateAchievementDto,
  ): Promise<Achievement> {
    const achievement = this.achievementRepo.create({
      ...dto,
      organizationId,
    });
    return this.achievementRepo.save(achievement);
  }

  async updateAchievement(
    id: string,
    organizationId: string,
    dto: UpdateAchievementDto,
  ): Promise<Achievement> {
    const achievement = await this.getAchievementById(id, organizationId);

    // Don't allow editing global achievements
    if (!achievement.organizationId) {
      throw new BadRequestException("Cannot edit global achievements");
    }

    Object.assign(achievement, dto);
    return this.achievementRepo.save(achievement);
  }

  async deleteAchievement(id: string, organizationId: string): Promise<void> {
    const achievement = await this.getAchievementById(id, organizationId);

    if (!achievement.organizationId) {
      throw new BadRequestException("Cannot delete global achievements");
    }

    await this.achievementRepo.softDelete(id);
  }

  // ============================================================================
  // USER: Get achievements
  // ============================================================================

  async getUserAchievementsSummary(
    userId: string,
  ): Promise<UserAchievementsSummaryDto> {
    // Get all active achievements
    const achievements = await this.achievementRepo.find({
      where: { isActive: true },
      order: { displayOrder: "ASC" },
    });

    // Get user's achievements
    const userAchievements = await this.userAchievementRepo.find({
      where: { userId },
      relations: ["achievement"],
    });

    const userAchMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua]),
    );

    // Build summary
    const byCategory: Record<string, { total: number; unlocked: number }> = {};
    let totalUnlocked = 0;
    let totalPointsEarned = 0;
    let unclaimedPoints = 0;

    const allUserAchievements: UserAchievementDto[] = [];

    for (const ach of achievements) {
      // Skip hidden achievements user hasn't unlocked
      const ua = userAchMap.get(ach.id);
      if (ach.isHidden && (!ua || !ua.isUnlocked)) continue;

      // Category stats
      if (!byCategory[ach.category]) {
        byCategory[ach.category] = { total: 0, unlocked: 0 };
      }
      byCategory[ach.category].total++;

      const isUnlocked = ua?.isUnlocked ?? false;
      if (isUnlocked) {
        totalUnlocked++;
        byCategory[ach.category].unlocked++;
        if (ua?.pointsClaimed) {
          totalPointsEarned += ua.pointsClaimed;
        }
        if (ua && !ua.claimedAt) {
          unclaimedPoints += ach.bonusPoints;
        }
      }

      allUserAchievements.push({
        id: ua?.id ?? "",
        achievement: {
          id: ach.id,
          name: ach.name,
          nameUz: ach.nameUz,
          description: ach.description,
          descriptionUz: ach.descriptionUz,
          icon: ach.icon,
          imageUrl: ach.imageUrl,
          category: ach.category,
          rarity: ach.rarity,
          bonusPoints: ach.bonusPoints,
          conditionType: ach.conditionType,
          conditionValue: ach.conditionValue,
        },
        currentValue: ua?.currentValue ?? 0,
        targetValue: ach.conditionValue,
        progressPercent: ua
          ? Math.min(
              100,
              Math.floor((ua.currentValue / ach.conditionValue) * 100),
            )
          : 0,
        isUnlocked,
        unlockedAt: ua?.unlockedAt ?? null,
        isClaimed: !!ua?.claimedAt,
      });
    }

    // Recent (last 5 unlocked)
    const recent = allUserAchievements
      .filter((a) => a.isUnlocked)
      .sort((a, b) => {
        const dateA = a.unlockedAt ? new Date(a.unlockedAt).getTime() : 0;
        const dateB = b.unlockedAt ? new Date(b.unlockedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);

    // In progress (not unlocked, has some progress)
    const inProgress = allUserAchievements
      .filter((a) => !a.isUnlocked && a.currentValue > 0)
      .sort((a, b) => b.progressPercent - a.progressPercent)
      .slice(0, 5);

    return {
      total: achievements.filter((a) => !a.isHidden).length,
      unlocked: totalUnlocked,
      totalPointsEarned,
      unclaimedPoints,
      byCategory,
      recent,
      inProgress,
    };
  }

  async getUserAchievements(userId: string): Promise<UserAchievementDto[]> {
    const achievements = await this.achievementRepo.find({
      where: { isActive: true },
      order: { displayOrder: "ASC" },
    });

    const userAchievements = await this.userAchievementRepo.find({
      where: { userId },
    });

    const userAchMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua]),
    );

    return achievements
      .filter((ach) => {
        const ua = userAchMap.get(ach.id);
        return !ach.isHidden || (ua && ua.isUnlocked);
      })
      .map((ach) => {
        const ua = userAchMap.get(ach.id);
        return {
          id: ua?.id ?? "",
          achievement: {
            id: ach.id,
            name: ach.name,
            nameUz: ach.nameUz,
            description: ach.description,
            descriptionUz: ach.descriptionUz,
            icon: ach.icon,
            imageUrl: ach.imageUrl,
            category: ach.category,
            rarity: ach.rarity,
            bonusPoints: ach.bonusPoints,
            conditionType: ach.conditionType,
            conditionValue: ach.conditionValue,
          },
          currentValue: ua?.currentValue ?? 0,
          targetValue: ach.conditionValue,
          progressPercent: ua
            ? Math.min(
                100,
                Math.floor((ua.currentValue / ach.conditionValue) * 100),
              )
            : 0,
          isUnlocked: ua?.isUnlocked ?? false,
          unlockedAt: ua?.unlockedAt ?? null,
          isClaimed: !!ua?.claimedAt,
        };
      });
  }

  // ============================================================================
  // USER: Claim reward
  // ============================================================================

  async claimReward(
    userId: string,
    userAchievementId: string,
  ): Promise<ClaimAchievementResultDto> {
    const ua = await this.userAchievementRepo.findOne({
      where: { id: userAchievementId, userId },
      relations: ["achievement"],
    });

    if (!ua) {
      throw new NotFoundException("Achievement not found");
    }
    if (!ua.isUnlocked) {
      throw new BadRequestException("Achievement not yet unlocked");
    }
    if (ua.claimedAt) {
      throw new BadRequestException("Reward already claimed");
    }

    const pointsToAward = ua.achievement.bonusPoints;

    // Award points via loyalty
    const result = await this.loyaltyService.earnPoints({
      userId,
      organizationId: ua.achievement.organizationId!,
      amount: pointsToAward,
      source: PointsSource.ACHIEVEMENT,
      referenceId: ua.achievement.id,
      referenceType: "achievement",
      description: `За достижение: ${ua.achievement.name}`,
    });

    // Mark as claimed
    ua.claimedAt = new Date();
    ua.pointsClaimed = pointsToAward;
    await this.userAchievementRepo.save(ua);

    return {
      success: true,
      pointsClaimed: pointsToAward,
      achievementName: ua.achievement.name,
      newBalance: result.newBalance,
    };
  }

  async claimAllRewards(userId: string): Promise<ClaimAchievementResultDto[]> {
    const unclaimed = await this.userAchievementRepo.find({
      where: {
        userId,
        isUnlocked: true,
        claimedAt: IsNull(),
      },
      relations: ["achievement"],
    });

    const results: ClaimAchievementResultDto[] = [];
    for (const ua of unclaimed) {
      const result = await this.claimReward(userId, ua.id);
      results.push(result);
    }
    return results;
  }

  // ============================================================================
  // PROGRESS: Check and update
  // ============================================================================

  async checkAndUpdateProgress(
    userId: string,
    conditionType: AchievementConditionType,
    value: number,

    metadata?: Record<string, unknown>,
  ): Promise<UserAchievement[]> {
    // Find all matching achievements
    const achievements = await this.achievementRepo.find({
      where: {
        conditionType,
        isActive: true,
      },
    });

    if (!achievements.length) return [];

    const newlyUnlocked: UserAchievement[] = [];

    for (const achievement of achievements) {
      // Get or create user achievement
      let ua = await this.userAchievementRepo.findOne({
        where: {
          userId,
          achievementId: achievement.id,
        },
      });

      if (ua?.isUnlocked) continue; // Already unlocked

      if (!ua) {
        ua = this.userAchievementRepo.create({
          userId,
          achievementId: achievement.id,
          currentValue: 0,
          targetValue: achievement.conditionValue,
        });
      }

      // Update progress based on condition type
      switch (conditionType) {
        case AchievementConditionType.ORDER_COUNT:
        case AchievementConditionType.STREAK_DAYS:
        case AchievementConditionType.REFERRAL_COUNT:
        case AchievementConditionType.QUEST_COMPLETED:
        case AchievementConditionType.REVIEW_COUNT:
        case AchievementConditionType.PROMO_USED:
          ua.currentValue = value;
          break;

        case AchievementConditionType.ORDER_AMOUNT:
          ua.currentValue = value;
          break;

        case AchievementConditionType.UNIQUE_PRODUCTS:
        case AchievementConditionType.UNIQUE_MACHINES:
          // Accumulate unique values
          const details = ua.progressDetails || {};
          const key =
            conditionType === AchievementConditionType.UNIQUE_PRODUCTS
              ? "tried_products"
              : "visited_machines";
          const existing: string[] = (details[key] as string[]) || [];
          const newId = metadata?.id as string | undefined;
          if (newId && !existing.includes(newId)) {
            existing.push(newId);
            details[key] = existing;
            ua.progressDetails = details;
            ua.currentValue = existing.length;
          }
          break;

        case AchievementConditionType.FIRST_ORDER:
        case AchievementConditionType.EARLY_BIRD:
        case AchievementConditionType.NIGHT_OWL:
        case AchievementConditionType.WEEKEND_WARRIOR:
          ua.currentValue = value;
          break;

        case AchievementConditionType.LOYALTY_LEVEL:
          // value is the numeric level index
          ua.currentValue = value;
          break;
      }

      // Check if unlocked
      if (ua.currentValue >= achievement.conditionValue && !ua.isUnlocked) {
        ua.isUnlocked = true;
        ua.unlockedAt = new Date();

        // Update achievement stats
        await this.achievementRepo.increment(
          { id: achievement.id },
          "totalUnlocked",
          1,
        );

        newlyUnlocked.push(ua);

        this.logger.log(
          `User ${userId} unlocked achievement: ${achievement.name}`,
        );

        // Emit event for notifications
        this.eventEmitter.emit("achievement.unlocked", {
          userId,
          achievementId: achievement.id,
          achievementName: achievement.name,
          bonusPoints: achievement.bonusPoints,
        });
      }

      await this.userAchievementRepo.save(ua);
    }

    return newlyUnlocked;
  }

  // ============================================================================
  // ADMIN: Statistics
  // ============================================================================

  async getStats(organizationId: string): Promise<AchievementStatsDto> {
    const totalAchievements = await this.achievementRepo.count({
      where: [
        { organizationId, isActive: true },
        { organizationId: IsNull(), isActive: true },
      ],
    });

    const usersWithAchievements = await this.userAchievementRepo
      .createQueryBuilder("ua")
      .select("COUNT(DISTINCT ua.userId)", "count")
      .where("ua.isUnlocked = true")
      .getRawOne();

    const mostPopular = await this.achievementRepo
      .createQueryBuilder("a")
      .where("(a.organizationId = :orgId OR a.organizationId IS NULL)", {
        orgId: organizationId,
      })
      .andWhere("a.isActive = true")
      .orderBy("a.totalUnlocked", "DESC")
      .limit(5)
      .getMany();

    const rarest = await this.achievementRepo
      .createQueryBuilder("a")
      .where("(a.organizationId = :orgId OR a.organizationId IS NULL)", {
        orgId: organizationId,
      })
      .andWhere("a.isActive = true")
      .andWhere("a.totalUnlocked > 0")
      .orderBy("a.totalUnlocked", "ASC")
      .limit(5)
      .getMany();

    const pointsDistributed = await this.userAchievementRepo
      .createQueryBuilder("ua")
      .select("COALESCE(SUM(ua.pointsClaimed), 0)", "total")
      .where("ua.claimedAt IS NOT NULL")
      .getRawOne();

    return {
      totalAchievements,
      usersWithAchievements: parseInt(usersWithAchievements?.count ?? "0", 10),
      mostPopular: mostPopular.map((a) => ({
        id: a.id,
        name: a.name,
        totalUnlocked: a.totalUnlocked,
      })),
      rarest: rarest.map((a) => ({
        id: a.id,
        name: a.name,
        totalUnlocked: a.totalUnlocked,
      })),
      totalPointsDistributed: parseInt(pointsDistributed?.total ?? "0", 10),
    };
  }

  // ============================================================================
  // SEED: Default achievements
  // ============================================================================

  async seedDefaultAchievements(organizationId: string): Promise<number> {
    let created = 0;

    for (const def of DEFAULT_ACHIEVEMENTS) {
      const exists = await this.achievementRepo.findOne({
        where: {
          organizationId,
          conditionType: def.conditionType,
          conditionValue: def.conditionValue,
        },
      });

      if (!exists) {
        await this.achievementRepo.save(
          this.achievementRepo.create({
            organizationId,
            name: def.name,
            nameUz: def.nameUz,
            description: def.description,
            descriptionUz: def.descriptionUz,
            conditionType: def.conditionType,
            conditionValue: def.conditionValue,
            bonusPoints: def.bonusPoints,
            icon: def.icon,
            category: def.category,
            rarity: def.rarity,
          }),
        );
        created++;
      }
    }

    this.logger.log(
      `Seeded ${created} default achievements for org ${organizationId}`,
    );
    return created;
  }
}
