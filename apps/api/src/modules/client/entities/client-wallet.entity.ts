/**
 * Client Wallet Entity
 * Stores customer wallet balance for cashless purchases
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
import { ClientWalletLedger } from './client-wallet-ledger.entity';

@Entity('client_wallets')
@Index(['organization_id'])
export class ClientWallet extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  client_user_id: string;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 10, default: 'UZS' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Relations

  @OneToOne(() => ClientUser, (user) => user.wallet)
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @OneToMany(() => ClientWalletLedger, (ledger) => ledger.wallet)
  ledger_entries: ClientWalletLedger[];
}
