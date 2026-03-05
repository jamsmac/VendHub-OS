"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSalesChart } from "@/lib/hooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { HOURLY_SALES, TOOLTIP_STYLE, fmtShort } from "./constants";

export function HourlyChart() {
  const { data: salesChart } = useSalesChart(1); // 1 day = hourly data
  const chartData =
    salesChart && salesChart.length > 0 ? salesChart : HOURLY_SALES;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Продажи по часам</CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D4A574]" /> Сегодня
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#795548] opacity-40" />{" "}
              Вчера
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="todayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4A574" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#D4A574" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="yesterdayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#795548" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#795548" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
            <XAxis dataKey="hour" tick={{ fill: "#795548", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#795548", fontSize: 12 }}
              tickFormatter={(v: number) => fmtShort(v)}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatPrice(value),
                name === "today" ? "Сегодня" : "Вчера",
              ]}
              {...TOOLTIP_STYLE}
            />
            <Area
              type="monotone"
              dataKey="yesterday"
              stroke="#795548"
              strokeOpacity={0.4}
              strokeWidth={2}
              fill="url(#yesterdayGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="today"
              stroke="#D4A574"
              strokeWidth={2.5}
              fill="url(#todayGrad)"
              dot={{ r: 3, fill: "#D4A574" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
