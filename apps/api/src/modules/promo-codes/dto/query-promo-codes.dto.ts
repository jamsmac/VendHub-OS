/**
 * Query Promo Codes DTO
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromoCodeStatus, PromoCodeType } from '../entities/promo-code.entity';

export class QueryPromoCodesDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by status', enum: PromoCodeStatus })
  @IsOptional()
  @IsEnum(PromoCodeStatus)
  status?: PromoCodeStatus;

  @ApiPropertyOptional({ description: 'Filter by type', enum: PromoCodeType })
  @IsOptional()
  @IsEnum(PromoCodeType)
  type?: PromoCodeType;

  @ApiPropertyOptional({ description: 'Search by code or name', example: 'SUMMER' })
  @IsOptional()
  @IsString()
  search?: string;
}
