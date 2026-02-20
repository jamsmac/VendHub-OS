/**
 * Operator Rating Entity for VendHub OS
 * Рейтинг и оценка операторов
 *
 * MERGED: VendHub OS (weighted scoring, org isolation, ranking)
 *       + VHM24-repo (photo compliance, collection accuracy, discipline, User relation)
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { User } from "../../users/entities/user.entity";

// ============================================================================
// ENTITY
// ============================================================================

/**
 * Рейтинг оператора за период
 */
@Entity("operator_ratings")
@Index(["organizationId"])
@Index(["userId"])
@Index(["periodStart", "periodEnd"])
@Index(
  "UQ_operator_ratings_user_period",
  ["userId", "periodStart", "periodEnd"],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
@Index(["totalScore"])
@Index(["grade"])
export class OperatorRating extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "user_id" })
  operator: User;

  @Column({ type: "date" })
  periodStart: Date;

  @Column({ type: "date" })
  periodEnd: Date;

  // ===== Task completion (weight: 25%) =====

  @Column({ type: "int", default: 0 })
  tasksAssigned: number;

  @Column({ type: "int", default: 0 })
  tasksCompleted: number;

  @Column({ type: "int", default: 0 })
  tasksOnTime: number;

  @Column({ type: "int", default: 0 })
  tasksLate: number;

  @Column({ type: "decimal", precision: 8, scale: 2, default: 0 })
  avgCompletionTimeHours: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  taskCompletionRate: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  taskOnTimeRate: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  timelinessScore: number; // 0-100

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  taskScore: number;

  // ===== Photo compliance (weight: 15%) =====

  @Column({ type: "int", default: 0 })
  tasksWithPhotosBefore: number;

  @Column({ type: "int", default: 0 })
  tasksWithPhotosAfter: number;

  @Column({ type: "int", default: 0 })
  totalPhotosUploaded: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  photoComplianceRate: number; // 0-100

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  photoQualityScore: number; // 0-100

  // ===== Quality (weight: 10%) =====

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  machineCleanlinessScore: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  stockAccuracyScore: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  qualityScore: number;

  // ===== Financial / Collection accuracy (weight: 15%) =====

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  cashCollectionAccuracy: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  inventoryLossRate: number;

  @Column({ type: "int", default: 0 })
  collectionsWithVariance: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  avgCollectionVariancePercent: number;

  @Column({ type: "int", default: 0 })
  inventoryDiscrepancies: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  financialScore: number;

  // ===== Attendance (weight: 10%) =====

  @Column({ type: "int", default: 0 })
  scheduledShifts: number;

  @Column({ type: "int", default: 0 })
  completedShifts: number;

  @Column({ type: "int", default: 0 })
  lateArrivals: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  attendanceRate: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  attendanceScore: number;

  // ===== Customer feedback (weight: 10%) =====

  @Column({ type: "int", default: 0 })
  complaintsReceived: number;

  @Column({ type: "int", default: 0 })
  complaintsResolved: number;

  @Column({ type: "int", default: 0 })
  averageResponseTime: number; // minutes

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
  avgCustomerRating: number; // 1-5

  @Column({ type: "int", default: 0 })
  positiveFeedbackCount: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  customerScore: number;

  // ===== Discipline (weight: 15%) =====

  @Column({ type: "int", default: 0 })
  checklistItemsCompleted: number;

  @Column({ type: "int", default: 0 })
  checklistItemsTotal: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  checklistCompletionRate: number; // 0-100

  @Column({ type: "int", default: 0 })
  commentsSent: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  disciplineScore: number;

  // ===== Totals =====

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  totalScore: number;

  @Column({ type: "varchar", length: 2, nullable: true })
  grade: string | null; // A+, A, B+, B, C+, C, D, F

  @Column({ type: "int", nullable: true })
  rank: number | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  notificationSentAt: Date | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
