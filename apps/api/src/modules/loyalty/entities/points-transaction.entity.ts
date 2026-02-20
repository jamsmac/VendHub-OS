/**
 * Points Transaction Entity
 * История всех операций с баллами лояльности
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { PointsTransactionType, PointsSource, calculateExpiryDate } from '../constants/loyalty.constants';

@Entity('points_transactions')
@Index(['organizationId', 'userId', 'created_at'])
@Index(['userId', 'source'])
@Index(['userId', 'expiresAt'])
@Index(['referenceId'])
export class PointsTransaction extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({ description: 'Organization ID' })
  @Column()
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // ===== User =====

  @ApiProperty({ description: 'User ID' })
  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ===== Transaction Type =====

  @ApiProperty({
    description: 'Transaction type',
    enum: PointsTransactionType,
    example: PointsTransactionType.EARN,
  })
  @Column({
    type: 'enum',
    enum: PointsTransactionType,
  })
  type: PointsTransactionType;

  // ===== Points =====

  @ApiProperty({
    description: 'Points amount (positive for earn, negative for spend)',
    example: 100,
  })
  @Column({ type: 'int' })
  amount: number;

  @ApiProperty({
    description: 'Balance after this transaction',
    example: 1500,
  })
  @Column({ type: 'int' })
  balanceAfter: number;

  // ===== Source =====

  @ApiProperty({
    description: 'Source of points',
    enum: PointsSource,
    example: PointsSource.ORDER,
  })
  @Column({
    type: 'enum',
    enum: PointsSource,
  })
  source: PointsSource;

  // ===== Reference =====

  @ApiProperty({
    description: 'Reference ID (orderId, questId, etc.)',
    example: 'uuid',
    nullable: true,
  })
  @Column({ nullable: true })
  referenceId: string;

  @ApiProperty({
    description: 'Reference type for clarity',
    example: 'order',
    nullable: true,
  })
  @Column({ length: 50, nullable: true })
  referenceType: string;

  // ===== Description =====

  @ApiProperty({
    description: 'Human-readable description',
    example: 'За заказ #ORD-2025-00123',
    nullable: true,
  })
  @Column({ length: 255, nullable: true })
  description: string;

  @ApiProperty({
    description: 'Description in Uzbek',
    nullable: true,
  })
  @Column({ length: 255, nullable: true })
  descriptionUz: string;

  // ===== Metadata =====

  @ApiProperty({
    description: 'Additional metadata',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // ===== Expiration =====

  @ApiProperty({
    description: 'When points expire (only for earn transactions)',
    nullable: true,
  })
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @ApiProperty({
    description: 'Whether points have been expired',
    default: false,
  })
  @Column({ default: false })
  isExpired: boolean;

  @ApiProperty({
    description: 'Remaining points from this transaction',
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  remainingAmount: number;

  // ===== Admin =====

  @ApiProperty({
    description: 'Admin who made this adjustment (for admin adjustments)',
    nullable: true,
  })
  @Column({ nullable: true })
  adminId: string;

  @ApiProperty({
    description: 'Reason for admin adjustment',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  adminReason: string;

  // ===== Hooks =====

  @BeforeInsert()
  setDefaults() {
    // Set expiration for earn transactions
    if (this.type === PointsTransactionType.EARN && !this.expiresAt) {
      this.expiresAt = calculateExpiryDate(new Date());
      this.remainingAmount = this.amount;
    }

    // Ensure spend/adjust amounts are reflected correctly
    if (this.type === PointsTransactionType.SPEND || this.type === PointsTransactionType.EXPIRE) {
      if (this.amount > 0) {
        this.amount = -this.amount; // Make negative
      }
    }
  }
}

// ============================================================================
// SUMMARY TYPES
// ============================================================================

/**
 * Сводка по баллам пользователя
 */
export interface PointsSummary {
  userId: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  totalExpired: number;
  expiringIn30Days: number;
  loyaltyLevel: string;
  pointsToNextLevel: number;
}

/**
 * История транзакций с группировкой
 */
export interface PointsHistoryItem {
  id: string;
  type: PointsTransactionType;
  amount: number;
  balanceAfter: number;
  source: PointsSource;
  description: string;
  createdAt: Date;
  expiresAt?: Date;
}
