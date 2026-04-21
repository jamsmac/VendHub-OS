/**
 * Product/Nomenclature Entities for VendHub OS
 * Complete product catalog with recipes, ingredients, and batches
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// Enums — single source of truth in @vendhub/shared
import {
  ProductCategory,
  ProductStatus,
  UnitOfMeasure,
  RecipeType,
  IngredientBatchStatus,
} from "@vendhub/shared";
export {
  ProductCategory,
  ProductStatus,
  UnitOfMeasure,
  RecipeType,
  IngredientBatchStatus,
};

// ============================================================================
// PRODUCT (NOMENCLATURE) ENTITY
// ============================================================================

@Entity("products")
@Index(["organizationId"])
@Index(["sku"], { unique: true, where: '"deleted_at" IS NULL' })
@Index(["barcode"], { where: '"barcode" IS NOT NULL AND "deleted_at" IS NULL' })
@Index(["category"])
@Index(["isIngredient"])
@Index(["isActive"])
export class Product extends BaseEntity {
  @Column()
  organizationId: string;

  // Identification
  @Column({ length: 50 })
  sku: string; // Stock Keeping Unit

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, nullable: true })
  nameUz: string; // Uzbek name

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  descriptionUz: string;

  // Classification
  @Column({
    type: "enum",
    enum: ProductCategory,
    default: ProductCategory.OTHER,
  })
  category: ProductCategory;

  @Column({ type: "enum", enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Column({ type: "enum", enum: UnitOfMeasure, default: UnitOfMeasure.PIECE })
  unitOfMeasure: UnitOfMeasure;

  // Type flags
  @Column({ default: false })
  isIngredient: boolean; // true = ingredient, false = sellable product

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  requiresTemperatureControl: boolean;

  // Barcodes
  @Column({ length: 50, nullable: true })
  barcode: string;

  @Column({ length: 100, nullable: true })
  supplierSku: string;

  // Pricing (UZS)
  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  purchasePrice: number; // Cost price

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ length: 3, default: "UZS" })
  currency: string;

  // Tax (Uzbekistan)
  @Column({ length: 20, nullable: true })
  ikpuCode: string; // Tax classification code

  @Column({ length: 20, nullable: true })
  mxikCode: string; // Goods classifier code

  @Column({ type: "decimal", precision: 5, scale: 2, default: 12 })
  vatRate: number;

  @Column({ length: 20, nullable: true })
  packageType: string;

  @Column({ default: false })
  markRequired: boolean; // Requires mandatory marking

  // Physical properties
  @Column({ type: "decimal", precision: 10, scale: 3, nullable: true })
  weight: number; // grams

  @Column({ type: "decimal", precision: 10, scale: 3, nullable: true })
  volume: number; // ml

  // Sprint G5 — forecast hints + first-class category FK
  @Column({ type: "decimal", precision: 6, scale: 2, nullable: true })
  expectedSalesPerDay: number | null;

  @Column({ type: "int", default: 8 })
  defaultSlotCapacity: number;

  @Column({ type: "uuid", nullable: true })
  categoryId: string | null;

  // Inventory levels
  @Column({ type: "decimal", precision: 10, scale: 3, default: 0 })
  minStockLevel: number;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 0 })
  maxStockLevel: number;

  @Column({ type: "int", nullable: true })
  shelfLifeDays: number;

  // Supplier
  @Column({ nullable: true })
  defaultSupplierId: string;

  // Media
  @Column({ type: "text", nullable: true })
  imageUrl: string;

  @Column({ type: "jsonb", default: [] })
  images: string[];

  // Nutrition info (for sellable products)
  @Column({ type: "jsonb", nullable: true })
  nutrition: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    sugar?: number;
    fiber?: number;
    sodium?: number;
    caffeine?: number;
  };

  // Allergens
  @Column({ type: "jsonb", default: [] })
  allergens: string[];

  // Tags for filtering
  @Column({ type: "jsonb", default: [] })
  tags: string[];

  // Compatible machine types
  @Column({ type: "jsonb", default: [] })
  compatibleMachineTypes: string[];

  // Price modifiers (size, sugar level, etc.)
  @Column({ type: "jsonb", default: [] })
  priceModifiers: {
    name: string;
    nameUz?: string;
    options: {
      label: string;
      labelUz?: string;
      priceAdjustment: number;
      isDefault?: boolean;
    }[];
  }[];

  // Metadata
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // Relations
  @OneToMany("Recipe", "product")
  recipes: Recipe[];

  @OneToMany("IngredientBatch", "product")
  batches: IngredientBatch[];

  // Auto-generate SKU if not provided
  @BeforeInsert()
  generateSku() {
    if (!this.sku) {
      const prefix = this.isIngredient ? "ING" : "PRD";
      const timestamp = Date.now().toString(36).toUpperCase();
      this.sku = `${prefix}-${timestamp}`;
    }
  }
}

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
export class Recipe extends BaseEntity {
  @Column()
  organizationId: string;

  @Column()
  productId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, nullable: true })
  nameUz: string;

  @Column({ type: "enum", enum: RecipeType, default: RecipeType.PRIMARY })
  typeCode: RecipeType;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  // Preparation parameters
  @Column({ type: "int", nullable: true })
  preparationTimeSeconds: number;

  @Column({ type: "int", nullable: true })
  temperatureCelsius: number;

  @Column({ type: "int", default: 1 })
  servingSizeMl: number;

  // Cost calculation (cached)
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalCost: number;

  // Machine settings for preparation
  @Column({ type: "jsonb", default: {} })
  settings: {
    pressure?: number;
    grindSize?: string;
    waterTemperature?: number;
    brewTime?: number;
    milkFoamLevel?: string;
    strength?: string;
  };

  // Version for tracking changes
  @Column({ type: "int", default: 1 })
  version: number;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // Relations
  @ManyToOne("Product", "recipes", { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @OneToMany("RecipeIngredient", "recipe", { cascade: true })
  ingredients: RecipeIngredient[];

  @OneToMany("RecipeSnapshot", "recipe")
  snapshots: RecipeSnapshot[];
}

// ============================================================================
// RECIPE INGREDIENT ENTITY (Join table)
// ============================================================================

@Entity("recipe_ingredients")
@Index(["recipeId"])
@Index(["ingredientId"])
export class RecipeIngredient extends BaseEntity {
  @Column()
  recipeId: string;

  @Column()
  ingredientId: string;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: "enum", enum: UnitOfMeasure, default: UnitOfMeasure.GRAM })
  unitOfMeasure: UnitOfMeasure;

  @Column({ type: "int", default: 1 })
  sortOrder: number;

  @Column({ default: false })
  isOptional: boolean;

  // For substitutions
  @Column({ nullable: true })
  substituteIngredientId: string;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne("Recipe", "ingredients", { onDelete: "CASCADE" })
  @JoinColumn({ name: "recipe_id" })
  recipe: Recipe;

  @ManyToOne("Product", { onDelete: "RESTRICT" })
  @JoinColumn({ name: "ingredient_id" })
  ingredient: Product;

  @ManyToOne("Product", { onDelete: "SET NULL" })
  @JoinColumn({ name: "substitute_ingredient_id" })
  substituteIngredient: Product;
}

// ============================================================================
// RECIPE SNAPSHOT ENTITY (Historical versions)
// ============================================================================

@Entity("recipe_snapshots")
@Index(["recipeId"])
@Index(["recipeId", "version"], { unique: true })
@Index(["validFrom"])
@Index(["validTo"])
export class RecipeSnapshot extends BaseEntity {
  @Column()
  recipeId: string;

  @Column({ type: "int" })
  version: number;

  // Complete snapshot of recipe at this version
  @Column({ type: "jsonb" })
  snapshot: {
    name: string;
    description?: string;
    typeCode: RecipeType;
    totalCost: number;
    preparationTimeSeconds?: number;
    temperatureCelsius?: number;
    servingSizeMl: number;
    settings: Record<string, string | number | boolean>;
    ingredients: {
      ingredientId: string;
      ingredientName: string;
      ingredientSku: string;
      quantity: number;
      unitOfMeasure: UnitOfMeasure;
      unitCost: number;
    }[];
  };

  // Validity period
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  validFrom: Date;

  @Column({ type: "timestamp", nullable: true })
  validTo: Date;

  @Column({ type: "text", nullable: true })
  changeReason: string;

  @Column({ length: 64, nullable: true })
  checksum: string; // For integrity verification

  @ManyToOne("Recipe", "snapshots", { onDelete: "CASCADE" })
  @JoinColumn({ name: "recipe_id" })
  recipe: Recipe;

  // Computed
  get isCurrent(): boolean {
    return this.validTo === null;
  }
}

// ============================================================================
// INGREDIENT BATCH ENTITY (FIFO inventory tracking)
// ============================================================================

@Entity("ingredient_batches")
@Index(["organizationId"])
@Index(["productId"])
@Index(["supplierId"])
@Index(["status"])
@Index(["expiryDate"])
@Index(["receivedDate"])
@Index(["productId", "batchNumber"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class IngredientBatch extends BaseEntity {
  @Column()
  organizationId: string;

  @Column()
  productId: string; // References Product (ingredient)

  @Column({ length: 100 })
  batchNumber: string;

  // Quantities
  @Column({ type: "decimal", precision: 12, scale: 3 })
  quantity: number; // Original quantity

  @Column({ type: "decimal", precision: 12, scale: 3 })
  remainingQuantity: number; // After consumption

  @Column({ type: "decimal", precision: 12, scale: 3, default: 0 })
  reservedQuantity: number; // Reserved for tasks

  @Column({ type: "enum", enum: UnitOfMeasure, default: UnitOfMeasure.GRAM })
  unitOfMeasure: UnitOfMeasure;

  // Pricing
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  purchasePrice: number; // Per unit

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  totalCost: number; // Total batch cost

  @Column({ length: 3, default: "UZS" })
  currency: string;

  // Supplier
  @Column({ nullable: true })
  supplierId: string;

  @Column({ length: 100, nullable: true })
  supplierBatchNumber: string;

  @Column({ length: 100, nullable: true })
  invoiceNumber: string;

  // Dates
  @Column({ type: "date", nullable: true })
  manufactureDate: Date;

  @Column({ type: "date", nullable: true })
  expiryDate: Date;

  @Column({ type: "date", default: () => "CURRENT_DATE" })
  receivedDate: Date;

  // Status
  @Column({
    type: "enum",
    enum: IngredientBatchStatus,
    default: IngredientBatchStatus.IN_STOCK,
  })
  status: IngredientBatchStatus;

  // Location tracking
  @Column({ nullable: true })
  warehouseLocationId: string;

  @Column({ length: 50, nullable: true })
  storageLocation: string; // Shelf/bin location

  // Quality control
  @Column({ default: false })
  isQualityChecked: boolean;

  @Column({ nullable: true })
  qualityCheckedByUserId: string;

  @Column({ type: "timestamp", nullable: true })
  qualityCheckedAt: Date;

  @Column({ type: "text", nullable: true })
  qualityNotes: string;

  // Notes
  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne("Product", "batches", { onDelete: "RESTRICT" })
  @JoinColumn({ name: "product_id" })
  product: Product;

  // Computed
  get availableQuantity(): number {
    return Math.max(0, this.remainingQuantity - this.reservedQuantity);
  }

  get isExpired(): boolean {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
  }

  get isDepleted(): boolean {
    return this.remainingQuantity <= 0;
  }

  get usagePercentage(): number {
    if (this.quantity <= 0) return 0;
    return Math.round(
      ((this.quantity - this.remainingQuantity) / this.quantity) * 100,
    );
  }
}

// ============================================================================
// PRODUCT PRICE HISTORY ENTITY
// ============================================================================

export enum PriceType {
  COST = "cost",
  SELLING = "selling",
}

@Entity("product_price_history")
@Index(["productId"])
@Index(["effectiveFrom"])
export class ProductPriceHistory extends BaseEntity {
  @Column()
  productId: string;

  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  purchasePrice: number;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  sellingPrice: number;

  // Old/new price convenience fields for explicit price-change records
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  oldPrice: number | null;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  newPrice: number | null;

  @Column({ type: "enum", enum: PriceType, default: PriceType.COST })
  priceType: PriceType;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  effectiveFrom: Date;

  @Column({ type: "timestamp", nullable: true })
  effectiveTo: Date;

  @Column({ type: "text", nullable: true })
  changeReason: string;

  @Column({ type: "text", nullable: true })
  reason: string | null;

  @Column({ nullable: true })
  changedByUserId: string;

  @Column({ type: "uuid", nullable: true })
  supplierId: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  supplierNameSnapshot: string | null;

  @Column({ type: "uuid", nullable: true })
  purchaseId: string | null;

  @ManyToOne("Product", { onDelete: "CASCADE" })
  @JoinColumn({ name: "product_id" })
  product: Product;
}

// ============================================================================
// SUPPLIER
// ============================================================================

/**
 * Supplier default payment method (Sprint G5).
 * Separate enum from purchases' PaymentMethod so suppliers can evolve independently.
 */
