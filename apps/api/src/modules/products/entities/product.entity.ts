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
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum ProductCategory {
  // Coffee & Tea
  COFFEE_BEANS = 'coffee_beans',
  COFFEE_INSTANT = 'coffee_instant',
  TEA = 'tea',
  CHOCOLATE = 'chocolate',

  // Ingredients
  MILK = 'milk',
  SUGAR = 'sugar',
  CREAM = 'cream',
  SYRUP = 'syrup',
  WATER = 'water',

  // Ready products
  HOT_DRINKS = 'hot_drinks',
  COLD_DRINKS = 'cold_drinks',
  SNACKS = 'snacks',
  SANDWICHES = 'sandwiches',
  SALADS = 'salads',
  ICE_CREAM = 'ice_cream',

  // Consumables
  CUPS = 'cups',
  LIDS = 'lids',
  STIRRERS = 'stirrers',
  NAPKINS = 'napkins',

  // Other
  OTHER = 'other',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum UnitOfMeasure {
  // Weight
  GRAM = 'g',
  KILOGRAM = 'kg',

  // Volume
  MILLILITER = 'ml',
  LITER = 'l',

  // Count
  PIECE = 'pcs',
  PACK = 'pack',
  BOX = 'box',

  // Servings
  PORTION = 'portion',
  CUP = 'cup',
}

export enum RecipeType {
  PRIMARY = 'primary',
  ALTERNATIVE = 'alternative',
  PROMOTIONAL = 'promotional',
  TEST = 'test',
}

export enum IngredientBatchStatus {
  IN_STOCK = 'in_stock',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
  RETURNED = 'returned',
  RESERVED = 'reserved',
}

// ============================================================================
// PRODUCT (NOMENCLATURE) ENTITY
// ============================================================================

@Entity('products')
@Index(['organizationId'])
@Index(['sku'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['barcode'], { where: '"barcode" IS NOT NULL AND "deleted_at" IS NULL' })
@Index(['category'])
@Index(['isIngredient'])
@Index(['isActive'])
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

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  descriptionUz: string;

  // Classification
  @Column({ type: 'enum', enum: ProductCategory, default: ProductCategory.OTHER })
  category: ProductCategory;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  @Column({ type: 'enum', enum: UnitOfMeasure, default: UnitOfMeasure.PIECE })
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
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  purchasePrice: number; // Cost price

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  sellingPrice: number;

  @Column({ length: 3, default: 'UZS' })
  currency: string;

  // Tax (Uzbekistan)
  @Column({ length: 20, nullable: true })
  ikpuCode: string; // Tax classification code

  @Column({ length: 20, nullable: true })
  mxikCode: string; // Goods classifier code

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 12 })
  vatRate: number;

  @Column({ length: 20, nullable: true })
  packageType: string;

  @Column({ default: false })
  markRequired: boolean; // Requires mandatory marking

  // Physical properties
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weight: number; // grams

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  volume: number; // ml

  // Inventory levels
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  minStockLevel: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  maxStockLevel: number;

  @Column({ type: 'int', nullable: true })
  shelfLifeDays: number;

  // Supplier
  @Column({ nullable: true })
  defaultSupplierId: string;

  // Media
  @Column({ type: 'text', nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', default: [] })
  images: string[];

  // Nutrition info (for sellable products)
  @Column({ type: 'jsonb', nullable: true })
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
  @Column({ type: 'jsonb', default: [] })
  allergens: string[];

  // Tags for filtering
  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  // Compatible machine types
  @Column({ type: 'jsonb', default: [] })
  compatibleMachineTypes: string[];

  // Price modifiers (size, sugar level, etc.)
  @Column({ type: 'jsonb', default: [] })
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
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  // Relations
  @OneToMany('Recipe', 'product')
  recipes: Recipe[];

  @OneToMany('IngredientBatch', 'product')
  batches: IngredientBatch[];

  // Auto-generate SKU if not provided
  @BeforeInsert()
  generateSku() {
    if (!this.sku) {
      const prefix = this.isIngredient ? 'ING' : 'PRD';
      const timestamp = Date.now().toString(36).toUpperCase();
      this.sku = `${prefix}-${timestamp}`;
    }
  }
}

// ============================================================================
// RECIPE ENTITY
// ============================================================================

@Entity('recipes')
@Index(['organizationId'])
@Index(['productId'])
@Index(['productId', 'typeCode'], { unique: true, where: '"deleted_at" IS NULL' })
export class Recipe extends BaseEntity {
  @Column()
  organizationId: string;

  @Column()
  productId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, nullable: true })
  nameUz: string;

  @Column({ type: 'enum', enum: RecipeType, default: RecipeType.PRIMARY })
  typeCode: RecipeType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  // Preparation parameters
  @Column({ type: 'int', nullable: true })
  preparationTimeSeconds: number;

  @Column({ type: 'int', nullable: true })
  temperatureCelsius: number;

  @Column({ type: 'int', default: 1 })
  servingSizeMl: number;

  // Cost calculation (cached)
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCost: number;

  // Machine settings for preparation
  @Column({ type: 'jsonb', default: {} })
  settings: {
    pressure?: number;
    grindSize?: string;
    waterTemperature?: number;
    brewTime?: number;
    milkFoamLevel?: string;
    strength?: string;
  };

  // Version for tracking changes
  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  // Relations
  @ManyToOne('Product', 'recipes', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany('RecipeIngredient', 'recipe', { cascade: true })
  ingredients: RecipeIngredient[];

  @OneToMany('RecipeSnapshot', 'recipe')
  snapshots: RecipeSnapshot[];
}

