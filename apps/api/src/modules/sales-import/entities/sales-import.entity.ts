import { Entity, Column, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export enum ImportFileType {
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}

@Entity('sales_imports')
@Index(['organizationId'])
@Index(['status'])
@Index(['created_at'], { where: '"deleted_at" IS NULL' })
export class SalesImport extends BaseEntity {
  @ApiProperty({ description: 'Organization ID', format: 'uuid' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'ID of the user who uploaded the file', format: 'uuid' })
  @Column({ type: 'uuid' })
  uploadedByUserId: string;

  @ApiProperty({ description: 'Original filename', example: 'sales_jan_2025.xlsx' })
  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @ApiProperty({ description: 'File type', enum: ImportFileType })
  @Column({ type: 'enum', enum: ImportFileType })
  fileType: ImportFileType;

  @ApiPropertyOptional({ description: 'Reference to file in storage', format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  fileId: string | null;

  @ApiProperty({ description: 'Import status', enum: ImportStatus })
  @Column({ type: 'enum', enum: ImportStatus, default: ImportStatus.PENDING })
  status: ImportStatus;

  @ApiProperty({ description: 'Total number of rows in the file', default: 0 })
  @Column({ type: 'int', default: 0 })
  totalRows: number;

  @ApiProperty({ description: 'Number of successfully processed rows', default: 0 })
  @Column({ type: 'int', default: 0 })
  successRows: number;

  @ApiProperty({ description: 'Number of failed rows', default: 0 })
  @Column({ type: 'int', default: 0 })
  failedRows: number;

  @ApiProperty({
    description: 'Array of error details',
    example: [{ row: 5, field: 'quantity', message: 'Invalid number' }],
    default: [],
  })
  @Column({ type: 'jsonb', default: [] })
  errors: Array<{ row: number; field: string; message: string }>;

  @ApiPropertyOptional({
    description: 'Import summary',
    example: { totalAmount: 5000000, transactionsCreated: 150, machinesProcessed: 12 },
  })
  @Column({ type: 'jsonb', nullable: true })
  summary: {
    totalAmount?: number;
    transactionsCreated?: number;
    machinesProcessed?: number;
  } | null;

  @ApiPropertyOptional({ description: 'Processing start timestamp' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null;

  @ApiPropertyOptional({ description: 'Processing completion timestamp' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  @ApiPropertyOptional({ description: 'Final status message' })
  @Column({ type: 'text', nullable: true })
  message: string | null;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;
}
