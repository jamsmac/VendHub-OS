/**
 * Client Order Entity
 * Represents B2C purchase orders from vending machines
 */

import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClientUser } from './client-user.entity';
import { ClientPayment } from './client-payment.entity';

/**
 * Status flow: PENDING -> PAID -> DISPENSING -> COMPLETED
 *              PENDING -> CANCELLED
 *              PAID -> FAILED / REFUNDED
 */
export enum ClientOrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  DISPENSING = 'DISPENSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Structure for individual items within an order
 */
export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

@Entity('client_orders')
@Index(['client_user_id', 'created_at'])
@Index(['machine_id'])
@Index(['status'])
@Index(['organization_id'])
export class ClientOrder extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @Column({ type: 'varchar', length: 50, unique: true })
  order_number: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @Column({ type: 'enum', enum: ClientOrderStatus, default: ClientOrderStatus.PENDING })
  status: ClientOrderStatus;

  @Column({ type: 'jsonb', default: [] })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'integer', default: 0 })
  loyalty_points_used: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total_amount: number;

  @Column({ type: 'varchar', length: 10, default: 'UZS' })
  currency: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Relations

  @ManyToOne(() => ClientUser, (user) => user.orders)
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @OneToMany(() => ClientPayment, (payment) => payment.order)
  payments: ClientPayment[];

  /**
   * Auto-generate order number before insert
   * Format: ORD-XXXXXXXX (8 random hex chars)
   */
  @BeforeInsert()
  generateOrderNumber() {
    if (!this.order_number) {
      const random = Math.random().toString(16).substring(2, 10).toUpperCase();
      this.order_number = `ORD-${random}`;
    }
  }
}
