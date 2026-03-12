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
import { fmt } from "./config";

interface FiscalReportItem {
  date: string;
  issued: number;
  successful: number;
  failed: number;
  amount: number;
  nds: number;
}

interface FiscalizationTabProps {
  fiscalData: {
    terminalId: string;
    lastReceipt: string;
  };
  fiscalReportData: FiscalReportItem[];
  totalFiscalReceipts: number;
  totalFiscalSuccessful: number;
  totalFiscalFailed: number;
  totalTaxAmount: number;
}

export function FiscalizationTab({
  fiscalData,
  fiscalReportData,
  totalFiscalReceipts,
  totalFiscalSuccessful,
  totalFiscalFailed,
  totalTaxAmount,
}: FiscalizationTabProps) {
  const t = useTranslations("finance");

  return (
    <>
      {/* Multikassa Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("fiscTabMultikassaStatus")}
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-600">
              {"🟢 " + t("fiscTabActive")}
            </p>
            <p className="text-[11px] text-espresso-light/70">
              {t("fiscTabSynced")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("fiscTabTerminalId")}
            </p>
            <p className="mt-1 text-lg font-bold text-espresso-dark">
              {fiscalData.terminalId}
            </p>
            <p className="text-[11px] text-espresso-light/70">
              {t("fiscTabActiveLabel")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("fiscTabLastReceipt")}
            </p>
            <p className="mt-1 text-sm font-bold text-espresso-dark">
              {fiscalData.lastReceipt}
            </p>
            <p className="text-[11px] text-espresso-light/70">
              {t("fiscTabSuccessful")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">
              {t("fiscTabVatCollected")}
            </p>
            <p className="mt-1 text-lg font-bold text-blue-600">
              {fmt(totalTaxAmount)} UZS
            </p>
            <p className="text-[11px] text-espresso-light/70">
              {t("fiscTabForPeriod")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fiscal Receipt Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("fiscTabReceiptStats")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-espresso/10">
                <span className="text-sm text-espresso">
                  {t("fiscTabReceiptsIssued")}
                </span>
                <span className="text-lg font-bold text-espresso-dark">
                  {fmt(totalFiscalReceipts)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-espresso/10">
                <span className="text-sm text-emerald-600">
                  {t("fiscTabSuccess")}
                </span>
                <span className="text-lg font-bold text-emerald-600">
                  {fmt(totalFiscalSuccessful)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-espresso/10">
                <span className="text-sm text-red-500">
                  {t("fiscTabError")}
                </span>
                <span className="text-lg font-bold text-red-500">
                  {totalFiscalFailed}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-t-2 border-espresso-dark">
                <span className="text-sm font-semibold text-espresso-dark">
                  {t("fiscTabSuccessRate")}
                </span>
                <span className="text-lg font-bold text-emerald-600">
                  {(
                    (totalFiscalSuccessful / totalFiscalReceipts) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("fiscTabAmountByStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fiscalReportData.map((f) => (
                <div key={f.date} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-espresso-dark">
                      {f.date}
                    </span>
                    <span className="text-sm text-espresso-light">
                      {f.issued} {t("fiscTabReceipts")}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div
                      className="flex-1 h-2 rounded-full bg-emerald-500"
                      style={{ width: `${(f.successful / f.issued) * 100}%` }}
                    />
                    <div
                      className="flex-1 h-2 rounded-full bg-red-500"
                      style={{ width: `${(f.failed / f.issued) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-espresso-light">
                    {fmt(f.amount)} UZS
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Fiscal Report Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("fiscTabDailyReport")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-espresso/10">
                  {[
                    t("fiscTabColDate"),
                    t("fiscTabColIssued"),
                    t("fiscTabColSuccessful"),
                    t("fiscTabColErrors"),
                    t("fiscTabColSuccessRate"),
                    t("fiscTabColAmount"),
                    t("fiscTabColVat"),
                  ].map((h, i) => (
                    <TableHead
                      key={h}
                      className={`px-4 py-3 text-xs font-medium text-espresso-light ${[1, 2, 3, 5, 6].includes(i) ? "text-right" : "text-left"}`}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fiscalReportData.map((f) => {
                  const successRate = ((f.successful / f.issued) * 100).toFixed(
                    1,
                  );
                  return (
                    <TableRow
                      key={f.date}
                      className="border-b border-espresso/5 hover:bg-espresso-50/50 transition-colors"
                    >
                      <TableCell className="px-4 py-3 font-medium text-espresso-dark">
                        {f.date}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-espresso-dark">
                        {f.issued}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {f.successful}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-red-500 font-medium">
                        {f.failed}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {successRate}%
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-medium text-espresso-dark">
                        {fmt(f.amount)} UZS
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-blue-600 font-medium">
                        {fmt(f.nds)} UZS
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tax Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("fiscTabTaxSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-espresso/10 p-4">
              <p className="text-xs text-espresso-light">
                {t("fiscTabTaxableBase")}
              </p>
              <p className="mt-1 text-2xl font-bold text-espresso-dark">
                547.2M UZS
              </p>
              <p className="mt-1 text-[11px] text-espresso-light/70">
                {t("fiscTabGoodsAndServices")}
              </p>
            </div>
            <div className="rounded-lg border border-espresso/10 p-4">
              <p className="text-xs text-espresso-light">
                {t("fiscTabVatPayable")}
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                {fmt(totalTaxAmount)} UZS
              </p>
              <p className="mt-1 text-[11px] text-espresso-light/70">
                {t("fiscTabQuarterlyReport")}
              </p>
            </div>
            <div className="rounded-lg border border-espresso/10 p-4">
              <p className="text-xs text-espresso-light">
                {t("fiscTabAmountDue")}
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {fmt(Math.round(totalTaxAmount))} UZS
              </p>
              <p className="mt-1 text-[11px] text-espresso-light/70">
                {t("fiscTabDueBy15th")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
