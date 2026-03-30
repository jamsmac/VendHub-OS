/**
 * Machine Entities for VendHub OS
 * Complete vending machine management with locations, history, and telemetry
 */

import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from "typeorm";
import { BaseEntity } from "../../../common/entities/base.entity";

// Enums — single source of truth in @vendhub/shared
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
  ContentModel,
  ConnectivityType,
  ConnectivityStatus,
  ExpenseCategory,
  ExpenseType,
} from "@vendhub/shared";
export {
  MachineType,
  MachineStatus,
  MachineConnectionStatus,
  ContentModel,
  DepreciationMethod,
  DisposalReason,
  MoveReason,
  ComponentType,
  ComponentStatus,
  ErrorSeverity,
  MaintenanceType,
  MaintenanceStatus,
  ConnectivityType,
  ConnectivityStatus,
  ExpenseCategory,
  ExpenseType,
};

// ============================================================================
// MACHINE ENTITY
// ============================================================================

@Entity("machines")
@Index(["organizationId"])
@Index(["locationId"])
@Index(["machineNumber"], { unique: true, where: '"deleted_at" IS NULL' })
@Index(["serialNumber"], { unique: true, where: '"deleted_at" IS NULL' })
@Index(["qrCode"], {
  unique: true,
  where: '"deleted_at" IS NULL AND "qr_code" IS NOT NULL',
})
@Index(["status"])
@Index(["assignedOperatorId"])
export class Machine extends BaseEntity {
  @Column()
  organizationId: string;

  // Unique identifiers
  @Column({ length: 50 })
  machineNumber: string; // M-001, M-002

  @Column({ length: 200 })
  name: string;

  @Column({ length: 100, nullable: true })
  serialNumber: string;

  // Template reference (which model this machine is based on)
  @Column({ type: "uuid", nullable: true })
  templateId: string;

  // Type and status
  @Column({ type: "enum", enum: MachineType, default: MachineType.COFFEE })
  type: MachineType;

  @Column({
    type: "enum",
    enum: ContentModel,
    default: ContentModel.SLOTS,
  })
  contentModel: ContentModel;

  @Column({ type: "enum", enum: MachineStatus, default: MachineStatus.ACTIVE })
  status: MachineStatus;

  @Column({
    type: "enum",
    enum: MachineConnectionStatus,
    default: MachineConnectionStatus.UNKNOWN,
  })
  connectionStatus: MachineConnectionStatus;

  // Model information
  @Column({ length: 100, nullable: true })
  manufacturer: string;

  @Column({ length: 100, nullable: true })
  model: string;

  @Column({ type: "int", nullable: true })
  yearOfManufacture: number;

  @Column({ length: 100, nullable: true })
  firmwareVersion: string;

  // QR Code for complaints
  @Column({ length: 100, nullable: true })
  qrCode: string;

  @Column({ type: "text", nullable: true })
  qrCodeUrl: string;

  // Location
  @Column({ nullable: true })
  locationId: string;

