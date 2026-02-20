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
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export enum RatingSortBy {
  TOTAL_SCORE = "totalScore",
  TASK_SCORE = "taskScore",
  QUALITY_SCORE = "qualityScore",
  FINANCIAL_SCORE = "financialScore",
  ATTENDANCE_SCORE = "attendanceScore",
  CUSTOMER_SCORE = "customerScore",
  PHOTO_COMPLIANCE_RATE = "photoComplianceRate",
  DISCIPLINE_SCORE = "disciplineScore",
  TIMELINESS_SCORE = "timelinessScore",
  PERIOD_START = "periodStart",
  CREATED_AT = "createdAt",
}

export class QueryRatingsDto {
  @ApiPropertyOptional({ description: "Organization ID" })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: "Filter by operator user ID" })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: "Filter by period start (ISO date)" })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: "Filter by period end (ISO date)" })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({
    description: "Filter by grade (A+, A, B+, B, C+, C, D, F)",
  })
  @IsOptional()
  @IsString()
  grade?: string;

  @ApiPropertyOptional({ description: "Minimum total score filter" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiPropertyOptional({ description: "Maximum total score filter" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({
    description: "Sort field",
    enum: RatingSortBy,
    default: RatingSortBy.TOTAL_SCORE,
  })
  @IsOptional()
  @IsEnum(RatingSortBy)
  sortBy?: RatingSortBy;

  @ApiPropertyOptional({
    description: "Sort order",
    enum: ["ASC", "DESC"],
    default: "DESC",
  })
  @IsOptional()
  @IsIn(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC";

  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "Items per page", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
