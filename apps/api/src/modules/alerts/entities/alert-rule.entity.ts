/**
 * Alerts Module Entities
 * Alert rules and alert history for monitoring vending machine metrics
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Alert Metric - what is being monitored
 */
export enum AlertMetric {
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  STOCK_LEVEL = 'stock_level',
  CASH_LEVEL = 'cash_level',
  SALES_DROP = 'sales_drop',
  OFFLINE_DURATION = 'offline_duration',
  ERROR_COUNT = 'error_count',
  MAINTENANCE_OVERDUE = 'maintenance_overdue',
  COLLECTION_OVERDUE = 'collection_overdue',
  CUSTOM = 'custom',
}

/**
 * Alert Condition - comparison operator
 */
export enum AlertCondition {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  BETWEEN = 'between',
}

/**
 * Alert Severity
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

/**
 * Alert History Status
 */
export enum AlertHistoryStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

// ============================================================================
// ALERT RULE ENTITY
// ============================================================================

/**
 * Alert Rule Entity
 * Defines conditions under which alerts are triggered
 */
@Entity('alert_rules')
@Index(['organizationId'])
@Index(['metric'])
@Index(['isActive'])
@Index(['machineId'])
export class AlertRule extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Rule name', example: 'Low Stock Alert' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ enum: AlertMetric, description: 'Metric to monitor' })
  @Column({ type: 'enum', enum: AlertMetric })
  metric: AlertMetric;

  @ApiProperty({ enum: AlertCondition, description: 'Comparison condition' })
  @Column({ type: 'enum', enum: AlertCondition })
  condition: AlertCondition;

  @ApiProperty({ description: 'Threshold value' })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  threshold: number;

  @ApiPropertyOptional({ description: 'Maximum threshold (for BETWEEN condition)' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  thresholdMax: number | null;

  @ApiProperty({ enum: AlertSeverity, description: 'Alert severity level' })
  @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.WARNING })
  severity: AlertSeverity;

  @ApiPropertyOptional({ description: 'Machine ID (null = all machines in org)' })
  @Column({ type: 'uuid', nullable: true })
  machineId: string | null;

  @ApiProperty({ description: 'Notification channels', default: ['in_app'] })
  @Column({ type: 'jsonb', default: ['in_app'] })
  notifyChannels: string[];

  @ApiProperty({ description: 'Specific user IDs to notify', default: [] })
  @Column({ type: 'jsonb', default: [] })
  notifyUserIds: string[];

  @ApiProperty({ description: 'Cooldown between alerts in minutes', default: 60 })
  @Column({ type: 'integer', default: 60 })
  cooldownMinutes: number;

  @ApiProperty({ description: 'Is rule active', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}

// ============================================================================
// ALERT HISTORY ENTITY
// ============================================================================

/**
 * Alert History Entity
 * Records of triggered alerts and their lifecycle
 */
@Entity('alert_history')
@Index(['organizationId'])
@Index(['ruleId'])
@Index(['machineId'])
@Index(['status'])
@Index(['triggeredAt'])
@Index(['severity'])
export class AlertHistory extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Alert rule ID that triggered this alert' })
  @Column({ type: 'uuid' })
  ruleId: string;

  @ManyToOne(() => AlertRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: AlertRule;

  @ApiPropertyOptional({ description: 'Machine ID that triggered the alert' })
  @Column({ type: 'uuid', nullable: true })
  machineId: string | null;

  @ApiProperty({ description: 'When the alert was triggered' })
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  triggeredAt: Date;

  @ApiProperty({ description: 'Actual metric value at time of trigger' })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  value: number;

  @ApiProperty({ description: 'Threshold snapshot at time of trigger' })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  threshold: number;

  @ApiProperty({ enum: AlertSeverity, description: 'Severity at time of trigger' })
  @Column({ type: 'enum', enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiProperty({ enum: AlertHistoryStatus, description: 'Current alert status' })
  @Column({ type: 'enum', enum: AlertHistoryStatus, default: AlertHistoryStatus.ACTIVE })
  status: AlertHistoryStatus;

  @ApiPropertyOptional({ description: 'User who acknowledged the alert' })
  @Column({ type: 'uuid', nullable: true })
  acknowledgedByUserId: string | null;

  @ApiPropertyOptional({ description: 'When the alert was acknowledged' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  acknowledgedAt: Date | null;

  @ApiPropertyOptional({ description: 'When the alert was resolved' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  resolvedAt: Date | null;

  @ApiPropertyOptional({ description: 'Alert message' })
  @Column({ type: 'text', nullable: true })
  message: string | null;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
