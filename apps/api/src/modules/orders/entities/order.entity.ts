/**
 * Order Entity
 * Заказы клиентов
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
import { User } from '../../users/entities/user.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { Product } from '../../products/entities/product.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentMethod {
  CASH = 'cash',
  CLICK = 'click',
  PAYME = 'payme',
  UZUM = 'uzum',
  TELEGRAM = 'telegram',
  BONUS = 'bonus',
  MIXED = 'mixed',
}

// ============================================================================
// ORDER ENTITY
// ============================================================================

@Entity('orders')
@Index(['organizationId', 'status'])
@Index(['userId', 'createdAt'])
@Index(['machineId', 'createdAt'])
@Index(['orderNumber'], { unique: true })
export class Order extends BaseEntity {
  @Column()
  @Index()
  organizationId: string;

  @Column({ unique: true })
  orderNumber: string; // ORD-2025-00001

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  machineId: string;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod: PaymentMethod;

  // Amounts
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  bonusAmount: number; // Paid with bonus points

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  // Loyalty
  @Column({ type: 'int', default: 0 })
  pointsEarned: number;

  @Column({ type: 'int', default: 0 })
  pointsUsed: number;

  // Promo
  @Column({ length: 50, nullable: true })
  promoCode: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  promoDiscount: number;

  // Relations
  @OneToMany(() => OrderItem, item => item.order, { cascade: true })
  items: OrderItem[];

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  // Timestamps
  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  preparedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  refundedAt: Date;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}

// ============================================================================
// ORDER ITEM ENTITY
// ============================================================================

@Entity('order_items')
@Index(['orderId', 'productId'])
export class OrderItem extends BaseEntity {
  @Column()
  orderId: string;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column()
  productId: string;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ length: 255 })
  productName: string;

  @Column({ length: 100, nullable: true })
  productSku: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalPrice: number;

  // Customizations
  @Column({ type: 'jsonb', nullable: true })
  customizations: {
    size?: string;
    sugar?: number;
    milk?: string;
    extras?: string[];
  };

  @Column({ type: 'text', nullable: true })
  notes: string;
}
