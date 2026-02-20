import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * GoodsClassifier Entity
 * MXIK commodity classification codes from Uzbekistan tax system (Soliq.uz).
 * Used for fiscal receipt generation and tax compliance.
 */
@Entity("goods_classifiers")
@Index("IDX_goods_classifiers_code", ["code"], { unique: true })
@Index("IDX_goods_classifiers_group_code", ["groupCode"])
@Index("IDX_goods_classifiers_parent_code", ["parentCode"])
@Index("IDX_goods_classifiers_is_active", ["isActive"])
export class GoodsClassifier extends BaseEntity {
  @Column({ type: "varchar", length: 20, unique: true })
  code: string; // MXIK code like '10820001001000000'

  @Column({ type: "varchar", length: 500 })
  nameRu: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  nameUz: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  nameEn: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  groupCode: string | null; // e.g. '108'

  @Column({ type: "varchar", length: 500, nullable: true })
  groupName: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  subgroupCode: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  subgroupName: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  parentCode: string | null; // parent MXIK code for hierarchy

  @Column({ type: "int", default: 0 })
  level: number; // hierarchy depth (1-5)

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null; // extra info from Soliq.uz
}
