/**
 * Loyalty Promo Code Usage Entity
 * Tracks each usage of a loyalty promo code
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LoyaltyPromoCode } from "./promo-code.entity";

@Entity("loyalty_promo_code_usages")
@Index(["promoCodeId", "userId"])
@Index(["userId"])
@Index(["organizationId"])
@Index(["orderId"])
export class LoyaltyPromoCodeUsage extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  // ===== Promo Code Reference =====

  @ApiProperty({ description: "Promo code ID" })
  @Column({ type: "uuid" })
  promoCodeId: string;

  @ManyToOne(() => LoyaltyPromoCode, (promoCode) => promoCode.usages, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "promo_code_id" })
  promoCode: LoyaltyPromoCode;

  // ===== User =====

  @ApiProperty({ description: "User ID who used the code" })
  @Column({ type: "uuid" })
  userId: string;

  // ===== Order =====

  @ApiPropertyOptional({ description: "Related order ID (if applicable)" })
  @Column({ type: "uuid", nullable: true })
  orderId: string | null;

  // ===== Amounts =====

  @ApiProperty({
    description: "Loyalty points awarded (for POINTS_BONUS type)",
    example: 500,
    default: 0,
  })
  @Column({ type: "int", default: 0 })
  pointsAwarded: number;

  @ApiProperty({
    description: "Discount amount applied in UZS (for DISCOUNT_* types)",
    example: 10000,
    default: 0,
  })
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  discountApplied: number;
}
