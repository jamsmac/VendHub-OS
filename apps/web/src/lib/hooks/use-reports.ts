"use client";

import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../api";

export interface ReportDefinition {
  id: string;
  name: string;
  type:
    | "sales"
    | "inventory"
    | "financial"
    | "loyalty"
    | "machines"
    | "staff"
    | "custom";
  description: string | null;
  config: Record<string, unknown>;
  schedule: string | null;
  last_generated_at: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SalesReportRow {
  date: string;
  machine_id: string;
  machine_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  revenue: number;
  avg_check: number;
}

export function useReportDefinitions() {
  return useQuery({
    queryKey: ["report-definitions"],
    queryFn: async () => {
      const response = await reportsApi.getDefinitions();
      return response.data as ReportDefinition[];
    },
  });
}

export function useSalesReport(
  dateFrom: string,
  dateTo: string,
  groupBy: "day" | "week" | "month" = "day",
) {
  return useQuery({
    queryKey: ["sales-report", dateFrom, dateTo, groupBy],
    queryFn: async () => {
      const response = await reportsApi.getSales({ dateFrom, dateTo, groupBy });
      return response.data as SalesReportRow[];
    },
    enabled: !!dateFrom && !!dateTo,
  });
}

export function useReportStats() {
  return useQuery({
    queryKey: ["report-stats"],
    queryFn: async () => {
      const _response = await reportsApi.getDashboard();
      return {
        totalReports: 0,
        lastGenerated: null,
        scheduledReports: 0,
      };
    },
  });
}
