import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Fiscal Receipt Status
 */
export enum FiscalReceiptStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Fiscal Receipt Type
 */
export enum FiscalReceiptType {
  SALE = 'sale',
  REFUND = 'refund',
}

/**
 * Fiscal Shift Status
 */
export enum FiscalShiftStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

/**
 * Fiscal Device Status
 */
export enum FiscalDeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
}

/**
 * Queue Item Status
 */
export enum FiscalQueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRY = 'retry',
}

// ============================================
// Fiscal Device Entity
// ============================================

@Entity('fiscal_devices')
@Index(['organizationId', 'status'])
export class FiscalDevice extends BaseEntity {
  @Column('uuid')
  @Index()
  organizationId: string;

  @Column()
  name: string;

  @Column()
  provider: string; // multikassa, ofd, etc.

  @Column({ nullable: true })
  serialNumber: string;

  @Column({ nullable: true })
  terminalId: string;

  @Column('jsonb', { default: {} })
  credentials: {
    login?: string;
    password?: string;
    companyTin?: string;
    apiKey?: string;
  };

  @Column({
    type: 'enum',
    enum: FiscalDeviceStatus,
    default: FiscalDeviceStatus.INACTIVE,
  })
  status: FiscalDeviceStatus;

  @Column({ default: false })
  sandboxMode: boolean;

  @Column('jsonb', { default: {} })
  config: {
    baseUrl?: string;
    defaultCashier?: string;
    vatRates?: number[];
    autoOpenShift?: boolean;
    autoCloseShift?: boolean;
    closeShiftAt?: string; // HH:mm format
  };

  @Column('jsonb', { default: {} })
  lastSync: {
    syncedAt?: Date;
    status?: string;
    error?: string;
  };

  @OneToMany(() => FiscalShift, shift => shift.device)
  shifts: FiscalShift[];

  @OneToMany(() => FiscalReceipt, receipt => receipt.device)
  receipts: FiscalReceipt[];
}

// ============================================
// Fiscal Shift Entity
// ============================================

@Entity('fiscal_shifts')
@Index(['deviceId', 'status'])
@Index(['organizationId', 'openedAt'])
export class FiscalShift extends BaseEntity {
  @Column('uuid')
  @Index()
  organizationId: string;

  @Column('uuid')
  deviceId: string;

  @ManyToOne(() => FiscalDevice, device => device.shifts)
  @JoinColumn({ name: 'device_id' })
  device: FiscalDevice;

  @Column({ nullable: true })
  externalShiftId: string;

  @Column()
  shiftNumber: number;

  @Column({
    type: 'enum',
    enum: FiscalShiftStatus,
    default: FiscalShiftStatus.OPEN,
  })
  status: FiscalShiftStatus;

  @Column()
  cashierName: string;

  @Column('timestamp')
  openedAt: Date;

  @Column('timestamp', { nullable: true })
  closedAt: Date;

  // Totals
  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  totalSales: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  totalRefunds: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  totalCash: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  totalCard: number;

  @Column('int', { default: 0 })
  receiptsCount: number;

  // Z-Report data
  @Column({ nullable: true })
  zReportNumber: string;

  @Column({ nullable: true })
  zReportUrl: string;

  @Column('jsonb', { nullable: true })
  vatSummary: {
    rate: number;
    amount: number;
    taxAmount: number;
  }[];

  @OneToMany(() => FiscalReceipt, receipt => receipt.shift)
  receipts: FiscalReceipt[];
}

// ============================================
// Fiscal Receipt Entity
// ============================================

@Entity('fiscal_receipts')
@Index(['organizationId', 'createdAt'])
@Index(['shiftId', 'type'])
@Index(['orderId'])
@Index(['fiscalNumber'])
export class FiscalReceipt extends BaseEntity {
  @Column('uuid')
  @Index()
  organizationId: string;

  @Column('uuid')
  deviceId: string;

  @ManyToOne(() => FiscalDevice, device => device.receipts)
  @JoinColumn({ name: 'device_id' })
  device: FiscalDevice;

  @Column('uuid')
  shiftId: string;

  @ManyToOne(() => FiscalShift, shift => shift.receipts)
  @JoinColumn({ name: 'shift_id' })
  shift: FiscalShift;

  // External references
  @Column({ nullable: true })
  externalReceiptId: string;

  @Column({ nullable: true })
  orderId: string;

  @Column({ nullable: true })
  transactionId: string;

  // Receipt type
  @Column({
    type: 'enum',
    enum: FiscalReceiptType,
    default: FiscalReceiptType.SALE,
  })
  type: FiscalReceiptType;

  @Column({
    type: 'enum',
    enum: FiscalReceiptStatus,
    default: FiscalReceiptStatus.PENDING,
  })
  status: FiscalReceiptStatus;

  // Items
  @Column('jsonb')
  items: {
    name: string;
    ikpuCode: string;
    packageCode?: string;
    quantity: number;
    price: number; // In tiyin
    vatRate: number;
    vatAmount: number;
    unit: string;
    total: number;
  }[];

  // Payment
  @Column('jsonb')
  payment: {
    cash: number;
    card: number;
    other?: number;
  };

  @Column('decimal', { precision: 18, scale: 2 })
  total: number;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  vatTotal: number;

  // Fiscal data (filled after fiscalization)
  @Column({ nullable: true })
  fiscalNumber: string;

  @Column({ nullable: true })
  fiscalSign: string;

  @Column({ nullable: true })
  qrCodeUrl: string;

  @Column({ nullable: true })
  receiptUrl: string;

  @Column('timestamp', { nullable: true })
  fiscalizedAt: Date;

  // Error handling
  @Column('int', { default: 0 })
  retryCount: number;

  @Column({ nullable: true })
  lastError: string;

  // Metadata
  @Column('jsonb', { default: {} })
  metadata: {
    machineId?: string;
    locationId?: string;
    operatorId?: string;
    comment?: string;
    rawRequest?: Record<string, unknown>;
    rawResponse?: Record<string, unknown>;
  };
}

// ============================================
// Fiscal Queue Entity (for offline mode)
// ============================================

@Entity('fiscal_queue')
@Index(['organizationId', 'status'])
@Index(['deviceId', 'priority'])
export class FiscalQueue extends BaseEntity {
  @Column('uuid')
  @Index()
  organizationId: string;

  @Column('uuid')
  deviceId: string;

  @Column()
  operation: 'receipt_sale' | 'receipt_refund' | 'shift_open' | 'shift_close' | 'x_report';

  @Column('jsonb')
  payload: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: FiscalQueueStatus,
    default: FiscalQueueStatus.PENDING,
  })
  status: FiscalQueueStatus;

  @Column('int', { default: 0 })
  priority: number; // Higher = more urgent

  @Column('int', { default: 0 })
  retryCount: number;

  @Column('int', { default: 5 })
  maxRetries: number;

  @Column('timestamp', { nullable: true })
  nextRetryAt: Date;

  @Column({ nullable: true })
  lastError: string;

  @Column('jsonb', { nullable: true })
  result: Record<string, unknown> | null;

  @Column('timestamp', { nullable: true })
  processedAt: Date;
}
