/**
 * Spare Part DTOs
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EquipmentComponentType } from '../entities/equipment-component.entity';

// ============================================================================
// SPARE PART DTOs
// ============================================================================

export class CreateSparePartDto {
  @ApiProperty({ description: 'Part number / SKU' })
  @IsString()
  @MaxLength(100)
  partNumber: string;

  @ApiProperty({ description: 'Part name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Compatible component types', default: [] })
  @IsArray()
  @IsEnum(EquipmentComponentType, { each: true })
  @IsOptional()
  compatibleComponentTypes?: EquipmentComponentType[];

  @ApiPropertyOptional({ description: 'Current quantity', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Minimum quantity for reorder', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  minQuantity?: number;

  @ApiPropertyOptional({ description: 'Cost price' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Storage location' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  storageLocation?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateSparePartDto extends PartialType(CreateSparePartDto) {}

export class SparePartQueryDto {
  @ApiPropertyOptional({ description: 'Search by name or part number' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: EquipmentComponentType, description: 'Filter by compatible component type' })
  @IsEnum(EquipmentComponentType)
  @IsOptional()
  compatibleWith?: EquipmentComponentType;

  @ApiPropertyOptional({ description: 'Only active' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ description: 'Only low stock (quantity <= minQuantity)' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  lowStockOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter by supplier ID' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'name';

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
