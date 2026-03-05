/**
 * Trip Reconciliation Entity
 * Stores results of trip verification against VendHub tasks.
 * Generated when a trip is completed — runs 8 types of checks.
 */

import { Entity, Column, OneToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Trip } from "../../trips/entities/trip.entity";

export enum ReconciliationStatus {
  PENDING = "pending",
  MATCHED = "matched",
  MISMATCH = "mismatch",
  PARTIAL = "partial",
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

export interface TripMismatch {
  type: string;
  severity: string;
  description: string;
  details: Record<string, unknown>;
}

@Entity("trip_reconciliations")
@Index(["tripId"])
@Index(["status"])
@Index(["organizationId"])
export class TripReconciliation extends BaseEntity {
  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  @Column({ type: "uuid", unique: true })
  tripId: string;

  @OneToOne(() => Trip)
  @JoinColumn({ name: "trip_id" })
  trip: Trip;

  @Column({
    type: "enum",
    enum: ReconciliationStatus,
    default: ReconciliationStatus.PENDING,
  })
  status: ReconciliationStatus;

  // Stop verification counters
  @Column({ type: "int", default: 0 })
  totalStops: number;

  @Column({ type: "int", default: 0 })
  verifiedStops: number;

  @Column({ type: "int", default: 0 })
  unverifiedStops: number;

  // Task verification counters
  @Column({ type: "int", default: 0 })
  totalTasks: number;

  @Column({ type: "int", default: 0 })
  completedTasks: number;

  @Column({ type: "int", default: 0 })
  verifiedTasks: number;

  @Column({ type: "int", default: 0 })
  mismatchTasks: number;

  // Financial reconciliation
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  expectedCollectionAmount: number | null;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  actualCollectionAmount: number | null;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  collectionDifference: number | null;

  // Mismatch details
  @Column({ type: "jsonb", default: [] })
  mismatches: TripMismatch[];

  @Column({
    type: "enum",
    enum: MismatchSeverity,
    default: MismatchSeverity.INFO,
  })
  overallSeverity: MismatchSeverity;

  // Resolution
  @Column({ type: "uuid", nullable: true })
  resolvedById: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  resolvedAt: Date | null;

  @Column({ type: "text", nullable: true })
  resolutionNotes: string | null;
}
