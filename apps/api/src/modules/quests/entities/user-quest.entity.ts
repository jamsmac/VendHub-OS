/**
 * User Quest Entity
 * Прогресс пользователя по квестам
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
import { Quest } from './quest.entity';
import { QuestStatus } from '../constants/quest.constants';

@Entity('user_quests')
@Index(['userId', 'status'])
@Index(['questId', 'status'])
@Index(['completedAt'])
@Unique(['userId', 'questId', 'periodStart'])
export class UserQuest extends BaseEntity {
  // ===== User =====

  @ApiProperty({ description: 'User ID' })
  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // ===== Quest =====

  @ApiProperty({ description: 'Quest ID' })
  @Column()
  @Index()
  questId: string;

  @ManyToOne(() => Quest, (q) => q.userQuests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quest_id' })
  quest: Quest;

  // ===== Status =====

  @ApiProperty({
    description: 'Quest status for this user',
    enum: QuestStatus,
  })
  @Column({
    type: 'enum',
    enum: QuestStatus,
    default: QuestStatus.IN_PROGRESS,
  })
  status: QuestStatus;

  // ===== Progress =====

  @ApiProperty({
    description: 'Current progress value',
    example: 3,
  })
  @Column({ type: 'int', default: 0 })
  currentValue: number;

  @ApiProperty({
    description: 'Target value (copied from quest)',
    example: 5,
  })
  @Column({ type: 'int' })
  targetValue: number;

  @ApiProperty({
    description: 'Progress details (orders, products, etc.)',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  progressDetails: {
    // Для COLLECTOR - список попробованных продуктов
    triedProducts?: string[];
    // Для VISIT - посещенные автоматы
    visitedMachines?: string[];
    // Для ORDER_COUNT/AMOUNT - список заказов
    orderIds?: string[];
    // Для REFERRAL - приглашенные пользователи
    referredUsers?: string[];
    // История прогресса
    history?: Array<{
      date: string;
      value: number;
      source: string;
    }>;
    [key: string]: any;
  };

  // ===== Period =====

  @ApiProperty({
    description: 'Period start (for repeating quests)',
    nullable: true,
  })
  @Column({ type: 'date', nullable: true })
  periodStart: Date;

  @ApiProperty({
    description: 'Period end',
    nullable: true,
  })
  @Column({ type: 'date', nullable: true })
  periodEnd: Date;

  // ===== Rewards =====

  @ApiProperty({
    description: 'Points reward (copied from quest)',
    example: 100,
  })
  @Column({ type: 'int' })
  rewardPoints: number;

  @ApiProperty({
    description: 'Points actually claimed',
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  pointsClaimed: number;

  @ApiProperty({
    description: 'Additional rewards claimed',
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  rewardsClaimed: any[];

  // ===== Timestamps =====

  @ApiProperty({ description: 'Completed at', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @ApiProperty({ description: 'Reward claimed at', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date;

  @ApiProperty({ description: 'Expired at', nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  expiredAt: Date;

  // ===== Virtual =====

  get progressPercent(): number {
    if (this.targetValue === 0) return 100;
    return Math.min(100, Math.floor((this.currentValue / this.targetValue) * 100));
  }

  get isComplete(): boolean {
    return this.currentValue >= this.targetValue;
  }

  get canClaim(): boolean {
    return this.status === QuestStatus.COMPLETED;
  }

  get remaining(): number {
    return Math.max(0, this.targetValue - this.currentValue);
  }
}
