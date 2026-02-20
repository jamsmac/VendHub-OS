/**
 * DirectorySyncLog Entity
 *
 * Records each synchronization attempt for a directory source.
 * Table: directory_sync_logs (created by migration, no BaseEntity).
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Directory } from './directory.entity';
import { DirectorySource } from './directory-source.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum SyncLogStatus {
  STARTED = 'STARTED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity('directory_sync_logs')
@Index(['directoryId'])
@Index(['sourceId'])
export class DirectorySyncLog {
  @ApiProperty({ description: 'Sync log UUID' })
  @Column({ type: 'uuid', primary: true, generated: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Directory ID' })
  @Column({ type: 'uuid' })
  directoryId: string;

  @ApiProperty({ description: 'Source ID' })
  @Column({ type: 'uuid' })
  sourceId: string;

  @ApiProperty({ description: 'Sync status', enum: SyncLogStatus })
  @Column({ type: 'enum', enum: SyncLogStatus, enumName: 'sync_log_status' })
  status: SyncLogStatus;

  @ApiProperty({ description: 'Sync start time' })
  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Sync finish time' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  finishedAt: Date | null;

  @ApiProperty({ description: 'Total records processed', default: 0 })
  @Column({ type: 'int', default: 0 })
  totalRecords: number;

  @ApiProperty({ description: 'Records created', default: 0 })
  @Column({ type: 'int', default: 0 })
  createdCount: number;

  @ApiProperty({ description: 'Records updated', default: 0 })
  @Column({ type: 'int', default: 0 })
  updatedCount: number;

  @ApiProperty({ description: 'Records deprecated', default: 0 })
  @Column({ type: 'int', default: 0 })
  deprecatedCount: number;

  @ApiProperty({ description: 'Records with errors', default: 0 })
  @Column({ type: 'int', default: 0 })
  errorCount: number;

  @ApiPropertyOptional({ description: 'Error details (JSONB)' })
  @Column({ type: 'jsonb', nullable: true })
  errors: Record<string, unknown>[] | null;

  @ApiPropertyOptional({ description: 'User who triggered the sync' })
  @Column({ type: 'uuid', nullable: true })
  triggeredBy: string | null;

  // Relations
  @ManyToOne(() => Directory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'directory_id' })
  directory: Directory;

  @ManyToOne(() => DirectorySource, (source) => source.syncLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  source: DirectorySource;
}
