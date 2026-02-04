/**
 * Directory Audit DTOs
 */

import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DirectoryAuditAction } from '../entities/directory-entry-audit.entity';

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ description: 'Filter by entry ID' })
  @IsOptional()
  @IsUUID()
  entryId?: string;

  @ApiPropertyOptional({ description: 'Filter by action type', enum: DirectoryAuditAction })
  @IsOptional()
  @IsEnum(DirectoryAuditAction)
  action?: DirectoryAuditAction;

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
