"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Coffee,
  Calendar,
  Download,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reportsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface SalesData {
  date: string;
  revenue: number;
  transactions: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

interface TopMachine {
  machineId: string;
  machineName: string;
  revenue: number;
  transactions: number;
}

type PeriodType = "today" | "week" | "month" | "quarter" | "year" | "custom";

function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-64 flex items-end justify-between gap-1">
      {Array.from({ length: 14 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t"
          style={{ height: `${20 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-6" />
          <Skeleton className="h-5 w-48 flex-1" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const t = useTranslations("reports");
  const [period, setPeriod] = useState<PeriodType>("month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const queryClient = useQueryClient();

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
    isFetching,
  } = useQuery({
    queryKey: ["reports", "dashboard", period],
    queryFn: () => reportsApi.getDashboard().then((res) => res.data),
  });

  const {
    data: sales,
    isLoading: salesLoading,
    isError: salesError,
  } = useQuery({
    queryKey: ["reports", "sales", period, startDate, endDate],
    queryFn: () =>
      reportsApi
        .getSales({ period, startDate, endDate })
        .then((res) => res.data),
  });

  const periodLabels: Record<PeriodType, string> = {
    today: t("periodToday"),
    week: t("periodWeek"),
    month: t("periodMonth"),
    quarter: t("periodQuarter"),
    year: t("periodYear"),
    custom: t("periodCustom"),
  };

  const totals = useMemo(
    () => ({
      revenue: dashboard?.totalRevenue || 0,
      transactions: dashboard?.totalTransactions || 0,
      averageCheck: dashboard?.averageCheck || 0,
      revenueChange: dashboard?.revenueChange || 0,
    }),
    [dashboard],
  );

  const isLoading = dashboardLoading || salesLoading;
  const isError = dashboardError || salesError;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">{t("loadError")}</p>
        <p className="text-muted-foreground mb-4">
          {t("loadErrorDescription")}
        </p>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["reports"] })
          }
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={isFetching}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["reports"] });
              toast.success(t("refreshed"));
            }}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success(t("exportNotReady"))}
          >
            <Download className="h-4 w-4 mr-2" />
            {t("export")}
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex gap-4 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              {periodLabels[period]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.entries(periodLabels).map(([key, label]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => setPeriod(key as PeriodType)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {period === "custom" && (
          <>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
              aria-label={t("dateStart")}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
              aria-label={t("dateEnd")}
            />
          </>
        )}
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("revenue")}
                    </p>
                    <p className="text-2xl font-bold">{totals.revenue} ₛ</p>
                    <div
                      className={`flex items-center gap-1 text-sm ${totals.revenueChange >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {totals.revenueChange >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span>
                        {t("vsPreviousPeriod", {
                          value: Math.abs(totals.revenueChange),
                        })}
                      </span>
                    </div>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("transactionsCount")}
                    </p>
                    <p className="text-2xl font-bold">{totals.transactions}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("averageCheck")}
                    </p>
                    <p className="text-2xl font-bold">
                      {totals.averageCheck} ₛ
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("activeMachines")}
                    </p>
                    <p className="text-2xl font-bold">
                      {dashboard?.activeMachines || 0}
                    </p>
                  </div>
                  <Coffee className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("salesDynamics")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : sales?.chartData?.length > 0 ? (
              <div className="h-64">
                <div className="flex items-end justify-between h-full gap-1">
                  {sales.chartData
                    .slice(-14)
                    .map((item: SalesData, index: number) => {
                      const maxRevenue = Math.max(
                        ...sales.chartData.map((d: SalesData) => d.revenue),
                      );
                      const height =
                        maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                      return (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center"
                        >
                          <div
                            className="w-full bg-primary rounded-t"
                            style={{ height: `${height}%` }}
                            title={`${formatDate(item.date)}: ${item.revenue} ₛ`}
                          />
                          <span className="text-xs text-muted-foreground mt-1 rotate-45 origin-left">
                            {new Date(item.date).getDate()}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                {t("noDataForPeriod")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("topProducts")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : sales?.topProducts?.length > 0 ? (
              <div className="space-y-4">
                {sales.topProducts
                  .slice(0, 5)
                  .map((product: TopProduct, index: number) => (
                    <div
                      key={product.productId}
                      className="flex items-center gap-4"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {product.productName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t("pcsUnit", { count: product.quantity })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{product.revenue} ₛ</p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("noData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Machines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            {t("topMachinesByRevenue")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : sales?.topMachines?.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t("columnNumber")}
                    </TableHead>
                    <TableHead className="text-left py-3 px-4 font-medium text-muted-foreground">
                      {t("columnMachine")}
                    </TableHead>
                    <TableHead className="text-right py-3 px-4 font-medium text-muted-foreground">
                      {t("columnTransactions")}
                    </TableHead>
                    <TableHead className="text-right py-3 px-4 font-medium text-muted-foreground">
                      {t("columnRevenue")}
                    </TableHead>
                    <TableHead className="text-right py-3 px-4 font-medium text-muted-foreground">
                      {t("columnAvgCheck")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.topMachines
                    .slice(0, 10)
                    .map((machine: TopMachine, index: number) => (
                      <TableRow
                        key={machine.machineId}
                        className="border-b hover:bg-muted/50"
                      >
                        <TableCell className="py-3 px-4 font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Coffee className="h-4 w-4 text-muted-foreground" />
                            <span>{machine.machineName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          {machine.transactions}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-medium">
                          {machine.revenue} ₛ
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right text-muted-foreground">
                          {machine.transactions > 0
                            ? Math.round(machine.revenue / machine.transactions)
                            : 0}{" "}
                          ₛ
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("noDataForPeriod")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Reports */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">{t("salesReport")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("salesReportDescription")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">{t("warehouseReport")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("warehouseReportDescription")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">{t("employeesReport")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("employeesReportDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
