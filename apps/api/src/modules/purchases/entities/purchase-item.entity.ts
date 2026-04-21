import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Purchase } from "./purchase.entity";
import { Product } from "../../products/entities/product.entity";

@Entity("purchase_items")
@Index(["purchaseId"])
@Index(["productId"])
export class PurchaseItem extends BaseEntity {
  @Column({ type: "uuid" })
  purchaseId: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.items, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "purchase_id" })
  purchase: Purchase;

  @Column({ type: "uuid" })
  productId: string;

  @ManyToOne(() => Product, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  unitCost: number;

  @Column({ type: "decimal", precision: 14, scale: 2 })
  lineTotal: number;

  @Column({ type: "text", nullable: true })
  note: string | null;
}
