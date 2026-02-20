/**
 * Client Payment Entity
 * Tracks payment transactions for client orders
 */

import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClientOrder } from './client-order.entity';
import { ClientUser } from './client-user.entity';

/**
 * Payment processing status
 */
export enum ClientPaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

/**
 * Supported payment providers for B2C payments
 */
export enum ClientPaymentProvider {
  TELEGRAM = 'telegram',
  CLICK = 'click',
  PAYME = 'payme',
  UZUM = 'uzum',
  WALLET = 'wallet',
}

@Entity('client_payments')
@Index(['order_id'])
@Index(['client_user_id'])
@Index(['provider', 'status'])
@Index(['provider_payment_id'])
export class ClientPayment extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @Column({ type: 'uuid' })
  order_id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @Column({ type: 'varchar', length: 20 })
  provider: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_payment_id: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'UZS' })
  currency: string;

  @Column({ type: 'enum', enum: ClientPaymentStatus, default: ClientPaymentStatus.PENDING })
  status: ClientPaymentStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'jsonb', nullable: true })
  raw_response: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Relations

  @ManyToOne(() => ClientOrder, (order) => order.payments)
  @JoinColumn({ name: 'order_id' })
  order: ClientOrder;

  @ManyToOne(() => ClientUser, (user) => user.payments)
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;
}
