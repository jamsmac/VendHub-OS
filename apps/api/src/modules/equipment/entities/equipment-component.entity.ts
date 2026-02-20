/**
 * Equipment Module Entities
 * Equipment components, hopper types, spare parts, maintenance, movements, and washing schedules
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Equipment Component Type
 */
export enum EquipmentComponentType {
  HOPPER = "hopper",
  GRINDER = "grinder",
  BREW_UNIT = "brew_unit",
  MIXER = "mixer",
  PUMP = "pump",
  HEATER = "heater",
  DISPENSER = "dispenser",
  COMPRESSOR = "compressor",
  BOARD = "board",
  MOTOR = "motor",
  VALVE = "valve",
  SENSOR = "sensor",
  FILTER = "filter",
  TANK = "tank",
  CONVEYOR = "conveyor",
  DISPLAY = "display",
  CARD_READER = "card_reader",
  OTHER = "other",
}

/**
 * Equipment Component Status
 */
export enum EquipmentComponentStatus {
  NEW = "new",
  INSTALLED = "installed",
  IN_USE = "in_use",
  NEEDS_MAINTENANCE = "needs_maintenance",
  IN_REPAIR = "in_repair",
  REPAIRED = "repaired",
  DECOMMISSIONED = "decommissioned",
  DISPOSED = "disposed",
}

/**
 * Component Maintenance Type
 */
export enum ComponentMaintenanceType {
  CLEANING = "cleaning",
  LUBRICATION = "lubrication",
  CALIBRATION = "calibration",
  REPAIR = "repair",
  REPLACEMENT = "replacement",
  INSPECTION = "inspection",
  SOFTWARE_UPDATE = "software_update",
  PREVENTIVE = "preventive",
  OTHER = "other",
}

/**
 * Component Location Type (from VHM24-repo)
 * Tracks where a component currently is in the lifecycle
 */
export enum ComponentLocationType {
  MACHINE = "machine",
  WAREHOUSE = "warehouse",
  WASHING = "washing",
  DRYING = "drying",
  REPAIR = "repair",
}

/**
 * Component Movement Type (from VHM24-repo)
 * Describes what kind of movement occurred
 */
export enum ComponentMovementType {
  INSTALL = "install",
  REMOVE = "remove",
  SEND_TO_WASH = "send_to_wash",
  RETURN_FROM_WASH = "return_from_wash",
  SEND_TO_DRYING = "send_to_drying",
  RETURN_FROM_DRYING = "return_from_drying",
  MOVE_TO_WAREHOUSE = "move_to_warehouse",
  MOVE_TO_MACHINE = "move_to_machine",
  SEND_TO_REPAIR = "send_to_repair",
  RETURN_FROM_REPAIR = "return_from_repair",
}

// ============================================================================
// EQUIPMENT COMPONENT ENTITY
// ============================================================================

/**
 * Equipment Component Entity
 * Represents a physical component installed in or associated with a vending machine
 */
@Entity("equipment_components")
@Index(["organizationId"])
@Index(["machineId"])
@Index(["componentType"])
@Index(["componentStatus"])
@Index(["serialNumber"])
export class EquipmentComponent extends BaseEntity {
  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiPropertyOptional({
    description: "Machine ID where component is installed",
  })
  @Column({ type: "uuid", nullable: true })
  machineId: string | null;

  @ApiProperty({
    enum: EquipmentComponentType,
    description: "Type of component",
  })
  @Column({ type: "enum", enum: EquipmentComponentType })
  componentType: EquipmentComponentType;

  @ApiProperty({
    enum: EquipmentComponentStatus,
    description: "Current status of the component",
  })
  @Column({
    type: "enum",
    enum: EquipmentComponentStatus,
    default: EquipmentComponentStatus.NEW,
  })
  componentStatus: EquipmentComponentStatus;

  @ApiProperty({
    description: "Component name",
    example: "Coffee Grinder G200",
  })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiPropertyOptional({ description: "Serial number" })
  @Column({ type: "varchar", length: 100, nullable: true })
  serialNumber: string | null;

  @ApiPropertyOptional({ description: "Manufacturer name" })
  @Column({ type: "varchar", length: 100, nullable: true })
  manufacturer: string | null;

