/**
 * Product DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Эспрессо' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Espresso' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameUz?: string;

  @ApiProperty({ example: 'COFFEE-ESP-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @ApiPropertyOptional({ example: '4607001234001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional({ example: 'Классический эспрессо' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'coffee' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 'hot' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional({ example: 'VendHub Coffee' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional({ example: 'cup', default: 'pcs' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string = 'pcs';

  @ApiProperty({ example: 8000 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number = 12;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ikpuCode?: string;

  @ApiPropertyOptional({ example: '87654321' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  packageCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({ example: 180 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shelfLifeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  storageConditions?: Record<string, string | number | boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  nutritionalInfo?: Record<string, string | number | boolean>;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameUz?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ikpuCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  packageCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  shelfLifeDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  storageConditions?: Record<string, string | number | boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  nutritionalInfo?: Record<string, string | number | boolean>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class QueryProductsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 50;
}

export class BulkUpdatePriceDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(1000)
  percentageChange?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  fixedChange?: number;
}
