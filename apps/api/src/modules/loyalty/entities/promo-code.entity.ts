/**
 * Loyalty Promo Code Entity
 * Промокоды для системы лояльности VendHub
 */

import { Entity, Column, Index, BeforeInsert, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LoyaltyPromoCodeUsage } from "./promo-code-usage.entity";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Type of loyalty promo code
 */
export enum LoyaltyPromoCodeType {
  POINTS_BONUS = "points_bonus",
  DISCOUNT_PERCENT = "discount_percent",
  DISCOUNT_FIXED = "discount_fixed",
  FREE_ITEM = "free_item",
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity("loyalty_promo_codes")
@Index(["code", "organizationId"], { unique: true })
@Index(["organizationId", "isActive"])
@Index(["startsAt", "expiresAt"])
export class LoyaltyPromoCode extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  // ===== Code Identity =====

  @ApiProperty({
    description: "Promo code (uppercase, 6-10 characters)",
    example: "SUMMER25",
  })
  @Column({ type: "varchar", length: 10 })
  code: string;

  @ApiProperty({
    description: "Display name of the promo code",
    example: "Summer Sale Bonus",
  })
  @Column({ type: "varchar", length: 255 })
  name: string;

  @ApiPropertyOptional({
    description: "Description of the promo code",
    example: "Get 500 bonus points this summer!",
  })
  @Column({ type: "text", nullable: true })
  description: string | null;

  // ===== Type & Value =====

  @ApiProperty({
    description: "Type of the promo code",
    enum: LoyaltyPromoCodeType,
    example: LoyaltyPromoCodeType.POINTS_BONUS,
  })
  @Column({
    type: "enum",
    enum: LoyaltyPromoCodeType,
  })
  type: LoyaltyPromoCodeType;

  @ApiProperty({
    description:
      "Value (points amount, discount percentage, or fixed discount in UZS)",
    example: 500,
  })
  @Column({ type: "decimal", precision: 12, scale: 2 })
  value: number;

  // ===== Usage Limits =====

  @ApiPropertyOptional({
    description: "Maximum total usages (null = unlimited)",
    example: 1000,
  })
  @Column({ type: "int", nullable: true })
  maxUsageTotal: number | null;

  @ApiProperty({
    description: "Maximum usages per user",
    example: 1,
    default: 1,
  })
  @Column({ type: "int", default: 1 })
  maxUsagePerUser: number;

  @ApiProperty({
    description: "Current total usage count",
    example: 42,
    default: 0,
  })
  @Column({ type: "int", default: 0 })
  currentUsage: number;

  // ===== Validity Period =====

  @ApiPropertyOptional({
    description: "Start date (null = immediately active)",
    example: "2026-06-01T00:00:00Z",
  })
  @Column({ type: "timestamp with time zone", nullable: true })
  startsAt: Date | null;

  @ApiPropertyOptional({
    description: "Expiry date (null = never expires)",
    example: "2026-08-31T23:59:59Z",
  })
  @Column({ type: "timestamp with time zone", nullable: true })
  expiresAt: Date | null;

  // ===== Status =====

  @ApiProperty({
    description: "Whether the promo code is active",
    default: true,
  })
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  // ===== Applicability Rules =====

  @ApiPropertyOptional({
    description: "Minimum order amount in UZS (null = no minimum)",
    example: 50000,
  })
  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  minimumOrderAmount: number | null;

  // ===== Relations =====

  @OneToMany(() => LoyaltyPromoCodeUsage, (usage) => usage.promoCode)
  usages: LoyaltyPromoCodeUsage[];

  // ===== Hooks =====

  @BeforeInsert()
  uppercaseCode() {
    if (this.code) {
      this.code = this.code.toUpperCase().trim();
    }
  }
}
