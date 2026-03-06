import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity("dividend_payments")
export class DividendPayment extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  investorProfileId: string;

  @Column({ type: "varchar", length: 20 })
  period: string;

  @Column({ type: "date" })
  paymentDate: Date;

  @Column({ type: "bigint" })
  amount: number;

  @Column({ type: "varchar", length: 50, default: "paid" })
  status: string;

  @Column({ type: "text", nullable: true })
  notes: string | null;
}
