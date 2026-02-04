/**
 * Performance Review Entity
 * Employee performance evaluations with ratings and feedback
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum ReviewPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
}

export enum ReviewStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// PERFORMANCE REVIEW ENTITY
// ============================================================================

@Entity('performance_reviews')
@Index(['employeeId', 'reviewPeriod'])
@Index(['organizationId', 'status'])
@Index(['reviewerId'])
export class PerformanceReview extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'uuid' })
  reviewerId: string;

  @Column({ type: 'enum', enum: ReviewPeriod })
  reviewPeriod: ReviewPeriod;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.SCHEDULED,
  })
  status: ReviewStatus;

  // ============================================================================
  // RATINGS (1-5 scale)
  // ============================================================================

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  overallRating: number | null;

  @Column({ type: 'jsonb', nullable: true })
  ratings: Record<string, any> | null;

  // ============================================================================
  // FEEDBACK
  // ============================================================================

  @Column({ type: 'text', nullable: true })
  strengths: string | null;

  @Column({ type: 'text', nullable: true })
  areasForImprovement: string | null;

  @Column({ type: 'text', nullable: true })
  goals: string | null;

  @Column({ type: 'text', nullable: true })
  employeeComments: string | null;

  @Column({ type: 'text', nullable: true })
  reviewerComments: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
