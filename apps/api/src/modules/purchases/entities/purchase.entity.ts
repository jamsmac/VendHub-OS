import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Supplier } from "../../products/entities/product.entity";
import { Location } from "../../locations/entities/location.entity";
import { User } from "../../users/entities/user.entity";
import { PurchaseItem } from "./purchase-item.entity";

export enum PurchaseStatus {
  DRAFT = "draft",
  RECEIVED = "received",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  CASH = "cash",
  CARD_HUMO = "card_humo",
  CARD_UZCARD = "card_uzcard",
  CARD_VISA = "card_visa",
  TRANSFER = "transfer",
  PAYME = "payme",
  CLICK = "click",
  OTHER = "other",
}

@Entity("purchases")
@Index(["organizationId", "status"])
@Index(["organizationId", "purchaseDate"])
@Index(["organizationId", "supplierId"])
export class Purchase extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  number: string | null;

  @Column({ type: "uuid", nullable: true })
  supplierId: string | null;

  @ManyToOne(() => Supplier, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  supplierNameSnapshot: string | null;

  @Column({ type: "uuid" })
  warehouseLocationId: string;

  @ManyToOne(() => Location, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "warehouse_location_id" })
  warehouseLocation: Location;

  @Column({ type: "enum", enum: PaymentMethod, nullable: true })
  paymentMethod: PaymentMethod | null;

  @Column({
    type: "enum",
    enum: PurchaseStatus,
    default: PurchaseStatus.DRAFT,
  })
  status: PurchaseStatus;

  @Column({ type: "timestamp with time zone" })
  purchaseDate: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  receivedAt: Date | null;

  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: "int", default: 0 })
  totalItems: number;

  @Column({ type: "text", nullable: true })
  note: string | null;

  @Column({ type: "uuid", nullable: true })
  byUserId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "by_user_id" })
  byUser: User | null;

  @OneToMany(() => PurchaseItem, (item) => item.purchase, {
    cascade: ["insert", "update"],
  })
  items: PurchaseItem[];
}
