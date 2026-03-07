/**
 * Payment Refund Entity
 * Records refund requests and their processing status
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Organization } from "../../organizations/entities/organization.entity";
import { PaymentTransaction } from "./payment-transaction.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum RefundStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum RefundReason {
  CUSTOMER_REQUEST = "customer_request",
  MACHINE_ERROR = "machine_error",
  PRODUCT_UNAVAILABLE = "product_unavailable",
  DUPLICATE = "duplicate",
  OTHER = "other",
}

// ============================================================================
// PAYMENT REFUND ENTITY
// ============================================================================

@Entity("payment_refunds")
@Index(["paymentTransactionId"])
@Index(["status"])
export class PaymentRefund extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ type: "uuid" })
  paymentTransactionId: string;

  @ManyToOne(() => PaymentTransaction, (tx) => tx.refunds, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "payment_transaction_id" })
  paymentTransaction: PaymentTransaction;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: "enum",
    enum: RefundReason,
  })
  reason: RefundReason;

  @Column({ type: "text", nullable: true })
  reasonNote: string | null;

  @Column({
    type: "enum",
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerRefundId: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  processedAt: Date | null;

  @Column({ type: "uuid", nullable: true })
  processedByUserId: string | null;
}
