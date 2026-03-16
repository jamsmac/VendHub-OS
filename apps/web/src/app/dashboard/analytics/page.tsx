"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Coffee,
  ShoppingCart,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi } from "@/lib/api";

interface DashboardData {
  widgets: Array<{
    id: string;
    title: string;
    widgetType: string;
    config: Record<string, unknown>;
  }>;
  latestStats: {
    totalRevenue: number;
    totalSalesCount: number;
    averageSaleAmount: number;
    activeMachinesCount: number;
    onlineMachinesCount: number;
    offlineMachinesCount: number;
    totalTasksCompleted: number;
    topProducts?: Array<{ name: string; revenue: number; quantity: number }>;
    topMachines?: Array<{
      machineNumber: string;
      revenue: number;
      salesCount: number;
    }>;
  } | null;
}

export default function AnalyticsPage() {
  const t = useTranslations("analytics");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics-dashboard"],
    queryFn: async () => {
      const res = await analyticsApi.getDashboard();
      return (res.data ?? {}) as DashboardData;
    },
    staleTime: 60_000,
  });

  const stats = data?.latestStats;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("revenue") || "Revenue"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalRevenue ? formatPrice(stats.totalRevenue) : "—"}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("sales") || "Sales"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.totalSalesCount ?? "—"}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("avgSale") || "Avg Sale"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.averageSaleAmount
                    ? formatPrice(stats.averageSaleAmount)
                    : "—"}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("activeMachines") || "Active Machines"}
                </p>
                <p className="text-2xl font-bold">
                  {stats?.onlineMachinesCount ?? "—"} /{" "}
                  {stats?.activeMachinesCount ?? "—"}
                </p>
              </div>
              <Coffee className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Machines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("topProducts") || "Top Products"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topProducts?.length ? (
              <div className="space-y-3">
                {stats.topProducts.slice(0, 8).map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate flex-1">
                      {i + 1}. {p.name}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {p.quantity} pcs
                    </span>
                    <span className="font-medium ml-4">
                      {formatPrice(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                {t("noData") || "No data available"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              {t("topMachines") || "Top Machines"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.topMachines?.length ? (
              <div className="space-y-3">
                {stats.topMachines.slice(0, 8).map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate flex-1">
                      {i + 1}. {m.machineNumber}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {m.salesCount} sales
                    </span>
                    <span className="font-medium ml-4">
                      {formatPrice(m.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                {t("noData") || "No data available"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
