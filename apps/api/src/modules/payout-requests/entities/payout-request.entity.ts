/**
 * PayoutRequest Entity
 * Запросы на вывод средств от операторов/партнёров.
 *
 * Lifecycle: PENDING → APPROVED → PROCESSING → COMPLETED
 *            ↓          ↓           ↓
 *         REJECTED   CANCELLED    FAILED
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

export enum PayoutRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  PROCESSING = "processing",
  COMPLETED = "completed",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  FAILED = "failed",
}

export enum PayoutMethod {
  BANK_TRANSFER = "bank_transfer",
  CARD = "card",
  CASH = "cash",
}

@Entity("payout_requests")
@Index(["organizationId"])
@Index(["status"])
@Index(["requestedById"])
@Index(["createdAt"])
export class PayoutRequest extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  /** Amount in UZS */
  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: "enum",
    enum: PayoutRequestStatus,
    default: PayoutRequestStatus.PENDING,
  })
  status: PayoutRequestStatus;

  @Column({
    type: "enum",
    enum: PayoutMethod,
    default: PayoutMethod.BANK_TRANSFER,
  })
  payoutMethod: PayoutMethod;

  /** User who requested the payout */
  @Column({ type: "uuid" })
  requestedById: string;

  /** User who approved/rejected the payout */
  @Column({ type: "uuid", nullable: true })
  reviewedById: string | null;

  /** When the payout was reviewed (approved/rejected) */
  @Column({ type: "timestamp with time zone", nullable: true })
  reviewedAt: Date | null;

  /** When the payout was completed or failed */
  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt: Date | null;

  /** Reason for the payout request */
  @Column({ type: "text", nullable: true })
  reason: string | null;

  /** Reviewer's comment (e.g. rejection reason) */
  @Column({ type: "text", nullable: true })
  reviewComment: string | null;

  /** Bank account or card details (masked) */
  @Column({ type: "varchar", length: 255, nullable: true })
  payoutDestination: string | null;

  /** External transaction reference (from payment provider) */
  @Column({ type: "varchar", length: 255, nullable: true })
  transactionReference: string | null;
}
