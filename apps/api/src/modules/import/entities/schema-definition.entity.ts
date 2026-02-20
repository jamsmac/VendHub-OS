/**
 * Schema Definition Entity
 * Defines target schemas for auto-classification and mapping
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
// INTERFACES
// ============================================================================

/**
 * Field Definition Interface
 * Describes a single field in a schema, including validation rules
 * and synonym matching for auto-classification.
 */
export interface FieldDefinition {
  /** DB column name */
  name: string;
  /** Human-readable display name */
  display_name: string;
  /** Data type */
  type: 'string' | 'number' | 'decimal' | 'integer' | 'boolean' | 'date' | 'datetime' | 'uuid' | 'enum' | 'jsonb';
  /** Whether the field is required */
  required: boolean;
  /** Alternate column names for auto-matching, e.g. ['product_name', 'item_name', 'название'] */
  synonyms: string[];
  /** Validation constraints */
  validation?: {
    min?: number;
    max?: number;
    min_length?: number;
    max_length?: number;
    pattern?: string;
    enum_values?: string[];
  };
  /** Default value if not provided */
  default_value?: any;
  /** Field description */
  description?: string;
}

// ============================================================================
// SCHEMA DEFINITION ENTITY
// ============================================================================

/**
 * Schema Definition Entity
 * Defines the expected schema for each import domain.
 * Field definitions include synonyms for auto-matching column headers
 * to target fields during classification.
 */
@Entity('schema_definitions')
@Index(['domain', 'table_name'], { unique: true })
export class SchemaDefinition extends BaseEntity {
  @ApiProperty({ enum: DomainType, description: 'Target domain' })
  @Column({ type: 'enum', enum: DomainType })
  domain: DomainType;

  @ApiProperty({ description: 'Database table name' })
  @Column({ type: 'varchar', length: 100 })
  table_name: string;

  @ApiProperty({ description: 'Human-readable display name' })
  @Column({ type: 'varchar', length: 100 })
  display_name: string;

  @ApiPropertyOptional({ description: 'Schema description' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Field definitions with types, synonyms, and validation' })
  @Column({ type: 'jsonb' })
  field_definitions: FieldDefinition[];

  @ApiPropertyOptional({ description: 'Table relationships' })
  @Column({ type: 'jsonb', nullable: true })
  relationships: Record<string, any>[] | null;

  @ApiProperty({ description: 'Required field names' })
  @Column({ type: 'jsonb' })
  required_fields: string[];

  @ApiProperty({ description: 'Unique field names' })
  @Column({ type: 'jsonb' })
  unique_fields: string[];

  @ApiProperty({ description: 'Schema version', default: '1.0' })
  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @ApiProperty({ description: 'Whether the schema is active', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
