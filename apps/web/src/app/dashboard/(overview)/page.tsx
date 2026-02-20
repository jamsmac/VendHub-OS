"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Cpu,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { reportsApi } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardData {
  revenue: {
    today: number;
    yesterday: number;
    changePercent: number;
  };
  transactions: {
    today: number;
    yesterday: number;
    changePercent: number;
  };
  machines: {
    total: number;
    active: number;
  };
  tasks: {
    completedToday: number;
  };
  recentTransactions: {
    id: string;
    time: string;
    type: string;
    machineName: string;
    amount: number;
    status: "completed" | "pending" | "failed";
  }[];
}

// ---------------------------------------------------------------------------
// Empty data defaults (shown when API has not returned data yet)
// ---------------------------------------------------------------------------

const EMPTY_DASHBOARD: DashboardData = {
  revenue: { today: 0, yesterday: 0, changePercent: 0 },
  transactions: { today: 0, yesterday: 0, changePercent: 0 },
  machines: { total: 0, active: 0 },
  tasks: { completedToday: 0 },
  recentTransactions: [],
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIE_COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#6b7280"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUZS(amount: number, currencyLabel = "UZS"): string {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " " + currencyLabel;
}

function formatShortUZS(amount: number): string {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(0) + "K";
  }
  return String(amount);
}

// ---------------------------------------------------------------------------
// Custom Recharts Tooltip
// ---------------------------------------------------------------------------

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
  currencyLabel?: string;
}

function RevenueTooltip({
  active,
  payload,
  label,
  currencyLabel,
}: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-blue-500">
        {formatUZS(payload[0].value, currencyLabel)}
      </p>
    </div>
  );
}

function PieTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium">{payload[0].name}</p>
      <p className="text-sm">{payload[0].value}%</p>
    </div>
  );
}

function BarTooltip({ active, payload, label, currencyLabel }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-blue-500">
        {formatUZS(payload[0].value, currencyLabel)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function KPICardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Change indicator component
// ---------------------------------------------------------------------------

function ChangeIndicator({ value, suffix }: { value: number; suffix: string }) {
  const isPositive = value >= 0;
  return (
    <div className="flex items-center text-xs">
      {isPositive ? (
        <>
          <ArrowUpRight className="h-3 w-3 text-green-500" />
          <span className="text-green-500">+{value.toFixed(1)}%</span>
        </>
      ) : (
        <>
          <ArrowDownRight className="h-3 w-3 text-destructive" />
          <span className="text-destructive">{value.toFixed(1)}%</span>
        </>
      )}
      <span className="ml-1 text-muted-foreground">{suffix}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge for transactions
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  labels,
}: {
  status: string;
  labels: Record<string, string>;
}) {
  switch (status) {
    case "completed":
      return <Badge variant="success">{labels.completed}</Badge>;
    case "pending":
      return <Badge variant="warning">{labels.pending}</Badge>;
    case "failed":
      return <Badge variant="destructive">{labels.failed}</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardOverviewPage() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const currency = tCommon("currency");

  // Fetch real dashboard data from API
  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => reportsApi.getDashboard(),
    select: (res) => res.data as DashboardData | undefined,
  });

  // Use API data or empty defaults (no fake mock data)
  const dashboard = apiResponse ?? EMPTY_DASHBOARD;

  // Chart data from API response (empty arrays when no data)
  const apiData = (apiResponse ?? {}) as Record<string, unknown>;
  const revenueTrend: { date: string; revenue: number }[] =
    (apiData.revenueTrend as { date: string; revenue: number }[]) ?? [];
  const paymentMethods: { name: string; value: number }[] =
    (apiData.paymentMethods as { name: string; value: number }[]) ?? [];
  const topMachines: { name: string; revenue: number }[] =
    (apiData.topMachines as { name: string; revenue: number }[]) ?? [];

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-36 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
        <ChartSkeleton height={300} />
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton height={250} />
          <ChartSkeleton height={250} />
        </div>
        <ChartSkeleton height={200} />
      </div>
    );
  }

  const statusLabels = {
    completed: t("completed"),
    pending: t("pending"),
    failed: t("failed"),
  };

  // -----------------------------------------------------------------------
  // Rendered dashboard
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("welcome")}</p>
      </div>

      {/* Row 1 -- KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("revenueToday")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUZS(dashboard.revenue.today, currency)}
            </div>
            <ChangeIndicator
              value={dashboard.revenue.changePercent}
              suffix={t("vsYesterday")}
            />
          </CardContent>
        </Card>

        {/* Transactions today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("transactionsToday")}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.transactions.today}
            </div>
            <ChangeIndicator
              value={dashboard.transactions.changePercent}
              suffix={t("vsYesterday")}
            />
          </CardContent>
        </Card>

        {/* Active machines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("activeMachines")}
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.machines.active}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {dashboard.machines.total}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard.machines.total > 0
                ? Math.round(
                    (dashboard.machines.active / dashboard.machines.total) *
                      100,
                  )
                : 0}
              % {t("online")}
            </p>
          </CardContent>
        </Card>

        {/* Tasks completed today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("tasksCompleted")}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.tasks.completedToday}
            </div>
            <p className="text-xs text-muted-foreground">{t("today")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 -- Revenue Trend (30 days) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("revenue30Days")}</CardTitle>
          <CardDescription>{t("revenueTrend")}</CardDescription>
        </CardHeader>
        <CardContent>
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={revenueTrend}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={formatShortUZS}
                  width={50}
                />
                <Tooltip
                  content={<RevenueTooltip currencyLabel={currency} />}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  fill="url(#revenueGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              {t("noDataPeriod")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 3 -- Pie (payment methods) + Horizontal Bar (top machines) */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment methods pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("paymentMethods")}</CardTitle>
            <CardDescription>{t("paymentDistribution")}</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} ${value}%`}
                    labelLine={false}
                  >
                    {paymentMethods.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                {t("noDataPeriod")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top machines horizontal bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("topMachines")}</CardTitle>
            <CardDescription>{t("top5Month")}</CardDescription>
          </CardHeader>
          <CardContent>
            {topMachines.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={topMachines}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={formatShortUZS}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                    width={110}
                  />
                  <Tooltip content={<BarTooltip currencyLabel={currency} />} />
                  <Bar
                    dataKey="revenue"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                {t("noDataPeriod")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4 -- Recent Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("recentTransactions")}</CardTitle>
          <CardDescription>{t("last5Today")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("time")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("machine")}</TableHead>
                <TableHead className="text-right">{t("amount")}</TableHead>
                <TableHead className="text-right">{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.recentTransactions.length > 0 ? (
                dashboard.recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{tx.time}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{tx.type}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {tx.machineName}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {formatUZS(tx.amount, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={tx.status} labels={statusLabels} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    {t("noTransactionsToday")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
