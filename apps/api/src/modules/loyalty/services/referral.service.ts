/**
 * Referral Service
 * Business logic for the VendHub referral program
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { Referral, ReferralStatus } from "../entities/referral.model";
import { LoyaltyService } from "../loyalty.service";
import { PointsSource, LOYALTY_BONUSES } from "../constants/loyalty.constants";
import {
  MyReferralCodeDto,
  LoyaltyApplyReferralResultDto,
  LoyaltyReferralStatsDto,
  AdminLoyaltyReferralStatsDto,
} from "../dto/referral.dto";

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Generate a unique 8-character alphanumeric referral code for a user.
   * Each user can have at most one active (PENDING) referral code.
   */
  async generateCode(userId: string, organizationId: string): Promise<string> {
    // Check if user already has an active referral code (PENDING and not yet claimed)
    const existing = await this.referralRepo.findOne({
      where: {
        referrerId: userId,
        organizationId,
        status: ReferralStatus.PENDING,
        referredId: IsNull(),
      },
    });

    if (existing) {
      return existing.code;
    }

    // Generate a unique code with retry
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateAlphanumericCode(8);
      const codeExists = await this.referralRepo.findOne({
        where: { code },
      });
      if (!codeExists) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new ConflictException(
        "Failed to generate unique referral code. Please try again.",
      );
    }

    const referral = this.referralRepo.create({
      referrerId: userId,
      organizationId,
      code,
      status: ReferralStatus.PENDING,
      referrerRewarded: false,
      referredRewarded: false,
    });

    await this.referralRepo.save(referral);
    this.logger.log(`Generated referral code ${code} for user ${userId}`);

    return code;
  }

  /**
   * Get user's referral code (or generate one if none exists)
   */
  async getMyCode(
    userId: string,
    organizationId: string,
  ): Promise<MyReferralCodeDto> {
    // Find any existing referral with no referred user (available code)
    let referral = await this.referralRepo.findOne({
      where: {
        referrerId: userId,
        organizationId,
        status: ReferralStatus.PENDING,
        referredId: IsNull(),
      },
    });

    // If no unclaimed PENDING referral exists, generate a new one
    if (!referral) {
      const code = await this.generateCode(userId, organizationId);
      referral = await this.referralRepo.findOne({
        where: { code },
      });
    }

    // Count completed and pending referrals
    const [totalReferrals, pendingReferrals] = await Promise.all([
      this.referralRepo.count({
        where: {
          referrerId: userId,
          organizationId,
          status: ReferralStatus.COMPLETED,
        },
      }),
      this.referralRepo.count({
        where: {
          referrerId: userId,
          organizationId,
          status: ReferralStatus.PENDING,
        },
      }),
    ]);

    return {
      code: referral!.code,
      totalReferrals,
      pendingReferrals,
    };
  }

  /**
   * Apply a referral code for a user.
   * Validates: no self-referral, no double referral, code must exist and be PENDING.
   */
  async applyReferral(
    userId: string,
    code: string,
    organizationId: string,
  ): Promise<LoyaltyApplyReferralResultDto> {
    // Find the referral by code
    const referral = await this.referralRepo.findOne({
      where: { code, organizationId },
    });

    if (!referral) {
      throw new NotFoundException("Referral code not found");
    }

    // Can't refer yourself
    if (referral.referrerId === userId) {
      throw new BadRequestException("You cannot use your own referral code");
    }

    // Code must be PENDING
    if (referral.status !== ReferralStatus.PENDING) {
      throw new BadRequestException("This referral code is no longer active");
    }

    // Code must not already have a referred user
    if (referral.referredId) {
      throw new BadRequestException("This referral code has already been used");
    }

    // Check if this user has already been referred (by any code in the org)
    const alreadyReferred = await this.referralRepo.findOne({
      where: {
        referredId: userId,
        organizationId,
      },
    });

    if (alreadyReferred) {
      throw new BadRequestException("You have already used a referral code");
    }

    // Link the referral
    referral.referredId = userId;
    await this.referralRepo.save(referral);

    this.logger.log(
      `User ${userId} applied referral code ${code} from user ${referral.referrerId}`,
    );

    // Generate a new PENDING code for the referrer so they can share again
    await this.generateCode(referral.referrerId, organizationId);

    return {
      success: true,
      message:
        "Referral code applied successfully! Complete your first order to receive 100 bonus points.",
    };
  }

  /**
   * Complete a referral after the referred user places their first order.
   * Awards referrer LOYALTY_BONUSES.referral (200) points and referred user 100 points.
   */
  async completeReferral(
    referredUserId: string,
    organizationId: string,
  ): Promise<void> {
    // Find any referral where this user is the referred
    const referral = await this.referralRepo.findOne({
      where: {
        referredId: referredUserId,
        organizationId,
        status: ReferralStatus.PENDING,
      },
    });

    if (!referral) {
      // No pending referral for this user — nothing to do
      return;
    }

    // Mark as completed
    referral.status = ReferralStatus.COMPLETED;
    referral.completedAt = new Date();

    // Award referrer points
    if (!referral.referrerRewarded) {
      try {
        await this.loyaltyService.earnPoints({
          userId: referral.referrerId,
          organizationId,
          amount: LOYALTY_BONUSES.referral,
          source: PointsSource.REFERRAL,
          referenceId: referral.id,
          referenceType: "referral",
          description: "Bonus for referring a friend",
          descriptionUz: "Do'stni taklif qilgani uchun bonus",
        });
        referral.referrerRewarded = true;
        this.logger.log(
          `Awarded ${LOYALTY_BONUSES.referral} referral points to referrer ${referral.referrerId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to award referrer points for referral ${referral.id}: ${error}`,
        );
      }
    }

    // Award referred user points (welcome referral bonus)
    if (!referral.referredRewarded) {
      try {
        await this.loyaltyService.earnPoints({
          userId: referredUserId,
          organizationId,
          amount: LOYALTY_BONUSES.referralBonus,
          source: PointsSource.REFERRAL_BONUS,
          referenceId: referral.id,
          referenceType: "referral",
          description: "Welcome referral bonus",
          descriptionUz: "Taklif bonusi",
        });
        referral.referredRewarded = true;
        this.logger.log(
          `Awarded ${LOYALTY_BONUSES.referralBonus} welcome referral points to referred user ${referredUserId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to award referred user points for referral ${referral.id}: ${error}`,
        );
      }
    }

    await this.referralRepo.save(referral);
  }

  /**
   * Get referral stats for a user
   */
  async getStats(
    userId: string,
    organizationId: string,
  ): Promise<LoyaltyReferralStatsDto> {
    const [totalCompleted, totalPending] = await Promise.all([
      this.referralRepo.count({
        where: {
          referrerId: userId,
          organizationId,
          status: ReferralStatus.COMPLETED,
        },
      }),
      this.referralRepo.count({
        where: {
          referrerId: userId,
          organizationId,
          status: ReferralStatus.PENDING,
        },
      }),
    ]);

    // Calculate total points earned from referrals
    const totalPointsEarned = totalCompleted * LOYALTY_BONUSES.referral;

    // Get user's referral code
    const { code } = await this.getMyCode(userId, organizationId);

    return {
      totalCompleted,
      totalPending,
      totalPointsEarned,
      referralCode: code,
    };
  }

  /**
   * Get org-wide referral stats for admins
   */
  async getAdminStats(
    organizationId: string,
  ): Promise<AdminLoyaltyReferralStatsDto> {
    const statusCounts = await this.referralRepo
      .createQueryBuilder("r")
      .select("r.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("r.organizationId = :organizationId", { organizationId })
      .groupBy("r.status")
      .getRawMany();

    const statusBreakdown = Object.values(ReferralStatus).map((status) => {
      const found = statusCounts.find((sc) => sc.status === status);
      return {
        status,
        count: found ? parseInt(found.count, 10) : 0,
      };
    });

    const totalReferrals = statusBreakdown.reduce((sum, s) => sum + s.count, 0);
    const completedReferrals =
      statusBreakdown.find((s) => s.status === ReferralStatus.COMPLETED)
        ?.count || 0;
    const pendingReferrals =
      statusBreakdown.find((s) => s.status === ReferralStatus.PENDING)?.count ||
      0;
    const expiredReferrals =
      statusBreakdown.find((s) => s.status === ReferralStatus.EXPIRED)?.count ||
      0;
    const cancelledReferrals =
      statusBreakdown.find((s) => s.status === ReferralStatus.CANCELLED)
        ?.count || 0;

    // Total points awarded = completed referrals * (referrer bonus + referred bonus)
    const totalPointsAwarded =
      completedReferrals *
      (LOYALTY_BONUSES.referral + LOYALTY_BONUSES.referralBonus);

    return {
      totalReferrals,
      completedReferrals,
      pendingReferrals,
      expiredReferrals,
      cancelledReferrals,
      totalPointsAwarded,
      statusBreakdown,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Generate a random alphanumeric code of given length (uppercase + digits)
   */
  private generateAlphanumericCode(length: number): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes I, O, 0, 1 to avoid confusion
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
