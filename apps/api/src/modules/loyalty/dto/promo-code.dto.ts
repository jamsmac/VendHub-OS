/**
 * Loyalty Promo Code DTOs
 * Data Transfer Objects для промокодов системы лояльности
 */

import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { LoyaltyPromoCodeType } from "../entities/promo-code.entity";

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * Create a new loyalty promo code
 */
export class CreatePromoCodeDto {
  @ApiProperty({
    description: "Promo code (uppercase, 6-10 alphanumeric characters)",
    example: "SUMMER25",
    minLength: 6,
    maxLength: 10,
  })
  @IsString()
  @Length(6, 10)
  @Matches(/^[A-Z0-9]+$/, {
    message: "Code must be uppercase alphanumeric (A-Z, 0-9)",
  })
  code: string;

  @ApiProperty({
    description: "Display name",
    example: "Summer Bonus 2026",
  })
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiPropertyOptional({
    description: "Description",
    example: "Get 500 bonus points this summer!",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Type of the promo code",
    enum: LoyaltyPromoCodeType,
    example: LoyaltyPromoCodeType.POINTS_BONUS,
  })
  @IsEnum(LoyaltyPromoCodeType)
  type: LoyaltyPromoCodeType;

  @ApiProperty({
    description: "Value (points amount, discount %, or fixed discount in UZS)",
    example: 500,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  value: number;

  @ApiPropertyOptional({
    description: "Maximum total usages (omit for unlimited)",
    example: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsageTotal?: number;

  @ApiPropertyOptional({
    description: "Maximum usages per user",
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUsagePerUser?: number;

  @ApiPropertyOptional({
    description: "Start date (ISO string, omit for immediately active)",
    example: "2026-06-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    description: "Expiry date (ISO string, omit for no expiry)",
    example: "2026-08-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: "Whether the promo code is active on creation",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Minimum order amount in UZS",
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderAmount?: number;
}

/**
 * Update an existing loyalty promo code
 */
export class UpdatePromoCodeDto {
  @ApiPropertyOptional({
    description: "Display name",
    example: "Updated Summer Bonus",
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({
    description: "Description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Value",
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  value?: number;

  @ApiPropertyOptional({
    description: "Maximum total usages (null for unlimited)",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsageTotal?: number;

  @ApiPropertyOptional({
    description: "Maximum usages per user",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxUsagePerUser?: number;

  @ApiPropertyOptional({
    description: "Start date",
  })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({
    description: "Expiry date",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: "Whether the promo code is active",
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Minimum order amount in UZS",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderAmount?: number;
}

/**
 * Apply (redeem) a loyalty promo code
 */
export class ApplyPromoCodeDto {
  @ApiProperty({
    description: "Promo code to apply",
    example: "SUMMER25",
  })
  @IsString()
  @Length(1, 10)
  code: string;

  @ApiPropertyOptional({
    description: "Order ID (if applying to a specific order)",
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description:
      "Order amount in UZS (for discount calculations and minimum check)",
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderAmount?: number;
}

/**
 * Validate a promo code (check without applying)
 */
export class ValidatePromoCodeDto {
  @ApiProperty({
    description: "Promo code to validate",
    example: "SUMMER25",
  })
  @IsString()
  @Length(1, 10)
  code: string;

  @ApiPropertyOptional({
    description: "Order amount in UZS (to check minimum order requirement)",
    example: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderAmount?: number;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

/**
 * Query filters for listing promo codes
 */
export class QueryPromoCodesDto {
  @ApiPropertyOptional({
    description: "Filter by active status",
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Filter by type",
    enum: LoyaltyPromoCodeType,
  })
  @IsOptional()
  @IsEnum(LoyaltyPromoCodeType)
  type?: LoyaltyPromoCodeType;

  @ApiPropertyOptional({
    description: "Search by code or name",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Page number",
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Promo code usage statistics
 */
export class PromoCodeStatsDto {
  @ApiProperty({ description: "Total number of usages" })
  totalUsages: number;

  @ApiProperty({ description: "Unique users who used the code" })
  uniqueUsers: number;

  @ApiProperty({ description: "Total loyalty points awarded" })
  totalPointsAwarded: number;

  @ApiProperty({ description: "Total discount amount applied in UZS" })
  totalDiscountApplied: number;

  @ApiProperty({ description: "Average discount per usage in UZS" })
  averageDiscount: number;

  @ApiProperty({ description: "Remaining usages (null = unlimited)" })
  remainingUsages: number | null;
}

/**
 * Validation result for a promo code
 */
export class ValidatePromoCodeResultDto {
  @ApiProperty({ description: "Whether the code is valid" })
  valid: boolean;

  @ApiPropertyOptional({ description: "Reason if invalid" })
  reason?: string;

  @ApiPropertyOptional({
    description: "Type of the promo code (if valid)",
    enum: LoyaltyPromoCodeType,
  })
  type?: LoyaltyPromoCodeType;

  @ApiPropertyOptional({
    description: "Value to be applied (points, discount %, or fixed amount)",
  })
  value?: number;

  @ApiPropertyOptional({
    description: "Calculated discount amount in UZS (for DISCOUNT_* types)",
  })
  discountAmount?: number;
}

/**
 * Result of applying a promo code
 */
export class ApplyPromoCodeResultDto {
  @ApiProperty({ description: "Whether the code was applied successfully" })
  applied: boolean;

  @ApiProperty({ description: "Message to the user" })
  message: string;

  @ApiPropertyOptional({
    description: "Type of the applied promo code",
    enum: LoyaltyPromoCodeType,
  })
  type?: LoyaltyPromoCodeType;

  @ApiPropertyOptional({
    description: "Points awarded (for POINTS_BONUS type)",
  })
  pointsAwarded?: number;

  @ApiPropertyOptional({
    description: "Discount amount applied in UZS (for DISCOUNT_* types)",
  })
  discountApplied?: number;

  @ApiPropertyOptional({
    description: "New loyalty balance (for POINTS_BONUS type)",
  })
  newBalance?: number;
}