  @ApiPropertyOptional({ description: "Model name/number" })
  @Column({ type: "varchar", length: 100, nullable: true })
  model: string | null;

  @ApiPropertyOptional({ description: "Date of purchase" })
  @Column({ type: "date", nullable: true })
  purchaseDate: Date | null;

  @ApiPropertyOptional({ description: "Purchase price in UZS" })
  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  purchasePrice: number | null;

  @ApiPropertyOptional({ description: "Warranty expiration date" })
  @Column({ type: "date", nullable: true })
  warrantyUntil: Date | null;

  @ApiPropertyOptional({ description: "Date when the component was installed" })
  @Column({ type: "date", nullable: true })
  installedAt: Date | null;

  @ApiPropertyOptional({ description: "Expected life in operating hours" })
  @Column({ type: "integer", nullable: true })
  expectedLifeHours: number | null;

  @ApiProperty({ description: "Current operating hours", default: 0 })
  @Column({ type: "integer", default: 0 })
  currentHours: number;

  @ApiPropertyOptional({ description: "Date of last maintenance" })
  @Column({ type: "date", nullable: true })
  lastMaintenanceDate: Date | null;

  @ApiPropertyOptional({ description: "Scheduled next maintenance date" })
  @Column({ type: "date", nullable: true })
  nextMaintenanceDate: Date | null;

  // Location tracking (from VHM24-repo)
  @ApiProperty({
    enum: ComponentLocationType,
    description: "Current physical location type",
    default: ComponentLocationType.WAREHOUSE,
  })
  @Column({
    type: "enum",
    enum: ComponentLocationType,
    default: ComponentLocationType.WAREHOUSE,
  })
  currentLocationType: ComponentLocationType;

  @ApiPropertyOptional({
    description: "Location reference (warehouse name, etc.)",
  })
  @Column({ type: "varchar", length: 100, nullable: true })
  currentLocationRef: string | null;

  @ApiPropertyOptional({ description: "Maintenance interval in days" })
  @Column({ type: "integer", nullable: true })
  maintenanceIntervalDays: number | null;

  // Replacement tracking (from VHM24-repo)
  @ApiPropertyOptional({ description: "Date when replaced" })
  @Column({ type: "date", nullable: true })
  replacementDate: Date | null;

  @ApiPropertyOptional({
    description: "ID of component that replaced this one",
  })
  @Column({ type: "uuid", nullable: true })
  replacedByComponentId: string | null;

  @ApiPropertyOptional({ description: "ID of component this one replaces" })
  @Column({ type: "uuid", nullable: true })
  replacesComponentId: string | null;

