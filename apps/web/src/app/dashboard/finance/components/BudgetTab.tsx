"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fmt, fmtShort } from "./config";
import { BudgetItem } from "./types";

interface BudgetTabProps {
  budgetData: BudgetItem[];
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  avgUtilization: string;
}

export function BudgetTab({
  budgetData,
  totalBudget,
  totalActual,
  totalVariance,
  avgUtilization,
}: BudgetTabProps) {
  return (
    <>
      {/* Budget Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Бюджет</p>
            <p className="mt-1 text-2xl font-bold text-espresso-dark">
              {fmtShort(totalBudget)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Потрачено</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {fmtShort(totalActual)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Остаток</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              +{fmtShort(totalVariance)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Ср. утилизация</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {avgUtilization}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Бюджет vs Факт</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-espresso/10">
                  <th className="px-4 py-3 text-left font-medium text-espresso-dark">
                    Категория
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-espresso-dark">
                    Бюджет
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-espresso-dark">
                    Потрачено
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-espresso-dark">
                    Разница
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-espresso-dark">
                    Утилизация
                  </th>
                </tr>
              </thead>
              <tbody>
                {budgetData.map((b) => {
                  const variance = b.budget - b.actual;
                  const isOver = variance < 0;
                  return (
                    <tr
                      key={b.category}
                      className="border-b border-espresso/5 hover:bg-espresso-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-espresso-dark">
                        {b.category}
                      </td>
                      <td className="px-4 py-3 text-right text-espresso-light">
                        {fmt(b.budget)} UZS
                      </td>
                      <td className="px-4 py-3 text-right text-espresso-dark font-medium">
                        {fmt(b.actual)} UZS
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${isOver ? "text-red-500" : "text-emerald-600"}`}
                      >
                        {isOver ? "−" : "+"}
                        {fmt(Math.abs(variance))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${b.utilization > 95 ? "bg-red-50 text-red-600" : b.utilization > 85 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
                        >
                          {b.utilization}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Budget Utilization Progress */}
      <div className="grid grid-cols-1 gap-4">
        {budgetData.map((b) => {
          const variance = b.budget - b.actual;
          const isOver = variance < 0;
          return (
            <Card key={b.category}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-espresso-dark">
                      {b.category}
                    </span>
                    <span
                      className={`text-sm font-bold ${isOver ? "text-red-500" : "text-emerald-600"}`}
                    >
                      {isOver ? "−" : "+"}
                      {fmt(Math.abs(variance))} UZS
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-espresso-100">
                    <div
                      className={`h-full rounded-full ${isOver ? "bg-red-500" : b.utilization > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(b.utilization, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-espresso-light">
                    <span>
                      {fmt(b.actual)} / {fmt(b.budget)} UZS
                    </span>
                    <span>{b.utilization}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
