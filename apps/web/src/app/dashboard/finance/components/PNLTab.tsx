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
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("finance");
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("pnlTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-espresso/10">
                  <TableHead className="px-4 py-3 text-left font-medium text-espresso-dark">
                    {t("pnlIndicator")}
                  </TableHead>
                  {pAndLData.map((p) => (
                    <TableHead
                      key={p.month}
                      className="px-4 py-3 text-right font-medium text-espresso-dark"
                    >
                      {p.month}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    key: "revenue",
                    label: t("pnlRevenue"),
                    format: "currency",
                  },
                  { key: "cogs", label: t("pnlCogs"), format: "currency" },
                  {
                    key: "grossProfit",
                    label: t("pnlGrossProfit"),
                    format: "currency",
                    bold: true,
                  },
                  {
                    key: "opex",
                    label: t("pnlOpex"),
                    format: "currency",
                  },
                  {
                    key: "ebitda",
                    label: t("pnlEbitda"),
                    format: "currency",
                    bold: true,
                  },
                  {
                    key: "depreciation",
                    label: t("pnlDepreciation"),
                    format: "currency",
                  },
                  {
                    key: "netProfit",
                    label: t("pnlNetProfit"),
                    format: "currency",
                    bold: true,
                  },
                ].map((row) => (
                  <TableRow
                    key={row.key}
                    className={`border-b border-espresso/5 ${row.bold ? "bg-espresso-50/50" : ""}`}
                  >
                    <TableCell
                      className={`px-4 py-3 ${row.bold ? "font-semibold text-espresso-dark" : "text-espresso"}`}
                    >
                      {row.label}
                    </TableCell>
                    {pAndLData.map((p) => {
                      const val = p[row.key as keyof typeof p];
                      return (
                        <TableCell
                          key={p.month}
                          className={`px-4 py-3 text-right ${row.bold ? "font-semibold text-espresso-dark" : "text-espresso-light"}`}
                        >
                          {typeof val === "number" ? fmt(val) : val} UZS
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Margin % and Changes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("pnlMargin")}</CardTitle>
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
                  name={t("pnlMarginLabel")}
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
            <CardTitle className="text-lg">{t("pnlDynamics")}</CardTitle>
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
                      {t("pnlMomYoy")}
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
          <CardTitle className="text-lg">{t("pnlTrend")}</CardTitle>
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
                name={t("pnlRevenue")}
                fill="#10b981"
                stroke="#10b981"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cogs"
                name={t("pnlCogs")}
                fill="#f59e0b"
                stroke="#f59e0b"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="netProfit"
                name={t("pnlNetProfit")}
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
