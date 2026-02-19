/**
 * Promo Code Redemption Entity for VendHub OS
 * Tracks each usage of a promo code by a client
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { PromoCode } from "./promo-code.entity";

@Entity("promo_code_redemptions")
@Index(["promoCodeId", "clientUserId"])
@Index(["promoCodeId"])
@Index(["clientUserId"])
@Index(["orderId"])
export class PromoCodeRedemption extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  promoCodeId: string;

  @ManyToOne(() => PromoCode, (promoCode) => promoCode.redemptions, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "promo_code_id" })
  promoCode: PromoCode;

  @Column({ type: "uuid" })
  clientUserId: string;

  @Column({ type: "uuid", nullable: true })
  orderId: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  discountApplied: number;

  @Column({ type: "int", default: 0 })
  loyaltyPointsAwarded: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  orderAmount: number | null;

  @Column({ type: "timestamp with time zone", default: () => "NOW()" })
  redeemedAt: Date;
}
