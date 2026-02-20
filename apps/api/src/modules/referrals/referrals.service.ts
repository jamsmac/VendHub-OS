/**
 * Referrals Service
 * Бизнес-логика реферальной программы VendHub
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { ConfigService } from "@nestjs/config";
import { Referral, ReferralStatus } from "./entities/referral.entity";
import { User } from "../users/entities/user.entity";
import { LoyaltyService } from "../loyalty/loyalty.service";
import {
  PointsSource,
  LOYALTY_BONUSES,
} from "../loyalty/constants/loyalty.constants";
import {
  ApplyReferralCodeDto,
  GenerateReferralCodeDto,
  ReferralFilterDto,
  ReferralCodeInfoDto,
  ReferralInfoDto,
  ReferralSummaryDto,
  ReferralListDto,
  ApplyReferralResultDto,
  ReferralStatsDto,
} from "./dto/referral.dto";

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);
  private readonly appUrl: string;

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly loyaltyService: LoyaltyService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {
    this.appUrl = this.configService.get("APP_URL", "https://vendhub.uz");
  }

  // ============================================================================
  // REFERRAL CODE MANAGEMENT
  // ============================================================================

  /**
   * Получить/создать реферальный код пользователя
   */
  async getReferralCode(userId: string): Promise<ReferralCodeInfoDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Generate code if not exists
    if (!user.referralCode) {
      const code = await this.generateUniqueCode();
      await this.userRepo.update(userId, { referralCode: code });
      user.referralCode = code;
    }

    return this.buildCodeInfo(user.referralCode);
  }

  /**
   * Сгенерировать новый реферальный код
   */
  async regenerateReferralCode(
    userId: string,
    dto?: GenerateReferralCodeDto,
  ): Promise<ReferralCodeInfoDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    let newCode: string;

    if (dto?.customCode) {
      // Check if custom code is available
      const existing = await this.userRepo.findOne({
        where: { referralCode: dto.customCode },
      });

      if (existing && existing.id !== userId) {
        throw new ConflictException("This code is already taken");
      }

      newCode = dto.customCode;
    } else {
      newCode = await this.generateUniqueCode();
    }

    await this.userRepo.update(userId, { referralCode: newCode });

    return this.buildCodeInfo(newCode);
  }

  /**
   * Применить реферальный код при регистрации
   */
  async applyReferralCode(
    referredUserId: string,
    dto: ApplyReferralCodeDto,
  ): Promise<ApplyReferralResultDto> {
    const referredUser = await this.userRepo.findOne({
      where: { id: referredUserId },
    });

    if (!referredUser) {
      throw new NotFoundException("User not found");
    }

    // Check if already referred
    if (referredUser.referredById) {
      throw new BadRequestException("User is already referred");
    }

    // Find referrer by code
    const referrer = await this.userRepo.findOne({
      where: { referralCode: dto.referralCode.toUpperCase() },
    });

    if (!referrer) {
      throw new NotFoundException("Invalid referral code");
    }

    // Cannot refer yourself
    if (referrer.id === referredUserId) {
      throw new BadRequestException("Cannot use your own referral code");
    }

    // Same organization check
    if (referrer.organizationId !== referredUser.organizationId) {
      throw new BadRequestException(
        "Referral code from different organization",
      );
    }

    // Update referred user
    await this.userRepo.update(referredUserId, {
      referredById: referrer.id,
    });

    // Create referral record
    const referral = this.referralRepo.create({
      organizationId: referredUser.organizationId,
      referrerId: referrer.id,
      referredId: referredUserId,
      referralCode: dto.referralCode.toUpperCase(),
      status: ReferralStatus.PENDING,
      referrerRewardPoints: LOYALTY_BONUSES.referral,
      referredRewardPoints: LOYALTY_BONUSES.referralBonus,
      source: dto.source || "code",
      utmCampaign: dto.utmCampaign,
    });

    await this.referralRepo.save(referral);

    // Award welcome bonus to referred user
    await this.loyaltyService.earnPoints({
      userId: referredUserId,
      organizationId: referredUser.organizationId,
      amount: LOYALTY_BONUSES.referralBonus,
      source: PointsSource.REFERRAL_BONUS,
      referenceId: referral.id,
      referenceType: "referral",
      description: `Бонус по приглашению от ${referrer.firstName}`,
      descriptionUz: `${referrer.firstName} taklifi bo'yicha bonus`,
    });

    // Update referral
    await this.referralRepo.update(referral.id, {
      referredRewardPaid: true,
    });

    this.eventEmitter.emit("referral.created", {
      referralId: referral.id,
      referrerId: referrer.id,
      referredId: referredUserId,
      organizationId: referredUser.organizationId,
    });

    this.logger.log(
      `User ${referredUserId} applied referral code from ${referrer.id}`,
    );

    return {
      success: true,
      referrerName: referrer.firstName,
      welcomeBonus: LOYALTY_BONUSES.referralBonus,
      message: `Вы получили ${LOYALTY_BONUSES.referralBonus} баллов!`,
    };
  }

  // ============================================================================
  // REFERRAL ACTIVATION
  // ============================================================================

  /**
   * Активировать реферал при первом заказе
   */
  @OnEvent("order.completed")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleOrderCompleted(payload: any): Promise<void> {
    const { userId, orderId, amount } = payload;

    // Check if user has pending referral
    const referral = await this.referralRepo.findOne({
      where: {
        referredId: userId,
        status: ReferralStatus.PENDING,
      },
      relations: ["referrer"],
    });

    if (!referral) {
      return; // No pending referral
    }

    // Activate referral
    await this.activateReferral(referral, orderId, amount);
  }

  /**
   * Активировать реферал
   */
  private async activateReferral(
    referral: Referral,
    orderId: string,
    orderAmount: number,
  ): Promise<void> {
    // Update status
    await this.referralRepo.update(referral.id, {
      status: ReferralStatus.ACTIVATED,
      activatedAt: new Date(),
      activationOrderId: orderId,
      activationOrderAmount: orderAmount,
    });

    // Award points to referrer
    await this.loyaltyService.earnPoints({
      userId: referral.referrerId,
      organizationId: referral.organizationId,
      amount: referral.referrerRewardPoints,
      source: PointsSource.REFERRAL,
      referenceId: referral.id,
      referenceType: "referral",
      description: `За приглашенного друга`,
      descriptionUz: `Taklif qilingan do'st uchun`,
    });

    // Mark rewards as paid
    await this.referralRepo.update(referral.id, {
      status: ReferralStatus.REWARDED,
      referrerRewardPaid: true,
    });

    this.eventEmitter.emit("referral.activated", {
      referralId: referral.id,
      referrerId: referral.referrerId,
      referredId: referral.referredId,
      orderId,
      orderAmount,
      organizationId: referral.organizationId,
    });

    this.logger.log(
      `Referral ${referral.id} activated. Rewarded referrer ${referral.referrerId}`,
    );
  }

  // ============================================================================
  // USER REFERRAL INFO
  // ============================================================================

  /**
   * Получить сводку рефералов пользователя
   */
  async getReferralSummary(userId: string): Promise<ReferralSummaryDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Ensure user has referral code
    if (!user.referralCode) {
      await this.getReferralCode(userId);
      user.referralCode =
        (await this.userRepo.findOne({ where: { id: userId } }))
          ?.referralCode || "";
    }

    // Get referral stats
    const referrals = await this.referralRepo.find({
      where: { referrerId: userId },
      relations: ["referred"],
      order: { createdAt: "DESC" },
    });

    const totalReferrals = referrals.length;
    const pendingReferrals = referrals.filter(
      (r) => r.status === ReferralStatus.PENDING,
    ).length;
    const activatedReferrals = referrals.filter(
      (r) =>
        r.status === ReferralStatus.ACTIVATED ||
        r.status === ReferralStatus.REWARDED,
    ).length;

    const totalPointsEarned = referrals
      .filter((r) => r.referrerRewardPaid)
      .reduce((sum, r) => sum + r.referrerRewardPoints, 0);

    const pendingPoints = referrals
      .filter((r) => r.status === ReferralStatus.PENDING)
      .reduce((sum, r) => sum + r.referrerRewardPoints, 0);

    // Map recent referrals
    const recentReferrals = referrals
      .slice(0, 10)
      .map((r) => this.mapToReferralInfo(r));

    return {
      referralCode: user.referralCode || "",
      shareLink: `${this.appUrl}/r/${user.referralCode}`,
      totalReferrals,
      pendingReferrals,
      activatedReferrals,
      totalPointsEarned,
      pendingPoints,
      rewardPerReferral: LOYALTY_BONUSES.referral,
      recentReferrals,
    };
  }

  /**
   * Получить список рефералов пользователя
   */
  async getUserReferrals(
    userId: string,
    filter: ReferralFilterDto,
  ): Promise<ReferralListDto> {
    const { status, dateFrom, dateTo, page = 1, limit = 20 } = filter;

    const qb = this.referralRepo
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.referred", "referred")
      .where("r.referrerId = :userId", { userId })
      .orderBy("r.createdAt", "DESC");

    if (status) {
      qb.andWhere("r.status = :status", { status });
    }

    if (dateFrom) {
      qb.andWhere("r.createdAt >= :dateFrom", { dateFrom: new Date(dateFrom) });
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      qb.andWhere("r.createdAt <= :dateTo", { dateTo: endDate });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((r) => this.mapToReferralInfo(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // ADMIN FUNCTIONS
  // ============================================================================

  /**
   * Получить статистику реферальной программы
   */
  async getStats(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<ReferralStatsDto> {
    const referrals = await this.referralRepo.find({
      where: {
        organizationId,
        createdAt: Between(dateFrom, dateTo),
      },
      relations: ["referrer"],
    });

    const totalReferrals = referrals.length;
    const pendingReferrals = referrals.filter(
      (r) => r.status === ReferralStatus.PENDING,
    ).length;
    const activatedReferrals = referrals.filter(
      (r) =>
        r.status === ReferralStatus.ACTIVATED ||
        r.status === ReferralStatus.REWARDED,
    ).length;

    const conversionRate =
      totalReferrals > 0
        ? Math.round((activatedReferrals / totalReferrals) * 10000) / 100
        : 0;

    const totalPointsAwarded = referrals
      .filter((r) => r.referrerRewardPaid)
      .reduce(
        (sum, r) => sum + r.referrerRewardPoints + r.referredRewardPoints,
        0,
      );

    // Average activation time
    const activatedWithTime = referrals.filter((r) => r.activatedAt);
    const avgActivationDays =
      activatedWithTime.length > 0
        ? Math.round(
            activatedWithTime.reduce((sum, r) => {
              return (
                sum +
                (r.activatedAt.getTime() - r.createdAt.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
            }, 0) / activatedWithTime.length,
          )
        : 0;

    // Top referrers
    const referrerStats = new Map<
      string,
      { count: number; activated: number; points: number; name: string }
    >();
    for (const r of referrals) {
      const stats = referrerStats.get(r.referrerId) || {
        count: 0,
        activated: 0,
        points: 0,
        name: r.referrer?.firstName || "Unknown",
      };
      stats.count++;
      if (
        r.status === ReferralStatus.ACTIVATED ||
        r.status === ReferralStatus.REWARDED
      ) {
        stats.activated++;
      }
      if (r.referrerRewardPaid) {
        stats.points += r.referrerRewardPoints;
      }
      referrerStats.set(r.referrerId, stats);
    }

    const topReferrers = Array.from(referrerStats.entries())
      .map(([userId, stats]) => ({
        userId,
        userName: stats.name,
        referralCount: stats.count,
        activatedCount: stats.activated,
        pointsEarned: stats.points,
      }))
      .sort((a, b) => b.activatedCount - a.activatedCount)
      .slice(0, 10);

    // By source
    const sourceStats = new Map<string, { count: number; activated: number }>();
    for (const r of referrals) {
      const stats = sourceStats.get(r.source) || { count: 0, activated: 0 };
      stats.count++;
      if (
        r.status !== ReferralStatus.PENDING &&
        r.status !== ReferralStatus.CANCELLED
      ) {
        stats.activated++;
      }
      sourceStats.set(r.source, stats);
    }

    const bySource = Array.from(sourceStats.entries()).map(
      ([source, stats]) => ({
        source,
        count: stats.count,
        activated: stats.activated,
        rate:
          stats.count > 0
            ? Math.round((stats.activated / stats.count) * 100)
            : 0,
      }),
    );

    return {
      period: { from: dateFrom, to: dateTo },
      totalReferrals,
      pendingReferrals,
      activatedReferrals,
      conversionRate,
      totalPointsAwarded,
      averageActivationDays: avgActivationDays,
      topReferrers,
      bySource,
      timeline: [], // Would need additional query
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Сгенерировать уникальный код
   */
  private async generateUniqueCode(): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing characters
    let code: string;
    let attempts = 0;

    do {
      code = "";
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existing = await this.userRepo.findOne({
        where: { referralCode: code },
      });
      if (!existing) {
        return code;
      }

      attempts++;
    } while (attempts < 100);

    throw new InternalServerErrorException(
      "Failed to generate unique referral code",
    );
  }

  /**
   * Построить информацию о коде
   */
  private buildCodeInfo(code: string): ReferralCodeInfoDto {
    const shareLink = `${this.appUrl}/r/${code}`;

    return {
      referralCode: code,
      shareLink,
      shortLink: shareLink,
      qrCodeUrl: `${this.appUrl}/api/qr?data=${encodeURIComponent(shareLink)}`,
      referrerReward: LOYALTY_BONUSES.referral,
      referredBonus: LOYALTY_BONUSES.referralBonus,
      shareMessages: {
        telegram: `🎁 Получи ${LOYALTY_BONUSES.referralBonus} баллов в VendHub! Используй мой код: ${code}\n${shareLink}`,
        whatsapp: `Привет! Попробуй VendHub и получи ${LOYALTY_BONUSES.referralBonus} бонусных баллов. Мой реферальный код: ${code} ${shareLink}`,
        sms: `VendHub: Получи ${LOYALTY_BONUSES.referralBonus} баллов с кодом ${code}. ${shareLink}`,
        general: `Присоединяйся к VendHub и получи ${LOYALTY_BONUSES.referralBonus} баллов! Код: ${code}`,
      },
    };
  }

  /**
   * Преобразовать в DTO
   */
  private mapToReferralInfo(referral: Referral): ReferralInfoDto {
    return {
      id: referral.id,
      referredId: referral.referredId,
      referredName: referral.referred?.firstName || "Unknown",
      referredAvatar: referral.referred?.avatar || undefined,
      status: referral.status,
      referrerRewardPoints: referral.referrerRewardPoints,
      referrerRewardPaid: referral.referrerRewardPaid,
      createdAt: referral.createdAt,
      activatedAt: referral.activatedAt,
      daysToActivate: referral.daysToActivate,
    };
  }
}
