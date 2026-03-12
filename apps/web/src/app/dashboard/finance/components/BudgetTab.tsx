"use client";

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
  const t = useTranslations("finance");
  return (
    <>
      {/* Budget Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">{t("budBudget")}</p>
            <p className="mt-1 text-2xl font-bold text-espresso-dark">
              {fmtShort(totalBudget)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">{t("budSpent")}</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {fmtShort(totalActual)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">{t("budRemaining")}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              +{fmtShort(totalVariance)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("budAvgUtilization")}
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {avgUtilization}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("budVsActual")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-espresso/10">
                  <TableHead className="px-4 py-3 text-left font-medium text-espresso-dark">
                    {t("budColCategory")}
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right font-medium text-espresso-dark">
                    {t("budColBudget")}
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right font-medium text-espresso-dark">
                    {t("budColSpent")}
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right font-medium text-espresso-dark">
                    {t("budColDifference")}
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right font-medium text-espresso-dark">
                    {t("budColUtilization")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetData.map((b) => {
                  const variance = b.budget - b.actual;
                  const isOver = variance < 0;
                  return (
                    <TableRow
                      key={b.category}
                      className="border-b border-espresso/5 hover:bg-espresso-50/50 transition-colors"
                    >
                      <TableCell className="px-4 py-3 font-medium text-espresso-dark">
                        {b.category}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-espresso-light">
                        {fmt(b.budget)} UZS
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-espresso-dark font-medium">
                        {fmt(b.actual)} UZS
                      </TableCell>
                      <TableCell
                        className={`px-4 py-3 text-right font-medium ${isOver ? "text-red-500" : "text-emerald-600"}`}
                      >
                        {isOver ? "−" : "+"}
                        {fmt(Math.abs(variance))}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${b.utilization > 95 ? "bg-red-50 text-red-600" : b.utilization > 85 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}
                        >
                          {b.utilization}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
