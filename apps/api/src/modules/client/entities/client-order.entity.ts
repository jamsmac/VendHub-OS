/**
 * Client Order Entity
 * Represents B2C purchase orders from vending machines
 */

import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { ClientUser } from "./client-user.entity";
import { ClientPayment } from "./client-payment.entity";

/**
 * Status flow: PENDING -> PAID -> DISPENSING -> COMPLETED
 *              PENDING -> CANCELLED
 *              PAID -> FAILED / REFUNDED
 */
export enum ClientOrderStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  DISPENSING = "DISPENSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

/**
 * Structure for individual items within an order
 */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

@Entity("client_orders")
@Index(["clientUserId", "createdAt"])
@Index(["machineId"])
@Index(["status"])
@Index(["organizationId"])
export class ClientOrder extends BaseEntity {
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "varchar", length: 50, unique: true })
  orderNumber: string;

  @Column({ type: "uuid" })
  clientUserId: string;

  @Column({ type: "uuid", nullable: true })
  machineId: string | null;

  @Column({
    type: "enum",
    enum: ClientOrderStatus,
    default: ClientOrderStatus.PENDING,
  })
  status: ClientOrderStatus;

  @Column({ type: "jsonb", default: [] })
  items: OrderItem[];

  @Column({ type: "decimal", precision: 15, scale: 2 })
  subtotal: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: "integer", default: 0 })
  loyaltyPointsUsed: number;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: "varchar", length: 10, default: "UZS" })
  currency: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  paidAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  cancelledAt: Date | null;

  @Column({ type: "text", nullable: true })
  cancellationReason: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  // Relations

  @ManyToOne(() => ClientUser, (user) => user.orders)
  @JoinColumn({ name: "client_user_id" })
  clientUser: ClientUser;

  @OneToMany(() => ClientPayment, (payment) => payment.order)
  payments: ClientPayment[];

  /**
   * Auto-generate order number before insert
   * Format: ORD-XXXXXXXX (8 random hex chars)
   */
  @BeforeInsert()
  generateOrderNumber() {
    if (!this.orderNumber) {
      const random = Math.random().toString(16).substring(2, 10).toUpperCase();
      this.orderNumber = `ORD-${random}`;
    }
  }
}
