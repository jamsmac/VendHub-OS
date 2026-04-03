import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * Generic JSONB document store for site CMS data.
 *
 * Each row belongs to a `collection` (e.g. "products", "machines", "partners")
 * and stores its full payload in the `data` JSONB column.
 * `sortOrder` and `isActive` are duplicated as columns for efficient filtering/ordering.
 */
@Entity("site_cms_items")
@Index(["organizationId", "collection"])
@Index(["organizationId", "collection", "isActive", "sortOrder"])
export class SiteCmsItem extends BaseEntity {
  @Column({ type: "varchar", length: 50 })
  collection: string;

  @Column({ type: "jsonb", default: {} })
  data: Record<string, unknown>;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "uuid" })
  organizationId: string;
}
