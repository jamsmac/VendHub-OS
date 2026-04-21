import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Product } from "../../products/entities/product.entity";
import { Location } from "../../locations/entities/location.entity";
import { User } from "../../users/entities/user.entity";

export enum MovementType {
  PURCHASE_IN = "purchase_in",
  TRANSFER_TO_STORAGE = "transfer_to_storage",
  TRANSFER_TO_MACHINE = "transfer_to_machine",
  TRANSFER_BACK = "transfer_back",
  SALE = "sale",
  WRITE_OFF = "write_off",
  ADJUSTMENT_PLUS = "adjustment_plus",
  ADJUSTMENT_MINUS = "adjustment_minus",
  SAMPLE = "sample",
}

export enum MovementReferenceType {
  PURCHASE = "purchase",
  SALES_IMPORT = "sales_import",
  RECONCILIATION = "reconciliation",
  TRANSACTION = "transaction",
  MANUAL = "manual",
}

/**
 * Immutable event-sourced stock movement log.
 * NEVER update or delete rows — only INSERT.
 * Materialized into inventory_balances via Postgres trigger.
 */
@Entity("stock_movements")
@Index(["organizationId", "at"])
@Index(["organizationId", "productId", "at"])
@Index(["organizationId", "movementType"])
@Index(["fromLocationId"])
@Index(["toLocationId"])
@Index(["referenceType", "referenceId"])
export class StockMovement extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  productId: string;

  @ManyToOne(() => Product, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  /** Source location — null for PURCHASE_IN (coming from outside) */
  @Column({ type: "uuid", nullable: true })
  fromLocationId: string | null;

  @ManyToOne(() => Location, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "from_location_id" })
  fromLocation: Location | null;

  /** Destination location — null for SALE/WRITE_OFF/SAMPLE (leaving system) */
  @Column({ type: "uuid", nullable: true })
  toLocationId: string | null;

  @ManyToOne(() => Location, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "to_location_id" })
  toLocation: Location | null;

  /** Always positive. Direction encoded in movementType. */
  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "enum", enum: MovementType })
  movementType: MovementType;

  /** Cost at time of movement (from product/slot at that moment) */
  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  unitCost: number | null;

  /** Selling price at time of movement (for SALE mainly) */
  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  unitPrice: number | null;

  @Column({ type: "enum", enum: MovementReferenceType, nullable: true })
  referenceType: MovementReferenceType | null;

  @Column({ type: "uuid", nullable: true })
  referenceId: string | null;

  @Column({ type: "text", nullable: true })
  note: string | null;

  @Column({ type: "uuid", nullable: true })
  byUserId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "by_user_id" })
  byUser: User | null;

  /** Event timestamp — when movement occurred (not when row created) */
  @Column({ type: "timestamp with time zone" })
  at: Date;
}
