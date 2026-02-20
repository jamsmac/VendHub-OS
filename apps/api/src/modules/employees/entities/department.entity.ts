/**
 * Department Entity
 * Departments / organizational units within an organization
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('departments')
@Index(['organizationId'])
@Index(['code'], { unique: true })
@Index(['parentDepartmentId'])
export class Department extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  managerId: string | null;

  @Column({ type: 'uuid', nullable: true })
  parentDepartmentId: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // ============================================================================
  // RELATIONS
  // ============================================================================

  @ManyToOne(() => Department, (department) => department.subDepartments, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_department_id' })
  parentDepartment: Department;

  @OneToMany(() => Department, (department) => department.parentDepartment)
  subDepartments: Department[];
}
