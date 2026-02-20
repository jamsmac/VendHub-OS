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
import { Organization } from '../../organizations/entities/organization.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { User } from '../../users/entities/user.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Task Types
 */
export enum TaskType {
  // Basic operations
  REFILL = 'refill',                    // Stock replenishment
  COLLECTION = 'collection',            // Cash collection
  CLEANING = 'cleaning',                // Machine cleaning/washing
  REPAIR = 'repair',                    // Repair/maintenance
  INSTALL = 'install',                  // Machine installation
  REMOVAL = 'removal',                  // Machine removal/decommission
  AUDIT = 'audit',                      // Inventory audit
  INSPECTION = 'inspection',            // Machine inspection

  // Component replacement
  REPLACE_HOPPER = 'replace_hopper',    // Hopper replacement
  REPLACE_GRINDER = 'replace_grinder',  // Grinder replacement
  REPLACE_BREW_UNIT = 'replace_brew_unit', // Brew unit replacement
  REPLACE_MIXER = 'replace_mixer',      // Mixer replacement
}

/**
 * Task Status
 */
export enum TaskStatus {
  PENDING = 'pending',          // Awaiting assignment
  ASSIGNED = 'assigned',        // Assigned to operator
  IN_PROGRESS = 'in_progress',  // Being executed
  COMPLETED = 'completed',      // Successfully completed
  REJECTED = 'rejected',        // Rejected by admin (rollback done)
  POSTPONED = 'postponed',      // Postponed by operator
  CANCELLED = 'cancelled',      // Cancelled
}

/**
 * Task Priority
 */
export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Component Role for replacement tasks
 */
export enum ComponentRole {
  OLD = 'old',        // Component being removed
  NEW = 'new',        // Component being installed
  TARGET = 'target',  // Target component (for inspection)
}

/**
 * Valid status transitions
 */
export const VALID_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.POSTPONED, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.POSTPONED, TaskStatus.CANCELLED],
  [TaskStatus.POSTPONED]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [TaskStatus.REJECTED],
  [TaskStatus.CANCELLED]: [],
  [TaskStatus.REJECTED]: [],
};

// ============================================================================
// TASK ENTITY
// ============================================================================

/**
 * Task Entity
 * Represents a work task for vending machine operations
 */
