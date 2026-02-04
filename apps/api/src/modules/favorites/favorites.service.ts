/**
 * Favorites Service
 * Бизнес-логика системы избранного VendHub
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Favorite, FavoriteType } from './entities/favorite.entity';
import { Product } from '../products/entities/product.entity';
import { Machine } from '../machines/entities/machine.entity';
import {
  AddFavoriteDto,
  UpdateFavoriteDto,
  AddFavoritesBulkDto,
  RemoveFavoritesBulkDto,
  ReorderFavoritesDto,
  FavoriteFilterDto,
  FavoriteItemDto,
  FavoriteProductDto,
  FavoriteMachineDto,
  FavoritesListDto,
  AddFavoriteResultDto,
  FavoriteStatusDto,
  FavoriteStatusBulkDto,
} from './dto/favorite.dto';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
  ) {}

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Добавить в избранное
   */
  async addFavorite(userId: string, dto: AddFavoriteDto): Promise<AddFavoriteResultDto> {
    // Validate based on type
    if (dto.type === FavoriteType.PRODUCT) {
      if (!dto.productId) {
        throw new BadRequestException('productId is required for product favorites');
      }
      const product = await this.productRepo.findOne({ where: { id: dto.productId } });
      if (!product) {
        throw new NotFoundException('Product not found');
      }
    } else if (dto.type === FavoriteType.MACHINE) {
      if (!dto.machineId) {
        throw new BadRequestException('machineId is required for machine favorites');
      }
      const machine = await this.machineRepo.findOne({ where: { id: dto.machineId } });
      if (!machine) {
        throw new NotFoundException('Machine not found');
      }
    }

    // Check if already exists
    const existing = await this.favoriteRepo.findOne({
      where: {
        userId,
        type: dto.type,
        productId: dto.productId || null as any,
        machineId: dto.machineId || null as any,
      },
    });

    if (existing) {
      return {
        success: true,
        id: existing.id,
        message: 'Already in favorites',
        alreadyExists: true,
      };
    }

    // Get next sort order
    const maxSort = await this.favoriteRepo
      .createQueryBuilder('f')
      .select('MAX(f.sortOrder)', 'max')
      .where('f.userId = :userId', { userId })
      .andWhere('f.type = :type', { type: dto.type })
      .getRawOne();

    const favorite = this.favoriteRepo.create({
      userId,
      type: dto.type,
      productId: dto.type === FavoriteType.PRODUCT ? dto.productId : undefined,
      machineId: dto.type === FavoriteType.MACHINE ? dto.machineId : undefined,
      notes: dto.notes,
      sortOrder: (maxSort?.max || 0) + 1,
    } as any);

    const saved = await this.favoriteRepo.save(favorite);

    this.logger.log(`User ${userId} added ${dto.type} to favorites`);

    return {
      success: true,
      id: Array.isArray(saved) ? (saved as any)[0].id : (saved as any).id,
      message: 'Added to favorites',
      alreadyExists: false,
    };
  }

  /**
   * Удалить из избранного
   */
  async removeFavorite(userId: string, favoriteId: string): Promise<void> {
    const result = await this.favoriteRepo.delete({ id: favoriteId, userId });

    if (result.affected === 0) {
      throw new NotFoundException('Favorite not found');
    }

    this.logger.log(`User ${userId} removed favorite ${favoriteId}`);
  }

  /**
   * Удалить по типу и ID элемента
   */
  async removeFavoriteByItem(
    userId: string,
    type: FavoriteType,
    itemId: string,
  ): Promise<void> {
    const where = {
      userId,
      type,
      ...(type === FavoriteType.PRODUCT ? { productId: itemId } : { machineId: itemId }),
    };

    const result = await this.favoriteRepo.delete(where);

    if (result.affected === 0) {
      throw new NotFoundException('Favorite not found');
    }
  }

  /**
   * Обновить избранное
   */
  async updateFavorite(
    userId: string,
    favoriteId: string,
    dto: UpdateFavoriteDto,
  ): Promise<FavoriteItemDto> {
    const favorite = await this.favoriteRepo.findOne({
      where: { id: favoriteId, userId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    Object.assign(favorite, dto);
    await this.favoriteRepo.save(favorite);

    return this.mapToItemDto(favorite);
  }

  /**
   * Переключить избранное (toggle)
   */
  async toggleFavorite(
    userId: string,
    type: FavoriteType,
    itemId: string,
  ): Promise<{ isFavorite: boolean; favoriteId: string | null }> {
    const where = {
      userId,
      type,
      ...(type === FavoriteType.PRODUCT ? { productId: itemId } : { machineId: itemId }),
    };

    const existing = await this.favoriteRepo.findOne({ where });

    if (existing) {
      await this.favoriteRepo.delete(existing.id);
      return { isFavorite: false, favoriteId: null };
    }

    const dto: AddFavoriteDto = {
      type,
      ...(type === FavoriteType.PRODUCT ? { productId: itemId } : { machineId: itemId }),
    };

    const result = await this.addFavorite(userId, dto);
    return { isFavorite: true, favoriteId: result.id };
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Массовое добавление
   */
  async addFavoritesBulk(
    userId: string,
    dto: AddFavoritesBulkDto,
  ): Promise<AddFavoriteResultDto[]> {
    const results: AddFavoriteResultDto[] = [];

    for (const item of dto.items) {
      try {
        const result = await this.addFavorite(userId, item);
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false,
          id: '',
          message: error.message,
          alreadyExists: false,
        });
      }
    }

    return results;
  }

  /**
   * Массовое удаление
   */
  async removeFavoritesBulk(userId: string, dto: RemoveFavoritesBulkDto): Promise<number> {
    const result = await this.favoriteRepo.delete({
      id: In(dto.ids),
      userId,
    });

    return result.affected || 0;
  }

  /**
   * Изменить порядок
   */
  async reorderFavorites(userId: string, dto: ReorderFavoritesDto): Promise<void> {
    for (let i = 0; i < dto.orderedIds.length; i++) {
      await this.favoriteRepo.update(
        { id: dto.orderedIds[i], userId },
        { sortOrder: i },
      );
    }
  }

  // ============================================================================
  // QUERY OPERATIONS
  // ============================================================================

  /**
   * Получить все избранное пользователя
   */
  async getFavorites(userId: string, filter: FavoriteFilterDto): Promise<FavoritesListDto> {
    const { type, page = 1, limit = 50 } = filter;

    const qb = this.favoriteRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.product', 'p')
      .leftJoinAndSelect('p.category', 'pc')
      .leftJoinAndSelect('f.machine', 'm')
      .where('f.userId = :userId', { userId })
      .orderBy('f.sortOrder', 'ASC')
      .addOrderBy('f.createdAt', 'DESC');

    if (type) {
      qb.andWhere('f.type = :type', { type });
    }

    const favorites = await qb.skip((page - 1) * limit).take(limit).getMany();

    const products: FavoriteProductDto[] = [];
    const machines: FavoriteMachineDto[] = [];

    for (const fav of favorites) {
      if (fav.type === FavoriteType.PRODUCT && fav.product) {
        products.push({
          id: fav.id,
          type: fav.type,
          productId: fav.productId,
          machineId: '',
          notes: fav.notes,
          sortOrder: fav.sortOrder,
          createdAt: fav.created_at,
          product: {
            id: fav.product.id,
            name: fav.product.name,
            nameUz: fav.product.nameUz,
            price: fav.product.sellingPrice,
            imageUrl: fav.product.imageUrl,
            categoryName: (fav.product.category as any)?.name || '',
            isAvailable: fav.product.isActive,
          },
        });
      } else if (fav.type === FavoriteType.MACHINE && fav.machine) {
        machines.push({
          id: fav.id,
          type: fav.type,
          productId: '',
          machineId: fav.machineId,
          notes: fav.notes,
          sortOrder: fav.sortOrder,
          createdAt: fav.created_at,
          machine: {
            id: fav.machine.id,
            name: fav.machine.name,
            code: fav.machine.serialNumber,
            address: fav.machine.address,
            latitude: fav.machine.latitude,
            longitude: fav.machine.longitude,
            isOnline: fav.machine.isOnline,
            productsCount: 0,
          },
        });
      }
    }

    const [totalProducts, totalMachines] = await Promise.all([
      this.favoriteRepo.count({ where: { userId, type: FavoriteType.PRODUCT } }),
      this.favoriteRepo.count({ where: { userId, type: FavoriteType.MACHINE } }),
    ]);

    return {
      products,
      machines,
      totalProducts,
      totalMachines,
    };
  }

  /**
   * Получить избранные продукты
   */
  async getFavoriteProducts(userId: string, page = 1, limit = 50): Promise<FavoriteProductDto[]> {
    const result = await this.getFavorites(userId, {
      type: FavoriteType.PRODUCT,
      page,
      limit,
    });
    return result.products;
  }

  /**
   * Получить избранные автоматы
   */
  async getFavoriteMachines(userId: string, page = 1, limit = 50): Promise<FavoriteMachineDto[]> {
    const result = await this.getFavorites(userId, {
      type: FavoriteType.MACHINE,
      page,
      limit,
    });
    return result.machines;
  }

  /**
   * Проверить, в избранном ли элемент
   */
  async isFavorite(
    userId: string,
    type: FavoriteType,
    itemId: string,
  ): Promise<FavoriteStatusDto> {
    const where = {
      userId,
      type,
      ...(type === FavoriteType.PRODUCT ? { productId: itemId } : { machineId: itemId }),
    };

    const favorite = await this.favoriteRepo.findOne({ where });

    return {
      isFavorite: !!favorite,
      favoriteId: favorite?.id || '',
    };
  }

  /**
   * Проверить несколько элементов
   */
  async isFavoriteBulk(
    userId: string,
    type: FavoriteType,
    itemIds: string[],
  ): Promise<FavoriteStatusBulkDto> {
    const where = {
      userId,
      type,
      ...(type === FavoriteType.PRODUCT
        ? { productId: In(itemIds) }
        : { machineId: In(itemIds) }),
    };

    const favorites = await this.favoriteRepo.find({ where });

    const items: Record<string, boolean> = {};
    for (const id of itemIds) {
      const fav = favorites.find(f =>
        type === FavoriteType.PRODUCT ? f.productId === id : f.machineId === id
      );
      items[id] = !!fav;
    }

    return { items };
  }

  /**
   * Получить количество избранного
   */
  async getFavoritesCount(userId: string): Promise<{ products: number; machines: number }> {
    const [products, machines] = await Promise.all([
      this.favoriteRepo.count({ where: { userId, type: FavoriteType.PRODUCT } }),
      this.favoriteRepo.count({ where: { userId, type: FavoriteType.MACHINE } }),
    ]);

    return { products, machines };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private mapToItemDto(favorite: Favorite): FavoriteItemDto {
    return {
      id: favorite.id,
      type: favorite.type,
      productId: favorite.productId,
      machineId: favorite.machineId,
      notes: favorite.notes,
      sortOrder: favorite.sortOrder,
      createdAt: favorite.created_at,
    };
  }
}
