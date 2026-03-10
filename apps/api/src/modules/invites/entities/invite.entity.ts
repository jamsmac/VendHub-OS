import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { Exclude } from "class-transformer";
import { BaseEntity } from "../../../common/entities/base.entity";
import { User } from "../../users/entities/user.entity";
import { Organization } from "../../organizations/entities/organization.entity";
import { UserRole } from "../../../common/enums";

export enum InviteStatus {
  ACTIVE = "active",
  USED = "used",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

@Entity("invites")
export class Invite extends BaseEntity {
  @ApiProperty({ description: "Unique invite code (12 hex characters)" })
  @Column({ type: "varchar", length: 24, unique: true })
  @Index()
  code: string;

  @ApiProperty({
    description: "Role assigned to the invited user",
    enum: UserRole,
  })
  @Column({ type: "enum", enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  @Exclude()
  organization: Organization;

  @ApiProperty({ description: "Invite status", enum: InviteStatus })
  @Column({ type: "enum", enum: InviteStatus, default: InviteStatus.ACTIVE })
  status: InviteStatus;

  @ApiProperty({ description: "Invite expiration date" })
  @Column({ type: "timestamp with time zone" })
  expiresAt: Date;

  @ApiProperty({ description: "Maximum number of uses", default: 1 })
  @Column({ type: "int", default: 1 })
  maxUses: number;

  @ApiProperty({ description: "Current number of uses", default: 0 })
  @Column({ type: "int", default: 0 })
  currentUses: number;

  @ApiProperty({ description: "Optional description", nullable: true })
  @Column({ type: "varchar", length: 255, nullable: true })
  description: string | null;

  @ApiProperty({ description: "User ID who used this invite", nullable: true })
  @Column({ type: "uuid", nullable: true })
  usedById: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "used_by_id" })
  @Exclude()
  usedBy: User | null;

  @ApiProperty({ description: "When the invite was used", nullable: true })
  @Column({ type: "timestamp with time zone", nullable: true })
  usedAt: Date | null;

  get isExpired(): boolean {
    return this.status === InviteStatus.EXPIRED || new Date() > this.expiresAt;
  }

  get isUsed(): boolean {
    return this.currentUses >= this.maxUses;
  }

  get isValid(): boolean {
    return (
      this.status === InviteStatus.ACTIVE && !this.isExpired && !this.isUsed
    );
  }
}
