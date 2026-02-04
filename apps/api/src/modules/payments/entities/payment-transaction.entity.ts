/**
 * Payment Transaction Entity
 * Records all payment transactions from Payme, Click, Uzum, Telegram Stars, Cash, Wallet
 */

import {
  Entity,
  Column,
  Index,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum PaymentProvider {
  PAYME = 'payme',
  CLICK = 'click',
  UZUM = 'uzum',
  TELEGRAM_STARS = 'telegram_stars',
  CASH = 'cash',
  WALLET = 'wallet',
}

export enum PaymentTransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

// ============================================================================
// PAYMENT TRANSACTION ENTITY
// ============================================================================

@Entity('payment_transactions')
@Index(['organization_id', 'status'])
@Index(['organization_id', 'provider'])
@Index(['provider_tx_id'], { unique: true, where: '"provider_tx_id" IS NOT NULL' })
@Index(['order_id'])
@Index(['machine_id'])
export class PaymentTransaction extends BaseEntity {
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_tx_id: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'UZS' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING,
  })
  status: PaymentTransactionStatus;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  client_user_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  raw_request: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  raw_response: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processed_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Relations
  @OneToMany('PaymentRefund', 'payment_transaction')
  refunds: import('./payment-refund.entity').PaymentRefund[];
}
