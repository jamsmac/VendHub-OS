/**
 * Client User Entity
 * Represents B2C end-customers (Telegram users, app users, etc.)
 */

import { Entity, Column, Index, OneToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ClientWallet } from "./client-wallet.entity";
import { ClientLoyaltyAccount } from "./client-loyalty-account.entity";
import { ClientOrder } from "./client-order.entity";
import { ClientPayment } from "./client-payment.entity";

@Entity("client_users")
@Index(["organizationId"])
export class ClientUser extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "varchar", length: 50, nullable: true, unique: true })
  telegramId: string | null;

  @Column({ type: "varchar", length: 20, nullable: true, unique: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  email: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  firstName: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  lastName: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  username: string | null;

  @Column({ type: "varchar", length: 5, default: "ru" })
  language: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: "boolean", default: false })
  isVerified: boolean;

  @Column({ type: "boolean", default: false })
  isBlocked: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastActivityAt: Date | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  // Relations

  @OneToOne(() => ClientWallet, (wallet) => wallet.clientUser)
  wallet: ClientWallet;

  @OneToOne(() => ClientLoyaltyAccount, (loyalty) => loyalty.clientUser)
  loyaltyAccount: ClientLoyaltyAccount;

  @OneToMany(() => ClientOrder, (order) => order.clientUser)
  orders: ClientOrder[];

  @OneToMany(() => ClientPayment, (payment) => payment.clientUser)
  payments: ClientPayment[];
}
