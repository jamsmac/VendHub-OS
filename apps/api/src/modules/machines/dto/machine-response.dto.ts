import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { BaseResponseDto } from "../../../common/dto";
import {
  MachineType,
  MachineStatus,
  MachineConnectionStatus,
  DepreciationMethod,
  DisposalReason,
  MoveReason,
  ComponentType,
  ComponentStatus,
  ErrorSeverity,
  MaintenanceType,
  MaintenanceStatus,
} from "../entities/machine.entity";

/**
 * Machine Response DTO
 * Safe representation of Machine entity
 * Machine data is generally safe to expose to authorized users
 * Only excludes internal audit fields
 */
@Expose()
export class MachineResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organizationId: string;

  @ApiProperty({ description: "Unique machine number" })
  @Expose()
  machineNumber: string;

  @ApiProperty({ description: "Machine display name" })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: "Serial number" })
  @Expose()
  serialNumber?: string;

  @ApiProperty({ description: "Machine type", enum: MachineType })
  @Expose()
  type: MachineType;

  @ApiProperty({
    description: "Current operational status",
    enum: MachineStatus,
  })
  @Expose()
  status: MachineStatus;

  @ApiProperty({
    description: "Connection status",
    enum: MachineConnectionStatus,
  })
  @Expose()
  connectionStatus: MachineConnectionStatus;

  @ApiPropertyOptional({ description: "Manufacturer name" })
  @Expose()
  manufacturer?: string;

  @ApiPropertyOptional({ description: "Machine model" })
  @Expose()
  model?: string;

  @ApiPropertyOptional({ description: "Year of manufacture" })
  @Expose()
  yearOfManufacture?: number;

  @ApiPropertyOptional({ description: "Firmware version" })
  @Expose()
  firmwareVersion?: string;

  @ApiPropertyOptional({ description: "QR code for complaints" })
  @Expose()
  qrCode?: string;

  @ApiPropertyOptional({ description: "QR code URL" })
  @Expose()
  qrCodeUrl?: string;

  @ApiPropertyOptional({ description: "Location ID" })
  @Expose()
  locationId?: string;

  @ApiPropertyOptional({ description: "Latitude (GPS)" })
  @Expose()
  latitude?: number;

  @ApiPropertyOptional({ description: "Longitude (GPS)" })
  @Expose()
  longitude?: number;

  @ApiPropertyOptional({ description: "Installation address" })
  @Expose()
  address?: string;

  @ApiPropertyOptional({ description: "Installation date" })
  @Expose()
  installationDate?: Date;

  @ApiPropertyOptional({ description: "Last maintenance date" })
  @Expose()
  lastMaintenanceDate?: Date;

  @ApiPropertyOptional({ description: "Next scheduled maintenance date" })
  @Expose()
  nextMaintenanceDate?: Date;

  @ApiPropertyOptional({ description: "Last ping/heartbeat timestamp" })
  @Expose()
  lastPingAt?: Date;

  @ApiPropertyOptional({ description: "Last refill date" })
  @Expose()
  lastRefillDate?: Date;

  @ApiPropertyOptional({ description: "Last collection (cash pickup) date" })
  @Expose()
  lastCollectionDate?: Date;

  @ApiPropertyOptional({ description: "Last data sync timestamp" })
  @Expose()
  lastSyncAt?: Date;

  @ApiProperty({ description: "Maximum product slots" })
  @Expose()
  maxProductSlots: number;

  @ApiProperty({ description: "Current number of products loaded" })
  @Expose()
  currentProductCount: number;

  @ApiProperty({
    description: "Low stock threshold percentage",
    example: 10,
  })
  @Expose()
  lowStockThresholdPercent: number;

  @ApiProperty({ description: "Cash capacity (UZS)" })
  @Expose()
  cashCapacity: number;

  @ApiProperty({ description: "Current cash amount (UZS)" })
  @Expose()
  currentCashAmount: number;

  @ApiProperty({ description: "Accepts cash payments" })
  @Expose()
  acceptsCash: boolean;

  @ApiProperty({ description: "Accepts card payments" })
  @Expose()
  acceptsCard: boolean;

  @ApiProperty({ description: "Accepts QR code payments" })
  @Expose()
  acceptsQr: boolean;

  @ApiProperty({ description: "Accepts NFC payments" })
  @Expose()
  acceptsNfc: boolean;

  @ApiPropertyOptional({ description: "Assigned operator user ID" })
  @Expose()
  assignedOperatorId?: string;

  @ApiProperty({ description: "Total sales count (cached)" })
  @Expose()
  totalSalesCount: number;

  @ApiProperty({ description: "Total revenue (UZS, cached)" })
  @Expose()
  totalRevenue: number;

  @ApiPropertyOptional({ description: "Purchase price (UZS)" })
  @Expose()
  purchasePrice?: number;

  @ApiPropertyOptional({ description: "Purchase date" })
  @Expose()
  purchaseDate?: Date;

  @ApiPropertyOptional({ description: "Depreciation period in years" })
  @Expose()
  depreciationYears?: number;

  @ApiProperty({
    description: "Depreciation method",
    enum: DepreciationMethod,
  })
  @Expose()
  depreciationMethod: DepreciationMethod;

  @ApiProperty({ description: "Accumulated depreciation (UZS)" })
  @Expose()
  accumulatedDepreciation: number;

  @ApiPropertyOptional({ description: "Last depreciation calculation date" })
  @Expose()
  lastDepreciationDate?: Date;

  @ApiProperty({ description: "Machine is disposed/written off" })
  @Expose()
  isDisposed: boolean;

  @ApiPropertyOptional({ description: "Disposal date" })
  @Expose()
  disposalDate?: Date;

  @ApiPropertyOptional({
    description: "Reason for disposal",
    enum: DisposalReason,
  })
  @Expose()
  disposalReason?: DisposalReason;

  @ApiPropertyOptional({ description: "Disposal notes" })
  @Expose()
  disposalNotes?: string;

  @ApiProperty({
    description: "Current telemetry data",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  telemetry: Record<string, unknown>;

  @ApiProperty({
    description: "Machine settings",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  settings: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Additional notes" })
  @Expose()
  notes?: string;

  @ApiPropertyOptional({ description: "Description" })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ description: "Machine image URL" })
  @Expose()
  image?: string;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Associated contract ID" })
  @Expose()
  contractId?: string;

  // Computed properties
  @ApiProperty({ description: "Is machine online (computed)" })
  @Expose()
  get isOnline(): boolean {
    return this.connectionStatus === MachineConnectionStatus.ONLINE;
  }

  @ApiProperty({ description: "Needs maintenance (computed)" })
  @Expose()
  get needsMaintenance(): boolean {
    if (!this.nextMaintenanceDate) return false;
    return new Date() >= this.nextMaintenanceDate;
  }

  @ApiProperty({ description: "Cash compartment is full (computed)" })
  @Expose()
  get isCashFull(): boolean {
    if (!this.cashCapacity || this.cashCapacity <= 0) return false;
    return this.currentCashAmount >= this.cashCapacity * 0.9;
  }

  @ApiProperty({ description: "Current book value (UZS, computed)" })
  @Expose()
  get currentBookValue(): number {
    if (!this.purchasePrice) return 0;
    return Math.max(0, this.purchasePrice - this.accumulatedDepreciation);
  }

  // Relations excluded
  @Exclude()
  slots?: Record<string, unknown>[];

  @Exclude()
  locationHistory?: Record<string, unknown>[];

  @Exclude()
  inventory?: Record<string, unknown>[];

  @Exclude()
  tasks?: Record<string, unknown>[];

  @Exclude()
  transactions?: Record<string, unknown>[];

  @Exclude()
  complaints?: Record<string, unknown>[];
}

/**
 * Machine Slot Response DTO
 * Represents a slot/position in the machine
 */
@Expose()
export class MachineSlotResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Machine ID" })
  @Expose()
  machineId: string;

  @ApiProperty({ description: "Slot location code (e.g., A1, B2)" })
  @Expose()
  slotNumber: string;

  @ApiPropertyOptional({ description: "Product ID in this slot" })
  @Expose()
  productId?: string;

  @ApiProperty({ description: "Slot capacity" })
  @Expose()
  capacity: number;

  @ApiProperty({ description: "Current quantity in slot" })
  @Expose()
  currentQuantity: number;

  @ApiPropertyOptional({ description: "Price per unit (UZS)" })
  @Expose()
  price?: number;

  @ApiPropertyOptional({ description: "Cost price per unit (UZS)" })
  @Expose()
  costPrice?: number;

  @ApiProperty({ description: "Slot is active" })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: "Minimum quantity threshold" })
  @Expose()
  minQuantity: number;

  @ApiPropertyOptional({ description: "Last refill timestamp" })
  @Expose()
  lastRefilledAt?: Date;

  @ApiProperty({ description: "Total units sold from this slot" })
  @Expose()
  totalSold: number;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @ApiProperty({ description: "Slot needs refill (computed)" })
  @Expose()
  get needsRefill(): boolean {
    if (this.capacity <= 0) return false;
    return this.currentQuantity <= this.minQuantity;
  }

  @ApiProperty({ description: "Fill percentage (computed)" })
  @Expose()
  get fillPercentage(): number {
    if (this.capacity <= 0) return 0;
    return Math.round((this.currentQuantity / this.capacity) * 100);
  }

  @Exclude()
  machine?: Record<string, unknown>;
}

