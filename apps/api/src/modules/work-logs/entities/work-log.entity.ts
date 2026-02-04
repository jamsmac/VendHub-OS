/**
 * Work Logs Module Entities
 * Time tracking for employees
 */

import {
  Entity,
  Column,
  Index,
  BeforeInsert,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Work Log Status
 */
export enum WorkLogStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

/**
 * Work Type
 */
export enum WorkLogType {
  REGULAR = 'regular',         // Обычная работа
  OVERTIME = 'overtime',       // Сверхурочная работа
  WEEKEND = 'weekend',         // Работа в выходные
  HOLIDAY = 'holiday',         // Работа в праздники
  NIGHT_SHIFT = 'night_shift', // Ночная смена
  ON_CALL = 'on_call',         // Дежурство
  TRAVEL = 'travel',           // Время в пути
  TRAINING = 'training',       // Обучение
}

/**
 * Activity Type
 */
export enum ActivityType {
  REFILL = 'refill',
  COLLECTION = 'collection',
  MAINTENANCE = 'maintenance',
  REPAIR = 'repair',
  INSPECTION = 'inspection',
  CLEANING = 'cleaning',
  INSTALLATION = 'installation',
  DELIVERY = 'delivery',
  OFFICE = 'office',
  MEETING = 'meeting',
  TRAVEL = 'travel',
  OTHER = 'other',
}

/**
 * Time Off Type
 */
export enum TimeOffType {
  VACATION = 'vacation',
  SICK_LEAVE = 'sick_leave',
  PERSONAL = 'personal',
  UNPAID = 'unpaid',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  BEREAVEMENT = 'bereavement',
  JURY_DUTY = 'jury_duty',
  MILITARY = 'military',
  OTHER = 'other',
}

/**
 * Time Off Status
 */
export enum TimeOffStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

// ============================================================================
// WORK LOG ENTITY
// ============================================================================

/**
 * Work Log Entity
 * Tracks individual work entries
 */
@Entity('work_logs')
@Index(['organizationId', 'employeeId'])
@Index(['organizationId', 'workDate'])
@Index(['employeeId', 'workDate'])
@Index(['status'])
export class WorkLog extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Employee ID' })
  @Column({ type: 'uuid' })
  @Index()
  employeeId: string;

  @ApiProperty({ description: 'Work date' })
  @Column({ type: 'date' })
  @Index()
  workDate: Date;

  @ApiProperty({ enum: WorkLogType })
  @Column({ type: 'enum', enum: WorkLogType, default: WorkLogType.REGULAR })
  workType: WorkLogType;

  @ApiProperty({ enum: ActivityType })
  @Column({ type: 'enum', enum: ActivityType })
  activityType: ActivityType;

  @ApiProperty({ enum: WorkLogStatus })
  @Column({ type: 'enum', enum: WorkLogStatus, default: WorkLogStatus.DRAFT })
  status: WorkLogStatus;

  // Time tracking
  @ApiProperty({ description: 'Clock in time' })
  @Column({ type: 'time' })
  clockIn: string;

  @ApiProperty({ description: 'Clock out time' })
  @Column({ type: 'time' })
  clockOut: string;

  @ApiProperty({ description: 'Break duration in minutes' })
  @Column({ type: 'integer', default: 0 })
  breakMinutes: number;

  @ApiProperty({ description: 'Total worked minutes' })
  @Column({ type: 'integer' })
  workedMinutes: number;

  @ApiProperty({ description: 'Overtime minutes' })
  @Column({ type: 'integer', default: 0 })
  overtimeMinutes: number;

  // Location
  @ApiPropertyOptional({ description: 'Check-in latitude' })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  checkInLatitude?: number;

  @ApiPropertyOptional({ description: 'Check-in longitude' })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  checkInLongitude?: number;

  @ApiPropertyOptional({ description: 'Check-out latitude' })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  checkOutLatitude?: number;

  @ApiPropertyOptional({ description: 'Check-out longitude' })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  checkOutLongitude?: number;

  // References
  @ApiPropertyOptional({ description: 'Task ID (if related to task)' })
  @Column({ type: 'uuid', nullable: true })
  taskId?: string;

  @ApiPropertyOptional({ description: 'Machine ID (if machine-related)' })
  @Column({ type: 'uuid', nullable: true })
  machineId?: string;

  @ApiPropertyOptional({ description: 'Maintenance request ID' })
  @Column({ type: 'uuid', nullable: true })
  maintenanceRequestId?: string;

  // Description
  @ApiProperty({ description: 'Work description' })
  @Column({ type: 'text' })
  description: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Payment calculation
  @ApiPropertyOptional({ description: 'Hourly rate' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Overtime rate multiplier' })
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.5 })
  overtimeMultiplier: number;

  @ApiPropertyOptional({ description: 'Calculated pay amount' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  payAmount?: number;

  // Approval
  @ApiPropertyOptional({ description: 'Approved by user ID' })
  @Column({ type: 'uuid', nullable: true })
  approvedByUserId?: string;

  @ApiPropertyOptional({ description: 'Approved at' })
  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // Metadata
  @ApiPropertyOptional({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Calculate worked minutes before save
  calculateWorkedMinutes(): void {
    if (this.clockIn && this.clockOut) {
      const [inHour, inMin] = this.clockIn.split(':').map(Number);
      const [outHour, outMin] = this.clockOut.split(':').map(Number);

      let totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
      if (totalMinutes < 0) {
        totalMinutes += 24 * 60; // Handle overnight shifts
      }

      this.workedMinutes = Math.max(0, totalMinutes - this.breakMinutes);
    }
  }

  // Calculate pay amount
  calculatePayAmount(): void {
    if (this.hourlyRate) {
      const regularHours = Math.min(this.workedMinutes, 8 * 60) / 60;
      const overtimeHours = this.overtimeMinutes / 60;

      const regularPay = regularHours * Number(this.hourlyRate);
      const overtimePay = overtimeHours * Number(this.hourlyRate) * Number(this.overtimeMultiplier);

      this.payAmount = regularPay + overtimePay;
    }
  }
}

// ============================================================================
// TIME OFF REQUEST ENTITY
// ============================================================================

/**
 * Time Off Request Entity
 * Tracks employee time off requests
 */
@Entity('time_off_requests')
@Index(['organizationId', 'employeeId'])
@Index(['startDate', 'endDate'])
@Index(['status'])
export class TimeOffRequest extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ example: 'TOR-2025-001', description: 'Request number' })
  @Column({ type: 'varchar', length: 50, unique: true })
  requestNumber: string;

  @ApiProperty({ description: 'Employee ID' })
  @Column({ type: 'uuid' })
  @Index()
  employeeId: string;

  @ApiProperty({ enum: TimeOffType })
  @Column({ type: 'enum', enum: TimeOffType })
  timeOffType: TimeOffType;

  @ApiProperty({ enum: TimeOffStatus })
  @Column({ type: 'enum', enum: TimeOffStatus, default: TimeOffStatus.PENDING })
  status: TimeOffStatus;

  @ApiProperty({ description: 'Start date' })
  @Column({ type: 'date' })
  startDate: Date;

  @ApiProperty({ description: 'End date' })
  @Column({ type: 'date' })
  endDate: Date;

  @ApiProperty({ description: 'Total days' })
  @Column({ type: 'integer' })
  totalDays: number;

  @ApiProperty({ description: 'Is half day start' })
  @Column({ type: 'boolean', default: false })
  halfDayStart: boolean;

  @ApiProperty({ description: 'Is half day end' })
  @Column({ type: 'boolean', default: false })
  halfDayEnd: boolean;

  @ApiPropertyOptional({ description: 'Reason' })
  @Column({ type: 'text', nullable: true })
  reason?: string;

  @ApiPropertyOptional({ description: 'Supporting document URLs' })
  @Column({ type: 'jsonb', nullable: true })
  documents?: string[];

  // Approval
  @ApiPropertyOptional({ description: 'Approved by user ID' })
  @Column({ type: 'uuid', nullable: true })
  approvedByUserId?: string;

  @ApiPropertyOptional({ description: 'Approved at' })
  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @BeforeInsert()
  generateRequestNumber() {
    if (!this.requestNumber) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.requestNumber = `TOR-${year}-${random}`;
    }
  }
}

