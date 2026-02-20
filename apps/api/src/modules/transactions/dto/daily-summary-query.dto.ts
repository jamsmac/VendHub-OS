/**
 * Daily Summary & Commission Query DTOs for VendHub OS
 * Used for reporting and commission management endpoints
 */

import {
  IsUUID,
  IsOptional,
  IsDate,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionStatus } from '../entities/transaction.entity';

// ============================================================================
// QUERY DAILY SUMMARIES DTO
// ============================================================================

export class QueryDailySummariesDto {
  @ApiPropertyOptional({ description: 'Filter by machine UUID' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

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

// ============================================================================
// REBUILD DAILY SUMMARY DTO
// ============================================================================

export class RebuildDailySummaryDto {
  @ApiProperty({ description: 'Date to rebuild summary for', example: '2026-02-03' })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiPropertyOptional({ description: 'Machine UUID (null = organization total)' })
  @IsOptional()
  @IsUUID()
  machineId?: string;
}

// ============================================================================
// QUERY COMMISSIONS DTO
// ============================================================================

export class QueryCommissionsDto {
  @ApiPropertyOptional({ description: 'Filter by contract UUID' })
  @IsOptional()
  @IsUUID()
  contractId?: string;

  @ApiPropertyOptional({ description: 'Filter by commission status', enum: CommissionStatus })
  @IsOptional()
  @IsEnum(CommissionStatus)
  status?: CommissionStatus;

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
