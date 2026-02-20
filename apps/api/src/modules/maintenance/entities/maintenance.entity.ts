/**
 * Maintenance Module Entities
 * Extended maintenance workflow for vending machines
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Maintenance Request Status
 */
export enum MaintenanceStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  AWAITING_PARTS = 'awaiting_parts',
  COMPLETED = 'completed',
  VERIFIED = 'verified',
  CANCELLED = 'cancelled',
}

/**
 * Maintenance Type
 */
export enum MaintenanceType {
  PREVENTIVE = 'preventive',       // Плановое ТО
  CORRECTIVE = 'corrective',       // Ремонт после поломки
  PREDICTIVE = 'predictive',       // На основе мониторинга
  EMERGENCY = 'emergency',         // Аварийный ремонт
  INSPECTION = 'inspection',       // Осмотр/диагностика
  CALIBRATION = 'calibration',     // Калибровка
  CLEANING = 'cleaning',           // Глубокая чистка
  UPGRADE = 'upgrade',             // Модернизация
}

/**
 * Maintenance Priority
 */
export enum MaintenancePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Work Type for parts/labor
 */
export enum WorkType {
  DIAGNOSIS = 'diagnosis',
  REPAIR = 'repair',
  REPLACEMENT = 'replacement',
  CLEANING = 'cleaning',
  CALIBRATION = 'calibration',
  TESTING = 'testing',
  OTHER = 'other',
}

/**
 * Valid status transitions
 */
export const VALID_MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  [MaintenanceStatus.DRAFT]: [MaintenanceStatus.SUBMITTED, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.SUBMITTED]: [MaintenanceStatus.APPROVED, MaintenanceStatus.REJECTED, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.APPROVED]: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.REJECTED]: [MaintenanceStatus.DRAFT],
  [MaintenanceStatus.SCHEDULED]: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.AWAITING_PARTS, MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.AWAITING_PARTS]: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.COMPLETED]: [MaintenanceStatus.VERIFIED, MaintenanceStatus.IN_PROGRESS],
  [MaintenanceStatus.VERIFIED]: [],
  [MaintenanceStatus.CANCELLED]: [],
};

// ============================================================================
// MAINTENANCE REQUEST ENTITY
// ============================================================================

/**
 * Maintenance Request Entity
 * Represents a maintenance work order for a vending machine
 */
