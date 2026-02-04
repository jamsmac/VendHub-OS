import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  BeforeInsert,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { User } from '../../users/entities/user.entity';
import { Machine } from '../../machines/entities/machine.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Movement Types for 3-Level Inventory System
 */
export enum MovementType {
  // Warehouse operations
  WAREHOUSE_IN = 'warehouse_in',           // Stock arrival (purchases)
  WAREHOUSE_OUT = 'warehouse_out',         // Stock removal (write-offs)

  // Transfers between levels
  WAREHOUSE_TO_OPERATOR = 'warehouse_to_operator',   // Warehouse -> Operator
  OPERATOR_TO_WAREHOUSE = 'operator_to_warehouse',   // Operator -> Warehouse (returns)
  OPERATOR_TO_MACHINE = 'operator_to_machine',       // Operator -> Machine (refills)
  MACHINE_TO_OPERATOR = 'machine_to_operator',       // Machine -> Operator (removals)

  // Machine operations
  MACHINE_SALE = 'machine_sale',           // Sales/consumption

  // Adjustments
  ADJUSTMENT = 'adjustment',               // Inventory reconciliation
  WRITE_OFF = 'write_off',                 // Write-offs (expired, defects)

  // Reservations
  WAREHOUSE_RESERVATION = 'warehouse_reservation',
  WAREHOUSE_RESERVATION_RELEASE = 'warehouse_reservation_release',
  OPERATOR_RESERVATION = 'operator_reservation',
  OPERATOR_RESERVATION_RELEASE = 'operator_reservation_release',
}

/**
 * Reservation status
 */
export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Inventory level for reservation
 */
export enum InventoryLevel {
  WAREHOUSE = 'warehouse',
  OPERATOR = 'operator',
  MACHINE = 'machine',
}

/**
 * Adjustment types
 */
export enum AdjustmentType {
  STOCKTAKE = 'stocktake',       // Physical count
  CORRECTION = 'correction',     // Manual correction
  DAMAGE = 'damage',             // Damaged goods
  EXPIRY = 'expiry',             // Expired goods
  THEFT = 'theft',               // Theft/loss
  OTHER = 'other',
}

// ============================================================================
// LEVEL 1: WAREHOUSE INVENTORY
// ============================================================================

/**
 * Warehouse Inventory (Level 1)
 * Central storage - total stock of products/ingredients
 */
