import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards";
import {
  Roles,
  UserRole,
  CurrentUser,
  ICurrentUser,
} from "../../common/decorators";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  UpdatePriceDto,
} from "./dto/create-recipe.dto";
import { CreateBatchDto, UpdateBatchDto } from "./dto/create-batch.dto";
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from "./dto/create-supplier.dto";
import { RecipeIngredientDto } from "./dto/create-recipe.dto";

// =============================================================================
// PRODUCTS CONTROLLER
// =============================================================================

@ApiTags("products")
@Controller("products")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ===========================================================================
  // PRODUCT CRUD
  // ===========================================================================

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new product" })
  create(@Body() data: CreateProductDto, @CurrentUser() user: ICurrentUser) {
    return this.productsService.create({
      ...data,
      organizationId: user.organizationId,
    } as Parameters<typeof this.productsService.create>[0]);
  }

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get all products" })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(
    @CurrentUser() user: ICurrentUser,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.productsService.findAll(user.organizationId, {
      category,
      search,
      page,
      limit,
    });
  }

  @Get("recipes-stats")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get recipe statistics for the organization" })
  getRecipeStats(@CurrentUser() user: ICurrentUser) {
    return this.productsService.getRecipeStats(user.organizationId);
  }

  @Get("stock-summary")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get organization-wide stock summary" })
  getStockSummary(@CurrentUser() user: ICurrentUser) {
    return this.productsService.getStockSummary(user.organizationId);
  }

  @Get("batches-expiring")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Get batches expiring within N days" })
  @ApiQuery({ name: "days", required: false, type: Number })
  getExpiringBatches(
    @CurrentUser() user: ICurrentUser,
    @Query("days") days?: number,
  ) {
    return this.productsService.getExpiringBatches(
      user.organizationId,
      days ? Number(days) : 7,
    );
  }

  @Get("barcode/:barcode")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get product by barcode" })
  @ApiParam({ name: "barcode", type: String })
  findByBarcode(
    @Param("barcode") barcode: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.findByBarcode(barcode, user.organizationId);
  }

  @Get(":id")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get product by ID" })
  @ApiParam({ name: "id", type: String })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.findById(id, user.organizationId);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update product" })
  @ApiParam({ name: "id", type: String })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() data: UpdateProductDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.update(
      id,
      user.organizationId,
      data as Parameters<typeof this.productsService.update>[2],
    );
  }

  @Delete(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Soft delete product" })
  @ApiParam({ name: "id", type: String })
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.remove(id, user.organizationId);
  }

  // ===========================================================================
  // RECIPES
  // ===========================================================================

  @Post(":id/recipes")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create recipe for a product" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  createRecipe(
    @Param("id", ParseUUIDPipe) productId: string,
    @Body() dto: CreateRecipeDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.createRecipe(
      productId,
      user.organizationId,
      dto,
      user.id,
    );
  }

  @Get(":id/recipes")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get all recipes for a product" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  getRecipes(
    @Param("id", ParseUUIDPipe) productId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.getRecipesByProduct(
      productId,
      user.organizationId,
    );
  }

  @Get(":id/recipes/primary")
  @ApiOperation({ summary: "Get the primary recipe for a product" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  findPrimaryRecipe(
    @Param("id", ParseUUIDPipe) productId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.findPrimaryRecipe(
      productId,
      user.organizationId,
    );
  }

  @Get(":id/stock")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Get stock summary for a specific product" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  getStockByProduct(
    @Param("id", ParseUUIDPipe) productId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.getStockByProduct(
      productId,
      user.organizationId,
    );
  }

  @Patch(":id/recipes/:recipeId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update a recipe" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  @ApiParam({ name: "recipeId", description: "Recipe ID", type: String })
  updateRecipe(
    @Param("id", ParseUUIDPipe) _productId: string,
    @Param("recipeId", ParseUUIDPipe) recipeId: string,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.updateRecipe(
      recipeId,
      user.organizationId,
      dto,
      user.id,
    );
  }

  @Delete(":id/recipes/:recipeId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Soft delete a recipe" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  @ApiParam({ name: "recipeId", description: "Recipe ID", type: String })
  deleteRecipe(
    @Param("id", ParseUUIDPipe) _productId: string,
    @Param("recipeId", ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.deleteRecipe(recipeId, user.organizationId);
  }

  // ===========================================================================
  // RECIPE SNAPSHOTS
  // ===========================================================================

  @Get(":id/recipes/:recipeId/snapshots")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "List all snapshots of a recipe" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  @ApiParam({ name: "recipeId", description: "Recipe ID", type: String })
  getRecipeSnapshots(
    @Param("id", ParseUUIDPipe) _productId: string,
    @Param("recipeId", ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.getRecipeSnapshots(
      recipeId,
      user.organizationId,
    );
  }

  @Get(":id/recipes/:recipeId/snapshots/:version")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get a specific snapshot version of a recipe" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  @ApiParam({ name: "recipeId", description: "Recipe ID", type: String })
  @ApiParam({
    name: "version",
    description: "Snapshot version number",
    type: Number,
  })
  getSnapshotByVersion(
    @Param("id", ParseUUIDPipe) _productId: string,
    @Param("recipeId", ParseUUIDPipe) recipeId: string,
    @Param("version") version: number,
  ) {
    return this.productsService.getSnapshotByVersion(recipeId, Number(version));
  }

  @Post(":id/recipes/:recipeId/recalculate-cost")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: "Recalculate recipe cost from current ingredient prices",
  })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  @ApiParam({ name: "recipeId", description: "Recipe ID", type: String })
  async recalculateRecipeCost(
    @Param("id", ParseUUIDPipe) _productId: string,
    @Param("recipeId", ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    // Verify recipe belongs to user's organization
    const recipe = await this.productsService.findRecipeWithOrgCheck(
      recipeId,
      user.organizationId,
    );
    await this.productsService.recalculateRecipeCost(recipe.id);
    const cost = await this.productsService.calculateRecipeCost(recipe.id);
    return { recipeId, totalCost: cost };
  }

  // ===========================================================================
  // RECIPE INGREDIENTS
  // ===========================================================================

  @Post(":id/recipes/:recipeId/ingredients")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Add ingredient to a recipe" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  @ApiParam({ name: "recipeId", description: "Recipe ID", type: String })
  addIngredient(
    @Param("id", ParseUUIDPipe) _productId: string,
    @Param("recipeId", ParseUUIDPipe) recipeId: string,
    @Body() dto: RecipeIngredientDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.addIngredient(
      recipeId,
      user.organizationId,
      dto.ingredientId,
      dto.quantity,
      dto.unitOfMeasure,
      dto.sortOrder,
      dto.isOptional,
      user.id,
    );
  }

  @Delete(":id/recipes/:recipeId/ingredients/:ingredientId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Remove ingredient from a recipe" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  @ApiParam({ name: "recipeId", description: "Recipe ID", type: String })
  @ApiParam({
    name: "ingredientId",
    description: "Recipe ingredient ID",
    type: String,
  })
  removeIngredient(
    @Param("id", ParseUUIDPipe) _productId: string,
    @Param("recipeId", ParseUUIDPipe) recipeId: string,
    @Param("ingredientId", ParseUUIDPipe) ingredientId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.removeIngredient(
      ingredientId,
      recipeId,
      user.organizationId,
    );
  }

  // ===========================================================================
  // BATCHES
  // ===========================================================================

  @Post(":id/batches")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create an ingredient batch for a product" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  createBatch(
    @Param("id", ParseUUIDPipe) productId: string,
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.createBatch(
      productId,
      user.organizationId,
      dto,
      user.id,
    );
  }

  @Get(":id/batches")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get available batches for a product" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  getAvailableBatches(
    @Param("id", ParseUUIDPipe) productId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.getAvailableBatches(
      productId,
      user.organizationId,
    );
  }

  @Patch(":id/batches/:batchId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Update an ingredient batch" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  @ApiParam({ name: "batchId", description: "Batch ID", type: String })
  updateBatch(
    @Param("id", ParseUUIDPipe) _productId: string,
    @Param("batchId", ParseUUIDPipe) batchId: string,
    @Body() dto: UpdateBatchDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.updateBatch(
      batchId,
      user.organizationId,
      dto as Parameters<typeof this.productsService.updateBatch>[2],
      user.id,
    );
  }

  @Delete(":id/batches/:batchId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Soft delete an ingredient batch" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  @ApiParam({ name: "batchId", description: "Batch ID", type: String })
  deleteBatch(
    @Param("id", ParseUUIDPipe) _productId: string,
    @Param("batchId", ParseUUIDPipe) batchId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.deleteBatch(batchId, user.organizationId);
  }

  // ===========================================================================
  // BATCH MANAGEMENT
  // ===========================================================================

  @Post("batches-check-expired")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE)
  @ApiOperation({ summary: "Mark expired batches as EXPIRED" })
  checkExpiredBatches(@CurrentUser() user: ICurrentUser) {
    return this.productsService.checkExpiredBatches(user.organizationId);
  }

  // ===========================================================================
  // PRICE HISTORY
  // ===========================================================================

  @Get(":id/price-history")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get price change history for a product" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  getPriceHistory(
    @Param("id", ParseUUIDPipe) productId: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.getPriceHistory(productId, user.organizationId);
  }

  @Post(":id/update-price")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update product price and create history record" })
  @ApiParam({ name: "id", description: "Product ID", type: String })
  updatePrice(
    @Param("id", ParseUUIDPipe) productId: string,
    @Body() dto: UpdatePriceDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.updatePrice(
      productId,
      user.organizationId,
      dto,
      user.id,
    );
  }
}

// =============================================================================
// SUPPLIERS CONTROLLER
// =============================================================================

@ApiTags("suppliers")
@Controller("suppliers")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "List all suppliers for the organization" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  findAll(
    @CurrentUser() user: ICurrentUser,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.productsService.findAllSuppliers(
      user.organizationId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Create a new supplier" })
  createSupplier(
    @Body() dto: CreateSupplierDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.createSupplier(
      user.organizationId,
      dto,
      user.id,
    );
  }

  @Get(":id")
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.OPERATOR,
    UserRole.WAREHOUSE,
    UserRole.ACCOUNTANT,
    UserRole.VIEWER,
  )
  @ApiOperation({ summary: "Get supplier by ID" })
  @ApiParam({ name: "id", type: String })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.findSupplierById(id, user.organizationId);
  }

  @Patch(":id")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: "Update supplier" })
  @ApiParam({ name: "id", type: String })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.productsService.updateSupplier(
      id,
      user.organizationId,
      dto,
      user.id,
    );
  }
}
