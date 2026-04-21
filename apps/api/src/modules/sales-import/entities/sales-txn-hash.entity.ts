import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { SalesImport } from "./sales-import.entity";

/**
 * Dedup index: one row per "dedup key" (row hash L1 or txn hash L2).
 * Organization-scoped. Used to detect re-uploads across imports.
 */
@Entity("sales_txn_hashes")
@Index(["organizationId", "hashKey"], { unique: true })
@Index(["salesImportId"])
export class SalesTxnHash extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  /** DJB2 hash of dedup key (row-level or txn-level) */
  @Column({ type: "varchar", length: 64 })
  hashKey: string;

  @Column({ type: "uuid" })
  salesImportId: string;

  @ManyToOne(() => SalesImport, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sales_import_id" })
  salesImport: SalesImport;
}
