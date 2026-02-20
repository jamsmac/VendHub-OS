/**
 * Referral Entity
 * Отслеживание реферальных приглашений
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { Organization } from '../../organizations/entities/organization.entity';

/**
 * Статус реферала
 */
export enum ReferralStatus {
  PENDING = 'pending',       // Зарегистрирован, но еще не сделал заказ
  ACTIVATED = 'activated',   // Сделал первый заказ
  REWARDED = 'rewarded',     // Награды начислены
  CANCELLED = 'cancelled',   // Отменен (удаленный аккаунт и т.п.)
}

@Entity('referrals')
@Index(['referrerId', 'status'])
@Index(['referredId'])
@Index(['organizationId', 'created_at'])
@Unique(['referredId']) // Один пользователь может быть приглашен только один раз
export class Referral extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({ description: 'Organization ID' })
  @Column()
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // ===== Referrer (who invited) =====

  @ApiProperty({ description: 'Referrer user ID' })
  @Column()
  @Index()
  referrerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referrer_id' })
  referrer: User;

  // ===== Referred (who was invited) =====

  @ApiProperty({ description: 'Referred user ID' })
  @Column()
  referredId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'referred_id' })
  referred: User;

  // ===== Referral Code Used =====

  @ApiProperty({ description: 'Referral code used' })
  @Column({ length: 20 })
  referralCode: string;

  // ===== Status =====

  @ApiProperty({
    description: 'Referral status',
    enum: ReferralStatus,
  })
  @Column({
    type: 'enum',
    enum: ReferralStatus,
    default: ReferralStatus.PENDING,
  })
  status: ReferralStatus;

  // ===== Rewards =====

  @ApiProperty({ description: 'Referrer reward points' })
  @Column({ type: 'int', default: 0 })
  referrerRewardPoints: number;

  @ApiProperty({ description: 'Referred reward points (welcome bonus)' })
  @Column({ type: 'int', default: 0 })
  referredRewardPoints: number;

  @ApiProperty({ description: 'Whether referrer reward was paid' })
  @Column({ default: false })
  referrerRewardPaid: boolean;

  @ApiProperty({ description: 'Whether referred reward was paid' })
  @Column({ default: false })
  referredRewardPaid: boolean;

  // ===== Activation =====

  @ApiProperty({ description: 'First order ID that activated referral' })
  @Column({ nullable: true })
  activationOrderId: string;

  @ApiProperty({ description: 'First order amount' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  activationOrderAmount: number;

  @ApiProperty({ description: 'Activation date' })
  @Column({ type: 'timestamp', nullable: true })
  activatedAt: Date;

  // ===== Source =====

  @ApiProperty({ description: 'How the referral was made (link, code, qr)' })
  @Column({ length: 20, default: 'code' })
  source: 'link' | 'code' | 'qr' | 'share';

  @ApiProperty({ description: 'UTM campaign' })
  @Column({ nullable: true })
  utmCampaign: string;

  // ===== Metadata =====

  @ApiProperty({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    deviceType?: string;
    platform?: string;
    referrerLevel?: string;
    [key: string]: any;
  };

  // ===== Virtual =====

  get isPending(): boolean {
    return this.status === ReferralStatus.PENDING;
  }

  get isActive(): boolean {
    return this.status === ReferralStatus.ACTIVATED || this.status === ReferralStatus.REWARDED;
  }

  get daysToActivate(): number {
    if (this.activatedAt) return 0;
    const daysDiff = Math.floor((Date.now() - this.created_at.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysDiff); // 30 days to activate
  }
}
