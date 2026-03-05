"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fmt } from "./config";

interface PNLTabProps {
  pAndLData: Array<{
    month: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    opex: number;
    ebitda: number;
    depreciation: number;
    netProfit: number;
    margin: number;
    momChange: number;
    yoyChange: number;
  }>;
}

export function PNLTab({ pAndLData }: PNLTabProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Прибыль и убытки (P&L)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-espresso/10">
                  <th className="px-4 py-3 text-left font-medium text-espresso-dark">
                    Показатель
                  </th>
                  {pAndLData.map((p) => (
                    <th
                      key={p.month}
                      className="px-4 py-3 text-right font-medium text-espresso-dark"
                    >
                      {p.month}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: "revenue", label: "Выручка", format: "currency" },
                  { key: "cogs", label: "Себестоимость", format: "currency" },
                  {
                    key: "grossProfit",
                    label: "Валовая прибыль",
                    format: "currency",
                    bold: true,
                  },
                  {
                    key: "opex",
                    label: "Операционные расходы",
                    format: "currency",
                  },
                  {
                    key: "ebitda",
                    label: "EBITDA",
                    format: "currency",
                    bold: true,
                  },
                  {
                    key: "depreciation",
                    label: "Амортизация",
                    format: "currency",
                  },
                  {
                    key: "netProfit",
                    label: "Чистая прибыль",
                    format: "currency",
                    bold: true,
                  },
                ].map((row) => (
                  <tr
                    key={row.key}
                    className={`border-b border-espresso/5 ${row.bold ? "bg-espresso-50/50" : ""}`}
                  >
                    <td
                      className={`px-4 py-3 ${row.bold ? "font-semibold text-espresso-dark" : "text-espresso"}`}
                    >
                      {row.label}
                    </td>
                    {pAndLData.map((p) => {
                      const val = p[row.key as keyof typeof p];
                      return (
                        <td
                          key={p.month}
                          className={`px-4 py-3 text-right ${row.bold ? "font-semibold text-espresso-dark" : "text-espresso-light"}`}
                        >
                          {typeof val === "number" ? fmt(val) : val} UZS
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Margin % and Changes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Маржинальность (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={pAndLData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                <XAxis dataKey="month" stroke="#92400e" fontSize={11} />
                <YAxis stroke="#92400e" fontSize={11} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`]} />
                <Line
                  type="monotone"
                  dataKey="margin"
                  name="Маржа %"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Динамика изменений</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pAndLData.map((p) => (
                <div key={p.month} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-espresso-dark">
                      {p.month}
                    </span>
                    <span className="text-xs text-espresso-light">
                      MoM / YoY
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className={`h-2 flex-1 rounded-full ${p.momChange >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ width: `${Math.abs(p.momChange)}%` }}
                      />
                      <span
                        className={`text-xs font-medium ${p.momChange >= 0 ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {p.momChange >= 0 ? "+" : ""}
                        {p.momChange.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className={`h-2 flex-1 rounded-full ${p.yoyChange >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ width: `${Math.abs(p.yoyChange)}%` }}
                      />
                      <span
                        className={`text-xs font-medium ${p.yoyChange >= 0 ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {p.yoyChange >= 0 ? "+" : ""}
                        {p.yoyChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Тренд P&L (выручка, расходы, прибыль)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={pAndLData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
              <XAxis dataKey="month" stroke="#92400e" fontSize={11} />
              <YAxis
                stroke="#92400e"
                fontSize={11}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
              />
              <Tooltip formatter={(v: number) => [`${fmt(v)} UZS`]} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Выручка"
                fill="#10b981"
                stroke="#10b981"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cogs"
                name="Себестоимость"
                fill="#f59e0b"
                stroke="#f59e0b"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="netProfit"
                name="Чистая прибыль"
                fill="#3b82f6"
                stroke="#3b82f6"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
}