export enum SupplierPaymentMethod {
  CASH = "cash",
  CARD_HUMO = "card_humo",
  CARD_UZCARD = "card_uzcard",
  CARD_VISA = "card_visa",
  TRANSFER = "transfer",
  PAYME = "payme",
  CLICK = "click",
  OTHER = "other",
}

@Entity("suppliers")
@Index(["organizationId"])
@Index(["code"], { unique: true, where: '"deleted_at" IS NULL' })
@Index(["telegramId"])
export class Supplier extends BaseEntity {
  @Column()
  organizationId: string;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 200 })
  name: string;

  // Sprint G5 — legal name (for contracts) + default payment method
  @Column({ type: "varchar", length: 255, nullable: true })
  legalName: string | null;

  @Column({
    type: "enum",
    enum: SupplierPaymentMethod,
    enumName: "supplier_payment_method_enum",
    nullable: true,
  })
  defaultPayment: SupplierPaymentMethod | null;

  @Column({ length: 200, nullable: true })
  contactPerson: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ type: "text", nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  taxId: string; // INN

  @Column({ length: 50, nullable: true })
  bankAccount: string;

  // Telegram integration (for auto-forwarding orders)
  @Column({ type: "varchar", length: 64, nullable: true })
  telegramId: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  telegramUsername: string | null;

  // Categories of materials this supplier provides
  @Column({ type: "jsonb", nullable: true })
  categories: string[] | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "int", default: 0 })
  priority: number;

  @Column({ type: "int", default: 0 })
  paymentTermDays: number;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  @OneToMany("IngredientBatch", "supplier")
  batches: IngredientBatch[];
}
