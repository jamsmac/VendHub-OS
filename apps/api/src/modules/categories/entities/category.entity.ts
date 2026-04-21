import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * Product Category — first-class entity (Sprint G5).
 *
 * Complements the legacy `products.category` enum column (kept for backward
 * compatibility). Products can reference this table via `products.category_id`.
 * Unique per (organizationId, code) with soft-delete aware index.
 */
@Entity("categories")
@Index("idx_categories_org_code", ["organizationId", "code"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index("idx_categories_org", ["organizationId"])
export class Category extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 50 })
  code: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  icon: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  color: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  /**
   * Default markup percent applied to products in this category when pricing
   * is calculated from purchase price. Stored as DECIMAL(5,2) — e.g. 30.00 = 30%.
   */
  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: number | null | undefined) => v ?? null,
      from: (v: string | null) => (v === null ? null : Number(v)),
    },
  })
  defaultMarkup: number | null;
}
