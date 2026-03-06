import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity("investor_profiles")
export class InvestorProfile extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  sharePercent: number;

  @Column({ type: "bigint", default: 0 })
  totalInvested: number;

  @Column({ type: "int", nullable: true })
  paybackMonths: number | null;

  @Column({ type: "varchar", length: 50, default: "active" })
  status: string;

  @Column({ type: "text", nullable: true })
  notes: string | null;
}
