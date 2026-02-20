/**
 * Promo Code Entity for VendHub OS
 * Promotional codes for discounts, fixed amounts, and loyalty bonuses
 */

import {
  Entity,
  Column,
  Index,
  BeforeInsert,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PromoCodeRedemption } from './promo-code-redemption.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Type of promo code discount
 */
export enum PromoCodeType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  LOYALTY_BONUS = 'loyalty_bonus',
}

/**
 * Status of the promo code
 */
export enum PromoCodeStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity('promo_codes')
@Index(['code'], { unique: true })
@Index(['organization_id', 'status'])
@Index(['valid_from', 'valid_until'])
export class PromoCode extends BaseEntity {
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: PromoCodeType,
  })
  type: PromoCodeType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  value: number;

  @Column({
    type: 'enum',
    enum: PromoCodeStatus,
    default: PromoCodeStatus.DRAFT,
  })
  status: PromoCodeStatus;

  // ===== Usage Limits =====

  @Column({ type: 'int', nullable: true })
  max_total_uses: number | null;

  @Column({ type: 'int', default: 1 })
  max_uses_per_user: number;

  @Column({ type: 'int', default: 0 })
  current_total_uses: number;

  // ===== Validity Period =====

  @Column({ type: 'timestamp with time zone' })
  valid_from: Date;

  @Column({ type: 'timestamp with time zone' })
  valid_until: Date;

  // ===== Applicability Rules =====

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  min_order_amount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  max_discount_amount: number | null;

  @Column({ type: 'jsonb', nullable: true })
  applicable_machine_ids: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  applicable_product_ids: string[] | null;

  // ===== Metadata =====

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ===== Relations =====

  @OneToMany(() => PromoCodeRedemption, (redemption) => redemption.promo_code)
  redemptions: PromoCodeRedemption[];

  // ===== Hooks =====

  @BeforeInsert()
  uppercaseCode() {
    if (this.code) {
      this.code = this.code.toUpperCase();
    }
  }
}
