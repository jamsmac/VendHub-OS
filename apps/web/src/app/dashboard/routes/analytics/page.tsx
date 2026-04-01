"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  TrendingUp,
  Users,
  Truck,
  AlertTriangle,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { AxiosResponse } from "axios";

function getDateRange(period: string) {
  const to = new Date();
  const from = new Date();
  switch (period) {
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    default:
      from.setDate(from.getDate() - 30);
  }
  return {
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
  };
}

function KpiCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <div
                className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? "text-green-600" : "text-red-600"}`}
              >
                {isPositive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(change)}%
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function RouteAnalyticsPage() {
  const t = useTranslations("routes");
  const [period, setPeriod] = useState("30d");
  const { dateFrom, dateTo } = getDateRange(period);

  const { data: mainData, isLoading: mainLoading } = useQuery({
    queryKey: ["route-analytics", "main", period],
    queryFn: () =>
      api
        .get("/routes/analytics/main", { params: { dateFrom, dateTo } })
        .then((r: AxiosResponse) => r.data),
  });

  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ["route-analytics", "employees", period],
    queryFn: () =>
      api
        .get("/routes/analytics/employees", { params: { dateFrom, dateTo } })
        .then((r: AxiosResponse) => r.data),
  });

  const { data: vehicleData, isLoading: vehicleLoading } = useQuery({
    queryKey: ["route-analytics", "vehicles", period],
    queryFn: () =>
      api
        .get("/routes/analytics/vehicles", { params: { dateFrom, dateTo } })
        .then((r: AxiosResponse) => r.data),
  });

  const { data: anomalyData, isLoading: anomalyLoading } = useQuery({
    queryKey: ["route-analytics", "anomalies", period],
    queryFn: () =>
      api
        .get("/routes/analytics/anomalies", { params: { dateFrom, dateTo } })
        .then((r: AxiosResponse) => r.data),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t("analyticsTitle") === "analyticsTitle"
              ? "Route Analytics"
              : t("analyticsTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("analyticsSubtitle") === "analyticsSubtitle"
              ? "Performance metrics and insights for routes"
              : t("analyticsSubtitle")}
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 days</SelectItem>
            <SelectItem value="30d">30 days</SelectItem>
            <SelectItem value="90d">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {mainLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard
              title="Total Routes"
              value={mainData?.totalRoutes ?? 0}
              change={mainData?.changePercent?.routes}
              icon={BarChart3}
            />
            <KpiCard
              title="Total Distance (km)"
              value={
                mainData?.totalDistance
                  ? Math.round(mainData.totalDistance / 1000)
                  : 0
              }
              change={mainData?.changePercent?.distance}
              icon={MapPin}
            />
            <KpiCard
              title="Avg Distance (km)"
              value={
                mainData?.avgRouteDistance
                  ? Math.round(mainData.avgRouteDistance / 1000)
                  : 0
              }
              icon={TrendingUp}
            />
            <KpiCard
              title="Anomalies"
              value={mainData?.totalAnomalies ?? 0}
              change={mainData?.changePercent?.anomalies}
              icon={AlertTriangle}
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="vehicles">
            <Truck className="h-4 w-4 mr-2" />
            Vehicles
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Anomalies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employee Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {employeeLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(employeeData) ? employeeData : []).map(
                    (emp: {
                      operatorId: string;
                      routeCount: number;
                      totalDistance: number;
                      totalAnomalies: number;
                    }) => (
                      <div
                        key={emp.operatorId}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {emp.operatorId.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {emp.routeCount} routes
                          </p>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <span>{Math.round(emp.totalDistance / 1000)} km</span>
                          {emp.totalAnomalies > 0 && (
                            <span className="text-red-600">
                              {emp.totalAnomalies} anomalies
                            </span>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                  {Array.isArray(employeeData) && employeeData.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No data for this period
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vehicles">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Usage</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicleLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(vehicleData) ? vehicleData : []).map(
                    (v: {
                      vehicleId: string;
                      routeCount: number;
                      totalDistance: number;
                      totalStops: number;
                    }) => (
                      <div
                        key={v.vehicleId}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {v.vehicleId.slice(0, 8)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {v.routeCount} routes, {v.totalStops} stops
                          </p>
                        </div>
                        <span className="text-sm">
                          {Math.round(v.totalDistance / 1000)} km
                        </span>
                      </div>
                    ),
                  )}
                  {Array.isArray(vehicleData) && vehicleData.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No data for this period
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies">
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {anomalyLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {anomalyData?.byType && (
                    <div>
                      <p className="text-sm font-medium mb-2">By Type</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(
                          anomalyData.byType as Record<string, number>,
                        ).map(([type, count]) => (
                          <div
                            key={type}
                            className="flex justify-between bg-muted rounded px-3 py-2 text-sm"
                          >
                            <span>{type.replace(/_/g, " ")}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {anomalyData?.bySeverity && (
                    <div>
                      <p className="text-sm font-medium mb-2">By Severity</p>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(
                          anomalyData.bySeverity as Record<string, number>,
                        ).map(([sev, count]) => (
                          <div
                            key={sev}
                            className={`flex justify-between rounded px-3 py-2 text-sm ${
                              sev === "critical"
                                ? "bg-red-100 text-red-800"
                                : sev === "warning"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            <span>{sev}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!anomalyData?.byType && !anomalyData?.bySeverity && (
                    <p className="text-center text-muted-foreground py-8">
                      No anomalies for this period
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
