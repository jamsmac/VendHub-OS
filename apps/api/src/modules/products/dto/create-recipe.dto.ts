import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  MaxLength,
  Min,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RecipeType, UnitOfMeasure } from '../entities/product.entity';

export class RecipeIngredientDto {
  @ApiProperty({ description: 'UUID of the ingredient product' })
  @IsUUID()
  ingredientId: string;

  @ApiProperty({ example: 18, description: 'Quantity of ingredient required' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ enum: UnitOfMeasure, description: 'Unit of measure for this ingredient' })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  unitOfMeasure?: UnitOfMeasure;

  @ApiPropertyOptional({ description: 'Sort order within recipe' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Whether this ingredient is optional' })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'Эспрессо классический', description: 'Recipe name in Russian' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Recipe name in Uzbek' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameUz?: string;

  @ApiPropertyOptional({ enum: RecipeType, description: 'Recipe type code' })
  @IsOptional()
  @IsEnum(RecipeType)
  typeCode?: RecipeType;

  @ApiPropertyOptional({ description: 'Recipe description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Preparation time in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  preparationTimeSeconds?: number;

  @ApiPropertyOptional({ description: 'Temperature in Celsius' })
  @IsOptional()
  @IsNumber()
  temperatureCelsius?: number;

  @ApiPropertyOptional({ description: 'Serving size in milliliters' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  servingSizeMl?: number;

  @ApiPropertyOptional({ description: 'Machine-specific settings for preparation' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ type: [RecipeIngredientDto], description: 'List of ingredients for the recipe' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients?: RecipeIngredientDto[];
}

export class UpdateRecipeDto {
  @ApiPropertyOptional({ description: 'Recipe name in Russian' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Recipe name in Uzbek' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameUz?: string;

  @ApiPropertyOptional({ description: 'Recipe description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the recipe is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Preparation time in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  preparationTimeSeconds?: number;

  @ApiPropertyOptional({ description: 'Temperature in Celsius' })
  @IsOptional()
  @IsNumber()
  temperatureCelsius?: number;

  @ApiPropertyOptional({ description: 'Serving size in milliliters' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  servingSizeMl?: number;

  @ApiPropertyOptional({ description: 'Machine-specific settings for preparation' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class UpdatePriceDto {
  @ApiPropertyOptional({ description: 'New purchase price in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'New selling price in UZS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @ApiProperty({ description: 'Reason for the price change' })
  @IsString()
  @IsNotEmpty()
  changeReason: string;
}
