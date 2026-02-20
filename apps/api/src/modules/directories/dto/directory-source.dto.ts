/**
 * Directory Source DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsInt,
  IsUrl,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SourceType } from '../entities/directory.entity';

export class CreateDirectorySourceDto {
  @ApiProperty({ description: 'Source name', example: 'Государственный реестр' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @ApiProperty({ description: 'Source type', enum: SourceType })
  @IsEnum(SourceType)
  sourceType: SourceType;

  @ApiPropertyOptional({ description: 'Source URL (must be http or https)' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'url must be a valid HTTP/HTTPS URL' })
  @MaxLength(2000)
  url?: string;

  @ApiPropertyOptional({ description: 'Authentication config' })
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Request config (headers, method, etc.)' })
  @IsOptional()
  @IsObject()
  requestConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Column mapping from source to fields' })
  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Field name used as unique key for upsert' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  uniqueKeyField?: string;

  @ApiPropertyOptional({ description: 'Cron schedule expression', example: '0 0 * * *' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  schedule?: string;

  @ApiPropertyOptional({ description: 'Whether source is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDirectorySourceDto {
  @ApiPropertyOptional({ description: 'Source name' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @ApiPropertyOptional({ description: 'Source URL (must be http or https)' })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'url must be a valid HTTP/HTTPS URL' })
  @MaxLength(2000)
  url?: string;

  @ApiPropertyOptional({ description: 'Authentication config' })
  @IsOptional()
  @IsObject()
  authConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Request config' })
  @IsOptional()
  @IsObject()
  requestConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Column mapping' })
  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Unique key field' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  uniqueKeyField?: string;

  @ApiPropertyOptional({ description: 'Cron schedule expression' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  schedule?: string;

  @ApiPropertyOptional({ description: 'Whether source is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryDirectorySourcesDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
