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
      .where("(a.organization_id = :orgId OR a.organization_id IS NULL)", {
        orgId: organizationId,
      })
      .orderBy("a.display_order", "ASC")
      .addOrderBy("a.created_at", "ASC");

    if (filter?.category) {
      qb.andWhere("a.category = :category", { category: filter.category });
    }
    if (filter?.rarity) {
      qb.andWhere("a.rarity = :rarity", { rarity: filter.rarity });
    }
    if (filter?.is_active !== undefined) {
      qb.andWhere("a.is_active = :isActive", { isActive: filter.is_active });
    }

    return qb.getMany();
  }

  async getAchievementById(
    id: string,
    organizationId: string,
  ): Promise<Achievement> {
    const achievement = await this.achievementRepo.findOne({
      where: [
        { id, organization_id: organizationId },
        { id, organization_id: IsNull() },
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
      organization_id: organizationId,
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
    if (!achievement.organization_id) {
      throw new BadRequestException("Cannot edit global achievements");
    }

    Object.assign(achievement, dto);
    return this.achievementRepo.save(achievement);
  }

  async deleteAchievement(id: string, organizationId: string): Promise<void> {
    const achievement = await this.getAchievementById(id, organizationId);

    if (!achievement.organization_id) {
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
      where: { is_active: true },
      order: { display_order: "ASC" },
    });

    // Get user's achievements
    const userAchievements = await this.userAchievementRepo.find({
      where: { user_id: userId },
      relations: ["achievement"],
    });

    const userAchMap = new Map(
      userAchievements.map((ua) => [ua.achievement_id, ua]),
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
      if (ach.is_hidden && (!ua || !ua.is_unlocked)) continue;

      // Category stats
      if (!byCategory[ach.category]) {
        byCategory[ach.category] = { total: 0, unlocked: 0 };
      }
      byCategory[ach.category].total++;

      const isUnlocked = ua?.is_unlocked ?? false;
      if (isUnlocked) {
        totalUnlocked++;
        byCategory[ach.category].unlocked++;
        if (ua?.points_claimed) {
          totalPointsEarned += ua.points_claimed;
        }
        if (ua && !ua.claimed_at) {
          unclaimedPoints += ach.bonus_points;
        }
      }

      allUserAchievements.push({
        id: ua?.id ?? "",
        achievement: {
          id: ach.id,
          name: ach.name,
          name_uz: ach.name_uz,
          description: ach.description,
          description_uz: ach.description_uz,
          icon: ach.icon,
          image_url: ach.image_url,
          category: ach.category,
          rarity: ach.rarity,
          bonus_points: ach.bonus_points,
          condition_type: ach.condition_type,
          condition_value: ach.condition_value,
        },
        current_value: ua?.current_value ?? 0,
        target_value: ach.condition_value,
        progress_percent: ua
          ? Math.min(
              100,
              Math.floor((ua.current_value / ach.condition_value) * 100),
            )
          : 0,
        is_unlocked: isUnlocked,
        unlocked_at: ua?.unlocked_at ?? null,
        is_claimed: !!ua?.claimed_at,
      });
    }

    // Recent (last 5 unlocked)
    const recent = allUserAchievements
      .filter((a) => a.is_unlocked)
      .sort((a, b) => {
        const dateA = a.unlocked_at ? new Date(a.unlocked_at).getTime() : 0;
        const dateB = b.unlocked_at ? new Date(b.unlocked_at).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);

    // In progress (not unlocked, has some progress)
    const inProgress = allUserAchievements
      .filter((a) => !a.is_unlocked && a.current_value > 0)
      .sort((a, b) => b.progress_percent - a.progress_percent)
      .slice(0, 5);

    return {
      total: achievements.filter((a) => !a.is_hidden).length,
      unlocked: totalUnlocked,
      total_points_earned: totalPointsEarned,
      unclaimed_points: unclaimedPoints,
      by_category: byCategory,
      recent,
      in_progress: inProgress,
    };
  }

  async getUserAchievements(userId: string): Promise<UserAchievementDto[]> {
    const achievements = await this.achievementRepo.find({
      where: { is_active: true },
      order: { display_order: "ASC" },
    });

    const userAchievements = await this.userAchievementRepo.find({
      where: { user_id: userId },
    });

    const userAchMap = new Map(
      userAchievements.map((ua) => [ua.achievement_id, ua]),
    );

    return achievements
      .filter((ach) => {
        const ua = userAchMap.get(ach.id);
        return !ach.is_hidden || (ua && ua.is_unlocked);
      })
      .map((ach) => {
        const ua = userAchMap.get(ach.id);
        return {
          id: ua?.id ?? "",
          achievement: {
            id: ach.id,
            name: ach.name,
            name_uz: ach.name_uz,
            description: ach.description,
            description_uz: ach.description_uz,
            icon: ach.icon,
            image_url: ach.image_url,
            category: ach.category,
            rarity: ach.rarity,
            bonus_points: ach.bonus_points,
            condition_type: ach.condition_type,
            condition_value: ach.condition_value,
          },
          current_value: ua?.current_value ?? 0,
          target_value: ach.condition_value,
          progress_percent: ua
            ? Math.min(
                100,
                Math.floor((ua.current_value / ach.condition_value) * 100),
              )
            : 0,
          is_unlocked: ua?.is_unlocked ?? false,
          unlocked_at: ua?.unlocked_at ?? null,
          is_claimed: !!ua?.claimed_at,
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
      where: { id: userAchievementId, user_id: userId },
      relations: ["achievement"],
    });

    if (!ua) {
      throw new NotFoundException("Achievement not found");
    }
    if (!ua.is_unlocked) {
      throw new BadRequestException("Achievement not yet unlocked");
    }
    if (ua.claimed_at) {
      throw new BadRequestException("Reward already claimed");
    }

    const pointsToAward = ua.achievement.bonus_points;

    // Award points via loyalty
    const result = await this.loyaltyService.earnPoints({
      userId,
      organizationId: ua.achievement.organization_id,
      amount: pointsToAward,
      source: "achievement",
      referenceId: ua.achievement.id,
      referenceType: "achievement",
      description: `За достижение: ${ua.achievement.name}`,
    });

    // Mark as claimed
    ua.claimed_at = new Date();
    ua.points_claimed = pointsToAward;
    await this.userAchievementRepo.save(ua);

    return {
      success: true,
      points_claimed: pointsToAward,
      achievement_name: ua.achievement.name,
      new_balance: result.newBalance,
    };
  }

  async claimAllRewards(userId: string): Promise<ClaimAchievementResultDto[]> {
    const unclaimed = await this.userAchievementRepo.find({
      where: {
        user_id: userId,
        is_unlocked: true,
        claimed_at: IsNull(),
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
        condition_type: conditionType,
        is_active: true,
      },
    });

    if (!achievements.length) return [];

    const newlyUnlocked: UserAchievement[] = [];

    for (const achievement of achievements) {
      // Get or create user achievement
      let ua = await this.userAchievementRepo.findOne({
        where: {
          user_id: userId,
          achievement_id: achievement.id,
        },
      });

      if (ua?.is_unlocked) continue; // Already unlocked

      if (!ua) {
        ua = this.userAchievementRepo.create({
          user_id: userId,
          achievement_id: achievement.id,
          current_value: 0,
          target_value: achievement.condition_value,
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
          ua.current_value = value;
          break;

        case AchievementConditionType.ORDER_AMOUNT:
          ua.current_value = value;
          break;

        case AchievementConditionType.UNIQUE_PRODUCTS:
        case AchievementConditionType.UNIQUE_MACHINES:
          // Accumulate unique values
          const details = ua.progress_details || {};
          const key =
            conditionType === AchievementConditionType.UNIQUE_PRODUCTS
              ? "tried_products"
              : "visited_machines";
          const existing: string[] = (details[key] as string[]) || [];
          const newId = metadata?.id;
          if (newId && !existing.includes(newId)) {
            existing.push(newId);
            details[key] = existing;
            ua.progress_details = details;
            ua.current_value = existing.length;
          }
          break;

        case AchievementConditionType.FIRST_ORDER:
        case AchievementConditionType.EARLY_BIRD:
        case AchievementConditionType.NIGHT_OWL:
        case AchievementConditionType.WEEKEND_WARRIOR:
          ua.current_value = value;
          break;

        case AchievementConditionType.LOYALTY_LEVEL:
          // value is the numeric level index
          ua.current_value = value;
          break;
      }

      // Check if unlocked
      if (ua.current_value >= achievement.condition_value && !ua.is_unlocked) {
        ua.is_unlocked = true;
        ua.unlocked_at = new Date();

        // Update achievement stats
        await this.achievementRepo.increment(
          { id: achievement.id },
          "total_unlocked",
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
          bonusPoints: achievement.bonus_points,
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
        { organization_id: organizationId, is_active: true },
        { organization_id: IsNull(), is_active: true },
      ],
    });

    const usersWithAchievements = await this.userAchievementRepo
      .createQueryBuilder("ua")
      .select("COUNT(DISTINCT ua.user_id)", "count")
      .where("ua.is_unlocked = true")
      .getRawOne();

    const mostPopular = await this.achievementRepo
      .createQueryBuilder("a")
      .where("(a.organization_id = :orgId OR a.organization_id IS NULL)", {
        orgId: organizationId,
      })
      .andWhere("a.is_active = true")
      .orderBy("a.total_unlocked", "DESC")
      .limit(5)
      .getMany();

    const rarest = await this.achievementRepo
      .createQueryBuilder("a")
      .where("(a.organization_id = :orgId OR a.organization_id IS NULL)", {
        orgId: organizationId,
      })
      .andWhere("a.is_active = true")
      .andWhere("a.total_unlocked > 0")
      .orderBy("a.total_unlocked", "ASC")
      .limit(5)
      .getMany();

    const pointsDistributed = await this.userAchievementRepo
      .createQueryBuilder("ua")
      .select("COALESCE(SUM(ua.points_claimed), 0)", "total")
      .where("ua.claimed_at IS NOT NULL")
      .getRawOne();

    return {
      total_achievements: totalAchievements,
      users_with_achievements: parseInt(
        usersWithAchievements?.count ?? "0",
        10,
      ),
      most_popular: mostPopular.map((a) => ({
        id: a.id,
        name: a.name,
        total_unlocked: a.total_unlocked,
      })),
      rarest: rarest.map((a) => ({
        id: a.id,
        name: a.name,
        total_unlocked: a.total_unlocked,
      })),
      total_points_distributed: parseInt(pointsDistributed?.total ?? "0", 10),
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
          organization_id: organizationId,
          condition_type: def.conditionType,
          condition_value: def.conditionValue,
        },
      });

      if (!exists) {
        await this.achievementRepo.save(
          this.achievementRepo.create({
            organization_id: organizationId,
            name: def.name,
            name_uz: def.nameUz,
            description: def.description,
            description_uz: def.descriptionUz,
            condition_type: def.conditionType,
            condition_value: def.conditionValue,
            bonus_points: def.bonusPoints,
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
