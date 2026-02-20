/**
 * Incident Entity for VendHub OS
 * Инциденты с автоматами (вандализм, кражи, поломки)
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Тип инцидента
 */
export enum IncidentType {
  VANDALISM = "vandalism",
  THEFT = "theft",
  WATER_DAMAGE = "water_damage",
  POWER_FAILURE = "power_failure",
  NETWORK_FAILURE = "network_failure",
  MECHANICAL_FAILURE = "mechanical_failure",
  OTHER = "other",
}

/**
 * Статус инцидента
 */
export enum IncidentStatus {
  REPORTED = "reported",
  INVESTIGATING = "investigating",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

/**
 * Приоритет инцидента
 */
export enum IncidentPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

// ============================================================================
// ENTITY
// ============================================================================

/**
 * Инцидент
 */
@Entity("incidents")
@Index(["organizationId"])
@Index(["machineId"])
@Index(["status"])
@Index(["type"])
@Index(["reportedAt"])
export class Incident extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  machineId: string;

  @Column({
    type: "enum",
    enum: IncidentType,
    default: IncidentType.OTHER,
  })
  type: IncidentType;

  @Column({
    type: "enum",
    enum: IncidentStatus,
    default: IncidentStatus.REPORTED,
  })
  status: IncidentStatus;

  @Column({
    type: "enum",
    enum: IncidentPriority,
    default: IncidentPriority.MEDIUM,
  })
  priority: IncidentPriority;

  @Column({ type: "varchar", length: 300 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "uuid" })
  reportedByUserId: string;

  @Column({ type: "uuid", nullable: true })
  assignedToUserId: string | null;

  @Column({ type: "uuid", nullable: true })
  resolvedByUserId: string | null;

  @Column({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  reportedAt: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  resolvedAt: Date | null;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  repairCost: number | null;

  @Column({ type: "boolean", default: false })
  insuranceClaim: boolean;

  @Column({ type: "varchar", length: 100, nullable: true })
  insuranceClaimNumber: string | null;

  @Column({ type: "jsonb", default: [] })
  photos: string[];

  @Column({ type: "text", nullable: true })
  resolution: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
