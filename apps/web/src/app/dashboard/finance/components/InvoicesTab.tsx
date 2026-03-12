"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  Printer,
  Send,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { StatusBadge } from "./StatusBadge";
import { fmt } from "./config";
import { Invoice } from "./types";

interface InvoicesTabProps {
  filteredInvoices: Invoice[];
  invoiceFilter: string;
  onFilterChange: (filter: string) => void;
}

export function InvoicesTab({
  filteredInvoices,
  invoiceFilter,
  onFilterChange,
}: InvoicesTabProps) {
  const t = useTranslations("finance");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("invTitle")}</CardTitle>
          <div className="flex gap-2">
            <div className="flex gap-1">
              {["all", "incoming", "outgoing", "pending", "overdue"].map(
                (f) => (
                  <Button
                    key={f}
                    variant="ghost"
                    size="sm"
                    onClick={() => onFilterChange(f)}
                    className={`${invoiceFilter === f ? "bg-espresso text-white hover:bg-espresso-dark" : "bg-espresso-50 text-espresso-light"}`}
                  >
                    {f === "all"
                      ? t("invAll")
                      : f === "incoming"
                        ? t("invIncoming")
                        : f === "outgoing"
                          ? t("invOutgoing")
                          : f === "pending"
                            ? t("invPending")
                            : t("invOverdue")}
                  </Button>
                ),
              )}
            </div>
            <Button className="gap-2 bg-espresso hover:bg-espresso-dark">
              <FileText className="h-4 w-4" />
              {t("invCreate")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-lg border border-espresso/10 p-4 hover:bg-espresso-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-lg p-2 ${inv.type === "incoming" ? "bg-red-50" : "bg-emerald-50"}`}
                >
                  {inv.type === "incoming" ? (
                    <ArrowDownLeft className="h-5 w-5 text-red-500" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-emerald-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-espresso-dark">
                      {inv.id}
                    </p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-espresso-light">
                    {inv.counterparty} · {inv.description}
                  </p>
                  <p className="text-[11px] text-espresso-light/70">
                    {t("invDueDate")} {inv.dueDate} · {inv.items}{" "}
                    {t("invItems")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p
                  className={`text-sm font-bold ${inv.type === "incoming" ? "text-red-500" : "text-emerald-600"}`}
                >
                  {inv.type === "incoming" ? "−" : "+"}
                  {fmt(inv.amount)} UZS
                </p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
