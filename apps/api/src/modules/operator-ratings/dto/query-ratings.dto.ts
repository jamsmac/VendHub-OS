/**
 * Query Ratings DTO
 */

import {
  IsOptional,
  IsUUID,
  IsString,
  IsNumber,
  IsDateString,
  Min,
  Max,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum RatingSortBy {
  TOTAL_SCORE = 'total_score',
  TASK_SCORE = 'task_score',
  QUALITY_SCORE = 'quality_score',
  FINANCIAL_SCORE = 'financial_score',
  ATTENDANCE_SCORE = 'attendance_score',
  CUSTOMER_SCORE = 'customer_score',
  PHOTO_COMPLIANCE_RATE = 'photo_compliance_rate',
  DISCIPLINE_SCORE = 'discipline_score',
  TIMELINESS_SCORE = 'timeliness_score',
  PERIOD_START = 'period_start',
  CREATED_AT = 'created_at',
}

export class QueryRatingsDto {
  @ApiPropertyOptional({ description: 'Organization ID' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({ description: 'Filter by operator user ID' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Filter by period start (ISO date)' })
  @IsOptional()
  @IsDateString()
  period_start?: string;

  @ApiPropertyOptional({ description: 'Filter by period end (ISO date)' })
  @IsOptional()
  @IsDateString()
  period_end?: string;

  @ApiPropertyOptional({ description: 'Filter by grade (A+, A, B+, B, C+, C, D, F)' })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ description: 'Minimum total score filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  min_score?: number;

  @ApiPropertyOptional({ description: 'Maximum total score filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  max_score?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: RatingSortBy,
    default: RatingSortBy.TOTAL_SCORE,
  })
  @IsOptional()
  @IsEnum(RatingSortBy)
  sort_by?: RatingSortBy;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
