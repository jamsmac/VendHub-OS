/**
 * Equipment Module Entities
 * Equipment components, hopper types, spare parts, maintenance, movements, and washing schedules
 */

import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Equipment Component Type
 */
export enum EquipmentComponentType {
  HOPPER = 'hopper',
  GRINDER = 'grinder',
  BREW_UNIT = 'brew_unit',
  MIXER = 'mixer',
  PUMP = 'pump',
  HEATER = 'heater',
  DISPENSER = 'dispenser',
  COMPRESSOR = 'compressor',
  BOARD = 'board',
  MOTOR = 'motor',
  VALVE = 'valve',
  SENSOR = 'sensor',
  FILTER = 'filter',
  TANK = 'tank',
  CONVEYOR = 'conveyor',
  DISPLAY = 'display',
  CARD_READER = 'card_reader',
  OTHER = 'other',
}

/**
 * Equipment Component Status
 */
export enum EquipmentComponentStatus {
  NEW = 'new',
  INSTALLED = 'installed',
  IN_USE = 'in_use',
  NEEDS_MAINTENANCE = 'needs_maintenance',
  IN_REPAIR = 'in_repair',
  REPAIRED = 'repaired',
  DECOMMISSIONED = 'decommissioned',
  DISPOSED = 'disposed',
}

/**
 * Component Maintenance Type
 */
export enum ComponentMaintenanceType {
  CLEANING = 'cleaning',
  LUBRICATION = 'lubrication',
  CALIBRATION = 'calibration',
  REPAIR = 'repair',
  REPLACEMENT = 'replacement',
  INSPECTION = 'inspection',
}

// ============================================================================
// EQUIPMENT COMPONENT ENTITY
// ============================================================================

/**
 * Equipment Component Entity
 * Represents a physical component installed in or associated with a vending machine
 */
