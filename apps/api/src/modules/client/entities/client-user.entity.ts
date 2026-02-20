/**
 * Client User Entity
 * Represents B2C end-customers (Telegram users, app users, etc.)
 */

import {
  Entity,
  Column,
  Index,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClientWallet } from './client-wallet.entity';
import { ClientLoyaltyAccount } from './client-loyalty-account.entity';
import { ClientOrder } from './client-order.entity';
import { ClientPayment } from './client-payment.entity';

@Entity('client_users')
@Index(['organization_id'])
export class ClientUser extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  telegram_id: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 5, default: 'ru' })
  language: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar_url: string | null;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'boolean', default: false })
  is_blocked: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_activity_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Relations

  @OneToOne(() => ClientWallet, (wallet) => wallet.client_user)
  wallet: ClientWallet;

  @OneToOne(() => ClientLoyaltyAccount, (loyalty) => loyalty.client_user)
  loyalty_account: ClientLoyaltyAccount;

  @OneToMany(() => ClientOrder, (order) => order.client_user)
  orders: ClientOrder[];

  @OneToMany(() => ClientPayment, (payment) => payment.client_user)
  payments: ClientPayment[];
}
