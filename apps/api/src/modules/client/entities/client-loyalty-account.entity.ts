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
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ClientUser } from "./client-user.entity";
import { ClientLoyaltyLedger } from "./client-loyalty-ledger.entity";

@Entity("client_loyalty_accounts")
export class ClientLoyaltyAccount extends BaseEntity {
  @Column({ type: "uuid", unique: true })
  @Index({ unique: true })
  clientUserId: string;

  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "integer", default: 0 })
  pointsBalance: number;

  @Column({ type: "integer", default: 0 })
  totalEarned: number;

  @Column({ type: "integer", default: 0 })
  totalRedeemed: number;

  @Column({ type: "varchar", length: 20, default: "bronze" })
  tier: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  tierUpdatedAt: Date | null;

  // Relations

  @OneToOne(() => ClientUser, (user) => user.loyaltyAccount)
  @JoinColumn({ name: "client_user_id" })
  clientUser: ClientUser;

  @OneToMany(() => ClientLoyaltyLedger, (ledger) => ledger.loyaltyAccount)
  ledgerEntries: ClientLoyaltyLedger[];
}
