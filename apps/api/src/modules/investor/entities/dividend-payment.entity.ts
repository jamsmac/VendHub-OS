import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";
import { Organization } from "../../organizations/entities/organization.entity";
import { InvestorProfile } from "./investor-profile.entity";

@Entity("dividend_payments")
export class DividendPayment extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: "CASCADE" })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ type: "uuid" })
  investorProfileId: string;

  @ManyToOne(() => InvestorProfile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "investor_profile_id" })
  investorProfile: InvestorProfile;

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
