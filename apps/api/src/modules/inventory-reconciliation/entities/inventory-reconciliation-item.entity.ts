import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { InventoryReconciliation } from "./inventory-reconciliation.entity";
import { Product } from "../../products/entities/product.entity";

@Entity("inventory_reconciliation_items")
@Index(["reconciliationId"])
@Index(["productId"])
export class InventoryReconciliationItem extends BaseEntity {
  @Column({ type: "uuid" })
  reconciliationId: string;

  @ManyToOne(() => InventoryReconciliation, (r) => r.items, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "reconciliation_id" })
  reconciliation: InventoryReconciliation;

  @Column({ type: "uuid" })
  productId: string;

  @ManyToOne(() => Product, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int" })
  expectedQty: number;

  @Column({ type: "int" })
  actualQty: number;

  /** actual - expected */
  @Column({ type: "int" })
  diffQty: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  unitCost: number;

  /** Link to the auto-created ADJUSTMENT movement */
  @Column({ type: "uuid", nullable: true })
  adjustmentMovementId: string | null;

  @Column({ type: "text", nullable: true })
  note: string | null;
}
