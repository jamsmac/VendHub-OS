/**
 * Import Module Entities
 * Tracking data imports
 */

import {
  Entity,
  Column,
  Index,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Import Type
 */
export enum ImportType {
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
}

/**
 * Import Status
 */
export enum ImportStatus {
  PENDING = 'pending',
  VALIDATING = 'validating',
  VALIDATION_FAILED = 'validation_failed',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  COMPLETED_WITH_ERRORS = 'completed_with_errors',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Import Source
 */
export enum ImportSource {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
  API = 'api',
  LEGACY_SYSTEM = 'legacy_system',
}

// ============================================================================
// IMPORT JOB ENTITY
// ============================================================================

/**
 * Import Job Entity
 * Tracks import job execution
 */
@Entity('import_jobs')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'importType'])
@Index(['createdAt'])
export class ImportJob extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ example: 'IMP-2025-001234', description: 'Import job number' })
  @Column({ type: 'varchar', length: 50, unique: true })
  jobNumber: string;

  @ApiProperty({ enum: ImportType })
  @Column({ type: 'enum', enum: ImportType })
  importType: ImportType;

  @ApiProperty({ enum: ImportSource })
  @Column({ type: 'enum', enum: ImportSource })
  source: ImportSource;

  @ApiProperty({ enum: ImportStatus })
  @Column({ type: 'enum', enum: ImportStatus, default: ImportStatus.PENDING })
  status: ImportStatus;

  // File info
  @ApiPropertyOptional({ description: 'Original file name' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName?: string;

  @ApiPropertyOptional({ description: 'File URL in storage' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @Column({ type: 'bigint', nullable: true })
  fileSize?: number;

  // Processing stats
  @ApiProperty({ description: 'Total rows in file' })
  @Column({ type: 'integer', default: 0 })
  totalRows: number;

  @ApiProperty({ description: 'Rows processed' })
  @Column({ type: 'integer', default: 0 })
  processedRows: number;

  @ApiProperty({ description: 'Successful rows' })
  @Column({ type: 'integer', default: 0 })
  successfulRows: number;

  @ApiProperty({ description: 'Failed rows' })
  @Column({ type: 'integer', default: 0 })
  failedRows: number;

  @ApiProperty({ description: 'Skipped rows' })
  @Column({ type: 'integer', default: 0 })
  skippedRows: number;

  // Timing
  @ApiPropertyOptional({ description: 'Started at' })
  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Completed at' })
  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Processing duration in seconds' })
  @Column({ type: 'integer', nullable: true })
  durationSeconds?: number;

  // Error handling
  @ApiPropertyOptional({ description: 'Error message' })
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Error details (row-level errors)' })
  @Column({ type: 'jsonb', nullable: true })
  errorDetails?: { row: number; field?: string; message: string; value?: any }[];

  // Validation results
  @ApiPropertyOptional({ description: 'Validation warnings' })
  @Column({ type: 'jsonb', nullable: true })
  validationWarnings?: { row: number; field: string; message: string }[];

  // Settings
  @ApiPropertyOptional({ description: 'Import options' })
  @Column({ type: 'jsonb', nullable: true })
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    dryRun?: boolean;
    mapping?: Record<string, string>;
    dateFormat?: string;
    encoding?: string;
    delimiter?: string;
  };

  // Results summary
  @ApiPropertyOptional({ description: 'Summary of created/updated records' })
  @Column({ type: 'jsonb', nullable: true })
  summary?: {
    created: number;
    updated: number;
    deleted: number;
    unchanged: number;
  };

  // User tracking
  @ApiProperty({ description: 'Created by user ID' })
  @Column({ type: 'uuid' })
  createdByUserId: string;

  @ApiPropertyOptional({ description: 'Cancelled by user ID' })
  @Column({ type: 'uuid', nullable: true })
  cancelledByUserId?: string;

  @BeforeInsert()
  generateJobNumber() {
    if (!this.jobNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const timestamp = date.getTime().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.jobNumber = `IMP-${year}-${timestamp}${random}`;
    }
  }

  // Computed
  get progressPercent(): number {
    if (this.totalRows === 0) return 0;
    return Math.round((this.processedRows / this.totalRows) * 100);
  }

  get successRate(): number {
    if (this.processedRows === 0) return 0;
    return Math.round((this.successfulRows / this.processedRows) * 100);
  }
}

// ============================================================================
// IMPORT TEMPLATE ENTITY
// ============================================================================

/**
 * Import Template Entity
 * Saved import configurations/mappings
 */
@Entity('import_templates')
@Index(['organizationId', 'importType'])
export class ImportTemplate extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Template name' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: ImportType })
  @Column({ type: 'enum', enum: ImportType })
  importType: ImportType;

  @ApiProperty({ enum: ImportSource })
  @Column({ type: 'enum', enum: ImportSource })
  source: ImportSource;

  // Column mappings
  @ApiProperty({ description: 'Column mappings (source -> target)' })
  @Column({ type: 'jsonb' })
  columnMappings: Record<string, string>;

  // Default values
  @ApiPropertyOptional({ description: 'Default values for missing fields' })
  @Column({ type: 'jsonb', nullable: true })
  defaultValues?: Record<string, any>;

  // Transformations
  @ApiPropertyOptional({ description: 'Value transformations' })
  @Column({ type: 'jsonb', nullable: true })
  transformations?: {
    field: string;
    type: 'uppercase' | 'lowercase' | 'trim' | 'replace' | 'date_format' | 'number_format' | 'lookup';
    config?: any;
  }[];

  // Validation rules
  @ApiPropertyOptional({ description: 'Validation rules' })
  @Column({ type: 'jsonb', nullable: true })
  validationRules?: {
    field: string;
    rule: 'required' | 'unique' | 'min' | 'max' | 'regex' | 'in_list' | 'date' | 'number';
    config?: any;
  }[];

  // Options
  @ApiPropertyOptional({ description: 'Import options' })
  @Column({ type: 'jsonb', nullable: true })
  options?: {
    skipDuplicates?: boolean;
    updateExisting?: boolean;
    dateFormat?: string;
    encoding?: string;
    delimiter?: string;
    headerRow?: number;
    startRow?: number;
  };

  @ApiProperty({ description: 'Is active' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created by user ID' })
  @Column({ type: 'uuid' })
  createdByUserId: string;
}
