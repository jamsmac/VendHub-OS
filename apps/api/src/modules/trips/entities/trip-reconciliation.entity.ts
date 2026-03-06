import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// TRIP RECONCILIATION ENTITY
// Supports both simple odometer checks and comprehensive 8-type trip verification
// ============================================================================

export enum ReconciliationStatus {
  MATCHED = "matched",
  MISMATCHED = "mismatched",
  PARTIAL = "partial",
  PENDING = "pending",
  REVIEW = "review",
  RESOLVED = "resolved",
}

export enum MismatchSeverity {
  INFO = "info",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

@Entity("trip_reconciliations")
@Index(["vehicleId"])
@Index(["performedAt"])
@Index(["tripId"])
@Index(["status"])
export class TripReconciliation extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  // --- Odometer reconciliation fields ---

  @Column({ type: "uuid", nullable: true })
  vehicleId: string | null;

  @Column({ type: "int", nullable: true })
  actualOdometer: number | null;

  @Column({ type: "int", nullable: true })
  expectedOdometer: number | null;

  @Column({ type: "int", nullable: true })
  differenceKm: number | null;

  @Column({ type: "int", nullable: true })
  thresholdKm: number | null;

  @Column({ type: "boolean", nullable: true })
  isAnomaly: boolean | null;

  @Column({ type: "uuid", nullable: true })
  performedById: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  performedAt: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  // --- Comprehensive trip reconciliation fields ---

  @Column({ type: "uuid", nullable: true })
  tripId: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: ReconciliationStatus.PENDING,
  })
  status: ReconciliationStatus;

  @Column({ type: "int", default: 0 })
  totalStops: number;

  @Column({ type: "int", default: 0 })
  verifiedStops: number;

  @Column({ type: "int", default: 0 })
  unverifiedStops: number;

  @Column({ type: "int", default: 0 })
  totalTasks: number;

  @Column({ type: "int", default: 0 })
  completedTasks: number;

  @Column({ type: "int", default: 0 })
  verifiedTasks: number;

  @Column({ type: "int", default: 0 })
  mismatchTasks: number;

  @Column({ type: "jsonb", default: [] })
  mismatches: Record<string, unknown>[];

  @Column({
    type: "varchar",
    length: 20,
    default: MismatchSeverity.INFO,
  })
  overallSeverity: MismatchSeverity;

  @Column({ type: "uuid", nullable: true })
  resolvedById: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  resolvedAt: Date | null;

  @Column({ type: "text", nullable: true })
  resolutionNotes: string | null;
}
