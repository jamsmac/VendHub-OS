"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, BarChart3, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAmount, REPORT_TYPE_CONFIG, ReportType } from "./report-types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

// Цвета провайдеров
const PROVIDER_COLORS: Record<string, string> = {
  PAYME: "#3b82f6",
  CLICK: "#22c55e",
  VENDHUB_ORDERS: "#f97316",
  VENDHUB_CSV: "#a855f7",
  KASSA_FISCAL: "#ef4444",
  UNKNOWN: "#94a3b8",
};

const PIE_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
];

// ─────────────────────────────────────────────
// Форматирование суммы в тыс.
// ─────────────────────────────────────────────
function fmtK(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

// ─────────────────────────────────────────────
// Тепловая карта день × час
// ─────────────────────────────────────────────
function HeatmapGrid({
  data,
}: {
  data: { dow: string; hour: string; count: string }[];
}) {
  const DAY_LABELS = ["", "Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const maxCount = Math.max(...data.map((d) => Number(d.count)));

  const grid: Record<string, Record<string, number>> = {};
  data.forEach((d) => {
    if (!grid[d.dow]) grid[d.dow] = {};
    grid[d.dow][d.hour] = Number(d.count);
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-[600px]">
        {/* Часы заголовок */}
        <div className="flex mb-1 ml-8">
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="w-6 text-center text-[9px] text-muted-foreground flex-shrink-0"
            >
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {/* Строки по дням */}
        {[2, 3, 4, 5, 6, 7, 1].map((dow) => (
          <div key={dow} className="flex items-center mb-0.5">
            <span className="text-xs text-muted-foreground w-8 flex-shrink-0">
              {DAY_LABELS[dow]}
            </span>
            {Array.from({ length: 24 }, (_, h) => {
              const count = grid[String(dow)]?.[String(h)] ?? 0;
              const intensity = maxCount > 0 ? count / maxCount : 0;
              return (
                <div
                  key={h}
                  title={`${DAY_LABELS[dow]} ${h}:00 — ${count} транзакций`}
                  className="w-6 h-5 rounded-sm flex-shrink-0 cursor-default transition-colors"
                  style={{
                    backgroundColor:
                      count === 0
                        ? "hsl(var(--muted))"
                        : `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`,
                  }}
                />
              );
            })}
          </div>
        ))}
        {/* Легенда */}
        <div className="flex items-center gap-2 mt-2 ml-8">
          <span className="text-xs text-muted-foreground">Меньше</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <div
              key={v}
              className="w-5 h-4 rounded-sm"
              style={{ backgroundColor: `rgba(59,130,246,${v})` }}
            />
          ))}
          <span className="text-xs text-muted-foreground">Больше</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ГЛАВНЫЙ КОМПОНЕНТ АНАЛИТИКИ
// ─────────────────────────────────────────────
export function AnalyticsTab() {
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const params = `dateFrom=${dateFrom}&dateTo=${dateTo}&groupBy=${groupBy}`;

  const { data: dynamics, isLoading: dynLoading } = useQuery({
    queryKey: ["analytics-dynamics", dateFrom, dateTo, groupBy],
    queryFn: () =>
      apiGet<Record<string, unknown>[]>(
        `/payment-reports/analytics/revenue-dynamics?${params}`,
      ),
  });

  const { data: topMachines, isLoading: machLoading } = useQuery({
    queryKey: ["analytics-machines", dateFrom, dateTo],
    queryFn: () =>
      apiGet<
        {
          machineCode: string;
          location: string;
          totalAmount: string;
          count: string;
        }[]
      >(
        `/payment-reports/analytics/top-machines?dateFrom=${dateFrom}&dateTo=${dateTo}&limit=15`,
      ),
  });

  const { data: methods, isLoading: methodsLoading } = useQuery({
    queryKey: ["analytics-methods", dateFrom, dateTo],
    queryFn: () =>
      apiGet<
        {
          method: string;
          reportType: string;
          totalAmount: string;
          count: string;
        }[]
      >(
        `/payment-reports/analytics/payment-methods?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      ),
  });

  const { data: comparison } = useQuery({
    queryKey: ["analytics-comparison", dateFrom, dateTo],
    queryFn: () =>
      apiGet<
        {
          reportType: string;
          totalAmount: string;
          count: string;
          avgAmount: string;
        }[]
      >(
        `/payment-reports/analytics/provider-comparison?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      ),
  });

  const { data: heatmap, isLoading: heatLoading } = useQuery({
    queryKey: ["analytics-heatmap", dateFrom, dateTo],
    queryFn: () =>
      apiGet<
        { dow: string; hour: string; count: string; totalAmount: string }[]
      >(
        `/payment-reports/analytics/heatmap?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      ),
  });

  // Данные для pie chart — агрегируем по методу
  const pieData = (methods ?? [])
    .reduce<{ name: string; value: number }[]>((acc, m) => {
      const existing = acc.find((a) => a.name === m.method);
      if (existing) existing.value += Number(m.totalAmount);
      else acc.push({ name: m.method, value: Number(m.totalAmount) });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Ключи провайдеров для динейного графика
  const REPORT_TYPE_VALUES: ReportType[] = [
    "PAYME",
    "CLICK",
    "VENDHUB_ORDERS",
    "VENDHUB_CSV",
    "KASSA_FISCAL",
    "UNKNOWN",
  ];
  const _providerKeys = REPORT_TYPE_VALUES.filter((t) =>
    (dynamics ?? []).some((d) => d[t] !== undefined),
  );

  const chartProviders: ReportType[] = [
    "PAYME",
    "CLICK",
    "VENDHUB_ORDERS",
    "VENDHUB_CSV",
    "KASSA_FISCAL",
  ].filter((t) =>
    (dynamics ?? []).some((d) => d[t] !== undefined),
  ) as ReportType[];

  return (
    <div className="space-y-5">
      {/* Фильтры */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">От</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">До</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Группировка
          </label>
          <Select
            value={groupBy}
            onValueChange={(v) => setGroupBy(v as typeof groupBy)}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">По дням</SelectItem>
              <SelectItem value="week">По неделям</SelectItem>
              <SelectItem value="month">По месяцам</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Быстрые пресеты */}
        {[
          { label: "7 дней", days: 7 },
          { label: "30 дней", days: 30 },
          { label: "90 дней", days: 90 },
        ].map((p) => (
          <Button
            key={p.label}
            variant="outline"
            size="sm"
            onClick={() => {
              setDateFrom(
                new Date(Date.now() - p.days * 86400000)
                  .toISOString()
                  .slice(0, 10),
              );
              setDateTo(new Date().toISOString().slice(0, 10));
            }}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* KPI карточки */}
      {comparison && comparison.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {comparison.map((c) => {
            const cfg = REPORT_TYPE_CONFIG[c.reportType as ReportType];
            return (
              <Card key={c.reportType}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{cfg?.icon ?? "📄"}</span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        cfg?.color ?? "text-gray-600",
                      )}
                    >
                      {cfg?.label ?? c.reportType}
                    </span>
                  </div>
                  <p className="text-xl font-bold">
                    {fmtK(Number(c.totalAmount))} ₽
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(c.count).toLocaleString()} транзакций • ср.{" "}
                    {fmtK(Number(c.avgAmount))}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Динамика оборота */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Динамика оборота по источникам
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dynLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (dynamics?.length ?? 0) === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Нет данных за выбранный период
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dynamics}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtK}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [formatAmount(v), ""]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend
                  formatter={(v) =>
                    REPORT_TYPE_CONFIG[v as ReportType]?.label ?? v
                  }
                />
                {chartProviders.map((type) => (
                  <Line
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stroke={PROVIDER_COLORS[type]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ТОП машин + Pie chart методов */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ТОП машин */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              ТОП машин по обороту
            </CardTitle>
          </CardHeader>
          <CardContent>
            {machLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (topMachines?.length ?? 0) === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Нет данных
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topMachines?.slice(0, 12).map((m) => ({
                    name: m.machineCode?.slice(-8) ?? "—",
                    fullName: m.machineCode,
                    location: m.location,
                    amount: Number(m.totalAmount),
                    count: Number(m.count),
                  }))}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={fmtK}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={70}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatAmount(v), "Оборот"]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.location ?? ""
                    }
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart методов оплаты */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Методы оплаты
            </CardTitle>
          </CardHeader>
          <CardContent>
            {methodsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : pieData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Нет данных
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatAmount(v), ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieData.slice(0, 7).map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span className="text-xs truncate flex-1">{p.name}</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {fmtK(p.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Тепловая карта */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Тепловая карта активности (день недели × час)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {heatLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (heatmap?.length ?? 0) === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
              Нет данных
            </div>
          ) : (
            <HeatmapGrid data={heatmap!} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
