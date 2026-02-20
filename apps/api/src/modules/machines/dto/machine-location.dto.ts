import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MoveReason } from '../entities/machine.entity';

export class MoveMachineDto {
  @ApiProperty({ description: 'UUID of the destination location' })
  @IsUUID()
  @IsNotEmpty()
  toLocationId: string;

  @ApiPropertyOptional({ description: 'GPS latitude of the new location' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS longitude of the new location' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Human-readable address of the new location' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: MoveReason, description: 'Reason for the move' })
  @IsOptional()
  @IsEnum(MoveReason)
  reason?: MoveReason;

  @ApiPropertyOptional({ description: 'Additional notes about the move' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class LogErrorDto {
  @ApiProperty({ example: 'ERR-TEMP-01', description: 'Error code identifier' })
  @IsString()
  @IsNotEmpty()
  errorCode: string;

  @ApiProperty({ example: 'Temperature exceeded threshold', description: 'Error description' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'error', description: 'Severity level (info, warning, error, critical)' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({ description: 'Additional context data (telemetry snapshot, etc.)' })
  @IsOptional()
  context?: Record<string, any>;
}

export class ResolveErrorDto {
  @ApiProperty({ description: 'Description of how the error was resolved' })
  @IsString()
  @IsNotEmpty()
  resolution: string;
}

export class ScheduleMaintenanceDto {
  @ApiProperty({ example: 'cleaning', description: 'Type of maintenance (cleaning, inspection, calibration, etc.)' })
  @IsString()
  @IsNotEmpty()
  maintenanceType: string;

  @ApiProperty({ example: '2025-06-15', description: 'Scheduled date for maintenance (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  scheduledDate: string;

  @ApiPropertyOptional({ description: 'UUID of the user assigned to perform maintenance' })
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: 'Description of the maintenance work' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @IsOptional()
  @IsNumber()
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Estimated cost in UZS' })
  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Repeat interval in days for recurring maintenance' })
  @IsOptional()
  @IsNumber()
  repeatIntervalDays?: number;
}

export class CompleteMaintenanceDto {
  @ApiPropertyOptional({ description: 'Notes about the completed maintenance' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Actual duration in minutes' })
  @IsOptional()
  @IsNumber()
  actualDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Actual cost in UZS' })
  @IsOptional()
  @IsNumber()
  actualCost?: number;
}
