"use client";

import { RefreshCw, Scale } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { fmt } from "./config";
import { ReconciliationItem } from "./types";

interface ReconciliationTabProps {
  reconciliationItems: ReconciliationItem[];
  matchedCount: number;
  discrepancyCount: number;
  totalDifference: number;
}

export function ReconciliationTab({
  reconciliationItems,
  matchedCount,
  discrepancyCount,
  totalDifference,
}: ReconciliationTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Всего проверок</p>
            <p className="mt-1 text-2xl font-bold text-espresso-dark">
              {reconciliationItems.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Сверено</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {matchedCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Расхождения</p>
            <p className="mt-1 text-2xl font-bold text-red-500">
              {discrepancyCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Разница</p>
            <p
              className={`mt-1 text-2xl font-bold ${totalDifference < 0 ? "text-red-500" : "text-emerald-600"}`}
            >
              {totalDifference < 0 ? "−" : "+"}
              {fmt(Math.abs(totalDifference))} UZS
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Сверка данных</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" /> Обновить
              </Button>
              <Button className="gap-2 bg-espresso hover:bg-espresso-dark">
                <Scale className="h-4 w-4" /> Новая сверка
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-espresso/10">
                  {[
                    "#",
                    "Источник",
                    "Дата",
                    "В системе",
                    "Фактически",
                    "Разница",
                    "Статус",
                  ].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-medium text-espresso-light ${["В системе", "Фактически", "Разница"].includes(h) ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reconciliationItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-espresso/5 hover:bg-espresso-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-espresso-light">
                      {item.id}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-espresso-dark">
                      {item.source}
                    </td>
                    <td className="px-4 py-3 text-xs text-espresso-light">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-espresso-dark">
                      {fmt(item.systemAmount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-espresso-dark">
                      {fmt(item.actualAmount)}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-medium ${item.difference === 0 ? "text-espresso-light" : "text-red-500"}`}
                    >
                      {item.difference === 0
                        ? "—"
                        : `${item.difference < 0 ? "−" : "+"}${fmt(Math.abs(item.difference))}`}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
