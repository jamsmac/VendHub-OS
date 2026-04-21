/**
 * Products Service — Facade
 * Delegates to ProductsCoreService, ProductsRecipeService, ProductsBatchService
 */

import { Injectable } from "@nestjs/common";
import {
  Product,
  Recipe,
  RecipeIngredient,
  RecipeSnapshot,
  IngredientBatch,
  ProductPriceHistory,
  Supplier,
} from "./entities/product.entity";
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  UpdatePriceDto,
} from "./dto/create-recipe.dto";
import { CreateBatchDto } from "./dto/create-batch.dto";
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from "./dto/create-supplier.dto";
import { ProductsCoreService, PaginatedResult } from "./products-core.service";
import { ProductsRecipeService } from "./products-recipe.service";
import { ProductsBatchService } from "./products-batch.service";

// Re-export for backward compatibility
export { PaginatedResult } from "./products-core.service";

@Injectable()
export class ProductsService {
  constructor(
    private readonly core: ProductsCoreService,
    private readonly recipe: ProductsRecipeService,
    private readonly batch: ProductsBatchService,
  ) {}

  // ── Product CRUD ─────────────────────────────────────────

  create(data: Partial<Product>): Promise<Product> {
    return this.core.create(data);
  }

  findAll(
    organizationId: string,
    filters?: {
      category?: string;
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<PaginatedResult<Product>> {
    return this.core.findAll(organizationId, filters);
  }

  findById(id: string, organizationId?: string): Promise<Product> {
    return this.core.findById(id, organizationId);
  }

  findByBarcode(barcode: string, organizationId: string): Promise<Product> {
    return this.core.findByBarcode(barcode, organizationId);
  }

  update(
    id: string,
    organizationId: string,
    data: Partial<Product>,
  ): Promise<Product> {
    return this.core.update(id, organizationId, data);
  }

  remove(id: string, organizationId: string): Promise<void> {
    return this.core.remove(id, organizationId);
  }

  // ── Recipe CRUD ──────────────────────────────────────────

  findRecipeWithOrgCheck(
    recipeId: string,
    organizationId: string,
  ): Promise<Recipe> {
    return this.recipe.findRecipeWithOrgCheck(recipeId, organizationId);
  }

  createRecipe(
    productId: string,
    organizationId: string,
    dto: CreateRecipeDto,
    userId: string,
  ): Promise<Recipe> {
    return this.recipe.createRecipe(productId, organizationId, dto, userId);
  }

  getRecipesByProduct(
    productId: string,
    organizationId: string,
  ): Promise<Recipe[]> {
    return this.recipe.getRecipesByProduct(productId, organizationId);
  }

  updateRecipe(
    recipeId: string,
    organizationId: string,
    dto: UpdateRecipeDto,
    userId: string,
  ): Promise<Recipe> {
    return this.recipe.updateRecipe(recipeId, organizationId, dto, userId);
  }

  deleteRecipe(recipeId: string, organizationId: string): Promise<void> {
    return this.recipe.deleteRecipe(recipeId, organizationId);
  }

  findPrimaryRecipe(
    productId: string,
    organizationId: string,
  ): Promise<Recipe> {
    return this.recipe.findPrimaryRecipe(productId, organizationId);
  }

  getRecipeStats(organizationId: string): Promise<{
    total: number;
    active: number;
    averageCost: number;
    byType: Record<string, number>;
  }> {
    return this.recipe.getRecipeStats(organizationId);
  }

  // ── Recipe Ingredients ───────────────────────────────────

  addIngredient(
    recipeId: string,
    organizationId: string,
    ingredientId: string,
    quantity: number,
    unitOfMeasure?: string,
    sortOrder?: number,
    isOptional?: boolean,
    userId?: string,
  ): Promise<RecipeIngredient> {
    return this.recipe.addIngredient(
      recipeId,
      organizationId,
      ingredientId,
      quantity,
      unitOfMeasure,
      sortOrder,
      isOptional,
      userId,
    );
  }

  removeIngredient(
    ingredientId: string,
    recipeId: string,
    organizationId: string,
  ): Promise<void> {
    return this.recipe.removeIngredient(ingredientId, recipeId, organizationId);
  }

  updateIngredientQuantity(
    ingredientId: string,
    recipeId: string,
    organizationId: string,
    quantity: number,
    userId?: string,
  ): Promise<RecipeIngredient> {
    return this.recipe.updateIngredientQuantity(
      ingredientId,
      recipeId,
      organizationId,
      quantity,
      userId,
    );
  }

  // ── Recipe Snapshots ─────────────────────────────────────

  createRecipeSnapshot(
    recipeId: string,
    userId: string,
    changeReason?: string,
  ): Promise<RecipeSnapshot> {
    return this.recipe.createRecipeSnapshot(recipeId, userId, changeReason);
  }

  getCurrentSnapshot(recipeId: string): Promise<RecipeSnapshot | null> {
    return this.recipe.getCurrentSnapshot(recipeId);
  }

  getSnapshotByVersion(
    recipeId: string,
    version: number,
  ): Promise<RecipeSnapshot> {
    return this.recipe.getSnapshotByVersion(recipeId, version);
  }

  getSnapshotAtDate(
    recipeId: string,
    date: Date,
  ): Promise<RecipeSnapshot | null> {
    return this.recipe.getSnapshotAtDate(recipeId, date);
  }

  getRecipeSnapshots(
    recipeId: string,
    organizationId?: string,
  ): Promise<RecipeSnapshot[]> {
    return this.recipe.getRecipeSnapshots(recipeId, organizationId);
  }

  // ── Cost Calculation ─────────────────────────────────────

  calculateRecipeCost(recipeId: string): Promise<number> {
    return this.recipe.calculateRecipeCost(recipeId);
  }

  recalculateRecipeCost(recipeId: string): Promise<void> {
    return this.recipe.recalculateRecipeCost(recipeId);
  }

  // ── Batch Tracking ───────────────────────────────────────

  createBatch(
    productId: string,
    organizationId: string,
    dto: CreateBatchDto,
    userId: string,
  ): Promise<IngredientBatch> {
    return this.batch.createBatch(productId, organizationId, dto, userId);
  }

  depleteFromBatch(
    productId: string,
    organizationId: string,
    quantityToDeplete: number,
    userId?: string,
    reason?: string,
    referenceId?: string,
    referenceType?: string,
  ): Promise<{
    depletedFrom: { batchId: string; quantity: number }[];
    remaining: number;
  }> {
    return this.batch.depleteFromBatch(
      productId,
      organizationId,
      quantityToDeplete,
      userId,
      reason,
      referenceId,
      referenceType,
    );
  }

  getAvailableBatches(
    productId: string,
    organizationId: string,
  ): Promise<IngredientBatch[]> {
    return this.batch.getAvailableBatches(productId, organizationId);
  }

  updateBatch(
    batchId: string,
    organizationId: string,
    data: Partial<IngredientBatch>,
    userId?: string,
  ): Promise<IngredientBatch> {
    return this.batch.updateBatch(batchId, organizationId, data, userId);
  }

  deleteBatch(batchId: string, organizationId: string): Promise<void> {
    return this.batch.deleteBatch(batchId, organizationId);
  }

  // ── Batch Expiry & Stock ─────────────────────────────────

  checkExpiredBatches(
    organizationId: string,
  ): Promise<{ markedExpired: number }> {
    return this.batch.checkExpiredBatches(organizationId);
  }

  getExpiringBatches(
    organizationId: string,
    days?: number,
  ): Promise<IngredientBatch[]> {
    return this.batch.getExpiringBatches(organizationId, days);
  }

  getStockByProduct(
    productId: string,
    organizationId: string,
  ): Promise<{
    totalStock: number;
    batchCount: number;
    oldestExpiry: Date | null;
    newestExpiry: Date | null;
    totalValue: number;
  }> {
    return this.batch.getStockByProduct(productId, organizationId);
  }

  getStockSummary(organizationId: string): Promise<{
    totalProducts: number;
    totalBatches: number;
    totalValue: number;
    expiringWithin7Days: number;
  }> {
    return this.batch.getStockSummary(organizationId);
  }

  // ── Price History ────────────────────────────────────────

  updatePrice(
    productId: string,
    organizationId: string,
    dto: UpdatePriceDto,
    userId: string,
  ): Promise<{ product: Product; history: ProductPriceHistory }> {
    return this.core.updatePrice(productId, organizationId, dto, userId);
  }

  getPriceHistory(
    productId: string,
    organizationId: string,
  ): Promise<ProductPriceHistory[]> {
    return this.core.getPriceHistory(productId, organizationId);
  }

  // ── Suppliers ────────────────────────────────────────────

  createSupplier(
    organizationId: string,
    dto: CreateSupplierDto,
    userId: string,
  ): Promise<Supplier> {
    return this.core.createSupplier(organizationId, dto, userId);
  }

  findAllSuppliers(
    organizationId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<Supplier>> {
    return this.core.findAllSuppliers(organizationId, page, limit);
  }

  findSupplierById(id: string, organizationId: string): Promise<Supplier> {
    return this.core.findSupplierById(id, organizationId);
  }

  updateSupplier(
    id: string,
    organizationId: string,
    dto: UpdateSupplierDto,
    userId: string,
  ): Promise<Supplier> {
    return this.core.updateSupplier(id, organizationId, dto, userId);
  }
}
