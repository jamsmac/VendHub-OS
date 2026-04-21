import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Location } from "../../locations/entities/location.entity";
import { User } from "../../users/entities/user.entity";
import { InventoryReconciliationItem } from "./inventory-reconciliation-item.entity";

export enum InventoryReconciliationStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
}

@Entity("inventory_reconciliations")
@Index(["organizationId", "status"])
@Index(["organizationId", "locationId"])
@Index(["organizationId", "countedAt"])
export class InventoryReconciliation extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  locationId: string;

  @ManyToOne(() => Location, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column({
    type: "enum",
    enum: InventoryReconciliationStatus,
    default: InventoryReconciliationStatus.DRAFT,
  })
  status: InventoryReconciliationStatus;

  @Column({ type: "timestamp with time zone" })
  countedAt: Date;

  /** Sum of all diff quantities (can be negative if net shortage) */
  @Column({ type: "int", default: 0 })
  totalDifferenceQty: number;

  /** Sum of cost impact — positive for surplus, negative for shortage */
  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  totalDifferenceAmount: number;

  /** Shortage total in UZS at cost price (only negative diffs summed) */
  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  nedostacha: number;

  @Column({ type: "text", nullable: true })
  note: string | null;

  @Column({ type: "uuid", nullable: true })
  byUserId: string | null;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "by_user_id" })
  byUser: User | null;

  @OneToMany(() => InventoryReconciliationItem, (item) => item.reconciliation, {
    cascade: ["insert", "update"],
  })
  items: InventoryReconciliationItem[];
}
