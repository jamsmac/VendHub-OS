import {
  Entity,
  Column,
  PrimaryColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "../../products/entities/product.entity";
import { Location } from "../../locations/entities/location.entity";

/**
 * Materialized inventory balance per (organization, location, product).
 * Rebuilt by Postgres trigger on stock_movements INSERT.
 * Composite primary key — no surrogate id.
 */
@Entity("inventory_balances")
@Index(["organizationId", "locationId"])
@Index(["organizationId", "productId"])
export class InventoryBalance {
  @PrimaryColumn({ type: "uuid" })
  organizationId: string;

  @PrimaryColumn({ type: "uuid" })
  locationId: string;

  @PrimaryColumn({ type: "uuid" })
  productId: string;

  @ManyToOne(() => Location, { onDelete: "CASCADE" })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @ManyToOne(() => Product, { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", default: 0 })
  quantity: number;

  @Column({ type: "timestamp with time zone", default: () => "NOW()" })
  lastUpdatedAt: Date;
}
