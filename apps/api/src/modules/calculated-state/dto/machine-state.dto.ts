/**
 * Machine Calculated State DTOs
 * All data computed from facts (sales × recipes + loads), no telemetry
 */

export interface BunkerState {
  containerId: string;
  slotNumber: number;
  ingredientName: string | null;
  ingredientId: string | null;
  batchNumber: string | null;
  batchId: string | null;
  /** Grams/ml remaining (loaded - consumed) */
  remaining: number;
  /** Total capacity */
  capacity: number;
  /** 0-100 fill percentage */
  fillPercent: number;
  /** Estimated portions left based on avg recipe usage */
  portionsLeft: number | null;
  /** Estimated days until empty at current sales rate */
  daysUntilEmpty: number | null;
  /** Is below configured minimum level */
  isLow: boolean;
}

export interface ComponentState {
  componentId: string;
  name: string;
  type: string;
  /** Cycles since last maintenance reset */
  cyclesSinceReset: number;
  /** Configured max cycles before maintenance */
  maxCycles: number | null;
  /** 0-100 usage percentage */
  usagePercent: number;
  /** Needs maintenance now */
  needsMaintenance: boolean;
  lastMaintenanceDate: Date | null;
}

export interface CleaningState {
  /** Cups since last daily flush */
  cupsSinceFlush: number;
  /** Configured flush threshold */
  flushThreshold: number;
  /** Is flush overdue */
  flushOverdue: boolean;
  /** Days since last deep cleaning */
  daysSinceDeepClean: number;
  /** Configured deep clean interval (days) */
  deepCleanIntervalDays: number;
  /** Is deep clean overdue */
  deepCleanOverdue: boolean;
  lastFlushDate: Date | null;
  lastDeepCleanDate: Date | null;
}

export interface MachinePnL {
  periodStart: Date;
  periodEnd: Date;
  /** Total sales revenue (UZS) */
  revenue: number;
  /** Cost of goods sold from sale_ingredients (UZS) */
  costOfGoods: number;
  /** revenue - costOfGoods */
  grossProfit: number;
  /** Location rent for the period */
  rentCost: number;
  /** Maintenance + repair costs */
  maintenanceCost: number;
  /** Total operating expenses */
  operatingExpenses: number;
  /** grossProfit - operatingExpenses */
  netProfit: number;
  /** netProfit / revenue * 100 */
  marginPercent: number;
  /** Sales count */
  salesCount: number;
  /** Average transaction amount */
  avgTransaction: number;
}

export interface SlotState {
  slotId: string;
  slotNumber: string;
  productId: string | null;
  productName: string | null;
  /** Current quantity in slot */
  currentQuantity: number;
  /** Maximum capacity */
  capacity: number;
  /** 0-100 fill percentage */
  fillPercent: number;
  /** Price per unit (UZS) */
  price: number | null;
  /** Is slot active */
  isActive: boolean;
  /** Is below min quantity */
  needsRefill: boolean;
  /** Total sold count */
  totalSold: number;
}

export interface MachineCalculatedState {
  machineId: string;
  machineCode: string;
  calculatedAt: Date;
  bunkers: BunkerState[];
  slots: SlotState[];
  components: ComponentState[];
  cleaning: CleaningState;
  /** Summary stats */
  summary: {
    totalPortionsLeft: number;
    lowStockBunkers: number;
    lowStockSlots: number;
    componentsNeedingMaintenance: number;
    overdueTasks: number;
  };
}
