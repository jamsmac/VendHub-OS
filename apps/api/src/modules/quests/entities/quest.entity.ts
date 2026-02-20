/**
 * Quest Entity
 * Определения квестов/заданий
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Organization } from '../../organizations/entities/organization.entity';
import {
  QuestPeriod,
  QuestType,
  QuestDifficulty,
} from '../constants/quest.constants';
import { UserQuest } from './user-quest.entity';

@Entity('quests')
@Index(['organizationId', 'period', 'isActive'])
@Index(['period', 'startsAt', 'endsAt'])
export class Quest extends BaseEntity {
  // ===== Organization =====

  @ApiProperty({ description: 'Organization ID (null for global quests)' })
  @Column({ nullable: true })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // ===== Basic Info =====

  @ApiProperty({ description: 'Quest title' })
  @Column({ length: 100 })
  title: string;

  @ApiProperty({ description: 'Quest title in Uzbek' })
  @Column({ length: 100, nullable: true })
  titleUz: string;

  @ApiProperty({ description: 'Quest description' })
  @Column({ length: 500 })
  description: string;

  @ApiProperty({ description: 'Quest description in Uzbek' })
  @Column({ length: 500, nullable: true })
  descriptionUz: string;

  // ===== Quest Type =====

  @ApiProperty({
    description: 'Quest period type',
    enum: QuestPeriod,
  })
  @Column({
    type: 'enum',
    enum: QuestPeriod,
  })
  period: QuestPeriod;

  @ApiProperty({
    description: 'Quest action type',
    enum: QuestType,
  })
  @Column({
    type: 'enum',
    enum: QuestType,
  })
  type: QuestType;

  @ApiProperty({
    description: 'Quest difficulty',
    enum: QuestDifficulty,
    default: QuestDifficulty.MEDIUM,
  })
  @Column({
    type: 'enum',
    enum: QuestDifficulty,
    default: QuestDifficulty.MEDIUM,
  })
  difficulty: QuestDifficulty;

  // ===== Target & Progress =====

  @ApiProperty({
    description: 'Target value to complete quest',
    example: 5,
  })
  @Column({ type: 'int' })
  targetValue: number;

  // ===== Reward =====

  @ApiProperty({
    description: 'Points reward for completing',
    example: 100,
  })
  @Column({ type: 'int' })
  rewardPoints: number;

  @ApiProperty({
    description: 'Additional rewards (products, discounts, etc.)',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  additionalRewards: {
    type: 'product' | 'discount' | 'badge' | 'coupon';
    value: string | number;
    productId?: string;
    discountPercent?: number;
    couponCode?: string;
    badgeId?: string;
  }[];

  // ===== Conditions & Metadata =====

  @ApiProperty({
    description: 'Quest metadata (time constraints, category, etc.)',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // Для ORDER_TIME
    beforeHour?: number;
    afterHour?: number;
    // Для ORDER_CATEGORY
    categoryId?: string;
    // Для ORDER_PRODUCT
    productId?: string;
    // Для ORDER_MACHINE
    machineId?: string;
    // Для LOYAL_CUSTOMER
    requiredLevel?: string;
    // Для PAYMENT_TYPE
    paymentType?: string;
    // Дополнительно
    minOrderAmount?: number;
    maxOrderAmount?: number;
    [key: string]: any;
  };

  @ApiProperty({
    description: 'Requirements to unlock this quest',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  requirements: {
    minLevel?: string;
    minOrders?: number;
    completedQuestIds?: string[];
    minDaysRegistered?: number;
  };

  // ===== Visual =====

  @ApiProperty({ description: 'Quest icon emoji' })
  @Column({ length: 10, default: '🎯' })
  icon: string;

  @ApiProperty({ description: 'Quest badge color' })
  @Column({ length: 20, default: '#4CAF50' })
  color: string;

  @ApiProperty({ description: 'Quest image URL', nullable: true })
  @Column({ nullable: true })
  imageUrl: string;

  // ===== Schedule =====

  @ApiProperty({ description: 'Quest starts at' })
  @Column({ type: 'timestamp', nullable: true })
  startsAt: Date;

  @ApiProperty({ description: 'Quest ends at' })
  @Column({ type: 'timestamp', nullable: true })
  endsAt: Date;

  // ===== Status =====

  @ApiProperty({ description: 'Is quest active' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Is quest featured (shown prominently)' })
  @Column({ default: false })
  isFeatured: boolean;

  @ApiProperty({ description: 'Display order' })
  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  // ===== Statistics =====

  @ApiProperty({ description: 'Total times started' })
  @Column({ type: 'int', default: 0 })
  totalStarted: number;

  @ApiProperty({ description: 'Total times completed' })
  @Column({ type: 'int', default: 0 })
  totalCompleted: number;

  // ===== Relations =====

  @OneToMany(() => UserQuest, (uq) => uq.quest)
  userQuests: UserQuest[];

  // ===== Virtual =====

  get completionRate(): number {
    if (this.totalStarted === 0) return 0;
    return Math.round((this.totalCompleted / this.totalStarted) * 100);
  }

  get isExpired(): boolean {
    if (!this.endsAt) return false;
    return new Date() > this.endsAt;
  }

  get isStarted(): boolean {
    if (!this.startsAt) return true;
    return new Date() >= this.startsAt;
  }

  get isAvailable(): boolean {
    return this.isActive && this.isStarted && !this.isExpired;
  }
}
