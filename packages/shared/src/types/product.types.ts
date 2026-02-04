/**
 * Product Types for VendHub OS
 * Complete product catalog with recipes, ingredients, and batches
 */

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
// INTERFACES
// ============================================================================

export interface IProductNutrition {
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  sugar?: number;
  fiber?: number;
  sodium?: number;
  caffeine?: number;
}

export interface IPriceModifier {
  name: string;
  nameUz?: string;
  options: {
    label: string;
    labelUz?: string;
    priceAdjustment: number;
    isDefault?: boolean;
  }[];
}

export interface IProduct {
  id: string;
  organizationId: string;
  sku: string;
  name: string;
  nameUz?: string;
  description?: string;
  descriptionUz?: string;
  category: ProductCategory;
  status: ProductStatus;
  unitOfMeasure: UnitOfMeasure;

  // Flags
  isIngredient: boolean;
  isActive: boolean;
  requiresTemperatureControl: boolean;

  // Codes
  barcode?: string;
  supplierSku?: string;

  // Pricing
  purchasePrice: number;
  sellingPrice: number;
  currency: string;

  // Tax (Uzbekistan)
  ikpuCode?: string;
  mxikCode?: string;
  vatRate: number;
  packageType?: string;
  markRequired: boolean;

  // Physical
  weight?: number;
  volume?: number;

  // Inventory
  minStockLevel: number;
  maxStockLevel: number;
  shelfLifeDays?: number;

  // Supplier
  defaultSupplierId?: string;

  // Media
  imageUrl?: string;
  images: string[];

  // Details
  nutrition?: IProductNutrition;
  allergens: string[];
  tags: string[];
  compatibleMachineTypes: string[];
  priceModifiers: IPriceModifier[];
  metadata?: Record<string, any>;

  // Audit
  createdByUserId?: string;
  updatedByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Relations
  recipes?: IRecipe[];
}

export interface IRecipe {
  id: string;
  organizationId: string;
  productId: string;
  name: string;
  nameUz?: string;
  typeCode: RecipeType;
  description?: string;
  isActive: boolean;

  // Preparation
  preparationTimeSeconds?: number;
  temperatureCelsius?: number;
  servingSizeMl: number;
  totalCost: number;

  // Settings
  settings: IRecipeSettings;
  version: number;
  metadata?: Record<string, any>;

  createdByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Relations
  ingredients?: IRecipeIngredient[];
  product?: IProduct;
}

export interface IRecipeSettings {
  pressure?: number;
  grindSize?: string;
  waterTemperature?: number;
  brewTime?: number;
  milkFoamLevel?: string;
  strength?: string;
}

export interface IRecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: number;
  unitOfMeasure: UnitOfMeasure;
  sortOrder: number;
  isOptional: boolean;
  substituteIngredientId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  ingredient?: IProduct;
  substituteIngredient?: IProduct;
}

export interface IRecipeSnapshot {
  id: string;
  recipeId: string;
  version: number;
  snapshot: {
    name: string;
    description?: string;
    typeCode: RecipeType;
    totalCost: number;
    preparationTimeSeconds?: number;
    temperatureCelsius?: number;
    servingSizeMl: number;
    settings: IRecipeSettings;
    ingredients: {
      ingredientId: string;
      ingredientName: string;
      ingredientSku: string;
      quantity: number;
      unitOfMeasure: UnitOfMeasure;
      unitCost: number;
    }[];
  };
  validFrom: Date;
  validTo?: Date;
  createdByUserId?: string;
  changeReason?: string;
  checksum?: string;
  createdAt: Date;

  // Computed
  isCurrent?: boolean;
}

export interface IIngredientBatch {
  id: string;
  organizationId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  remainingQuantity: number;
  reservedQuantity: number;
  unitOfMeasure: UnitOfMeasure;

  // Pricing
  purchasePrice?: number;
  totalCost?: number;
  currency: string;

  // Supplier
  supplierId?: string;
  supplierBatchNumber?: string;
  invoiceNumber?: string;

  // Dates
  manufactureDate?: Date;
  expiryDate?: Date;
  receivedDate: Date;

  // Status
  status: IngredientBatchStatus;

  // Location
  warehouseLocationId?: string;
  storageLocation?: string;

  // Quality
  isQualityChecked: boolean;
  qualityCheckedByUserId?: string;
  qualityCheckedAt?: Date;
  qualityNotes?: string;

  notes?: string;
  metadata?: Record<string, any>;

  createdByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Computed
  availableQuantity?: number;
  isExpired?: boolean;
  isDepleted?: boolean;
  usagePercentage?: number;

  // Relations
  product?: IProduct;
}

export interface ISupplier {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  bankAccount?: string;
  isActive: boolean;
  paymentTermDays: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// CREATE/UPDATE DTOs
// ============================================================================

export interface IProductCreate {
  organizationId: string;
  name: string;
  nameUz?: string;
  description?: string;
  descriptionUz?: string;
  sku?: string; // Auto-generated if not provided
  category: ProductCategory;
  unitOfMeasure?: UnitOfMeasure;
  isIngredient?: boolean;
  barcode?: string;
  supplierSku?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  currency?: string;
  ikpuCode?: string;
  mxikCode?: string;
  vatRate?: number;
  packageType?: string;
  markRequired?: boolean;
  weight?: number;
  volume?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  shelfLifeDays?: number;
  defaultSupplierId?: string;
  imageUrl?: string;
  images?: string[];
  nutrition?: IProductNutrition;
  allergens?: string[];
  tags?: string[];
  compatibleMachineTypes?: string[];
  priceModifiers?: IPriceModifier[];
  metadata?: Record<string, any>;
}

export interface IProductUpdate {
  name?: string;
  nameUz?: string;
  description?: string;
  descriptionUz?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  unitOfMeasure?: UnitOfMeasure;
  isActive?: boolean;
  requiresTemperatureControl?: boolean;
  barcode?: string;
  supplierSku?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  currency?: string;
  ikpuCode?: string;
  mxikCode?: string;
  vatRate?: number;
  packageType?: string;
  markRequired?: boolean;
  weight?: number;
  volume?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  shelfLifeDays?: number;
  defaultSupplierId?: string;
  imageUrl?: string;
  images?: string[];
  nutrition?: IProductNutrition;
  allergens?: string[];
  tags?: string[];
  compatibleMachineTypes?: string[];
  priceModifiers?: IPriceModifier[];
  metadata?: Record<string, any>;
}

export interface IRecipeCreate {
  organizationId: string;
  productId: string;
  name: string;
  nameUz?: string;
  typeCode?: RecipeType;
  description?: string;
  preparationTimeSeconds?: number;
  temperatureCelsius?: number;
  servingSizeMl?: number;
  settings?: IRecipeSettings;
  ingredients: IRecipeIngredientCreate[];
  metadata?: Record<string, any>;
}

export interface IRecipeIngredientCreate {
  ingredientId: string;
  quantity: number;
  unitOfMeasure?: UnitOfMeasure;
  sortOrder?: number;
  isOptional?: boolean;
  substituteIngredientId?: string;
}

export interface IRecipeUpdate {
  name?: string;
  nameUz?: string;
  typeCode?: RecipeType;
  description?: string;
  isActive?: boolean;
  preparationTimeSeconds?: number;
  temperatureCelsius?: number;
  servingSizeMl?: number;
  settings?: IRecipeSettings;
  ingredients?: IRecipeIngredientCreate[];
  metadata?: Record<string, any>;
}

export interface IIngredientBatchCreate {
  organizationId: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  unitOfMeasure?: UnitOfMeasure;
  purchasePrice?: number;
  supplierId?: string;
  supplierBatchNumber?: string;
  invoiceNumber?: string;
  manufactureDate?: Date;
  expiryDate?: Date;
  receivedDate?: Date;
  warehouseLocationId?: string;
  storageLocation?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface ISupplierCreate {
  organizationId: string;
  code: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  bankAccount?: string;
  paymentTermDays?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// FILTER & STATS
// ============================================================================

export interface IProductFilter {
  organizationId: string;
  category?: ProductCategory | ProductCategory[];
  status?: ProductStatus | ProductStatus[];
  isIngredient?: boolean;
  isActive?: boolean;
  search?: string;
  barcode?: string;
  supplierId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'sku' | 'category' | 'sellingPrice' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface IProductStats {
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<ProductCategory, number>;
  ingredients: number;
  products: number;
  lowStock: number;
}

export interface IRecipeFilter {
  organizationId: string;
  productId?: string;
  typeCode?: RecipeType;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface IBatchFilter {
  organizationId: string;
  productId?: string;
  supplierId?: string;
  status?: IngredientBatchStatus | IngredientBatchStatus[];
  expiringBefore?: Date;
  receivedAfter?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// LABELS (Russian)
// ============================================================================

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.COFFEE_BEANS]: 'Кофе в зернах',
  [ProductCategory.COFFEE_INSTANT]: 'Растворимый кофе',
  [ProductCategory.TEA]: 'Чай',
  [ProductCategory.CHOCOLATE]: 'Шоколад',
  [ProductCategory.MILK]: 'Молоко',
  [ProductCategory.SUGAR]: 'Сахар',
  [ProductCategory.CREAM]: 'Сливки',
  [ProductCategory.SYRUP]: 'Сироп',
  [ProductCategory.WATER]: 'Вода',
  [ProductCategory.HOT_DRINKS]: 'Горячие напитки',
  [ProductCategory.COLD_DRINKS]: 'Холодные напитки',
  [ProductCategory.SNACKS]: 'Снеки',
  [ProductCategory.SANDWICHES]: 'Сэндвичи',
  [ProductCategory.SALADS]: 'Салаты',
  [ProductCategory.ICE_CREAM]: 'Мороженое',
  [ProductCategory.CUPS]: 'Стаканы',
  [ProductCategory.LIDS]: 'Крышки',
  [ProductCategory.STIRRERS]: 'Размешиватели',
  [ProductCategory.NAPKINS]: 'Салфетки',
  [ProductCategory.OTHER]: 'Прочее',
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  [ProductStatus.ACTIVE]: 'Активен',
  [ProductStatus.INACTIVE]: 'Неактивен',
  [ProductStatus.DISCONTINUED]: 'Снят с производства',
  [ProductStatus.OUT_OF_STOCK]: 'Нет в наличии',
};

export const UNIT_OF_MEASURE_LABELS: Record<UnitOfMeasure, string> = {
  [UnitOfMeasure.GRAM]: 'грамм',
  [UnitOfMeasure.KILOGRAM]: 'кг',
  [UnitOfMeasure.MILLILITER]: 'мл',
  [UnitOfMeasure.LITER]: 'литр',
  [UnitOfMeasure.PIECE]: 'шт',
  [UnitOfMeasure.PACK]: 'уп',
  [UnitOfMeasure.BOX]: 'кор',
  [UnitOfMeasure.PORTION]: 'порция',
  [UnitOfMeasure.CUP]: 'стакан',
};

export const RECIPE_TYPE_LABELS: Record<RecipeType, string> = {
  [RecipeType.PRIMARY]: 'Основной',
  [RecipeType.ALTERNATIVE]: 'Альтернативный',
  [RecipeType.PROMOTIONAL]: 'Акционный',
  [RecipeType.TEST]: 'Тестовый',
};

export const BATCH_STATUS_LABELS: Record<IngredientBatchStatus, string> = {
  [IngredientBatchStatus.IN_STOCK]: 'В наличии',
  [IngredientBatchStatus.DEPLETED]: 'Израсходована',
  [IngredientBatchStatus.EXPIRED]: 'Просрочена',
  [IngredientBatchStatus.RETURNED]: 'Возвращена',
  [IngredientBatchStatus.RESERVED]: 'Зарезервирована',
};

// ============================================================================
// LABELS (Uzbek)
// ============================================================================

export const PRODUCT_CATEGORY_LABELS_UZ: Record<ProductCategory, string> = {
  [ProductCategory.COFFEE_BEANS]: 'Donali qahva',
  [ProductCategory.COFFEE_INSTANT]: 'Tez eriydigan qahva',
  [ProductCategory.TEA]: 'Choy',
  [ProductCategory.CHOCOLATE]: 'Shokolad',
  [ProductCategory.MILK]: 'Sut',
  [ProductCategory.SUGAR]: 'Shakar',
  [ProductCategory.CREAM]: 'Qaymoq',
  [ProductCategory.SYRUP]: 'Sirop',
  [ProductCategory.WATER]: 'Suv',
  [ProductCategory.HOT_DRINKS]: 'Issiq ichimliklar',
  [ProductCategory.COLD_DRINKS]: 'Sovuq ichimliklar',
  [ProductCategory.SNACKS]: 'Sneklar',
  [ProductCategory.SANDWICHES]: 'Sendvichlar',
  [ProductCategory.SALADS]: 'Salatlar',
  [ProductCategory.ICE_CREAM]: 'Muzqaymoq',
  [ProductCategory.CUPS]: 'Stakanlar',
  [ProductCategory.LIDS]: 'Qopqoqlar',
  [ProductCategory.STIRRERS]: 'Aralashtiruvchilar',
  [ProductCategory.NAPKINS]: 'Salfetka',
  [ProductCategory.OTHER]: 'Boshqa',
};

export const PRODUCT_STATUS_LABELS_UZ: Record<ProductStatus, string> = {
  [ProductStatus.ACTIVE]: 'Faol',
  [ProductStatus.INACTIVE]: 'Nofaol',
  [ProductStatus.DISCONTINUED]: 'Ishlab chiqarilmayapti',
  [ProductStatus.OUT_OF_STOCK]: 'Mavjud emas',
};

// ============================================================================
// ICONS
// ============================================================================

export const PRODUCT_CATEGORY_ICONS: Record<ProductCategory, string> = {
  [ProductCategory.COFFEE_BEANS]: '☕',
  [ProductCategory.COFFEE_INSTANT]: '☕',
  [ProductCategory.TEA]: '🍵',
  [ProductCategory.CHOCOLATE]: '🍫',
  [ProductCategory.MILK]: '🥛',
  [ProductCategory.SUGAR]: '🧂',
  [ProductCategory.CREAM]: '🥛',
  [ProductCategory.SYRUP]: '🍯',
  [ProductCategory.WATER]: '💧',
  [ProductCategory.HOT_DRINKS]: '🔥',
  [ProductCategory.COLD_DRINKS]: '🧊',
  [ProductCategory.SNACKS]: '🍿',
  [ProductCategory.SANDWICHES]: '🥪',
  [ProductCategory.SALADS]: '🥗',
  [ProductCategory.ICE_CREAM]: '🍦',
  [ProductCategory.CUPS]: '🥤',
  [ProductCategory.LIDS]: '⭕',
  [ProductCategory.STIRRERS]: '🥢',
  [ProductCategory.NAPKINS]: '🧻',
  [ProductCategory.OTHER]: '📦',
};

// ============================================================================
// COLORS FOR UI
// ============================================================================

export const PRODUCT_STATUS_COLORS: Record<ProductStatus, string> = {
  [ProductStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [ProductStatus.INACTIVE]: 'bg-gray-100 text-gray-800',
  [ProductStatus.DISCONTINUED]: 'bg-red-100 text-red-800',
  [ProductStatus.OUT_OF_STOCK]: 'bg-yellow-100 text-yellow-800',
};

export const BATCH_STATUS_COLORS: Record<IngredientBatchStatus, string> = {
  [IngredientBatchStatus.IN_STOCK]: 'bg-green-100 text-green-800',
  [IngredientBatchStatus.DEPLETED]: 'bg-gray-100 text-gray-800',
  [IngredientBatchStatus.EXPIRED]: 'bg-red-100 text-red-800',
  [IngredientBatchStatus.RETURNED]: 'bg-orange-100 text-orange-800',
  [IngredientBatchStatus.RESERVED]: 'bg-blue-100 text-blue-800',
};

// ============================================================================
// VAT RATES (Uzbekistan)
// ============================================================================

export const VAT_RATES = {
  STANDARD: 12, // Standard rate
  REDUCED: 0, // Reduced rate
  EXEMPT: 0, // Exempt
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate recipe cost from ingredients
 */
export function calculateRecipeCost(
  ingredients: { quantity: number; unitCost: number }[]
): number {
  return ingredients.reduce((total, ing) => total + ing.quantity * ing.unitCost, 0);
}

/**
 * Check if batch is expiring soon
 */
export function isBatchExpiringSoon(expiryDate: Date | undefined, daysThreshold = 7): boolean {
  if (!expiryDate) return false;
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);
  return new Date(expiryDate) <= threshold;
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency = 'UZS'): string {
  if (currency === 'UZS') {
    return `${amount.toLocaleString('ru-RU')} сум`;
  }
  return `${amount.toLocaleString('en-US', { style: 'currency', currency })}`;
}

/**
 * Generate SKU
 */
export function generateSku(isIngredient: boolean): string {
  const prefix = isIngredient ? 'ING' : 'PRD';
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}`;
}

/**
 * Convert unit of measure
 */
export function convertUnit(
  value: number,
  from: UnitOfMeasure,
  to: UnitOfMeasure
): number | null {
  const conversions: Record<string, number> = {
    'g_kg': 0.001,
    'kg_g': 1000,
    'ml_l': 0.001,
    'l_ml': 1000,
  };

  const key = `${from}_${to}`;
  if (conversions[key]) {
    return value * conversions[key];
  }
  if (from === to) {
    return value;
  }
  return null;
}
