import { Entity, Column, PrimaryColumn, Index } from "typeorm";

/**
 * Daily aggregate snapshot per (org, reportDay, machine, product).
 * Used for HICON delta calculation — compare new upload vs previous state.
 * Composite primary key matches natural key.
 */
@Entity("sales_aggregated")
@Index(["organizationId", "reportDay"])
export class SalesAggregated {
  @PrimaryColumn({ type: "uuid" })
  organizationId: string;

  @PrimaryColumn({ type: "date" })
  reportDay: string;

  @PrimaryColumn({ type: "uuid" })
  machineId: string;

  @PrimaryColumn({ type: "uuid" })
  productId: string;

  @Column({ type: "int", default: 0 })
  qty: number;

  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: "uuid", nullable: true })
  lastImportId: string | null;

  @Column({ type: "timestamp with time zone", default: () => "NOW()" })
  lastUpdate: Date;
}
