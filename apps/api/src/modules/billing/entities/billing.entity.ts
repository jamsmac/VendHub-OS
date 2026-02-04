/**
 * Billing Entities
 * Счета (инвойсы) и платежи для B2B расчётов
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

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  PARTIALLY_PAID = 'partially_paid',
}

export enum BillingPaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  ONLINE = 'online',
}

export enum BillingPaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

// ============================================================================
// INVOICE ENTITY
// ============================================================================

@Entity('invoices')
@Index(['organizationId'])
@Index(['customerId'])
@Index(['status'])
@Index(['invoiceNumber'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['dueDate'])
export class Invoice extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'varchar', length: 50 })
  invoiceNumber: string;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerName: string | null;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({ type: 'jsonb' })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    productId?: string;
  }>;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Relations
  @OneToMany(() => BillingPayment, (payment) => payment.invoice)
  payments: BillingPayment[];
}

// ============================================================================
// BILLING PAYMENT ENTITY
// ============================================================================

@Entity('billing_payments')
@Index(['organizationId'])
@Index(['invoiceId'])
@Index(['status'])
@Index(['paymentDate'])
export class BillingPayment extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (invoice) => invoice.payments)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentNumber: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({
    type: 'enum',
    enum: BillingPaymentMethod,
  })
  paymentMethod: BillingPaymentMethod;

  @Column({
    type: 'enum',
    enum: BillingPaymentStatus,
    default: BillingPaymentStatus.PENDING,
  })
  status: BillingPaymentStatus;

  @Column({ type: 'date' })
  paymentDate: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceNumber: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
