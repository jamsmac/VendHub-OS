/**
 * Loyalty Analytics Service
 * Аналитика, отчёты и лидерборд программы лояльности
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, In } from "typeorm";
import { PointsTransaction } from "../entities/points-transaction.entity";
import { User } from "../../users/entities/user.entity";
import {
  LoyaltyLevel,
  PointsTransactionType,
  PointsSource,
} from "../constants/loyalty.constants";
import {
  LoyaltyStatsQueryDto,
  LeaderboardQueryDto,
  LoyaltyStatsDto,
  LeaderboardResponseDto,
  LeaderboardEntryDto,
} from "../dto/loyalty.dto";

@Injectable()
export class LoyaltyAnalyticsService {
  private readonly logger = new Logger(LoyaltyAnalyticsService.name);

  constructor(
    @InjectRepository(PointsTransaction)
    private readonly pointsTransactionRepo: Repository<PointsTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Получить статистику программы лояльности (для админов)
   */
  async getStats(
    organizationId: string,
    query: LoyaltyStatsQueryDto,
  ): Promise<LoyaltyStatsDto> {
    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();
    dateTo.setHours(23, 59, 59, 999);

    // Get totals
    const [totalMembers, activeMembers, newMembers] = await Promise.all([
      this.userRepo.count({ where: { organizationId } }),
      this.pointsTransactionRepo
        .createQueryBuilder("pt")
        .select("COUNT(DISTINCT pt.userId)", "count")
        .where("pt.organizationId = :organizationId", { organizationId })
        .andWhere("pt.createdAt BETWEEN :dateFrom AND :dateTo", {
          dateFrom,
          dateTo,
        })
        .getRawOne()
        .then((r) => parseInt(r.count) || 0),
      this.userRepo.count({
        where: {
          organizationId,
          createdAt: Between(dateFrom, dateTo),
        },
      }),
    ]);

    // Level distribution
    const levelCounts = await this.userRepo
      .createQueryBuilder("u")
      .select("u.loyaltyLevel", "level")
      .addSelect("COUNT(*)", "count")
      .where("u.organizationId = :organizationId", { organizationId })
      .groupBy("u.loyaltyLevel")
      .getRawMany();

    const levelDistribution = Object.values(LoyaltyLevel).map((level) => {
      const found = levelCounts.find((lc) => lc.level === level);
      const count = found ? parseInt(found.count) : 0;
      return {
        level,
        count,
        percent:
          totalMembers > 0
            ? Math.round((count / totalMembers) * 10000) / 100
            : 0,
      };
    });

    // Points totals
    const pointsTotals = await this.pointsTransactionRepo
      .createQueryBuilder("pt")
      .select([
        "SUM(CASE WHEN pt.type = :earn THEN pt.amount ELSE 0 END) as totalEarned",
        "SUM(CASE WHEN pt.type = :spend THEN ABS(pt.amount) ELSE 0 END) as totalSpent",
      ])
      .where("pt.organizationId = :organizationId", { organizationId })
      .andWhere("pt.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .setParameters({
        earn: PointsTransactionType.EARN,
        spend: PointsTransactionType.SPEND,
      })
      .getRawOne();

    const totalEarned = parseInt(pointsTotals.totalEarned) || 0;
    const totalSpent = parseInt(pointsTotals.totalSpent) || 0;

    // Average balance
    const avgBalance = await this.userRepo
      .createQueryBuilder("u")
      .select("AVG(u.pointsBalance)", "avg")
      .where("u.organizationId = :organizationId", { organizationId })
      .getRawOne()
      .then((r) => Math.round(parseFloat(r.avg) || 0));

    // Top earn sources
    const topSources = await this.pointsTransactionRepo
      .createQueryBuilder("pt")
      .select("pt.source", "source")
      .addSelect("SUM(pt.amount)", "total")
      .where("pt.organizationId = :organizationId", { organizationId })
      .andWhere("pt.type = :type", { type: PointsTransactionType.EARN })
      .andWhere("pt.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      })
      .groupBy("pt.source")
      .orderBy("total", "DESC")
      .limit(5)
      .getRawMany();

    const topEarnSources = topSources.map((ts) => ({
      source: ts.source as PointsSource,
      total: parseInt(ts.total) || 0,
      percent:
        totalEarned > 0
          ? Math.round((parseInt(ts.total) / totalEarned) * 10000) / 100
          : 0,
    }));

    return {
      period: { from: dateFrom, to: dateTo },
      totalMembers,
      activeMembers,
      newMembers,
      levelDistribution,
      totalEarned,
      totalSpent,
      averageBalance: avgBalance,
      redemptionRate:
        totalEarned > 0
          ? Math.round((totalSpent / totalEarned) * 10000) / 100
          : 0,
      topEarnSources,
      timeline: [], // Would need additional query for timeline
    };
  }

  /**
   * Получить пользователей с истекающими баллами (для админов)
   */
  async getExpiringPointsReport(organizationId: string, days: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const results = await this.pointsTransactionRepo
      .createQueryBuilder("pt")
      .select("pt.userId", "userId")
      .addSelect("SUM(pt.remainingAmount)", "expiringPoints")
      .addSelect("MIN(pt.expiresAt)", "earliestExpiry")
      .where("pt.organizationId = :organizationId", { organizationId })
      .andWhere("pt.type = :type", { type: PointsTransactionType.EARN })
      .andWhere("pt.isExpired = :isExpired", { isExpired: false })
      .andWhere("pt.expiresAt <= :expiryDate", { expiryDate })
      .andWhere("pt.remainingAmount > 0")
      .groupBy("pt.userId")
      .orderBy('"expiringPoints"', "DESC")
      .getRawMany();

    const userIds = results.map((r) => r.userId);
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      days,
      totalUsers: results.length,
      totalExpiringPoints: results.reduce(
        (s, r) => s + parseInt(r.expiringPoints || "0"),
        0,
      ),
      users: results.map((r) => {
        const user = userMap.get(r.userId);
        return {
          userId: r.userId,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          expiringPoints: parseInt(r.expiringPoints || "0"),
          earliestExpiry: r.earliestExpiry,
        };
      }),
    };
  }

  /**
   * Получить лидерборд пользователей
   */
  async getLeaderboard(
    organizationId: string,
    currentUserId: string,
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    const { period = "month", limit = 50 } = query;

    // Determine date range
    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case "week":
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case "month":
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "all":
      default:
        periodStart = new Date(2020, 0, 1); // beginning of time
        break;
    }

    const periodEnd = new Date(now);
    periodEnd.setHours(23, 59, 59, 999);

    // Query: aggregate earned points per user in the period
    const leaderboardQb = this.pointsTransactionRepo
      .createQueryBuilder("pt")
      .select("pt.userId", "userId")
      .addSelect("SUM(pt.amount)", "pointsEarned")
      .innerJoin(User, "u", "u.id = pt.userId")
      .addSelect("u.firstName", "firstName")
      .addSelect("u.lastName", "lastName")
      .addSelect("u.loyaltyLevel", "loyaltyLevel")
      .addSelect("u.pointsBalance", "pointsBalance")
      .addSelect("u.currentStreak", "currentStreak")
      .addSelect("u.avatarUrl", "avatarUrl")
      .where("pt.organizationId = :organizationId", { organizationId })
      .andWhere("pt.type = :type", { type: PointsTransactionType.EARN })
      .andWhere("pt.createdAt >= :periodStart", { periodStart })
      .andWhere("pt.createdAt <= :periodEnd", { periodEnd })
      .groupBy("pt.userId")
      .addGroupBy("u.id")
      .orderBy('"pointsEarned"', "DESC")
      .limit(limit);

    const rawEntries = await leaderboardQb.getRawMany();

    // Map to DTOs with rank
    const entries: LeaderboardEntryDto[] = rawEntries.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      firstName: row.firstName || "Пользователь",
      lastNameInitial: row.lastName ? row.lastName.charAt(0) + "." : "",
      loyaltyLevel: row.loyaltyLevel || LoyaltyLevel.BRONZE,
      pointsBalance: parseInt(row.pointsBalance) || 0,
      pointsEarned: parseInt(row.pointsEarned) || 0,
      currentStreak: parseInt(row.currentStreak) || 0,
      avatarUrl: row.avatarUrl || null,
    }));

    // Find current user's position
    let myRank: number | null = null;
    let myEntry: LeaderboardEntryDto | null = null;

    const foundEntry = entries.find((e) => e.userId === currentUserId);
    if (foundEntry) {
      myRank = foundEntry.rank;
      myEntry = foundEntry;
    } else {
      // User is not in top N, find their actual rank
      const userRankResult = await this.pointsTransactionRepo
        .createQueryBuilder("pt")
        .select("pt.userId", "userId")
        .addSelect("SUM(pt.amount)", "pointsEarned")
        .where("pt.organizationId = :organizationId", { organizationId })
        .andWhere("pt.type = :type", { type: PointsTransactionType.EARN })
        .andWhere("pt.createdAt >= :periodStart", { periodStart })
        .andWhere("pt.createdAt <= :periodEnd", { periodEnd })
        .groupBy("pt.userId")
        .having("pt.userId = :currentUserId", { currentUserId })
        .getRawOne();

      if (userRankResult) {
        const userEarned = parseInt(userRankResult.pointsEarned) || 0;

        // Count how many users have more points
        const rankCountResult = await this.pointsTransactionRepo
          .createQueryBuilder("pt")
          .select("COUNT(DISTINCT pt.userId)", "count")
          .where("pt.organizationId = :organizationId", { organizationId })
          .andWhere("pt.type = :type", { type: PointsTransactionType.EARN })
          .andWhere("pt.createdAt >= :periodStart", { periodStart })
          .andWhere("pt.createdAt <= :periodEnd", { periodEnd })
          .groupBy("pt.userId")
          .having("SUM(pt.amount) > :userEarned", { userEarned })
          .getRawMany();

        myRank = (rankCountResult?.length || 0) + 1;

        const user = await this.userRepo.findOne({
          where: { id: currentUserId },
        });
        if (user) {
          myEntry = {
            rank: myRank,
            userId: currentUserId,
            firstName: user.firstName || "Пользователь",
            lastNameInitial: user.lastName ? user.lastName.charAt(0) + "." : "",
            loyaltyLevel: user.loyaltyLevel || LoyaltyLevel.BRONZE,
            pointsBalance: user.pointsBalance || 0,
            pointsEarned: userEarned,
            currentStreak: user.currentStreak || 0,
            avatarUrl: user.avatar || null,
          };
        }
      }
    }

    return {
      period,
      periodStart,
      periodEnd,
      entries,
      myRank,
      myEntry,
    };
  }
}
