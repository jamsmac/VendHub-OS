/**
 * Role Entity
 *
 * Represents a dynamic role in the RBAC system.
 * Roles can be global (organizationId = null) or scoped to an organization.
 * System roles (isSystem = true) cannot be deleted.
 */

import { Entity, Column, Index, ManyToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Permission } from './permission.entity';

@Entity('roles')
@Index(['name', 'organizationId'], { unique: true })
@Index(['organizationId'])
@Index(['isSystem'])
export class Role extends BaseEntity {
  /**
   * Role name, unique per organization
   * @example 'admin', 'manager', 'custom_role'
   */
  @ApiProperty({ example: 'admin', description: 'Unique role name within organization' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /**
   * Human-readable description of the role
   */
  @ApiProperty({ example: 'Full organization access', description: 'Role description', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  /**
   * Whether this role is currently active
   */
  @ApiProperty({ example: true, description: 'Whether the role is active' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * System roles cannot be deleted or renamed
   */
  @ApiProperty({ example: false, description: 'System roles cannot be deleted' })
  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  /**
   * Organization this role belongs to. Null means global role.
   */
  @ApiProperty({ example: null, description: 'Organization ID (null = global role)', nullable: true })
  @Column({ type: 'uuid', nullable: true })
  organizationId: string;

  /**
   * Role hierarchy level. Higher level = more permissions.
   * Used for role hierarchy checks.
   */
  @ApiProperty({ example: 90, description: 'Role hierarchy level (higher = more permissions)' })
  @Column({ type: 'int', default: 0 })
  level: number;

  /**
   * Permissions assigned to this role via junction table
   */
  @ManyToMany(() => Permission, { eager: false })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
