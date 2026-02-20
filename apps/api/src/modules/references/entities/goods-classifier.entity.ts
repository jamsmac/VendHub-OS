import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * GoodsClassifier Entity
 * MXIK commodity classification codes from Uzbekistan tax system (Soliq.uz).
 * Used for fiscal receipt generation and tax compliance.
 */
@Entity('goods_classifiers')
@Index('IDX_goods_classifiers_code', ['code'], { unique: true })
@Index('IDX_goods_classifiers_group_code', ['group_code'])
@Index('IDX_goods_classifiers_parent_code', ['parent_code'])
@Index('IDX_goods_classifiers_is_active', ['is_active'])
export class GoodsClassifier extends BaseEntity {
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string; // MXIK code like '10820001001000000'

  @Column({ type: 'varchar', length: 500 })
  name_ru: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  name_uz: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  name_en: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  group_code: string | null; // e.g. '108'

  @Column({ type: 'varchar', length: 500, nullable: true })
  group_name: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  subgroup_code: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subgroup_name: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  parent_code: string | null; // parent MXIK code for hierarchy

  @Column({ type: 'int', default: 0 })
  level: number; // hierarchy depth (1-5)

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // extra info from Soliq.uz
}
