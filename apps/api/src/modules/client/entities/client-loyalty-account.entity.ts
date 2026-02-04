/**
 * Client Loyalty Account Entity
 * Tracks loyalty points balance and tier for each customer
 */

import {
  Entity,
  Column,
  Index,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClientUser } from './client-user.entity';
import { ClientLoyaltyLedger } from './client-loyalty-ledger.entity';

@Entity('client_loyalty_accounts')
export class ClientLoyaltyAccount extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  @Index({ unique: true })
  client_user_id: string;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @Column({ type: 'integer', default: 0 })
  points_balance: number;

  @Column({ type: 'integer', default: 0 })
  total_earned: number;

  @Column({ type: 'integer', default: 0 })
  total_redeemed: number;

  @Column({ type: 'varchar', length: 20, default: 'bronze' })
  tier: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  tier_updated_at: Date | null;

  // Relations

  @OneToOne(() => ClientUser, (user) => user.loyalty_account)
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @OneToMany(() => ClientLoyaltyLedger, (ledger) => ledger.loyalty_account)
  ledger_entries: ClientLoyaltyLedger[];
}
