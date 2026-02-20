/**
 * Hopper Type DTOs
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ============================================================================
// HOPPER TYPE DTOs
// ============================================================================

export class CreateHopperTypeDto {
  @ApiProperty({ description: 'Hopper type name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Volume in milliliters' })
  @IsInt()
  @Min(1)
  volumeMl: number;

  @ApiPropertyOptional({ description: 'Material' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  material?: string;

  @ApiPropertyOptional({ description: 'Compatible machine types', default: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  compatibleMachineTypes?: string[];

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateHopperTypeDto extends PartialType(CreateHopperTypeDto) {}

export class HopperTypeQueryDto {
  @ApiPropertyOptional({ description: 'Search by name' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Only active' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
