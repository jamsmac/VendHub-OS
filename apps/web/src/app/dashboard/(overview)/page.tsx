'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Cpu,
  CheckCircle2,
  Clock,
} from 'lucide-react';
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
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { reportsApi } from '@/lib/api';

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
    status: 'completed' | 'pending' | 'failed';
  }[];
}

// ---------------------------------------------------------------------------
// Mock chart data generators (used until real API endpoints exist)
// ---------------------------------------------------------------------------

function generateRevenueTrend(): { date: string; revenue: number }[] {
  const data: { date: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      revenue: Math.round(1_000_000 + Math.random() * 4_000_000),
    });
  }
  return data;
}

function generatePaymentMethods(): { name: string; value: number }[] {
  return [
    { name: 'Payme', value: 42 },
    { name: 'Click', value: 28 },
    { name: 'Uzum', value: 15 },
    { name: 'Наличные', value: 10 },
    { name: 'Другое', value: 5 },
  ];
}

function generateTopMachines(): { name: string; revenue: number }[] {
  return [
    { name: 'КМ-001 Чиланзар', revenue: 4_850_000 },
    { name: 'КМ-005 Сергели', revenue: 3_720_000 },
    { name: 'КМ-012 М.Улугбек', revenue: 3_150_000 },
    { name: 'КМ-008 Юнусабад', revenue: 2_980_000 },
    { name: 'КМ-003 Яккасарай', revenue: 2_540_000 },
  ];
}

function generateRecentTransactions(): DashboardData['recentTransactions'] {
  return [
    { id: '1', time: '10:32', type: 'Payme', machineName: 'КМ-001 Чиланзар', amount: 35_000, status: 'completed' },
    { id: '2', time: '10:28', type: 'Click', machineName: 'КМ-005 Сергели', amount: 28_000, status: 'completed' },
    { id: '3', time: '10:21', type: 'Наличные', machineName: 'КМ-012 М.Улугбек', amount: 42_000, status: 'pending' },
    { id: '4', time: '10:15', type: 'Uzum', machineName: 'КМ-003 Яккасарай', amount: 15_000, status: 'completed' },
    { id: '5', time: '10:09', type: 'Payme', machineName: 'КМ-008 Юнусабад', amount: 56_000, status: 'completed' },
  ];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#6b7280'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUZS(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' сум';
}

function formatShortUZS(amount: number): string {
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(0) + 'K';
  }
  return String(amount);
}

// ---------------------------------------------------------------------------
// Custom Recharts Tooltip
// ---------------------------------------------------------------------------

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-blue-500">{formatUZS(payload[0].value)}</p>
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium">{payload[0].name}</p>
      <p className="text-sm">{payload[0].value}%</p>
    </div>
  );
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm text-blue-500">{formatUZS(payload[0].value)}</p>
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

function ChangeIndicator({ value, suffix = 'vs вчера' }: { value: number; suffix?: string }) {
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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="success">Выполнен</Badge>;
    case 'pending':
      return <Badge variant="warning">Ожидает</Badge>;
    case 'failed':
      return <Badge variant="destructive">Ошибка</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardOverviewPage() {
  // Fetch real dashboard data from API
  const { data: apiResponse, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.getDashboard(),
    select: (res) => res.data as DashboardData | undefined,
  });

  // Chart data (memoised; will be replaced with real API data later)
  const revenueTrend = useMemo(() => generateRevenueTrend(), []);
  const paymentMethods = useMemo(() => generatePaymentMethods(), []);
  const topMachines = useMemo(() => generateTopMachines(), []);

  // Merge API response with fallback mock values so the page always renders
  const dashboard = useMemo<DashboardData>(() => {
    if (apiResponse) return apiResponse;
    return {
      revenue: { today: 4_850_000, yesterday: 4_320_000, changePercent: 12.3 },
      transactions: { today: 156, yesterday: 142, changePercent: 9.9 },
      machines: { total: 45, active: 38 },
      tasks: { completedToday: 14 },
      recentTransactions: generateRecentTransactions(),
    };
  }, [apiResponse]);

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-7 w-36 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* KPI row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>

        {/* Chart row 1 */}
        <ChartSkeleton height={300} />

        {/* Chart row 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton height={250} />
          <ChartSkeleton height={250} />
        </div>

        {/* Table skeleton */}
        <ChartSkeleton height={200} />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Rendered dashboard
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Обзор</h1>
        <p className="text-muted-foreground">
          Добро пожаловать в VendHub! Вот сводка по вашему бизнесу.
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Row 1 -- KPI Cards                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Выручка сегодня</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUZS(dashboard.revenue.today)}</div>
            <ChangeIndicator value={dashboard.revenue.changePercent} />
          </CardContent>
        </Card>

        {/* Transactions today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Транзакции</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.transactions.today}</div>
            <ChangeIndicator value={dashboard.transactions.changePercent} />
          </CardContent>
        </Card>

        {/* Active machines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Активные автоматы</CardTitle>
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
              {Math.round((dashboard.machines.active / dashboard.machines.total) * 100)}% онлайн
            </p>
          </CardContent>
        </Card>

        {/* Tasks completed today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Задачи выполнены</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.tasks.completedToday}</div>
            <p className="text-xs text-muted-foreground">за сегодня</p>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Row 2 -- Revenue Trend (30 days)                                  */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Выручка за 30 дней</CardTitle>
          <CardDescription>Ежедневный тренд выручки в UZS</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
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
              <Tooltip content={<RevenueTooltip />} />
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
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Row 3 -- Pie (payment methods) + Horizontal Bar (top machines)    */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment methods pie chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Способы оплаты</CardTitle>
            <CardDescription>Распределение по методам оплаты</CardDescription>
          </CardHeader>
          <CardContent>
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
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span className="text-xs text-muted-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top machines horizontal bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Топ автоматов по выручке</CardTitle>
            <CardDescription>5 лучших за текущий месяц</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={topMachines}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
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
                <Tooltip content={<BarTooltip />} />
                <Bar
                  dataKey="revenue"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Row 4 -- Recent Activity Table                                    */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Последние транзакции</CardTitle>
          <CardDescription>5 последних операций за сегодня</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Время</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Автомат</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.recentTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{tx.time}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{tx.type}</TableCell>
                  <TableCell className="text-sm font-medium">{tx.machineName}</TableCell>
                  <TableCell className="text-sm text-right">{formatUZS(tx.amount)}</TableCell>
                  <TableCell className="text-right">
                    <StatusBadge status={tx.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
