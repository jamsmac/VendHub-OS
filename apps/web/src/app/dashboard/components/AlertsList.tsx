"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { useDashboardAlerts } from "@/lib/hooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils";
import { ALERTS, ALERT_STYLES } from "./constants";

export function AlertsList() {
  const t = useTranslations("dashboardMain");
  const { data: dashboardAlerts } = useDashboardAlerts();

  const alertsList =
    dashboardAlerts && dashboardAlerts.length > 0 ? dashboardAlerts : ALERTS;
  const errCount = alertsList.filter(
    (a: unknown) => (a as { type?: string }).type === "error",
  ).length;
  const warnCount = alertsList.filter(
    (a: unknown) => (a as { type?: string }).type === "warning",
  ).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{t("alerts.title")}</CardTitle>
          <div className="flex gap-1">
            {errCount > 0 && (
              <Badge variant="destructive">
                {t("alerts.critical", { count: errCount })}
              </Badge>
            )}
            {warnCount > 0 && (
              <Badge variant="warning">
                {t("alerts.warnings", { count: warnCount })}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alertsList.slice(0, 4).map((alert: unknown) => {
            const a = alert as {
              id?: string;
              type?: string;
              title?: string;
              message?: string;
              createdAt?: string;
            };
            const style = ALERT_STYLES[a.type as keyof typeof ALERT_STYLES];
            const Icon = style.icon;
            return (
              <div
                key={a.id}
                className={`flex items-start gap-2.5 rounded-lg border-l-4 ${style.border} ${style.bg} p-2.5`}
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.text}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${style.text} truncate`}>
                    {a.title}
                  </p>
                  <p className="text-xs text-espresso-light mt-0.5 truncate">
                    {a.message}
                  </p>
                </div>
                <span className="text-xs text-espresso-light whitespace-nowrap shrink-0">
                  {timeAgo(a.createdAt || "")}
                </span>
              </div>
            );
          })}
        </div>
        {alertsList.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-caramel-dark text-xs"
          >
            {t("alerts.moreAlerts", { count: alertsList.length - 4 })}{" "}
            <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
