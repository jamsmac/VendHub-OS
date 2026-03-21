"use client";

import { useQuery } from "@tanstack/react-query";
import { machinesApi } from "../api";

// ============================================================================
// Types matching backend DTOs
// ============================================================================

export interface BunkerState {
  containerId: string;
  slotNumber: number;
  ingredientName: string | null;
  ingredientId: string | null;
  batchNumber: string | null;
  batchId: string | null;
  remaining: number;
  capacity: number;
  fillPercent: number;
  portionsLeft: number | null;
  daysUntilEmpty: number | null;
  isLow: boolean;
}

export interface ComponentState {
  componentId: string;
  name: string;
  type: string;
  cyclesSinceReset: number;
  maxCycles: number | null;
  usagePercent: number;
  needsMaintenance: boolean;
  lastMaintenanceDate: string | null;
}

export interface CleaningState {
  cupsSinceFlush: number;
  flushThreshold: number;
  flushOverdue: boolean;
  daysSinceDeepClean: number;
  deepCleanIntervalDays: number;
  deepCleanOverdue: boolean;
  lastFlushDate: string | null;
  lastDeepCleanDate: string | null;
}

export interface MachineCalculatedState {
  machineId: string;
  machineCode: string;
  calculatedAt: string;
  bunkers: BunkerState[];
  components: ComponentState[];
  cleaning: CleaningState;
  summary: {
    totalPortionsLeft: number;
    lowStockBunkers: number;
    componentsNeedingMaintenance: number;
    overdueTasks: number;
  };
}

export interface MachinePnL {
  periodStart: string;
  periodEnd: string;
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  rentCost: number;
  maintenanceCost: number;
  operatingExpenses: number;
  netProfit: number;
  marginPercent: number;
  salesCount: number;
  avgTransaction: number;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch calculated machine state (bunker levels, components, cleaning status).
 * Cached for 5 minutes on the server; React Query refetches every 60s on client.
 */
export function useMachineState(machineId: string) {
  return useQuery({
    queryKey: ["machine-state", machineId],
    queryFn: async () => {
      const res = await machinesApi.getState(machineId);
      return res.data as MachineCalculatedState;
    },
    enabled: !!machineId,
    refetchInterval: 60_000, // Refresh every minute
    staleTime: 30_000,
  });
}

/**
 * Fetch P&L (profit & loss) for a machine over a date range.
 */
export function useMachinePnL(machineId: string, from: string, to: string) {
  return useQuery({
    queryKey: ["machine-pnl", machineId, from, to],
    queryFn: async () => {
      const res = await machinesApi.getPnL(machineId, from, to);
      return res.data as MachinePnL;
    },
    enabled: !!machineId && !!from && !!to,
    staleTime: 5 * 60_000, // 5 min
  });
}
