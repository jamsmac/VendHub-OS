/**
 * Directory DTOs for VendHub OS
 *
 * DTOs for directory, field, and entry CRUD operations
 * with class-validator decorators and Swagger documentation.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  MaxLength,
  Min,
  Max,
  IsInt,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DirectoryType,
  DirectoryScope,
  FieldType,
  EntryOrigin,
  EntryStatus,
  DirectorySettings,
  FieldValidationRules,
  FieldTranslations,
  EntryTranslations,
} from '../entities/directory.entity';

// ============================================================================
// DIRECTORY DTOs
// ============================================================================

export class CreateDirectoryDto {
  @ApiProperty({ description: 'Directory name', example: 'Единицы измерения' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @ApiProperty({ description: 'Unique directory code (latin)', example: 'units' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'slug must be lowercase latin with underscores, starting with a letter',
  })
  slug: string;

  @ApiPropertyOptional({ description: 'Directory description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Directory type', enum: DirectoryType, example: DirectoryType.MANUAL })
  @IsEnum(DirectoryType)
  type: DirectoryType;

  @ApiPropertyOptional({ description: 'Directory scope', enum: DirectoryScope, default: DirectoryScope.HQ })
  @IsOptional()
  @IsEnum(DirectoryScope)
  scope?: DirectoryScope;

  @ApiPropertyOptional({ description: 'Whether directory supports hierarchy', default: false })
  @IsOptional()
  @IsBoolean()
  isHierarchical?: boolean;

  @ApiPropertyOptional({ description: 'Icon name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: 'Directory settings' })
  @IsOptional()
  @IsObject()
  settings?: DirectorySettings;
}

export class UpdateDirectoryDto {
  @ApiPropertyOptional({ description: 'Directory name' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @ApiPropertyOptional({ description: 'Directory description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Directory scope', enum: DirectoryScope })
  @IsOptional()
  @IsEnum(DirectoryScope)
  scope?: DirectoryScope;

  @ApiPropertyOptional({ description: 'Whether directory supports hierarchy' })
  @IsOptional()
  @IsBoolean()
  isHierarchical?: boolean;

  @ApiPropertyOptional({ description: 'Icon name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @ApiPropertyOptional({ description: 'Directory settings' })
  @IsOptional()
  @IsObject()
  settings?: DirectorySettings;
}

// ============================================================================
// FIELD DTOs
// ============================================================================

export class CreateDirectoryFieldDto {
  @ApiProperty({ description: 'System field name (for API)', example: 'abbreviation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'name must be lowercase latin with underscores, starting with a letter',
  })
  name: string;

  @ApiProperty({ description: 'Display name', example: 'Сокращение' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  displayName: string;

  @ApiPropertyOptional({ description: 'Field description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Field data type', enum: FieldType, example: FieldType.TEXT })
  @IsEnum(FieldType)
  fieldType: FieldType;

  @ApiPropertyOptional({ description: 'Source directory ID for SELECT/REF field types' })
  @IsOptional()
  @IsUUID()
  refDirectoryId?: string;

  @ApiPropertyOptional({ description: 'Allow free text input for SELECT', default: false })
  @IsOptional()
  @IsBoolean()
  allowFreeText?: boolean;

  @ApiPropertyOptional({ description: 'Whether field is required', default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Whether field value must be unique', default: false })
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;

  @ApiPropertyOptional({ description: 'Whether field value must be unique per organization', default: false })
  @IsOptional()
  @IsBoolean()
  isUniquePerOrg?: boolean;

  @ApiPropertyOptional({ description: 'Show in list view', default: false })
  @IsOptional()
  @IsBoolean()
  showInList?: boolean;

  @ApiPropertyOptional({ description: 'Show in card view', default: true })
  @IsOptional()
  @IsBoolean()
  showInCard?: boolean;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  defaultValue?: unknown;

  @ApiPropertyOptional({ description: 'Validation rules (regex, min/max, etc.)' })
  @IsOptional()
  @IsObject()
  validationRules?: FieldValidationRules;

  @ApiPropertyOptional({ description: 'Field name translations' })
  @IsOptional()
  @IsObject()
  translations?: FieldTranslations;
}

export class UpdateDirectoryFieldDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Field description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Source directory ID for SELECT/REF field types' })
  @IsOptional()
  @IsUUID()
  refDirectoryId?: string;

  @ApiPropertyOptional({ description: 'Allow free text input for SELECT' })
  @IsOptional()
  @IsBoolean()
  allowFreeText?: boolean;

  @ApiPropertyOptional({ description: 'Whether field is required' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ description: 'Whether field value must be unique' })
  @IsOptional()
  @IsBoolean()
  isUnique?: boolean;

  @ApiPropertyOptional({ description: 'Whether field value must be unique per organization' })
  @IsOptional()
  @IsBoolean()
  isUniquePerOrg?: boolean;

  @ApiPropertyOptional({ description: 'Show in list view' })
  @IsOptional()
  @IsBoolean()
  showInList?: boolean;

  @ApiPropertyOptional({ description: 'Show in card view' })
  @IsOptional()
  @IsBoolean()
  showInCard?: boolean;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  defaultValue?: unknown;

  @ApiPropertyOptional({ description: 'Validation rules (regex, min/max, etc.)' })
  @IsOptional()
  @IsObject()
  validationRules?: FieldValidationRules;

  @ApiPropertyOptional({ description: 'Field name translations' })
  @IsOptional()
  @IsObject()
  translations?: FieldTranslations;
}

// ============================================================================
// ENTRY DTOs
// ============================================================================

export class CreateDirectoryEntryDto {
  @ApiProperty({ description: 'Entry name', example: 'Килограмм' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  name: string;

  @ApiPropertyOptional({ description: 'Entry code', example: 'kg' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  code?: string;

  @ApiPropertyOptional({ description: 'Key from external source' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalKey?: string;

  @ApiPropertyOptional({ description: 'Entry description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Entry translations' })
  @IsOptional()
  @IsObject()
  translations?: EntryTranslations;

  @ApiPropertyOptional({ description: 'Origin: OFFICIAL or LOCAL', enum: EntryOrigin, default: EntryOrigin.LOCAL })
  @IsOptional()
  @IsEnum(EntryOrigin)
  origin?: EntryOrigin;

  @ApiPropertyOptional({ description: 'Entry status', enum: EntryStatus, default: EntryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;

  @ApiPropertyOptional({ description: 'Parent entry ID (for hierarchical directories)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Tags for filtering', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Field values (EAV via JSONB)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class UpdateDirectoryEntryDto {
  @ApiPropertyOptional({ description: 'Entry name' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  name?: string;

  @ApiPropertyOptional({ description: 'Entry code' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  code?: string;

  @ApiPropertyOptional({ description: 'Key from external source' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  externalKey?: string;

  @ApiPropertyOptional({ description: 'Entry description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Entry translations' })
  @IsOptional()
  @IsObject()
  translations?: EntryTranslations;

  @ApiPropertyOptional({ description: 'Origin: OFFICIAL or LOCAL', enum: EntryOrigin })
  @IsOptional()
  @IsEnum(EntryOrigin)
  origin?: EntryOrigin;

  @ApiPropertyOptional({ description: 'Entry status', enum: EntryStatus })
  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;

  @ApiPropertyOptional({ description: 'Parent entry ID (for hierarchical directories)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Recommended replacement entry ID (for deprecated entries)' })
  @IsOptional()
  @IsUUID()
  replacementEntryId?: string;

  @ApiPropertyOptional({ description: 'Tags for filtering', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Field values (EAV via JSONB)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

// ============================================================================
// QUERY / PAGINATION DTOs
// ============================================================================

export class QueryDirectoriesDto {
  @ApiPropertyOptional({ description: 'Filter by directory type', enum: DirectoryType })
  @IsOptional()
  @IsEnum(DirectoryType)
  type?: DirectoryType;

  @ApiPropertyOptional({ description: 'Filter by directory scope', enum: DirectoryScope })
  @IsOptional()
  @IsEnum(DirectoryScope)
  scope?: DirectoryScope;

  @ApiPropertyOptional({ description: 'Search by name or slug' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Include system directories', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeSystem?: boolean;

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

export class QueryEntriesDto {
  @ApiPropertyOptional({ description: 'Filter by entry status', enum: EntryStatus })
  @IsOptional()
  @IsEnum(EntryStatus)
  status?: EntryStatus;

  @ApiPropertyOptional({ description: 'Filter by origin', enum: EntryOrigin })
  @IsOptional()
  @IsEnum(EntryOrigin)
  origin?: EntryOrigin;

  @ApiPropertyOptional({ description: 'Filter by parent entry ID' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Search by name, code, or data' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

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

export class SearchEntriesDto {
  @ApiProperty({ description: 'Search query', example: 'кило' })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiPropertyOptional({ description: 'Maximum results', default: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
