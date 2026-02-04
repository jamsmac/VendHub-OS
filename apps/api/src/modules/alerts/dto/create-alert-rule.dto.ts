/**
 * Alert Rule DTOs
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  AlertMetric,
  AlertCondition,
  AlertSeverity,
  AlertHistoryStatus,
} from '../entities/alert-rule.entity';

// ============================================================================
// ALERT RULE DTOs
// ============================================================================

export class CreateAlertRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: AlertMetric, description: 'Metric to monitor' })
  @IsEnum(AlertMetric)
  metric: AlertMetric;

  @ApiProperty({ enum: AlertCondition, description: 'Condition to evaluate' })
  @IsEnum(AlertCondition)
  condition: AlertCondition;

  @ApiProperty({ description: 'Threshold value' })
  @IsNumber()
  threshold: number;

  @ApiPropertyOptional({ description: 'Max threshold (for BETWEEN condition)' })
  @IsNumber()
  @IsOptional()
  thresholdMax?: number;

  @ApiProperty({ enum: AlertSeverity, default: AlertSeverity.WARNING })
  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity = AlertSeverity.WARNING;

  @ApiPropertyOptional({ description: 'Machine ID (null = all machines)' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Notification channels', default: ['in_app'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  notifyChannels?: string[];

  @ApiPropertyOptional({ description: 'User IDs to notify', default: [] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  @IsOptional()
  notifyUserIds?: string[];

  @ApiPropertyOptional({ description: 'Cooldown between alerts in minutes', default: 60 })
  @IsInt()
  @Min(1)
  @IsOptional()
  cooldownMinutes?: number;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAlertRuleDto extends PartialType(CreateAlertRuleDto) {}

export class AlertRuleQueryDto {
  @ApiPropertyOptional({ enum: AlertMetric })
  @IsEnum(AlertMetric)
  @IsOptional()
  metric?: AlertMetric;

  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Only active rules' })
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  activeOnly?: boolean = true;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}

export class AlertHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by rule ID' })
  @IsUUID()
  @IsOptional()
  ruleId?: string;

  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsUUID()
  @IsOptional()
  machineId?: string;

  @ApiPropertyOptional({ enum: AlertHistoryStatus })
  @IsEnum(AlertHistoryStatus)
  @IsOptional()
  status?: AlertHistoryStatus;

  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'triggeredAt';

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
