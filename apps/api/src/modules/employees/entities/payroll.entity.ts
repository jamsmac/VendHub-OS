/**
 * Payroll Entity
 * Employee payroll records with salary components and approval workflow
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum PayrollStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

// ============================================================================
// PAYROLL ENTITY
// ============================================================================

@Entity('payrolls')
@Index(['employeeId', 'periodStart'], { unique: true })
@Index(['organizationId', 'status'])
@Index(['periodStart', 'periodEnd'])
export class Payroll extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  // ============================================================================
  // SALARY COMPONENTS
  // ============================================================================

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  baseSalary: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  overtimePay: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  bonuses: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  deductions: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  netSalary: number;

  @Column({ type: 'varchar', length: 10, default: 'UZS' })
  currency: string;

  // ============================================================================
  // STATUS & APPROVAL
  // ============================================================================

  @Column({
    type: 'enum',
    enum: PayrollStatus,
    default: PayrollStatus.DRAFT,
  })
  status: PayrollStatus;

  @Column({ type: 'timestamp with time zone', nullable: true })
  calculatedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  approvedById: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReference: string | null;

  // ============================================================================
  // WORKING DETAILS
  // ============================================================================

  @Column({ type: 'integer' })
  workingDays: number;

  @Column({ type: 'integer' })
  workedDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overtimeHours: number;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
