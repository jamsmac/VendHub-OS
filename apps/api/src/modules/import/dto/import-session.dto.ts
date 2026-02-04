/**
 * Import Session DTOs
 * Validation and Swagger documentation for import session endpoints
 */

import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
  IsBoolean,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { DomainType, ImportSessionStatus, ApprovalStatus } from '../entities/import-session.entity';
import { AuditActionType } from '../entities/import-audit-log.entity';

// ============================================================================
// CREATE IMPORT SESSION
// ============================================================================

export class CreateImportSessionDto {
  @ApiPropertyOptional({
    enum: DomainType,
    description: 'Target domain for import. Can be auto-detected from file content.',
  })
  @IsOptional()
  @IsEnum(DomainType)
  domain?: DomainType;

  @ApiPropertyOptional({ description: 'Import template ID to use for mapping' })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

// ============================================================================
// CLASSIFY SESSION
// ============================================================================

export class ClassifySessionDto {
  @ApiPropertyOptional({
    enum: DomainType,
    description: 'Override auto-detected domain',
  })
  @IsOptional()
  @IsEnum(DomainType)
  overrideDomain?: DomainType;

  @ApiPropertyOptional({
    description: 'Manual column mapping override ({source_col: target_field})',
    example: { 'Product Name': 'name', 'Price (UZS)': 'price' },
  })
  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, string>;
}

// ============================================================================
// VALIDATE SESSION
// ============================================================================

export class ValidateSessionDto {
  @ApiPropertyOptional({
    description: 'Attempt to auto-fix validation errors',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  fixErrors?: boolean;
}

// ============================================================================
// APPROVE SESSION
// ============================================================================

export class ApproveSessionDto {
  @ApiPropertyOptional({
    description: 'Automatically execute import after approval',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoExecute?: boolean;
}

// ============================================================================
// REJECT SESSION
// ============================================================================

export class RejectSessionDto {
  @ApiProperty({
    description: 'Reason for rejecting the import session',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @Length(1, 1000)
  reason: string;
}

// ============================================================================
// QUERY IMPORT SESSIONS
// ============================================================================

export class QueryImportSessionsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: DomainType, description: 'Filter by domain' })
  @IsOptional()
  @IsEnum(DomainType)
  domain?: DomainType;

  @ApiPropertyOptional({ enum: ImportSessionStatus, description: 'Filter by session status' })
  @IsOptional()
  @IsEnum(ImportSessionStatus)
  status?: ImportSessionStatus;

  @ApiPropertyOptional({ enum: ApprovalStatus, description: 'Filter by approval status' })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  @ApiPropertyOptional({ description: 'Filter from date (ISO 8601)', example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO 8601)', example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

// ============================================================================
// QUERY AUDIT LOG
// ============================================================================

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: AuditActionType, description: 'Filter by action type' })
  @IsOptional()
  @IsEnum(AuditActionType)
  actionType?: AuditActionType;

  @ApiPropertyOptional({ description: 'Filter by table name' })
  @IsOptional()
  @IsString()
  tableName?: string;
}
