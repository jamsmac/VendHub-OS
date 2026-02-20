/**
 * Warehouse Zone Entity
 * Zones for organizing warehouse storage
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Zone Type
 */
export enum ZoneType {
  STORAGE = 'storage',           // General storage
  RECEIVING = 'receiving',       // Incoming goods
  SHIPPING = 'shipping',         // Outgoing goods
  PICKING = 'picking',           // Order picking
  COLD = 'cold',                 // Cold storage (refrigerated)
  FROZEN = 'frozen',             // Frozen storage
  HAZARDOUS = 'hazardous',       // Hazardous materials
  QUARANTINE = 'quarantine',     // Quality hold
  RETURNS = 'returns',           // Returned goods
  DAMAGED = 'damaged',           // Damaged goods
}

/**
 * Zone Status
 */
export enum ZoneStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  FULL = 'full',
}

/**
 * Storage Condition
 */
export enum StorageCondition {
  AMBIENT = 'ambient',           // Room temperature
  COOL = 'cool',                 // 10-15°C
  REFRIGERATED = 'refrigerated', // 2-8°C
  FROZEN = 'frozen',             // Below 0°C
  DRY = 'dry',                   // Low humidity
  CLIMATE_CONTROLLED = 'climate_controlled',
}

// ============================================================================
// WAREHOUSE ZONE ENTITY
// ============================================================================

/**
 * Warehouse Zone
 * Represents a physical zone/area in the warehouse
 */
