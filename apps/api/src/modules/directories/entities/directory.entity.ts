/**
 * Directory/EAV Entities for VendHub OS
 *
 * Implements a flexible Entity-Attribute-Value system for reference data
 * (справочники): units of measure, product categories, manufacturers, etc.
 *
 * Tables: directories, directory_fields, directory_entries
 * Migration: 1706000000000-CreateDirectoriesSystem
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum DirectoryType {
  MANUAL = 'MANUAL',
  EXTERNAL = 'EXTERNAL',
  PARAM = 'PARAM',
  TEMPLATE = 'TEMPLATE',
}

export enum DirectoryScope {
  HQ = 'HQ',
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
}

export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  BOOLEAN = 'BOOLEAN',
  SELECT_SINGLE = 'SELECT_SINGLE',
  SELECT_MULTI = 'SELECT_MULTI',
  REF = 'REF',
  JSON = 'JSON',
  FILE = 'FILE',
  IMAGE = 'IMAGE',
}

export enum EntryOrigin {
  OFFICIAL = 'OFFICIAL',
  LOCAL = 'LOCAL',
}

export enum EntryStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export enum SourceType {
  URL = 'URL',
  API = 'API',
  FILE = 'FILE',
  TEXT = 'TEXT',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface DirectorySettings {
  allow_inline_create?: boolean;
  allow_local_overlay?: boolean;
  approval_required?: boolean;
  prefetch?: boolean;
  offline_enabled?: boolean;
  offline_max_entries?: number;
}

export interface FieldValidationRules {
  regex?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  options?: string[];
  [key: string]: unknown;
}

export interface FieldTranslations {
  uz?: string;
  ru?: string;
  en?: string;
  [key: string]: string | undefined;
}

export interface EntryTranslations {
  uz?: string;
  ru?: string;
  en?: string;
  [key: string]: string | undefined;
}

// ============================================================================
// DIRECTORY ENTITY (directories table)
// ============================================================================

@Entity('directories')
@Index(['type'])
@Index(['scope', 'organizationId'])
export class Directory extends BaseEntity {
  @ApiProperty({ description: 'Directory name', example: 'Единицы измерения' })
  @Column({ type: 'text' })
  name: string;

  @ApiProperty({ description: 'Unique directory code (latin)', example: 'units' })
  @Column({ type: 'text' })
  slug: string;

  @ApiPropertyOptional({ description: 'Directory description' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Directory type', enum: DirectoryType })
  @Column({ type: 'enum', enum: DirectoryType, enumName: 'directory_type' })
  type: DirectoryType;

  @ApiProperty({ description: 'Directory scope', enum: DirectoryScope, default: DirectoryScope.HQ })
  @Column({ type: 'enum', enum: DirectoryScope, enumName: 'directory_scope', default: DirectoryScope.HQ })
  scope: DirectoryScope;

  @ApiPropertyOptional({ description: 'Organization ID (for ORGANIZATION scope)' })
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  @ApiPropertyOptional({ description: 'Location ID (for LOCATION scope)' })
  @Column({ type: 'uuid', nullable: true })
  locationId: string | null;

  @ApiProperty({ description: 'Whether directory supports hierarchy', default: false })
  @Column({ type: 'boolean', default: false })
  isHierarchical: boolean;

  @ApiProperty({ description: 'System directory (cannot be deleted)', default: false })
  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  @ApiPropertyOptional({ description: 'Icon name' })
  @Column({ type: 'text', nullable: true })
  icon: string | null;

  @ApiProperty({ description: 'Directory settings' })
  @Column({
    type: 'jsonb',
    default: {
      allow_inline_create: true,
      allow_local_overlay: true,
      approval_required: false,
      prefetch: false,
      offline_enabled: false,
      offline_max_entries: 1000,
    },
  })
  settings: DirectorySettings;

  /**
   * Note: The migration uses `created_by` (not `created_by_id`).
   * BaseEntity provides `created_by_id` and `updated_by_id`.
   * The SnakeNamingStrategy maps `createdBy` -> `created_by`.
   * We override the BaseEntity audit fields here to match the migration schema.
   */

  // Relations
  @OneToMany(() => DirectoryField, (field) => field.directory, { cascade: true })
  fields: DirectoryField[];

  @OneToMany(() => DirectoryEntry, (entry) => entry.directory)
  entries: DirectoryEntry[];
}

// ============================================================================
// DIRECTORY FIELD ENTITY (directory_fields table)
// ============================================================================

