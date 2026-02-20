/**
 * DirectorySource Entity
 *
 * External data source configuration for directories.
 * Supports URL, API, FILE, and TEXT source types.
 * Table: directory_sources (created by migration, no BaseEntity).
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Directory, SourceType } from './directory.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum SyncStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity('directory_sources')
@Index(['directoryId'])
export class DirectorySource {
  @ApiProperty({ description: 'Source UUID' })
  @Column({ type: 'uuid', primary: true, generated: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Parent directory ID' })
  @Column({ type: 'uuid' })
  directoryId: string;

  @ApiProperty({ description: 'Source name', example: 'Государственный реестр' })
  @Column({ type: 'text' })
  name: string;

  @ApiProperty({ description: 'Source type', enum: SourceType })
  @Column({ type: 'enum', enum: SourceType, enumName: 'source_type' })
  sourceType: SourceType;

  @ApiPropertyOptional({ description: 'Source URL' })
  @Column({ type: 'text', nullable: true })
  url: string | null;

  @ApiPropertyOptional({ description: 'Authentication config (JSONB)' })
  @Column({ type: 'jsonb', nullable: true })
  authConfig: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Request config (headers, method, etc.)' })
  @Column({ type: 'jsonb', nullable: true })
  requestConfig: Record<string, unknown> | null;

  @ApiProperty({ description: 'Column mapping from source to fields' })
  @Column({ type: 'jsonb', default: {} })
  columnMapping: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Field name used as unique key for upsert' })
  @Column({ type: 'text', nullable: true })
  uniqueKeyField: string | null;

  // NOTE: Migration has column_mapping as NOT NULL and unique_key_field as NOT NULL.
  // However unique_key_field can reasonably be null for sources that don't do upsert.
  // columnMapping defaults to empty object to match NOT NULL constraint.

  @ApiPropertyOptional({ description: 'Cron schedule expression' })
  @Column({ type: 'text', nullable: true })
  schedule: string | null;

  @ApiProperty({ description: 'Whether source is active', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last sync timestamp' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  lastSyncAt: Date | null;

  @ApiPropertyOptional({ description: 'Last sync status', enum: SyncStatus })
  @Column({ type: 'enum', enum: SyncStatus, enumName: 'sync_status', nullable: true })
  lastSyncStatus: SyncStatus | null;

  @ApiPropertyOptional({ description: 'Last sync error message' })
  @Column({ type: 'text', nullable: true })
  lastSyncError: string | null;

  @ApiProperty({ description: 'Consecutive failure count', default: 0 })
  @Column({ type: 'int', default: 0 })
  consecutiveFailures: number;

  @ApiPropertyOptional({ description: 'Source data version identifier' })
  @Column({ type: 'text', nullable: true })
  sourceVersion: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Directory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'directory_id' })
  directory: Directory;

  @OneToMany('DirectorySyncLog', 'source')
  syncLogs: import('./directory-sync-log.entity').DirectorySyncLog[];
}
