/**
 * Bonus Engine Service
 * Обработка бонусов и управление streak в программе лояльности
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";
import {
  LoyaltyLevel,
  PointsSource,
  LOYALTY_BONUSES,
  calculateOrderPoints,
  getStreakBonus,
} from "../constants/loyalty.constants";
import { EarnPointsResultDto } from "../dto/loyalty.dto";
import { LoyaltyService } from "../loyalty.service";

@Injectable()
export class BonusEngineService {
  private readonly logger = new Logger(BonusEngineService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(forwardRef(() => LoyaltyService))
    private readonly loyaltyService: LoyaltyService,
  ) {}

  /**
   * Начислить приветственный бонус
   */
  async processWelcomeBonus(
    userId: string,
    organizationId: string,
  ): Promise<EarnPointsResultDto | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.welcomeBonusReceived) {
      return null;
    }

    await this.userRepo.update(userId, { welcomeBonusReceived: true });

    return this.loyaltyService.earnPoints({
      userId,
      organizationId,
      amount: LOYALTY_BONUSES.welcome,
      source: PointsSource.WELCOME_BONUS,
      description: "Приветственный бонус",
      descriptionUz: "Xush kelibsiz bonusi",
    });
  }

  /**
   * Начислить бонус за первый заказ
   */
  async processFirstOrderBonus(
    userId: string,
    organizationId: string,
    orderId: string,
  ): Promise<EarnPointsResultDto | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || (user.totalOrders || 0) > 1) {
      return null;
    }

    return this.loyaltyService.earnPoints({
      userId,
      organizationId,
      amount: LOYALTY_BONUSES.firstOrder,
      source: PointsSource.FIRST_ORDER,
      referenceId: orderId,
      referenceType: "order",
      description: "Бонус за первый заказ",
      descriptionUz: "Birinchi buyurtma uchun bonus",
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
      throw new NotFoundException("User not found");
    }

    const basePoints = calculateOrderPoints(
      orderAmount,
      user.loyaltyLevel || LoyaltyLevel.BRONZE,
    );

    // Update user stats
    await this.userRepo.update(userId, {
      totalOrders: (user.totalOrders || 0) + 1,
      totalSpent: Number(user.totalSpent || 0) + orderAmount,
      lastOrderDate: new Date(),
    });

    // If order doesn't earn points (below minimum), return zero result
    if (basePoints === 0) {
      return {
        earned: 0,
        newBalance: user.pointsBalance || 0,
        levelUp: null,
        streakBonus: null,
        message: "Заказ ниже минимальной суммы для начисления баллов",
      };
    }

    // Check streak
    const streakResult = await this.updateStreak(userId);

    // Earn points
    const result = await this.loyaltyService.earnPoints({
      userId,
      organizationId,
      amount: basePoints,
      source: PointsSource.ORDER,
      referenceId: orderId,
      referenceType: "order",
      description: `За заказ #${orderId.substring(0, 8)}`,
      metadata: { orderAmount },
    });

    // Add streak bonus if achieved milestone
    if (streakResult) {
      result.streakBonus = streakResult;
      await this.loyaltyService.earnPoints({
        userId,
        organizationId,
        amount: streakResult.bonus,
        source: PointsSource.STREAK_BONUS,
        referenceId: orderId,
        referenceType: "order",
        description: streakResult.message,
      });
    }

    return result;
  }

  /**
   * Обновить streak пользователя
   */
  private async updateStreak(
    userId: string,
  ): Promise<{ bonus: number; message: string } | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastOrderDate = user.lastOrderDate
      ? new Date(user.lastOrderDate)
      : null;
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
}
