/**
 * Machine Access Entities for VendHub OS
 * Управление доступом к автоматам
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

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Роль доступа к автомату
 */
export enum MachineAccessRole {
  FULL = 'full',
  REFILL = 'refill',
  COLLECTION = 'collection',
  MAINTENANCE = 'maintenance',
  VIEW = 'view',
}

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * Доступ к автомату
 */
@Entity('machine_access')
@Index(['organization_id'])
@Index(['machine_id'])
@Index(['user_id'])
@Index('UQ_machine_access_machine_user', ['machine_id', 'user_id'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class MachineAccess extends BaseEntity {
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'uuid' })
  machine_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: MachineAccessRole,
    default: MachineAccessRole.VIEW,
  })
  role: MachineAccessRole;

  @Column({ type: 'uuid' })
  granted_by_user_id: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  valid_from: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  valid_to: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}

/**
 * Шаблон доступа
 */
@Entity('access_templates')
@Index(['organization_id'])
@Index('UQ_access_templates_name_org', ['name', 'organization_id'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class AccessTemplate extends BaseEntity {
  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // ===== Relations =====

  @OneToMany(() => AccessTemplateRow, (row) => row.template, { cascade: true })
  rows: AccessTemplateRow[];
}

/**
 * Строка шаблона доступа
 */
@Entity('access_template_rows')
@Index(['template_id'])
export class AccessTemplateRow extends BaseEntity {
  @Column({ type: 'uuid' })
  template_id: string;

  @Column({
    type: 'enum',
    enum: MachineAccessRole,
  })
  role: MachineAccessRole;

  @Column({ type: 'jsonb', default: {} })
  permissions: Record<string, any>;

  // ===== Relations =====

  @ManyToOne(() => AccessTemplate, (template) => template.rows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: AccessTemplate;
}
