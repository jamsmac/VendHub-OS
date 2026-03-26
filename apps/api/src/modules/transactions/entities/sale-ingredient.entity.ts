/* eslint-disable @typescript-eslint/no-explicit-any */
import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * SaleIngredient — links each sale to the specific batches consumed.
 * Enables real cost-of-goods-sold calculation per cup/portion.
 *
 * Example: Americano sale → 28g coffee (LOT-2026-0042 @ 85 UZS/g) + 1 cup (LOT-2026-0060 @ 120 UZS/pc)
 */
@Entity("sale_ingredients")
@Index(["organizationId"])
@Index(["transactionId"])
@Index(["batchId"])
@Index(["ingredientId"])
@Index(["containerId"])
@Index(["organizationId", "transactionId"])
export class SaleIngredient extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  transactionId: string; // FK → transactions

  @Column({ type: "uuid" })
  ingredientId: string; // FK → products (where isIngredient=true)

  @Column({ type: "uuid" })
  batchId: string; // FK → ingredient_batches

  @Column({ type: "uuid", nullable: true })
  containerId: string | null; // FK → containers (which bunker)

  @Column({ type: "decimal", precision: 12, scale: 3 })
  quantityUsed: number; // grams, ml, pieces

  @Column({ type: "decimal", precision: 15, scale: 2 })
  unitCostAtTime: number; // Cost per unit at the time of sale (UZS)

  @Column({ type: "decimal", precision: 15, scale: 2 })
  costTotal: number; // quantityUsed * unitCostAtTime

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // Relations
  @ManyToOne("Transaction", { onDelete: "CASCADE" })
  @JoinColumn({ name: "transaction_id" })
  transaction: unknown;

  @ManyToOne("Product", { onDelete: "RESTRICT" })
  @JoinColumn({ name: "ingredient_id" })
  ingredient: unknown;

  @ManyToOne("IngredientBatch", { onDelete: "RESTRICT" })
  @JoinColumn({ name: "batch_id" })
  batch: unknown;

  @ManyToOne("Container", { onDelete: "SET NULL" })
  @JoinColumn({ name: "container_id" })
  container: unknown;
}
