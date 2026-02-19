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
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ClientUser } from "./client-user.entity";
import { ClientWalletLedger } from "./client-wallet-ledger.entity";

@Entity("client_wallets")
@Index(["organizationId"])
export class ClientWallet extends BaseEntity {
  @Column({ type: "uuid", unique: true })
  clientUserId: string;

  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ type: "varchar", length: 10, default: "UZS" })
  currency: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  // Relations

  @OneToOne(() => ClientUser, (user) => user.wallet)
  @JoinColumn({ name: "client_user_id" })
  clientUser: ClientUser;

  @OneToMany(() => ClientWalletLedger, (ledger) => ledger.wallet)
  ledgerEntries: ClientWalletLedger[];
}