// ============================================================================
// RECIPE INGREDIENT ENTITY (Join table)
// ============================================================================

@Entity('recipe_ingredients')
@Index(['recipeId'])
@Index(['ingredientId'])
export class RecipeIngredient extends BaseEntity {
  @Column()
  recipeId: string;

  @Column()
  ingredientId: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'enum', enum: UnitOfMeasure, default: UnitOfMeasure.GRAM })
  unitOfMeasure: UnitOfMeasure;

  @Column({ type: 'int', default: 1 })
  sortOrder: number;

  @Column({ default: false })
  isOptional: boolean;

  // For substitutions
  @Column({ nullable: true })
  substituteIngredientId: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne('Recipe', 'ingredients', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @ManyToOne('Product', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient: Product;

  @ManyToOne('Product', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'substitute_ingredient_id' })
  substituteIngredient: Product;
}

// ============================================================================
// RECIPE SNAPSHOT ENTITY (Historical versions)
// ============================================================================

@Entity('recipe_snapshots')
@Index(['recipeId'])
@Index(['recipeId', 'version'], { unique: true })
@Index(['validFrom'])
@Index(['validTo'])
export class RecipeSnapshot extends BaseEntity {
  @Column()
  recipeId: string;

  @Column({ type: 'int' })
  version: number;

  // Complete snapshot of recipe at this version
  @Column({ type: 'jsonb' })
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
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  validFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  validTo: Date;

  @Column({ type: 'text', nullable: true })
  changeReason: string;

  @Column({ length: 64, nullable: true })
  checksum: string; // For integrity verification

  @ManyToOne('Recipe', 'snapshots', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  // Computed
  get isCurrent(): boolean {
    return this.validTo === null;
  }
}

// ============================================================================
// INGREDIENT BATCH ENTITY (FIFO inventory tracking)
// ============================================================================

@Entity('ingredient_batches')
@Index(['organizationId'])
@Index(['productId'])
@Index(['supplierId'])
@Index(['status'])
@Index(['expiryDate'])
@Index(['receivedDate'])
@Index(['productId', 'batchNumber'], { unique: true, where: '"deleted_at" IS NULL' })
export class IngredientBatch extends BaseEntity {
  @Column()
  organizationId: string;

  @Column()
  productId: string; // References Product (ingredient)

  @Column({ length: 100 })
  batchNumber: string;

  // Quantities
  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity: number; // Original quantity

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  remainingQuantity: number; // After consumption

  @Column({ type: 'decimal', precision: 12, scale: 3, default: 0 })
  reservedQuantity: number; // Reserved for tasks

  @Column({ type: 'enum', enum: UnitOfMeasure, default: UnitOfMeasure.GRAM })
  unitOfMeasure: UnitOfMeasure;

  // Pricing
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchasePrice: number; // Per unit

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalCost: number; // Total batch cost

  @Column({ length: 3, default: 'UZS' })
  currency: string;

  // Supplier
  @Column({ nullable: true })
  supplierId: string;

  @Column({ length: 100, nullable: true })
  supplierBatchNumber: string;

  @Column({ length: 100, nullable: true })
  invoiceNumber: string;

  // Dates
  @Column({ type: 'date', nullable: true })
  manufactureDate: Date;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  receivedDate: Date;

  // Status
  @Column({ type: 'enum', enum: IngredientBatchStatus, default: IngredientBatchStatus.IN_STOCK })
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

  @Column({ type: 'timestamp', nullable: true })
  qualityCheckedAt: Date;

  @Column({ type: 'text', nullable: true })
  qualityNotes: string;

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne('Product', 'batches', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
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
    return Math.round(((this.quantity - this.remainingQuantity) / this.quantity) * 100);
  }
}

// ============================================================================
// PRODUCT PRICE HISTORY ENTITY
// ============================================================================

@Entity('product_price_history')
@Index(['productId'])
@Index(['effectiveFrom'])
export class ProductPriceHistory extends BaseEntity {
  @Column()
  productId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  purchasePrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  sellingPrice: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  effectiveFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo: Date;

  @Column({ type: 'text', nullable: true })
  changeReason: string;

  @Column({ nullable: true })
  changedByUserId: string;

  @ManyToOne('Product', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}

// ============================================================================
// SUPPLIER (simplified, can be expanded)
// ============================================================================

@Entity('suppliers')
@Index(['organizationId'])
@Index(['code'], { unique: true, where: '"deleted_at" IS NULL' })
export class Supplier extends BaseEntity {
  @Column()
  organizationId: string;

  @Column({ length: 50 })
  code: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, nullable: true })
  contactPerson: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 255, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  taxId: string; // INN

  @Column({ length: 50, nullable: true })
  bankAccount: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  paymentTermDays: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany('IngredientBatch', 'supplier')
  batches: IngredientBatch[];
}
