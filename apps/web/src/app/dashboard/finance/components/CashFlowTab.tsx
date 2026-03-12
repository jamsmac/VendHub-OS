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
import { useTranslations } from "next-intl";
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
  const t = useTranslations("finance");
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("cfCurrentBalance")}
            </p>
            <p className="mt-1 text-2xl font-bold text-espresso-dark">
              {fmtShort(currentCash)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">{t("cfOperating7d")}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              +{fmtShort(totalOperating)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">{t("cfInvesting7d")}</p>
            <p className="mt-1 text-2xl font-bold text-red-500">
              {fmtShort(totalInvesting)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">{t("cfRunwayMonths")}</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {runwayMonths}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Balance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("cfBalanceChart")}</CardTitle>
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
                name={t("cfBalance")}
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
            <CardTitle className="text-lg">
              {t("cfOperatingActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: t("cfSalesReceipts"), value: 59_350_000 },
                { label: t("cfSupplierPayments"), value: -18_450_000 },
                { label: t("cfSalary"), value: -12_200_000 },
                { label: t("cfRent"), value: -7_200_000 },
                { label: t("cfOtherPayments"), value: -4_150_000 },
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
                  {t("cfTotalOperating")}
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
              {t("cfInvestingActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: t("cfBuyMachines"), value: -8_500_000 },
                { label: t("cfRepairMaintenance"), value: -2_800_000 },
                { label: t("cfSoftware"), value: -450_000 },
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
                  {t("cfTotalInvesting")}
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
          <CardTitle className="text-lg">{t("cfFinancingActivity")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: t("cfBorrowing"), value: 5_000_000 },
              { label: t("cfLoanRepayment"), value: -2_500_000 },
              { label: t("cfEquityInvestment"), value: 0 },
              { label: t("cfDividends"), value: 0 },
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
                {t("cfTotalFinancing")}
              </span>
              <span className="font-bold text-emerald-600">+2 500 000 UZS</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Burn Rate & Runway */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("cfLiquidityForecast")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-espresso/10 p-4">
              <p className="text-xs text-espresso-light">
                {t("cfMonthlyBurnRate")}
              </p>
              <p className="mt-1 text-2xl font-bold text-red-500">
                {fmtShort(monthlyBurn)} UZS
              </p>
              <p className="mt-1 text-[11px] text-espresso-light">
                {t("cfInvestingExpenses")}
              </p>
            </div>
            <div className="rounded-lg border border-espresso/10 p-4">
              <p className="text-xs text-espresso-light">
                {t("cfRunwayMonths")}
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {runwayMonths}
              </p>
              <p className="mt-1 text-[11px] text-espresso-light">
                {t("cfAtCurrentBurnRate")}
              </p>
            </div>
            <div className="rounded-lg border border-espresso/10 p-4">
              <p className="text-xs text-espresso-light">{t("cfScenario")}</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">
                {"🟢 " + t("cfHealthy")}
              </p>
              <p className="mt-1 text-[11px] text-espresso-light">
                {t("cfSufficientFunds")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
