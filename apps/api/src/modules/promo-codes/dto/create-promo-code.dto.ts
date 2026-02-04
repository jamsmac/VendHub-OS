/**
 * Create / Update Promo Code DTOs
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsInt,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PromoCodeType } from '../entities/promo-code.entity';

export class CreatePromoCodeDto {
  @ApiProperty({ description: 'Unique promo code (3-50 chars, will be uppercased)', example: 'SUMMER2024' })
  @IsString()
  @Length(3, 50)
  code: string;

  @ApiProperty({ description: 'Display name', example: 'Summer Sale 2024' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Description of the promo code' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Type of discount', enum: PromoCodeType })
  @IsEnum(PromoCodeType)
  type: PromoCodeType;

  @ApiProperty({ description: 'Discount value (percentage 0-100, fixed amount in UZS, or loyalty points)', example: 15 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'Maximum total uses (null = unlimited)', example: 1000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxTotalUses?: number;

  @ApiPropertyOptional({ description: 'Maximum uses per user', default: 1, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxUsesPerUser?: number;

  @ApiProperty({ description: 'Start date (ISO 8601)', example: '2024-06-01T00:00:00Z' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ description: 'End date (ISO 8601)', example: '2024-08-31T23:59:59Z' })
  @IsDateString()
  validUntil: string;

  @ApiPropertyOptional({ description: 'Minimum order amount in UZS', example: 50000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum discount cap for percentage discounts', example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ description: 'Applicable machine UUIDs (null = all)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicableMachineIds?: string[];

  @ApiPropertyOptional({ description: 'Applicable product UUIDs (null = all)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicableProductIds?: string[];
}

export class UpdatePromoCodeDto extends PartialType(CreatePromoCodeDto) {}
