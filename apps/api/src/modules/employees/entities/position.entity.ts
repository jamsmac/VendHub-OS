/**
 * Position Entity
 * Job positions / titles within the organization
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Department } from './department.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum PositionLevel {
  INTERN = 'intern',
  JUNIOR = 'junior',
  MIDDLE = 'middle',
  SENIOR = 'senior',
  LEAD = 'lead',
  HEAD = 'head',
  DIRECTOR = 'director',
  C_LEVEL = 'c_level',
}

// ============================================================================
// POSITION ENTITY
// ============================================================================

@Entity('positions')
@Index(['organizationId'])
@Index(['code'], { unique: true })
export class Position extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ type: 'enum', enum: PositionLevel })
  level: PositionLevel;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  minSalary: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxSalary: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
