/**
 * DirectoryEntryAudit Entity
 *
 * Audit trail for all changes to directory entries.
 * Table: directory_entry_audit (created by migration, no BaseEntity).
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectoryEntry } from './directory.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum DirectoryAuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
  SYNC = 'SYNC',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

// ============================================================================
// ENTITY
// ============================================================================

@Entity('directory_entry_audit')
@Index(['entryId'])
export class DirectoryEntryAudit {
  @ApiProperty({ description: 'Audit record UUID' })
  @Column({ type: 'uuid', primary: true, generated: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Entry ID' })
  @Column({ type: 'uuid' })
  entryId: string;

  @ApiProperty({ description: 'Action performed', enum: DirectoryAuditAction })
  @Column({ type: 'enum', enum: DirectoryAuditAction, enumName: 'directory_audit_action' })
  action: DirectoryAuditAction;

  @ApiPropertyOptional({ description: 'User who made the change' })
  @Column({ type: 'uuid', nullable: true })
  changedBy: string | null;

  @ApiProperty({ description: 'Timestamp of the change' })
  @Column({ type: 'timestamp with time zone', default: () => 'now()' })
  changedAt: Date;

  @ApiPropertyOptional({ description: 'Previous values (JSONB)' })
  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'New values (JSONB)' })
  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Reason for the change' })
  @Column({ type: 'text', nullable: true })
  changeReason: string | null;

  @ApiPropertyOptional({ description: 'IP address of the requester' })
  @Column({ type: 'inet', nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional({ description: 'User agent of the requester' })
  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  // Relations
  @ManyToOne(() => DirectoryEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry: DirectoryEntry;
}
