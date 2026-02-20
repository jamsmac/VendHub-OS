/**
 * Recommendation DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum RecommendationType {
  PERSONALIZED = 'personalized',
  MACHINE = 'machine',
  SIMILAR = 'similar',
  COMPLEMENTARY = 'complementary',
  TIME_BASED = 'time_based',
  NEW_ARRIVALS = 'new_arrivals',
  POPULAR = 'popular',
}

// ============================================================================
// REQUEST DTOs
// ============================================================================

export class GetRecommendationsDto {
  @ApiPropertyOptional({ enum: RecommendationType })
  @IsEnum(RecommendationType)
  @IsOptional()
  type?: RecommendationType;

  @ApiPropertyOptional({ description: 'Machine ID for context' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Product ID for similar/complementary' })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Category ID filter' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 10)
  limit?: number;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class RecommendedProductDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() nameUz: string;
  @ApiProperty() price: number;
  @ApiProperty() imageUrl: string;
  @ApiProperty() categoryId: string;
  @ApiProperty() categoryName: string;
  @ApiProperty() isAvailable: boolean;
  @ApiProperty() score: number;
  @ApiProperty() reason: string;
  @ApiProperty() reasonText: string;
}

export class RecommendationsResponseDto {
  @ApiProperty({ type: [RecommendedProductDto] })
  items: RecommendedProductDto[];

  @ApiProperty() total: number;
  @ApiProperty() type: RecommendationType;
}

export class MachineRecommendationsDto {
  @ApiProperty() machineId: string;
  @ApiProperty() machineName: string;
  @ApiProperty({ type: [RecommendedProductDto] }) recommendations: RecommendedProductDto[];
}
