/**
 * Operator Rating Entity for VendHub OS
 * Рейтинг и оценка операторов
 *
 * MERGED: VendHub OS (weighted scoring, org isolation, ranking)
 *       + VHM24-repo (photo compliance, collection accuracy, discipline, User relation)
 */

import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

// ============================================================================
// ENTITY
// ============================================================================

/**
 * Рейтинг оператора за период
 */
@Entity('operator_ratings')
@Index(['organization_id'])
@Index(['user_id'])
@Index(['period_start', 'period_end'])
@Index('UQ_operator_ratings_user_period', ['user_id', 'period_start', 'period_end'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index(['total_score'])
@Index(['grade'])
export class OperatorRating extends BaseEntity {
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  operator: User;

  @Column({ type: 'date' })
  period_start: Date;

  @Column({ type: 'date' })
  period_end: Date;

  // ===== Task completion (weight: 25%) =====

  @Column({ type: 'int', default: 0 })
  tasks_assigned: number;

  @Column({ type: 'int', default: 0 })
  tasks_completed: number;

  @Column({ type: 'int', default: 0 })
  tasks_on_time: number;

  @Column({ type: 'int', default: 0 })
  tasks_late: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  avg_completion_time_hours: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  task_completion_rate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  task_on_time_rate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  timeliness_score: number; // 0-100

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  task_score: number;

  // ===== Photo compliance (weight: 15%) =====

  @Column({ type: 'int', default: 0 })
  tasks_with_photos_before: number;

  @Column({ type: 'int', default: 0 })
  tasks_with_photos_after: number;

  @Column({ type: 'int', default: 0 })
  total_photos_uploaded: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  photo_compliance_rate: number; // 0-100

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  photo_quality_score: number; // 0-100

  // ===== Quality (weight: 10%) =====

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  machine_cleanliness_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  stock_accuracy_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  quality_score: number;

  // ===== Financial / Collection accuracy (weight: 15%) =====

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  cash_collection_accuracy: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  inventory_loss_rate: number;

  @Column({ type: 'int', default: 0 })
  collections_with_variance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  avg_collection_variance_percent: number;

  @Column({ type: 'int', default: 0 })
  inventory_discrepancies: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  financial_score: number;

  // ===== Attendance (weight: 10%) =====

  @Column({ type: 'int', default: 0 })
  scheduled_shifts: number;

  @Column({ type: 'int', default: 0 })
  completed_shifts: number;

  @Column({ type: 'int', default: 0 })
  late_arrivals: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  attendance_rate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  attendance_score: number;

  // ===== Customer feedback (weight: 10%) =====

  @Column({ type: 'int', default: 0 })
  complaints_received: number;

  @Column({ type: 'int', default: 0 })
  complaints_resolved: number;

  @Column({ type: 'int', default: 0 })
  average_response_time: number; // minutes

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  avg_customer_rating: number; // 1-5

  @Column({ type: 'int', default: 0 })
  positive_feedback_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  customer_score: number;

  // ===== Discipline (weight: 15%) =====

  @Column({ type: 'int', default: 0 })
  checklist_items_completed: number;

  @Column({ type: 'int', default: 0 })
  checklist_items_total: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  checklist_completion_rate: number; // 0-100

  @Column({ type: 'int', default: 0 })
  comments_sent: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discipline_score: number;

  // ===== Totals =====

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  total_score: number;

  @Column({ type: 'varchar', length: 2, nullable: true })
  grade: string | null; // A+, A, B+, B, C+, C, D, F

  @Column({ type: 'int', nullable: true })
  rank: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  notification_sent_at: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
