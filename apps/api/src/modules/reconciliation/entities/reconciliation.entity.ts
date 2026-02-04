/**
 * Reconciliation Entities
 * Сверка данных из различных источников (HW, платежные системы, фискальные данные)
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum ReconciliationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ReconciliationSource {
  HW = 'hw',
  SALES_REPORT = 'sales_report',
  FISCAL = 'fiscal',
  PAYME = 'payme',
  CLICK = 'click',
  UZUM = 'uzum',
}

export enum MismatchType {
  ORDER_NOT_FOUND = 'order_not_found',
  PAYMENT_NOT_FOUND = 'payment_not_found',
  AMOUNT_MISMATCH = 'amount_mismatch',
  TIME_MISMATCH = 'time_mismatch',
  DUPLICATE = 'duplicate',
  PARTIAL_MATCH = 'partial_match',
}

export enum HwImportSource {
  EXCEL = 'excel',
  CSV = 'csv',
  API = 'api',
}

// ============================================================================
// RECONCILIATION RUN ENTITY
// ============================================================================

@Entity('reconciliation_runs')
@Index(['organizationId'])
@Index(['status'])
@Index(['createdAt'])
export class ReconciliationRun extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.PENDING,
  })
  status: ReconciliationStatus;

  @Column({ type: 'date' })
  dateFrom: Date;

  @Column({ type: 'date' })
  dateTo: Date;

  @Column({ type: 'jsonb', default: [] })
  sources: ReconciliationSource[];

  @Column({ type: 'jsonb', default: [] })
  machineIds: string[];

  @Column({ type: 'int', default: 300 })
  timeTolerance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.01 })
  amountTolerance: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  processingTimeMs: number | null;

  @Column({ type: 'jsonb', nullable: true })
  summary: {
    totalRecords: number;
    matched: number;
    mismatched: number;
    missing: number;
    matchRate: number;
  } | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relations
  @OneToMany(() => ReconciliationMismatch, (mismatch) => mismatch.run)
  mismatches: ReconciliationMismatch[];
}

// ============================================================================
// RECONCILIATION MISMATCH ENTITY
// ============================================================================

@Entity('reconciliation_mismatches')
@Index(['runId'])
@Index(['mismatchType'])
@Index(['isResolved'])
export class ReconciliationMismatch extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  runId: string;

  @ManyToOne(() => ReconciliationRun, (run) => run.mismatches)
  @JoinColumn({ name: 'run_id' })
  run: ReconciliationRun;

  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  orderNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  machineCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  orderTime: Date | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  amount: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  @Column({
    type: 'enum',
    enum: MismatchType,
  })
  mismatchType: MismatchType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  matchScore: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  discrepancyAmount: number | null;

  @Column({ type: 'jsonb', default: {} })
  sourcesData: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  isResolved: boolean;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  resolvedByUserId: string | null;
}

// ============================================================================
// HW IMPORTED SALE ENTITY
// ============================================================================

@Entity('hw_imported_sales')
@Index(['organizationId'])
@Index(['importBatchId'])
@Index(['machineCode'])
@Index(['saleDate'])
@Index(['isReconciled'])
export class HwImportedSale extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'uuid' })
  importBatchId: string;

  @Column({ type: 'timestamp' })
  saleDate: Date;

  @Column({ type: 'varchar', length: 50 })
  machineCode: string;

  @Column({ type: 'uuid', nullable: true })
  machineId: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  orderNumber: string | null;

  @Column({ type: 'uuid', nullable: true })
  transactionId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  productName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  productCode: string | null;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    type: 'enum',
    enum: HwImportSource,
  })
  importSource: HwImportSource;

  @Column({ type: 'varchar', length: 255, nullable: true })
  importFilename: string | null;

  @Column({ type: 'int', nullable: true })
  importRowNumber: number | null;

  @Column({ type: 'boolean', default: false })
  isReconciled: boolean;

  @Column({ type: 'uuid', nullable: true })
  reconciliationRunId: string | null;

  @Column({ type: 'jsonb', default: {} })
  rawData: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  importedByUserId: string | null;
}