  @ApiPropertyOptional({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @ApiProperty({ description: "Additional metadata", default: {} })
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// HOPPER TYPE ENTITY (Dictionary)
// ============================================================================

/**
 * Hopper Type Entity
 * Dictionary of hopper types used in vending machines
 */
@Entity("hopper_types")
@Index(["organizationId"])
export class HopperType extends BaseEntity {
  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({
    description: "Hopper type name",
    example: "Standard Coffee Hopper 1.5L",
  })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiProperty({ description: "Volume in milliliters" })
  @Column({ type: "integer" })
  volumeMl: number;

  @ApiPropertyOptional({
    description: "Material (e.g. plastic, stainless steel)",
  })
  @Column({ type: "varchar", length: 100, nullable: true })
  material: string | null;

  @ApiProperty({ description: "Compatible machine types", default: [] })
  @Column({ type: "jsonb", default: [] })
  compatibleMachineTypes: string[];

  @ApiProperty({ description: "Is active", default: true })
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @ApiProperty({ description: "Additional metadata", default: {} })
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// SPARE PART ENTITY
// ============================================================================

/**
 * Spare Part Entity
 * Inventory of spare parts for equipment maintenance
 */
@Entity("spare_parts")
@Index(["organizationId"])
@Index(["partNumber"])
@Index(["supplierId"])
export class SparePart extends BaseEntity {
  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({ description: "Part number / SKU", example: "GRD-200-BLD" })
  @Column({ type: "varchar", length: 100 })
  partNumber: string;

  @ApiProperty({ description: "Part name", example: "Grinder Blade Set" })
  @Column({ type: "varchar", length: 200 })
  name: string;

  @ApiPropertyOptional({ description: "Part description" })
  @Column({ type: "text", nullable: true })
  description: string | null;

  @ApiProperty({ description: "Compatible component types", default: [] })
  @Column({ type: "jsonb", default: [] })
  compatibleComponentTypes: EquipmentComponentType[];

  @ApiProperty({ description: "Current quantity in stock", default: 0 })
  @Column({ type: "integer", default: 0 })
  quantity: number;

  @ApiProperty({
    description: "Minimum quantity threshold for reorder",
    default: 0,
  })
  @Column({ type: "integer", default: 0 })
  minQuantity: number;

  @ApiPropertyOptional({ description: "Cost price in UZS" })
  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  costPrice: number | null;

  @ApiPropertyOptional({ description: "Supplier ID" })
  @Column({ type: "uuid", nullable: true })
  supplierId: string | null;

  @ApiPropertyOptional({ description: "Storage location identifier" })
  @Column({ type: "varchar", length: 100, nullable: true })
  storageLocation: string | null;

  @ApiProperty({ description: "Is active", default: true })
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @ApiProperty({ description: "Additional metadata", default: {} })
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// COMPONENT MAINTENANCE ENTITY
// ============================================================================

/**
 * Component Maintenance Entity
 * Records of maintenance performed on equipment components
 */
@Entity("component_maintenance")
@Index(["componentId"])
@Index(["organizationId"])
@Index(["performedAt"])
export class ComponentMaintenance extends BaseEntity {
  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({ description: "Equipment component ID" })
  @Column({ type: "uuid" })
  componentId: string;

  @ManyToOne(() => EquipmentComponent, { onDelete: "SET NULL" })
  @JoinColumn({ name: "component_id" })
  component: EquipmentComponent;

  @ApiProperty({
    enum: ComponentMaintenanceType,
    description: "Type of maintenance",
  })
  @Column({ type: "enum", enum: ComponentMaintenanceType })
  maintenanceType: ComponentMaintenanceType;

  @ApiPropertyOptional({ description: "Description of work performed" })
  @Column({ type: "text", nullable: true })
  description: string | null;

  // Cost breakdown (from VHM24-repo)
  @ApiProperty({ description: "Labor cost in UZS", default: 0 })
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  laborCost: number;

  @ApiProperty({ description: "Parts cost in UZS", default: 0 })
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  partsCost: number;

  @ApiProperty({ description: "Total cost in UZS", default: 0 })
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalCost: number;

  @ApiProperty({ description: "User who performed the maintenance" })
  @Column({ type: "uuid" })
  performedByUserId: string;

  @ApiProperty({ description: "Date/time maintenance was performed" })
  @Column({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  performedAt: Date;

  @ApiPropertyOptional({ description: "Duration of work in minutes" })
  @Column({ type: "integer", nullable: true })
  durationMinutes: number | null;

  @ApiProperty({
    description: "Spare parts used during maintenance",
    default: [],
  })
  @Column({ type: "jsonb", default: [] })
  partsUsed: {
    sparePartId: string;
    quantity: number;
    partNumber?: string;
    name?: string;
  }[];

  // Result and follow-up (from VHM24-repo)
  @ApiPropertyOptional({ description: "Result of maintenance work" })
  @Column({ type: "text", nullable: true })
  result: string | null;

  @ApiProperty({
    description: "Whether maintenance was successful",
    default: true,
  })
  @Column({ type: "boolean", default: true })
  isSuccessful: boolean;

  @ApiPropertyOptional({ description: "Recommended next maintenance date" })
  @Column({ type: "date", nullable: true })
  nextMaintenanceDate: Date | null;

  // Documentation (from VHM24-repo)
  @ApiPropertyOptional({ description: "Photo URLs" })
  @Column({ type: "simple-array", nullable: true })
  photoUrls: string[] | null;

  @ApiPropertyOptional({ description: "Document URLs (reports, receipts)" })
  @Column({ type: "simple-array", nullable: true })
  documentUrls: string[] | null;

  @ApiPropertyOptional({ description: "Related task ID" })
  @Column({ type: "uuid", nullable: true })
  taskId: string | null;

  @ApiPropertyOptional({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @ApiProperty({ description: "Additional metadata", default: {} })
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// COMPONENT MOVEMENT ENTITY
// ============================================================================

/**
 * Component Movement Entity
 * Tracks movement of components between locations (machines, warehouse, washing, repair)
 */
@Entity("component_movements")
@Index(["componentId"])
@Index(["organizationId"])
@Index(["movedAt"])
@Index(["movementType"])
@Index(["relatedMachineId"])
export class ComponentMovement extends BaseEntity {
  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({ description: "Equipment component ID" })
  @Column({ type: "uuid" })
  componentId: string;

  @ManyToOne(() => EquipmentComponent, { onDelete: "SET NULL" })
  @JoinColumn({ name: "component_id" })
  component: EquipmentComponent;

  // Movement type (from VHM24-repo)
  @ApiPropertyOptional({
    enum: ComponentMovementType,
    description: "Type of movement",
  })
  @Column({ type: "enum", enum: ComponentMovementType, nullable: true })
  movementType: ComponentMovementType | null;

  // Location-based tracking (from VHM24-repo)
  @ApiPropertyOptional({
    enum: ComponentLocationType,
    description: "Source location type",
  })
  @Column({ type: "enum", enum: ComponentLocationType, nullable: true })
  fromLocationType: ComponentLocationType | null;

  @ApiPropertyOptional({ description: "Source location reference" })
  @Column({ type: "varchar", length: 100, nullable: true })
  fromLocationRef: string | null;

  @ApiPropertyOptional({
    enum: ComponentLocationType,
    description: "Destination location type",
  })
  @Column({ type: "enum", enum: ComponentLocationType, nullable: true })
  toLocationType: ComponentLocationType | null;

  @ApiPropertyOptional({ description: "Destination location reference" })
  @Column({ type: "varchar", length: 100, nullable: true })
  toLocationRef: string | null;

  // Legacy machine-to-machine fields (kept for backward compatibility)
  @ApiPropertyOptional({ description: "Source machine ID" })
  @Column({ type: "uuid", nullable: true })
  fromMachineId: string | null;

  @ApiPropertyOptional({ description: "Destination machine ID" })
  @Column({ type: "uuid", nullable: true })
  toMachineId: string | null;

  // Related machine (from VHM24-repo)
  @ApiPropertyOptional({ description: "Related machine ID" })
  @Column({ type: "uuid", nullable: true })
  relatedMachineId: string | null;

  @ApiPropertyOptional({ description: "Related task ID" })
  @Column({ type: "uuid", nullable: true })
  taskId: string | null;

  @ApiProperty({ description: "User who moved the component" })
  @Column({ type: "uuid" })
  movedByUserId: string;

  @ApiProperty({ description: "Date/time of movement" })
  @Column({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  movedAt: Date;

  @ApiPropertyOptional({ description: "Comment about the movement" })
  @Column({ type: "text", nullable: true })
  reason: string | null;

  @ApiProperty({ description: "Additional metadata", default: {} })
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// WASHING SCHEDULE ENTITY
// ============================================================================

/**
 * Washing Schedule Entity
 * Recurring washing/cleaning schedules for machines and components
 */
@Entity("washing_schedules")
@Index(["organizationId"])
@Index(["machineId"])
@Index(["nextWashDate"])
export class WashingSchedule extends BaseEntity {
  @ApiProperty({ description: "Organization ID" })
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty({ description: "Machine ID" })
  @Column({ type: "uuid" })
  machineId: string;

  @ApiPropertyOptional({
    description: "Specific component ID (null = entire machine)",
  })
  @Column({ type: "uuid", nullable: true })
  componentId: string | null;

  @ApiProperty({ description: "Frequency in days between washes" })
  @Column({ type: "integer" })
  frequencyDays: number;

  @ApiPropertyOptional({ description: "Date of last wash" })
  @Column({ type: "date", nullable: true })
  lastWashDate: Date | null;

  @ApiProperty({ description: "Next scheduled wash date" })
  @Column({ type: "date" })
  nextWashDate: Date;

  @ApiPropertyOptional({ description: "User assigned to perform the wash" })
  @Column({ type: "uuid", nullable: true })
  assignedToUserId: string | null;

  @ApiProperty({ description: "Is schedule active", default: true })
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @ApiProperty({ description: "Additional metadata", default: {} })
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
