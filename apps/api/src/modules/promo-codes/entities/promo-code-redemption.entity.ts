/**
 * Promo Code Redemption Entity for VendHub OS
 * Tracks each usage of a promo code by a client
 */

import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PromoCode } from './promo-code.entity';

@Entity('promo_code_redemptions')
@Index(['promo_code_id', 'client_user_id'])
@Index(['promo_code_id'])
@Index(['client_user_id'])
@Index(['order_id'])
export class PromoCodeRedemption extends BaseEntity {
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  promo_code_id: string;

  @ManyToOne(() => PromoCode, (promoCode) => promoCode.redemptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promo_code_id' })
  promo_code: PromoCode;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  discount_applied: number;

  @Column({ type: 'int', default: 0 })
  loyalty_points_awarded: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  order_amount: number | null;

  @Column({ type: 'timestamp with time zone', default: () => 'NOW()' })
  redeemed_at: Date;
}
