import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { Product } from "../../products/entities/product.entity";

@Entity("consumption_rates")
@Index(["organizationId", "machineId", "productId", "periodDays"], {
  unique: true,
})
@Index(["organizationId", "lastCalculatedAt"])
export class ConsumptionRate extends BaseEntity {
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

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  ratePerDay: number;

  @Column({ type: "int" })
  periodDays: number;

  @Column({ type: "int", default: 0 })
  sampleSize: number;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastCalculatedAt: Date | null;
}
