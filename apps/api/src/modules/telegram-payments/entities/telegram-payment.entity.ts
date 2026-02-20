/**
 * TelegramPayment Entity
 * Платежи через Telegram Bot API
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import {
  TelegramPaymentStatus,
  TelegramPaymentProvider,
  TelegramPaymentCurrency,
} from '../telegram-payments.constants';

@Entity('telegram_payments')
@Index(['userId', 'status'])
@Index(['organizationId', 'created_at'])
@Index(['telegramPaymentChargeId'], { unique: true, where: '"telegram_payment_charge_id" IS NOT NULL' })
export class TelegramPayment extends BaseEntity {
  @Column('uuid')
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid')
  @Index()
  organizationId: string;

  @Column('uuid', { nullable: true })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: TelegramPaymentProvider,
  })
  provider: TelegramPaymentProvider;

  @Column({
    type: 'enum',
    enum: TelegramPaymentStatus,
    default: TelegramPaymentStatus.PENDING,
  })
  @Index()
  status: TelegramPaymentStatus;

  @Column({
    type: 'enum',
    enum: TelegramPaymentCurrency,
  })
  currency: TelegramPaymentCurrency;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column('bigint')
  telegramUserId: number;

  @Column('bigint', { nullable: true })
  telegramChatId: number;

  @Column({ nullable: true })
  telegramPaymentChargeId: string;

  @Column({ nullable: true })
  providerPaymentChargeId: string;

  @Column({ nullable: true })
  invoicePayload: string;

  @Column({ nullable: true })
  shippingOptionId: string;

  @Column('jsonb', { nullable: true })
  orderInfo: {
    name?: string;
    phoneNumber?: string;
    email?: string;
    shippingAddress?: {
      countryCode: string;
      state: string;
      city: string;
      streetLine1: string;
      streetLine2?: string;
      postCode: string;
    };
  };

  @Column('text', { nullable: true })
  description: string;

  @Column('text', { nullable: true })
  failureReason: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown>;

  @Column({ nullable: true })
  refundedAt: Date;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  refundedAmount: number;

  @Column({ nullable: true })
  completedAt: Date;
}
