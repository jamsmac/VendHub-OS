/**
 * Loyalty Service
 * Бизнес-логика системы лояльности VendHub
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { PointsTransaction } from './entities/points-transaction.entity';
import { User } from '../users/entities/user.entity';
import {
  LoyaltyLevel,
  PointsTransactionType,
  PointsSource,
  LOYALTY_LEVELS,
  LOYALTY_BONUSES,
  POINTS_RULES,
  getLoyaltyLevelByPoints,
  getPointsToNextLevel,
  calculateOrderPoints,
  getStreakBonus,
  calculateExpiryDate,
} from './constants/loyalty.constants';
import {
  InternalEarnPointsDto,
  InternalSpendPointsDto,
  PointsHistoryQueryDto,
  LoyaltyStatsQueryDto,
  LoyaltyBalanceDto,
  LoyaltyLevelInfoDto,
  EarnPointsResultDto,
  SpendPointsResultDto,
  PointsHistoryResponseDto,
  PointsTransactionDto,
  LoyaltyStatsDto,
  AllLevelsInfoDto,
} from './dto/loyalty.dto';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectRepository(PointsTransaction)
    private readonly pointsTransactionRepo: Repository<PointsTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
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
      throw new NotFoundException('User not found');
    }

    const [totalEarned, totalSpent, expiringIn30Days] = await Promise.all([
      this.getTotalEarned(userId),
      this.getTotalSpent(userId),
      this.getExpiringPoints(userId, 30),
    ]);

    const currentLevelInfo = this.getLevelInfo(user.loyaltyLevel || LoyaltyLevel.BRONZE);
    const { nextLevel, pointsNeeded } = getPointsToNextLevel(user.pointsBalance || 0);

    let nextLevelInfo: LoyaltyLevelInfoDto | null = null;
    let progressPercent = 100;

    if (nextLevel) {
      nextLevelInfo = this.getLevelInfo(nextLevel);
      const currentLevelMin = LOYALTY_LEVELS[user.loyaltyLevel || LoyaltyLevel.BRONZE].minPoints;
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
      .createQueryBuilder('pt')
      .where('pt.userId = :userId', { userId })
      .orderBy('pt.createdAt', 'DESC');

    if (type) {
      qb.andWhere('pt.type = :type', { type });
    }

    if (source) {
      qb.andWhere('pt.source = :source', { source });
    }

    if (dateFrom) {
      qb.andWhere('pt.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      qb.andWhere('pt.createdAt <= :dateTo', { dateTo: endDate });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(item => this.mapToTransactionDto(item)),
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
    const levels = Object.values(LoyaltyLevel).map(level => this.getLevelInfo(level));

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
    const { userId, organizationId, amount, source, referenceId, referenceType, description, descriptionUz, metadata } = dto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Apply bonus multiplier
    const levelConfig = LOYALTY_LEVELS[user.loyaltyLevel || LoyaltyLevel.BRONZE];
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
      description: description || this.generateDescription(source, multipliedAmount),
      descriptionUz: descriptionUz || this.generateDescriptionUz(source, multipliedAmount),
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
      this.eventEmitter.emit('loyalty.level_up', {
        userId,
        oldLevel,
        newLevel,
        newBalance,
      });
    }

    // Emit event
    this.eventEmitter.emit('loyalty.points_earned', {
      userId,
      amount: multipliedAmount,
      source,
      referenceId,
      newBalance,
    });

    this.logger.log(`Earned ${multipliedAmount} points for user ${userId} from ${source}`);

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
  async spendPoints(dto: InternalSpendPointsDto): Promise<SpendPointsResultDto> {
    const { userId, organizationId, amount, referenceId, referenceType, description } = dto;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentBalance = user.pointsBalance || 0;

    // Validate spend
    if (amount > currentBalance) {
      throw new BadRequestException('Insufficient points balance');
    }

    if (amount < POINTS_RULES.minPointsToSpend) {
      throw new BadRequestException(`Minimum ${POINTS_RULES.minPointsToSpend} points to spend`);
    }

    const newBalance = currentBalance - amount;

    // Create transaction
    const transaction = this.pointsTransactionRepo.create({
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

    await this.pointsTransactionRepo.save(transaction);

    // Deduct from oldest non-expired transactions first (FIFO)
    await this.deductFromOldestTransactions(userId, amount);

    // Update user balance
    await this.userRepo.update(userId, {
      pointsBalance: newBalance,
    });

    // Emit event
    this.eventEmitter.emit('loyalty.points_spent', {
      userId,
      amount,
      referenceId,
      newBalance,
    });

    this.logger.log(`Spent ${amount} points for user ${userId}`);

    return {
      spent: amount,
      newBalance,
      discountAmount: amount * POINTS_RULES.pointsValue,
      transactionId: transaction.id,
    };
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
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentBalance = user.pointsBalance || 0;
    const newBalance = currentBalance + amount;

    if (newBalance < 0) {
      throw new BadRequestException('Cannot adjust to negative balance');
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
    } as any);

    await this.pointsTransactionRepo.save(transaction);

    // Update user
    const newLevel = getLoyaltyLevelByPoints(newBalance);
    await this.userRepo.update(userId, {
      pointsBalance: newBalance,
      loyaltyLevel: newLevel,
    });

    this.logger.log(`Admin ${adminId} adjusted ${amount} points for user ${userId}: ${reason}`);

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
        transactionId: (transaction as any).id,
      };
    }
  }

  // ============================================================================
  // BONUS METHODS
  // ============================================================================

  /**
   * Начислить приветственный бонус
   */
  async processWelcomeBonus(userId: string, organizationId: string): Promise<EarnPointsResultDto | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.welcomeBonusReceived) {
      return null;
    }

    await this.userRepo.update(userId, { welcomeBonusReceived: true });

    return this.earnPoints({
      userId,
      organizationId,
      amount: LOYALTY_BONUSES.welcome,
      source: PointsSource.WELCOME_BONUS,
      description: 'Приветственный бонус',
      descriptionUz: 'Xush kelibsiz bonusi',
    });
  }

  /**
   * Начислить бонус за первый заказ
   */
  async processFirstOrderBonus(userId: string, organizationId: string, orderId: string): Promise<EarnPointsResultDto | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || (user.totalOrders || 0) > 1) {
      return null;
    }

    return this.earnPoints({
      userId,
      organizationId,
      amount: LOYALTY_BONUSES.firstOrder,
      source: PointsSource.FIRST_ORDER,
      referenceId: orderId,
      referenceType: 'order',
      description: 'Бонус за первый заказ',
      descriptionUz: 'Birinchi buyurtma uchun bonus',
    });
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
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const basePoints = calculateOrderPoints(orderAmount, user.loyaltyLevel || LoyaltyLevel.BRONZE);

    // Update user stats
    await this.userRepo.update(userId, {
      totalOrders: (user.totalOrders || 0) + 1,
      totalSpent: Number(user.totalSpent || 0) + orderAmount,
      lastOrderDate: new Date(),
    });

    // Check streak
    const streakResult = await this.updateStreak(userId);

    // Earn points
    const result = await this.earnPoints({
      userId,
      organizationId,
      amount: basePoints,
      source: PointsSource.ORDER,
      referenceId: orderId,
      referenceType: 'order',
      description: `За заказ #${orderId.substring(0, 8)}`,
      metadata: { orderAmount },
    });

    // Add streak bonus if achieved milestone
    if (streakResult) {
      result.streakBonus = streakResult;
      await this.earnPoints({
        userId,
        organizationId,
        amount: streakResult.bonus,
        source: PointsSource.STREAK_BONUS,
        referenceId: orderId,
        referenceType: 'order',
        description: streakResult.message,
      });
    }

    return result;
  }

  /**
   * Обновить streak пользователя
   */
  private async updateStreak(userId: string): Promise<{ bonus: number; message: string } | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastOrderDate = user.lastOrderDate ? new Date(user.lastOrderDate) : null;
    if (lastOrderDate) {
      lastOrderDate.setHours(0, 0, 0, 0);
    }

    let newStreak = 1;

    if (lastOrderDate) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastOrderDate.getTime() === yesterday.getTime()) {
        // Consecutive day
        newStreak = (user.currentStreak || 0) + 1;
      } else if (lastOrderDate.getTime() === today.getTime()) {
        // Same day - keep streak
        newStreak = user.currentStreak || 1;
      }
      // Otherwise reset to 1
    }

    const newLongestStreak = Math.max(newStreak, user.longestStreak || 0);

    await this.userRepo.update(userId, {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
    });

    // Check milestone
    return getStreakBonus(newStreak);
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Получить статистику программы лояльности (для админов)
   */
  async getStats(organizationId: string, query: LoyaltyStatsQueryDto): Promise<LoyaltyStatsDto> {
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();
    dateTo.setHours(23, 59, 59, 999);

    // Get totals
    const [totalMembers, activeMembers, newMembers] = await Promise.all([
      this.userRepo.count({ where: { organizationId } }),
      this.pointsTransactionRepo
        .createQueryBuilder('pt')
        .select('COUNT(DISTINCT pt.userId)', 'count')
        .where('pt.organizationId = :organizationId', { organizationId })
        .andWhere('pt.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
        .getRawOne()
        .then(r => parseInt(r.count) || 0),
      this.userRepo.count({
        where: {
          organizationId,
          created_at: Between(dateFrom, dateTo),
        },
      }),
    ]);

    // Level distribution
    const levelCounts = await this.userRepo
      .createQueryBuilder('u')
      .select('u.loyaltyLevel', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('u.organizationId = :organizationId', { organizationId })
      .groupBy('u.loyaltyLevel')
      .getRawMany();

    const levelDistribution = Object.values(LoyaltyLevel).map(level => {
      const found = levelCounts.find(lc => lc.level === level);
      const count = found ? parseInt(found.count) : 0;
      return {
        level,
        count,
        percent: totalMembers > 0 ? Math.round((count / totalMembers) * 10000) / 100 : 0,
      };
    });

    // Points totals
    const pointsTotals = await this.pointsTransactionRepo
      .createQueryBuilder('pt')
      .select([
        'SUM(CASE WHEN pt.type = :earn THEN pt.amount ELSE 0 END) as totalEarned',
        'SUM(CASE WHEN pt.type = :spend THEN ABS(pt.amount) ELSE 0 END) as totalSpent',
      ])
      .where('pt.organizationId = :organizationId', { organizationId })
      .andWhere('pt.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .setParameters({ earn: PointsTransactionType.EARN, spend: PointsTransactionType.SPEND })
      .getRawOne();

    const totalEarned = parseInt(pointsTotals.totalEarned) || 0;
    const totalSpent = parseInt(pointsTotals.totalSpent) || 0;

    // Average balance
    const avgBalance = await this.userRepo
      .createQueryBuilder('u')
      .select('AVG(u.pointsBalance)', 'avg')
      .where('u.organizationId = :organizationId', { organizationId })
      .getRawOne()
      .then(r => Math.round(parseFloat(r.avg) || 0));

    // Top earn sources
    const topSources = await this.pointsTransactionRepo
      .createQueryBuilder('pt')
      .select('pt.source', 'source')
      .addSelect('SUM(pt.amount)', 'total')
      .where('pt.organizationId = :organizationId', { organizationId })
      .andWhere('pt.type = :type', { type: PointsTransactionType.EARN })
      .andWhere('pt.createdAt BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('pt.source')
      .orderBy('total', 'DESC')
      .limit(5)
      .getRawMany();

    const topEarnSources = topSources.map(ts => ({
      source: ts.source as PointsSource,
      total: parseInt(ts.total) || 0,
      percent: totalEarned > 0 ? Math.round((parseInt(ts.total) / totalEarned) * 10000) / 100 : 0,
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
      redemptionRate: totalEarned > 0 ? Math.round((totalSpent / totalEarned) * 10000) / 100 : 0,
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
      .createQueryBuilder('pt')
      .select('pt.userId', 'userId')
      .addSelect('SUM(pt.remainingAmount)', 'expiringPoints')
      .addSelect('MIN(pt.expiresAt)', 'earliestExpiry')
      .where('pt.organizationId = :organizationId', { organizationId })
      .andWhere('pt.type = :type', { type: PointsTransactionType.EARN })
      .andWhere('pt.isExpired = :isExpired', { isExpired: false })
      .andWhere('pt.expiresAt <= :expiryDate', { expiryDate })
      .andWhere('pt.remainingAmount > 0')
      .groupBy('pt.userId')
      .orderBy('"expiringPoints"', 'DESC')
      .getRawMany();

    const userIds = results.map((r) => r.userId);
    const users = userIds.length
      ? await this.userRepo.findByIds(userIds)
      : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      days,
      totalUsers: results.length,
      totalExpiringPoints: results.reduce((s, r) => s + parseInt(r.expiringPoints || '0'), 0),
      users: results.map((r) => {
        const user = userMap.get(r.userId);
        return {
          userId: r.userId,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          expiringPoints: parseInt(r.expiringPoints || '0'),
          earliestExpiry: r.earliestExpiry,
        };
      }),
    };
  }

  // ============================================================================
  // CRON JOBS
  // ============================================================================

  /**
   * Истечение срока баллов (ежедневно в 01:00)
   */
  @Cron('0 1 * * *', { timeZone: 'Asia/Tashkent' })
  async expirePoints(): Promise<void> {
    this.logger.log('Running points expiry job');

    const now = new Date();

    // Find expired transactions with remaining points
    const expiredTransactions = await this.pointsTransactionRepo.find({
      where: {
        type: PointsTransactionType.EARN,
        isExpired: false,
        expiresAt: LessThan(now),
        remainingAmount: MoreThan(0),
      },
    });

    for (const tx of expiredTransactions) {
      if (tx.remainingAmount && tx.remainingAmount > 0) {
        // Get user
        const user = await this.userRepo.findOne({ where: { id: tx.userId } });
        if (!user) continue;

        const newBalance = Math.max(0, (user.pointsBalance || 0) - tx.remainingAmount);

        // Create expiry transaction
        await this.pointsTransactionRepo.save({
          organizationId: tx.organizationId,
          userId: tx.userId,
          type: PointsTransactionType.EXPIRE,
          amount: -tx.remainingAmount,
          balanceAfter: newBalance,
          source: PointsSource.EXPIRY,
          referenceId: tx.id,
          referenceType: 'points_transaction',
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

        this.logger.log(`Expired ${tx.remainingAmount} points for user ${tx.userId}`);
      }
    }

    this.logger.log(`Points expiry job completed. Processed ${expiredTransactions.length} transactions`);
  }

  /**
   * Сброс streak при отсутствии заказов (ежедневно в 00:30)
   */
  @Cron('30 0 * * *', { timeZone: 'Asia/Tashkent' })
  async resetBrokenStreaks(): Promise<void> {
    this.logger.log('Running streak reset job');

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(23, 59, 59, 999);

    // Reset streaks for users who haven't ordered in 2+ days
    const result = await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ currentStreak: 0 })
      .where('currentStreak > 0')
      .andWhere('lastOrderDate < :twoDaysAgo', { twoDaysAgo })
      .execute();

    this.logger.log(`Streak reset job completed. Reset ${result.affected} streaks`);
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
      .createQueryBuilder('pt')
      .select('SUM(pt.amount)', 'total')
      .where('pt.userId = :userId', { userId })
      .andWhere('pt.type = :type', { type: PointsTransactionType.EARN })
      .getRawOne();
    return parseInt(result?.total) || 0;
  }

  private async getTotalSpent(userId: string): Promise<number> {
    const result = await this.pointsTransactionRepo
      .createQueryBuilder('pt')
      .select('SUM(ABS(pt.amount))', 'total')
      .where('pt.userId = :userId', { userId })
      .andWhere('pt.type = :type', { type: PointsTransactionType.SPEND })
      .getRawOne();
    return parseInt(result?.total) || 0;
  }

  private async getExpiringPoints(userId: string, days: number): Promise<number> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const result = await this.pointsTransactionRepo
      .createQueryBuilder('pt')
      .select('SUM(pt.remainingAmount)', 'total')
      .where('pt.userId = :userId', { userId })
      .andWhere('pt.type = :type', { type: PointsTransactionType.EARN })
      .andWhere('pt.isExpired = :isExpired', { isExpired: false })
      .andWhere('pt.expiresAt <= :expiryDate', { expiryDate })
      .andWhere('pt.remainingAmount > 0')
      .getRawOne();
    return parseInt(result?.total) || 0;
  }

  private async deductFromOldestTransactions(userId: string, amount: number): Promise<void> {
    // FIFO deduction from earn transactions
    const earnTransactions = await this.pointsTransactionRepo.find({
      where: {
        userId,
        type: PointsTransactionType.EARN,
        isExpired: false,
        remainingAmount: MoreThan(0),
      },
      order: { created_at: 'ASC' },
    });

    let remaining = amount;

    for (const tx of earnTransactions) {
      if (remaining <= 0) break;

      const deductAmount = Math.min(remaining, tx.remainingAmount || 0);
      remaining -= deductAmount;

      await this.pointsTransactionRepo.update(tx.id, {
        remainingAmount: (tx.remainingAmount || 0) - deductAmount,
      });
    }
  }

  private mapToTransactionDto(tx: PointsTransaction): PointsTransactionDto {
    const icons: Record<PointsSource, string> = {
      [PointsSource.ORDER]: '🛒',
      [PointsSource.WELCOME_BONUS]: '🎁',
      [PointsSource.FIRST_ORDER]: '🎉',
      [PointsSource.REFERRAL]: '👥',
      [PointsSource.REFERRAL_BONUS]: '🤝',
      [PointsSource.ACHIEVEMENT]: '🏆',
      [PointsSource.DAILY_QUEST]: '📅',
      [PointsSource.WEEKLY_QUEST]: '📆',
      [PointsSource.MONTHLY_QUEST]: '📆',
      [PointsSource.STREAK_BONUS]: '🔥',
      [PointsSource.PROMO]: '🎫',
      [PointsSource.ADMIN]: '👨‍💼',
      [PointsSource.BIRTHDAY]: '🎂',
      [PointsSource.PURCHASE]: '💳',
      [PointsSource.REFUND]: '↩️',
      [PointsSource.EXPIRY]: '⏰',
    };

    return {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      source: tx.source,
      description: tx.description || '',
      createdAt: tx.created_at,
      expiresAt: tx.expiresAt || null,
      icon: icons[tx.source] || '💰',
      color: tx.amount > 0 ? 'green' : tx.amount < 0 ? 'red' : 'gray',
    };
  }

  private generateDescription(source: PointsSource, amount: number): string {
    const descriptions: Record<PointsSource, string> = {
      [PointsSource.ORDER]: `За покупку (+${amount})`,
      [PointsSource.WELCOME_BONUS]: 'Приветственный бонус',
      [PointsSource.FIRST_ORDER]: 'Бонус за первый заказ',
      [PointsSource.REFERRAL]: 'За приглашенного друга',
      [PointsSource.REFERRAL_BONUS]: 'Бонус по приглашению',
      [PointsSource.ACHIEVEMENT]: 'За достижение',
      [PointsSource.DAILY_QUEST]: 'Ежедневный квест',
      [PointsSource.WEEKLY_QUEST]: 'Еженедельный квест',
      [PointsSource.MONTHLY_QUEST]: 'Ежемесячный квест',
      [PointsSource.STREAK_BONUS]: 'Бонус за серию',
      [PointsSource.PROMO]: 'Промо-акция',
      [PointsSource.ADMIN]: 'Корректировка',
      [PointsSource.BIRTHDAY]: 'С днем рождения!',
      [PointsSource.PURCHASE]: 'Списание баллов',
      [PointsSource.REFUND]: 'Возврат баллов',
      [PointsSource.EXPIRY]: 'Истечение срока',
    };
    return descriptions[source] || 'Операция с баллами';
  }

  private generateDescriptionUz(source: PointsSource, amount: number): string {
    const descriptions: Record<PointsSource, string> = {
      [PointsSource.ORDER]: `Xarid uchun (+${amount})`,
      [PointsSource.WELCOME_BONUS]: 'Xush kelibsiz bonusi',
      [PointsSource.FIRST_ORDER]: 'Birinchi buyurtma uchun bonus',
      [PointsSource.REFERRAL]: "Do'stni taklif qilgani uchun",
      [PointsSource.REFERRAL_BONUS]: 'Taklif bonusi',
      [PointsSource.ACHIEVEMENT]: 'Yutuq uchun',
      [PointsSource.DAILY_QUEST]: 'Kunlik vazifa',
      [PointsSource.WEEKLY_QUEST]: 'Haftalik vazifa',
      [PointsSource.MONTHLY_QUEST]: 'Oylik vazifa',
      [PointsSource.STREAK_BONUS]: "Ketma-ket kunlar uchun bonus",
      [PointsSource.PROMO]: 'Aksiya',
      [PointsSource.ADMIN]: "Tuzatish",
      [PointsSource.BIRTHDAY]: "Tug'ilgan kuningiz bilan!",
      [PointsSource.PURCHASE]: 'Ballarni ishlatish',
      [PointsSource.REFUND]: 'Ballarni qaytarish',
      [PointsSource.EXPIRY]: 'Muddat tugashi',
    };
    return descriptions[source] || 'Ballar operatsiyasi';
  }
}
