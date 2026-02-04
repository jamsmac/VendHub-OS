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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles, UserRole } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateRecipeDto, UpdateRecipeDto, UpdatePriceDto } from './dto/create-recipe.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto';
import { RecipeIngredientDto } from './dto/create-recipe.dto';

interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: string;
}

// =============================================================================
// PRODUCTS CONTROLLER
// =============================================================================

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ===========================================================================
  // PRODUCT CRUD
  // ===========================================================================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new product' })
  create(@Body() data: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.create({
      ...data,
      organizationId: user.organizationId,
    } as Parameters<typeof this.productsService.create>[0]);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findAll(user.organizationId, {
      type,
      category,
      search,
      page,
      limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.findById(id, user.organizationId);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Get product by barcode' })
  @ApiParam({ name: 'barcode', type: String })
  findByBarcode(
    @Param('barcode') barcode: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.findByBarcode(barcode, user.organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateProductDto,
  ) {
    return this.productsService.update(
      id,
      data as Parameters<typeof this.productsService.update>[1],
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Soft delete product' })
  @ApiParam({ name: 'id', type: String })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  // ===========================================================================
  // RECIPES
  // ===========================================================================

  @Post(':id/recipes')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create recipe for a product' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  createRecipe(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: CreateRecipeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.createRecipe(
      productId,
      user.organizationId,
      dto,
      user.id,
    );
  }

  @Get(':id/recipes')
  @ApiOperation({ summary: 'Get all recipes for a product' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  getRecipes(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.getRecipesByProduct(productId, user.organizationId);
  }

  @Patch(':id/recipes/:recipeId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update a recipe' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiParam({ name: 'recipeId', description: 'Recipe ID', type: String })
  updateRecipe(
    @Param('id', ParseUUIDPipe) _productId: string,
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Body() dto: UpdateRecipeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.updateRecipe(
      recipeId,
      user.organizationId,
      dto,
      user.id,
    );
  }

  @Delete(':id/recipes/:recipeId')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Soft delete a recipe' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiParam({ name: 'recipeId', description: 'Recipe ID', type: String })
  deleteRecipe(
    @Param('id', ParseUUIDPipe) _productId: string,
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.deleteRecipe(recipeId, user.organizationId);
  }

  // ===========================================================================
  // RECIPE INGREDIENTS
  // ===========================================================================

  @Post(':id/recipes/:recipeId/ingredients')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Add ingredient to a recipe' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiParam({ name: 'recipeId', description: 'Recipe ID', type: String })
  addIngredient(
    @Param('id', ParseUUIDPipe) _productId: string,
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Body() dto: RecipeIngredientDto,
    @CurrentUser() user: AuthenticatedUser,
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

  @Delete(':id/recipes/:recipeId/ingredients/:ingredientId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Remove ingredient from a recipe' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  @ApiParam({ name: 'recipeId', description: 'Recipe ID', type: String })
  @ApiParam({ name: 'ingredientId', description: 'Recipe ingredient ID', type: String })
  removeIngredient(
    @Param('id', ParseUUIDPipe) _productId: string,
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Param('ingredientId', ParseUUIDPipe) ingredientId: string,
    @CurrentUser() user: AuthenticatedUser,
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

  @Post(':id/batches')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Create an ingredient batch for a product' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  createBatch(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.createBatch(
      productId,
      user.organizationId,
      dto,
      user.id,
    );
  }

  @Get(':id/batches')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.OWNER)
  @ApiOperation({ summary: 'Get available batches for a product' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  getAvailableBatches(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.getAvailableBatches(productId, user.organizationId);
  }

  // ===========================================================================
  // PRICE HISTORY
  // ===========================================================================

  @Get(':id/price-history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.OWNER)
  @ApiOperation({ summary: 'Get price change history for a product' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  getPriceHistory(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.getPriceHistory(productId, user.organizationId);
  }

  @Post(':id/update-price')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update product price and create history record' })
  @ApiParam({ name: 'id', description: 'Product ID', type: String })
  updatePrice(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: UpdatePriceDto,
    @CurrentUser() user: AuthenticatedUser,
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

@ApiTags('suppliers')
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.OWNER)
  @ApiOperation({ summary: 'List all suppliers for the organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.findAllSuppliers(
      user.organizationId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new supplier' })
  createSupplier(
    @Body() dto: CreateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.createSupplier(
      user.organizationId,
      dto,
      user.id,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE, UserRole.ACCOUNTANT, UserRole.OWNER)
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiParam({ name: 'id', type: String })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.findSupplierById(id, user.organizationId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update supplier' })
  @ApiParam({ name: 'id', type: String })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.updateSupplier(
      id,
      user.organizationId,
      dto,
      user.id,
    );
  }
}
