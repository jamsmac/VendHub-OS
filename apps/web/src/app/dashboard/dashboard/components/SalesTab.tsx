"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useSalesChart } from "@/lib/hooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import {
  SALES_WEEK,
  CATEGORY_DATA,
  PAYMENT_METHODS,
  TOOLTIP_STYLE,
  fmtShort,
} from "./constants";

export function SalesTab() {
  const [salesMetric, setSalesMetric] = useState<"revenue" | "orders">(
    "revenue",
  );
  const { data: salesChart } = useSalesChart(7); // 7 days

  const chartData =
    salesChart && salesChart.length > 0 ? salesChart : SALES_WEEK;

  return (
    <div className="space-y-6">
      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Weekly bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Продажи за неделю</CardTitle>
              <div className="flex gap-1.5">
                {(["revenue", "orders"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSalesMetric(m)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      salesMetric === m
                        ? "bg-espresso text-white"
                        : "bg-stone-100 text-espresso-light hover:bg-stone-200"
                    }`}
                  >
                    {m === "revenue" ? "Выручка" : "Заказы"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                <XAxis dataKey="day" tick={{ fill: "#795548", fontSize: 13 }} />
                <YAxis
                  tick={{ fill: "#795548", fontSize: 12 }}
                  tickFormatter={(v: number) =>
                    salesMetric === "revenue" ? fmtShort(v) : String(v)
                  }
                />
                <Tooltip
                  formatter={(value: number) => [
                    salesMetric === "revenue"
                      ? formatPrice(value)
                      : `${value} заказов`,
                    salesMetric === "revenue" ? "Выручка" : "Заказы",
                  ]}
                  {...TOOLTIP_STYLE}
                />
                <Bar
                  dataKey={salesMetric}
                  fill="#D4A574"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Категории</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={CATEGORY_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {CATEGORY_DATA.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Доля"]}
                  {...TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CATEGORY_DATA.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: c.color }}
                  />
                  <span className="text-espresso-light">{c.name}</span>
                  <span className="ml-auto font-semibold">{c.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment methods */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {PAYMENT_METHODS.map((pm) => {
          const Icon = pm.icon;
          return (
            <Card key={pm.method}>
              <CardContent className="p-4">
                <div className={`inline-flex rounded-lg p-2 ${pm.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-xs text-espresso-light">{pm.method}</p>
                <p className="text-lg font-bold text-espresso-dark font-display">
                  {fmtShort(pm.amount)}
                </p>
                <p className="text-xs text-espresso-light">
                  {pm.percent}% от всех
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Тренд выручки и заказов</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
              <XAxis dataKey="day" tick={{ fill: "#795548", fontSize: 13 }} />
              <YAxis
                yAxisId="left"
                tick={{ fill: "#795548", fontSize: 12 }}
                tickFormatter={(v: number) => fmtShort(v)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#795548", fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "revenue" ? formatPrice(value) : `${value} заказов`,
                  name === "revenue" ? "Выручка" : "Заказы",
                ]}
                {...TOOLTIP_STYLE}
              />
              <Legend
                formatter={(value: string) =>
                  value === "revenue" ? "Выручка" : "Заказы"
                }
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#D4A574"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="#795548"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
