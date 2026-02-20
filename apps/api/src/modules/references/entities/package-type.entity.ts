import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * PackageType Entity
 * Package types for goods in vending machines.
 * Used for inventory management and product classification.
 */
@Entity('package_types')
@Index('IDX_package_types_code', ['code'], { unique: true })
@Index('IDX_package_types_is_active', ['is_active'])
export class PackageType extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string; // 'BOX', 'BOTTLE', 'CAN', etc.

  @Column({ type: 'varchar', length: 255 })
  name_ru: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name_uz: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name_en: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
