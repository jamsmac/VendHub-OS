/**
 * Client Loyalty Ledger Entity
 * Immutable transaction log for loyalty points changes
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ClientLoyaltyAccount } from "./client-loyalty-account.entity";

/**
 * Reasons for loyalty points transactions
 */
export enum LoyaltyTransactionReason {
  ORDER_EARNED = "ORDER_EARNED",
  ORDER_REDEEMED = "ORDER_REDEEMED",
  ORDER_REFUND = "ORDER_REFUND",
  REFERRAL_BONUS = "REFERRAL_BONUS",
  PROMO_BONUS = "PROMO_BONUS",
  MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT",
  EXPIRATION = "EXPIRATION",
}

@Entity("client_loyalty_ledger")
@Index(["loyaltyAccountId", "createdAt"])
@Index(["reason"])
export class ClientLoyaltyLedger extends BaseEntity {
  @Column({ type: "uuid" })
  loyaltyAccountId: string;

  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "enum", enum: LoyaltyTransactionReason })
  reason: LoyaltyTransactionReason;

  @Column({ type: "integer" })
  points: number;

  @Column({ type: "integer" })
  balanceBefore: number;

  @Column({ type: "integer" })
  balanceAfter: number;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "uuid", nullable: true })
  referenceId: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  referenceType: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  // Relations

  @ManyToOne(() => ClientLoyaltyAccount, (account) => account.ledgerEntries)
  @JoinColumn({ name: "loyalty_account_id" })
  loyaltyAccount: ClientLoyaltyAccount;
}
