/**
 * Payment Refund Entity
 * Records refund requests and their processing status
 */

import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PaymentTransaction } from './payment-transaction.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',
  MACHINE_ERROR = 'machine_error',
  PRODUCT_UNAVAILABLE = 'product_unavailable',
  DUPLICATE = 'duplicate',
  OTHER = 'other',
}

// ============================================================================
// PAYMENT REFUND ENTITY
// ============================================================================

@Entity('payment_refunds')
@Index(['payment_transaction_id'])
@Index(['status'])
export class PaymentRefund extends BaseEntity {
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  payment_transaction_id: string;

  @ManyToOne(() => PaymentTransaction, (tx) => tx.refunds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_transaction_id' })
  payment_transaction: PaymentTransaction;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: RefundReason,
  })
  reason: RefundReason;

  @Column({ type: 'text', nullable: true })
  reason_note: string | null;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_refund_id: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processed_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  processed_by_user_id: string | null;
}