@Entity('warehouse_inventory')
@Unique(['organizationId', 'productId'])
@Index(['organizationId'])
@Index(['productId'])
export class WarehouseInventory extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ description: 'Product/Nomenclature ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ example: 150.5, description: 'Current quantity in warehouse' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  currentQuantity: number;

  @ApiProperty({ example: 10.5, description: 'Reserved quantity for tasks' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  reservedQuantity: number;

  @ApiProperty({ example: 20, description: 'Minimum stock level for alerts' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  minStockLevel: number;

  @ApiPropertyOptional({ example: 200, description: 'Maximum stock level' })
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  maxStockLevel?: number;

  @ApiPropertyOptional({ description: 'Last restock date' })
  @Column({ type: 'timestamptz', nullable: true })
  lastRestockedAt?: Date;

  @ApiPropertyOptional({ example: 'Shelf A-12', description: 'Location in warehouse' })
  @Column({ type: 'varchar', length: 200, nullable: true })
  locationInWarehouse?: string;

  @ApiPropertyOptional({ description: 'Average purchase price' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  avgPurchasePrice: number;

  @ApiPropertyOptional({ description: 'Last purchase price' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  lastPurchasePrice?: number;

  /**
   * Computed: available quantity (current - reserved)
   */
  get availableQuantity(): number {
    return Number(this.currentQuantity) - Number(this.reservedQuantity);
  }

  /**
   * Check if stock is low
   */
  get isLowStock(): boolean {
    return Number(this.currentQuantity) <= Number(this.minStockLevel);
  }
}

// ============================================================================
// LEVEL 2: OPERATOR INVENTORY
// ============================================================================

/**
 * Operator Inventory (Level 2)
 * Products taken from warehouse by operator for machine refills
 */
@Entity('operator_inventory')
@Unique(['organizationId', 'operatorId', 'productId'])
@Index(['organizationId'])
@Index(['operatorId'])
@Index(['productId'])
export class OperatorInventory extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ description: 'Operator (User) ID' })
  @Column({ type: 'uuid' })
  operatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @ApiProperty({ description: 'Product/Nomenclature ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ example: 25.5, description: 'Current quantity with operator' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  currentQuantity: number;

  @ApiProperty({ example: 5.5, description: 'Reserved quantity for tasks' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  reservedQuantity: number;

  @ApiPropertyOptional({ description: 'Last received from warehouse' })
  @Column({ type: 'timestamptz', nullable: true })
  lastReceivedAt?: Date;

  @ApiPropertyOptional({ description: 'Last task that used this product' })
  @Column({ type: 'uuid', nullable: true })
  lastTaskId?: string;

  /**
   * Computed: available quantity (current - reserved)
   */
  get availableQuantity(): number {
    return Number(this.currentQuantity) - Number(this.reservedQuantity);
  }
}

// ============================================================================
// LEVEL 3: MACHINE INVENTORY
// ============================================================================

/**
 * Machine Inventory (Level 3)
 * Products inside vending machines
 */
@Entity('machine_inventory')
@Unique(['organizationId', 'machineId', 'productId'])
@Index(['organizationId'])
@Index(['machineId'])
@Index(['productId'])
export class MachineInventory extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ description: 'Machine ID' })
  @Column({ type: 'uuid' })
  machineId: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @ApiProperty({ description: 'Product/Nomenclature ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ example: 15.5, description: 'Current quantity in machine' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  currentQuantity: number;

  @ApiProperty({ example: 5, description: 'Minimum level for refill alerts' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  minStockLevel: number;

  @ApiPropertyOptional({ example: 50, description: 'Maximum capacity for this product' })
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  maxCapacity?: number;

  @ApiPropertyOptional({ description: 'Last refill date' })
  @Column({ type: 'timestamptz', nullable: true })
  lastRefilledAt?: Date;

  @ApiPropertyOptional({ description: 'Last refill task ID' })
  @Column({ type: 'uuid', nullable: true })
  lastRefillTaskId?: string;

  @ApiPropertyOptional({ example: 'A-12', description: 'Slot/bin number in machine' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  slotNumber?: string;

  @ApiPropertyOptional({ description: 'Selling price in this machine' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  sellingPrice?: number;

  @ApiPropertyOptional({ description: 'Last sale date' })
  @Column({ type: 'timestamptz', nullable: true })
  lastSaleAt?: Date;

  @ApiProperty({ description: 'Total units sold' })
  @Column({ type: 'integer', default: 0 })
  totalSold: number;

  /**
   * Check if refill is needed
   */
  get needsRefill(): boolean {
    return Number(this.currentQuantity) <= Number(this.minStockLevel);
  }

  /**
   * Get fill percentage
   */
  get fillPercentage(): number {
    if (!this.maxCapacity || Number(this.maxCapacity) === 0) return 100;
    return Math.round((Number(this.currentQuantity) / Number(this.maxCapacity)) * 100);
  }
}

// ============================================================================
// INVENTORY MOVEMENT
// ============================================================================

/**
 * Inventory Movement
 * Tracks all product movements between levels
 */
@Entity('inventory_movements')
@Index(['organizationId'])
@Index(['movementType'])
@Index(['productId'])
@Index(['taskId'])
@Index(['operatorId'])
@Index(['machineId'])
@Index(['createdAt'])
@Index(['operationDate'])
export class InventoryMovement extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ enum: MovementType })
  @Column({ type: 'enum', enum: MovementType })
  movementType: MovementType;

  @ApiProperty({ description: 'Product/Nomenclature ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ example: 10.5, description: 'Quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @ApiPropertyOptional({ description: 'User who performed the action' })
  @Column({ type: 'uuid', nullable: true })
  performedByUserId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by_user_id' })
  performedBy?: User;

  // Optional links depending on movement type

  @ApiPropertyOptional({ description: 'Operator ID (for operator-related movements)' })
  @Column({ type: 'uuid', nullable: true })
  operatorId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operator_id' })
  operator?: User;

  @ApiPropertyOptional({ description: 'Machine ID (for machine-related movements)' })
  @Column({ type: 'uuid', nullable: true })
  machineId?: string;

  @ManyToOne(() => Machine, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine?: Machine;

  @ApiPropertyOptional({ description: 'Task ID (if linked to a task)' })
  @Column({ type: 'uuid', nullable: true })
  taskId?: string;

  @ApiPropertyOptional({ description: 'Actual operation date (may differ from createdAt)' })
  @Column({ type: 'timestamptz', nullable: true })
  operationDate?: Date;

  @ApiPropertyOptional({ description: 'Movement description/notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // Cost tracking
  @ApiPropertyOptional({ description: 'Unit cost at the time of movement' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  unitCost?: number;

  @ApiPropertyOptional({ description: 'Total cost of movement' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalCost?: number;

  // Source/destination tracking
  @ApiPropertyOptional({ description: 'Source reference' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  sourceRef?: string;

  @ApiPropertyOptional({ description: 'Destination reference' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  destinationRef?: string;
}

// ============================================================================
// INVENTORY RESERVATION
// ============================================================================

/**
 * Inventory Reservation
 * Prevents race conditions when creating multiple tasks
 *
 * Lifecycle:
 * 1. PENDING - reservation created (when task created)
 * 2. CONFIRMED - reservation confirmed (optional)
 * 3. FULFILLED - reservation fulfilled (when task completed)
 * 4. CANCELLED - reservation cancelled (when task cancelled)
 * 5. EXPIRED - reservation expired (auto via CRON)
 */
@Entity('inventory_reservations')
@Index(['organizationId'])
@Index(['taskId'])
@Index(['productId'])
@Index(['status'])
@Index(['inventoryLevel', 'referenceId'])
@Index(['expiresAt'])
export class InventoryReservation extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ example: 'RSV-2025-001234', description: 'Unique reservation number' })
  @Column({ type: 'varchar', length: 50, unique: true })
  reservationNumber: string;

  @ApiProperty({ description: 'Task ID' })
  @Column({ type: 'uuid' })
  taskId: string;

  @ApiProperty({ description: 'Product/Nomenclature ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ example: 15.5, description: 'Reserved quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantityReserved: number;

  @ApiProperty({ example: 15.5, description: 'Fulfilled quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantityFulfilled: number;

  @ApiProperty({ enum: ReservationStatus })
  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @ApiProperty({ enum: InventoryLevel, description: 'Inventory level (warehouse/operator)' })
  @Column({ type: 'varchar', length: 20 })
  inventoryLevel: InventoryLevel;

  @ApiProperty({ description: 'Reference ID (warehouse org ID or operator ID)' })
  @Column({ type: 'uuid' })
  referenceId: string;

  @ApiProperty({ description: 'Reserved at' })
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  reservedAt: Date;

  @ApiPropertyOptional({ description: 'Expiration date' })
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Fulfilled at' })
  @Column({ type: 'timestamptz', nullable: true })
  fulfilledAt?: Date;

  @ApiPropertyOptional({ description: 'Cancelled at' })
  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @ApiPropertyOptional({ description: 'Notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiPropertyOptional({ description: 'User who created reservation' })
  @Column({ type: 'uuid', nullable: true })
  createdByUserId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy?: User;

  /**
   * Generate reservation number before insert
   */
  @BeforeInsert()
  generateReservationNumber() {
    if (!this.reservationNumber) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.reservationNumber = `RSV-${timestamp}-${random}`;
    }
  }

  /**
   * Computed: remaining to fulfill
   */
  get quantityRemaining(): number {
    return Number(this.quantityReserved) - Number(this.quantityFulfilled);
  }

  /**
   * Check if reservation is expired
   */
  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }

  /**
   * Check if reservation is active
   */
  get isActive(): boolean {
    return [
      ReservationStatus.PENDING,
      ReservationStatus.CONFIRMED,
      ReservationStatus.PARTIALLY_FULFILLED,
    ].includes(this.status);
  }
}

// ============================================================================
// INVENTORY ADJUSTMENT
// ============================================================================

/**
 * Inventory Adjustment
 * Records corrections made during stocktakes or manual adjustments
 */
@Entity('inventory_adjustments')
@Index(['organizationId'])
@Index(['inventoryLevel'])
@Index(['productId'])
@Index(['adjustmentType'])
@Index(['createdAt'])
export class InventoryAdjustment extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ example: 'ADJ-2025-001234', description: 'Unique adjustment number' })
  @Column({ type: 'varchar', length: 50, unique: true })
  adjustmentNumber: string;

  @ApiProperty({ enum: InventoryLevel })
  @Column({ type: 'varchar', length: 20 })
  inventoryLevel: InventoryLevel;

  @ApiProperty({ description: 'Reference ID (warehouse, operator, or machine ID)' })
  @Column({ type: 'uuid' })
  referenceId: string;

  @ApiProperty({ description: 'Product ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ enum: AdjustmentType })
  @Column({ type: 'enum', enum: AdjustmentType })
  adjustmentType: AdjustmentType;

  @ApiProperty({ description: 'System quantity before adjustment' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  systemQuantity: number;

  @ApiProperty({ description: 'Actual counted quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  actualQuantity: number;

  @ApiProperty({ description: 'Difference (actual - system)' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  difference: number;

  @ApiPropertyOptional({ description: 'Reason for adjustment' })
  @Column({ type: 'text', nullable: true })
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'User who made adjustment' })
  @Column({ type: 'uuid' })
  adjustedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'adjusted_by_user_id' })
  adjustedBy: User;

  @ApiPropertyOptional({ description: 'User who approved adjustment' })
  @Column({ type: 'uuid', nullable: true })
  approvedByUserId?: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_user_id' })
  approvedBy?: User;

  @ApiPropertyOptional({ description: 'Approved at' })
  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @ApiProperty({ description: 'Is approved' })
  @Column({ type: 'boolean', default: false })
  isApproved: boolean;

  @ApiPropertyOptional({ description: 'Related movement ID' })
  @Column({ type: 'uuid', nullable: true })
  movementId?: string;

  /**
   * Generate adjustment number before insert
   */
  @BeforeInsert()
  generateAdjustmentNumber() {
    if (!this.adjustmentNumber) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.adjustmentNumber = `ADJ-${timestamp}-${random}`;
    }
  }
}

// ============================================================================
// INVENTORY COUNT (Stocktake)
// ============================================================================

/**
 * Inventory Count
 * Physical inventory count records
 */
@Entity('inventory_counts')
@Index(['organizationId'])
@Index(['inventoryLevel'])
@Index(['status'])
@Index(['startedAt'])
export class InventoryCount extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ example: 'CNT-2025-001234', description: 'Unique count number' })
  @Column({ type: 'varchar', length: 50, unique: true })
  countNumber: string;

  @ApiProperty({ enum: InventoryLevel })
  @Column({ type: 'varchar', length: 20 })
  inventoryLevel: InventoryLevel;

  @ApiProperty({ description: 'Reference ID' })
  @Column({ type: 'uuid' })
  referenceId: string;

  @ApiProperty({ description: 'Count status' })
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';

  @ApiProperty({ description: 'Started at' })
  @Column({ type: 'timestamptz' })
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Completed at' })
  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @ApiProperty({ description: 'Started by user' })
  @Column({ type: 'uuid' })
  startedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'started_by_user_id' })
  startedBy: User;

  @ApiPropertyOptional({ description: 'Completed by user' })
  @Column({ type: 'uuid', nullable: true })
  completedByUserId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Total items counted' })
  @Column({ type: 'integer', default: 0 })
  totalItemsCounted: number;

  @ApiProperty({ description: 'Total differences found' })
  @Column({ type: 'integer', default: 0 })
  totalDifferences: number;

  /**
   * Generate count number before insert
   */
  @BeforeInsert()
  generateCountNumber() {
    if (!this.countNumber) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      this.countNumber = `CNT-${timestamp}-${random}`;
    }
  }
}

/**
 * Inventory Count Item
 * Individual product counts within a stocktake
 */
@Entity('inventory_count_items')
@Index(['countId'])
@Index(['productId'])
export class InventoryCountItem extends BaseEntity {
  @ApiProperty({ description: 'Parent count ID' })
  @Column({ type: 'uuid' })
  countId: string;

  @ManyToOne(() => InventoryCount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'count_id' })
  count: InventoryCount;

  @ApiProperty({ description: 'Product ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ description: 'System quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  systemQuantity: number;

  @ApiPropertyOptional({ description: 'Counted quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  countedQuantity?: number;

  @ApiPropertyOptional({ description: 'Difference' })
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  difference?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiPropertyOptional({ description: 'Counted by user' })
  @Column({ type: 'uuid', nullable: true })
  countedByUserId?: string;

  @ApiPropertyOptional({ description: 'Counted at' })
  @Column({ type: 'timestamptz', nullable: true })
  countedAt?: Date;

  @ApiProperty({ description: 'Is verified' })
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;
}
