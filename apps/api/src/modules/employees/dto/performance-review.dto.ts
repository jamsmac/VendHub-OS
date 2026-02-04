/**
 * Performance Review DTOs
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsObject,
  IsInt,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewPeriod, ReviewStatus } from '../entities/performance-review.entity';

// ============================================================================
// CREATE & ACTION DTOs
// ============================================================================

export class CreateReviewDto {
  @ApiProperty({ description: 'Employee ID' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Reviewer ID (employee or user)' })
  @IsUUID()
  reviewerId: string;

  @ApiProperty({ description: 'Review period type', enum: ReviewPeriod })
  @IsEnum(ReviewPeriod)
  reviewPeriod: ReviewPeriod;

  @ApiProperty({ description: 'Period start date (ISO format)' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Period end date (ISO format)' })
  @IsDateString()
  periodEnd: string;
}

export class SubmitReviewDto {
  @ApiProperty({ description: 'Overall rating (1-5)', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating: number;

  @ApiProperty({ description: 'Category ratings object {quality, productivity, teamwork, etc.}' })
  @IsObject()
  ratings: Record<string, any>;

  @ApiPropertyOptional({ description: 'Strengths of the employee' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  strengths?: string;

  @ApiPropertyOptional({ description: 'Areas for improvement' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  areasForImprovement?: string;

  @ApiPropertyOptional({ description: 'Goals for next period' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  goals?: string;

  @ApiPropertyOptional({ description: 'Reviewer comments' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reviewerComments?: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class QueryReviewsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ReviewStatus })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiPropertyOptional({ description: 'Filter by review period', enum: ReviewPeriod })
  @IsOptional()
  @IsEnum(ReviewPeriod)
  reviewPeriod?: ReviewPeriod;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class PerformanceReviewDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  reviewerId: string;

  @ApiProperty({ enum: ReviewPeriod })
  reviewPeriod: ReviewPeriod;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  periodEnd: Date;

  @ApiProperty({ enum: ReviewStatus })
  status: ReviewStatus;

  @ApiPropertyOptional()
  overallRating?: number | null;

  @ApiPropertyOptional()
  ratings?: Record<string, any> | null;

  @ApiPropertyOptional()
  strengths?: string | null;

  @ApiPropertyOptional()
  areasForImprovement?: string | null;

  @ApiPropertyOptional()
  goals?: string | null;

  @ApiPropertyOptional()
  employeeComments?: string | null;

  @ApiPropertyOptional()
  reviewerComments?: string | null;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PerformanceReviewListDto {
  @ApiProperty({ type: [PerformanceReviewDto] })
  items: PerformanceReviewDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}
