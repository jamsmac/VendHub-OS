import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * IkpuCode Entity
 * Tax identification codes for goods in Uzbekistan.
 * Links products to MXIK classifiers and determines VAT rates
 * and mandatory marking requirements.
 */
@Entity('ikpu_codes')
@Index('IDX_ikpu_codes_code', ['code'], { unique: true })
@Index('IDX_ikpu_codes_mxik_code', ['mxik_code'])
@Index('IDX_ikpu_codes_is_active', ['is_active'])
@Index('IDX_ikpu_codes_is_marked', ['is_marked'])
export class IkpuCode extends BaseEntity {
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 500 })
  name_ru: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  name_uz: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mxik_code: string | null; // FK reference to goods_classifiers.code

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 12 })
  vat_rate: number;

  @Column({ type: 'boolean', default: false })
  is_marked: boolean; // requires mandatory marking

  @Column({ type: 'varchar', length: 20, nullable: true })
  package_code: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
