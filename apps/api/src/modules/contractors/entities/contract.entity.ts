/**
 * Contract & CommissionCalculation Entities
 * Contract management for contractors with commission calculation support
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Contractor } from './contractor.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum ContractStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum CommissionType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  TIERED = 'tiered',
  HYBRID = 'hybrid',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

// ============================================================================
// COMMISSION TIER INTERFACE
// ============================================================================

export interface CommissionTier {
  minRevenue: number;
  maxRevenue: number | null;
  rate: number;
}

// ============================================================================
// CONTRACT ENTITY
// ============================================================================

@Entity('contracts')
@Index(['organizationId'])
@Index(['contractorId'])
@Index(['status'])
@Index(['contractNumber'], { unique: true, where: '"deleted_at" IS NULL' })
export class Contract extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  contractorId: string;

  @Column({ length: 50 })
  contractNumber: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus;

  @Column({
    type: 'enum',
    enum: CommissionType,
    default: CommissionType.PERCENTAGE,
  })
  commissionType: CommissionType;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  commissionFixedAmount: number;

  @Column({ length: 20, nullable: true })
  commissionFixedPeriod: string;

  @Column({ type: 'jsonb', nullable: true })
  commissionTiers: CommissionTier[];

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  commissionHybridFixed: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commissionHybridRate: number;

  @Column({ length: 3, default: 'UZS' })
  currency: string;

  @Column({ type: 'int', default: 30 })
  paymentTermDays: number;

  @Column({ length: 50, nullable: true })
  paymentType: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  minimumMonthlyRevenue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  penaltyRate: number;

  @Column({ type: 'text', nullable: true })
  specialConditions: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  contractFileId: string;

  // Relations
  @ManyToOne(() => Contractor, c => c.contracts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractor_id' })
  contractor: Contractor;

  @OneToMany(() => CommissionCalculation, cc => cc.contract)
  commissionCalculations: CommissionCalculation[];

  // Computed
  get isCurrentlyActive(): boolean {
    if (this.status !== ContractStatus.ACTIVE) return false;
    const now = new Date();
    const start = new Date(this.startDate);
    if (now < start) return false;
    if (this.endDate) {
      const end = new Date(this.endDate);
      if (now > end) return false;
    }
    return true;
  }
}

// ============================================================================
// COMMISSION CALCULATION ENTITY
// ============================================================================

@Entity('commission_calculations')
@Index(['organizationId'])
@Index(['contractId'])
@Index(['periodStart', 'periodEnd'])
@Index(['paymentStatus'])
export class CommissionCalculation extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  contractId: string;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalRevenue: number;

  @Column({ type: 'int' })
  transactionCount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  commissionAmount: number;

  @Column({
    type: 'enum',
    enum: CommissionType,
  })
  commissionType: CommissionType;

  @Column({ type: 'jsonb', nullable: true })
  calculationDetails: {
    tierBreakdown?: { tier: number; amount: number; rate: number; commission: number }[];
    deductions?: { reason: string; amount: number }[];
    baseRate?: number;
    fixedAmount?: number;
    hybridFixed?: number;
    hybridRate?: number;
  };

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'date', nullable: true })
  paymentDueDate: Date;

  @Column({ type: 'date', nullable: true })
  paymentDate: Date;

  @Column({ type: 'uuid', nullable: true })
  paymentTransactionId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  calculatedByUserId: string;

  // Relations
  @ManyToOne(() => Contract, c => c.commissionCalculations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;
}