/**
 * Machine Location History Response DTO
 */
@Expose()
export class MachineLocationHistoryResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Machine ID" })
  @Expose()
  machineId: string;

  @ApiPropertyOptional({ description: "Previous location ID" })
  @Expose()
  fromLocationId?: string;

  @ApiProperty({ description: "New location ID" })
  @Expose()
  toLocationId: string;

  @ApiProperty({ description: "Move timestamp" })
  @Expose()
  movedAt: Date;

  @ApiProperty({ description: "User ID who moved the machine" })
  @Expose()
  movedByUserId: string;

  @ApiProperty({ description: "Reason for move", enum: MoveReason })
  @Expose()
  reason: MoveReason;

  @ApiPropertyOptional({ description: "Additional notes" })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @Exclude()
  machine?: Record<string, unknown>;
}

/**
 * Machine Component Response DTO
 */
@Expose()
export class MachineComponentResponseDto extends BaseResponseDto {
  @ApiPropertyOptional({
    description: "Machine ID this component is installed in",
  })
  @Expose()
  machineId?: string;

  @ApiProperty({ description: "Component type", enum: ComponentType })
  @Expose()
  componentType: ComponentType;

  @ApiProperty({ description: "Component name" })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: "Serial number" })
  @Expose()
  serialNumber?: string;

  @ApiPropertyOptional({ description: "Manufacturer" })
  @Expose()
  manufacturer?: string;

  @ApiPropertyOptional({ description: "Model" })
  @Expose()
  model?: string;

  @ApiProperty({ description: "Component status", enum: ComponentStatus })
  @Expose()
  status: ComponentStatus;

  @ApiPropertyOptional({ description: "Purchase date" })
  @Expose()
  purchaseDate?: Date;

  @ApiPropertyOptional({ description: "Purchase price (UZS)" })
  @Expose()
  purchasePrice?: number;

  @ApiPropertyOptional({ description: "Installation date" })
  @Expose()
  installedAt?: Date;

  @ApiPropertyOptional({ description: "User who installed this component" })
  @Expose()
  installedByUserId?: string;

  @ApiPropertyOptional({ description: "Warranty expiration date" })
  @Expose()
  warrantyUntil?: Date;

  @ApiPropertyOptional({ description: "Expected component life in hours" })
  @Expose()
  expectedLifeHours?: number;

  @ApiProperty({ description: "Current operation hours" })
  @Expose()
  currentHours: number;

  @ApiPropertyOptional({ description: "Notes" })
  @Expose()
  notes?: string;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @ApiProperty({ description: "Warranty is valid (computed)" })
  @Expose()
  get isWarrantyValid(): boolean {
    if (!this.warrantyUntil) return false;
    return new Date() <= this.warrantyUntil;
  }

  @ApiProperty({ description: "Life percentage used (computed)" })
  @Expose()
  get lifePercentage(): number {
    if (!this.expectedLifeHours || this.expectedLifeHours <= 0) return 0;
    return Math.round((this.currentHours / this.expectedLifeHours) * 100);
  }

  @Exclude()
  machine?: Record<string, unknown>;
}

