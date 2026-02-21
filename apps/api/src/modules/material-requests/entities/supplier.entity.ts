/**
 * Material Entity
 * Procurement catalog for material requests workflow.
 * Used in Telegram bot for catalog browsing and cart.
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Supplier } from "../../products/entities/product.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum MaterialCategory {
  INGREDIENTS = "ingredients",
  CONSUMABLES = "consumables",
  CLEANING = "cleaning",
  SPARE_PARTS = "spare_parts",
  PACKAGING = "packaging",
  OTHER = "other",
}

// ============================================================================
// MATERIAL ENTITY
// ============================================================================

@Entity("materials")
@Index(["organizationId"])
@Index(["category"])
@Index(["supplierId"])
@Index(["isActive"])
export class Material extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({
    type: "enum",
    enum: MaterialCategory,
    default: MaterialCategory.OTHER,
  })
  category: MaterialCategory;

  @Column({ type: "varchar", length: 50, default: "шт" })
  unit: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  sku: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  unitPrice: number | null;

  @Column({ type: "int", default: 1 })
  minOrderQuantity: number;

  @Column({ type: "uuid", nullable: true })
  supplierId: string | null;

  @ManyToOne(() => Supplier, { onDelete: "SET NULL" })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "varchar", length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
