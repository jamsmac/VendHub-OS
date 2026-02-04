/**
 * Transaction Entities for VendHub OS
 * Sales, collections, refunds, and fiscal integration
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum TransactionType {
  SALE = 'sale',
  REFUND = 'refund',
  COLLECTION = 'collection',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  ADJUSTMENT = 'adjustment',
  COMMISSION = 'commission',
  EXPENSE = 'expense',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  PAYME = 'payme',
  CLICK = 'click',
  QR = 'qr',
  UZCARD = 'uzcard',
  HUMO = 'humo',
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  NFC = 'nfc',
  BONUS = 'bonus',
  MIXED = 'mixed',
}

export enum ExpenseCategory {
  RENT = 'rent',
  PURCHASE = 'purchase',
  REPAIR = 'repair',
  SALARY = 'salary',
  UTILITIES = 'utilities',
  DEPRECIATION = 'depreciation',
  WRITEOFF = 'writeoff',
  TRANSPORT = 'transport',
  MARKETING = 'marketing',
  OTHER = 'other',
}

// ============================================================================
// TRANSACTION ENTITY
// ============================================================================

@Entity('transactions')
@Index(['organizationId'])
@Index(['machineId'])
@Index(['transactionNumber'], { unique: true, where: '"transaction_number" IS NOT NULL' })
@Index(['type'])
@Index(['status'])
@Index(['paymentMethod'])
@Index(['transactionDate'])
@Index(['createdAt'])
export class Transaction extends BaseEntity {
  @Column()
  organizationId: string;

  @Column({ nullable: true })
  machineId: string;

  @Column({ length: 50, nullable: true })
  transactionNumber: string;

  // Type and status
  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  // Amounts (UZS by default)
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ length: 3, default: 'UZS' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  exchangeRate: number;

  // Date/time
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  transactionDate: Date;

  @Column({ type: 'date', nullable: true })
  saleDate: Date; // For grouping by date

  // Payment details
  @Column({ length: 100, nullable: true })
  paymentId: string; // External payment system ID

  @Column({ length: 100, nullable: true })
  paymentReference: string;

  @Column({ length: 20, nullable: true })
  cardMask: string; // e.g., "**** **** **** 1234"

  @Column({ length: 20, nullable: true })
  cardType: string; // visa, mastercard, etc.

  // Related entities
  @Column({ nullable: true })
  userId: string; // Cashier/operator

  @Column({ nullable: true })
  recipeId: string; // For sales

  @Column({ nullable: true })
  recipeSnapshotId: string;

  @Column({ type: 'int', nullable: true })
  recipeVersion: number;

  @Column({ type: 'int', default: 1 })
  quantity: number; // Number of portions

  @Column({ nullable: true })
  taskId: string; // For collections linked to tasks

  @Column({ nullable: true })
  counterpartyId: string; // Supplier for expenses

  @Column({ nullable: true })
  contractId: string; // For commission calculations

  // Expense details
  @Column({ type: 'enum', enum: ExpenseCategory, nullable: true })
  expenseCategory: ExpenseCategory;

  // Fiscal data (Uzbekistan OFD integration)
  @Column({ length: 100, nullable: true })
  fiscalSign: string;

  @Column({ length: 50, nullable: true })
  fiscalReceiptNumber: string;

  @Column({ type: 'text', nullable: true })
  fiscalReceiptUrl: string;

  @Column({ type: 'text', nullable: true })
  fiscalQrCode: string;

  @Column({ type: 'timestamp', nullable: true })
  fiscalizedAt: Date;

  @Column({ default: false })
  isFiscalized: boolean;

  @Column({ type: 'jsonb', nullable: true })
  fiscalData: {
    terminalId?: string;
    serialNumber?: string;
    shift?: number;
    documentNumber?: number;
    checkNumber?: number;
    ofdId?: string;
    ofdName?: string;
    rawResponse?: Record<string, unknown>;
  };

  // Refund details
  @Column({ nullable: true })
  originalTransactionId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  refundedAmount: number;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date;

  @Column({ type: 'text', nullable: true })
  refundReason: string;

  @Column({ nullable: true })
  refundedByUserId: string;

  // Telemetry
  @Column({ nullable: true })
  machineSlotId: string;

  @Column({ nullable: true })
  vendingSessionId: string;

  @Column({ type: 'jsonb', nullable: true })
  telemetryData: {
    dispenseDuration?: number;
    temperature?: number;
    errorCodes?: string[];
    clientIp?: string;
    userAgent?: string;
  };

  // Description and notes
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // Metadata
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  // Relations
  @OneToMany('TransactionItem', 'transaction', { cascade: true })
  items: TransactionItem[];

  @ManyToOne('Machine', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine: { id: string; name?: string };

  @ManyToOne('Transaction', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'original_transaction_id' })
  originalTransaction: Transaction;

  // Auto-generate transaction number
  @BeforeInsert()
  generateTransactionNumber() {
    if (!this.transactionNumber) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const typePrefix = this.type === TransactionType.SALE ? 'S' :
                         this.type === TransactionType.REFUND ? 'R' :
                         this.type === TransactionType.COLLECTION ? 'C' : 'T';
      this.transactionNumber = `${typePrefix}-${timestamp}`;
    }
  }

  // Computed
  get isRefundable(): boolean {
    return (
      this.type === TransactionType.SALE &&
      this.status === TransactionStatus.COMPLETED &&
      !this.refundedAt
    );
  }

  get netAmount(): number {
    return this.totalAmount - (this.refundedAmount || 0);
  }
}

// ============================================================================
// TRANSACTION ITEM ENTITY
// ============================================================================

@Entity('transaction_items')
@Index(['transactionId'])
@Index(['productId'])
export class TransactionItem extends BaseEntity {
  @Column()
  transactionId: string;

  @Column()
  productId: string;

  @Column({ length: 200 })
  productName: string;

  @Column({ length: 50, nullable: true })
  sku: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 12 })
  vatRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  // Uzbekistan tax codes
  @Column({ length: 20, nullable: true })
  mxikCode: string;

  @Column({ length: 20, nullable: true })
  ikpuCode: string;

  @Column({ length: 20, nullable: true })
  packageType: string;

  // Mark code for mandatory marking
  @Column({ type: 'text', nullable: true })
  markCode: string;

  // Slot reference for vending
  @Column({ length: 20, nullable: true })
  slotNumber: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne('Transaction', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: Transaction;
}

// ============================================================================
// COLLECTION RECORD ENTITY
// ============================================================================

@Entity('collection_records')
@Index(['organizationId'])
@Index(['machineId'])
@Index(['collectedAt'])
@Index(['taskId'])
export class CollectionRecord extends BaseEntity {
  @Column()
  organizationId: string;

  @Column()
  machineId: string;

  @Column({ nullable: true })
  taskId: string;

  @Column({ nullable: true })
  transactionId: string; // Link to collection transaction

  @Column()
  collectedByUserId: string;

  // Amounts
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  cashAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  coinAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  // Expected amounts (from machine counter)
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  expectedCashAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  expectedCoinAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  expectedTotalAmount: number;

  // Difference
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  difference: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  differencePercent: number;

  // Counters
  @Column({ type: 'int', nullable: true })
  counterBefore: number;

  @Column({ type: 'int', nullable: true })
  counterAfter: number;

  @Column({ type: 'int', nullable: true })
  salesCount: number;

  // Verification
  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedByUserId: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  // Photos
  @Column({ type: 'text', nullable: true })
  photoUrl: string;

  @Column({ type: 'jsonb', default: [] })
  photoUrls: string[];

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  // Location
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: 'timestamp' })
  collectedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne('Machine', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine: { id: string; name?: string };

  // Computed
  get hasDiscrepancy(): boolean {
    if (this.difference === null || this.difference === undefined) return false;
    return Math.abs(this.difference) > 0;
  }

  get isSignificantDiscrepancy(): boolean {
    if (!this.differencePercent) return false;
    return Math.abs(this.differencePercent) > 5; // More than 5%
  }
}

// ============================================================================
// DAILY SUMMARY ENTITY (for reporting)
// ============================================================================

@Entity('transaction_daily_summaries')
@Index(['organizationId', 'summaryDate'], { unique: true })
@Index(['machineId', 'summaryDate'])
@Index(['summaryDate'])
export class TransactionDailySummary extends BaseEntity {
  @Column()
  organizationId: string;

  @Column({ nullable: true })
  machineId: string; // null = organization total

  @Column({ type: 'date' })
  summaryDate: Date;

  // Sales
  @Column({ type: 'int', default: 0 })
  salesCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  salesAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  salesVatAmount: number;

  // By payment method
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  cashAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  cardAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  mobileAmount: number;

  // Refunds
  @Column({ type: 'int', default: 0 })
  refundsCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  refundsAmount: number;

  // Collections
  @Column({ type: 'int', default: 0 })
  collectionsCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  collectionsAmount: number;

  // Expenses
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  expensesAmount: number;

  // Net
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  netAmount: number;

  // Product stats
  @Column({ type: 'jsonb', default: [] })
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    amount: number;
  }[];

  // Hourly breakdown
  @Column({ type: 'jsonb', default: [] })
  hourlyStats: {
    hour: number;
    count: number;
    amount: number;
  }[];

  @Column({ type: 'timestamp', nullable: true })
  calculatedAt: Date;
}

// ============================================================================
// COMMISSION ENTITY
// ============================================================================

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  TIERED = 'tiered',
  HYBRID = 'hybrid',
}

export enum CommissionStatus {
  PENDING = 'pending',
  CALCULATED = 'calculated',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('commissions')
@Index(['organizationId'])
@Index(['contractId'])
@Index(['periodStart', 'periodEnd'])
@Index(['status'])
export class Commission extends BaseEntity {
  @Column()
  organizationId: string;

  @Column()
  contractId: string;

  @Column({ nullable: true })
  locationId: string;

  @Column({ nullable: true })
  machineId: string;

  // Period
  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  // Amounts
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  baseAmount: number; // Total sales/revenue for period

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number; // Percentage

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  fixedAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  commissionAmount: number; // Calculated commission

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ length: 3, default: 'UZS' })
  currency: string;

  // Status
  @Column({ type: 'enum', enum: CommissionStatus, default: CommissionStatus.PENDING })
  status: CommissionStatus;

  @Column({ type: 'enum', enum: CommissionType, default: CommissionType.PERCENTAGE })
  commissionType: CommissionType;

  // Payment
  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ nullable: true })
  paymentTransactionId: string;

  @Column({ type: 'text', nullable: true })
  paymentReference: string;

  // Calculation details
  @Column({ type: 'jsonb', default: {} })
  calculationDetails: {
    transactionCount: number;
    averageTransaction: number;
    tierBreakdown?: { tier: number; amount: number; rate: number; commission: number }[];
    deductions?: { reason: string; amount: number }[];
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  calculatedByUserId: string;

  @Column({ type: 'timestamp', nullable: true })
  calculatedAt: Date;
}
