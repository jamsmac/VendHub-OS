"use client";

import {
  CreditCard,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHODS, fmtShort } from "./config";
import { PaymentSystem } from "./types";

interface PaymentsTabProps {
  paymentSystems: PaymentSystem[];
  expandedPayment: string | null;
  onExpandChange: (id: string | null) => void;
}

export function PaymentsTab({
  paymentSystems,
  expandedPayment,
  onExpandChange,
}: PaymentsTabProps) {
  const totalBalance = paymentSystems.reduce((s, p) => s + p.balance, 0);
  const totalPending = paymentSystems.reduce((s, p) => s + p.pending, 0);
  const totalTxCount = paymentSystems.reduce((s, p) => s + p.txCount, 0);

  return (
    <>
      {/* Total balance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Общий баланс</p>
            <p className="mt-1 text-2xl font-bold text-espresso-dark">
              {fmtShort(totalBalance)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Ожидают зачисления</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {fmtShort(totalPending)} UZS
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-espresso-light">Транзакций сегодня</p>
            <p className="mt-1 text-2xl font-bold text-espresso-dark">
              {totalTxCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment systems cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paymentSystems.map((ps) => {
          const pm = PAYMENT_METHODS[ps.id];
          const Icon = pm?.icon || CreditCard;
          const isExpanded = expandedPayment === ps.id;
          return (
            <Card key={ps.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${pm?.color || "bg-gray-500"} text-white`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-espresso-dark">
                        {ps.name}
                      </p>
                      <p className="text-xs text-espresso-light">
                        {ps.txCount} транзакций
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={ps.status === "active" ? "success" : "destructive"}
                  >
                    {ps.status === "active" ? "Активен" : "Офлайн"}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-espresso-50/50 p-2">
                    <p className="text-[11px] text-espresso-light">Баланс</p>
                    <p className="text-sm font-bold text-espresso-dark">
                      {fmtShort(ps.balance)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50/50 p-2">
                    <p className="text-[11px] text-espresso-light">Ожидают</p>
                    <p className="text-sm font-bold text-amber-600">
                      {fmtShort(ps.pending)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onExpandChange(isExpanded ? null : ps.id)}
                  className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-espresso-light hover:text-espresso"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {isExpanded ? "Скрыть" : "Подробнее"}
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-espresso/10 pt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-espresso-light">
                        Оборот сегодня
                      </span>
                      <span className="text-espresso-dark font-medium">
                        {fmtShort(ps.todayVolume)} UZS
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-espresso-light">Комиссия</span>
                      <span className="text-espresso-dark font-medium">
                        {ps.id === "cash" ? "0%" : "1.5%"}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs gap-1"
                      >
                        <RefreshCw className="h-3 w-3" /> Синхронизация
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs gap-1"
                      >
                        <Download className="h-3 w-3" /> Выписка
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment channels bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Распределение по каналам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentSystems.map((ps) => {
              const total = paymentSystems.reduce(
                (s, p) => s + p.todayVolume,
                0,
              );
              const pct =
                total > 0 ? Math.round((ps.todayVolume / total) * 100) : 0;
              const pm = PAYMENT_METHODS[ps.id];
              return (
                <div key={ps.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-espresso">{ps.name}</span>
                    <span className="text-espresso-light">
                      {fmtShort(ps.todayVolume)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-espresso-100">
                    <div
                      className={`h-full rounded-full ${pm?.color || "bg-gray-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
