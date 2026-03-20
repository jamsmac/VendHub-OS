import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// ENUMS
// ============================================================================

export enum WarehouseType {
  MAIN = "main",
  REGIONAL = "regional",
  TRANSIT = "transit",
  VIRTUAL = "virtual",
}

export enum StockMovementType {
  RECEIPT = "receipt",
  TRANSFER = "transfer",
  DISPATCH = "dispatch",
  RETURN = "return",
  ADJUSTMENT = "adjustment",
  WRITE_OFF = "write_off",
}

export enum StockMovementStatus {
  PENDING = "pending",
  IN_TRANSIT = "in_transit",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum WarehouseZoneType {
  RECEIVING = "receiving",
  STORAGE = "storage",
  PICKING = "picking",
  PACKING = "packing",
  SHIPPING = "shipping",
  QUARANTINE = "quarantine",
  RETURNS = "returns",
}

export enum StockTakeStatus {
  PLANNED = "planned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum StockReservationStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PARTIALLY_FULFILLED = "partially_fulfilled",
  FULFILLED = "fulfilled",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

// ============================================================================
// WAREHOUSE ENTITY
// ============================================================================

@Entity("warehouses")
@Index(["organizationId"])
@Index(["code"], { unique: true, where: '"deleted_at" IS NULL' })
@Index(["type"])
@Index(["managerId"])
export class Warehouse extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "varchar", length: 50 })
  code: string;

  @Column({ type: "enum", enum: WarehouseType, default: WarehouseType.MAIN })
  type: WarehouseType;

  @Column({ type: "text", nullable: true })
  address: string | null;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: "uuid", nullable: true })
  managerId: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "int", nullable: true })
  capacity: number | null;

  @Column({ type: "int", default: 0 })
  currentOccupancy: number;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => WarehouseZone, (zone) => zone.warehouse)
  zones: WarehouseZone[];
}

// ============================================================================
// STOCK MOVEMENT ENTITY
// ============================================================================

@Entity("stock_movements")
@Index(["organizationId"])
@Index(["fromWarehouseId"])
@Index(["toWarehouseId"])
@Index(["productId"])
@Index(["type"])
@Index(["status"])
@Index(["requestedAt"])
export class StockMovement extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid", nullable: true })
  fromWarehouseId: string | null;

  @Column({ type: "uuid", nullable: true })
  toWarehouseId: string | null;

  @Column({ type: "uuid" })
  productId: string;

  @Column({ type: "decimal", precision: 12, scale: 3 })
  quantity: number;

  @Column({ type: "varchar", length: 20, default: "pcs" })
  unitOfMeasure: string;

  @Column({ type: "enum", enum: StockMovementType })
  type: StockMovementType;

  @Column({
    type: "enum",
    enum: StockMovementStatus,
    default: StockMovementStatus.PENDING,
  })
  status: StockMovementStatus;

  @Column({ type: "varchar", length: 100, nullable: true })
  referenceNumber: string | null;

  @Column({ type: "uuid" })
  requestedByUserId: string;

  @Column({ type: "uuid", nullable: true })
  approvedByUserId: string | null;

  @Column({ type: "uuid", nullable: true })
  completedByUserId: string | null;

  @Column({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  requestedAt: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt: Date | null;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  cost: number | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// INVENTORY BATCH ENTITY
// ============================================================================

@Entity("inventory_batches")
@Index(["organizationId"])
@Index(["warehouseId"])
@Index(["productId"])
@Index(["expiryDate"])
@Index(["warehouseId", "productId", "batchNumber"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class InventoryBatch extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "uuid" })
  warehouseId: string;

  @Column({ type: "uuid" })
  productId: string;

  @Column({ type: "varchar", length: 100 })
  batchNumber: string;

  @Column({ type: "decimal", precision: 12, scale: 3 })
  quantity: number;

  @Column({ type: "decimal", precision: 12, scale: 3 })
  remainingQuantity: number;

  @Column({ type: "varchar", length: 20, default: "pcs" })
  unitOfMeasure: string;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  costPerUnit: number | null;

  @Column({ type: "date", nullable: true })
  expiryDate: Date | null;

  @Column({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  receivedAt: Date;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// WAREHOUSE ZONE ENTITY (from VHM24-repo)
// ============================================================================

// DUPLICATE: @Entity("warehouse_zones")
@Index(["warehouseId"])
@Index(["zoneType"])
export class WarehouseZone extends BaseEntity {
  @Column({ type: "uuid" })
  warehouseId: string;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.zones)
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 50 })
  code: string;

  @Column({ type: "enum", enum: WarehouseZoneType })
  zoneType: WarehouseZoneType;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  areaSqm: number | null;

  @Column({ type: "integer", nullable: true })
  capacity: number | null;

  @Column({ type: "integer", default: 0 })
  currentOccupancy: number;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// STOCK TAKE ENTITY (from VHM24-repo)
// ============================================================================

@Entity("stock_takes")
@Index(["warehouseId", "status"])
export class StockTake extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 50, unique: true })
  stockTakeNumber: string;

  @Column({ type: "uuid" })
  warehouseId: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({
    type: "enum",
    enum: StockTakeStatus,
    default: StockTakeStatus.PLANNED,
  })
  status: StockTakeStatus;

  @Column({ type: "date" })
  scheduledDate: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  startedAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt: Date | null;

  @Column({ type: "uuid", nullable: true })
  supervisorId: string | null;

  @Column({ type: "simple-array", nullable: true })
  teamMembers: string[] | null;

  @Column({ type: "simple-array", nullable: true })
  zonesToCount: string[] | null;

  @Column({ type: "boolean", default: false })
  isFullInventory: boolean;

  @Column({ type: "integer", default: 0 })
  itemsCounted: number;

  @Column({ type: "integer", default: 0 })
  discrepanciesFound: number;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", default: {} })
  results: Record<string, unknown>;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// STOCK RESERVATION ENTITY (from VHM24-repo)
// ============================================================================

@Entity("stock_reservations")
@Index(["warehouseId", "productId"])
@Index(["status", "expiresAt"])
export class StockReservation extends BaseEntity {
  @Column({ type: "uuid" })
  organizationId: string;

  @Column({ type: "varchar", length: 50, unique: true })
  reservationNumber: string;

  @Column({ type: "uuid" })
  warehouseId: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @Column({ type: "uuid" })
  productId: string;

  @Column({ type: "uuid", nullable: true })
  batchId: string | null;

  @Column({ type: "decimal", precision: 10, scale: 3 })
  quantityReserved: number;

  @Column({ type: "decimal", precision: 10, scale: 3, default: 0 })
  quantityFulfilled: number;

  @Column({ type: "varchar", length: 20 })
  unit: string;

  @Column({
    type: "enum",
    enum: StockReservationStatus,
    default: StockReservationStatus.PENDING,
  })
  status: StockReservationStatus;

  @Column({ type: "varchar", length: 100 })
  reservedFor: string;

  @Column({ type: "uuid", nullable: true })
  reservedByUserId: string | null;

  @Column({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  reservedAt: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  fulfilledAt: Date | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
