"use client";

import { Search, Download, Eye } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "./StatusBadge";
import { PAYMENT_METHODS, fmt } from "./config";
import { Transaction } from "./types";

interface TransactionsTabProps {
  paymentMethodBreakdown: Array<{
    name: string;
    value: number;
    color: string;
    percent?: number;
  }>;
  dailyTransactionVolume: Array<{ date: string; volume: number }>;
  transactions: Transaction[];
  filteredTx: Transaction[];
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  txPage: number;
  onPageChange: (page: number) => void;
  txSlice: Transaction[];
  txTotalPages: number;
  totalIncome: number;
  totalExpense: number;
  totalTransactionValue: number;
  refundRate: number;
}

export function TransactionsTab({
  paymentMethodBreakdown,
  dailyTransactionVolume,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transactions,
  filteredTx,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  txPage,
  onPageChange,
  txSlice,
  txTotalPages,
  totalIncome,
  totalExpense,
  totalTransactionValue,
  refundRate,
}: TransactionsTabProps) {
  const t = useTranslations("financeTransactions");

  return (
    <>
      {/* Payment Method Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("paymentDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RPieChart>
                <Pie
                  data={paymentMethodBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${percent}%`}
                  labelLine={false}
                  fontSize={9}
                >
                  {paymentMethodBreakdown.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${fmt(v)} UZS`]} />
              </RPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("paymentStats")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentMethodBreakdown.map((pm) => (
                <div key={pm.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-espresso font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: pm.color }}
                      />
                      {pm.name}
                    </span>
                    <span className="text-espresso-dark font-medium">
                      {fmt(pm.value)} ({pm.percent}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Transaction Volume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("dailyVolume")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyTransactionVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
              <XAxis dataKey="date" stroke="#92400e" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="#92400e"
                fontSize={11}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#92400e"
                fontSize={11}
              />
              <Tooltip
                formatter={(v: number) => [`${fmt(v)} ${t("perReceipt")}`]}
              />
              <Bar
                yAxisId="left"
                dataKey="amount"
                name={t("chartAmount")}
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="count"
                name={t("chartReceipts")}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Transaction Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">{t("avgReceipt")}</p>
            <p className="mt-1 text-2xl font-bold text-espresso-dark">
              {fmt(Math.round(totalTransactionValue / 445))} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">{t("refundRate")}</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {refundRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">{t("throughput")}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {t("receiptsPerDay", { count: 421 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">
                {t("transactionsTitle")}
              </CardTitle>
              <div className="flex gap-2 text-xs">
                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700">
                  +{fmt(totalIncome)} UZS
                </span>
                <span className="rounded-lg bg-red-50 px-2 py-1 text-red-700">
                  −{fmt(totalExpense)} UZS
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-light" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                  }}
                  className="pl-10 w-64"
                />
              </div>
              <div className="flex gap-1">
                {["all", "income", "expense"].map((f) => (
                  <Button
                    key={f}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onTypeFilterChange(f);
                    }}
                    className={`${typeFilter === f ? "bg-espresso text-white hover:bg-espresso-dark" : "bg-espresso-50 text-espresso-light hover:bg-espresso-100"}`}
                  >
                    {f === "all"
                      ? t("all")
                      : f === "income"
                        ? t("income")
                        : t("expense")}
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" /> Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-espresso/10">
                  {[
                    "ID",
                    t("colDate"),
                    t("colType"),
                    t("colCategory"),
                    t("colDescription"),
                    t("colAmount"),
                    t("colPayment"),
                    t("colStatus"),
                    "",
                  ].map((h, i) => (
                    <TableHead
                      key={h || i}
                      className={`px-3 py-3 text-xs font-medium text-espresso-light ${i === 5 ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {txSlice.map((tx) => {
                  const pm = PAYMENT_METHODS[tx.payment];
                  return (
                    <TableRow
                      key={tx.id}
                      className="border-b border-espresso/5 hover:bg-espresso-50/50 transition-colors"
                    >
                      <TableCell className="px-3 py-3 text-sm font-medium text-espresso-dark">
                        {tx.id}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-xs text-espresso-light whitespace-nowrap">
                        {tx.date}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}
                        >
                          {tx.type === "income" ? "↑" : "↓"}
                          {tx.type === "income"
                            ? t("incomeType")
                            : t("expenseType")}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm text-espresso">
                        {tx.category}
                      </TableCell>
                      <TableCell className="px-3 py-3 text-sm text-espresso-light max-w-[200px] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell
                        className={`px-3 py-3 text-sm font-medium text-right whitespace-nowrap ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {tx.type === "income" ? "+" : "−"}
                        {fmt(tx.amount)} UZS
                      </TableCell>
                      <TableCell className="px-3 py-3 text-xs text-espresso-light">
                        {pm?.label || tx.payment}
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3.5 w-3.5 text-espresso-light" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-espresso-light">
              {t("paginationText", {
                count: filteredTx.length,
                page: txPage,
                total: txTotalPages,
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={txPage <= 1}
                onClick={() => onPageChange(txPage - 1)}
              >
                {t("prevPage")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={txPage >= txTotalPages}
                onClick={() => onPageChange(txPage + 1)}
              >
                {t("nextPage")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
