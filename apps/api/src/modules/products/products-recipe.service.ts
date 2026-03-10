/**
 * Products Recipe Service
 * Recipes, ingredients, snapshots, cost calculation
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull, In } from "typeorm";
import * as crypto from "crypto";
import {
  Product,
  Recipe,
  RecipeIngredient,
  RecipeSnapshot,
  RecipeType,
  UnitOfMeasure,
} from "./entities/product.entity";
import { CreateRecipeDto, UpdateRecipeDto } from "./dto/create-recipe.dto";
import { ProductsCoreService } from "./products-core.service";

// ── Unit Conversion ────────────────────────────────────────

const UNIT_CONVERSION: Record<string, Record<string, number>> = {
  [UnitOfMeasure.GRAM]: { [UnitOfMeasure.KILOGRAM]: 0.001 },
  [UnitOfMeasure.KILOGRAM]: { [UnitOfMeasure.GRAM]: 1000 },
  [UnitOfMeasure.MILLILITER]: { [UnitOfMeasure.LITER]: 0.001 },
  [UnitOfMeasure.LITER]: { [UnitOfMeasure.MILLILITER]: 1000 },
};

function convertUnits(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number {
  if (fromUnit === toUnit) return quantity;
  const factor = UNIT_CONVERSION[fromUnit]?.[toUnit];
  return factor ? quantity * factor : quantity;
}

// ── Service ────────────────────────────────────────────────

@Injectable()
export class ProductsRecipeService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly recipeIngredientRepository: Repository<RecipeIngredient>,
    @InjectRepository(RecipeSnapshot)
    private readonly recipeSnapshotRepository: Repository<RecipeSnapshot>,
    private readonly coreService: ProductsCoreService,
  ) {}

  // ── Recipe CRUD ──────────────────────────────────────────

  async findRecipeWithOrgCheck(
    recipeId: string,
    organizationId: string,
  ): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId, organizationId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }
    return recipe;
  }

  async createRecipe(
    productId: string,
    organizationId: string,
    dto: CreateRecipeDto,
    userId: string,
  ): Promise<Recipe> {
    await this.coreService.findById(productId, organizationId);

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

    if (dto.ingredients && dto.ingredients.length > 0) {
      const ingredientIds = dto.ingredients.map((i) => i.ingredientId);
      const ingredientProducts = await this.productRepository.find({
        where: { id: In(ingredientIds), organizationId },
        select: ["id", "isIngredient", "name"],
      });
      const nonIngredients = ingredientProducts.filter((p) => !p.isIngredient);
      if (nonIngredients.length > 0) {
        throw new BadRequestException(
          `Products are not marked as ingredients: ${nonIngredients.map((p) => p.name).join(", ")}`,
        );
      }

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

    await this.recalculateRecipeCost(savedRecipe.id);

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

    const previousVersion = recipe.version;
    Object.assign(recipe, {
      ...dto,
      version: previousVersion + 1,
      updatedById: userId,
    });

    const savedRecipe = await this.recipeRepository.save(recipe);

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
    await this.coreService.findById(productId, organizationId);
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

  // ── Recipe Ingredients ───────────────────────────────────

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
    const recipe = await this.recipeRepository.findOne({
      where: { id: recipeId, organizationId },
    });
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    await this.coreService.findById(ingredientId, organizationId);

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
    await this.recalculateRecipeCost(recipeId);

    return saved;
  }

  async removeIngredient(
    ingredientId: string,
    recipeId: string,
    organizationId: string,
  ): Promise<void> {
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

  // ── Recipe Snapshots ─────────────────────────────────────

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

    await this.recipeSnapshotRepository.update(
      { recipeId, validTo: IsNull() },
      { validTo: new Date() },
    );

    const ingredientDetails = (recipe.ingredients || []).map((ri) => ({
      ingredientId: ri.ingredientId,
      ingredientName: ri.ingredient?.name ?? "Unknown",
      ingredientSku: ri.ingredient?.sku ?? "N/A",
      quantity: Number(ri.quantity),
      unitOfMeasure: ri.unitOfMeasure,
      unitCost: ri.ingredient ? Number(ri.ingredient.purchasePrice) : 0,
    }));

    const snapshotData = {
      name: recipe.name,
      description: recipe.description,
      typeCode: recipe.typeCode,
      totalCost: Number(recipe.totalCost),
      preparationTimeSeconds: recipe.preparationTimeSeconds,
      temperatureCelsius: recipe.temperatureCelsius,
      servingSizeMl: recipe.servingSizeMl,
      settings: recipe.settings as Record<string, string | number | boolean>,
      ingredients: ingredientDetails,
    };

    const checksum = crypto
      .createHash("sha256")
      .update(JSON.stringify(snapshotData))
      .digest("hex");

    const snapshot = this.recipeSnapshotRepository.create({
      recipeId,
      version: recipe.version,
      snapshot: snapshotData,
      checksum,
      changeReason,
      createdById: userId,
    });

    return this.recipeSnapshotRepository.save(snapshot);
  }

  async getCurrentSnapshot(recipeId: string): Promise<RecipeSnapshot | null> {
    return this.recipeSnapshotRepository.findOne({
      where: { recipeId, validTo: IsNull() },
    });
  }

  async getSnapshotByVersion(
    recipeId: string,
    version: number,
  ): Promise<RecipeSnapshot> {
    const snapshot = await this.recipeSnapshotRepository.findOne({
      where: { recipeId, version },
    });
    if (!snapshot) {
      throw new NotFoundException(
        `Snapshot version ${version} not found for recipe ${recipeId}`,
      );
    }
    return snapshot;
  }

  async getSnapshotAtDate(
    recipeId: string,
    date: Date,
  ): Promise<RecipeSnapshot | null> {
    return this.recipeSnapshotRepository
      .createQueryBuilder("s")
      .where("s.recipeId = :recipeId", { recipeId })
      .andWhere("s.validFrom <= :date", { date })
      .andWhere("(s.validTo > :date OR s.validTo IS NULL)")
      .getOne();
  }

  async getRecipeSnapshots(
    recipeId: string,
    organizationId?: string,
  ): Promise<RecipeSnapshot[]> {
    if (organizationId) {
      const recipe = await this.recipeRepository.findOne({
        where: { id: recipeId, organizationId },
        select: ["id"],
      });
      if (!recipe) {
        throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
      }
    }
    return this.recipeSnapshotRepository.find({
      where: { recipeId },
      order: { version: "DESC" },
    });
  }

  // ── Cost Calculation ─────────────────────────────────────

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

    const ingredientIds = ingredients.map((ri) => ri.ingredientId);
    const products = await this.productRepository.find({
      where: { id: In(ingredientIds), organizationId: recipe.organizationId },
      select: ["id", "purchasePrice", "unitOfMeasure"],
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let totalCost = 0;
    for (const ri of ingredients) {
      const ingredient = productMap.get(ri.ingredientId);
      if (ingredient) {
        const unitCost = Number(ingredient.purchasePrice);
        const convertedQty = convertUnits(
          Number(ri.quantity),
          ri.unitOfMeasure,
          ingredient.unitOfMeasure,
        );
        totalCost += unitCost * convertedQty;
      }
    }

    return totalCost;
  }

  async recalculateRecipeCost(recipeId: string): Promise<void> {
    const totalCost = await this.calculateRecipeCost(recipeId);
    await this.recipeRepository.update(recipeId, { totalCost });
  }
}
