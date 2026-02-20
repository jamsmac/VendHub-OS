/**
 * Leave Request Entity
 * Employee leave/vacation requests with approval workflow
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

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  BEREAVEMENT = 'bereavement',
  STUDY = 'study',
  OTHER = 'other',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

// ============================================================================
// LEAVE REQUEST ENTITY
// ============================================================================

@Entity('leave_requests')
@Index(['employeeId', 'status'])
@Index(['organizationId', 'status'])
@Index(['startDate', 'endDate'])
export class LeaveRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'enum', enum: LeaveType })
  leaveType: LeaveType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 5, scale: 1 })
  totalDays: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status: LeaveStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedById: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
