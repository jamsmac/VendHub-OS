import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * IkpuCode Entity
 * Tax identification codes for goods in Uzbekistan.
 * Links products to MXIK classifiers and determines VAT rates
 * and mandatory marking requirements.
 */
@Entity("ikpu_codes")
@Index("IDX_ikpu_codes_code", ["code"], { unique: true })
@Index("IDX_ikpu_codes_mxik_code", ["mxikCode"])
@Index("IDX_ikpu_codes_is_active", ["isActive"])
@Index("IDX_ikpu_codes_is_marked", ["isMarked"])
export class IkpuCode extends BaseEntity {
  @Column({ type: "varchar", length: 20, unique: true })
  code: string;

  @Column({ type: "varchar", length: 500 })
  nameRu: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  nameUz: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  mxikCode: string | null; // FK reference to goods_classifiers.code

  @Column({ type: "decimal", precision: 5, scale: 2, default: 12 })
  vatRate: number;

  @Column({ type: "boolean", default: false })
  isMarked: boolean; // requires mandatory marking

  @Column({ type: "varchar", length: 20, nullable: true })
  packageCode: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;
}
