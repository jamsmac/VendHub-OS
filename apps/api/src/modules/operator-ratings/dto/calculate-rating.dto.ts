/**
 * Calculate Rating DTO
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  IsObject,
  MaxLength,
  Min,
  Max,
  IsInt,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CalculateRatingDto {
  @ApiPropertyOptional({
    description: "Organization ID (auto-filled from token)",
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiProperty({ description: "Operator user ID" })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: "Period start date (ISO date)",
    example: "2025-01-01",
  })
  @IsDateString()
  @IsNotEmpty()
  periodStart: string;

  @ApiProperty({
    description: "Period end date (ISO date)",
    example: "2025-01-31",
  })
  @IsDateString()
  @IsNotEmpty()
  periodEnd: string;

  // ===== Task Completion =====

  @ApiPropertyOptional({ description: "Total tasks assigned", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasksAssigned?: number;

  @ApiPropertyOptional({ description: "Total tasks completed", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasksCompleted?: number;

  @ApiPropertyOptional({ description: "Tasks completed on time", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasksOnTime?: number;

  @ApiPropertyOptional({ description: "Tasks completed late", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasksLate?: number;

  @ApiPropertyOptional({
    description: "Average completion time in hours",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avgCompletionTimeHours?: number;

  // ===== Photo compliance =====

  @ApiPropertyOptional({ description: "Tasks with before-photos", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasksWithPhotosBefore?: number;

  @ApiPropertyOptional({ description: "Tasks with after-photos", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasksWithPhotosAfter?: number;

  @ApiPropertyOptional({ description: "Total photos uploaded", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalPhotosUploaded?: number;

  @ApiPropertyOptional({
    description: "Photo quality score (0-100)",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  photoQualityScore?: number;

  // ===== Quality =====

  @ApiPropertyOptional({
    description: "Machine cleanliness score (0-100)",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  machineCleanlinessScore?: number;

  @ApiPropertyOptional({
    description: "Stock accuracy score (0-100)",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  stockAccuracyScore?: number;

  // ===== Financial / Collection accuracy =====

  @ApiPropertyOptional({
    description: "Cash collection accuracy (0-100)",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cashCollectionAccuracy?: number;

  @ApiPropertyOptional({
    description: "Inventory loss rate (0-100, lower is better)",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  inventoryLossRate?: number;

  @ApiPropertyOptional({
    description: "Collections with cash variance",
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  collectionsWithVariance?: number;

  @ApiPropertyOptional({
    description: "Average collection variance percent",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avgCollectionVariancePercent?: number;

  @ApiPropertyOptional({
    description: "Inventory discrepancies found",
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  inventoryDiscrepancies?: number;

  // ===== Attendance =====

  @ApiPropertyOptional({ description: "Total scheduled shifts", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  scheduledShifts?: number;

  @ApiPropertyOptional({ description: "Completed shifts", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  completedShifts?: number;

  @ApiPropertyOptional({ description: "Number of late arrivals", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lateArrivals?: number;

  // ===== Customer =====

  @ApiPropertyOptional({
    description: "Number of complaints received",
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  complaintsReceived?: number;

  @ApiPropertyOptional({
    description: "Number of complaints resolved",
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  complaintsResolved?: number;

  @ApiPropertyOptional({
    description: "Average response time in minutes",
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  averageResponseTime?: number;

  // ===== Customer (extra) =====

  @ApiPropertyOptional({
    description: "Average customer rating (1-5)",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  avgCustomerRating?: number;

  @ApiPropertyOptional({ description: "Positive feedback count", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  positiveFeedbackCount?: number;

  // ===== Discipline =====

  @ApiPropertyOptional({ description: "Checklist items completed", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  checklistItemsCompleted?: number;

  @ApiPropertyOptional({ description: "Total checklist items", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  checklistItemsTotal?: number;

  @ApiPropertyOptional({ description: "Comments/reports sent", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  commentsSent?: number;

  // ===== Notes =====

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
