/**
 * Import Audit Log Entity
 * Records every row-level operation during import execution
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Audit Action Type - type of operation performed on a record
 */
export enum AuditActionType {
  INSERT = "insert",
  UPDATE = "update",
  MERGE = "merge",
  SKIP = "skip",
  DELETE = "delete",
  RESTORE = "restore",
}

// ============================================================================
// IMPORT AUDIT LOG ENTITY
// ============================================================================

/**
 * Import Audit Log Entity
 * Tracks every single row operation during import execution.
 * Provides a full audit trail of changes made by an import session.
 */
@Entity("import_audit_logs")
@Index(["sessionId"])
@Index(["tableName", "recordId"])
@Index(["executedAt"])
export class ImportAuditLog extends BaseEntity {
  @ApiProperty({ description: "Import session ID" })
  @Column({ type: "uuid" })
  sessionId: string;

  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({
    enum: AuditActionType,
    description: "Type of action performed",
  })
  @Column({ type: "enum", enum: AuditActionType })
  actionType: AuditActionType;

  @ApiProperty({ description: "Target database table name" })
  @Column({ type: "varchar", length: 100 })
  tableName: string;

  @ApiPropertyOptional({ description: "UUID of the affected record" })
  @Column({ type: "uuid", nullable: true })
  recordId: string | null;

  @ApiPropertyOptional({ description: "Record state before the operation" })
  @Column({ type: "jsonb", nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeState: Record<string, any> | null;

  @ApiPropertyOptional({ description: "Record state after the operation" })
  @Column({ type: "jsonb", nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterState: Record<string, any> | null;

  @ApiPropertyOptional({
    description: "Individual field changes ({field: {old, new}})",
  })
  @Column({ type: "jsonb", nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldChanges: Record<string, any> | null;

  @ApiPropertyOptional({ description: "Source file row number" })
  @Column({ type: "integer", nullable: true })
  rowNumber: number | null;

  @ApiProperty({ description: "Timestamp when the operation was executed" })
  @Column({ type: "timestamptz", default: () => "NOW()" })
  executedAt: Date;

  @ApiPropertyOptional({ description: "User who executed the operation" })
  @Column({ type: "uuid", nullable: true })
  executedByUserId: string | null;

  @ApiPropertyOptional({ description: "Error message if operation failed" })
  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @ApiProperty({ description: "Whether the operation succeeded" })
  @Column({ type: "boolean", default: true })
  success: boolean;
}
