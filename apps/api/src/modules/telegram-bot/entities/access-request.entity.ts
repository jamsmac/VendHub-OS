/**
 * Access Request Entity
 * Tracks requests for system access, primarily from Telegram bot users.
 * Used for onboarding new operators/staff via Telegram.
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { User } from "../../users/entities/user.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum AccessRequestStatus {
  NEW = "new",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum AccessRequestSource {
  TELEGRAM = "telegram",
  WEB = "web",
  MANUAL = "manual",
}

// ============================================================================
// ACCESS REQUEST ENTITY
// ============================================================================

@Entity("access_requests")
@Index(["telegramId"])
@Index(["status"])
@Index(["organizationId"])
export class AccessRequest extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  // Telegram data
  @Column({ type: "varchar", length: 100 })
  telegramId: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  telegramUsername: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  telegramFirstName: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  telegramLastName: string | null;

  // Request metadata
  @Column({
    type: "enum",
    enum: AccessRequestSource,
    default: AccessRequestSource.TELEGRAM,
  })
  source: AccessRequestSource;

  @Column({
    type: "enum",
    enum: AccessRequestStatus,
    default: AccessRequestStatus.NEW,
  })
  status: AccessRequestStatus;

  // Processing data
  @Column({ type: "uuid", nullable: true })
  processedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "processed_by_user_id" })
  processedBy: User | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  processedAt: Date | null;

  @Column({ type: "text", nullable: true })
  rejectionReason: string | null;

  // Created user reference (after approval)
  @Column({ type: "uuid", nullable: true })
  createdUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "created_user_id" })
  createdUser: User | null;

  // Additional metadata
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;
}
