import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * Ephemeral parse session (30min TTL). DB-backed so multi-instance
 * API processes see the same state. Hourly cron cleans expired rows.
 */
@Entity("parse_sessions")
@Index(["organizationId", "expiresAt"])
export class ParseSession extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  byUserId: string;

  @Column({ type: "varchar", length: 50 })
  format: string;

  @Column({ type: "varchar", length: 255 })
  fileName: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  storageKey: string | null;

  @Column({ type: "date", nullable: true })
  reportDay: string | null;

  /** Parsed rows as array of string arrays. JSONB for atomic read. */
  @Column({ type: "jsonb" })
  rows: string[][];

  @Column({ type: "jsonb" })
  headers: string[];

  @Column({ type: "timestamp with time zone" })
  expiresAt: Date;
}
