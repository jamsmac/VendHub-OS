/**
 * Import Session Entity
 * Intelligent import workflow with approval process
 */

import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Domain Type - target domain for import data
 */
export enum DomainType {
  PRODUCTS = 'products',
  MACHINES = 'machines',
  USERS = 'users',
  EMPLOYEES = 'employees',
  TRANSACTIONS = 'transactions',
  SALES = 'sales',
  INVENTORY = 'inventory',
  CUSTOMERS = 'customers',
  PRICES = 'prices',
  CATEGORIES = 'categories',
  LOCATIONS = 'locations',
  CONTRACTORS = 'contractors',
  RECIPES = 'recipes',
  PLANOGRAMS = 'planograms',
  CONTRACTS = 'contracts',
}

/**
 * Import Session Status - tracks the intelligent import workflow
 */
export enum ImportSessionStatus {
  UPLOADED = 'uploaded',
  CLASSIFYING = 'classifying',
  CLASSIFIED = 'classified',
  MAPPING = 'mapping',
  MAPPED = 'mapped',
  VALIDATING = 'validating',
  VALIDATED = 'validated',
  VALIDATION_FAILED = 'validation_failed',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  COMPLETED_WITH_ERRORS = 'completed_with_errors',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Approval Status - tracks the approval workflow
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AUTO_APPROVED = 'auto_approved',
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
@Entity('import_sessions')
@Index(['organization_id', 'status'])
@Index(['organization_id', 'domain'])
@Index(['uploaded_by_user_id'])
@Index(['approval_status'])
export class ImportSession extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organization_id: string;

  @ApiProperty({ enum: DomainType, description: 'Target domain for import' })
  @Column({ type: 'enum', enum: DomainType })
  domain: DomainType;

  @ApiProperty({ enum: ImportSessionStatus, description: 'Current session status' })
  @Column({ type: 'enum', enum: ImportSessionStatus, default: ImportSessionStatus.UPLOADED })
  status: ImportSessionStatus;

  @ApiPropertyOptional({ description: 'Linked ImportJob ID (set when executing)' })
  @Column({ type: 'uuid', nullable: true })
  import_job_id: string | null;

  @ApiPropertyOptional({ description: 'Import template ID' })
  @Column({ type: 'uuid', nullable: true })
  template_id: string | null;

  // ========================================================================
  // FILE INFO
  // ========================================================================

  @ApiProperty({ description: 'Original file name' })
  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @ApiProperty({ description: 'File size in bytes' })
  @Column({ type: 'bigint' })
  file_size: number;

  @ApiProperty({ description: 'File type (csv, xlsx, json)' })
  @Column({ type: 'varchar', length: 20 })
  file_type: string;

  @ApiPropertyOptional({ description: 'File URL in storage' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string | null;

  @ApiPropertyOptional({ description: 'File metadata (rows, columns, headers, sampleData)' })
  @Column({ type: 'jsonb', nullable: true })
  file_metadata: Record<string, any> | null;

  // ========================================================================
  // CLASSIFICATION
  // ========================================================================

  @ApiPropertyOptional({ description: 'Classification result (detected_domain, confidence, column_mapping, unmapped_columns)' })
  @Column({ type: 'jsonb', nullable: true })
  classification_result: Record<string, any> | null;

  @ApiPropertyOptional({ description: 'Classification confidence score (0-100)' })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  classification_confidence: number | null;

  // ========================================================================
  // MAPPING
  // ========================================================================

  @ApiPropertyOptional({ description: 'Column mapping (source_col -> target_field)' })
  @Column({ type: 'jsonb', nullable: true })
  column_mapping: Record<string, string> | null;

  @ApiPropertyOptional({ description: 'Columns that could not be mapped' })
  @Column({ type: 'jsonb', nullable: true })
  unmapped_columns: string[] | null;

  // ========================================================================
  // VALIDATION
  // ========================================================================

  @ApiPropertyOptional({ description: 'Validation report (total_rows, valid_rows, invalid_rows, warnings, errors[])' })
  @Column({ type: 'jsonb', nullable: true })
  validation_report: Record<string, any> | null;

  // ========================================================================
  // ACTION PLAN
  // ========================================================================

  @ApiPropertyOptional({ description: 'Action plan (inserts, updates, skips, merges, estimated_changes)' })
  @Column({ type: 'jsonb', nullable: true })
  action_plan: Record<string, any> | null;

  // ========================================================================
  // APPROVAL
  // ========================================================================

  @ApiProperty({ enum: ApprovalStatus, description: 'Approval status' })
  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING })
  approval_status: ApprovalStatus;

  @ApiPropertyOptional({ description: 'User ID who approved/rejected' })
  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;

  @ApiPropertyOptional({ description: 'Approval timestamp' })
  @Column({ type: 'timestamptz', nullable: true })
  approved_at: Date | null;

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  // ========================================================================
  // EXECUTION
  // ========================================================================

  @ApiPropertyOptional({ description: 'Execution result (total, successful, failed, skipped, duration_ms)' })
  @Column({ type: 'jsonb', nullable: true })
  execution_result: Record<string, any> | null;

  // ========================================================================
  // USER TRACKING
  // ========================================================================

  @ApiProperty({ description: 'User ID who uploaded the file' })
  @Column({ type: 'uuid' })
  uploaded_by_user_id: string;

  @ApiPropertyOptional({ description: 'Session started at' })
  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  @ApiPropertyOptional({ description: 'Session completed at' })
  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @ApiPropertyOptional({ description: 'Status message' })
  @Column({ type: 'text', nullable: true })
  message: string | null;
}
