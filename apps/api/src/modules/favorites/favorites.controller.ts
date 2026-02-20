/**
 * Favorites Controller
 * API endpoints для системы избранного VendHub
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { FavoritesService } from './favorites.service';
import { FavoriteType } from './entities/favorite.entity';
import {
  AddFavoriteDto,
  UpdateFavoriteDto,
  AddFavoritesBulkDto,
  RemoveFavoritesBulkDto,
  ReorderFavoritesDto,
  FavoriteFilterDto,
  FavoritesListDto,
  FavoriteProductDto,
  FavoriteMachineDto,
  AddFavoriteResultDto,
  FavoriteStatusDto,
  FavoriteStatusBulkDto,
} from './dto/favorite.dto';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // ============================================================================
  // MAIN ENDPOINTS
  // ============================================================================

  @Get()
  @ApiOperation({
    summary: 'Get all favorites',
    description: 'Получить все избранное пользователя',
  })
  @ApiResponse({ status: 200, type: FavoritesListDto })
  async getFavorites(
    @CurrentUser() user: User,
    @Query() filter: FavoriteFilterDto,
  ): Promise<FavoritesListDto> {
    return this.favoritesService.getFavorites(user.id, filter);
  }

  @Get('products')
  @ApiOperation({
    summary: 'Get favorite products',
    description: 'Получить избранные продукты',
  })
  @ApiResponse({ status: 200, type: [FavoriteProductDto] })
  async getFavoriteProducts(@CurrentUser() user: User): Promise<FavoriteProductDto[]> {
    return this.favoritesService.getFavoriteProducts(user.id);
  }

  @Get('machines')
  @ApiOperation({
    summary: 'Get favorite machines',
    description: 'Получить избранные автоматы',
  })
  @ApiResponse({ status: 200, type: [FavoriteMachineDto] })
  async getFavoriteMachines(@CurrentUser() user: User): Promise<FavoriteMachineDto[]> {
    return this.favoritesService.getFavoriteMachines(user.id);
  }

  @Get('count')
  @ApiOperation({
    summary: 'Get favorites count',
    description: 'Получить количество избранного',
  })
  async getFavoritesCount(@CurrentUser() user: User): Promise<{ products: number; machines: number }> {
    return this.favoritesService.getFavoritesCount(user.id);
  }

  // ============================================================================
  // ADD/REMOVE
  // ============================================================================

  @Post()
  @ApiOperation({
    summary: 'Add to favorites',
    description: 'Добавить в избранное',
  })
  @ApiResponse({ status: 201, type: AddFavoriteResultDto })
  async addFavorite(
    @CurrentUser() user: User,
    @Body() dto: AddFavoriteDto,
  ): Promise<AddFavoriteResultDto> {
    return this.favoritesService.addFavorite(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove from favorites',
    description: 'Удалить из избранного',
  })
  @ApiParam({ name: 'id', description: 'Favorite ID' })
  async removeFavorite(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.favoritesService.removeFavorite(user.id, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update favorite',
    description: 'Обновить избранное (заметки, порядок)',
  })
  @ApiParam({ name: 'id', description: 'Favorite ID' })
  async updateFavorite(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFavoriteDto,
  ): Promise<any> {
    return this.favoritesService.updateFavorite(user.id, id, dto);
  }

  // ============================================================================
  // TOGGLE
  // ============================================================================

  @Post('products/:productId/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle product favorite',
    description: 'Переключить избранное для продукта',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  async toggleProductFavorite(
    @CurrentUser() user: User,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<{ isFavorite: boolean; favoriteId: string | null }> {
    return this.favoritesService.toggleFavorite(user.id, FavoriteType.PRODUCT, productId);
  }

  @Post('machines/:machineId/toggle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle machine favorite',
    description: 'Переключить избранное для автомата',
  })
  @ApiParam({ name: 'machineId', description: 'Machine ID' })
  async toggleMachineFavorite(
    @CurrentUser() user: User,
    @Param('machineId', ParseUUIDPipe) machineId: string,
  ): Promise<{ isFavorite: boolean; favoriteId: string | null }> {
    return this.favoritesService.toggleFavorite(user.id, FavoriteType.MACHINE, machineId);
  }

  // ============================================================================
  // STATUS CHECK
  // ============================================================================

  @Get('products/:productId/status')
  @ApiOperation({
    summary: 'Check product favorite status',
    description: 'Проверить, в избранном ли продукт',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 200, type: FavoriteStatusDto })
  async checkProductStatus(
    @CurrentUser() user: User,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<FavoriteStatusDto> {
    return this.favoritesService.isFavorite(user.id, FavoriteType.PRODUCT, productId);
  }

  @Get('machines/:machineId/status')
  @ApiOperation({
    summary: 'Check machine favorite status',
    description: 'Проверить, в избранном ли автомат',
  })
  @ApiParam({ name: 'machineId', description: 'Machine ID' })
  @ApiResponse({ status: 200, type: FavoriteStatusDto })
  async checkMachineStatus(
    @CurrentUser() user: User,
    @Param('machineId', ParseUUIDPipe) machineId: string,
  ): Promise<FavoriteStatusDto> {
    return this.favoritesService.isFavorite(user.id, FavoriteType.MACHINE, machineId);
  }

  @Post('products/status/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check multiple products favorite status',
    description: 'Проверить статус нескольких продуктов',
  })
  async checkProductsStatusBulk(
    @CurrentUser() user: User,
    @Body() body: { productIds: string[] },
  ): Promise<FavoriteStatusBulkDto> {
    return this.favoritesService.isFavoriteBulk(user.id, FavoriteType.PRODUCT, body.productIds);
  }

  @Post('machines/status/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check multiple machines favorite status',
    description: 'Проверить статус нескольких автоматов',
  })
  async checkMachinesStatusBulk(
    @CurrentUser() user: User,
    @Body() body: { machineIds: string[] },
  ): Promise<FavoriteStatusBulkDto> {
    return this.favoritesService.isFavoriteBulk(user.id, FavoriteType.MACHINE, body.machineIds);
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  @Post('bulk')
  @ApiOperation({
    summary: 'Add multiple favorites',
    description: 'Массовое добавление в избранное',
  })
  @ApiResponse({ status: 201, type: [AddFavoriteResultDto] })
  async addFavoritesBulk(
    @CurrentUser() user: User,
    @Body() dto: AddFavoritesBulkDto,
  ): Promise<AddFavoriteResultDto[]> {
    return this.favoritesService.addFavoritesBulk(user.id, dto);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove multiple favorites',
    description: 'Массовое удаление из избранного',
  })
  async removeFavoritesBulk(
    @CurrentUser() user: User,
    @Body() dto: RemoveFavoritesBulkDto,
  ): Promise<{ removed: number }> {
    const removed = await this.favoritesService.removeFavoritesBulk(user.id, dto);
    return { removed };
  }

  @Put('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reorder favorites',
    description: 'Изменить порядок избранного',
  })
  async reorderFavorites(
    @CurrentUser() user: User,
    @Body() dto: ReorderFavoritesDto,
  ): Promise<void> {
    return this.favoritesService.reorderFavorites(user.id, dto);
  }
}
