import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
  IsArray,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripTaskType } from '../entities/trip.entity';
import { AnomalySeverity, AnomalyType } from '../entities/trip-anomaly.entity';

// ============================================================================
// TRIP LIFECYCLE DTOs
// ============================================================================

export class StartTripDto {
  @ApiPropertyOptional({ description: 'Vehicle ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Task type', enum: TripTaskType, default: TripTaskType.OTHER })
  @IsOptional()
  @IsEnum(TripTaskType)
  taskType?: TripTaskType;

  @ApiPropertyOptional({ description: 'Start odometer reading (km)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startOdometer?: number;

  @ApiPropertyOptional({ description: 'Task IDs to link', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  taskIds?: string[];

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class EndTripDto {
  @ApiPropertyOptional({ description: 'End odometer reading (km)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  endOdometer?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CancelTripDto {
  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ============================================================================
// GPS TRACKING DTOs
// ============================================================================

export class AddPointDto {
  @ApiProperty({ description: 'Latitude', minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude', minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'GPS accuracy (meters)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Speed (m/s)' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ description: 'Heading (0-360 degrees)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiPropertyOptional({ description: 'Altitude (meters)' })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional({ description: 'Time of recording (ISO 8601)' })
  @IsOptional()
  @IsString()
  recordedAt?: string;
}

export class AddPointsBatchDto {
  @ApiProperty({ description: 'Array of GPS points', type: [AddPointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddPointDto)
  points: AddPointDto[];
}

export class UpdateLiveLocationDto {
  @ApiProperty({ description: 'Whether live location is active' })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Telegram message ID' })
  @IsOptional()
  @IsNumber()
  telegramMessageId?: number;
}

// ============================================================================
// TASK LINK DTOs
// ============================================================================

export class LinkTaskDto {
  @ApiProperty({ description: 'Task ID to link', format: 'uuid' })
  @IsUUID()
  taskId: string;
}

export class CompleteLinkedTaskDto {
  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// ============================================================================
// ANOMALY DTOs
// ============================================================================

export class ResolveAnomalyDto {
  @ApiPropertyOptional({ description: 'Resolution notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ListAnomaliesQueryDto {
  @ApiPropertyOptional({ description: 'Filter by employee ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by severity', enum: AnomalySeverity })
  @IsOptional()
  @IsEnum(AnomalySeverity)
  severity?: AnomalySeverity;

  @ApiPropertyOptional({ description: 'Filter by type', enum: AnomalyType })
  @IsOptional()
  @IsEnum(AnomalyType)
  type?: AnomalyType;

  @ApiPropertyOptional({ description: 'Limit', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;
}

// ============================================================================
// RECONCILIATION DTOs
// ============================================================================

export class PerformReconciliationDto {
  @ApiProperty({ description: 'Vehicle ID', format: 'uuid' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ description: 'Actual odometer reading (km)' })
  @IsNumber()
  @Min(0)
  actualOdometer: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// ============================================================================
// QUERY DTOs
// ============================================================================

export class ListTripsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by employee', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Filter by vehicle', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: ['active', 'completed', 'cancelled', 'auto_closed'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by task type', enum: TripTaskType })
  @IsOptional()
  @IsEnum(TripTaskType)
  taskType?: TripTaskType;

  @ApiPropertyOptional({ description: 'Date from (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class TripAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Employee ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Machine ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiProperty({ description: 'Date from (ISO 8601)' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ description: 'Date to (ISO 8601)' })
  @IsDateString()
  dateTo: string;
}
