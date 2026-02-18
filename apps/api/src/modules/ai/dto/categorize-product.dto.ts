/**
 * Categorize Product DTOs
 * Used for AI-powered product category suggestions (single and batch)
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CategorizeProductDto {
  @ApiProperty({
    description: "Product name to categorize",
    example: "Сникерс 50г",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: "Product barcode for improved categorization accuracy",
    example: "4607001234001",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;
}

export class BatchCategorizeItemDto {
  @ApiProperty({
    description: "UUID of the product to categorize",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "Product name to categorize",
    example: "Coca-Cola 0.5л",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: "Product barcode for improved accuracy",
    example: "4607001234001",
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;
}

export class BatchCategorizeDto {
  @ApiProperty({
    description: "Array of products to categorize in batch",
    type: [BatchCategorizeItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchCategorizeItemDto)
  products: BatchCategorizeItemDto[];
}
