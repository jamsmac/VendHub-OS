/**
 * Loyalty Promo Code Service
 * Управление промокодами для системы лояльности VendHub
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import {
  LoyaltyPromoCode,
  LoyaltyPromoCodeType,
} from "../entities/promo-code.entity";
import { LoyaltyPromoCodeUsage } from "../entities/promo-code-usage.entity";
import { LoyaltyService } from "../loyalty.service";
import { PointsSource } from "../constants/loyalty.constants";
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  QueryPromoCodesDto,
  PromoCodeStatsDto,
  ValidatePromoCodeResultDto,
  ApplyPromoCodeResultDto,
} from "../dto/promo-code.dto";

@Injectable()
export class LoyaltyPromoCodeService {
  private readonly logger = new Logger(LoyaltyPromoCodeService.name);

  constructor(
    @InjectRepository(LoyaltyPromoCode)
    private readonly promoCodeRepo: Repository<LoyaltyPromoCode>,
    @InjectRepository(LoyaltyPromoCodeUsage)
    private readonly usageRepo: Repository<LoyaltyPromoCodeUsage>,
    private readonly loyaltyService: LoyaltyService,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================================
  // ADMIN CRUD
  // ============================================================================

  /**
   * Create a new promo code
   */
  async create(
    dto: CreatePromoCodeDto,
    organizationId: string,
  ): Promise<LoyaltyPromoCode> {
    const upperCode = dto.code.toUpperCase().trim();

    // Check for duplicate code within organization
    const existing = await this.promoCodeRepo.findOne({
      where: { code: upperCode, organizationId },
    });
    if (existing) {
      throw new ConflictException(
        `Promo code "${upperCode}" already exists in this organization`,
      );
    }

    const promoCode = this.promoCodeRepo.create({
      organizationId,
      code: upperCode,
      name: dto.name,
      description: dto.description || null,
      type: dto.type,
      value: dto.value,
      maxUsageTotal: dto.maxUsageTotal ?? null,
      maxUsagePerUser: dto.maxUsagePerUser ?? 1,
      currentUsage: 0,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: dto.isActive ?? true,
      minimumOrderAmount: dto.minimumOrderAmount ?? null,
    });

    const saved = await this.promoCodeRepo.save(promoCode);
    this.logger.log(
      `Created promo code "${upperCode}" (${dto.type}) for org ${organizationId}`,
    );
    return saved;
  }

  /**
   * Update an existing promo code
   */
  async update(
    id: string,
    dto: UpdatePromoCodeDto,
    organizationId: string,
  ): Promise<LoyaltyPromoCode> {
    const promoCode = await this.findOneOrFail(id, organizationId);

    if (dto.name !== undefined) promoCode.name = dto.name;
    if (dto.description !== undefined)
      promoCode.description = dto.description || null;
    if (dto.value !== undefined) promoCode.value = dto.value;
    if (dto.maxUsageTotal !== undefined)
      promoCode.maxUsageTotal = dto.maxUsageTotal ?? null;
    if (dto.maxUsagePerUser !== undefined)
      promoCode.maxUsagePerUser = dto.maxUsagePerUser ?? 1;
    if (dto.startsAt !== undefined)
      promoCode.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.expiresAt !== undefined)
      promoCode.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.isActive !== undefined) promoCode.isActive = dto.isActive;
    if (dto.minimumOrderAmount !== undefined)
      promoCode.minimumOrderAmount = dto.minimumOrderAmount ?? null;

    const saved = await this.promoCodeRepo.save(promoCode);
    this.logger.log(
      `Updated promo code "${promoCode.code}" (${id}) for org ${organizationId}`,
    );
    return saved;
  }

  /**
   * Soft-delete a promo code
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const promoCode = await this.findOneOrFail(id, organizationId);
    await this.promoCodeRepo.softDelete(promoCode.id);
    this.logger.log(
      `Soft-deleted promo code "${promoCode.code}" (${id}) for org ${organizationId}`,
    );
  }

  /**
   * List promo codes with pagination and filters
   */
  async findAll(
    organizationId: string,
    query: QueryPromoCodesDto,
  ): Promise<{
    data: LoyaltyPromoCode[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, isActive, type, search } = query;

    const qb = this.promoCodeRepo
      .createQueryBuilder("pc")
      .where("pc.organizationId = :organizationId", { organizationId });

    if (isActive !== undefined) {
      qb.andWhere("pc.isActive = :isActive", { isActive });
    }

    if (type) {
      qb.andWhere("pc.type = :type", { type });
    }

    if (search) {
      qb.andWhere("(pc.code ILIKE :search OR pc.name ILIKE :search)", {
        search: `%${search}%`,
      });
    }

    const total = await qb.getCount();

    qb.orderBy("pc.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // VALIDATION & APPLICATION
  // ============================================================================

  /**
   * Validate a promo code (check if it can be used without applying)
   */
  async validateCode(
    code: string,
    userId: string,
    organizationId: string,
    orderAmount?: number,
  ): Promise<ValidatePromoCodeResultDto> {
    const upperCode = code.toUpperCase().trim();

    // Find the promo code
    const promoCode = await this.promoCodeRepo.findOne({
      where: { code: upperCode, organizationId },
    });

    if (!promoCode) {
      return { valid: false, reason: "Promo code not found" };
    }

    // Check active
    if (!promoCode.isActive) {
      return { valid: false, reason: "Promo code is not active" };
    }

    // Check date range
    const now = new Date();
    if (promoCode.startsAt && now < promoCode.startsAt) {
      return { valid: false, reason: "Promo code is not yet active" };
    }
    if (promoCode.expiresAt && now > promoCode.expiresAt) {
      return { valid: false, reason: "Promo code has expired" };
    }

    // Check total usage limit
    if (
      promoCode.maxUsageTotal !== null &&
      promoCode.currentUsage >= promoCode.maxUsageTotal
    ) {
      return {
        valid: false,
        reason: "Promo code has reached its maximum usage limit",
      };
    }

    // Check per-user usage limit
    const userUsages = await this.usageRepo.count({
      where: { promoCodeId: promoCode.id, userId },
    });
    if (userUsages >= promoCode.maxUsagePerUser) {
      return {
        valid: false,
        reason:
          "You have already used this promo code the maximum number of times",
      };
    }

    // Check minimum order amount
    if (
      orderAmount !== undefined &&
      promoCode.minimumOrderAmount !== null &&
      orderAmount < Number(promoCode.minimumOrderAmount)
    ) {
      return {
        valid: false,
        reason: `Minimum order amount is ${promoCode.minimumOrderAmount} UZS`,
      };
    }

    // Calculate discount (for discount types)
    const discountAmount = this.calculateDiscount(promoCode, orderAmount);

    return {
      valid: true,
      type: promoCode.type,
      value: Number(promoCode.value),
      discountAmount:
        promoCode.type === LoyaltyPromoCodeType.DISCOUNT_PERCENT ||
        promoCode.type === LoyaltyPromoCodeType.DISCOUNT_FIXED
          ? discountAmount
          : undefined,
    };
  }

  /**
   * Apply a promo code (validate, record usage, award points/discount)
   */
  async applyCode(
    code: string,
    userId: string,
    organizationId: string,
    orderId?: string,
    orderAmount?: number,
  ): Promise<ApplyPromoCodeResultDto> {
    // Validate first
    const validation = await this.validateCode(
      code,
      userId,
      organizationId,
      orderAmount,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.reason || "Invalid promo code");
    }

    const upperCode = code.toUpperCase().trim();

    return this.dataSource
      .transaction(async (manager) => {
        const txPromoCodeRepo = manager.getRepository(LoyaltyPromoCode);
        const txUsageRepo = manager.getRepository(LoyaltyPromoCodeUsage);

        // Re-fetch with pessimistic lock to prevent race conditions
        const promoCode = await txPromoCodeRepo.findOne({
          where: { code: upperCode, organizationId },
          lock: { mode: "pessimistic_write" },
        });

        if (!promoCode) {
          throw new NotFoundException("Promo code not found");
        }

        // Re-check usage limit under lock
        if (
          promoCode.maxUsageTotal !== null &&
          promoCode.currentUsage >= promoCode.maxUsageTotal
        ) {
          throw new BadRequestException(
            "Promo code has reached its maximum usage limit",
          );
        }

        let pointsAwarded = 0;
        let discountApplied = 0;
        let message = "";

        switch (promoCode.type) {
          case LoyaltyPromoCodeType.POINTS_BONUS: {
            pointsAwarded = Math.floor(Number(promoCode.value));

            // Earn points via LoyaltyService (outside of this DB transaction scope
            // since earnPoints has its own persistence -- we call it after commit)
            // For now, record the usage. Points will be credited after.
            message = `+${pointsAwarded} bonus points awarded!`;
            break;
          }

          case LoyaltyPromoCodeType.DISCOUNT_PERCENT: {
            discountApplied = this.calculateDiscount(promoCode, orderAmount);
            message = `${Number(promoCode.value)}% discount applied (${discountApplied} UZS)`;
            break;
          }

          case LoyaltyPromoCodeType.DISCOUNT_FIXED: {
            discountApplied = Number(promoCode.value);
            message = `${discountApplied} UZS discount applied`;
            break;
          }

          case LoyaltyPromoCodeType.FREE_ITEM: {
            message = "Free item promo code applied!";
            break;
          }
        }

        // Create usage record
        const usage = txUsageRepo.create({
          organizationId,
          promoCodeId: promoCode.id,
          userId,
          orderId: orderId || null,
          pointsAwarded,
          discountApplied,
        });
        await txUsageRepo.save(usage);

        // Increment usage counter
        promoCode.currentUsage += 1;
        await txPromoCodeRepo.save(promoCode);

        return {
          applied: true,
          message,
          type: promoCode.type,
          pointsAwarded: pointsAwarded > 0 ? pointsAwarded : undefined,
          discountApplied: discountApplied > 0 ? discountApplied : undefined,
          // newBalance will be set after earning points below
        } as ApplyPromoCodeResultDto;
      })
      .then(async (result) => {
        // After transaction commits, award loyalty points if applicable
        if (
          result.type === LoyaltyPromoCodeType.POINTS_BONUS &&
          result.pointsAwarded &&
          result.pointsAwarded > 0
        ) {
          try {
            const earnResult = await this.loyaltyService.earnPoints({
              userId,
              organizationId,
              amount: result.pointsAwarded,
              source: PointsSource.PROMO,
              referenceId: orderId,
              referenceType: "promo_code",
              description: `Promo code "${upperCode}" bonus`,
              descriptionUz: `"${upperCode}" promo-kod bonusi`,
            });
            result.newBalance = earnResult.newBalance;
          } catch (err) {
            this.logger.error(
              `Failed to award promo points for code "${upperCode}": ${err}`,
            );
            // Usage is already recorded; points can be reconciled manually
          }
        }

        this.logger.log(
          `Applied promo code "${upperCode}" for user ${userId} in org ${organizationId}`,
        );

        return result;
      });
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get usage statistics for a specific promo code
   */
  async getStats(
    promoCodeId: string,
    organizationId: string,
  ): Promise<PromoCodeStatsDto> {
    const promoCode = await this.findOneOrFail(promoCodeId, organizationId);

    const result = await this.usageRepo
      .createQueryBuilder("u")
      .select("COUNT(*)", "totalUsages")
      .addSelect("COUNT(DISTINCT u.userId)", "uniqueUsers")
      .addSelect("COALESCE(SUM(u.pointsAwarded), 0)", "totalPointsAwarded")
      .addSelect("COALESCE(SUM(u.discountApplied), 0)", "totalDiscountApplied")
      .addSelect("COALESCE(AVG(u.discountApplied), 0)", "averageDiscount")
      .where("u.promoCodeId = :promoCodeId", { promoCodeId: promoCode.id })
      .getRawOne();

    const remainingUsages =
      promoCode.maxUsageTotal !== null
        ? promoCode.maxUsageTotal - promoCode.currentUsage
        : null;

    return {
      totalUsages: parseInt(result.totalUsages, 10),
      uniqueUsers: parseInt(result.uniqueUsers, 10),
      totalPointsAwarded: parseInt(result.totalPointsAwarded, 10),
      totalDiscountApplied: parseFloat(result.totalDiscountApplied),
      averageDiscount: parseFloat(result.averageDiscount),
      remainingUsages,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Find a promo code by ID and organizationId, or throw NotFoundException
   */
  private async findOneOrFail(
    id: string,
    organizationId: string,
  ): Promise<LoyaltyPromoCode> {
    const promoCode = await this.promoCodeRepo.findOne({
      where: { id, organizationId },
    });

    if (!promoCode) {
      throw new NotFoundException(`Promo code with ID "${id}" not found`);
    }

    return promoCode;
  }

  /**
   * Calculate the discount amount based on promo code type and order amount
   */
  private calculateDiscount(
    promoCode: LoyaltyPromoCode,
    orderAmount?: number,
  ): number {
    switch (promoCode.type) {
      case LoyaltyPromoCodeType.DISCOUNT_PERCENT: {
        if (!orderAmount) return 0;
        return Math.floor((orderAmount * Number(promoCode.value)) / 100);
      }

      case LoyaltyPromoCodeType.DISCOUNT_FIXED: {
        return Math.floor(Number(promoCode.value));
      }

      default:
        return 0;
    }
  }
}
