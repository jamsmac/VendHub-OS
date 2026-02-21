/**
 * Recipe Entities
 * Рецепты напитков/блюд с ингредиентами и версионированием
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// RECIPE ENTITY
// ============================================================================

@Entity("recipes")
@Index(["organizationId"])
@Index(["productId"])
@Index(["productId", "typeCode"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index(["isActive"])
export class Recipe extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  productId: string; // Reference to Product/Nomenclature

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "varchar", length: 50 })
  typeCode: string; // primary, alternative, test (from dictionaries)

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  // Settings
  @Column({ type: "int", nullable: true })
  preparationTimeSeconds: number | null;

  @Column({ type: "int", nullable: true })
  temperatureCelsius: number | null;

  @Column({ type: "int", default: 1 })
  servingSizeMl: number;

  // Cost (cached, updated when ingredients change)
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @Column({ type: "jsonb", nullable: true })
  settings: Record<string, unknown> | null;

  @OneToMany(() => RecipeIngredient, (ingredient) => ingredient.recipe, {
    cascade: true,
  })
  ingredients: RecipeIngredient[];

  @OneToMany(() => RecipeSnapshot, (snapshot) => snapshot.recipe)
  snapshots: RecipeSnapshot[];
}

// ============================================================================
// RECIPE INGREDIENT ENTITY
// ============================================================================

@Entity("recipe_ingredients")
@Index(["recipeId"])
@Index(["ingredientId"])
export class RecipeIngredient extends BaseEntity {
  @Column({ type: "uuid" })
  recipeId: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recipe_id" })
  recipe: Recipe;

  @Column({ type: "uuid" })
  ingredientId: string; // Reference to Product/Nomenclature

  @Column({ type: "decimal", precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: "varchar", length: 50 })
  unitOfMeasureCode: string; // from dictionaries: units_of_measure

  @Column({ type: "int", default: 1 })
  sortOrder: number;
}

// ============================================================================
// RECIPE SNAPSHOT ENTITY (immutable version history)
// ============================================================================

@Entity("recipe_snapshots")
@Index(["recipeId", "version"])
@Index(["validFrom"])
@Index(["validTo"])
export class RecipeSnapshot extends BaseEntity {
  @Column({ type: "uuid" })
  recipeId: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.snapshots, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recipe_id" })
  recipe: Recipe;

  @Column({ type: "int" })
  version: number;

  @Column({ type: "jsonb" })
  snapshot: {
    name: string;
    description: string | null;
    categoryCode: string;
    baseCost: number;
    basePrice: number;
    items: Array<{
      nomenclatureId: string;
      nomenclatureName: string;
      quantity: number;
      unitOfMeasureCode: string;
    }>;
    metadata: Record<string, unknown> | null;
  };

  @Column({ type: "timestamp with time zone" })
  validFrom: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  validTo: Date | null;

  @Column({ type: "uuid", nullable: true })
  createdByUserId: string | null;

  @Column({ type: "text", nullable: true })
  changeReason: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  checksum: string | null;
}
