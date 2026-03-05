"use client";

import { BarChart3, Tag, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Promotion } from "./types";

interface PromotionsKPICardsProps {
  promotions: Promotion[];
}

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

export function PromotionsKPICards({ promotions }: PromotionsKPICardsProps) {
  const totalActive = promotions.filter((p) => p.isActive).length;
  const totalUsage = promotions.reduce((s, p) => s + p.usageCount, 0);
  const totalRevenue = promotions.reduce((s, p) => s + p.revenueImpact, 0);
  const totalUniqueUsers = promotions.reduce((s, p) => s + p.uniqueUsers, 0);

  const kpis = [
    {
      label: "Всего акций",
      value: promotions.length,
      sub: `${totalActive} активных`,
      icon: Tag,
      bg: "bg-caramel/10",
      iconColor: "text-caramel-dark",
    },
    {
      label: "Использований",
      value: totalUsage,
      sub: `${totalUniqueUsers} уник. польз.`,
      icon: Users,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Влияние на выручку",
      value: `${fmtShort(totalRevenue)}`,
      sub: "за текущий период",
      icon: TrendingUp,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Конверсия",
      value:
        totalUsage > 0
          ? `${((totalUniqueUsers / totalUsage) * 100).toFixed(1)}%`
          : "0%",
      sub: "уники / использования",
      icon: BarChart3,
      bg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-espresso-light">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold text-espresso-dark font-display">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-espresso-light/70">{kpi.sub}</p>
                </div>
                <div className={`rounded-xl ${kpi.bg} p-2.5`}>
                  <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
