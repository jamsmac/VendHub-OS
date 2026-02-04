import {
  Entity,
  Column,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

export enum WarehouseType {
  MAIN = 'main',
  REGIONAL = 'regional',
  TRANSIT = 'transit',
  VIRTUAL = 'virtual',
}

export enum StockMovementType {
  RECEIPT = 'receipt',
  TRANSFER = 'transfer',
  DISPATCH = 'dispatch',
  RETURN = 'return',
  ADJUSTMENT = 'adjustment',
  WRITE_OFF = 'write_off',
}

export enum StockMovementStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// WAREHOUSE ENTITY
// ============================================================================

@Entity('warehouses')
@Index(['organizationId'])
@Index(['code'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['type'])
@Index(['managerId'])
export class Warehouse extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'enum', enum: WarehouseType, default: WarehouseType.MAIN })
  type: WarehouseType;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'uuid', nullable: true })
  managerId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  capacity: number | null;

  @Column({ type: 'int', default: 0 })
  currentOccupancy: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}

// ============================================================================
// STOCK MOVEMENT ENTITY
// ============================================================================

@Entity('stock_movements')
@Index(['organizationId'])
@Index(['fromWarehouseId'])
@Index(['toWarehouseId'])
@Index(['productId'])
@Index(['type'])
@Index(['status'])
@Index(['requestedAt'])
export class StockMovement extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid', nullable: true })
  fromWarehouseId: string | null;

  @Column({ type: 'uuid', nullable: true })
  toWarehouseId: string | null;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unitOfMeasure: string;

  @Column({ type: 'enum', enum: StockMovementType })
  type: StockMovementType;

  @Column({ type: 'enum', enum: StockMovementStatus, default: StockMovementStatus.PENDING })
  status: StockMovementStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceNumber: string | null;

  @Column({ type: 'uuid' })
  requestedByUserId: string;

  @Column({ type: 'uuid', nullable: true })
  approvedByUserId: string | null;

  @Column({ type: 'uuid', nullable: true })
  completedByUserId: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  requestedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  cost: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}

// ============================================================================
// INVENTORY BATCH ENTITY
// ============================================================================

@Entity('inventory_batches')
@Index(['organizationId'])
@Index(['warehouseId'])
@Index(['productId'])
@Index(['expiryDate'])
@Index(['warehouseId', 'productId', 'batchNumber'], { unique: true, where: '"deleted_at" IS NULL' })
export class InventoryBatch extends BaseEntity {
  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'uuid' })
  warehouseId: string;

  @Column({ type: 'uuid' })
  productId: string;

  @Column({ type: 'varchar', length: 100 })
  batchNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 3 })
  remainingQuantity: number;

  @Column({ type: 'varchar', length: 20, default: 'pcs' })
  unitOfMeasure: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  costPerUnit: number | null;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  receivedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
