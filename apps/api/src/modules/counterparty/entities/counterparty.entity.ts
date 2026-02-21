/**
 * Counterparty Entities
 * Контрагенты, договоры и расчёты комиссий для рынка Узбекистана
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum CounterpartyType {
  CLIENT = "client",
  SUPPLIER = "supplier",
  PARTNER = "partner",
  LOCATION_OWNER = "location_owner",
}

export enum ContractStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  EXPIRED = "expired",
  TERMINATED = "terminated",
}

export enum CommissionType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
  TIERED = "tiered",
  HYBRID = "hybrid",
}

export enum CommissionFixedPeriod {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
}

export enum PaymentType {
  PREPAYMENT = "prepayment",
  POSTPAYMENT = "postpayment",
  ON_DELIVERY = "on_delivery",
}

export enum CommissionPaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export interface TieredCommissionTier {
  from: number; // Start of range (UZS)
  to: number | null; // End of range (UZS), null = unlimited
  rate: number; // Commission rate (%)
}

// ============================================================================
// COUNTERPARTY ENTITY (Контрагент)
// ============================================================================

@Entity("counterparties")
@Index(["organizationId"])
@Index(["inn"], { unique: true, where: '"deleted_at" IS NULL' })
@Index(["type"])
@Index(["isActive"])
export class Counterparty extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  shortName: string | null;

  @Column({ type: "enum", enum: CounterpartyType })
  type: CounterpartyType;

  // Uzbekistan tax identifiers
  @Column({ type: "varchar", length: 9 })
  inn: string; // ИНН: 9 digits (Uzbekistan)

  @Column({ type: "varchar", length: 20, nullable: true })
  oked: string | null; // ОКЭД: economic activity code

  // Banking details (Uzbekistan)
  @Column({ type: "varchar", length: 5, nullable: true })
  mfo: string | null; // МФО: 5 digits (bank code)

  @Column({ type: "varchar", length: 50, nullable: true })
  bankAccount: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  bankName: string | null;

  // Addresses
  @Column({ type: "text", nullable: true })
  legalAddress: string | null;

  @Column({ type: "text", nullable: true })
  actualAddress: string | null;

  // Contact information
  @Column({ type: "varchar", length: 100, nullable: true })
  contactPerson: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  email: string | null;

  // Director information
  @Column({ type: "varchar", length: 255, nullable: true })
  directorName: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  directorPosition: string | null;

  // VAT (НДС: 15% in Uzbekistan)
  @Column({ type: "boolean", default: true })
  isVatPayer: boolean;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 15.0 })
  vatRate: number;

  // Payment terms
  @Column({ type: "int", nullable: true })
  paymentTermDays: number | null;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  creditLimit: number | null; // UZS

  // Status
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  // Relations
  @OneToMany(() => Contract, (contract) => contract.counterparty, {
    cascade: true,
  })
  contracts: Contract[];
}

// ============================================================================
// CONTRACT ENTITY (Договор)
// ============================================================================

@Entity("contracts")
@Index(["organizationId"])
@Index(["counterpartyId"])
@Index(["status"])
@Index(["contractNumber"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Contract extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 50 })
  contractNumber: string;

  @Column({ type: "date" })
  startDate: Date;

  @Column({ type: "date", nullable: true })
  endDate: Date | null;

  @Column({
    type: "enum",
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus;

  // Counterparty relation
  @Column({ type: "uuid" })
  counterpartyId: string;

  @ManyToOne(() => Counterparty, (counterparty) => counterparty.contracts, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "counterparty_id" })
  counterparty: Counterparty;

  // Commission configuration
  @Column({
    type: "enum",
    enum: CommissionType,
    default: CommissionType.PERCENTAGE,
  })
  commissionType: CommissionType;

  // PERCENTAGE type
  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  commissionRate: number | null;

  // FIXED type
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  commissionFixedAmount: number | null; // UZS

  @Column({
    type: "enum",
    enum: CommissionFixedPeriod,
    nullable: true,
  })
  commissionFixedPeriod: CommissionFixedPeriod | null;

  // TIERED type
  @Column({ type: "jsonb", nullable: true })
  commissionTiers: TieredCommissionTier[] | null;

  // HYBRID type (fixed + percentage)
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  commissionHybridFixed: number | null; // UZS

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  commissionHybridRate: number | null;

  // Currency (always UZS)
  @Column({ type: "varchar", length: 3, default: "UZS" })
  currency: string;

  // Payment terms
  @Column({ type: "int", default: 30 })
  paymentTermDays: number;

  @Column({ type: "enum", enum: PaymentType, default: PaymentType.POSTPAYMENT })
  paymentType: PaymentType;

  // Additional conditions
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  minimumMonthlyRevenue: number | null; // UZS

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  penaltyRate: number | null; // % per day

  @Column({ type: "text", nullable: true })
  specialConditions: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "uuid", nullable: true })
  contractFileId: string | null;

  // Relations
  @OneToMany(() => CommissionCalculation, (calc) => calc.contract)
  commissionCalculations: CommissionCalculation[];

  isCurrentlyActive(): boolean {
    if (this.status !== ContractStatus.ACTIVE) return false;
    const now = new Date();
    if (now < new Date(this.startDate)) return false;
    if (this.endDate && now > new Date(this.endDate)) return false;
    return true;
  }
}

// ============================================================================
// COMMISSION CALCULATION ENTITY
// ============================================================================

@Entity("commission_calculations")
@Index(["organizationId"])
@Index(["contractId"])
@Index(["paymentStatus"])
@Index(["periodStart", "periodEnd"])
export class CommissionCalculation extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  contractId: string;

  @ManyToOne(() => Contract, (contract) => contract.commissionCalculations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "contract_id" })
  contract: Contract;

  // Period
  @Column({ type: "date" })
  periodStart: Date;

  @Column({ type: "date" })
  periodEnd: Date;

  // Revenue data (UZS)
  @Column({ type: "decimal", precision: 15, scale: 2 })
  totalRevenue: number;

  @Column({ type: "int", default: 0 })
  transactionCount: number;

  // Commission
  @Column({ type: "decimal", precision: 15, scale: 2 })
  commissionAmount: number;

  @Column({ type: "varchar", length: 20 })
  commissionType: string; // Type at time of calculation

  @Column({ type: "jsonb", nullable: true })
  calculationDetails: Record<string, unknown> | null;

  // Payment
  @Column({
    type: "enum",
    enum: CommissionPaymentStatus,
    default: CommissionPaymentStatus.PENDING,
  })
  paymentStatus: CommissionPaymentStatus;

  @Column({ type: "date", nullable: true })
  paymentDueDate: Date | null;

  @Column({ type: "date", nullable: true })
  paymentDate: Date | null;

  @Column({ type: "uuid", nullable: true })
  paymentTransactionId: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "uuid", nullable: true })
  calculatedByUserId: string | null;

  isOverdue(): boolean {
    if (
      this.paymentStatus === CommissionPaymentStatus.PAID ||
      !this.paymentDueDate
    )
      return false;
    return new Date() > new Date(this.paymentDueDate);
  }
}
