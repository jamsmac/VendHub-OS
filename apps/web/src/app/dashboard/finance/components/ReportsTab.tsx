"use client";

import {
  TrendingUp,
  ArrowLeftRight,
  Clock,
  Building,
  Receipt,
  Scale,
  Download,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReportsTab() {
  const reports = [
    {
      title: "P&L (Прибыль/Убыток)",
      desc: "Ежемесячный отчёт прибылей и убытков",
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600",
      format: "XLSX / PDF",
    },
    {
      title: "Cash Flow",
      desc: "Движение денежных средств за период",
      icon: ArrowLeftRight,
      color: "bg-blue-50 text-blue-600",
      format: "XLSX / PDF",
    },
    {
      title: "Дебиторская задолженность",
      desc: "Aging report — просрочки по контрагентам",
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      format: "XLSX",
    },
    {
      title: "Налоговая отчётность",
      desc: "НДС, налог на прибыль, ЕНП",
      icon: Building,
      color: "bg-purple-50 text-purple-600",
      format: "XML / PDF",
    },
    {
      title: "Фискальный отчёт",
      desc: "Отчёт по чекам Multikassa",
      icon: Receipt,
      color: "bg-cyan-50 text-cyan-600",
      format: "XLSX / PDF",
    },
    {
      title: "Сверка платёжных систем",
      desc: "Payme, Click, Uzum — ежедневный реконсайл",
      icon: Scale,
      color: "bg-red-50 text-red-500",
      format: "XLSX",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.title}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-2.5 ${report.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-espresso-dark">
                      {report.title}
                    </h3>
                    <p className="mt-1 text-xs text-espresso-light">
                      {report.desc}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-espresso-light/70">
                        {report.format}
                      </span>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-3.5 w-3.5" /> Скачать
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick report settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Автоматические отчёты</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                name: "Ежедневная сводка",
                schedule: "Каждый день в 09:00",
                recipients: "owner@vendhub.uz",
                enabled: true,
              },
              {
                name: "Еженедельный P&L",
                schedule: "Каждый понедельник в 10:00",
                recipients: "cfo@vendhub.uz",
                enabled: true,
              },
              {
                name: "Месячный отчёт",
                schedule: "1-го числа каждого месяца",
                recipients: "team@vendhub.uz",
                enabled: true,
              },
              {
                name: "Сверка платежей",
                schedule: "Каждый день в 23:00",
                recipients: "finance@vendhub.uz",
                enabled: false,
              },
            ].map((auto) => (
              <div
                key={auto.name}
                className="flex items-center justify-between rounded-lg border border-espresso/10 p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${auto.enabled ? "bg-emerald-500" : "bg-espresso-light/30"}`}
                  />
                  <div>
                    <p className="text-sm font-medium text-espresso-dark">
                      {auto.name}
                    </p>
                    <p className="text-xs text-espresso-light">
                      {auto.schedule} → {auto.recipients}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Настроить
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
