/**
 * Machine Types for VendHub OS
 * Complete vending machine management with slots, components, and telemetry
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum MachineType {
  COFFEE = 'coffee',
  SNACK = 'snack',
  DRINK = 'drink',
  COMBO = 'combo',
  FRESH = 'fresh',
  ICE_CREAM = 'ice_cream',
  WATER = 'water',
}

export enum MachineStatus {
  ACTIVE = 'active',
  LOW_STOCK = 'low_stock',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
  DISABLED = 'disabled',
}

export enum MachineConnectionStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  UNSTABLE = 'unstable',
  UNKNOWN = 'unknown',
}

export enum DepreciationMethod {
  LINEAR = 'linear',
  DECLINING = 'declining',
  UNITS_OF_PRODUCTION = 'units_of_production',
}

export enum DisposalReason {
  OBSOLETE = 'obsolete',
  DAMAGED = 'damaged',
  SOLD = 'sold',
  WRITTEN_OFF = 'written_off',
  OTHER = 'other',
}

export enum MoveReason {
  INSTALLATION = 'installation',
  RELOCATION = 'relocation',
  REMOVAL = 'removal',
  MAINTENANCE = 'maintenance',
  CONTRACT_CHANGE = 'contract_change',
  OTHER = 'other',
}

export enum ComponentType {
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
  OTHER = 'other',
}

export enum ComponentStatus {
  INSTALLED = 'installed',
  REMOVED = 'removed',
  IN_REPAIR = 'in_repair',
  DISPOSED = 'disposed',
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum MaintenanceType {
  CLEANING = 'cleaning',
  INSPECTION = 'inspection',
  CALIBRATION = 'calibration',
  PARTS_REPLACEMENT = 'parts_replacement',
  SOFTWARE_UPDATE = 'software_update',
  FULL_SERVICE = 'full_service',
}

export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  OVERDUE = 'overdue',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IMachineTelemetry {
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
}

export interface IMachineSettings {
  operatingHours?: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    daysOfWeek: number[]; // 0-6
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
}

export interface IMachine {
  id: string;
  organizationId: string;
  machineNumber: string;
  name: string;
  serialNumber?: string;
  type: MachineType;
  status: MachineStatus;
  connectionStatus: MachineConnectionStatus;

  // Model info
  manufacturer?: string;
  model?: string;
  yearOfManufacture?: number;
  firmwareVersion?: string;

  // QR Code
  qrCode?: string;
  qrCodeUrl?: string;

  // Location
  locationId?: string;
  latitude?: number;
  longitude?: number;
  address?: string;

  // Dates
  installationDate?: Date;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  lastPingAt?: Date;
  lastRefillDate?: Date;
  lastCollectionDate?: Date;
  lastSyncAt?: Date;

  // Capacity
  maxProductSlots: number;
  currentProductCount: number;
  lowStockThresholdPercent: number;

  // Cash
  cashCapacity: number;
  currentCashAmount: number;

  // Payment methods
  acceptsCash: boolean;
  acceptsCard: boolean;
  acceptsQr: boolean;
  acceptsNfc: boolean;

  // Assigned
  assignedOperatorId?: string;

  // Statistics
  totalSalesCount: number;
  totalRevenue: number;

  // Financial
  purchasePrice?: number;
  purchaseDate?: Date;
  depreciationYears?: number;
  depreciationMethod: DepreciationMethod;
  accumulatedDepreciation: number;
  lastDepreciationDate?: Date;

  // Disposal
  isDisposed: boolean;
  disposalDate?: Date;
  disposalReason?: DisposalReason;
  disposalNotes?: string;
  disposalTransactionId?: string;

  // JSONB
  telemetry: IMachineTelemetry;
  settings: IMachineSettings;
  metadata?: Record<string, any>;

  // Notes
  notes?: string;
  description?: string;
  image?: string;

  // Contract
  contractId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Relations (optional, populated on request)
  slots?: IMachineSlot[];
  locationHistory?: IMachineLocationHistory[];
  components?: IMachineComponent[];

  // Computed
  isOnline?: boolean;
  needsMaintenance?: boolean;
  isCashFull?: boolean;
  currentBookValue?: number;
}

export interface IMachineSlot {
  id: string;
  machineId: string;
  slotNumber: string;
  productId?: string;
  capacity: number;
  currentQuantity: number;
  price?: number;
  costPrice?: number;
  isActive: boolean;
  minQuantity: number;
  lastRefilledAt?: Date;
  totalSold: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Computed
  needsRefill?: boolean;
  fillPercentage?: number;
}

export interface IMachineLocationHistory {
  id: string;
  machineId: string;
  fromLocationId?: string;
  toLocationId: string;
  movedAt: Date;
  movedByUserId: string;
  reason: MoveReason;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IMachineComponent {
  id: string;
  machineId?: string;
  componentType: ComponentType;
  name: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  status: ComponentStatus;
  purchaseDate?: Date;
  purchasePrice?: number;
  installedAt?: Date;
  installedByUserId?: string;
  warrantyUntil?: Date;
  expectedLifeHours?: number;
  currentHours: number;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Computed
  isWarrantyValid?: boolean;
  lifePercentage?: number;
}

export interface IMachineErrorLog {
  id: string;
  machineId: string;
  errorCode: string;
  message: string;
  severity: ErrorSeverity;
  occurredAt: Date;
  resolvedAt?: Date;
  resolvedByUserId?: string;
  resolution?: string;
  taskId?: string;
  context?: Record<string, any>;
  createdAt: Date;

  // Computed
  isResolved?: boolean;
}

export interface IMachineMaintenanceSchedule {
  id: string;
  machineId: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  scheduledDate: Date;
  completedDate?: Date;
  assignedToUserId?: string;
  completedByUserId?: string;
  taskId?: string;
  description?: string;
  notes?: string;
  estimatedDurationMinutes?: number;
  actualDurationMinutes?: number;
  estimatedCost?: number;
  actualCost?: number;
  repeatIntervalDays?: number;
  nextScheduleId?: string;
  checklist?: {
    item: string;
    completed: boolean;
    completedAt?: Date;
  }[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Computed
  isOverdue?: boolean;
}

// ============================================================================
// CREATE/UPDATE DTOs
// ============================================================================

export interface IMachineCreate {
  organizationId: string;
  name: string;
  type: MachineType;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  yearOfManufacture?: number;
  locationId?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  installationDate?: Date;
  maxProductSlots?: number;
  cashCapacity?: number;
  acceptsCash?: boolean;
  acceptsCard?: boolean;
  acceptsQr?: boolean;
  acceptsNfc?: boolean;
  assignedOperatorId?: string;
  purchasePrice?: number;
  purchaseDate?: Date;
  depreciationYears?: number;
  depreciationMethod?: DepreciationMethod;
  settings?: IMachineSettings;
  notes?: string;
  description?: string;
  image?: string;
  contractId?: string;
  metadata?: Record<string, any>;
}

export interface IMachineUpdate {
  name?: string;
  type?: MachineType;
  status?: MachineStatus;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  yearOfManufacture?: number;
  firmwareVersion?: string;
  locationId?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  installationDate?: Date;
  nextMaintenanceDate?: Date;
  maxProductSlots?: number;
  lowStockThresholdPercent?: number;
  cashCapacity?: number;
  acceptsCash?: boolean;
  acceptsCard?: boolean;
  acceptsQr?: boolean;
  acceptsNfc?: boolean;
  assignedOperatorId?: string;
  purchasePrice?: number;
  purchaseDate?: Date;
  depreciationYears?: number;
  depreciationMethod?: DepreciationMethod;
  settings?: Partial<IMachineSettings>;
  notes?: string;
  description?: string;
  image?: string;
  contractId?: string;
  metadata?: Record<string, any>;
}

export interface IMachineSlotCreate {
  machineId: string;
  slotNumber: string;
  productId?: string;
  capacity: number;
  price?: number;
  costPrice?: number;
  minQuantity?: number;
  metadata?: Record<string, any>;
}

export interface IMachineSlotUpdate {
  productId?: string;
  capacity?: number;
  price?: number;
  costPrice?: number;
  isActive?: boolean;
  minQuantity?: number;
  metadata?: Record<string, any>;
}

export interface IMachineMoveRequest {
  machineId: string;
  toLocationId: string;
  reason: MoveReason;
  notes?: string;
  movedByUserId: string;
}

export interface IMachineComponentCreate {
  machineId?: string;
  componentType: ComponentType;
  name: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyUntil?: Date;
  expectedLifeHours?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface IMachineMaintenanceCreate {
  machineId: string;
  maintenanceType: MaintenanceType;
  scheduledDate: Date;
  assignedToUserId?: string;
  description?: string;
  estimatedDurationMinutes?: number;
  estimatedCost?: number;
  repeatIntervalDays?: number;
  checklist?: { item: string; completed: boolean }[];
}

export interface IMachineDispose {
  machineId: string;
  reason: DisposalReason;
  notes?: string;
}

// ============================================================================
// FILTER & STATS
// ============================================================================

export interface IMachineFilter {
  organizationId: string;
  type?: MachineType | MachineType[];
  status?: MachineStatus | MachineStatus[];
  connectionStatus?: MachineConnectionStatus;
  locationId?: string;
  assignedOperatorId?: string;
  isDisposed?: boolean;
  hasErrors?: boolean;
  needsMaintenance?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'machineNumber' | 'status' | 'lastRefillDate' | 'totalRevenue';
  sortOrder?: 'ASC' | 'DESC';
}

export interface IMachineStats {
  total: number;
  byStatus: Record<MachineStatus, number>;
  byType: Record<MachineType, number>;
  byConnectionStatus: Record<MachineConnectionStatus, number>;
  online: number;
  offline: number;
  needsRefill: number;
  needsMaintenance: number;
  hasErrors: number;
  totalRevenue: number;
  avgRevenue: number;
}

export interface IMachineSlotStats {
  totalSlots: number;
  activeSlots: number;
  emptySlots: number;
  lowStockSlots: number;
  fillPercentage: number;
}

// ============================================================================
// LABELS (Russian)
// ============================================================================

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  [MachineType.COFFEE]: 'Кофейный',
  [MachineType.SNACK]: 'Снековый',
  [MachineType.DRINK]: 'Напитки',
  [MachineType.COMBO]: 'Комбо',
  [MachineType.FRESH]: 'Свежие продукты',
  [MachineType.ICE_CREAM]: 'Мороженое',
  [MachineType.WATER]: 'Вода',
};

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  [MachineStatus.ACTIVE]: 'Активен',
  [MachineStatus.LOW_STOCK]: 'Мало товара',
  [MachineStatus.ERROR]: 'Ошибка',
  [MachineStatus.MAINTENANCE]: 'На обслуживании',
  [MachineStatus.OFFLINE]: 'Офлайн',
  [MachineStatus.DISABLED]: 'Отключен',
};

export const MACHINE_CONNECTION_STATUS_LABELS: Record<MachineConnectionStatus, string> = {
  [MachineConnectionStatus.ONLINE]: 'Онлайн',
  [MachineConnectionStatus.OFFLINE]: 'Офлайн',
  [MachineConnectionStatus.UNSTABLE]: 'Нестабильно',
  [MachineConnectionStatus.UNKNOWN]: 'Неизвестно',
};

export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  [ComponentType.HOPPER]: 'Бункер',
  [ComponentType.GRINDER]: 'Гриндер',
  [ComponentType.BREW_UNIT]: 'Варочный блок',
  [ComponentType.MIXER]: 'Миксер',
  [ComponentType.PUMP]: 'Помпа',
  [ComponentType.HEATER]: 'Нагреватель',
  [ComponentType.DISPENSER]: 'Диспенсер',
  [ComponentType.COMPRESSOR]: 'Компрессор',
  [ComponentType.BOARD]: 'Плата',
  [ComponentType.MOTOR]: 'Мотор',
  [ComponentType.OTHER]: 'Другое',
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  [MaintenanceType.CLEANING]: 'Чистка',
  [MaintenanceType.INSPECTION]: 'Осмотр',
  [MaintenanceType.CALIBRATION]: 'Калибровка',
  [MaintenanceType.PARTS_REPLACEMENT]: 'Замена деталей',
  [MaintenanceType.SOFTWARE_UPDATE]: 'Обновление ПО',
  [MaintenanceType.FULL_SERVICE]: 'Полное ТО',
};

export const MOVE_REASON_LABELS: Record<MoveReason, string> = {
  [MoveReason.INSTALLATION]: 'Установка',
  [MoveReason.RELOCATION]: 'Перемещение',
  [MoveReason.REMOVAL]: 'Снятие',
  [MoveReason.MAINTENANCE]: 'На ремонт',
  [MoveReason.CONTRACT_CHANGE]: 'Смена контракта',
  [MoveReason.OTHER]: 'Другое',
};

export const ERROR_SEVERITY_LABELS: Record<ErrorSeverity, string> = {
  [ErrorSeverity.INFO]: 'Информация',
  [ErrorSeverity.WARNING]: 'Предупреждение',
  [ErrorSeverity.ERROR]: 'Ошибка',
  [ErrorSeverity.CRITICAL]: 'Критично',
};

// ============================================================================
// LABELS (Uzbek)
// ============================================================================

export const MACHINE_TYPE_LABELS_UZ: Record<MachineType, string> = {
  [MachineType.COFFEE]: 'Qahva',
  [MachineType.SNACK]: 'Sneklar',
  [MachineType.DRINK]: 'Ichimliklar',
  [MachineType.COMBO]: 'Kombo',
  [MachineType.FRESH]: 'Yangi mahsulotlar',
  [MachineType.ICE_CREAM]: 'Muzqaymoq',
  [MachineType.WATER]: 'Suv',
};

export const MACHINE_STATUS_LABELS_UZ: Record<MachineStatus, string> = {
  [MachineStatus.ACTIVE]: 'Faol',
  [MachineStatus.LOW_STOCK]: 'Kam tovar',
  [MachineStatus.ERROR]: 'Xato',
  [MachineStatus.MAINTENANCE]: 'Xizmatda',
  [MachineStatus.OFFLINE]: 'Oflayn',
  [MachineStatus.DISABLED]: 'O\'chirilgan',
};

// ============================================================================
// ICONS
// ============================================================================

export const MACHINE_TYPE_ICONS: Record<MachineType, string> = {
  [MachineType.COFFEE]: '☕',
  [MachineType.SNACK]: '🍫',
  [MachineType.DRINK]: '🥤',
  [MachineType.COMBO]: '🏪',
  [MachineType.FRESH]: '🥗',
  [MachineType.ICE_CREAM]: '🍦',
  [MachineType.WATER]: '💧',
};

export const MACHINE_STATUS_ICONS: Record<MachineStatus, string> = {
  [MachineStatus.ACTIVE]: '✅',
  [MachineStatus.LOW_STOCK]: '📦',
  [MachineStatus.ERROR]: '❌',
  [MachineStatus.MAINTENANCE]: '🔧',
  [MachineStatus.OFFLINE]: '📴',
  [MachineStatus.DISABLED]: '⛔',
};

export const ERROR_SEVERITY_ICONS: Record<ErrorSeverity, string> = {
  [ErrorSeverity.INFO]: 'ℹ️',
  [ErrorSeverity.WARNING]: '⚠️',
  [ErrorSeverity.ERROR]: '❌',
  [ErrorSeverity.CRITICAL]: '🚨',
};

// ============================================================================
// COLORS FOR UI
// ============================================================================

export const MACHINE_STATUS_COLORS: Record<MachineStatus, string> = {
  [MachineStatus.ACTIVE]: 'bg-green-100 text-green-800',
  [MachineStatus.LOW_STOCK]: 'bg-yellow-100 text-yellow-800',
  [MachineStatus.ERROR]: 'bg-red-100 text-red-800',
  [MachineStatus.MAINTENANCE]: 'bg-blue-100 text-blue-800',
  [MachineStatus.OFFLINE]: 'bg-gray-100 text-gray-500',
  [MachineStatus.DISABLED]: 'bg-gray-100 text-gray-800',
};

export const MACHINE_TYPE_COLORS: Record<MachineType, string> = {
  [MachineType.COFFEE]: 'bg-amber-100 text-amber-800',
  [MachineType.SNACK]: 'bg-orange-100 text-orange-800',
  [MachineType.DRINK]: 'bg-blue-100 text-blue-800',
  [MachineType.COMBO]: 'bg-purple-100 text-purple-800',
  [MachineType.FRESH]: 'bg-green-100 text-green-800',
  [MachineType.ICE_CREAM]: 'bg-cyan-100 text-cyan-800',
  [MachineType.WATER]: 'bg-sky-100 text-sky-800',
};

export const ERROR_SEVERITY_COLORS: Record<ErrorSeverity, string> = {
  [ErrorSeverity.INFO]: 'bg-blue-100 text-blue-800',
  [ErrorSeverity.WARNING]: 'bg-yellow-100 text-yellow-800',
  [ErrorSeverity.ERROR]: 'bg-red-100 text-red-800',
  [ErrorSeverity.CRITICAL]: 'bg-red-200 text-red-900',
};

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.SCHEDULED]: 'bg-blue-100 text-blue-800',
  [MaintenanceStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
  [MaintenanceStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [MaintenanceStatus.SKIPPED]: 'bg-gray-100 text-gray-800',
  [MaintenanceStatus.OVERDUE]: 'bg-red-100 text-red-800',
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_MACHINE_SETTINGS: IMachineSettings = {
  operatingHours: {
    enabled: false,
    start: '00:00',
    end: '23:59',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  },
  temperature: {
    min: 2,
    max: 8,
    alertEnabled: true,
  },
  notifications: {
    lowStock: true,
    errors: true,
    offline: true,
    temperature: true,
    cashFull: true,
  },
  priceMultiplier: 1,
  maintenanceIntervalDays: 30,
};

export const DEFAULT_TELEMETRY: IMachineTelemetry = {
  temperature: undefined,
  humidity: undefined,
  doorOpen: false,
  errorCodes: [],
  signalStrength: undefined,
  powerVoltage: undefined,
  lastUpdatedAt: undefined,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if machine needs refill based on threshold
 */
