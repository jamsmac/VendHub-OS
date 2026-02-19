/**
 * Client Wallet Ledger Entity
 * Immutable transaction log for wallet balance changes
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ClientWallet } from "./client-wallet.entity";

/**
 * Types of wallet transactions
 */
export enum WalletTransactionType {
  TOP_UP = "TOP_UP",
  PURCHASE = "PURCHASE",
  REFUND = "REFUND",
  MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT",
  BONUS = "BONUS",
}

@Entity("client_wallet_ledger")
@Index(["walletId", "createdAt"])
@Index(["transactionType"])
export class ClientWalletLedger extends BaseEntity {
  @Column({ type: "uuid" })
  walletId: string;

  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "enum", enum: WalletTransactionType })
  transactionType: WalletTransactionType;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount: number;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  balanceBefore: number;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  balanceAfter: number;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "uuid", nullable: true })
  referenceId: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  referenceType: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  // Relations

  @ManyToOne(() => ClientWallet, (wallet) => wallet.ledgerEntries)
  @JoinColumn({ name: "wallet_id" })
  wallet: ClientWallet;
}
