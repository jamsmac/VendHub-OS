/**
 * Import Session Entity
 * Intelligent import workflow with approval process
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Domain Type - target domain for import data
 */
export enum DomainType {
  PRODUCTS = "products",
  MACHINES = "machines",
  USERS = "users",
  EMPLOYEES = "employees",
  TRANSACTIONS = "transactions",
  SALES = "sales",
  INVENTORY = "inventory",
  CUSTOMERS = "customers",
  PRICES = "prices",
  CATEGORIES = "categories",
  LOCATIONS = "locations",
  CONTRACTORS = "contractors",
  RECIPES = "recipes",
  PLANOGRAMS = "planograms",
  CONTRACTS = "contracts",
}

/**
 * Import Session Status - tracks the intelligent import workflow
 */
export enum ImportSessionStatus {
  UPLOADED = "uploaded",
  CLASSIFYING = "classifying",
  CLASSIFIED = "classified",
  MAPPING = "mapping",
  MAPPED = "mapped",
  VALIDATING = "validating",
  VALIDATED = "validated",
  VALIDATION_FAILED = "validation_failed",
  AWAITING_APPROVAL = "awaiting_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXECUTING = "executing",
  COMPLETED = "completed",
  COMPLETED_WITH_ERRORS = "completed_with_errors",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Approval Status - tracks the approval workflow
 */
export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  AUTO_APPROVED = "auto_approved",
}

// ============================================================================
// IMPORT SESSION ENTITY
// ============================================================================

/**
 * Import Session Entity
 * Adds intelligent approval workflow on top of existing import jobs.
 * Tracks file upload, classification, mapping, validation, approval,
 * and execution steps of the import process.
 */
@Entity("import_sessions")
@Index(["organizationId", "status"])
@Index(["organizationId", "domain"])
@Index(["uploadedByUserId"])
@Index(["approvalStatus"])
export class ImportSession extends BaseEntity {
  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({ enum: DomainType, description: "Target domain for import" })
  @Column({ type: "enum", enum: DomainType })
  domain: DomainType;

  @ApiProperty({
    enum: ImportSessionStatus,
    description: "Current session status",
  })
  @Column({
    type: "enum",
    enum: ImportSessionStatus,
    default: ImportSessionStatus.UPLOADED,
  })
  status: ImportSessionStatus;

  @ApiPropertyOptional({
    description: "Linked ImportJob ID (set when executing)",
  })
  @Column({ type: "uuid", nullable: true })
  importJobId: string | null;

  @ApiPropertyOptional({ description: "Import template ID" })
  @Column({ type: "uuid", nullable: true })
  templateId: string | null;

  // ========================================================================
  // FILE INFO
  // ========================================================================

  @ApiProperty({ description: "Original file name" })
  @Column({ type: "varchar", length: 255 })
  fileName: string;

  @ApiProperty({ description: "File size in bytes" })
  @Column({ type: "bigint" })
  fileSize: number;

  @ApiProperty({ description: "File type (csv, xlsx, json)" })
  @Column({ type: "varchar", length: 20 })
  fileType: string;

  @ApiPropertyOptional({ description: "File URL in storage" })
  @Column({ type: "varchar", length: 500, nullable: true })
  fileUrl: string | null;

  @ApiPropertyOptional({
    description: "File metadata (rows, columns, headers, sampleData)",
  })
  @Column({ type: "jsonb", nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fileMetadata: Record<string, any> | null;

  // ========================================================================
  // CLASSIFICATION
  // ========================================================================

  @ApiPropertyOptional({
    description:
      "Classification result (detected_domain, confidence, column_mapping, unmapped_columns)",
  })
  @Column({ type: "jsonb", nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classificationResult: Record<string, any> | null;

  @ApiPropertyOptional({
    description: "Classification confidence score (0-100)",
  })
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  classificationConfidence: number | null;

  // ========================================================================
  // MAPPING
  // ========================================================================

  @ApiPropertyOptional({
    description: "Column mapping (source_col -> target_field)",
  })
  @Column({ type: "jsonb", nullable: true })
  columnMapping: Record<string, string> | null;

  @ApiPropertyOptional({ description: "Columns that could not be mapped" })
  @Column({ type: "jsonb", nullable: true })
  unmappedColumns: string[] | null;

  // ========================================================================
  // VALIDATION
  // ========================================================================

  @ApiPropertyOptional({
    description:
      "Validation report (total_rows, valid_rows, invalid_rows, warnings, errors[])",
  })
  @Column({ type: "jsonb", nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validationReport: Record<string, any> | null;

  // ========================================================================
  // ACTION PLAN
  // ========================================================================

  @ApiPropertyOptional({
    description:
      "Action plan (inserts, updates, skips, merges, estimated_changes)",
  })
  @Column({ type: "jsonb", nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionPlan: Record<string, any> | null;

  // ========================================================================
  // APPROVAL
  // ========================================================================

  @ApiProperty({ enum: ApprovalStatus, description: "Approval status" })
  @Column({
    type: "enum",
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @ApiPropertyOptional({ description: "User ID who approved/rejected" })
  @Column({ type: "uuid", nullable: true })
  approvedByUserId: string | null;

  @ApiPropertyOptional({ description: "Approval timestamp" })
  @Column({ type: "timestamptz", nullable: true })
  approvedAt: Date | null;

  @ApiPropertyOptional({ description: "Reason for rejection" })
  @Column({ type: "text", nullable: true })
  rejectionReason: string | null;

  // ========================================================================
  // EXECUTION
  // ========================================================================

  @ApiPropertyOptional({
    description:
      "Execution result (total, successful, failed, skipped, duration_ms)",
  })
  @Column({ type: "jsonb", nullable: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  executionResult: Record<string, any> | null;

  // ========================================================================
  // USER TRACKING
  // ========================================================================

  @ApiProperty({ description: "User ID who uploaded the file" })
  @Column({ type: "uuid" })
  uploadedByUserId: string;

  @ApiPropertyOptional({ description: "Session started at" })
  @Column({ type: "timestamptz", nullable: true })
  startedAt: Date | null;

  @ApiPropertyOptional({ description: "Session completed at" })
  @Column({ type: "timestamptz", nullable: true })
  completedAt: Date | null;

  @ApiPropertyOptional({ description: "Status message" })
  @Column({ type: "text", nullable: true })
  message: string | null;
}