export function machineNeedsRefill(
  currentCount: number,
  maxSlots: number,
  thresholdPercent: number
): boolean {
  if (maxSlots <= 0) return false;
  const fillPercent = (currentCount / maxSlots) * 100;
  return fillPercent <= thresholdPercent;
}

/**
 * Calculate depreciation amount
 */
export function calculateDepreciation(
  purchasePrice: number,
  depreciationYears: number,
  method: DepreciationMethod,
  yearsSincePurchase: number
): number {
  if (!purchasePrice || !depreciationYears || depreciationYears <= 0) return 0;

  switch (method) {
    case DepreciationMethod.LINEAR:
      const annualDepreciation = purchasePrice / depreciationYears;
      return Math.min(purchasePrice, annualDepreciation * yearsSincePurchase);

    case DepreciationMethod.DECLINING:
      const rate = 2 / depreciationYears;
      let value = purchasePrice;
      for (let i = 0; i < yearsSincePurchase; i++) {
        value -= value * rate;
      }
      return purchasePrice - value;

    default:
      return 0;
  }
}

/**
 * Get payment methods as array
 */
export function getPaymentMethods(machine: IMachine): string[] {
  const methods: string[] = [];
  if (machine.acceptsCash) methods.push('cash');
  if (machine.acceptsCard) methods.push('card');
  if (machine.acceptsQr) methods.push('qr');
  if (machine.acceptsNfc) methods.push('nfc');
  return methods;
}

/**
 * Format machine number
 */
export function formatMachineNumber(number: number): string {
  return `M-${number.toString().padStart(4, '0')}`;
}
