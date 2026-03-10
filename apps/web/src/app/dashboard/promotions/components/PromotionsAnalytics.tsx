"use client";

import { Fragment, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AlertTriangle, CheckCheck, Code2, ZapIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

interface AnalyticsData {
  usageOverTime30Days: Array<{ day: string; uses: number; revenue: number }>;
  revenueComparison: Array<{
    period: string;
    withPromo: number;
    withoutPromo: number;
  }>;
  conversionByType: Array<{ name: string; value: number; fill: string }>;
  usageByDay: Array<{ day: string; uses: number }>;
  couponStats: {
    totalIssued: number;
    totalUsed: number;
    totalExpired: number;
    activeRate: number;
  };
  hourlyHeatmapData: Array<{ hour: string; [key: string]: string | number }>;
  conversionFunnelData: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
  topEffectivePromos: Array<{
    title: string;
    usageCount: number;
    revenueImpact: number;
    roi: number;
  }>;
  revenueData6M: Array<{ month: string; revenue: number; promos: number }>;
  topDistrictData: Array<{ district: string; usage: number; revenue: number }>;
}

interface PromotionsAnalyticsProps {
  data: AnalyticsData;
}

// fmt is now imported as formatNumber from "@/lib/utils"

export function PromotionsAnalytics({ data }: PromotionsAnalyticsProps) {
  const [analyticsSubTab, setAnalyticsSubTab] = useState<
    "overview" | "roi" | "toppromos"
  >("overview");

  return (
    <>
      {/* Analytics sub-tabs */}
      <div className="flex gap-2 border-b border-espresso/10 pb-1">
        {[
          { id: "overview" as const, label: "Обзор" },
          { id: "roi" as const, label: "ROI и эффективность" },
          { id: "toppromos" as const, label: "Топ акции" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAnalyticsSubTab(tab.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              analyticsSubTab === tab.id
                ? "bg-espresso text-white"
                : "text-espresso-light hover:bg-espresso-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {analyticsSubTab === "overview" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Использование акций за 30 дней
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.usageOverTime30Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                  <XAxis dataKey="day" stroke="#92400e" fontSize={11} />
                  <YAxis stroke="#92400e" fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="uses"
                    name="Использований"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Выручка: с акциями vs без акций
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.revenueComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                  <XAxis dataKey="period" stroke="#92400e" fontSize={12} />
                  <YAxis stroke="#92400e" fontSize={12} />
                  <Tooltip
                    formatter={(value) =>
                      `${formatNumber(value as number)} UZS`
                    }
                  />
                  <Legend />
                  <Bar
                    dataKey="withPromo"
                    name="С акциями"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="withoutPromo"
                    name="Без акций"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Конверсия по типам акций
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.conversionByType}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {data.conversionByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Использование акций по дням недели
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.usageByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                  <XAxis dataKey="day" stroke="#92400e" fontSize={12} />
                  <YAxis stroke="#92400e" fontSize={12} />
                  <Tooltip />
                  <Bar
                    dataKey="uses"
                    name="Использований"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Promo code usage stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Выдано кодов",
                value: data.couponStats.totalIssued,
                icon: Code2,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                label: "Использовано",
                value: data.couponStats.totalUsed,
                icon: CheckCheck,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },
              {
                label: "Истекло",
                value: data.couponStats.totalExpired,
                icon: AlertTriangle,
                color: "text-amber-600",
                bg: "bg-amber-50",
              },
              {
                label: "Активных",
                value: `${data.couponStats.activeRate}%`,
                icon: ZapIcon,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-espresso-light">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-espresso-dark font-display">
                          {stat.value}
                        </p>
                      </div>
                      <div className={`rounded-xl ${stat.bg} p-2.5`}>
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Hourly heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Тепловая карта использования по часам (7 дней)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: "auto repeat(7, 1fr)" }}
                  >
                    <div className="text-xs font-semibold text-espresso-dark text-right pr-2">
                      Часы
                    </div>
                    {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                      <div
                        key={day}
                        className="text-xs font-semibold text-espresso-dark text-center"
                      >
                        {day}
                      </div>
                    ))}
                    {data.hourlyHeatmapData.map((row) => (
                      <Fragment key={row.hour}>
                        <div className="text-xs text-espresso-light text-right pr-2 py-1">
                          {row.hour}
                        </div>
                        {[
                          row.mon,
                          row.tue,
                          row.wed,
                          row.thu,
                          row.fri,
                          row.sat,
                          row.sun,
                        ].map((val, idx) => {
                          const maxVal = 31;
                          const intensity = (val as number) / maxVal;
                          const bgColor =
                            intensity === 0
                              ? "bg-espresso-50"
                              : intensity < 0.25
                                ? "bg-amber-100"
                                : intensity < 0.5
                                  ? "bg-amber-300"
                                  : intensity < 0.75
                                    ? "bg-amber-500"
                                    : "bg-amber-700";
                          const textColor =
                            intensity > 0.5
                              ? "text-white"
                              : "text-espresso-dark";
                          return (
                            <div
                              key={`${row.hour}-${idx}`}
                              className={`${bgColor} ${textColor} text-xs font-semibold text-center py-1 rounded`}
                            >
                              {val}
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversion funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Воронка конверсии</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.conversionFunnelData.map((stage, idx) => {
                  const isRevenue = stage.stage === "Выручка";
                  const width = stage.percentage;
                  const colors = [
                    "bg-blue-500",
                    "bg-amber-500",
                    "bg-emerald-500",
                    "bg-purple-500",
                  ];
                  return (
                    <div key={stage.stage} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-espresso-dark">
                          {stage.stage}
                        </span>
                        <span className="text-sm font-bold text-espresso-dark">
                          {isRevenue
                            ? formatNumber(stage.count as number) + " UZS"
                            : formatNumber(stage.count as number) +
                              " (" +
                              stage.percentage.toFixed(1) +
                              "%)"}
                        </span>
                      </div>
                      <div className="h-8 rounded-lg bg-espresso-50 overflow-hidden">
                        <div
                          className={`h-full ${colors[idx]} flex items-center justify-end pr-3`}
                          style={{ width: `${width}%` }}
                        >
                          {width > 20 && (
                            <span className="text-xs font-bold text-white">
                              {width.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ROI Tab */}
      {analyticsSubTab === "roi" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                ROI и эффективность по акциям
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topEffectivePromos.map((promo, idx) => (
                  <div
                    key={promo.title}
                    className="border border-espresso/10 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-espresso-dark">
                          #{idx + 1} {promo.title}
                        </p>
                        <p className="text-xs text-espresso-light mt-0.5">
                          {promo.usageCount} использований
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          {promo.roi}%
                        </p>
                        <p className="text-xs text-espresso-light">ROI</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-espresso-light">
                        Влияние на выручку:
                      </span>
                      <span className="font-semibold text-espresso-dark">
                        {formatNumber(promo.revenueImpact)} UZS
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-espresso-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        style={{
                          width: `${Math.min((promo.roi / 300) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Влияние акций на выручку (6 месяцев)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.revenueData6M}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                  <XAxis dataKey="month" stroke="#92400e" fontSize={12} />
                  <YAxis stroke="#92400e" fontSize={12} />
                  <Tooltip
                    formatter={(value) =>
                      `${formatNumber(value as number)} UZS`
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Общая выручка"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.1}
                  />
                  <Area
                    type="monotone"
                    dataKey="promos"
                    name="От акций"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Географическая производительность (Топ 5 районов)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.topDistrictData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                  <XAxis type="number" stroke="#92400e" fontSize={12} />
                  <YAxis
                    dataKey="district"
                    type="category"
                    stroke="#92400e"
                    fontSize={11}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value) => formatNumber(value as number)}
                  />
                  <Bar
                    dataKey="usage"
                    name="Использования"
                    fill="#f59e0b"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* Top Promos Tab */}
      {analyticsSubTab === "toppromos" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Топ 5 самых эффективных акций по влиянию на выручку
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topEffectivePromos.map((promo, idx) => {
                  const maxRev = data.topEffectivePromos.reduce(
                    (m, p) => Math.max(m, p.revenueImpact),
                    0,
                  );
                  const pct =
                    maxRev > 0
                      ? Math.round((promo.revenueImpact / maxRev) * 100)
                      : 0;
                  return (
                    <div key={promo.title} className="flex items-center gap-4">
                      <span className="w-6 text-right text-sm font-bold text-espresso-light">
                        #{idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-espresso-dark">
                            {promo.title}
                          </span>
                          <span className="text-espresso-light">
                            {formatNumber(promo.revenueImpact)} UZS
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-espresso-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-0.5 flex gap-4 text-[11px] text-espresso-light">
                          <span>{promo.usageCount} исп.</span>
                          <span>ROI: {promo.roi}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