@Entity('maintenance_requests')
@Index(['organizationId', 'status'])
@Index(['machineId'])
@Index(['assignedTechnicianId'])
@Index(['scheduledDate'])
@Index(['priority'])
export class MaintenanceRequest extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ example: 'MNT-2025-001234', description: 'Request number' })
  @Column({ type: 'varchar', length: 50, unique: true })
  requestNumber: string;

  @ApiProperty({ enum: MaintenanceType })
  @Column({ type: 'enum', enum: MaintenanceType })
  maintenanceType: MaintenanceType;

  @ApiProperty({ enum: MaintenanceStatus })
  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.DRAFT })
  status: MaintenanceStatus;

  @ApiProperty({ enum: MaintenancePriority })
  @Column({ type: 'enum', enum: MaintenancePriority, default: MaintenancePriority.NORMAL })
  priority: MaintenancePriority;

  // Machine reference
  @ApiProperty({ description: 'Machine ID' })
  @Column({ type: 'uuid' })
  machineId: string;

  // Request details
  @ApiProperty({ description: 'Issue title' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiPropertyOptional({ description: 'Detailed description of issue' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiPropertyOptional({ description: 'Symptoms observed' })
  @Column({ type: 'jsonb', nullable: true })
  symptoms?: string[];

  @ApiPropertyOptional({ description: 'Error codes from machine' })
  @Column({ type: 'jsonb', nullable: true })
  errorCodes?: string[];

  // Assignment
  @ApiPropertyOptional({ description: 'Assigned technician ID' })
  @Column({ type: 'uuid', nullable: true })
  assignedTechnicianId?: string;

  @ApiProperty({ description: 'Request creator ID' })
  @Column({ type: 'uuid' })
  createdByUserId: string;

  // Scheduling
  @ApiPropertyOptional({ description: 'Scheduled date' })
  @Column({ type: 'timestamptz', nullable: true })
  scheduledDate?: Date;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @Column({ type: 'integer', nullable: true })
  estimatedDuration?: number;

  // Execution tracking
  @ApiPropertyOptional({ description: 'Started at' })
  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Completed at' })
  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Actual duration in minutes' })
  @Column({ type: 'integer', nullable: true })
  actualDuration?: number;

  // Approval tracking
  @ApiPropertyOptional({ description: 'Approved by user ID' })
  @Column({ type: 'uuid', nullable: true })
  approvedByUserId?: string;

  @ApiPropertyOptional({ description: 'Approved at' })
  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // Verification
  @ApiPropertyOptional({ description: 'Verified by user ID' })
  @Column({ type: 'uuid', nullable: true })
  verifiedByUserId?: string;

  @ApiPropertyOptional({ description: 'Verified at' })
  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  // Cost tracking
  @ApiPropertyOptional({ description: 'Estimated cost' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Actual labor cost' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  laborCost: number;

  @ApiPropertyOptional({ description: 'Actual parts cost' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  partsCost: number;

  @ApiPropertyOptional({ description: 'Total actual cost' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalCost: number;

  // Completion details
  @ApiPropertyOptional({ description: 'Completion notes' })
  @Column({ type: 'text', nullable: true })
  completionNotes?: string;

  @ApiPropertyOptional({ description: 'Root cause analysis' })
  @Column({ type: 'text', nullable: true })
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Actions taken' })
  @Column({ type: 'jsonb', nullable: true })
  actionsTaken?: string[];

  @ApiPropertyOptional({ description: 'Recommendations' })
  @Column({ type: 'text', nullable: true })
  recommendations?: string;

  // Photos
  @ApiProperty({ description: 'Has before photos' })
  @Column({ type: 'boolean', default: false })
  hasPhotosBefore: boolean;

  @ApiProperty({ description: 'Has after photos' })
  @Column({ type: 'boolean', default: false })
  hasPhotosAfter: boolean;

  @ApiPropertyOptional({ description: 'Photo URLs' })
  @Column({ type: 'jsonb', nullable: true })
  photos?: { type: 'before' | 'during' | 'after'; url: string; uploadedAt: Date }[];

  // SLA tracking
  @ApiPropertyOptional({ description: 'SLA due date' })
  @Column({ type: 'timestamptz', nullable: true })
  slaDueDate?: Date;

  @ApiProperty({ description: 'SLA breached' })
  @Column({ type: 'boolean', default: false })
  slaBreached: boolean;

  // Machine downtime
  @ApiPropertyOptional({ description: 'Machine downtime start' })
  @Column({ type: 'timestamptz', nullable: true })
  downtimeStart?: Date;

  @ApiPropertyOptional({ description: 'Machine downtime end' })
  @Column({ type: 'timestamptz', nullable: true })
  downtimeEnd?: Date;

  @ApiPropertyOptional({ description: 'Total downtime in minutes' })
  @Column({ type: 'integer', nullable: true })
  downtimeMinutes?: number;

  // Related task (if created from task)
  @ApiPropertyOptional({ description: 'Related task ID' })
  @Column({ type: 'uuid', nullable: true })
  relatedTaskId?: string;

  // Recurring maintenance
  @ApiPropertyOptional({ description: 'Is part of schedule' })
  @Column({ type: 'boolean', default: false })
  isScheduled: boolean;

  @ApiPropertyOptional({ description: 'Schedule ID' })
  @Column({ type: 'uuid', nullable: true })
  maintenanceScheduleId?: string;

  // Metadata
  @ApiPropertyOptional({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Relations
  @OneToMany(() => MaintenancePart, (part) => part.maintenanceRequest, { cascade: true })
  parts: MaintenancePart[];

  @OneToMany(() => MaintenanceWorkLog, (log) => log.maintenanceRequest, { cascade: true })
  workLogs: MaintenanceWorkLog[];

  // Generate request number
  @BeforeInsert()
  generateRequestNumber() {
    if (!this.requestNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const timestamp = date.getTime().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.requestNumber = `MNT-${year}-${timestamp}${random}`;
    }
  }

  // Computed: is overdue
  get isOverdue(): boolean {
    if (!this.slaDueDate) return false;
    if ([MaintenanceStatus.COMPLETED, MaintenanceStatus.VERIFIED, MaintenanceStatus.CANCELLED].includes(this.status)) {
      return false;
    }
    return new Date() > new Date(this.slaDueDate);
  }
}

// ============================================================================
// MAINTENANCE PART ENTITY
// ============================================================================

/**
 * Maintenance Part Entity
 * Parts used in maintenance
 */
@Entity('maintenance_parts')
@Index(['maintenanceRequestId'])
@Index(['productId'])
export class MaintenancePart extends BaseEntity {
  @ApiProperty({ description: 'Maintenance request ID' })
  @Column({ type: 'uuid' })
  maintenanceRequestId: string;

  @ManyToOne(() => MaintenanceRequest, (req) => req.parts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maintenance_request_id' })
  maintenanceRequest: MaintenanceRequest;

  @ApiProperty({ description: 'Product/Part ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ description: 'Part name' })
  @Column({ type: 'varchar', length: 255 })
  partName: string;

  @ApiPropertyOptional({ description: 'Part number/SKU' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  partNumber?: string;

  @ApiProperty({ description: 'Quantity needed' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantityNeeded: number;

  @ApiProperty({ description: 'Quantity used' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantityUsed: number;

  @ApiProperty({ description: 'Unit price' })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @ApiProperty({ description: 'Total price' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalPrice: number;

  @ApiProperty({ description: 'Part status' })
  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: 'pending' | 'ordered' | 'received' | 'installed' | 'returned';

  @ApiPropertyOptional({ description: 'Serial number of installed part' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Old part serial number (if replacing)' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  oldSerialNumber?: string;

  @ApiPropertyOptional({ description: 'Warranty until' })
  @Column({ type: 'date', nullable: true })
  warrantyUntil?: Date;

  @ApiPropertyOptional({ description: 'Notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;
}

// ============================================================================
// MAINTENANCE WORK LOG ENTITY
// ============================================================================

/**
 * Maintenance Work Log Entity
 * Time tracking for maintenance work
 */
@Entity('maintenance_work_logs')
@Index(['maintenanceRequestId'])
@Index(['technicianId'])
@Index(['workDate'])
export class MaintenanceWorkLog extends BaseEntity {
  @ApiProperty({ description: 'Maintenance request ID' })
  @Column({ type: 'uuid' })
  maintenanceRequestId: string;

  @ManyToOne(() => MaintenanceRequest, (req) => req.workLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'maintenance_request_id' })
  maintenanceRequest: MaintenanceRequest;

  @ApiProperty({ description: 'Technician ID' })
  @Column({ type: 'uuid' })
  technicianId: string;

  @ApiProperty({ enum: WorkType })
  @Column({ type: 'enum', enum: WorkType })
  workType: WorkType;

  @ApiProperty({ description: 'Work date' })
  @Column({ type: 'date' })
  workDate: Date;

  @ApiProperty({ description: 'Start time' })
  @Column({ type: 'time' })
  startTime: string;

  @ApiProperty({ description: 'End time' })
  @Column({ type: 'time' })
  endTime: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @Column({ type: 'integer' })
  durationMinutes: number;

  @ApiPropertyOptional({ description: 'Hourly rate' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Total labor cost' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  laborCost?: number;

  @ApiProperty({ description: 'Work description' })
  @Column({ type: 'text' })
  description: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Is billable' })
  @Column({ type: 'boolean', default: true })
  isBillable: boolean;
}

// ============================================================================
// MAINTENANCE SCHEDULE ENTITY
// ============================================================================

/**
 * Maintenance Schedule Entity
 * Recurring maintenance schedules
 */
@Entity('maintenance_schedules')
@Index(['organizationId'])
@Index(['machineId'])
@Index(['isActive'])
@Index(['nextDueDate'])
export class MaintenanceSchedule extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Schedule name' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: MaintenanceType })
  @Column({ type: 'enum', enum: MaintenanceType })
  maintenanceType: MaintenanceType;

  @ApiPropertyOptional({ description: 'Specific machine ID (null = all machines)' })
  @Column({ type: 'uuid', nullable: true })
  machineId?: string;

  @ApiPropertyOptional({ description: 'Machine model filter' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  machineModel?: string;

  // Frequency
  @ApiProperty({ description: 'Frequency type' })
  @Column({ type: 'varchar', length: 50 })
  frequencyType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'hours' | 'sales';

  @ApiProperty({ description: 'Frequency value' })
  @Column({ type: 'integer' })
  frequencyValue: number;

  @ApiPropertyOptional({ description: 'Days of week (for weekly)' })
  @Column({ type: 'jsonb', nullable: true })
  daysOfWeek?: number[]; // 0-6

  @ApiPropertyOptional({ description: 'Day of month (for monthly)' })
  @Column({ type: 'integer', nullable: true })
  dayOfMonth?: number;

  // Tracking
  @ApiPropertyOptional({ description: 'Last executed date' })
  @Column({ type: 'date', nullable: true })
  lastExecutedDate?: Date;

  @ApiPropertyOptional({ description: 'Next due date' })
  @Column({ type: 'date', nullable: true })
  nextDueDate?: Date;

  @ApiProperty({ description: 'Times executed' })
  @Column({ type: 'integer', default: 0 })
  timesExecuted: number;

  // Checklist template
  @ApiPropertyOptional({ description: 'Checklist items template' })
  @Column({ type: 'jsonb', nullable: true })
  checklistTemplate?: { item: string; required: boolean }[];

  // Estimated values
  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @Column({ type: 'integer', nullable: true })
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedCost?: number;

  // Notifications
  @ApiProperty({ description: 'Days before to notify' })
  @Column({ type: 'integer', default: 7 })
  notifyDaysBefore: number;

  @ApiProperty({ description: 'Auto-create request' })
  @Column({ type: 'boolean', default: false })
  autoCreateRequest: boolean;

  @ApiProperty({ description: 'Is active' })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Created by user ID' })
  @Column({ type: 'uuid' })
  createdByUserId: string;
}
