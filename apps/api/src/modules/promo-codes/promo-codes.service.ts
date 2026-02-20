/**
 * Promo Codes Service for VendHub OS
 * Manages promotional codes lifecycle: creation, validation, redemption, expiration
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PromoCode, PromoCodeStatus, PromoCodeType } from './entities/promo-code.entity';
import { PromoCodeRedemption } from './entities/promo-code-redemption.entity';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/create-promo-code.dto';
import { RedeemPromoCodeDto, ValidatePromoCodeDto } from './dto/redeem-promo-code.dto';
import { QueryPromoCodesDto } from './dto/query-promo-codes.dto';

@Injectable()
export class PromoCodesService {
  private readonly logger = new Logger(PromoCodesService.name);

  constructor(
    @InjectRepository(PromoCode)
    private promoCodeRepo: Repository<PromoCode>,
    @InjectRepository(PromoCodeRedemption)
    private redemptionRepo: Repository<PromoCodeRedemption>,
  ) {}

  // ============================================================================
  // CRUD
  // ============================================================================

  /**
   * Create a new promo code
   */
  async create(dto: CreatePromoCodeDto, organizationId: string): Promise<PromoCode> {
    // Check for duplicate code
    const existing = await this.promoCodeRepo.findOne({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Promo code "${dto.code.toUpperCase()}" already exists`);
    }

    const promoCode = this.promoCodeRepo.create({
      organization_id: organizationId,
      code: dto.code,
      name: dto.name,
      description: dto.description || null,
      type: dto.type,
      value: dto.value,
      status: PromoCodeStatus.DRAFT,
      max_total_uses: dto.maxTotalUses || null,
      max_uses_per_user: dto.maxUsesPerUser || 1,
      current_total_uses: 0,
      valid_from: new Date(dto.validFrom),
      valid_until: new Date(dto.validUntil),
      min_order_amount: dto.minOrderAmount || null,
      max_discount_amount: dto.maxDiscountAmount || null,
      applicable_machine_ids: dto.applicableMachineIds || null,
      applicable_product_ids: dto.applicableProductIds || null,
    });

    return this.promoCodeRepo.save(promoCode);
  }

  /**
   * Find all promo codes with pagination and filters
   */
  async findAll(query: QueryPromoCodesDto, organizationId: string) {
    const { page = 1, limit = 20, status, type, search } = query;

    const qb = this.promoCodeRepo.createQueryBuilder('pc');
    qb.where('pc.organization_id = :organizationId', { organizationId });

    if (status) {
      qb.andWhere('pc.status = :status', { status });
    }

    if (type) {
      qb.andWhere('pc.type = :type', { type });
    }

    if (search) {
      qb.andWhere(
        '(pc.code ILIKE :search OR pc.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();

    qb.orderBy('pc.created_at', 'DESC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Find promo code by its code string
   */
  async findByCode(code: string, organizationId: string): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepo.findOne({
      where: { code: code.toUpperCase(), organization_id: organizationId },
    });

    if (!promoCode) {
      throw new NotFoundException(`Promo code "${code}" not found`);
    }

    return promoCode;
  }

  /**
   * Find promo code by ID
   */
  async findById(id: string, organizationId: string): Promise<PromoCode> {
    const promoCode = await this.promoCodeRepo.findOne({
      where: { id, organization_id: organizationId },
    });

    if (!promoCode) {
      throw new NotFoundException(`Promo code with ID "${id}" not found`);
    }

    return promoCode;
  }

  /**
   * Update a promo code
   */
  async update(id: string, dto: UpdatePromoCodeDto, organizationId: string): Promise<PromoCode> {
    const promoCode = await this.findById(id, organizationId);

    // If code is being changed, check for duplicates
    if (dto.code && dto.code.toUpperCase() !== promoCode.code) {
      const existing = await this.promoCodeRepo.findOne({
        where: { code: dto.code.toUpperCase() },
      });
      if (existing) {
        throw new ConflictException(`Promo code "${dto.code.toUpperCase()}" already exists`);
      }
    }

    if (dto.code !== undefined) promoCode.code = dto.code.toUpperCase();
    if (dto.name !== undefined) promoCode.name = dto.name;
    if (dto.description !== undefined) promoCode.description = dto.description || null;
    if (dto.type !== undefined) promoCode.type = dto.type;
    if (dto.value !== undefined) promoCode.value = dto.value;
    if (dto.maxTotalUses !== undefined) promoCode.max_total_uses = dto.maxTotalUses || null;
    if (dto.maxUsesPerUser !== undefined) promoCode.max_uses_per_user = dto.maxUsesPerUser || 1;
    if (dto.validFrom !== undefined) promoCode.valid_from = new Date(dto.validFrom);
    if (dto.validUntil !== undefined) promoCode.valid_until = new Date(dto.validUntil);
    if (dto.minOrderAmount !== undefined) promoCode.min_order_amount = dto.minOrderAmount || null;
    if (dto.maxDiscountAmount !== undefined) promoCode.max_discount_amount = dto.maxDiscountAmount || null;
    if (dto.applicableMachineIds !== undefined) promoCode.applicable_machine_ids = dto.applicableMachineIds || null;
    if (dto.applicableProductIds !== undefined) promoCode.applicable_product_ids = dto.applicableProductIds || null;

    return this.promoCodeRepo.save(promoCode);
  }

  // ============================================================================
  // VALIDATION & REDEMPTION
  // ============================================================================

  /**
   * Validate a promo code (check if it can be used)
   */
  async validate(dto: ValidatePromoCodeDto, organizationId: string): Promise<{
    valid: boolean;
    promoCode?: PromoCode;
    discountAmount?: number;
    reason?: string;
  }> {
    // Find promo code
    let promoCode: PromoCode;
    try {
      promoCode = await this.findByCode(dto.code, organizationId);
    } catch {
      return { valid: false, reason: 'Promo code not found' };
    }

    // Check status
    if (promoCode.status !== PromoCodeStatus.ACTIVE) {
      return { valid: false, reason: `Promo code is ${promoCode.status}` };
    }

    // Check date range
    const now = new Date();
    if (now < promoCode.valid_from) {
      return { valid: false, reason: 'Promo code is not yet active' };
    }
    if (now > promoCode.valid_until) {
      return { valid: false, reason: 'Promo code has expired' };
    }

    // Check total usage limit
    if (promoCode.max_total_uses !== null && promoCode.current_total_uses >= promoCode.max_total_uses) {
      return { valid: false, reason: 'Promo code has reached its maximum usage limit' };
    }

    // Check per-user usage limit
    if (dto.clientUserId) {
      const userRedemptions = await this.redemptionRepo.count({
        where: {
          promo_code_id: promoCode.id,
          client_user_id: dto.clientUserId,
        },
      });
      if (userRedemptions >= promoCode.max_uses_per_user) {
        return { valid: false, reason: 'You have already used this promo code the maximum number of times' };
      }
    }

    // Check minimum order amount
    if (dto.orderAmount !== undefined && promoCode.min_order_amount !== null) {
      if (dto.orderAmount < Number(promoCode.min_order_amount)) {
        return {
          valid: false,
          reason: `Minimum order amount is ${promoCode.min_order_amount} UZS`,
        };
      }
    }

    // Calculate discount amount
    const discountAmount = this.calculateDiscount(promoCode, dto.orderAmount);

    return {
      valid: true,
      promoCode,
      discountAmount,
    };
  }

  /**
   * Redeem a promo code (validate + create redemption + increment usage)
   */
  async redeem(dto: RedeemPromoCodeDto, organizationId: string): Promise<{
    redemption: PromoCodeRedemption;
    discountApplied: number;
    loyaltyPointsAwarded: number;
  }> {
    // Validate first
    const validation = await this.validate(
      {
        code: dto.code,
        clientUserId: dto.clientUserId,
        orderAmount: dto.orderAmount,
      },
      organizationId,
    );

    if (!validation.valid || !validation.promoCode) {
      throw new BadRequestException(validation.reason || 'Invalid promo code');
    }

    const promoCode = validation.promoCode;
    const discountApplied = validation.discountAmount || 0;
    const loyaltyPointsAwarded = promoCode.type === PromoCodeType.LOYALTY_BONUS
      ? Math.floor(promoCode.value)
      : 0;

    // Create redemption record
    const redemption = this.redemptionRepo.create({
      organization_id: organizationId,
      promo_code_id: promoCode.id,
      client_user_id: dto.clientUserId,
      order_id: dto.orderId || null,
      discount_applied: discountApplied,
      loyalty_points_awarded: loyaltyPointsAwarded,
      order_amount: dto.orderAmount || null,
      redeemed_at: new Date(),
    });

    await this.redemptionRepo.save(redemption);

    // Increment usage counter
    promoCode.current_total_uses += 1;
    await this.promoCodeRepo.save(promoCode);

    return {
      redemption,
      discountApplied,
      loyaltyPointsAwarded,
    };
  }

  // ============================================================================
  // STATUS MANAGEMENT
  // ============================================================================

  /**
   * Deactivate (pause) a promo code
   */
  async deactivate(id: string, organizationId: string): Promise<PromoCode> {
    const promoCode = await this.findById(id, organizationId);

    if (promoCode.status === PromoCodeStatus.EXPIRED) {
      throw new BadRequestException('Cannot deactivate an expired promo code');
    }

    promoCode.status = PromoCodeStatus.PAUSED;
    return this.promoCodeRepo.save(promoCode);
  }

  // ============================================================================
  // STATS & REDEMPTIONS
  // ============================================================================

  /**
   * Get statistics for a specific promo code
   */
  async getStats(id: string, organizationId: string): Promise<{
    totalUses: number;
    totalDiscountGiven: number;
    totalLoyaltyPointsAwarded: number;
    averageDiscount: number;
    averageOrderAmount: number;
  }> {
    const promoCode = await this.findById(id, organizationId);

    const result = await this.redemptionRepo
      .createQueryBuilder('r')
      .select('COUNT(*)', 'totalUses')
      .addSelect('COALESCE(SUM(r.discount_applied), 0)', 'totalDiscountGiven')
      .addSelect('COALESCE(SUM(r.loyalty_points_awarded), 0)', 'totalLoyaltyPointsAwarded')
      .addSelect('COALESCE(AVG(r.discount_applied), 0)', 'averageDiscount')
      .addSelect('COALESCE(AVG(r.order_amount), 0)', 'averageOrderAmount')
      .where('r.promo_code_id = :promoCodeId', { promoCodeId: promoCode.id })
      .getRawOne();

    return {
      totalUses: parseInt(result.totalUses, 10),
      totalDiscountGiven: parseFloat(result.totalDiscountGiven),
      totalLoyaltyPointsAwarded: parseInt(result.totalLoyaltyPointsAwarded, 10),
      averageDiscount: parseFloat(result.averageDiscount),
      averageOrderAmount: parseFloat(result.averageOrderAmount),
    };
  }

  /**
   * Get paginated redemptions for a specific promo code
   */
  async getRedemptions(
    id: string,
    query: { page?: number; limit?: number },
    organizationId: string,
  ) {
    const promoCode = await this.findById(id, organizationId);
    const { page = 1, limit = 20 } = query;

    const [data, total] = await this.redemptionRepo.findAndCount({
      where: { promo_code_id: promoCode.id },
      order: { redeemed_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // CRON JOBS
  // ============================================================================

  /**
   * Automatically expire promo codes that are past their valid_until date
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireCodes(): Promise<void> {
    const now = new Date();

    const result = await this.promoCodeRepo
      .createQueryBuilder()
      .update(PromoCode)
      .set({ status: PromoCodeStatus.EXPIRED })
      .where('status = :status', { status: PromoCodeStatus.ACTIVE })
      .andWhere('valid_until < :now', { now })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} promo code(s)`);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Calculate the actual discount amount based on promo code type
   */
  private calculateDiscount(promoCode: PromoCode, orderAmount?: number): number {
    switch (promoCode.type) {
      case PromoCodeType.PERCENTAGE: {
        if (!orderAmount) return 0;
        let discount = (orderAmount * Number(promoCode.value)) / 100;
        // Apply max discount cap
        if (promoCode.max_discount_amount !== null) {
          discount = Math.min(discount, Number(promoCode.max_discount_amount));
        }
        return Math.round(discount * 100) / 100;
      }

      case PromoCodeType.FIXED_AMOUNT: {
        return Number(promoCode.value);
      }

      case PromoCodeType.LOYALTY_BONUS: {
        // Loyalty bonus does not reduce order amount; it awards points
        return 0;
      }

      default:
        return 0;
    }
  }
}
