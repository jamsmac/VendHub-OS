/**
 * Material Request Entity
 * Заявки на материалы с полным workflow
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
import { User } from '../../users/entities/user.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum MaterialRequestStatus {
  DRAFT = 'draft',
  NEW = 'new',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SENT = 'sent',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ============================================================================
// MATERIAL REQUEST ENTITY
// ============================================================================

@Entity('material_requests')
@Index(['organizationId', 'status'])
@Index(['requesterId'])
export class MaterialRequest extends BaseEntity {
  @Column()
  @Index()
  organizationId: string;

  @Column({ unique: true })
  requestNumber: string; // MR-2025-00001

  @Column()
  requesterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({
    type: 'enum',
    enum: MaterialRequestStatus,
    default: MaterialRequestStatus.DRAFT,
  })
  status: MaterialRequestStatus;

  @Column({
    type: 'enum',
    enum: RequestPriority,
    default: RequestPriority.NORMAL,
  })
  priority: RequestPriority;

  @Column({ nullable: true })
  supplierId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  // Approval
  @Column({ nullable: true })
  approvedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  rejectedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  rejectedAt: Date;

  // Workflow timestamps
  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  // Relations
  @OneToMany(() => MaterialRequestItem, item => item.request, { cascade: true })
  items: MaterialRequestItem[];

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}

// ============================================================================
// MATERIAL REQUEST ITEM ENTITY
// ============================================================================

@Entity('material_request_items')
@Index(['requestId', 'productId'])
export class MaterialRequestItem extends BaseEntity {
  @Column()
  requestId: string;

  @ManyToOne(() => MaterialRequest, req => req.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: MaterialRequest;

  @Column()
  productId: string;

  @Column({ length: 255 })
  productName: string;

  @Column({ length: 100, nullable: true })
  productSku: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalPrice: number;

  @Column({ type: 'int', default: 0 })
  deliveredQuantity: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}

// ============================================================================
// MATERIAL REQUEST HISTORY ENTITY
// ============================================================================

@Entity('material_request_history')
@Index(['requestId', 'createdAt'])
export class MaterialRequestHistory extends BaseEntity {
  @Column()
  requestId: string;

  @ManyToOne(() => MaterialRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: MaterialRequest;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: MaterialRequestStatus,
  })
  fromStatus: MaterialRequestStatus;

  @Column({
    type: 'enum',
    enum: MaterialRequestStatus,
  })
  toStatus: MaterialRequestStatus;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
