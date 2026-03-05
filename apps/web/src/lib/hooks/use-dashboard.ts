"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export interface DashboardKpi {
  totalMachines: number;
  activeMachines: number;
  totalProducts: number;
  availableProducts: number;
}

export interface SalesChartData {
  date: string;
  sales: number;
  orders: number;
}

export interface RevenueStats {
  totalRevenue: number;
  averageDailyRevenue: number;
  trend: number;
  currency: string;
}

export interface DashboardAlert {
  id: string;
  type: "offline" | "maintenance" | "unavailable";
  severity: "critical" | "warning";
  title: string;
  description: string;
  timestamp: string;
  machineId?: string;
  productId?: string;
}

export interface ActivityLogEntry {
  id: string;
  user: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
}

export interface DashboardSummary {
  kpi: DashboardKpi;
  alerts: DashboardAlert[];
  revenueStats: RevenueStats;
  recentActivity: ActivityLogEntry[];
}

export function useDashboardKpi() {
  return useQuery({
    queryKey: ["dashboard-kpi"],
    queryFn: async () => {
      const response = await api.get("/analytics/dashboard/kpi");
      return response.data;
    },
    refetchInterval: 60_000,
  });
}

export function useSalesChart(days = 7) {
  return useQuery({
    queryKey: ["sales-chart", days],
    queryFn: async () => {
      const response = await api.get("/analytics/dashboard/sales-chart", {
        params: { days },
      });
      return response.data;
    },
  });
}

/**
 * Real-time alerts from API (machines offline + products unavailable)
 */
export function useDashboardAlerts() {
  return useQuery({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => {
      const response = await api.get("/alerts");
      return response.data;
    },
    refetchInterval: 2 * 60_000,
  });
}

/**
 * Revenue statistics
 */
export function useRevenueStats(days = 30) {
  return useQuery({
    queryKey: ["revenue-stats", days],
    queryFn: async () => {
      const response = await api.get("/analytics/dashboard/revenue-stats", {
        params: { days },
      });
      return response.data;
    },
  });
}

/**
 * Recent activity log
 */
export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ["recent-activity", limit],
    queryFn: async () => {
      const response = await api.get("/audit", { params: { limit } });
      return response.data;
    },
  });
}

/**
 * Complete dashboard summary (all data in one query)
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await api.get("/analytics/dashboard/summary");
      return response.data;
    },
    refetchInterval: 60_000,
  });
}