/**
 * Machine Error Log Response DTO
 */
@Expose()
export class MachineErrorLogResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Machine ID" })
  @Expose()
  machineId: string;

  @ApiProperty({ description: "Error code" })
  @Expose()
  errorCode: string;

  @ApiProperty({ description: "Error message" })
  @Expose()
  message: string;

  @ApiProperty({ description: "Error severity", enum: ErrorSeverity })
  @Expose()
  severity: ErrorSeverity;

  @ApiProperty({ description: "Error occurrence timestamp" })
  @Expose()
  occurredAt: Date;

  @ApiPropertyOptional({ description: "Error resolution timestamp" })
  @Expose()
  resolvedAt?: Date;

  @ApiPropertyOptional({ description: "User who resolved the error" })
  @Expose()
  resolvedByUserId?: string;

  @ApiPropertyOptional({ description: "Resolution details" })
  @Expose()
  resolution?: string;

  @ApiPropertyOptional({ description: "Associated task ID" })
  @Expose()
  taskId?: string;

  @ApiProperty({
    description: "Context data at time of error",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  context: Record<string, unknown>;

  @ApiProperty({ description: "Error is resolved (computed)" })
  @Expose()
  get isResolved(): boolean {
    return this.resolvedAt !== null;
  }

  @Exclude()
  machine?: Record<string, unknown>;
}

/**
 * Machine Maintenance Schedule Response DTO
 */
@Expose()
export class MachineMaintenanceScheduleResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "Machine ID" })
  @Expose()
  machineId: string;

  @ApiProperty({ description: "Maintenance type", enum: MaintenanceType })
  @Expose()
  maintenanceType: MaintenanceType;

  @ApiProperty({ description: "Maintenance status", enum: MaintenanceStatus })
  @Expose()
  status: MaintenanceStatus;

  @ApiProperty({ description: "Scheduled date" })
  @Expose()
  scheduledDate: Date;

  @ApiPropertyOptional({ description: "Completion date" })
  @Expose()
  completedDate?: Date;

  @ApiPropertyOptional({ description: "Assigned to user ID" })
  @Expose()
  assignedToUserId?: string;

  @ApiPropertyOptional({ description: "Completed by user ID" })
  @Expose()
  completedByUserId?: string;

  @ApiPropertyOptional({ description: "Associated task ID" })
  @Expose()
  taskId?: string;

  @ApiPropertyOptional({ description: "Description" })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ description: "Notes" })
  @Expose()
  notes?: string;

  @ApiPropertyOptional({ description: "Estimated duration in minutes" })
  @Expose()
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ description: "Actual duration in minutes" })
  @Expose()
  actualDurationMinutes?: number;

  @ApiPropertyOptional({ description: "Estimated cost (UZS)" })
  @Expose()
  estimatedCost?: number;

  @ApiPropertyOptional({ description: "Actual cost (UZS)" })
  @Expose()
  actualCost?: number;

  @ApiPropertyOptional({
    description: "Repeat interval days for recurring maintenance",
  })
  @Expose()
  repeatIntervalDays?: number;

  @ApiPropertyOptional({ description: "Next scheduled maintenance ID" })
  @Expose()
  nextScheduleId?: string;

  @ApiProperty({
    description: "Checklist items",
    type: "object",
    isArray: true,
    additionalProperties: true,
  })
  @Expose()
  checklist: Array<{
    item: string;
    completed: boolean;
    completedAt?: Date;
  }>;

  @ApiProperty({
    description: "Metadata",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  metadata: Record<string, unknown>;

  @ApiProperty({ description: "Maintenance is overdue (computed)" })
  @Expose()
  get isOverdue(): boolean {
    if (this.status !== MaintenanceStatus.SCHEDULED) return false;
    return new Date() > this.scheduledDate;
  }

  @Exclude()
  machine?: Record<string, unknown>;
}
