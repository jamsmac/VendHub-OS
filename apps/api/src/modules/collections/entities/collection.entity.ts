/**
 * Collection Entities
 * Двухэтапный сбор наличных из вендинговых автоматов (VendCash)
 * Stage 1: Оператор регистрирует сбор (GPS + время)
 * Stage 2: Менеджер принимает наличные и вводит сумму
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum CollectionStatus {
  COLLECTED = "collected", // Stage 1: operator collected, waiting for manager
  RECEIVED = "received", // Stage 2: manager received and entered amount
  CANCELLED = "cancelled", // Cancelled at any stage
}

export enum CollectionSource {
  REALTIME = "realtime", // Via Telegram bot in real time
  MANUAL_HISTORY = "manual_history", // Manually entered historical data
  EXCEL_IMPORT = "excel_import", // Imported from Excel
}

// ============================================================================
// COLLECTION ENTITY
// ============================================================================

@Entity("collections")
@Index(["status", "collectedAt"])
@Index(["machineId", "collectedAt"])
@Index(["operatorId", "collectedAt"])
export class Collection extends BaseEntity {
  @Column({ type: "uuid" })
  @Index()
  organizationId: string;

  @Column({ type: "uuid" })
  @Index()
  machineId: string;

  @Column({ type: "uuid" })
  operatorId: string;

  @Column({ type: "uuid", nullable: true })
  managerId: string | null;

  @Column({ type: "timestamp with time zone" })
  collectedAt: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  receivedAt: Date | null;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  amount: number | null;

  @Column({
    type: "enum",
    enum: CollectionStatus,
    default: CollectionStatus.COLLECTED,
  })
  status: CollectionStatus;

  @Column({
    type: "enum",
    enum: CollectionSource,
    default: CollectionSource.REALTIME,
  })
  source: CollectionSource;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  // GPS coordinates of operator at collection time
  @Column({
    type: "decimal",
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitude: number | null;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitude: number | null;

  // Haversine distance from machine (anti-fraud)
  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  distanceFromMachine: number | null;

  @Column({ type: "uuid", nullable: true })
  locationId: string | null;

  // Relations
  @OneToMany(() => CollectionHistory, (h) => h.collection)
  history: CollectionHistory[];
}

// ============================================================================
// COLLECTION HISTORY ENTITY (Audit Trail)
// ============================================================================

@Entity("collection_history")
export class CollectionHistory extends BaseEntity {
  @Column({ type: "uuid" })
  @Index()
  collectionId: string;

  @ManyToOne(() => Collection, (c) => c.history, { onDelete: "CASCADE" })
  @JoinColumn({ name: "collection_id" })
  collection: Collection;

  @Column({ type: "uuid" })
  changedById: string;

  @Column({ type: "varchar", length: 50 })
  fieldName: string;

  @Column({ type: "text", nullable: true })
  oldValue: string | null;

  @Column({ type: "text", nullable: true })
  newValue: string | null;

  @Column({ type: "text", nullable: true })
  reason: string | null;
}
