"use client";

import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useDashboardKpi, useOrderStats } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { KPI_DATA, fmtShort } from "./constants";

export function KpiCards() {
  const t = useTranslations("dashboardMain");
  const { data: kpi } = useDashboardKpi();
  const { data: orderStats } = useOrderStats();

  const kpiData = KPI_DATA.map((item) => {
    if (kpi && item.key === "machinesOnline") {
      return { ...item, value: `${kpi.activeMachines}/${kpi.totalMachines}` };
    }
    if (orderStats) {
      if (item.key === "dailyRevenue" && orderStats.revenue !== undefined) {
        return { ...item, value: orderStats.revenue };
      }
      if (item.key === "avgCheck" && orderStats.avgOrderValue !== undefined) {
        return { ...item, value: orderStats.avgOrderValue };
      }
      if (item.key === "orders" && orderStats.total !== undefined) {
        return { ...item, value: orderStats.total };
      }
    }
    return item;
  });

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpiData.map((k) => {
        const Icon = k.icon;
        const isPositive = k.change > 0;
        const isNegative = k.change < 0;
        const label = t(`kpi.${k.key}`);

        let displayValue: string;
        if (k.format === "price") displayValue = fmtShort(k.value as number);
        else if (k.format === "number")
          displayValue = formatNumber(k.value as number);
        else displayValue = String(k.value);

        return (
          <Card key={k.key}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-espresso-light truncate">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-bold text-espresso-dark font-display">
                    {displayValue}
                  </p>
                </div>
                <div className={`shrink-0 rounded-xl p-2 ${k.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              {k.change !== 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs">
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  ) : isNegative ? (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  ) : null}
                  <span
                    className={isPositive ? "text-emerald-600" : "text-red-600"}
                  >
                    {isPositive ? "+" : ""}
                    {k.change}%
                  </span>
                  <span className="text-espresso-light">
                    {t("vsYesterday")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