  @Column({ type: "decimal", precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: "decimal", precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({ type: "text", nullable: true })
  address: string;

  // Dates
  @Column({ type: "date", nullable: true })
  installationDate: Date;

  @Column({ type: "date", nullable: true })
  lastMaintenanceDate: Date;

  @Column({ type: "date", nullable: true })
  nextMaintenanceDate: Date;

  @Column({ type: "timestamp", nullable: true })
  lastPingAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastRefillDate: Date;

  @Column({ type: "timestamp", nullable: true })
  lastCollectionDate: Date;

  @Column({ type: "timestamp", nullable: true })
  lastSyncAt: Date;

  // Capacity & slots
  @Column({ type: "int", default: 0 })
  maxProductSlots: number;

  @Column({ type: "int", default: 0 })
  currentProductCount: number;

  @Column({ type: "int", default: 10 })
  lowStockThresholdPercent: number;

  // Cash handling
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  cashCapacity: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  currentCashAmount: number;

  // Payment methods
  @Column({ default: true })
  acceptsCash: boolean;

  @Column({ default: false })
  acceptsCard: boolean;

  @Column({ default: false })
  acceptsQr: boolean;

  @Column({ default: false })
  acceptsNfc: boolean;

  // Assigned users
  @Column({ nullable: true })
  assignedOperatorId: string;

  // Statistics (cached for performance)
  @Column({ type: "int", default: 0 })
  totalSalesCount: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  totalRevenue: number;

  // Financial & Depreciation
  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  purchasePrice: number;

  @Column({ type: "date", nullable: true })
  purchaseDate: Date;

  @Column({ type: "int", nullable: true })
  depreciationYears: number;

  @Column({
    type: "enum",
    enum: DepreciationMethod,
    default: DepreciationMethod.LINEAR,
  })
  depreciationMethod: DepreciationMethod;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  accumulatedDepreciation: number;

  @Column({ type: "date", nullable: true })
  lastDepreciationDate: Date;

  // Disposal (write-off)
  @Column({ default: false })
  isDisposed: boolean;

  @Column({ type: "date", nullable: true })
  disposalDate: Date;

  @Column({ type: "enum", enum: DisposalReason, nullable: true })
  disposalReason: DisposalReason;

  @Column({ type: "text", nullable: true })
  disposalNotes: string;

  @Column({ nullable: true })
  disposalTransactionId: string;

  // Telemetry (JSONB)
  @Column({ type: "jsonb", default: {} })
  telemetry: {
    temperature?: number;
    humidity?: number;
    doorOpen?: boolean;
    errorCodes?: string[];
    signalStrength?: number;
    powerVoltage?: number;
    waterLevel?: number;
    coffeeBeansLevel?: number;
    milkLevel?: number;
    cupCount?: number;
    lastUpdatedAt?: Date;
  };

  // Settings (JSONB)
  @Column({ type: "jsonb", default: {} })
  settings: {
    operatingHours?: {
      enabled: boolean;
      start: string;
      end: string;
      daysOfWeek: number[];
    };
    temperature?: {
      min: number;
      max: number;
      alertEnabled: boolean;
    };
    notifications?: {
      lowStock: boolean;
      errors: boolean;
      offline: boolean;
      temperature: boolean;
      cashFull: boolean;
    };
    priceMultiplier?: number;
    maintenanceIntervalDays?: number;
  };

  // Infrastructure at location
  @Column({ default: false })
  hasTrashBin: boolean;

  @Column({ default: false })
  hasCamera: boolean;

  @Column({ length: 100, nullable: true })
  nameplateSerial: string; // Серийный номер с шильдика (может отличаться от serialNumber)

  // Notes & metadata
  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  image: string;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // Contract reference
  @Column({ nullable: true })
  contractId: string;

  // Relations (string-based to avoid circular imports)
  @OneToMany("MachineSlot", "machine")
  slots: MachineSlot[];

  @OneToMany("MachineLocationHistory", "machine")
  // circular import prevention
  locationHistory: unknown[];

  @OneToMany("MachineInventory", "machine")
  // circular import prevention
  inventory: unknown[];

  @OneToMany("Task", "machine")
  // circular import prevention
  tasks: unknown[];

  @OneToMany("Transaction", "machine")
  // circular import prevention
  transactions: unknown[];

  @OneToMany("Complaint", "machine")
  // circular import prevention
  complaints: unknown[];

  // Computed properties
  get isOnline(): boolean {
    return this.connectionStatus === MachineConnectionStatus.ONLINE;
  }

  get needsMaintenance(): boolean {
    if (!this.nextMaintenanceDate) return false;
    return new Date() >= this.nextMaintenanceDate;
  }

  get isCashFull(): boolean {
    if (!this.cashCapacity || this.cashCapacity <= 0) return false;
    return this.currentCashAmount >= this.cashCapacity * 0.9;
  }

  get currentBookValue(): number {
    if (!this.purchasePrice) return 0;
    return Math.max(0, this.purchasePrice - this.accumulatedDepreciation);
  }

  // Auto-generate machine number
  @BeforeInsert()
  generateMachineNumber() {
    if (!this.machineNumber) {
      const timestamp = Date.now().toString(36).toUpperCase();
      this.machineNumber = `M-${timestamp}`;
    }
  }
}

// ============================================================================
// MACHINE SLOT ENTITY
// ============================================================================

@Entity("machine_slots")
@Index(["machineId"])
@Index(["machineId", "slotNumber"], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class MachineSlot extends BaseEntity {
  @Column()
  machineId: string;

  @Column({ length: 20 })
  slotNumber: string; // A1, A2, B1, B2

  @Column({ nullable: true })
  productId: string;

  @Column({ type: "int", default: 0 })
  capacity: number;

  @Column({ type: "int", default: 0 })
  currentQuantity: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  price: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  costPrice: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "int", default: 0 })
  minQuantity: number;

  @Column({ type: "timestamp", nullable: true })
  lastRefilledAt: Date;

  @Column({ type: "int", default: 0 })
  totalSold: number;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne("Machine", "slots", { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;

  // Computed
  get needsRefill(): boolean {
    if (this.capacity <= 0) return false;
    return this.currentQuantity <= this.minQuantity;
  }

  get fillPercentage(): number {
    if (this.capacity <= 0) return 0;
    return Math.round((this.currentQuantity / this.capacity) * 100);
  }
}

// ============================================================================
// MACHINE LOCATION HISTORY ENTITY
// ============================================================================

@Entity("machine_location_history")
@Index(["machineId"])
@Index(["movedAt"])
@Index(["toLocationId"])
export class MachineLocationHistory extends BaseEntity {
  @Column()
  machineId: string;

  @Column({ nullable: true })
  fromLocationId: string;

  @Column()
  toLocationId: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  movedAt: Date;

  @Column()
  movedByUserId: string;

  @Column({ type: "enum", enum: MoveReason, default: MoveReason.RELOCATION })
  reason: MoveReason;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne("Machine", "locationHistory", { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;
}

// ============================================================================
// MACHINE COMPONENT ENTITY (for tracking replaceable parts)
// ============================================================================

@Entity("machine_components")
@Index(["machineId"])
@Index(["serialNumber"])
@Index(["componentType"])
export class MachineComponent extends BaseEntity {
  @Column({ nullable: true })
  machineId: string | null;

  @Column({ type: "enum", enum: ComponentType })
  componentType: ComponentType;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 100, nullable: true })
  serialNumber: string;

  @Column({ length: 100, nullable: true })
  manufacturer: string;

  @Column({ length: 100, nullable: true })
  model: string;

  @Column({
    type: "enum",
    enum: ComponentStatus,
    default: ComponentStatus.INSTALLED,
  })
  status: ComponentStatus;

  @Column({ type: "date", nullable: true })
  purchaseDate: Date;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  purchasePrice: number;

  @Column({ type: "date", nullable: true })
  installedAt: Date;

  @Column({ nullable: true })
  installedByUserId: string;

  @Column({ type: "date", nullable: true })
  warrantyUntil: Date;

  @Column({ type: "int", nullable: true })
  expectedLifeHours: number;

  @Column({ type: "int", default: 0 })
  currentHours: number;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne("Machine", { onDelete: "SET NULL" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;

  // Computed
  get isWarrantyValid(): boolean {
    if (!this.warrantyUntil) return false;
    return new Date() <= this.warrantyUntil;
  }

  get lifePercentage(): number {
    if (!this.expectedLifeHours || this.expectedLifeHours <= 0) return 0;
    return Math.round((this.currentHours / this.expectedLifeHours) * 100);
  }
}

// ============================================================================
// SIM USAGE LOG ENTITY (monthly data usage tracking)
// ============================================================================

@Entity("sim_usage_logs")
@Index(["componentId"])
@Index(["machineId"])
@Index(["periodStart", "periodEnd"])
export class SimUsageLog extends BaseEntity {
  @Column()
  componentId: string; // FK → machine_components (SIM card)

  @Column()
  machineId: string; // FK → machines (denormalized for faster queries)

  @Column()
  organizationId: string;

  // Period
  @Column({ type: "date" })
  periodStart: Date; // Начало периода (1-е число месяца)

  @Column({ type: "date" })
  periodEnd: Date; // Конец периода (последний день месяца)

  // Traffic
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  dataUsedMb: number; // Использовано МБ за период

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  dataLimitMb: number; // Лимит МБ в тарифе

  // Cost
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  cost: number; // Фактический расход UZS за период

  @Column({ length: 10, default: "UZS" })
  currency: string;

  // Notes
  @Column({ type: "text", nullable: true })
  notes: string;

  // Relations
  @ManyToOne("MachineComponent", { onDelete: "CASCADE" })
  @JoinColumn({ name: "component_id" })
  component: MachineComponent;

  @ManyToOne("Machine", { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;

  // Computed
  get usagePercent(): number {
    if (!this.dataLimitMb || this.dataLimitMb <= 0) return 0;
    return Math.round((this.dataUsedMb / this.dataLimitMb) * 100);
  }
}

// ============================================================================
// MACHINE CONNECTIVITY ENTITY (Internet connection tracking)
// ============================================================================

@Entity("machine_connectivity")
@Index(["machineId"])
@Index(["organizationId"])
@Index(["connectivityType"])
@Index(["status"])
export class MachineConnectivity extends BaseEntity {
  @Column()
  machineId: string;

  @Column()
  organizationId: string;

  @Column({ type: "enum", enum: ConnectivityType })
  connectivityType: ConnectivityType; // SIM, WiFi, Fiber, LAN

  @Column({
    type: "enum",
    enum: ConnectivityStatus,
    default: ConnectivityStatus.ACTIVE,
  })
  status: ConnectivityStatus;

  // Provider info
  @Column({ length: 200 })
  providerName: string; // Beeline, Ucell, Mobiuz, имя арендатора

  @Column({ length: 100, nullable: true })
  accountNumber: string; // Номер SIM / аккаунт WiFi

  @Column({ length: 200, nullable: true })
  tariffName: string; // Название тарифа

  // Link to physical component (for SIM cards tracked in equipment)
  @Column({ nullable: true })
  componentId: string; // FK → machine_components (SIM card)

  // Cost
  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  monthlyCost: number; // Ежемесячная стоимость

  @Column({ length: 10, default: "UZS" })
  currency: string;

  // Contract period
  @Column({ type: "date" })
  startDate: Date;

  @Column({ type: "date", nullable: true })
  endDate: Date;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // Relations
  @ManyToOne("Machine", { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;

  @ManyToOne("MachineComponent", { onDelete: "SET NULL" })
  @JoinColumn({ name: "component_id" })
  component: MachineComponent;
}

// ============================================================================
// MACHINE EXPENSE ENTITY (Installation & operating costs)
// ============================================================================

@Entity("machine_expenses")
@Index(["machineId"])
@Index(["organizationId"])
@Index(["category"])
@Index(["expenseType"])
@Index(["expenseDate"])
export class MachineExpense extends BaseEntity {
  @Column()
  machineId: string;

  @Column()
  organizationId: string;

  @Column({ nullable: true })
  locationId: string; // Привязка к локации (для расходов на точку)

  @Column({ type: "enum", enum: ExpenseCategory })
  category: ExpenseCategory; // transport, electrical, socket, etc.

  @Column({ type: "enum", enum: ExpenseType })
  expenseType: ExpenseType; // CAPEX or OPEX

  @Column({ length: 500 })
  description: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 10, default: "UZS" })
  currency: string;

  @Column({ type: "date" })
  expenseDate: Date;

  // Vendor
  @Column({ nullable: true })
  counterpartyId: string; // FK → counterparties

  @Column({ nullable: true })
  performedByUserId: string;

  // Documents
  @Column({ type: "text", nullable: true })
  receiptUrl: string;

  @Column({ length: 100, nullable: true })
  invoiceNumber: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  // Relations
  @ManyToOne("Machine", { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;
}

// ============================================================================
// MACHINE ERROR LOG ENTITY
// ============================================================================

@Entity("machine_error_logs")
@Index(["machineId"])
@Index(["occurredAt"])
@Index(["errorCode"])
@Index(["severity"])
export class MachineErrorLog extends BaseEntity {
  @Column()
  machineId: string;

  @Column({ length: 50 })
  errorCode: string;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "enum", enum: ErrorSeverity, default: ErrorSeverity.ERROR })
  severity: ErrorSeverity;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  occurredAt: Date;

  @Column({ type: "timestamp", nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolvedByUserId: string;

  @Column({ type: "text", nullable: true })
  resolution: string;

  @Column({ nullable: true })
  taskId: string; // Reference to repair task

  @Column({ type: "jsonb", default: {} })
  context: Record<string, unknown>; // Additional context (telemetry snapshot, etc.)

  @ManyToOne("Machine", { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;

  get isResolved(): boolean {
    return this.resolvedAt !== null;
  }
}

// ============================================================================
// MACHINE MAINTENANCE SCHEDULE ENTITY
// ============================================================================

@Entity("machine_maintenance_schedules")
@Index(["machineId"])
@Index(["scheduledDate"])
@Index(["status"])
export class MachineMaintenanceSchedule extends BaseEntity {
  @Column()
  machineId: string;

  @Column({ type: "enum", enum: MaintenanceType })
  maintenanceType: MaintenanceType;

  @Column({
    type: "enum",
    enum: MaintenanceStatus,
    default: MaintenanceStatus.SCHEDULED,
  })
  status: MaintenanceStatus;

  @Column({ type: "date" })
  scheduledDate: Date;

  @Column({ type: "date", nullable: true })
  completedDate: Date;

  @Column({ nullable: true })
  assignedToUserId: string;

  @Column({ nullable: true })
  completedByUserId: string;

  @Column({ nullable: true })
  taskId: string; // Reference to task

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "int", nullable: true })
  estimatedDurationMinutes: number;

  @Column({ type: "int", nullable: true })
  actualDurationMinutes: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  actualCost: number;

  @Column({ type: "int", nullable: true })
  repeatIntervalDays: number; // For recurring maintenance

  @Column({ nullable: true })
  nextScheduleId: string; // Link to next scheduled maintenance

  @Column({ type: "jsonb", default: {} })
  checklist: {
    item: string;
    completed: boolean;
    completedAt?: Date;
  }[];

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  @ManyToOne("Machine", { onDelete: "CASCADE" })
  @JoinColumn({ name: "machine_id" })
  machine: Machine;

  get isOverdue(): boolean {
    if (this.status !== MaintenanceStatus.SCHEDULED) return false;
    return new Date() > this.scheduledDate;
  }
}
