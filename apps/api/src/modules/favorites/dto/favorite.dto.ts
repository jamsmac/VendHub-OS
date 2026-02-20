/**
 * Favorite DTOs
 * Data Transfer Objects для системы избранного
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { FavoriteType } from '../entities/favorite.entity';

// ============================================================================
// REQUEST DTOs
// ============================================================================

/**
 * Добавить в избранное
 */
export class AddFavoriteDto {
  @ApiProperty({
    description: 'Type of favorite',
    enum: FavoriteType,
  })
  @IsEnum(FavoriteType)
  type: FavoriteType;

  @ApiPropertyOptional({ description: 'Product ID (required if type=product)' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Machine ID (required if type=machine)' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'User notes' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}

/**
 * Обновить избранное
 */
export class UpdateFavoriteDto {
  @ApiPropertyOptional({ description: 'User notes' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

/**
 * Массовое добавление
 */
export class AddFavoritesBulkDto {
  @ApiProperty({ type: [AddFavoriteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddFavoriteDto)
  items: AddFavoriteDto[];
}

/**
 * Массовое удаление
 */
export class RemoveFavoritesBulkDto {
  @ApiProperty({ description: 'Favorite IDs to remove' })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}

/**
 * Изменить порядок
 */
export class ReorderFavoritesDto {
  @ApiProperty({ description: 'Ordered list of favorite IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  orderedIds: string[];
}

/**
 * Фильтр избранного
 */
export class FavoriteFilterDto {
  @ApiPropertyOptional({ enum: FavoriteType })
  @IsEnum(FavoriteType)
  @IsOptional()
  type?: FavoriteType;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 50)
  limit?: number;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Базовая информация об избранном
 */
export class FavoriteItemDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: FavoriteType }) type: FavoriteType;
  @ApiProperty() productId: string;
  @ApiProperty() machineId: string;
  @ApiProperty() notes: string;
  @ApiProperty() sortOrder: number;
  @ApiProperty() createdAt: Date;
}

/**
 * Избранный продукт
 */
export class FavoriteProductDto extends FavoriteItemDto {
  @ApiProperty()
  product: {
    id: string;
    name: string;
    nameUz: string;
    price: number;
    imageUrl: string;
    categoryName: string;
    isAvailable: boolean;
  };
}

/**
 * Избранный автомат
 */
export class FavoriteMachineDto extends FavoriteItemDto {
  @ApiProperty()
  machine: {
    id: string;
    name: string;
    code: string;
    address: string;
    latitude: number;
    longitude: number;
    isOnline: boolean;
    productsCount: number;
  };
}

/**
 * Объединенный список избранного
 */
export class FavoritesListDto {
  @ApiProperty({ type: [FavoriteProductDto] })
  products: FavoriteProductDto[];

  @ApiProperty({ type: [FavoriteMachineDto] })
  machines: FavoriteMachineDto[];

  @ApiProperty() totalProducts: number;
  @ApiProperty() totalMachines: number;
}

/**
 * Результат добавления
 */
export class AddFavoriteResultDto {
  @ApiProperty() success: boolean;
  @ApiProperty() id: string;
  @ApiProperty() message: string;
  @ApiProperty() alreadyExists: boolean;
}

/**
 * Статус избранного для элемента
 */
export class FavoriteStatusDto {
  @ApiProperty() isFavorite: boolean;
  @ApiProperty() favoriteId: string;
}

/**
 * Проверка нескольких элементов
 */
export class FavoriteStatusBulkDto {
  @ApiProperty({
    description: 'Map of itemId -> isFavorite',
    example: { 'uuid1': true, 'uuid2': false },
  })
  items: Record<string, boolean>;
}
