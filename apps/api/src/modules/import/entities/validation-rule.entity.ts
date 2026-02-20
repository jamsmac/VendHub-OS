/**
 * Validation Rule Entity
 * Configurable validation rules for import data
 */

import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainType } from './import-session.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Validation Rule Type
 */
export enum ValidationRuleType {
  RANGE = 'range',
  REGEX = 'regex',
  ENUM = 'enum',
  REQUIRED = 'required',
  UNIQUE = 'unique',
  FOREIGN_KEY = 'foreign_key',
  CUSTOM = 'custom',
  LENGTH = 'length',
  FORMAT = 'format',
  CROSS_FIELD = 'cross_field',
}

/**
 * Validation Severity
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

// ============================================================================
// VALIDATION RULE ENTITY
// ============================================================================

/**
 * Validation Rule Entity
 * Defines configurable validation rules that are applied during
 * the import validation step. Rules are domain-specific and
 * executed in priority order.
 */
@Entity('validation_rules')
@Index(['domain', 'is_active'])
@Index(['rule_type'])
export class ValidationRule extends BaseEntity {
  @ApiProperty({ enum: DomainType, description: 'Target domain' })
  @Column({ type: 'enum', enum: DomainType })
  domain: DomainType;

  @ApiProperty({ description: 'Rule name' })
  @Column({ type: 'varchar', length: 100 })
  rule_name: string;

  @ApiPropertyOptional({ description: 'Rule description' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ enum: ValidationRuleType, description: 'Type of validation rule' })
  @Column({ type: 'enum', enum: ValidationRuleType })
  rule_type: ValidationRuleType;

  @ApiProperty({ description: 'Target field name' })
  @Column({ type: 'varchar', length: 100 })
  field_name: string;

  @ApiProperty({ description: 'Rule definition (depends on rule_type)' })
  @Column({ type: 'jsonb' })
  rule_definition: Record<string, any>;

  @ApiProperty({ enum: ValidationSeverity, description: 'Severity level', default: ValidationSeverity.ERROR })
  @Column({ type: 'enum', enum: ValidationSeverity, default: ValidationSeverity.ERROR })
  severity: ValidationSeverity;

  @ApiPropertyOptional({ description: 'Error message template with {{field}}, {{value}} placeholders' })
  @Column({ type: 'text', nullable: true })
  error_message_template: string | null;

  @ApiProperty({ description: 'Whether the rule is active', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({ description: 'Execution priority (lower runs first)', default: 0 })
  @Column({ type: 'integer', default: 0 })
  priority: number;
}
