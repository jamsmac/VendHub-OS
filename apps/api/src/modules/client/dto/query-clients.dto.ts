/**
 * Query DTOs
 * Pagination and filtering for client and order queries
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  IsUUID,
  IsEnum,
  IsDateString,
  IsBooleanString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientOrderStatus } from '../entities/client-order.entity';

export class QueryClientsDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search by name, phone, email, or telegram ID',
    example: 'Aziz',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by verified status',
    example: 'true',
  })
  @IsBooleanString()
  @IsOptional()
  isVerified?: string;

  @ApiPropertyOptional({
    description: 'Filter by blocked status',
    example: 'false',
  })
  @IsBooleanString()
  @IsOptional()
  isBlocked?: string;
}

export class QueryOrdersDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by client user UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  clientUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by machine UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({
    description: 'Filter by order status',
    enum: ClientOrderStatus,
    example: ClientOrderStatus.COMPLETED,
  })
  @IsEnum(ClientOrderStatus)
  @IsOptional()
  status?: ClientOrderStatus;

  @ApiPropertyOptional({
    description: 'Filter orders from this date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter orders until this date (ISO 8601)',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;
}
