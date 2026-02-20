import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

/**
 * VatRate Entity
 * VAT (НДС) rates applicable in Uzbekistan.
 * Used for fiscal calculations and tax compliance.
 */
@Entity("vat_rates")
@Index("IDX_vat_rates_code", ["code"], { unique: true })
@Index("IDX_vat_rates_is_active", ["isActive"])
@Index("IDX_vat_rates_is_default", ["isDefault"])
export class VatRate extends BaseEntity {
  @Column({ type: "varchar", length: 50, unique: true })
  code: string; // e.g. 'STANDARD', 'ZERO', 'EXEMPT'

  @Column({ type: "decimal", precision: 5, scale: 2 })
  rate: number; // e.g. 12.00, 0.00

  @Column({ type: "varchar", length: 255 })
  nameRu: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  nameUz: string | null;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "boolean", default: false })
  isDefault: boolean;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "date", nullable: true })
  effectiveFrom: Date | null;

  @Column({ type: "date", nullable: true })
  effectiveTo: Date | null;

  @Column({ type: "int", default: 0 })
  sortOrder: number;
}
