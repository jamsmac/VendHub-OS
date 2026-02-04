/**
 * Permission Entity
 *
 * Represents a granular permission in the RBAC system.
 * Permissions are defined as resource:action pairs (e.g., 'users:create', 'machines:read').
 */

import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('permissions')
@Index(['name'], { unique: true })
@Index(['resource', 'action'], { unique: true })
export class Permission extends BaseEntity {
  /**
   * Unique permission name in resource:action format
   * @example 'users:create', 'machines:read'
   */
  @ApiProperty({ example: 'users:create', description: 'Permission name in resource:action format' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /**
   * Resource this permission applies to
   * @example 'users', 'machines', 'reports'
   */
  @ApiProperty({ example: 'users', description: 'Resource this permission applies to' })
  @Column({ type: 'varchar', length: 100 })
  resource: string;

  /**
   * Action allowed on the resource
   * @example 'create', 'read', 'update', 'delete', 'manage'
   */
  @ApiProperty({ example: 'create', description: 'Action allowed on the resource' })
  @Column({ type: 'varchar', length: 50 })
  action: string;

  /**
   * Human-readable description of the permission
   */
  @ApiProperty({ example: 'Allows creating new users', description: 'Permission description', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  /**
   * Whether this permission is currently active
   */
  @ApiProperty({ example: true, description: 'Whether the permission is active' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