@Entity('directory_fields')
@Index(['directoryId'])
@Index(['directoryId', 'sortOrder'])
export class DirectoryField {
  @ApiProperty({ description: 'Field UUID' })
  @Column({ type: 'uuid', primary: true, generated: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Parent directory ID' })
  @Column({ type: 'uuid' })
  directoryId: string;

  @ApiProperty({ description: 'System field name (for API)', example: 'abbreviation' })
  @Column({ type: 'text' })
  name: string;

  @ApiProperty({ description: 'Display name', example: 'Сокращение' })
  @Column({ type: 'text' })
  displayName: string;

  @ApiPropertyOptional({ description: 'Field description' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Field data type', enum: FieldType })
  @Column({ type: 'enum', enum: FieldType, enumName: 'field_type' })
  fieldType: FieldType;

  @ApiPropertyOptional({ description: 'Source directory for SELECT/REF field types' })
  @Column({ type: 'uuid', nullable: true })
  refDirectoryId: string | null;

  @ApiProperty({ description: 'Allow free text input for SELECT', default: false })
  @Column({ type: 'boolean', default: false })
  allowFreeText: boolean;

  @ApiProperty({ description: 'Whether field is required', default: false })
  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @ApiProperty({ description: 'Whether field value must be unique', default: false })
  @Column({ type: 'boolean', default: false })
  isUnique: boolean;

  @ApiProperty({ description: 'Whether field value must be unique per organization', default: false })
  @Column({ type: 'boolean', default: false })
  isUniquePerOrg: boolean;

  @ApiProperty({ description: 'Show in list view', default: false })
  @Column({ type: 'boolean', default: false })
  showInList: boolean;

  @ApiProperty({ description: 'Show in card view', default: true })
  @Column({ type: 'boolean', default: true })
  showInCard: boolean;

  @ApiProperty({ description: 'Sort order', default: 0 })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ApiPropertyOptional({ description: 'Default value' })
  @Column({ type: 'jsonb', nullable: true })
  defaultValue: unknown | null;

  @ApiProperty({ description: 'Validation rules (regex, min/max, etc.)' })
  @Column({ type: 'jsonb', default: {} })
  validationRules: FieldValidationRules;

  @ApiPropertyOptional({ description: 'Field name translations' })
  @Column({ type: 'jsonb', nullable: true })
  translations: FieldTranslations | null;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Directory, (directory) => directory.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'directory_id' })
  directory: Directory;

  @ManyToOne(() => Directory, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ref_directory_id' })
  refDirectory: Directory | null;
}

// ============================================================================
// DIRECTORY ENTRY ENTITY (directory_entries table)
// ============================================================================

@Entity('directory_entries')
@Index(['directoryId'])
@Index(['directoryId', 'status'])
@Index(['directoryId', 'origin'])
export class DirectoryEntry extends BaseEntity {
  @ApiProperty({ description: 'Parent directory ID' })
  @Column({ type: 'uuid' })
  directoryId: string;

  @ApiPropertyOptional({ description: 'Parent entry ID (for hierarchical directories)' })
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ApiProperty({ description: 'Entry name', example: 'Килограмм' })
  @Column({ type: 'text' })
  name: string;

  @ApiProperty({ description: 'Normalized name: lower(trim(unaccent(name)))' })
  @Column({ type: 'text' })
  normalizedName: string;

  @ApiPropertyOptional({ description: 'Entry code', example: 'kg' })
  @Column({ type: 'text', nullable: true })
  code: string | null;

  @ApiPropertyOptional({ description: 'Key from external source' })
  @Column({ type: 'text', nullable: true })
  externalKey: string | null;

  @ApiPropertyOptional({ description: 'Entry description' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ description: 'Entry translations' })
  @Column({ type: 'jsonb', nullable: true })
  translations: EntryTranslations | null;

  @ApiProperty({ description: 'Origin: OFFICIAL or LOCAL', enum: EntryOrigin, default: EntryOrigin.LOCAL })
  @Column({ type: 'enum', enum: EntryOrigin, enumName: 'entry_origin', default: EntryOrigin.LOCAL })
  origin: EntryOrigin;

  @ApiPropertyOptional({ description: 'Origin source name' })
  @Column({ type: 'text', nullable: true })
  originSource: string | null;

  @ApiPropertyOptional({ description: 'Origin date' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  originDate: Date | null;

  @ApiProperty({ description: 'Entry status', enum: EntryStatus, default: EntryStatus.ACTIVE })
  @Column({ type: 'enum', enum: EntryStatus, enumName: 'entry_status', default: EntryStatus.ACTIVE })
  status: EntryStatus;

  @ApiProperty({ description: 'Entry version', default: 1 })
  @Column({ type: 'int', default: 1 })
  version: number;

  @ApiPropertyOptional({ description: 'Valid from date' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  validFrom: Date | null;

  @ApiPropertyOptional({ description: 'Valid to date' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  validTo: Date | null;

  @ApiPropertyOptional({ description: 'Deprecation date' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  deprecatedAt: Date | null;

  @ApiPropertyOptional({ description: 'Recommended replacement entry ID' })
  @Column({ type: 'uuid', nullable: true })
  replacementEntryId: string | null;

  @ApiPropertyOptional({ description: 'Tags for filtering', type: [String] })
  @Column({ type: 'text', array: true, nullable: true })
  tags: string[] | null;

  @ApiProperty({ description: 'Sort order', default: 0 })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @ApiProperty({ description: 'Field values (EAV via JSONB)' })
  @Column({ type: 'jsonb', default: {} })
  data: Record<string, unknown>;

  @Column({ type: 'tsvector', nullable: true, select: false })
  searchVector: string | null;

  @ApiPropertyOptional({ description: 'Organization ID' })
  @Column({ type: 'uuid', nullable: true })
  organizationId: string | null;

  // Relations
  @ManyToOne(() => Directory, (directory) => directory.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'directory_id' })
  directory: Directory;

  @ManyToOne(() => DirectoryEntry, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: DirectoryEntry | null;

  @OneToMany(() => DirectoryEntry, (entry) => entry.parent)
  children: DirectoryEntry[];

  @ManyToOne(() => DirectoryEntry, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replacement_entry_id' })
  replacementEntry: DirectoryEntry | null;

  /**
   * Auto-generate normalizedName before insert/update.
   * The DB trigger also does this, but we set it in TypeScript
   * for consistency when reading back without a DB round-trip.
   */
  @BeforeInsert()
  @BeforeUpdate()
  generateNormalizedName() {
    if (this.name) {
      this.normalizedName = this.name.toLowerCase().trim();
    }
  }
}
