"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Coffee,
  Package,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

export default function DashboardPage() {
  const t = useTranslations("dashboardRoot");

  const { data: dashData, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/analytics/dashboard").then((res) => res.data),
  });

  // Map from API response { latestStats } to dashboard display
  const stats = dashData?.latestStats || dashData;

  const totalMachines =
    (stats?.activeMachinesCount ?? 0) + (stats?.offlineMachinesCount ?? 0);

  const statCards = [
    {
      title: t("totalMachines"),
      value: totalMachines || stats?.totalMachines || 0,
      icon: Coffee,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: t("activeMachines"),
      value: stats?.activeMachinesCount ?? stats?.activeMachines ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: t("todaySales"),
      value: stats?.totalSalesCount ?? stats?.todaySales ?? 0,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: t("todayRevenue"),
      value: formatPrice(stats?.totalRevenue ?? stats?.todayRevenue ?? 0),
      icon: Package,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      title: t("lowStock"),
      value: stats?.lowStockAlerts || 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
    {
      title: t("pendingTasks"),
      value: stats?.pendingTasks || 0,
      icon: ClipboardList,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("recentTasks")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {t("noActiveTasks")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("machineMap")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="/dashboard/map"
              className="flex h-48 items-center justify-center rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="text-center">
                <MapPin className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">
                  {t("openMap", { fallback: "Open machine map" })}
                </p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
