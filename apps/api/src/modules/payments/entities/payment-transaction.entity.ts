/**
 * Payment Transaction Entity
 * Records all payment transactions from Payme, Click, Uzum, Telegram Stars, Cash, Wallet
 */

import { Entity, Column, Index, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum PaymentProvider {
  PAYME = "payme",
  CLICK = "click",
  UZUM = "uzum",
  TELEGRAM_STARS = "telegram_stars",
  CASH = "cash",
  WALLET = "wallet",
}

export enum PaymentTransactionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

// ============================================================================
// PAYMENT TRANSACTION ENTITY
// ============================================================================

@Entity("payment_transactions")
@Index(["organizationId", "status"])
@Index(["organizationId", "provider"])
@Index(["providerTxId"], {
  unique: true,
  where: '"provider_tx_id" IS NOT NULL',
})
@Index(["orderId"])
@Index(["machineId"])
@Index(["clientUserId"])
export class PaymentTransaction extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({
    type: "enum",
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerTxId: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 10, default: "UZS" })
  currency: string;

  @Column({
    type: "enum",
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING,
  })
  status: PaymentTransactionStatus;

  @Column({ type: "uuid", nullable: true })
  orderId: string | null;

  @Column({ type: "uuid", nullable: true })
  machineId: string | null;

  @Column({ type: "uuid", nullable: true })
  clientUserId: string | null;

  @Column({ type: "jsonb", nullable: true })
  rawRequest: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  rawResponse: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  processedAt: Date | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  // Relations
  @OneToMany("PaymentRefund", "paymentTransaction")
  refunds: import("./payment-refund.entity").PaymentRefund[];
}
