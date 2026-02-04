/**
 * Client Wallet Ledger Entity
 * Immutable transaction log for wallet balance changes
 */

import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClientWallet } from './client-wallet.entity';

/**
 * Types of wallet transactions
 */
export enum WalletTransactionType {
  TOP_UP = 'TOP_UP',
  PURCHASE = 'PURCHASE',
  REFUND = 'REFUND',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
  BONUS = 'BONUS',
}

@Entity('client_wallet_ledger')
@Index(['wallet_id', 'created_at'])
@Index(['transaction_type'])
export class ClientWalletLedger extends BaseEntity {
  @Column({ type: 'uuid' })
  wallet_id: string;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @Column({ type: 'enum', enum: WalletTransactionType })
  transaction_type: WalletTransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balance_before: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balance_after: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  reference_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Relations

  @ManyToOne(() => ClientWallet, (wallet) => wallet.ledger_entries)
  @JoinColumn({ name: 'wallet_id' })
  wallet: ClientWallet;
}
