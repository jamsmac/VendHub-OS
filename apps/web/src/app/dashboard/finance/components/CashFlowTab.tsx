"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fmt, fmtShort } from "./config";

interface CashFlowTabProps {
  cashFlowData: Array<{
    month: string;
    operating: number;
    investing: number;
    cumulative: number;
  }>;
  currentCash: number;
  totalOperating: number;
  totalInvesting: number;
  monthlyBurn: number;
  runwayMonths: string | number;
}

export function CashFlowTab({
  cashFlowData,
  currentCash,
  totalOperating,
  totalInvesting,
  monthlyBurn,
  runwayMonths,
}: CashFlowTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Текущий баланс</p>
            <p className="mt-1 text-2xl font-bold text-espresso-dark">
              {fmtShort(currentCash)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              Операционный CF (7 дн)
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              +{fmtShort(totalOperating)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              Инвестиционный CF (7 дн)
            </p>
            <p className="mt-1 text-2xl font-bold text-red-500">
              {fmtShort(totalInvesting)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Runway (месяцев)</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {runwayMonths}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Balance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Остаток на счёте (30 дней)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d0" />
              <XAxis dataKey="date" stroke="#92400e" fontSize={11} />
              <YAxis
                stroke="#92400e"
                fontSize={11}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
              />
              <Tooltip formatter={(v: number) => [`${fmt(v)} UZS`]} />
              <Line
                type="monotone"
                dataKey="balance"
                name="Баланс"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cash Flow Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Операционная деятельность</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Поступления от продаж", value: 59_350_000 },
                { label: "Платежи поставщикам", value: -18_450_000 },
                { label: "Зарплата", value: -12_200_000 },
                { label: "Аренда", value: -7_200_000 },
                { label: "Прочие платежи", value: -4_150_000 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2 border-b border-espresso/5"
                >
                  <span className="text-sm text-espresso">{item.label}</span>
                  <span
                    className={`font-medium ${item.value >= 0 ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {item.value >= 0 ? "+" : ""}
                    {fmt(item.value)} UZS
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 border-t-2 border-espresso-dark">
                <span className="text-sm font-semibold text-espresso-dark">
                  Итого операционный CF
                </span>
                <span className="font-bold text-emerald-600">
                  +{fmt(totalOperating)} UZS
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Инвестиционная деятельность
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Покупка новых автоматов", value: -8_500_000 },
                { label: "Ремонт и обслуживание", value: -2_800_000 },
                { label: "Программное обеспечение", value: -450_000 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2 border-b border-espresso/5"
                >
                  <span className="text-sm text-espresso">{item.label}</span>
                  <span className="font-medium text-red-500">
                    {fmt(item.value)} UZS
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 border-t-2 border-espresso-dark">
                <span className="text-sm font-semibold text-espresso-dark">
                  Итого инвестиционный CF
                </span>
                <span className="font-bold text-red-500">
                  {fmt(totalInvesting)} UZS
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financing Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Финансовая деятельность</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Заимствование (кредиты)", value: 5_000_000 },
              { label: "Возврат кредитов", value: -2_500_000 },
              { label: "Инвестиции в уставный капитал", value: 0 },
              { label: "Дивиденды", value: 0 },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-espresso/5"
              >
                <span className="text-sm text-espresso">{item.label}</span>
                <span
                  className={`font-medium ${item.value >= 0 ? "text-emerald-600" : "text-red-500"}`}
                >
                  {item.value >= 0 ? "+" : ""}
                  {fmt(item.value)} UZS
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 border-t-2 border-espresso-dark">
              <span className="text-sm font-semibold text-espresso-dark">
                Итого финансовый CF
              </span>
              <span className="font-bold text-emerald-600">+2 500 000 UZS</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Burn Rate & Runway */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Прогноз ликвидности</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-espresso/10 p-4">
              <p className="text-xs text-espresso-light">Месячный burn rate</p>
              <p className="mt-1 text-2xl font-bold text-red-500">
                {fmtShort(monthlyBurn)} UZS
              </p>
              <p className="mt-1 text-[11px] text-espresso-light">
                инвестиционные траты
              </p>
            </div>
            <div className="rounded-lg border border-espresso/10 p-4">
              <p className="text-xs text-espresso-light">Runway (месяцев)</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {runwayMonths}
              </p>
              <p className="mt-1 text-[11px] text-espresso-light">
                при текущем burn rate
              </p>
            </div>
            <div className="rounded-lg border border-espresso/10 p-4">
              <p className="text-xs text-espresso-light">Сценарий</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">
                🟢 Здоров
              </p>
              <p className="mt-1 text-[11px] text-espresso-light">
                достаточно средств
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
