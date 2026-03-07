/**
 * Referral Entity
 * Tracking referral codes and their usage in the loyalty program
 */

import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty } from "@nestjs/swagger";
import { Organization } from "../../organizations/entities/organization.entity";
import { User } from "../../users/entities/user.entity";

/**
 * Referral status enum
 */
export enum ReferralStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

@Entity("referrals")
@Unique(["code"])
@Index(["referrerId"])
@Index(["referredId"])
@Index(["organizationId", "status"])
export class Referral extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "SET NULL" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  // ===== Referrer (user who shared code) =====

  @ApiProperty({ description: "User ID of the referrer (who shared the code)" })
  @Column({ type: "uuid" })
  referrerId: string;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "referrer_id" })
  referrer: User;

  // ===== Referred (user who used code) =====

  @ApiProperty({
    description: "User ID of the referred user (who used the code)",
    nullable: true,
  })
  @Column({ type: "uuid", nullable: true })
  referredId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "referred_id" })
  referred: User;

  // ===== Code =====

  @ApiProperty({
    description: "Unique 8-character alphanumeric referral code",
    example: "VH3K9M2X",
  })
  @Column({ type: "varchar", length: 8 })
  code: string;

  // ===== Status =====

  @ApiProperty({
    description: "Referral status",
    enum: ReferralStatus,
    example: ReferralStatus.PENDING,
  })
  @Column({
    type: "enum",
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  // ===== Reward tracking =====

  @ApiProperty({
    description: "Whether the referrer has been rewarded",
    default: false,
  })
  @Column({ default: false })
  referrerRewarded: boolean;

  @ApiProperty({
    description: "Whether the referred user has been rewarded",
    default: false,
  })
  @Column({ default: false })
  referredRewarded: boolean;

  // ===== Completion =====

  @ApiProperty({
    description:
      "When the referral was completed (referred user placed first order)",
    nullable: true,
  })
  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt: Date | null;
}
