/**
 * Analytics DTOs for VendHub OS
 * Validation and documentation for analytics endpoints
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SnapshotType } from '../entities/analytics-snapshot.entity';

// ============================================================================
// QUERY DTOs
// ============================================================================

/**
 * Query parameters for listing analytics snapshots
 */
export class QuerySnapshotsDto {
  @ApiPropertyOptional({
    description: 'Filter by snapshot type',
    enum: SnapshotType,
    example: SnapshotType.DAILY,
  })
  @IsOptional()
  @IsEnum(SnapshotType)
  snapshotType?: SnapshotType;

  @ApiPropertyOptional({
    description: 'Filter by machine ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({
    description: 'Filter by location ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by product ID',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (ISO 8601)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (ISO 8601)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Query parameters for daily stats
 */
export class QueryDailyStatsDto {
  @ApiProperty({
    description: 'Start date (ISO 8601)',
    example: '2025-01-01',
  })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({
    description: 'End date (ISO 8601)',
    example: '2025-01-31',
  })
  @IsDateString()
  dateTo: string;
}

// ============================================================================
// REBUILD DTOs
// ============================================================================

/**
 * Request body for rebuilding a snapshot
 */
export class RebuildSnapshotDto {
  @ApiProperty({
    description: 'Date to rebuild snapshot for (ISO 8601)',
    example: '2025-01-15',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Snapshot type to rebuild',
    enum: SnapshotType,
    example: SnapshotType.DAILY,
  })
  @IsEnum(SnapshotType)
  snapshotType: SnapshotType;

  @ApiPropertyOptional({
    description: 'Machine ID to rebuild snapshot for (omit for org-wide)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  machineId?: string;
}

/**
 * Request body for rebuilding daily stats
 */
export class RebuildDailyStatsDto {
  @ApiProperty({
    description: 'Date to rebuild daily stats for (ISO 8601)',
    example: '2025-01-15',
  })
  @IsDateString()
  date: string;
}

// ============================================================================
// RESPONSE DTOs (for Swagger documentation)
// ============================================================================

/**
 * Dashboard response structure
 */
export class DashboardResponseDto {
  @ApiProperty({ description: 'Today\'s statistics' })
  todayStats: Record<string, unknown> | null;

  @ApiProperty({ description: 'Yesterday\'s statistics for comparison' })
  yesterdayStats: Record<string, unknown> | null;

  @ApiProperty({ description: 'Daily stats for the last 7 days' })
  weekTrend: Record<string, unknown>[];

  @ApiProperty({ description: 'Daily stats for the last 30 days' })
  monthTrend: Record<string, unknown>[];
}

/**
 * Paginated snapshots response
 */
export class PaginatedSnapshotsResponseDto {
  @ApiProperty({ description: 'List of snapshots' })
  data: Record<string, unknown>[];

  @ApiProperty({ description: 'Total number of matching records' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
