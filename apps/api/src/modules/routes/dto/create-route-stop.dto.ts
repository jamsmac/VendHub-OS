import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsObject,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RouteStopStatus } from '../entities/route.entity';

export class CreateRouteStopDto {
  @ApiProperty({ description: 'Machine ID to visit', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  machineId: string;

  @ApiProperty({ description: 'Sequence order of the stop', example: 1 })
  @IsNumber()
  @Min(1)
  sequence: number;

  @ApiPropertyOptional({ description: 'Linked task ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Estimated arrival time (ISO 8601)', example: '2024-12-20T09:30:00Z' })
  @IsOptional()
  @IsDateString()
  estimatedArrival?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'GPS latitude', example: 41.311081 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS longitude', example: 69.240562 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Extra metadata', default: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateRouteStopDto {
  @ApiPropertyOptional({ description: 'Machine ID to visit', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Sequence order of the stop' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  sequence?: number;

  @ApiPropertyOptional({ description: 'Linked task ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Stop status', enum: RouteStopStatus })
  @IsOptional()
  @IsEnum(RouteStopStatus)
  status?: RouteStopStatus;

  @ApiPropertyOptional({ description: 'Estimated arrival time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  estimatedArrival?: string;

  @ApiPropertyOptional({ description: 'Actual arrival time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  actualArrival?: string;

  @ApiPropertyOptional({ description: 'Departure time (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  departedAt?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'GPS latitude' })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS longitude' })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Extra metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ReorderStopsDto {
  @ApiProperty({
    description: 'Array of stop IDs in the new order',
    type: [String],
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  stopIds: string[];
}