@Entity('tasks')
@Index(['organizationId', 'status'])
@Index(['organizationId', 'typeCode', 'status'])
@Index(['machineId'])
@Index(['assignedToUserId'])
@Index(['createdByUserId'])
@Index(['dueDate'])
@Index(['pendingPhotos'])
export class Task extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ example: 'TSK-2025-001234', description: 'Task number' })
  @Column({ type: 'varchar', length: 50, unique: true })
  taskNumber: string;

  @ApiProperty({ enum: TaskType })
  @Column({ type: 'enum', enum: TaskType })
  typeCode: TaskType;

  @ApiProperty({ enum: TaskStatus })
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.NORMAL })
  priority: TaskPriority;

  // Machine reference
  @ApiProperty({ description: 'Machine ID' })
  @Column({ type: 'uuid' })
  machineId: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  // Assignment
  @ApiPropertyOptional({ description: 'Assigned operator ID' })
  @Column({ type: 'uuid', nullable: true })
  assignedToUserId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedTo?: User;

  @ApiProperty({ description: 'Task creator ID' })
  @Column({ type: 'uuid' })
  createdByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  // Scheduling
  @ApiPropertyOptional({ description: 'Scheduled date' })
  @Column({ type: 'timestamptz', nullable: true })
  scheduledDate?: Date;

  @ApiPropertyOptional({ description: 'Due date' })
  @Column({ type: 'timestamptz', nullable: true })
  dueDate?: Date;

  // Execution tracking
  @ApiPropertyOptional({ description: 'Started at' })
  @Column({ type: 'timestamptz', nullable: true })
  startedAt?: Date;

  @ApiPropertyOptional({ description: 'Completed at' })
  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Actual operation date (for offline/historical)' })
  @Column({ type: 'timestamptz', nullable: true })
  operationDate?: Date;

  // Description and notes
  @ApiPropertyOptional({ description: 'Task description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiPropertyOptional({ description: 'Completion notes' })
  @Column({ type: 'text', nullable: true })
  completionNotes?: string;

  @ApiPropertyOptional({ description: 'Postpone reason' })
  @Column({ type: 'text', nullable: true })
  postponeReason?: string;

  // Checklist
  @ApiPropertyOptional({ description: 'Task checklist' })
  @Column({ type: 'jsonb', nullable: true })
  checklist?: Array<{
    item: string;
    completed: boolean;
    completedAt?: Date;
  }>;

  // For COLLECTION tasks
  @ApiPropertyOptional({ description: 'Expected cash amount' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  expectedCashAmount?: number;

  @ApiPropertyOptional({ description: 'Actual collected cash amount' })
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  actualCashAmount?: number;

  // Photo validation flags
  @ApiProperty({ description: 'Has photo before' })
  @Column({ type: 'boolean', default: false })
  hasPhotoBefore: boolean;

  @ApiProperty({ description: 'Has photo after' })
  @Column({ type: 'boolean', default: false })
  hasPhotoAfter: boolean;

  @ApiProperty({ description: 'Photo before required' })
  @Column({ type: 'boolean', default: true })
  requiresPhotoBefore: boolean;

  @ApiProperty({ description: 'Photo after required' })
  @Column({ type: 'boolean', default: true })
  requiresPhotoAfter: boolean;

  // Photo URLs (stored separately in files, but cached here)
  @ApiPropertyOptional({ description: 'Photo before URL' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  photoBeforeUrl?: string;

  @ApiPropertyOptional({ description: 'Photo after URL' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  photoAfterUrl?: string;

  // Offline mode support
  @ApiProperty({ description: 'Task completed but photos pending upload' })
  @Column({ type: 'boolean', default: false })
  pendingPhotos: boolean;

  @ApiProperty({ description: 'Task completed in offline mode' })
  @Column({ type: 'boolean', default: false })
  offlineCompleted: boolean;

  // Location verification
  @ApiPropertyOptional({ description: 'Completed latitude' })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  completedLatitude?: number;

  @ApiPropertyOptional({ description: 'Completed longitude' })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  completedLongitude?: number;

  // Rejection tracking
  @ApiPropertyOptional({ description: 'Rejected by user ID' })
  @Column({ type: 'uuid', nullable: true })
  rejectedByUserId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by_user_id' })
  rejectedBy?: User;

  @ApiPropertyOptional({ description: 'Rejected at' })
  @Column({ type: 'timestamptz', nullable: true })
  rejectedAt?: Date;

  @ApiPropertyOptional({ description: 'Rejection reason' })
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  // Duration tracking
  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @Column({ type: 'integer', nullable: true })
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Actual duration in minutes' })
  @Column({ type: 'integer', nullable: true })
  actualDuration?: number;

  // Metadata
  @ApiPropertyOptional({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Relations
  @OneToMany(() => TaskItem, (item) => item.task, { cascade: true })
  items: TaskItem[];

  @OneToMany(() => TaskComment, (comment) => comment.task, { cascade: true })
  comments: TaskComment[];

  @OneToMany(() => TaskComponent, (component) => component.task, { cascade: true })
  components: TaskComponent[];

  // Generate task number
  @BeforeInsert()
  generateTaskNumber() {
    if (!this.taskNumber) {
      const date = new Date();
      const year = date.getFullYear();
      const timestamp = date.getTime().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.taskNumber = `TSK-${year}-${timestamp}${random}`;
    }
  }

  // Computed: check if task can be started
  get canStart(): boolean {
    return this.status === TaskStatus.ASSIGNED;
  }

  // Computed: check if task can be completed
  get canComplete(): boolean {
    return this.status === TaskStatus.IN_PROGRESS;
  }

  // Computed: check if task is overdue
  get isOverdue(): boolean {
    if (!this.dueDate) return false;
    if (this.status === TaskStatus.COMPLETED || this.status === TaskStatus.CANCELLED) return false;
    return new Date() > new Date(this.dueDate);
  }

  // Computed: check if photos are ready
  get photosReady(): boolean {
    const beforeOk = !this.requiresPhotoBefore || this.hasPhotoBefore;
    const afterOk = !this.requiresPhotoAfter || this.hasPhotoAfter;
    return beforeOk && afterOk;
  }
}

// ============================================================================
// TASK ITEM ENTITY (for REFILL tasks)
// ============================================================================

/**
 * Task Item Entity
 * Represents products to be loaded/checked during task
 */
@Entity('task_items')
@Index(['taskId'])
@Index(['productId'])
export class TaskItem extends BaseEntity {
  @ApiProperty({ description: 'Parent task ID' })
  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ApiProperty({ description: 'Product ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ description: 'Planned quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  plannedQuantity: number;

  @ApiPropertyOptional({ description: 'Actual quantity (filled on completion)' })
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  actualQuantity?: number;

  @ApiPropertyOptional({ description: 'Slot number in machine' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  slotNumber?: string;

  @ApiPropertyOptional({ description: 'Unit of measure code' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  unitOfMeasure?: string;

  @ApiPropertyOptional({ description: 'Item notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;
}

// ============================================================================
// TASK COMMENT ENTITY
// ============================================================================

/**
 * Task Comment Entity
 * For task discussions and updates
 */
@Entity('task_comments')
@Index(['taskId'])
@Index(['userId'])
export class TaskComment extends BaseEntity {
  @ApiProperty({ description: 'Parent task ID' })
  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ApiProperty({ description: 'Comment author ID' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Comment text' })
  @Column({ type: 'text' })
  comment: string;

  @ApiProperty({ description: 'Is internal (admin only visibility)' })
  @Column({ type: 'boolean', default: false })
  isInternal: boolean;

  @ApiPropertyOptional({ description: 'Attachment URLs' })
  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[];
}

// ============================================================================
// TASK COMPONENT ENTITY (for replacement tasks)
// ============================================================================

/**
 * Task Component Entity
 * For tracking components in replacement/service tasks
 */
@Entity('task_components')
@Index(['taskId'])
@Index(['componentId'])
@Index(['role'])
export class TaskComponent extends BaseEntity {
  @ApiProperty({ description: 'Parent task ID' })
  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.components, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ApiProperty({ description: 'Component ID' })
  @Column({ type: 'uuid' })
  componentId: string;

  @ApiProperty({ enum: ComponentRole })
  @Column({ type: 'enum', enum: ComponentRole })
  role: ComponentRole;

  @ApiPropertyOptional({ description: 'Serial number' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Notes (replacement reason, condition, etc.)' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}

// ============================================================================
// TASK PHOTO ENTITY
// ============================================================================

/**
 * Task Photo Entity
 * For storing task photos with metadata
 */
@Entity('task_photos')
@Index(['taskId'])
@Index(['category'])
export class TaskPhoto extends BaseEntity {
  @ApiProperty({ description: 'Parent task ID' })
  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ApiProperty({ description: 'Photo category' })
  @Column({ type: 'varchar', length: 50 })
  category: 'before' | 'after' | 'during' | 'other';

  @ApiProperty({ description: 'File URL' })
  @Column({ type: 'varchar', length: 500 })
  url: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @Column({ type: 'bigint', nullable: true })
  fileSize?: number;

  @ApiPropertyOptional({ description: 'MIME type' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  @ApiPropertyOptional({ description: 'Image width' })
  @Column({ type: 'integer', nullable: true })
  width?: number;

  @ApiPropertyOptional({ description: 'Image height' })
  @Column({ type: 'integer', nullable: true })
  height?: number;

  @ApiPropertyOptional({ description: 'Photo latitude' })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Photo longitude' })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @ApiProperty({ description: 'Uploaded by user ID' })
  @Column({ type: 'uuid' })
  uploadedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy: User;

  @ApiPropertyOptional({ description: 'Photo description' })
  @Column({ type: 'text', nullable: true })
  description?: string;
}
