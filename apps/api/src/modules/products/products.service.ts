import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, In, LessThanOrEqual } from "typeorm";
import {
  Product,
  Recipe,
  RecipeIngredient,
  RecipeSnapshot,
  RecipeType,
  IngredientBatch,
  IngredientBatchStatus,
  ProductPriceHistory,
  Supplier,
  UnitOfMeasure,
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

// ============================================================================
// INTERFACES
// ============================================================================

interface ProductFilters {
  type?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,

    @InjectRepository(RecipeIngredient)
    private readonly recipeIngredientRepository: Repository<RecipeIngredient>,

    @InjectRepository(RecipeSnapshot)
    private readonly recipeSnapshotRepository: Repository<RecipeSnapshot>,

    @InjectRepository(IngredientBatch)
    private readonly ingredientBatchRepository: Repository<IngredientBatch>,

    @InjectRepository(ProductPriceHistory)
    private readonly priceHistoryRepository: Repository<ProductPriceHistory>,

    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  // ==========================================================================
  // PRODUCT CRUD
  // ==========================================================================

  async create(data: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(data);
    return this.productRepository.save(product);
  }

  async findAll(
    organizationId: string,
    filters?: ProductFilters,
  ): Promise<PaginatedResult<Product>> {
    const {
      page = 1,
      limit: rawLimit = 50,
      type,
      category,
      isActive,
      search,
    } = filters || {};
    const limit = Math.min(rawLimit, 100);

    const query = this.productRepository
      .createQueryBuilder("product")
      .select([
        "product.id",
        "product.name",
        "product.nameUz",
        "product.sku",
        "product.barcode",
        "product.type",
        "product.category",
        "product.isActive",
        "product.sellingPrice",
        "product.purchasePrice",
        "product.imageUrl",
        "product.unitOfMeasure",
        "product.organizationId",
        "product.createdAt",
        "product.updatedAt",
      ])
      .where("product.organizationId = :organizationId", { organizationId });

    if (type) {
      query.andWhere("product.type = :type", { type });
    }

    if (category) {
      query.andWhere("product.category = :category", { category });
    }

    if (isActive !== undefined) {
      query.andWhere("product.isActive = :isActive", { isActive });
    }

    if (search) {
      query.andWhere(
        "(product.name ILIKE :search OR product.barcode ILIKE :search OR product.sku ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy("product.name", "ASC");
    query.skip((page - 1) * limit);
    query.take(limit);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, organizationId?: string): Promise<Product> {
    const where: Record<string, unknown> = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    const product = await this.productRepository.findOne({ where });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findByBarcode(
    barcode: string,
    organizationId: string,
  ): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { barcode, organizationId },
    });
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    Object.assign(product, data);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.productRepository.softDelete(id);
  }

  // ==========================================================================
  // RECIPE CRUD
  // ==========================================================================

  async createRecipe(
    productId: string,
    organizationId: string,
    dto: CreateRecipeDto,
    userId: string,
  ): Promise<Recipe> {
    // Verify product belongs to organization
    await this.findById(productId, organizationId);

    const recipe = this.recipeRepository.create({
      productId,
      organizationId,
      name: dto.name,
      nameUz: dto.nameUz,
      typeCode: dto.typeCode,
      description: dto.description,
      preparationTimeSeconds: dto.preparationTimeSeconds,
      temperatureCelsius: dto.temperatureCelsius,
      servingSizeMl: dto.servingSizeMl,
      settings: dto.settings || {},
      createdById: userId,
    });

    const savedRecipe = await this.recipeRepository.save(recipe);

    // Add ingredients if provided
    if (dto.ingredients && dto.ingredients.length > 0) {
      const ingredientEntities = dto.ingredients.map((ing) =>
        this.recipeIngredientRepository.create({
          recipeId: savedRecipe.id,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unitOfMeasure: ing.unitOfMeasure,
          sortOrder: ing.sortOrder ?? 1,
          isOptional: ing.isOptional ?? false,
          createdById: userId,
        }),
      );
      await this.recipeIngredientRepository.save(ingredientEntities);
    }

    // Calculate and cache total cost
    await this.recalculateRecipeCost(savedRecipe.id);

    // Create initial snapshot
    await this.createRecipeSnapshot(
      savedRecipe.id,
      userId,
      "Initial recipe creation",
    );

    return this.recipeRepository.findOne({
      where: { id: savedRecipe.id },
      relations: ["ingredients"],
    }) as Promise<Recipe>;
  }

  async getRecipesByProduct(
    productId: string,
    organizationId: string,
  ): Promise<Recipe[]> {
    return this.recipeRepository.find({
      where: { productId, organizationId },
      relations: ["ingredients"],
      order: { typeCode: "ASC", createdAt: "ASC" },
    });
  }

  async updateRecipe(
    recipeId: string,
    organizationId: string,
    dto: UpdateRecipeDto,
    userId: string,
  ): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId, organizationId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    // Increment version on update
    const previousVersion = recipe.version;
    Object.assign(recipe, {
      ...dto,
      version: previousVersion + 1,
      updatedById: userId,
    });

    const savedRecipe = await this.recipeRepository.save(recipe);

    // Create a snapshot of the previous version
    await this.createRecipeSnapshot(
      savedRecipe.id,
      userId,
      `Updated from version ${previousVersion} to ${savedRecipe.version}`,
    );

    return this.recipeRepository.findOne({
      where: { id: savedRecipe.id },
      relations: ["ingredients"],
    }) as Promise<Recipe>;
  }

  async deleteRecipe(recipeId: string, organizationId: string): Promise<void> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId, organizationId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }
    await this.recipeRepository.softDelete(recipeId);
  }

  async findPrimaryRecipe(
    productId: string,
    organizationId: string,
  ): Promise<Recipe> {
    await this.findById(productId, organizationId);
    const recipe = await this.recipeRepository.findOne({
      where: { productId, organizationId, typeCode: RecipeType.PRIMARY },
      relations: ["ingredients", "ingredients.ingredient"],
    });
    if (!recipe) {
      throw new NotFoundException(
        `No primary recipe found for product ${productId}`,
      );
    }
    return recipe;
  }

  async getRecipeStats(organizationId: string): Promise<{
    total: number;
    active: number;
    averageCost: number;
    byType: Record<string, number>;
  }> {
    const recipes = await this.recipeRepository.find({
      where: { organizationId },
      select: ["id", "isActive", "typeCode", "totalCost"],
    });

    const active = recipes.filter((r) => r.isActive).length;
    const totalCost = recipes.reduce((sum, r) => sum + Number(r.totalCost), 0);
    const byType: Record<string, number> = {};
    for (const r of recipes) {
      byType[r.typeCode] = (byType[r.typeCode] || 0) + 1;
    }

    return {
      total: recipes.length,
      active,
      averageCost: recipes.length > 0 ? totalCost / recipes.length : 0,
      byType,
    };
  }

  // ==========================================================================
  // RECIPE INGREDIENTS
  // ==========================================================================

  async addIngredient(
    recipeId: string,
    organizationId: string,
    ingredientId: string,
    quantity: number,
    unitOfMeasure?: string,
    sortOrder?: number,
    isOptional?: boolean,
    userId?: string,
  ): Promise<RecipeIngredient> {
    // Verify recipe belongs to organization
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId, organizationId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    // Verify ingredient product exists
    await this.findById(ingredientId, organizationId);

    const ingredient = this.recipeIngredientRepository.create({
      recipeId,
      ingredientId,
      quantity,
      unitOfMeasure: unitOfMeasure as UnitOfMeasure,
      sortOrder: sortOrder ?? 1,
      isOptional: isOptional ?? false,
      createdById: userId,
    });

    const saved = await this.recipeIngredientRepository.save(ingredient);

    // Recalculate recipe cost after adding ingredient
    await this.recalculateRecipeCost(recipeId);

    return saved;
  }

  async removeIngredient(
    ingredientId: string,
    recipeId: string,
    organizationId: string,
  ): Promise<void> {
    // Verify recipe belongs to organization
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId, organizationId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    const ingredient = await this.recipeIngredientRepository.findOne({
      where: { id: ingredientId, recipeId },
    });
    if (!ingredient) {
      throw new NotFoundException(
        `Recipe ingredient with ID ${ingredientId} not found`,
      );
    }

    await this.recipeIngredientRepository.softDelete(ingredientId);

    // Recalculate recipe cost after removing ingredient
    await this.recalculateRecipeCost(recipeId);
  }

  async updateIngredientQuantity(
    ingredientId: string,
    recipeId: string,
    organizationId: string,
    quantity: number,
    userId?: string,
  ): Promise<RecipeIngredient> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId, organizationId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    const ingredient = await this.recipeIngredientRepository.findOne({
      where: { id: ingredientId, recipeId },
    });
    if (!ingredient) {
      throw new NotFoundException(
        `Recipe ingredient with ID ${ingredientId} not found`,
      );
    }

    ingredient.quantity = quantity;
    ingredient.updatedById = userId ?? null;
    const saved = await this.recipeIngredientRepository.save(ingredient);

    await this.recalculateRecipeCost(recipeId);

    return saved;
  }

  // ==========================================================================
  // RECIPE SNAPSHOTS
  // ==========================================================================

  async createRecipeSnapshot(
    recipeId: string,
    userId: string,
    changeReason?: string,
  ): Promise<RecipeSnapshot> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
      relations: ["ingredients", "ingredients.ingredient"],
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    // Close the previous current snapshot
    await this.recipeSnapshotRepository.update(
      { recipeId, validTo: IsNull() },
      { validTo: new Date() },
    );

    // Build ingredient details for the snapshot
    const ingredientDetails = (recipe.ingredients || []).map((ri) => ({
      ingredientId: ri.ingredientId,
      ingredientName: ri.ingredient?.name ?? "Unknown",
      ingredientSku: ri.ingredient?.sku ?? "N/A",
      quantity: Number(ri.quantity),
      unitOfMeasure: ri.unitOfMeasure,
      unitCost: ri.ingredient ? Number(ri.ingredient.purchasePrice) : 0,
    }));

    const snapshot = this.recipeSnapshotRepository.create({
      recipeId,
      version: recipe.version,
      snapshot: {
        name: recipe.name,
        description: recipe.description,
        typeCode: recipe.typeCode,
        totalCost: Number(recipe.totalCost),
        preparationTimeSeconds: recipe.preparationTimeSeconds,
        temperatureCelsius: recipe.temperatureCelsius,
        servingSizeMl: recipe.servingSizeMl,
        settings: recipe.settings as Record<string, string | number | boolean>,
        ingredients: ingredientDetails,
      },
      changeReason,
      createdById: userId,
    });

    return this.recipeSnapshotRepository.save(snapshot);
  }

  // ==========================================================================
  // BATCH TRACKING (FIFO)
  // ==========================================================================

  async createBatch(
    productId: string,
    organizationId: string,
    dto: CreateBatchDto,
    userId: string,
  ): Promise<IngredientBatch> {
    // Verify product exists and belongs to organization
    await this.findById(productId, organizationId);

    const batch = this.ingredientBatchRepository.create({
      productId,
      organizationId,
      batchNumber: dto.batchNumber,
      quantity: dto.quantity,
      remainingQuantity: dto.quantity,
      unitOfMeasure: dto.unitOfMeasure,
      purchasePrice: dto.purchasePrice,
      totalCost:
        dto.totalCost ??
        ((dto.purchasePrice
          ? dto.purchasePrice * dto.quantity
          : undefined) as number),
      supplierId: dto.supplierId,
      supplierBatchNumber: dto.supplierBatchNumber,
      invoiceNumber: dto.invoiceNumber,
      manufactureDate: dto.manufactureDate,
      expiryDate: dto.expiryDate,
      storageLocation: dto.storageLocation,
      notes: dto.notes,
      status: IngredientBatchStatus.IN_STOCK,
      createdById: userId,
    });

    return this.ingredientBatchRepository.save(batch);
  }

  /**
   * Deplete stock from batches using FIFO (First In, First Out).
   * Consumes from the oldest non-depleted, non-expired batch first.
   */
  async depleteFromBatch(
    productId: string,
    organizationId: string,
    quantityToDeplete: number,
    userId?: string,
  ): Promise<{
    depletedFrom: { batchId: string; quantity: number }[];
    remaining: number;
  }> {
    if (quantityToDeplete <= 0) {
      throw new BadRequestException("Quantity to deplete must be positive");
    }

    // Get available batches ordered by received date (FIFO)
    const batches = await this.ingredientBatchRepository.find({
      where: {
        productId,
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
      },
      order: { receivedDate: "ASC", createdAt: "ASC" },
    });

    let remaining = quantityToDeplete;
    const depletedFrom: { batchId: string; quantity: number }[] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;

      const available =
        Number(batch.remainingQuantity) - Number(batch.reservedQuantity);
      if (available <= 0) continue;

      const toDeduct = Math.min(available, remaining);
      batch.remainingQuantity = Number(batch.remainingQuantity) - toDeduct;
      batch.updatedById = userId ?? null;

      // Mark as depleted if nothing remains
      if (batch.remainingQuantity <= 0) {
        batch.status = IngredientBatchStatus.DEPLETED;
      }

      // Audit trail in metadata
      const history = ((batch.metadata as Record<string, unknown>)
        ?.deductionHistory ?? []) as {
        date: string;
        quantity: number;
        userId: string | null;
      }[];
      history.push({
        date: new Date().toISOString(),
        quantity: toDeduct,
        userId: userId ?? null,
      });
      batch.metadata = { ...batch.metadata, deductionHistory: history };

      await this.ingredientBatchRepository.save(batch);
      depletedFrom.push({ batchId: batch.id, quantity: toDeduct });
      remaining -= toDeduct;
    }

    return { depletedFrom, remaining };
  }

  async getAvailableBatches(
    productId: string,
    organizationId: string,
  ): Promise<IngredientBatch[]> {
    return this.ingredientBatchRepository.find({
      where: {
        productId,
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
      },
      order: { receivedDate: "ASC", createdAt: "ASC" },
    });
  }

  // ==========================================================================
  // BATCH EXPIRY & STOCK SUMMARY
  // ==========================================================================

  async checkExpiredBatches(
    organizationId: string,
  ): Promise<{ markedExpired: number }> {
    const today = new Date();
    const batches = await this.ingredientBatchRepository.find({
      where: {
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
        expiryDate: LessThanOrEqual(today),
      },
    });

    for (const batch of batches) {
      batch.status = IngredientBatchStatus.EXPIRED;
    }

    if (batches.length > 0) {
      await this.ingredientBatchRepository.save(batches);
    }

    return { markedExpired: batches.length };
  }

  async getExpiringBatches(
    organizationId: string,
    days = 7,
  ): Promise<IngredientBatch[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return this.ingredientBatchRepository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.product", "product")
      .where("batch.organizationId = :organizationId", { organizationId })
      .andWhere("batch.status = :status", {
        status: IngredientBatchStatus.IN_STOCK,
      })
      .andWhere("batch.expiryDate >= :today", { today })
      .andWhere("batch.expiryDate <= :futureDate", { futureDate })
      .orderBy("batch.expiryDate", "ASC")
      .getMany();
  }

  async getStockByProduct(
    productId: string,
    organizationId: string,
  ): Promise<{
    totalStock: number;
    batchCount: number;
    oldestExpiry: Date | null;
    newestExpiry: Date | null;
    totalValue: number;
  }> {
    await this.findById(productId, organizationId);

    const batches = await this.ingredientBatchRepository.find({
      where: {
        productId,
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
      },
    });

    let totalStock = 0;
    let totalValue = 0;
    let oldestExpiry: Date | null = null;
    let newestExpiry: Date | null = null;

    for (const b of batches) {
      const remaining = Number(b.remainingQuantity);
      totalStock += remaining;
      totalValue += remaining * Number(b.purchasePrice || 0);
      if (b.expiryDate) {
        if (!oldestExpiry || b.expiryDate < oldestExpiry)
          oldestExpiry = b.expiryDate;
        if (!newestExpiry || b.expiryDate > newestExpiry)
          newestExpiry = b.expiryDate;
      }
    }

    return {
      totalStock,
      batchCount: batches.length,
      oldestExpiry,
      newestExpiry,
      totalValue,
    };
  }

  async getStockSummary(organizationId: string): Promise<{
    totalProducts: number;
    totalBatches: number;
    totalValue: number;
    expiringWithin7Days: number;
  }> {
    const batches = await this.ingredientBatchRepository.find({
      where: {
        organizationId,
        status: IngredientBatchStatus.IN_STOCK,
      },
    });

    const productIds = new Set(batches.map((b) => b.productId));
    let totalValue = 0;
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    let expiringCount = 0;

    for (const b of batches) {
      totalValue += Number(b.remainingQuantity) * Number(b.purchasePrice || 0);
      if (b.expiryDate && b.expiryDate <= sevenDaysFromNow) {
        expiringCount++;
      }
    }

    return {
      totalProducts: productIds.size,
      totalBatches: batches.length,
      totalValue,
      expiringWithin7Days: expiringCount,
    };
  }

  // ==========================================================================
  // COST CALCULATION
  // ==========================================================================

  /**
   * Calculate the total recipe cost by summing ingredient batch costs.
   * Uses the average purchase price from available batches for each ingredient.
   * Optimized: fetches all ingredient products in a single query to avoid N+1.
   */
  async calculateRecipeCost(recipeId: string): Promise<number> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId },
      relations: ["ingredients"],
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    const ingredients = recipe.ingredients || [];
    if (ingredients.length === 0) return 0;

    // Batch-fetch all ingredient products in one query (N+1 prevention)
    const ingredientIds = ingredients.map((ri) => ri.ingredientId);
    const products = await this.productRepository.find({
      where: { id: In(ingredientIds) },
      select: ["id", "purchasePrice"],
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalCost = 0;
    for (const ri of ingredients) {
      const ingredient = productMap.get(ri.ingredientId);
      if (ingredient) {
        const unitCost = Number(ingredient.purchasePrice);
        totalCost += unitCost * Number(ri.quantity);
      }
    }

    return totalCost;
  }

  /**
   * Recalculate and persist recipe cost.
   */
  private async recalculateRecipeCost(recipeId: string): Promise<void> {
    const totalCost = await this.calculateRecipeCost(recipeId);
    await this.recipeRepository.update(recipeId, { totalCost });
  }

  // ==========================================================================
  // PRICE HISTORY
  // ==========================================================================

  /**
   * Update product price and create a price history record.
   * At least one of purchasePrice or sellingPrice must be provided.
   */
  async updatePrice(
    productId: string,
    organizationId: string,
    dto: UpdatePriceDto,
    userId: string,
  ): Promise<{ product: Product; history: ProductPriceHistory }> {
    const product = await this.findById(productId, organizationId);

    if (dto.purchasePrice === undefined && dto.sellingPrice === undefined) {
      throw new BadRequestException(
        "At least one of purchasePrice or sellingPrice must be provided",
      );
    }

    // Close the previous current price history record
    await this.priceHistoryRepository.update(
      { productId, effectiveTo: IsNull() },
      { effectiveTo: new Date() },
    );

    // Create the new price history entry
    const newPurchasePrice = dto.purchasePrice ?? Number(product.purchasePrice);
    const newSellingPrice = dto.sellingPrice ?? Number(product.sellingPrice);

    const history = this.priceHistoryRepository.create({
      productId,
      purchasePrice: newPurchasePrice,
      sellingPrice: newSellingPrice,
      changeReason: dto.changeReason,
      changedByUserId: userId,
      createdById: userId,
    });
    const savedHistory = await this.priceHistoryRepository.save(history);

    // Update the product prices
    product.purchasePrice = newPurchasePrice;
    product.sellingPrice = newSellingPrice;
    product.updatedById = userId;
    const savedProduct = await this.productRepository.save(product);

    return { product: savedProduct, history: savedHistory };
  }

  async getPriceHistory(
    productId: string,
    organizationId: string,
  ): Promise<ProductPriceHistory[]> {
    // Verify product belongs to organization
    await this.findById(productId, organizationId);

    return this.priceHistoryRepository.find({
      where: { productId },
      order: { effectiveFrom: "DESC" },
    });
  }

  // ==========================================================================
  // SUPPLIER CRUD
  // ==========================================================================

  async createSupplier(
    organizationId: string,
    dto: CreateSupplierDto,
    userId: string,
  ): Promise<Supplier> {
    const supplier = this.supplierRepository.create({
      ...dto,
      organizationId,
      createdById: userId,
    });
    return this.supplierRepository.save(supplier);
  }

  async findAllSuppliers(
    organizationId: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResult<Supplier>> {
    const [data, total] = await this.supplierRepository.findAndCount({
      where: { organizationId },
      order: { name: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findSupplierById(
    id: string,
    organizationId: string,
  ): Promise<Supplier> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, organizationId },
    });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async updateSupplier(
    id: string,
    organizationId: string,
    dto: UpdateSupplierDto,
    userId: string,
  ): Promise<Supplier> {
    const supplier = await this.findSupplierById(id, organizationId);
    Object.assign(supplier, { ...dto, updatedById: userId });
    return this.supplierRepository.save(supplier);
  }
}
