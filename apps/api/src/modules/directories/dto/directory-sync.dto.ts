/**
 * Directory Sync DTOs
 */

import {
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerSyncDto {
  @ApiPropertyOptional({ description: 'Override: specific source version to sync' })
  @IsOptional()
  @IsString()
  sourceVersion?: string;
}

export class QuerySyncLogsDto {
  @ApiPropertyOptional({ description: 'Filter by source ID' })
  @IsOptional()
  @IsUUID()
  sourceId?: string;

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