@Entity('equipment_components')
@Index(['organizationId'])
@Index(['machineId'])
@Index(['componentType'])
@Index(['componentStatus'])
@Index(['serialNumber'])
export class EquipmentComponent extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiPropertyOptional({ description: 'Machine ID where component is installed' })
  @Column({ type: 'uuid', nullable: true })
  machineId: string | null;

  @ApiProperty({ enum: EquipmentComponentType, description: 'Type of component' })
  @Column({ type: 'enum', enum: EquipmentComponentType })
  componentType: EquipmentComponentType;

  @ApiProperty({ enum: EquipmentComponentStatus, description: 'Current status of the component' })
  @Column({ type: 'enum', enum: EquipmentComponentStatus, default: EquipmentComponentStatus.NEW })
  componentStatus: EquipmentComponentStatus;

  @ApiProperty({ description: 'Component name', example: 'Coffee Grinder G200' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  serialNumber: string | null;

  @ApiPropertyOptional({ description: 'Manufacturer name' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string | null;

  @ApiPropertyOptional({ description: 'Model name/number' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @ApiPropertyOptional({ description: 'Date of purchase' })
  @Column({ type: 'date', nullable: true })
  purchaseDate: Date | null;

  @ApiPropertyOptional({ description: 'Purchase price in UZS' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  purchasePrice: number | null;

  @ApiPropertyOptional({ description: 'Warranty expiration date' })
  @Column({ type: 'date', nullable: true })
  warrantyUntil: Date | null;

  @ApiPropertyOptional({ description: 'Date when the component was installed' })
  @Column({ type: 'date', nullable: true })
  installedAt: Date | null;

  @ApiPropertyOptional({ description: 'Expected life in operating hours' })
  @Column({ type: 'integer', nullable: true })
  expectedLifeHours: number | null;

  @ApiProperty({ description: 'Current operating hours', default: 0 })
  @Column({ type: 'integer', default: 0 })
  currentHours: number;

  @ApiPropertyOptional({ description: 'Date of last maintenance' })
  @Column({ type: 'date', nullable: true })
  lastMaintenanceDate: Date | null;

  @ApiPropertyOptional({ description: 'Scheduled next maintenance date' })
  @Column({ type: 'date', nullable: true })
  nextMaintenanceDate: Date | null;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}

// ============================================================================
// HOPPER TYPE ENTITY (Dictionary)
// ============================================================================

/**
 * Hopper Type Entity
 * Dictionary of hopper types used in vending machines
 */
@Entity('hopper_types')
@Index(['organizationId'])
export class HopperType extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Hopper type name', example: 'Standard Coffee Hopper 1.5L' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({ description: 'Volume in milliliters' })
  @Column({ type: 'integer' })
  volumeMl: number;

  @ApiPropertyOptional({ description: 'Material (e.g. plastic, stainless steel)' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  material: string | null;

  @ApiProperty({ description: 'Compatible machine types', default: [] })
  @Column({ type: 'jsonb', default: [] })
  compatibleMachineTypes: string[];

  @ApiProperty({ description: 'Is active', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}

// ============================================================================
// SPARE PART ENTITY
// ============================================================================

/**
 * Spare Part Entity
 * Inventory of spare parts for equipment maintenance
 */
@Entity('spare_parts')
@Index(['organizationId'])
@Index(['partNumber'])
@Index(['supplierId'])
export class SparePart extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Part number / SKU', example: 'GRD-200-BLD' })
  @Column({ type: 'varchar', length: 100 })
  partNumber: string;

  @ApiProperty({ description: 'Part name', example: 'Grinder Blade Set' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiPropertyOptional({ description: 'Part description' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Compatible component types', default: [] })
  @Column({ type: 'jsonb', default: [] })
  compatibleComponentTypes: EquipmentComponentType[];

  @ApiProperty({ description: 'Current quantity in stock', default: 0 })
  @Column({ type: 'integer', default: 0 })
  quantity: number;

  @ApiProperty({ description: 'Minimum quantity threshold for reorder', default: 0 })
  @Column({ type: 'integer', default: 0 })
  minQuantity: number;

  @ApiPropertyOptional({ description: 'Cost price in UZS' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  costPrice: number | null;

  @ApiPropertyOptional({ description: 'Supplier ID' })
  @Column({ type: 'uuid', nullable: true })
  supplierId: string | null;

  @ApiPropertyOptional({ description: 'Storage location identifier' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  storageLocation: string | null;

  @ApiProperty({ description: 'Is active', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}

// ============================================================================
// COMPONENT MAINTENANCE ENTITY
// ============================================================================

/**
 * Component Maintenance Entity
 * Records of maintenance performed on equipment components
 */
@Entity('component_maintenance')
@Index(['componentId'])
@Index(['organizationId'])
@Index(['performedAt'])
export class ComponentMaintenance extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Equipment component ID' })
  @Column({ type: 'uuid' })
  componentId: string;

  @ManyToOne(() => EquipmentComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'component_id' })
  component: EquipmentComponent;

  @ApiProperty({ enum: ComponentMaintenanceType, description: 'Type of maintenance' })
  @Column({ type: 'enum', enum: ComponentMaintenanceType })
  maintenanceType: ComponentMaintenanceType;

  @ApiPropertyOptional({ description: 'Description of work performed' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ description: 'Cost of maintenance in UZS' })
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost: number | null;

  @ApiProperty({ description: 'User who performed the maintenance' })
  @Column({ type: 'uuid' })
  performedByUserId: string;

  @ApiProperty({ description: 'Date/time maintenance was performed' })
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  performedAt: Date;

  @ApiProperty({ description: 'Spare parts used during maintenance', default: [] })
  @Column({ type: 'jsonb', default: [] })
  partsUsed: { sparePartId: string; quantity: number }[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}

// ============================================================================
// COMPONENT MOVEMENT ENTITY
// ============================================================================

/**
 * Component Movement Entity
 * Tracks movement of components between machines
 */
@Entity('component_movements')
@Index(['componentId'])
@Index(['organizationId'])
@Index(['movedAt'])
export class ComponentMovement extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Equipment component ID' })
  @Column({ type: 'uuid' })
  componentId: string;

  @ManyToOne(() => EquipmentComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'component_id' })
  component: EquipmentComponent;

  @ApiPropertyOptional({ description: 'Source machine ID' })
  @Column({ type: 'uuid', nullable: true })
  fromMachineId: string | null;

  @ApiPropertyOptional({ description: 'Destination machine ID' })
  @Column({ type: 'uuid', nullable: true })
  toMachineId: string | null;

  @ApiProperty({ description: 'User who moved the component' })
  @Column({ type: 'uuid' })
  movedByUserId: string;

  @ApiProperty({ description: 'Date/time of movement' })
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  movedAt: Date;

  @ApiPropertyOptional({ description: 'Reason for movement' })
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}

// ============================================================================
// WASHING SCHEDULE ENTITY
// ============================================================================

/**
 * Washing Schedule Entity
 * Recurring washing/cleaning schedules for machines and components
 */
@Entity('washing_schedules')
@Index(['organizationId'])
@Index(['machineId'])
@Index(['nextWashDate'])
export class WashingSchedule extends BaseEntity {
  @ApiProperty({ description: 'Organization ID' })
  @Column({ type: 'uuid' })
  organizationId: string;

  @ApiProperty({ description: 'Machine ID' })
  @Column({ type: 'uuid' })
  machineId: string;

  @ApiPropertyOptional({ description: 'Specific component ID (null = entire machine)' })
  @Column({ type: 'uuid', nullable: true })
  componentId: string | null;

  @ApiProperty({ description: 'Frequency in days between washes' })
  @Column({ type: 'integer' })
  frequencyDays: number;

  @ApiPropertyOptional({ description: 'Date of last wash' })
  @Column({ type: 'date', nullable: true })
  lastWashDate: Date | null;

  @ApiProperty({ description: 'Next scheduled wash date' })
  @Column({ type: 'date' })
  nextWashDate: Date;

  @ApiPropertyOptional({ description: 'User assigned to perform the wash' })
  @Column({ type: 'uuid', nullable: true })
  assignedToUserId: string | null;

  @ApiProperty({ description: 'Is schedule active', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Additional metadata', default: {} })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
