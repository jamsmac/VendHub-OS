/**
 * Inventory Types for VendHub OS
 * 3-Level Inventory System: Warehouse -> Operator -> Machine
 *
 * Features:
 * - Pessimistic locking for concurrent transfers
 * - Reservation system for task allocation
 * - Full audit trail with movements
 * - Stocktake/adjustment support
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum InventoryLevel {
  WAREHOUSE = 'warehouse',
  OPERATOR = 'operator',
  MACHINE = 'machine',
}

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

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum AdjustmentType {
  STOCKTAKE = 'stocktake',       // Physical count
  CORRECTION = 'correction',     // Manual correction
  DAMAGE = 'damage',             // Damaged goods
  EXPIRY = 'expiry',             // Expired goods
  THEFT = 'theft',               // Theft/loss
  OTHER = 'other',
}

export enum InventoryCountStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// ============================================================================
// WAREHOUSE INVENTORY (Level 1)
// ============================================================================

export interface IWarehouseInventory {
  id: string;
  organizationId: string;
  productId: string;
  currentQuantity: number;
  reservedQuantity: number;
  minStockLevel: number;
  maxStockLevel?: number;
  lastRestockedAt?: Date;
  locationInWarehouse?: string;
  avgPurchasePrice: number;
  lastPurchasePrice?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Computed
  availableQuantity: number;
  isLowStock: boolean;
}

export interface IWarehouseInventoryCreate {
  organizationId: string;
  productId: string;
  currentQuantity?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  locationInWarehouse?: string;
}

export interface IWarehouseStockIn {
  organizationId: string;
  productId: string;
  quantity: number;
  unitCost?: number;
  locationInWarehouse?: string;
  notes?: string;
  performedByUserId?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// OPERATOR INVENTORY (Level 2)
// ============================================================================

export interface IOperatorInventory {
  id: string;
  organizationId: string;
  operatorId: string;
  productId: string;
  currentQuantity: number;
  reservedQuantity: number;
  lastReceivedAt?: Date;
  lastTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Computed
  availableQuantity: number;
}

// ============================================================================
// MACHINE INVENTORY (Level 3)
// ============================================================================

export interface IMachineInventory {
  id: string;
  organizationId: string;
  machineId: string;
  productId: string;
  currentQuantity: number;
  minStockLevel: number;
  maxCapacity?: number;
  lastRefilledAt?: Date;
  lastRefillTaskId?: string;
  slotNumber?: string;
  sellingPrice?: number;
  lastSaleAt?: Date;
  totalSold: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Computed
  needsRefill: boolean;
  fillPercentage: number;
}

// ============================================================================
// INVENTORY MOVEMENT
// ============================================================================

export interface IInventoryMovement {
  id: string;
  organizationId: string;
  movementType: MovementType;
  productId: string;
  quantity: number;
  performedByUserId?: string;
  operatorId?: string;
  machineId?: string;
  taskId?: string;
  operationDate?: Date;
  notes?: string;
  metadata?: Record<string, any>;
  unitCost?: number;
  totalCost?: number;
  sourceRef?: string;
  destinationRef?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IInventoryMovementFilter {
  organizationId: string;
  productId?: string;
  machineId?: string;
  operatorId?: string;
  movementType?: MovementType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// INVENTORY RESERVATION
// ============================================================================

export interface IInventoryReservation {
  id: string;
  organizationId: string;
  reservationNumber: string;
  taskId: string;
  productId: string;
  quantityReserved: number;
  quantityFulfilled: number;
  status: ReservationStatus;
  inventoryLevel: InventoryLevel;
  referenceId: string;
  reservedAt: Date;
  expiresAt?: Date;
  fulfilledAt?: Date;
  cancelledAt?: Date;
  notes?: string;
  createdByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Computed
  quantityRemaining: number;
  isExpired: boolean;
  isActive: boolean;
}

export interface ICreateReservation {
  organizationId: string;
  taskId: string;
  productId: string;
  quantity: number;
  inventoryLevel: InventoryLevel;
  referenceId: string;
  expiresAt?: Date;
  notes?: string;
  createdByUserId?: string;
}

// ============================================================================
// INVENTORY ADJUSTMENT
// ============================================================================

export interface IInventoryAdjustment {
  id: string;
  organizationId: string;
  adjustmentNumber: string;
  inventoryLevel: InventoryLevel;
  referenceId: string;
  productId: string;
  adjustmentType: AdjustmentType;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  reason?: string;
  notes?: string;
  adjustedByUserId: string;
  approvedByUserId?: string;
  approvedAt?: Date;
  isApproved: boolean;
  movementId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface ICreateAdjustment {
  organizationId: string;
  inventoryLevel: InventoryLevel;
  referenceId: string;
  productId: string;
  actualQuantity: number;
  adjustmentType: AdjustmentType;
  reason?: string;
  notes?: string;
  adjustedByUserId: string;
}

// ============================================================================
// INVENTORY COUNT (Stocktake)
// ============================================================================

export interface IInventoryCount {
  id: string;
  organizationId: string;
  countNumber: string;
  inventoryLevel: InventoryLevel;
  referenceId: string;
  status: InventoryCountStatus;
  startedAt: Date;
  completedAt?: Date;
  startedByUserId: string;
  completedByUserId?: string;
  notes?: string;
  totalItemsCounted: number;
  totalDifferences: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IInventoryCountItem {
  id: string;
  countId: string;
  productId: string;
  systemQuantity: number;
  countedQuantity?: number;
  difference?: number;
  notes?: string;
  countedByUserId?: string;
  countedAt?: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// TRANSFER DTOs
// ============================================================================

export interface ITransferWarehouseToOperator {
  organizationId: string;
  operatorId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

export interface ITransferOperatorToWarehouse {
  organizationId: string;
  operatorId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

export interface ITransferOperatorToMachine {
  organizationId: string;
  operatorId: string;
  machineId: string;
  productId: string;
  quantity: number;
  taskId?: string;
  notes?: string;
  operationDate?: Date;
}

export interface ITransferMachineToOperator {
  organizationId: string;
  operatorId: string;
  machineId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

export interface IRecordSale {
  organizationId: string;
  machineId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  transactionId?: string;
}

// ============================================================================
// SUMMARY & REPORTS
// ============================================================================

export interface IInventorySummary {
  warehouse: {
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
  };
  operators: {
    totalOperators: number;
    totalProducts: number;
  };
  machines: {
    totalMachines: number;
    totalProducts: number;
    needsRefillCount: number;
  };
}

export interface IProductInventorySummary {
  productId: string;
  productName: string;
  productSku: string;
  warehouseQuantity: number;
  operatorQuantity: number;
  machineQuantity: number;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  avgCost: number;
  totalValue: number;
  isLowStock: boolean;
}

export interface ILowStockAlert {
  productId: string;
  productName: string;
  level: InventoryLevel;
  locationId: string;
  locationName: string;
  currentQuantity: number;
  minStockLevel: number;
  deficit: number;
}

// ============================================================================
// LABELS (Russian)
// ============================================================================

export const INVENTORY_LEVEL_LABELS: Record<InventoryLevel, string> = {
  [InventoryLevel.WAREHOUSE]: 'Склад',
  [InventoryLevel.OPERATOR]: 'Оператор',
  [InventoryLevel.MACHINE]: 'Автомат',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  [MovementType.WAREHOUSE_IN]: 'Приход на склад',
  [MovementType.WAREHOUSE_OUT]: 'Списание со склада',
  [MovementType.WAREHOUSE_TO_OPERATOR]: 'Выдача оператору',
  [MovementType.OPERATOR_TO_WAREHOUSE]: 'Возврат на склад',
  [MovementType.OPERATOR_TO_MACHINE]: 'Пополнение автомата',
  [MovementType.MACHINE_TO_OPERATOR]: 'Изъятие из автомата',
  [MovementType.MACHINE_SALE]: 'Продажа',
  [MovementType.ADJUSTMENT]: 'Корректировка',
  [MovementType.WRITE_OFF]: 'Списание',
  [MovementType.WAREHOUSE_RESERVATION]: 'Резервирование (склад)',
  [MovementType.WAREHOUSE_RESERVATION_RELEASE]: 'Освобождение резерва (склад)',
  [MovementType.OPERATOR_RESERVATION]: 'Резервирование (оператор)',
  [MovementType.OPERATOR_RESERVATION_RELEASE]: 'Освобождение резерва (оператор)',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: 'Ожидает',
  [ReservationStatus.CONFIRMED]: 'Подтверждено',
  [ReservationStatus.PARTIALLY_FULFILLED]: 'Частично выполнено',
  [ReservationStatus.FULFILLED]: 'Выполнено',
  [ReservationStatus.CANCELLED]: 'Отменено',
  [ReservationStatus.EXPIRED]: 'Истекло',
};

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  [AdjustmentType.STOCKTAKE]: 'Инвентаризация',
  [AdjustmentType.CORRECTION]: 'Корректировка',
  [AdjustmentType.DAMAGE]: 'Брак',
  [AdjustmentType.EXPIRY]: 'Просрочка',
  [AdjustmentType.THEFT]: 'Недостача',
  [AdjustmentType.OTHER]: 'Другое',
};

export const COUNT_STATUS_LABELS: Record<InventoryCountStatus, string> = {
  [InventoryCountStatus.DRAFT]: 'Черновик',
  [InventoryCountStatus.IN_PROGRESS]: 'В процессе',
  [InventoryCountStatus.COMPLETED]: 'Завершена',
  [InventoryCountStatus.CANCELLED]: 'Отменена',
};

// ============================================================================
// LABELS (Uzbek)
// ============================================================================

export const INVENTORY_LEVEL_LABELS_UZ: Record<InventoryLevel, string> = {
  [InventoryLevel.WAREHOUSE]: 'Ombor',
  [InventoryLevel.OPERATOR]: 'Operator',
  [InventoryLevel.MACHINE]: 'Apparat',
};

export const MOVEMENT_TYPE_LABELS_UZ: Record<MovementType, string> = {
  [MovementType.WAREHOUSE_IN]: 'Omborga kirim',
  [MovementType.WAREHOUSE_OUT]: 'Ombordan chiqim',
  [MovementType.WAREHOUSE_TO_OPERATOR]: 'Operatorga berish',
  [MovementType.OPERATOR_TO_WAREHOUSE]: 'Omborga qaytarish',
  [MovementType.OPERATOR_TO_MACHINE]: 'Apparatni to\'ldirish',
  [MovementType.MACHINE_TO_OPERATOR]: 'Apparatdan olish',
  [MovementType.MACHINE_SALE]: 'Sotuv',
  [MovementType.ADJUSTMENT]: 'Tuzatish',
  [MovementType.WRITE_OFF]: 'Hisobdan chiqarish',
  [MovementType.WAREHOUSE_RESERVATION]: 'Rezerv (ombor)',
  [MovementType.WAREHOUSE_RESERVATION_RELEASE]: 'Rezerv bo\'shatish (ombor)',
  [MovementType.OPERATOR_RESERVATION]: 'Rezerv (operator)',
  [MovementType.OPERATOR_RESERVATION_RELEASE]: 'Rezerv bo\'shatish (operator)',
};

// ============================================================================
// COLORS FOR UI
// ============================================================================

export const MOVEMENT_TYPE_COLORS: Record<MovementType, string> = {
  [MovementType.WAREHOUSE_IN]: 'bg-green-100 text-green-800',
  [MovementType.WAREHOUSE_OUT]: 'bg-red-100 text-red-800',
  [MovementType.WAREHOUSE_TO_OPERATOR]: 'bg-blue-100 text-blue-800',
  [MovementType.OPERATOR_TO_WAREHOUSE]: 'bg-purple-100 text-purple-800',
  [MovementType.OPERATOR_TO_MACHINE]: 'bg-cyan-100 text-cyan-800',
  [MovementType.MACHINE_TO_OPERATOR]: 'bg-orange-100 text-orange-800',
  [MovementType.MACHINE_SALE]: 'bg-emerald-100 text-emerald-800',
  [MovementType.ADJUSTMENT]: 'bg-yellow-100 text-yellow-800',
  [MovementType.WRITE_OFF]: 'bg-red-100 text-red-800',
  [MovementType.WAREHOUSE_RESERVATION]: 'bg-gray-100 text-gray-800',
  [MovementType.WAREHOUSE_RESERVATION_RELEASE]: 'bg-gray-100 text-gray-800',
  [MovementType.OPERATOR_RESERVATION]: 'bg-gray-100 text-gray-800',
  [MovementType.OPERATOR_RESERVATION_RELEASE]: 'bg-gray-100 text-gray-800',
};

export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  [ReservationStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
  [ReservationStatus.CONFIRMED]: 'bg-blue-100 text-blue-800',
  [ReservationStatus.PARTIALLY_FULFILLED]: 'bg-orange-100 text-orange-800',
  [ReservationStatus.FULFILLED]: 'bg-green-100 text-green-800',
  [ReservationStatus.CANCELLED]: 'bg-red-100 text-red-800',
  [ReservationStatus.EXPIRED]: 'bg-gray-100 text-gray-800',
};
