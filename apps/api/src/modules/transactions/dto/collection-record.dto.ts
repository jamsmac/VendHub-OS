/**
 * Collection Record DTOs for VendHub OS
 * Cash collection from vending machines
 */

import {
  IsString,
  IsUUID,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDate,
  IsInt,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// CREATE COLLECTION RECORD DTO
// ============================================================================

export class CreateCollectionRecordDto {
  @ApiProperty({ description: 'Machine UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  machineId: string;

  @ApiPropertyOptional({ description: 'Related task UUID' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiProperty({ description: 'Collected cash amount in UZS', example: 500000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cashAmount: number;

  @ApiProperty({ description: 'Collected coin amount in UZS', example: 50000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  coinAmount: number;

  @ApiProperty({ description: 'Total collected amount in UZS', example: 550000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Expected cash amount from machine counter', example: 510000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedCashAmount?: number;

  @ApiPropertyOptional({ description: 'Expected coin amount from machine counter', example: 48000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedCoinAmount?: number;

  @ApiPropertyOptional({ description: 'Expected total amount from machine counter', example: 558000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedTotalAmount?: number;

  @ApiPropertyOptional({ description: 'Machine counter before collection', example: 1200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  counterBefore?: number;

  @ApiPropertyOptional({ description: 'Machine counter after collection', example: 1250 })
  @IsOptional()
  @IsInt()
  @Min(0)
  counterAfter?: number;

  @ApiPropertyOptional({ description: 'Number of sales since last collection', example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  salesCount?: number;

  @ApiPropertyOptional({ description: 'Photo URL of collection' })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Array of photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'GPS latitude', example: 41.2995 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS longitude', example: 69.2401 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 8 })
  longitude?: number;

  @ApiProperty({ description: 'Date/time when cash was collected', example: '2026-02-03T10:00:00Z' })
  @IsDate()
  @Type(() => Date)
  collectedAt: Date;
}

// ============================================================================
// VERIFY COLLECTION DTO
// ============================================================================

export class VerifyCollectionDto {
  @ApiPropertyOptional({ description: 'Verification notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================================
// QUERY COLLECTION RECORDS DTO
// ============================================================================

export class QueryCollectionRecordsDto {
  @ApiPropertyOptional({ description: 'Filter by machine UUID' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Filter by collector user UUID' })
  @IsOptional()
  @IsUUID()
  collectedByUserId?: string;

  @ApiPropertyOptional({ description: 'Filter from date', example: '2026-01-01' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateFrom?: Date;

  @ApiPropertyOptional({ description: 'Filter to date', example: '2026-01-31' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateTo?: Date;

  @ApiPropertyOptional({ description: 'Filter by verification status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
