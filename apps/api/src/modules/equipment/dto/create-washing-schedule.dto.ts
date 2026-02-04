/**
 * Washing Schedule DTOs
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  IsBoolean,
  IsDate,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ============================================================================
// WASHING SCHEDULE DTOs
// ============================================================================

export class CreateWashingScheduleDto {
  @ApiProperty({ description: 'Machine ID' })
  @IsUUID()
  machineId: string;

  @ApiPropertyOptional({ description: 'Specific component ID' })
  @IsUUID()
  @IsOptional()
  componentId?: string;

  @ApiProperty({ description: 'Frequency in days between washes' })
  @IsInt()
  @Min(1)
  frequencyDays: number;

  @ApiPropertyOptional({ description: 'Last wash date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  lastWashDate?: Date;

  @ApiProperty({ description: 'Next scheduled wash date' })
  @IsDate()
  @Type(() => Date)
  nextWashDate: Date;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsUUID()
  @IsOptional()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateWashingScheduleDto extends PartialType(CreateWashingScheduleDto) {}

export class WashingScheduleQueryDto {
  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Only active' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ description: 'Due within days' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  dueWithinDays?: number;

  @ApiPropertyOptional({ description: 'Only overdue (nextWashDate < today)' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  overdueOnly?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
