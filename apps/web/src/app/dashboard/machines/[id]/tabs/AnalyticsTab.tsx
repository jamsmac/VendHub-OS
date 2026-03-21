/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMachinePnL } from "@/lib/hooks/use-machine-state";
import { api } from "@/lib/api";

const COLORS = [
  "#8b5e3c",
  "#d4a574",
  "#6b8e23",
  "#cd853f",
  "#8fbc8f",
  "#deb887",
  "#bc8f8f",
  "#a0522d",
];

interface AnalyticsTabProps {
  machineId: string;
}

function formatUZS(value: number): string {
  return Number(value).toLocaleString("ru-RU") + " UZS";
}

export function AnalyticsTab({ machineId }: AnalyticsTabProps) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const today = now.toISOString().split("T")[0];

  const { data: pnl, isLoading } = useMachinePnL(machineId, monthStart, today);

  return (
    <Tabs defaultValue="economics" className="space-y-4">
      <TabsList>
        <TabsTrigger value="economics">Экономика</TabsTrigger>
        <TabsTrigger value="sales">Продажи</TabsTrigger>
        <TabsTrigger value="state">Состояние</TabsTrigger>
        <TabsTrigger value="dynamics">Динамика</TabsTrigger>
      </TabsList>

      {/* Economics Sub-tab (P&L) */}
      <TabsContent value="economics">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !pnl ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет данных за период
          </p>
        ) : (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Выручка</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatUZS(pnl.revenue)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Себестоимость</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatUZS(pnl.costOfGoods)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">
                    Чистая прибыль
                  </p>
                  <p
                    className={`text-xl font-bold ${pnl.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatUZS(pnl.netProfit)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Маржа</p>
                  <p className="text-xl font-bold">{pnl.marginPercent}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed P&L */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  P&L за {monthStart} — {today}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Выручка ({pnl.salesCount} продаж)</span>
                    <span className="font-medium">
                      {formatUZS(pnl.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>− Себестоимость (COGS)</span>
                    <span>{formatUZS(pnl.costOfGoods)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>= Валовая прибыль</span>
                    <span>{formatUZS(pnl.grossProfit)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>− Аренда</span>
                    <span>{formatUZS(pnl.rentCost)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>− ТО и ремонт</span>
                    <span>{formatUZS(pnl.maintenanceCost)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 text-base">
                    <span>= Чистая прибыль</span>
                    <span
                      className={
                        pnl.netProfit >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {formatUZS(pnl.netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Средний чек</span>
                    <span>{formatUZS(pnl.avgTransaction)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </TabsContent>

      {/* Sales Sub-tab */}
      <TabsContent value="sales">
        <SalesCharts machineId={machineId} from={monthStart} to={today} />
      </TabsContent>

      {/* State Sub-tab — redirect to Contents tab */}
      <TabsContent value="state">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Расчётное состояние отображается на вкладке «Наполнение»
          </CardContent>
        </Card>
      </TabsContent>

      {/* Dynamics Sub-tab */}
      <TabsContent value="dynamics">
        <DynamicsCharts machineId={machineId} from={monthStart} to={today} />
      </TabsContent>
    </Tabs>
  );
}

// ============================================================================
// Sales Charts Component
// ============================================================================

function SalesCharts({
  machineId,
  from,
  to,
}: {
  machineId: string;
  from: string;
  to: string;
}) {
  const { data: summaries, isLoading } = useQuery({
    queryKey: ["transaction-summaries", machineId, from, to],
    queryFn: async () => {
      const res = await api.get("/transactions/daily-summaries", {
        params: { machineId, dateFrom: from, dateTo: to },
      });
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const data = summaries || [];

  // Payment method pie data
  const totalCash = data.reduce(
    (s: number, d: any) => s + Number(d.cashAmount || 0),
    0,
  );
  const totalCard = data.reduce(
    (s: number, d: any) => s + Number(d.cardAmount || 0),
    0,
  );
  const totalMobile = data.reduce(
    (s: number, d: any) => s + Number(d.mobileAmount || 0),
    0,
  );
  const paymentPie = [
    { name: "Наличные", value: totalCash },
    { name: "Карта", value: totalCard },
    { name: "QR/Mobile", value: totalMobile },
  ].filter((d) => d.value > 0);

  // Top products from latest summary
  const latestWithProducts = [...data]
    .reverse()
    .find((d: any) => d.topProducts?.length > 0);
  const topProducts = (latestWithProducts?.topProducts || []).slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Daily Sales Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Продажи по дням</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет данных
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="summaryDate"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("ru-RU", {
                      day: "2-digit",
                      month: "2-digit",
                    })
                  }
                  className="text-xs"
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(v: number) => [
                    `${v.toLocaleString("ru-RU")} сум`,
                    "Выручка",
                  ]}
                  labelFormatter={(l) =>
                    new Date(l).toLocaleDateString("ru-RU")
                  }
                />
                <Line
                  type="monotone"
                  dataKey="salesAmount"
                  stroke="#8b5e3c"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Выручка"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {/* Payment Methods Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Способы оплаты</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentPie.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет данных
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={paymentPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {paymentPie.map((_entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) =>
                      `${v.toLocaleString("ru-RU")} сум`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Products Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Топ продуктов</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет данных
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis type="number" className="text-xs" />
                  <YAxis
                    type="category"
                    dataKey="productName"
                    width={100}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v: number) => [`${v} шт`, "Продано"]} />
                  <Bar
                    dataKey="quantity"
                    fill="#8b5e3c"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Dynamics Charts Component
// ============================================================================

function DynamicsCharts({
  machineId,
  from,
  to,
}: {
  machineId: string;
  from: string;
  to: string;
}) {
  const { data: summaries, isLoading } = useQuery({
    queryKey: ["transaction-summaries", machineId, from, to],
    queryFn: async () => {
      const res = await api.get("/transactions/daily-summaries", {
        params: { machineId, dateFrom: from, dateTo: to },
      });
      return (res.data?.data ?? res.data ?? []) as any[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const data = summaries || [];

  // Sales count + amount dual axis
  const dailyData = data.map((d: any) => ({
    date: new Date(d.summaryDate).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    }),
    salesCount: d.salesCount || 0,
    salesAmount: Number(d.salesAmount || 0),
  }));

  // Hourly heatmap from latest summary
  const latestWithHourly = [...data]
    .reverse()
    .find((d: any) => d.hourlyStats?.length > 0);
  const hourlyStats = latestWithHourly?.hourlyStats || [];

  return (
    <div className="space-y-4">
      {/* Sales Count + Revenue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Продажи и выручка по дням</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет данных
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}к`}
                  className="text-xs"
                />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="salesCount"
                  fill="#d4a574"
                  name="Кол-во продаж"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="salesAmount"
                  stroke="#8b5e3c"
                  strokeWidth={2}
                  name="Выручка (сум)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Hourly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Продажи по часам</CardTitle>
        </CardHeader>
        <CardContent>
          {hourlyStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Нет почасовых данных
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h) => `${h}:00`}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip
                  labelFormatter={(h) => `${h}:00 — ${Number(h) + 1}:00`}
                  formatter={(v: number, name: string) => [
                    name === "count"
                      ? `${v} продаж`
                      : `${v.toLocaleString("ru-RU")} сум`,
                    name === "count" ? "Продажи" : "Выручка",
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill="#8b5e3c"
                  radius={[4, 4, 0, 0]}
                  name="count"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
