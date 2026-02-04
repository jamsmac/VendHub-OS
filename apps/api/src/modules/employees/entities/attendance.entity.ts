/**
 * Attendance Entity
 * Employee attendance tracking with check-in/check-out and location
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

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
}

// ============================================================================
// ATTENDANCE ENTITY
// ============================================================================

@Entity('attendances')
@Index(['employeeId', 'date'], { unique: true })
@Index(['organizationId', 'date'])
@Index(['status'])
export class Attendance extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => Employee, { nullable: false })
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  checkIn: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  checkOut: Date | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  totalHours: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  overtimeHours: number | null;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'jsonb', nullable: true })
  checkInLocation: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  checkOutLocation: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
