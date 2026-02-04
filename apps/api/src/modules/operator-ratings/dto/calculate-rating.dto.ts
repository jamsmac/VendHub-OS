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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculateRatingDto {
  @ApiPropertyOptional({ description: 'Organization ID (auto-filled from token)' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty({ description: 'Operator user ID' })
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ description: 'Period start date (ISO date)', example: '2025-01-01' })
  @IsDateString()
  @IsNotEmpty()
  period_start: string;

  @ApiProperty({ description: 'Period end date (ISO date)', example: '2025-01-31' })
  @IsDateString()
  @IsNotEmpty()
  period_end: string;

  // ===== Task Completion =====

  @ApiPropertyOptional({ description: 'Total tasks assigned', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasks_assigned?: number;

  @ApiPropertyOptional({ description: 'Total tasks completed', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasks_completed?: number;

  @ApiPropertyOptional({ description: 'Tasks completed on time', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasks_on_time?: number;

  @ApiPropertyOptional({ description: 'Tasks completed late', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasks_late?: number;

  @ApiPropertyOptional({ description: 'Average completion time in hours', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avg_completion_time_hours?: number;

  // ===== Photo compliance =====

  @ApiPropertyOptional({ description: 'Tasks with before-photos', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasks_with_photos_before?: number;

  @ApiPropertyOptional({ description: 'Tasks with after-photos', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  tasks_with_photos_after?: number;

  @ApiPropertyOptional({ description: 'Total photos uploaded', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  total_photos_uploaded?: number;

  @ApiPropertyOptional({ description: 'Photo quality score (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  photo_quality_score?: number;

  // ===== Quality =====

  @ApiPropertyOptional({ description: 'Machine cleanliness score (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  machine_cleanliness_score?: number;

  @ApiPropertyOptional({ description: 'Stock accuracy score (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  stock_accuracy_score?: number;

  // ===== Financial / Collection accuracy =====

  @ApiPropertyOptional({ description: 'Cash collection accuracy (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cash_collection_accuracy?: number;

  @ApiPropertyOptional({ description: 'Inventory loss rate (0-100, lower is better)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  inventory_loss_rate?: number;

  @ApiPropertyOptional({ description: 'Collections with cash variance', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  collections_with_variance?: number;

  @ApiPropertyOptional({ description: 'Average collection variance percent', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  avg_collection_variance_percent?: number;

  @ApiPropertyOptional({ description: 'Inventory discrepancies found', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  inventory_discrepancies?: number;

  // ===== Attendance =====

  @ApiPropertyOptional({ description: 'Total scheduled shifts', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  scheduled_shifts?: number;

  @ApiPropertyOptional({ description: 'Completed shifts', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  completed_shifts?: number;

  @ApiPropertyOptional({ description: 'Number of late arrivals', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  late_arrivals?: number;

  // ===== Customer =====

  @ApiPropertyOptional({ description: 'Number of complaints received', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  complaints_received?: number;

  @ApiPropertyOptional({ description: 'Number of complaints resolved', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  complaints_resolved?: number;

  @ApiPropertyOptional({ description: 'Average response time in minutes', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  average_response_time?: number;

  // ===== Customer (extra) =====

  @ApiPropertyOptional({ description: 'Average customer rating (1-5)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  avg_customer_rating?: number;

  @ApiPropertyOptional({ description: 'Positive feedback count', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  positive_feedback_count?: number;

  // ===== Discipline =====

  @ApiPropertyOptional({ description: 'Checklist items completed', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  checklist_items_completed?: number;

  @ApiPropertyOptional({ description: 'Total checklist items', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  checklist_items_total?: number;

  @ApiPropertyOptional({ description: 'Comments/reports sent', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  comments_sent?: number;

  // ===== Notes =====

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
