/**
 * Client Payment Entity
 * Tracks payment transactions for client orders
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ClientOrder } from "./client-order.entity";
import { ClientUser } from "./client-user.entity";

/**
 * Payment processing status
 */
export enum ClientPaymentStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

/**
 * Supported payment providers for B2C payments
 */
export enum ClientPaymentProvider {
  TELEGRAM = "telegram",
  CLICK = "click",
  PAYME = "payme",
  UZUM = "uzum",
  WALLET = "wallet",
}

@Entity("client_payments")
@Index(["orderId"])
@Index(["clientUserId"])
@Index(["provider", "status"])
@Index(["providerPaymentId"])
export class ClientPayment extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "uuid" })
  orderId: string;

  @Column({ type: "uuid" })
  clientUserId: string;

  @Column({ type: "varchar", length: 20 })
  provider: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  providerPaymentId: string | null;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 10, default: "UZS" })
  currency: string;

  @Column({
    type: "enum",
    enum: ClientPaymentStatus,
    default: ClientPaymentStatus.PENDING,
  })
  status: ClientPaymentStatus;

  @Column({ type: "timestamp with time zone", nullable: true })
  paidAt: Date | null;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "jsonb", nullable: true })
  rawResponse: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  // Relations

  @ManyToOne(() => ClientOrder, (order) => order.payments)
  @JoinColumn({ name: "order_id" })
  order: ClientOrder;

  @ManyToOne(() => ClientUser, (user) => user.payments)
  @JoinColumn({ name: "client_user_id" })
  clientUser: ClientUser;
}
