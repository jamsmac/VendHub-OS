"use client";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Banknote,
  Receipt,
} from "lucide-react";
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
  PieChart as RPieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KPICard } from "./KPICard";
import { fmt, fmtShort } from "./config";

interface OverviewTabProps {
  financialSummary: {
    totalRevenue: number;
    revenueGrowth: number;
    totalExpenses: number;
    expenseGrowth: number;
    netProfit: number;
    profitMargin: number;
    pendingPayments: number;
    cashOnHand: number;
    accountsReceivable: number;
  };
  revenueByDay: Array<{
    date: string;
    income: number;
    expense: number;
  }>;
  expenseCategories: Array<{
    name: string;
    amount: number;
    color: string;
  }>;
  profitTrend: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  fiscalData: {
    provider: string;
    terminalId: string;
    status: "active" | "offline";
    todayReceipts: number;
    todayAmount: number;
    lastReceipt: string;
    monthReceipts: number;
    monthAmount: number;
  };
}

export function OverviewTab({
  financialSummary,
  revenueByDay,
  expenseCategories,
  profitTrend,
  fiscalData,
}: OverviewTabProps) {
  return (
    <>
      {/* KPI 6 cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard
          label="Выручка"
          value={financialSummary.totalRevenue}
          change={financialSummary.revenueGrowth}
          icon={TrendingUp}
          bg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KPICard
          label="Расходы"
          value={financialSummary.totalExpenses}
          change={financialSummary.expenseGrowth}
          icon={TrendingDown}
          bg="bg-red-50"
          iconColor="text-red-500"
        />
        <KPICard
          label="Чистая прибыль"
          value={financialSummary.netProfit}
          change={financialSummary.profitMargin}
          icon={Wallet}
          bg="bg-espresso-50"
          iconColor="text-espresso"
          suffix="% margin"
        />
        <KPICard
          label="Ожидают"
          value={financialSummary.pendingPayments}
          icon={Clock}
          bg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KPICard
          label="Касса"
          value={financialSummary.cashOnHand}
          icon={Banknote}
          bg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KPICard
          label="Дебиторка"
          value={financialSummary.accountsReceivable}
          icon={Receipt}
          bg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Income/Expense bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Доходы и расходы</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
                <XAxis dataKey="date" stroke="#92400e" fontSize={12} />
                <YAxis
                  stroke="#92400e"
                  fontSize={12}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                />
                <Tooltip formatter={(v: number) => [`${fmt(v)} UZS`]} />
                <Bar
                  dataKey="income"
                  name="Доход"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expense"
                  name="Расход"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense pie + channels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Структура расходов</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <RPieChart>
                <Pie
                  data={expenseCategories}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="amount"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${percent}%`}
                  labelLine={false}
                  fontSize={9}
                >
                  {expenseCategories.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${fmt(v)} UZS`]} />
              </RPieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {expenseCategories.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </span>
                  <span className="text-espresso-light">
                    {fmtShort(cat.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profit trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Тренд прибыли (6 мес)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={profitTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
              <XAxis dataKey="month" stroke="#92400e" fontSize={12} />
              <YAxis
                stroke="#92400e"
                fontSize={12}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
              />
              <Tooltip formatter={(v: number) => [`${fmt(v)} UZS`]} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Выручка"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Расходы"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Прибыль"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Unit economics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Юнит-экономика</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Выручка на автомат",
                value: 52_953_000,
                subtext: "в месяц (16 машин)",
              },
              { label: "Стоимость товара", value: 8_936, subtext: "на чашку" },
              { label: "Средний чек", value: 19_600, subtext: "UZS" },
              { label: "Прибыль на сделку", value: 12_340, subtext: "UZS" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-espresso/10 p-4"
              >
                <p className="text-xs text-espresso-light">{item.label}</p>
                <p className="mt-1 text-xl font-bold text-espresso-dark">
                  {fmt(item.value)}
                </p>
                <p className="text-[11px] text-espresso-light/70">
                  {item.subtext}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Multikassa fiscal summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-espresso" /> Фискализация —{" "}
            {fiscalData.provider}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Терминал", value: fiscalData.terminalId },
              {
                label: "Статус",
                value:
                  fiscalData.status === "active" ? "🟢 Активен" : "🔴 Офлайн",
              },
              {
                label: "Чеков сегодня",
                value: String(fiscalData.todayReceipts),
              },
              {
                label: "Сумма сегодня",
                value: `${fmtShort(fiscalData.todayAmount)} UZS`,
              },
              { label: "Последний чек", value: fiscalData.lastReceipt },
              { label: "Синхронизация", value: "🟢 Синхронизировано" },
              { label: "Чеков за месяц", value: fmt(fiscalData.monthReceipts) },
              {
                label: "Оборот за месяц",
                value: `${fmtShort(fiscalData.monthAmount)} UZS`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg bg-espresso-50/50 p-3"
              >
                <p className="text-[11px] text-espresso-light">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-espresso-dark">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
