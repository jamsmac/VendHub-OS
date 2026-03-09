/**
 * BankDeposit Entity
 * Записи о внесении наличных в банк
 * balance = SUM(collections.amount WHERE received) - SUM(bank_deposits.amount)
 */

import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity("bank_deposits")
@Index(["organizationId"])
@Index(["depositDate"])
export class BankDeposit extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount: number;

  @Column({ type: "date" })
  depositDate: Date;

  @Column({ type: "text", nullable: true })
  notes: string | null;
}
