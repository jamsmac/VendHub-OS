import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsObject,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RouteType } from '../entities/route.entity';

export class CreateRouteDto {
  @ApiProperty({ description: 'Organization ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Assigned operator ID', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  operatorId: string;

  @ApiProperty({ description: 'Route name', example: 'Morning refill route - Chilanzar', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Route type', enum: RouteType, default: RouteType.REFILL })
  @IsOptional()
  @IsEnum(RouteType)
  type?: RouteType;

  @ApiProperty({ description: 'Planned date for the route (ISO 8601)', example: '2024-12-20' })
  @IsDateString()
  @IsNotEmpty()
  plannedDate: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes', example: 180 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Estimated distance in kilometers', example: 45.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDistanceKm?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Extra metadata', default: {} })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateRouteDto {
  @ApiPropertyOptional({ description: 'Assigned operator ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional({ description: 'Route name', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Route type', enum: RouteType })
  @IsOptional()
  @IsEnum(RouteType)
  type?: RouteType;

  @ApiPropertyOptional({ description: 'Planned date for the route (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Estimated distance in kilometers' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDistanceKm?: number;

  @ApiPropertyOptional({ description: 'Actual duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Actual distance in kilometers' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualDistanceKm?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Extra metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
