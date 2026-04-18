/**
 * Loyalty Service
 * Бизнес-логика системы лояльности VendHub
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan, MoreThan, DataSource } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron } from "@nestjs/schedule";
import { PointsTransaction } from "./entities/points-transaction.entity";
import { User } from "../users/entities/user.entity";
import {
  LoyaltyLevel,
  PointsTransactionType,
  PointsSource,
  LOYALTY_LEVELS,
  POINTS_RULES,
  getLoyaltyLevelByPoints,
  getPointsToNextLevel,
  calculateExpiryDate,
} from "./constants/loyalty.constants";
import {
  InternalEarnPointsDto,
  InternalSpendPointsDto,
  PointsHistoryQueryDto,
  LoyaltyStatsQueryDto,
  LeaderboardQueryDto,
  LoyaltyBalanceDto,
  LoyaltyLevelInfoDto,
  EarnPointsResultDto,
  SpendPointsResultDto,
  PointsHistoryResponseDto,
  PointsTransactionDto,
  LoyaltyStatsDto,
  AllLevelsInfoDto,
  LeaderboardResponseDto,
} from "./dto/loyalty.dto";
import { LoyaltyAnalyticsService } from "./services/loyalty-analytics.service";
import { BonusEngineService } from "./services/bonus-engine.service";

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectRepository(PointsTransaction)
    private readonly pointsTransactionRepo: Repository<PointsTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
    private readonly analyticsService: LoyaltyAnalyticsService,
    @Inject(forwardRef(() => BonusEngineService))
    private readonly bonusEngineService: BonusEngineService,
  ) {}

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Получить баланс и статус лояльности пользователя
   */
  async getBalance(userId: string): Promise<LoyaltyBalanceDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const [totalEarned, totalSpent, expiringIn30Days] = await Promise.all([
      this.getTotalEarned(userId),
      this.getTotalSpent(userId),
      this.getExpiringPoints(userId, 30),
    ]);

    const currentLevelInfo = this.getLevelInfo(
      user.loyaltyLevel || LoyaltyLevel.BRONZE,
    );
    const { nextLevel, pointsNeeded } = getPointsToNextLevel(
      user.pointsBalance || 0,
    );

    let nextLevelInfo: LoyaltyLevelInfoDto | null = null;
    let progressPercent = 100;

    if (nextLevel) {
      nextLevelInfo = this.getLevelInfo(nextLevel);
      const currentLevelMin =
        LOYALTY_LEVELS[user.loyaltyLevel || LoyaltyLevel.BRONZE].minPoints;
      const nextLevelMin = LOYALTY_LEVELS[nextLevel].minPoints;
      const range = nextLevelMin - currentLevelMin;
      const progress = (user.pointsBalance || 0) - currentLevelMin;
      progressPercent = Math.min(100, Math.floor((progress / range) * 100));
    }

    return {
      balance: user.pointsBalance || 0,
      currentLevel: currentLevelInfo,
      nextLevel: nextLevelInfo,
      pointsToNextLevel: pointsNeeded,
      progressPercent,
      totalEarned,
      totalSpent,
      expiringIn30Days,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      welcomeBonusReceived: user.welcomeBonusReceived || false,
    };
  }

  /**
   * Получить историю транзакций
   */
  async getHistory(
    userId: string,
    query: PointsHistoryQueryDto,
  ): Promise<PointsHistoryResponseDto> {
    const { type, source, dateFrom, dateTo, page = 1, limit = 20 } = query;

    const qb = this.pointsTransactionRepo
      .createQueryBuilder("pt")
      .where("pt.userId = :userId", { userId })
      .orderBy("pt.createdAt", "DESC");

    if (type) {
      qb.andWhere("pt.type = :type", { type });
    }

    if (source) {
      qb.andWhere("pt.source = :source", { source });
    }

    if (dateFrom) {
      qb.andWhere("pt.createdAt >= :dateFrom", {
        dateFrom: new Date(dateFrom),
      });
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      qb.andWhere("pt.createdAt <= :dateTo", { dateTo: endDate });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => this.mapToTransactionDto(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить информацию обо всех уровнях
   */
  async getAllLevels(userId?: string): Promise<AllLevelsInfoDto> {
    const levels = Object.values(LoyaltyLevel).map((level) =>
      this.getLevelInfo(level),
    );

    let currentLevel = LoyaltyLevel.BRONZE;
    let currentPoints = 0;

    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user) {
        currentLevel = user.loyaltyLevel || LoyaltyLevel.BRONZE;
        currentPoints = user.pointsBalance || 0;
      }
    }

    return {
      levels,
      currentLevel,
      currentPoints,
    };
  }

  // ============================================================================
  // POINTS OPERATIONS
  // ============================================================================

  /**
   * Начислить баллы
   */
  async earnPoints(dto: InternalEarnPointsDto): Promise<EarnPointsResultDto> {
    const {
      userId,
      organizationId,
      amount,
      source,
      referenceId,
      referenceType,
      description,
      descriptionUz,
      metadata,
    } = dto;

    if (amount <= 0) {
      throw new BadRequestException("Amount must be positive");
    }

    const user = await this.userRepo.findOne({
      where: { id: userId, organizationId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Apply bonus multiplier
    const levelConfig =
      LOYALTY_LEVELS[user.loyaltyLevel || LoyaltyLevel.BRONZE];
    const multipliedAmount = Math.floor(amount * levelConfig.bonusMultiplier);

    // Calculate new balance
    const currentBalance = user.pointsBalance || 0;
    const newBalance = currentBalance + multipliedAmount;

    // Create transaction
    const transaction = this.pointsTransactionRepo.create({
      organizationId,
      userId,
      type: PointsTransactionType.EARN,
      amount: multipliedAmount,
      balanceAfter: newBalance,
      source,
      referenceId,
      referenceType,
      description:
        description || this.generateDescription(source, multipliedAmount),
      descriptionUz:
        descriptionUz || this.generateDescriptionUz(source, multipliedAmount),
      metadata,
      expiresAt: calculateExpiryDate(),
      remainingAmount: multipliedAmount,
    });

    await this.pointsTransactionRepo.save(transaction);

    // Update user balance
    const oldLevel = user.loyaltyLevel || LoyaltyLevel.BRONZE;
    const newLevel = getLoyaltyLevelByPoints(newBalance);

    await this.userRepo.update(userId, {
      pointsBalance: newBalance,
      loyaltyLevel: newLevel,
    });

    // Check level up
    let levelUp: LoyaltyLevelInfoDto | null = null;
    if (newLevel !== oldLevel) {
      levelUp = this.getLevelInfo(newLevel);
      this.eventEmitter.emit("loyalty.level_up", {
        userId,
        oldLevel,
        newLevel,
        newBalance,
      });
    }

    // Emit event
    this.eventEmitter.emit("loyalty.points_earned", {
      userId,
      amount: multipliedAmount,
      source,
      referenceId,
      newBalance,
    });

    this.logger.log(
      `Earned ${multipliedAmount} points for user ${userId} from ${source}`,
    );

    return {
      earned: multipliedAmount,
      newBalance,
      levelUp,
      streakBonus: null,
      message: `Начислено ${multipliedAmount} баллов`,
    };
  }

  /**
   * Списать баллы
   */
  async spendPoints(
    dto: InternalSpendPointsDto,
  ): Promise<SpendPointsResultDto> {
    const {
      userId,
      organizationId,
      amount,
      referenceId,
      referenceType,
      description,
    } = dto;

    const result = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const txRepo = manager.getRepository(PointsTransaction);

      const user = await userRepo.findOne({
        where: { id: userId },
        lock: { mode: "pessimistic_write" },
      });
      if (!user) {
        throw new NotFoundException("User not found");
      }

      const currentBalance = user.pointsBalance || 0;

      if (amount > currentBalance) {
        throw new BadRequestException("Insufficient points balance");
      }

      if (amount < POINTS_RULES.minPointsToSpend) {
        throw new BadRequestException(
          `Minimum ${POINTS_RULES.minPointsToSpend} points to spend`,
        );
      }

      const newBalance = currentBalance - amount;

      const transaction = txRepo.create({
        organizationId,
        userId,
        type: PointsTransactionType.SPEND,
        amount: -amount,
        balanceAfter: newBalance,
        source: PointsSource.PURCHASE,
        referenceId,
        referenceType,
        description: description || `Списание ${amount} баллов`,
      });

      await txRepo.save(transaction);

      // FIFO deduction within the same transaction
      const earnTransactions = await txRepo.find({
        where: {
          userId,
          type: PointsTransactionType.EARN,
          isExpired: false,
          remainingAmount: MoreThan(0),
        },
        order: { createdAt: "ASC" },
        take: 1000,
      });

      let remaining = amount;
      for (const tx of earnTransactions) {
        if (remaining <= 0) break;
        const deductAmount = Math.min(remaining, tx.remainingAmount || 0);
        remaining -= deductAmount;
        await txRepo.update(tx.id, {
          remainingAmount: (tx.remainingAmount || 0) - deductAmount,
        });
      }

      await userRepo.update(userId, {
        pointsBalance: newBalance,
      });

      return {
        spent: amount,
        newBalance,
        discountAmount: amount * POINTS_RULES.pointsValue,
        transactionId: transaction.id,
      };
    });

    // Emit event outside transaction
    this.eventEmitter.emit("loyalty.points_spent", {
      userId: dto.userId,
      amount: dto.amount,
      referenceId: dto.referenceId,
      newBalance: result.newBalance,
    });

    this.logger.log(`Spent ${dto.amount} points for user ${dto.userId}`);

    return result;
  }

  /**
   * Админская корректировка баллов
   */
  async adjustPoints(
    userId: string,
    organizationId: string,
    amount: number,
    reason: string,
    adminId: string,
  ): Promise<EarnPointsResultDto | SpendPointsResultDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId, organizationId },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const currentBalance = user.pointsBalance || 0;
    const newBalance = currentBalance + amount;

    if (newBalance < 0) {
      throw new BadRequestException("Cannot adjust to negative balance");
    }

    const transaction = this.pointsTransactionRepo.create({
      organizationId,
      userId,
      type: PointsTransactionType.ADJUST,
      amount,
      balanceAfter: newBalance,
      source: PointsSource.ADMIN,
      description: `Корректировка: ${reason}`,
      adminId,
      adminReason: reason,
      expiresAt: amount > 0 ? calculateExpiryDate() : undefined,
      remainingAmount: amount > 0 ? amount : undefined,
    } as Partial<PointsTransaction>);

    await this.pointsTransactionRepo.save(transaction);

    // Update user
    const newLevel = getLoyaltyLevelByPoints(newBalance);
    await this.userRepo.update(userId, {
      pointsBalance: newBalance,
      loyaltyLevel: newLevel,
    });

    this.logger.log(
      `Admin ${adminId} adjusted ${amount} points for user ${userId}: ${reason}`,
    );

    if (amount > 0) {
      return {
        earned: amount,
        newBalance,
        levelUp: null,
        streakBonus: null,
        message: `Начислено ${amount} баллов (корректировка)`,
      };
    } else {
      return {
        spent: Math.abs(amount),
        newBalance,
        discountAmount: 0,
        transactionId: transaction.id,
      };
    }
  }

  // ============================================================================
  // BONUS METHODS (delegated to BonusEngineService)
  // ============================================================================

  /**
   * Начислить приветственный бонус
   */
  async processWelcomeBonus(
    userId: string,
    organizationId: string,
  ): Promise<EarnPointsResultDto | null> {
    return this.bonusEngineService.processWelcomeBonus(userId, organizationId);
  }

  /**
   * Начислить бонус за первый заказ
   */
  async processFirstOrderBonus(
    userId: string,
    organizationId: string,
    orderId: string,
  ): Promise<EarnPointsResultDto | null> {
    return this.bonusEngineService.processFirstOrderBonus(
      userId,
      organizationId,
      orderId,
    );
  }

  /**
   * Обработать баллы за заказ
   */
  async processOrderPoints(
    userId: string,
    organizationId: string,
    orderId: string,
    orderAmount: number,
  ): Promise<EarnPointsResultDto> {
    return this.bonusEngineService.processOrderPoints(
      userId,
      organizationId,
      orderId,
      orderAmount,
    );
  }

  // ============================================================================
  // STATISTICS (delegated to LoyaltyAnalyticsService)
  // ============================================================================

  /**
   * Получить статистику программы лояльности (для админов)
   */
  async getStats(
    organizationId: string,
    query: LoyaltyStatsQueryDto,
  ): Promise<LoyaltyStatsDto> {
    return this.analyticsService.getStats(organizationId, query);
  }

  /**
   * Получить пользователей с истекающими баллами (для админов)
   */
  async getExpiringPointsReport(organizationId: string, days: number = 30) {
    return this.analyticsService.getExpiringPointsReport(organizationId, days);
  }

  // ============================================================================
  // LEADERBOARD (delegated to LoyaltyAnalyticsService)
  // ============================================================================

  /**
   * Получить лидерборд пользователей
   */
  async getLeaderboard(
    organizationId: string,
    currentUserId: string,
    query: LeaderboardQueryDto,
  ): Promise<LeaderboardResponseDto> {
    return this.analyticsService.getLeaderboard(
      organizationId,
      currentUserId,
      query,
    );
  }

  // ============================================================================
  // CRON JOBS
  // ============================================================================

  /**
   * Истечение срока баллов (ежедневно в 01:00)
   */
  @Cron("0 1 * * *", { timeZone: "Asia/Tashkent" })
  async expirePoints(): Promise<void> {
    this.logger.log("Running points expiry job");

    const now = new Date();

    // Find expired transactions with remaining points
    const expiredTransactions = await this.pointsTransactionRepo.find({
      where: {
        type: PointsTransactionType.EARN,
        isExpired: false,
        expiresAt: LessThan(now),
        remainingAmount: MoreThan(0),
      },
      take: 500,
    });

    for (const tx of expiredTransactions) {
      if (tx.remainingAmount && tx.remainingAmount > 0) {
        // Get user
        const user = await this.userRepo.findOne({ where: { id: tx.userId } });
        if (!user) continue;

        const newBalance = Math.max(
          0,
          (user.pointsBalance || 0) - tx.remainingAmount,
        );

        // Create expiry transaction
        await this.pointsTransactionRepo.save({
          organizationId: tx.organizationId,
          userId: tx.userId,
          type: PointsTransactionType.EXPIRE,
          amount: -tx.remainingAmount,
          balanceAfter: newBalance,
          source: PointsSource.EXPIRY,
          referenceId: tx.id,
          referenceType: "points_transaction",
          description: `Истечение срока ${tx.remainingAmount} баллов`,
        });

        // Mark as expired
        await this.pointsTransactionRepo.update(tx.id, {
          isExpired: true,
          remainingAmount: 0,
        });

        // Update user balance
        await this.userRepo.update(tx.userId, {
          pointsBalance: newBalance,
          loyaltyLevel: getLoyaltyLevelByPoints(newBalance),
        });

        this.logger.log(
          `Expired ${tx.remainingAmount} points for user ${tx.userId}`,
        );
      }
    }

    this.logger.log(
      `Points expiry job completed. Processed ${expiredTransactions.length} transactions`,
    );
  }

  /**
   * Сброс streak при отсутствии заказов (ежедневно в 00:30)
   */
  @Cron("30 0 * * *", { timeZone: "Asia/Tashkent" })
  async resetBrokenStreaks(): Promise<void> {
    this.logger.log("Running streak reset job");

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(23, 59, 59, 999);

    // Reset streaks for users who haven't ordered in 2+ days
    const result = await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ currentStreak: 0 })
      .where("currentStreak > 0")
      .andWhere("lastOrderDate < :twoDaysAgo", { twoDaysAgo })
      .execute();

    this.logger.log(
      `Streak reset job completed. Reset ${result.affected} streaks`,
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getLevelInfo(level: LoyaltyLevel): LoyaltyLevelInfoDto {
    const config = LOYALTY_LEVELS[level];
    return {
      level,
      name: config.name,
      nameUz: config.nameUz,
      cashbackPercent: config.cashbackPercent,
      bonusMultiplier: config.bonusMultiplier,
      minPoints: config.minPoints,
      color: config.color,
      icon: config.icon,
    };
  }

  private async getTotalEarned(userId: string): Promise<number> {
    const result = await this.pointsTransactionRepo
      .createQueryBuilder("pt")
      .select("SUM(pt.amount)", "total")
      .where("pt.userId = :userId", { userId })
      .andWhere("pt.type = :type", { type: PointsTransactionType.EARN })
      .getRawOne();
    return parseInt(result?.total) || 0;
  }

  private async getTotalSpent(userId: string): Promise<number> {
    const result = await this.pointsTransactionRepo
      .createQueryBuilder("pt")
      .select("SUM(ABS(pt.amount))", "total")
      .where("pt.userId = :userId", { userId })
      .andWhere("pt.type = :type", { type: PointsTransactionType.SPEND })
      .getRawOne();
    return parseInt(result?.total) || 0;
  }

  private async getExpiringPoints(
    userId: string,
    days: number,
  ): Promise<number> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const result = await this.pointsTransactionRepo
      .createQueryBuilder("pt")
      .select("SUM(pt.remainingAmount)", "total")
      .where("pt.userId = :userId", { userId })
      .andWhere("pt.type = :type", { type: PointsTransactionType.EARN })
      .andWhere("pt.isExpired = :isExpired", { isExpired: false })
      .andWhere("pt.expiresAt <= :expiryDate", { expiryDate })
      .andWhere("pt.remainingAmount > 0")
      .getRawOne();
    return parseInt(result?.total) || 0;
  }

  private mapToTransactionDto(tx: PointsTransaction): PointsTransactionDto {
    const icons: Record<PointsSource, string> = {
      [PointsSource.ORDER]: "🛒",
      [PointsSource.WELCOME_BONUS]: "🎁",
      [PointsSource.FIRST_ORDER]: "🎉",
      [PointsSource.REFERRAL]: "👥",
      [PointsSource.REFERRAL_BONUS]: "🤝",
      [PointsSource.ACHIEVEMENT]: "🏆",
      [PointsSource.DAILY_QUEST]: "📅",
      [PointsSource.WEEKLY_QUEST]: "📆",
      [PointsSource.MONTHLY_QUEST]: "📆",
      [PointsSource.STREAK_BONUS]: "🔥",
      [PointsSource.PROMO]: "🎫",
      [PointsSource.ADMIN]: "👨‍💼",
      [PointsSource.BIRTHDAY]: "🎂",
      [PointsSource.PURCHASE]: "💳",
      [PointsSource.REFUND]: "↩️",
      [PointsSource.EXPIRY]: "⏰",
    };

    return {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      source: tx.source,
      description: tx.description || "",
      createdAt: tx.createdAt,
      expiresAt: tx.expiresAt || null,
      icon: icons[tx.source] || "💰",
      color: tx.amount > 0 ? "green" : tx.amount < 0 ? "red" : "gray",
    };
  }

  private generateDescription(source: PointsSource, amount: number): string {
    const descriptions: Record<PointsSource, string> = {
      [PointsSource.ORDER]: `За покупку (+${amount})`,
      [PointsSource.WELCOME_BONUS]: "Приветственный бонус",
      [PointsSource.FIRST_ORDER]: "Бонус за первый заказ",
      [PointsSource.REFERRAL]: "За приглашенного друга",
      [PointsSource.REFERRAL_BONUS]: "Бонус по приглашению",
      [PointsSource.ACHIEVEMENT]: "За достижение",
      [PointsSource.DAILY_QUEST]: "Ежедневный квест",
      [PointsSource.WEEKLY_QUEST]: "Еженедельный квест",
      [PointsSource.MONTHLY_QUEST]: "Ежемесячный квест",
      [PointsSource.STREAK_BONUS]: "Бонус за серию",
      [PointsSource.PROMO]: "Промо-акция",
      [PointsSource.ADMIN]: "Корректировка",
      [PointsSource.BIRTHDAY]: "С днем рождения!",
      [PointsSource.PURCHASE]: "Списание баллов",
      [PointsSource.REFUND]: "Возврат баллов",
      [PointsSource.EXPIRY]: "Истечение срока",
    };
    return descriptions[source] || "Операция с баллами";
  }

  private generateDescriptionUz(source: PointsSource, amount: number): string {
    const descriptions: Record<PointsSource, string> = {
      [PointsSource.ORDER]: `Xarid uchun (+${amount})`,
      [PointsSource.WELCOME_BONUS]: "Xush kelibsiz bonusi",
      [PointsSource.FIRST_ORDER]: "Birinchi buyurtma uchun bonus",
      [PointsSource.REFERRAL]: "Do'stni taklif qilgani uchun",
      [PointsSource.REFERRAL_BONUS]: "Taklif bonusi",
      [PointsSource.ACHIEVEMENT]: "Yutuq uchun",
      [PointsSource.DAILY_QUEST]: "Kunlik vazifa",
      [PointsSource.WEEKLY_QUEST]: "Haftalik vazifa",
      [PointsSource.MONTHLY_QUEST]: "Oylik vazifa",
      [PointsSource.STREAK_BONUS]: "Ketma-ket kunlar uchun bonus",
      [PointsSource.PROMO]: "Aksiya",
      [PointsSource.ADMIN]: "Tuzatish",
      [PointsSource.BIRTHDAY]: "Tug'ilgan kuningiz bilan!",
      [PointsSource.PURCHASE]: "Ballarni ishlatish",
      [PointsSource.REFUND]: "Ballarni qaytarish",
      [PointsSource.EXPIRY]: "Muddat tugashi",
    };
    return descriptions[source] || "Ballar operatsiyasi";
  }
}
