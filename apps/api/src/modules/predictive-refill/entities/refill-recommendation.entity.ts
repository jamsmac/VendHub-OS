import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { Product } from "../../products/entities/product.entity";

export enum RefillAction {
  REFILL_NOW = "refill_now",
  REFILL_SOON = "refill_soon",
  MONITOR = "monitor",
}

@Entity("refill_recommendations")
@Index(["organizationId", "priorityScore"])
@Index(["organizationId", "machineId", "productId"], { unique: true })
@Index(["organizationId", "recommendedAction"])
export class RefillRecommendation extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  machineId: string;

  @ManyToOne(() => Machine, { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;

  @Column({ type: "uuid" })
  productId: string;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "varchar", length: 64, nullable: true })
  slotId: string | null;

  @Column({ type: "int" })
  currentStock: number;

  @Column({ type: "int" })
  capacity: number;

  @Column({ type: "decimal", precision: 10, scale: 4 })
  dailyRate: number;

  @Column({ type: "decimal", precision: 6, scale: 2 })
  daysOfSupply: number;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  priorityScore: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  costPrice: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  margin: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  dailyProfit: number;

  @Column({
    type: "enum",
    enum: RefillAction,
    default: RefillAction.MONITOR,
  })
  recommendedAction: RefillAction;

  @Column({ type: "timestamp with time zone" })
  generatedAt: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  actedUponAt: Date | null;
}