@Entity('warehouse_zones')
@Index(['organizationId', 'code'], { unique: true })
@Index(['organizationId', 'zoneType'])
@Index(['organizationId', 'status'])
export class WarehouseZone extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ example: 'A-01', description: 'Zone code' })
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @ApiProperty({ description: 'Zone name' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiPropertyOptional({ description: 'Zone description' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ enum: ZoneType })
  @Column({ type: 'enum', enum: ZoneType, default: ZoneType.STORAGE })
  zoneType: ZoneType;

  @ApiProperty({ enum: ZoneStatus })
  @Column({ type: 'enum', enum: ZoneStatus, default: ZoneStatus.ACTIVE })
  status: ZoneStatus;

  @ApiProperty({ enum: StorageCondition })
  @Column({ type: 'enum', enum: StorageCondition, default: StorageCondition.AMBIENT })
  storageCondition: StorageCondition;

  // Physical properties
  @ApiPropertyOptional({ description: 'Floor/level number' })
  @Column({ type: 'integer', default: 1 })
  floor: number;

  @ApiPropertyOptional({ description: 'Aisle identifier' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  aisle?: string;

  @ApiPropertyOptional({ description: 'Total capacity (units or m³)' })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalCapacity?: number;

  @ApiPropertyOptional({ description: 'Used capacity' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  usedCapacity: number;

  @ApiPropertyOptional({ description: 'Capacity unit (units, m3, pallets)' })
  @Column({ type: 'varchar', length: 20, default: 'units' })
  capacityUnit: string;

  // Temperature control
  @ApiPropertyOptional({ description: 'Minimum temperature (°C)' })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  minTemperature?: number;

  @ApiPropertyOptional({ description: 'Maximum temperature (°C)' })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxTemperature?: number;

  @ApiPropertyOptional({ description: 'Current temperature (from sensor)' })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  currentTemperature?: number;

  @ApiPropertyOptional({ description: 'Temperature last updated' })
  @Column({ type: 'timestamptz', nullable: true })
  temperatureUpdatedAt?: Date;

  // Product restrictions
  @ApiPropertyOptional({ description: 'Allowed product categories' })
  @Column({ type: 'jsonb', nullable: true })
  allowedCategories?: string[];

  @ApiPropertyOptional({ description: 'Excluded product categories' })
  @Column({ type: 'jsonb', nullable: true })
  excludedCategories?: string[];

  // Picking settings
  @ApiProperty({ description: 'Is pickable zone' })
  @Column({ type: 'boolean', default: true })
  isPickable: boolean;

  @ApiProperty({ description: 'Pick priority (lower = higher priority)' })
  @Column({ type: 'integer', default: 100 })
  pickPriority: number;

  @ApiProperty({ description: 'FIFO enabled' })
  @Column({ type: 'boolean', default: true })
  fifoEnabled: boolean;

  // Relations
  @OneToMany(() => WarehouseBin, (bin) => bin.zone)
  bins: WarehouseBin[];

  // Metadata
  @ApiPropertyOptional({ description: 'Additional metadata' })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Computed properties
  get availableCapacity(): number {
    if (!this.totalCapacity) return Infinity;
    return Number(this.totalCapacity) - Number(this.usedCapacity);
  }

  get utilizationPercent(): number {
    if (!this.totalCapacity || Number(this.totalCapacity) === 0) return 0;
    return Math.round((Number(this.usedCapacity) / Number(this.totalCapacity)) * 100);
  }

  get isTemperatureInRange(): boolean {
    if (this.currentTemperature === null || this.currentTemperature === undefined) return true;
    if (this.minTemperature !== null && this.minTemperature !== undefined && this.currentTemperature < this.minTemperature) return false;
    if (this.maxTemperature !== null && this.maxTemperature !== undefined && this.currentTemperature > this.maxTemperature) return false;
    return true;
  }
}

// ============================================================================
// WAREHOUSE BIN ENTITY
// ============================================================================

/**
 * Warehouse Bin
 * Represents a specific storage location within a zone
 */
@Entity('warehouse_bins')
@Index(['organizationId', 'zoneId'])
@Index(['organizationId', 'barcode'], { unique: true })
@Index(['status'])
export class WarehouseBin extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Zone ID' })
  @Column({ type: 'uuid' })
  zoneId: string;

  @ManyToOne(() => WarehouseZone, (zone) => zone.bins, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: WarehouseZone;

  @ApiProperty({ example: 'A-01-R01-S01', description: 'Bin code/barcode' })
  @Column({ type: 'varchar', length: 50 })
  barcode: string;

  @ApiPropertyOptional({ description: 'Bin name/label' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  // Location coordinates
  @ApiPropertyOptional({ description: 'Row number' })
  @Column({ type: 'integer', nullable: true })
  row?: number;

  @ApiPropertyOptional({ description: 'Shelf/level number' })
  @Column({ type: 'integer', nullable: true })
  shelf?: number;

  @ApiPropertyOptional({ description: 'Position in row' })
  @Column({ type: 'integer', nullable: true })
  position?: number;

  @ApiProperty({ description: 'Bin status' })
  @Column({ type: 'varchar', length: 20, default: 'available' })
  status: 'available' | 'occupied' | 'reserved' | 'blocked' | 'maintenance';

  // Capacity
  @ApiPropertyOptional({ description: 'Max capacity' })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxCapacity?: number;

  @ApiPropertyOptional({ description: 'Current quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentQuantity: number;

  // Current contents
  @ApiPropertyOptional({ description: 'Current product ID' })
  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @ApiPropertyOptional({ description: 'Lot/batch number' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @Column({ type: 'date', nullable: true })
  expiryDate?: Date;

  // Dimensions (optional)
  @ApiPropertyOptional({ description: 'Width (cm)' })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  width?: number;

  @ApiPropertyOptional({ description: 'Height (cm)' })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  height?: number;

  @ApiPropertyOptional({ description: 'Depth (cm)' })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  depth?: number;

  @ApiPropertyOptional({ description: 'Max weight (kg)' })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxWeight?: number;

  // Picking
  @ApiProperty({ description: 'Is pickable' })
  @Column({ type: 'boolean', default: true })
  isPickable: boolean;

  @ApiPropertyOptional({ description: 'Last pick date' })
  @Column({ type: 'timestamptz', nullable: true })
  lastPickedAt?: Date;

  @ApiPropertyOptional({ description: 'Last restock date' })
  @Column({ type: 'timestamptz', nullable: true })
  lastRestockedAt?: Date;

  // Computed
  get isEmpty(): boolean {
    return Number(this.currentQuantity) === 0 && !this.productId;
  }

  get isFull(): boolean {
    if (!this.maxCapacity) return false;
    return Number(this.currentQuantity) >= Number(this.maxCapacity);
  }

  get fullPath(): string {
    return `${this.zone?.code || ''}-R${this.row || 0}-S${this.shelf || 0}-P${this.position || 0}`;
  }
}

// ============================================================================
// BIN CONTENT HISTORY
// ============================================================================

/**
 * Bin Content History
 * Tracks what was in each bin over time
 */
@Entity('bin_content_history')
@Index(['binId', 'created_at'])
@Index(['productId'])
export class BinContentHistory extends BaseEntity {
  @ApiProperty({ description: 'Bin ID' })
  @Column({ type: 'uuid' })
  binId: string;

  @ManyToOne(() => WarehouseBin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bin_id' })
  bin: WarehouseBin;

  @ApiProperty({ description: 'Product ID' })
  @Column({ type: 'uuid' })
  productId: string;

  @ApiProperty({ description: 'Action type' })
  @Column({ type: 'varchar', length: 20 })
  action: 'placed' | 'picked' | 'adjusted' | 'transferred' | 'expired';

  @ApiProperty({ description: 'Quantity' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @ApiPropertyOptional({ description: 'Lot number' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'User who performed action' })
  @Column({ type: 'uuid', nullable: true })
  performedByUserId?: string;

  @ApiPropertyOptional({ description: 'Reference (task ID, order ID, etc.)' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @Column({ type: 'text', nullable: true })
  notes?: string;
}
