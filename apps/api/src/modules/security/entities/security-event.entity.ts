import { Entity, Column, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN_LOCKED = 'login_locked',
  LOGOUT = 'logout',
  LOGOUT_ALL = 'logout_all',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_BLACKLISTED = 'token_blacklisted',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  TWO_FACTOR_FAILED = 'two_factor_failed',
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_APPROVED = 'account_approved',
  ACCOUNT_REJECTED = 'account_rejected',
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_REACTIVATED = 'account_reactivated',
  ROLE_CHANGED = 'role_changed',
  PERMISSION_CHANGED = 'permission_changed',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('security_events')
@Index(['userId'])
@Index(['organizationId'])
@Index(['eventType'])
@Index(['severity'])
@Index(['ipAddress'])
@Index(['created_at'])
export class SecurityEvent extends BaseEntity {
  @ApiProperty({ enum: SecurityEventType })
  @Column({ type: 'enum', enum: SecurityEventType })
  eventType: SecurityEventType;

  @ApiProperty({ enum: SecuritySeverity })
  @Column({ type: 'enum', enum: SecuritySeverity, default: SecuritySeverity.LOW })
  severity: SecuritySeverity;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  resource: string;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  resourceId: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  @ApiPropertyOptional()
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionId: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isResolved: boolean;

  @ApiPropertyOptional()
  @Column({ type: 'uuid', nullable: true })
  resolvedById: string;

  @ApiPropertyOptional()
  @Column({ type: 'timestamp with time zone', nullable: true })
  resolvedAt: Date;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;
}