// ============================================================================
// TIMESHEET ENTITY
// ============================================================================

/**
 * Timesheet Entity
 * Aggregates work logs for a period
 */
@Entity('timesheets')
@Index(['organizationId', 'employeeId'])
@Index(['periodStart', 'periodEnd'])
@Index(['status'])
export class Timesheet extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ example: 'TS-2025-01-001', description: 'Timesheet number' })
  @Column({ type: 'varchar', length: 50, unique: true })
  timesheetNumber: string;

  @ApiProperty({ description: 'Employee ID' })
  @Column({ type: 'uuid' })
  @Index()
  employeeId: string;

  @ApiProperty({ description: 'Period start date' })
  @Column({ type: 'date' })
  periodStart: Date;

  @ApiProperty({ description: 'Period end date' })
  @Column({ type: 'date' })
  periodEnd: Date;

  @ApiProperty({ description: 'Status' })
  @Column({ type: 'varchar', length: 50, default: 'draft' })
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

  // Totals
  @ApiProperty({ description: 'Total worked days' })
  @Column({ type: 'integer', default: 0 })
  totalWorkedDays: number;

  @ApiProperty({ description: 'Total worked hours' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalWorkedHours: number;

  @ApiProperty({ description: 'Total overtime hours' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalOvertimeHours: number;

  @ApiProperty({ description: 'Total time off days' })
  @Column({ type: 'integer', default: 0 })
  totalTimeOffDays: number;

  @ApiProperty({ description: 'Total sick days' })
  @Column({ type: 'integer', default: 0 })
  totalSickDays: number;

  // Payment
  @ApiPropertyOptional({ description: 'Regular pay' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  regularPay: number;

  @ApiPropertyOptional({ description: 'Overtime pay' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  overtimePay: number;

  @ApiPropertyOptional({ description: 'Deductions' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  deductions: number;

  @ApiPropertyOptional({ description: 'Total pay' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPay: number;

  // Daily breakdown
  @ApiPropertyOptional({ description: 'Daily summary' })
  @Column({ type: 'jsonb', nullable: true })
  dailySummary?: {
    date: string;
    workedHours: number;
    overtimeHours: number;
    status: 'worked' | 'time_off' | 'sick' | 'holiday' | 'weekend';
  }[];

  // Approval
  @ApiPropertyOptional({ description: 'Submitted at' })
  @Column({ type: 'timestamptz', nullable: true })
  submittedAt?: Date;

  @ApiPropertyOptional({ description: 'Approved by user ID' })
  @Column({ type: 'uuid', nullable: true })
  approvedByUserId?: string;

  @ApiPropertyOptional({ description: 'Approved at' })
  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @ApiPropertyOptional({ description: 'Paid at' })
  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'Notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @BeforeInsert()
  generateTimesheetNumber() {
    if (!this.timesheetNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.timesheetNumber = `TS-${year}-${month}-${random}`;
    }
  }
}
