'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { reportsApi } from '@/lib/api';

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

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

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
        <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${20 + Math.random() * 60}%` }} />
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
  const [period, setPeriod] = useState<PeriodType>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: dashboardLoading, isError: dashboardError, isFetching } = useQuery({
    queryKey: ['reports', 'dashboard', period],
    queryFn: () => reportsApi.getDashboard().then((res) => res.data.data),
  });

  const { data: sales, isLoading: salesLoading, isError: salesError } = useQuery({
    queryKey: ['reports', 'sales', period, startDate, endDate],
    queryFn: () =>
      reportsApi.getSales({ period, startDate, endDate }).then((res) => res.data.data),
  });

  const periodLabels: Record<PeriodType, string> = {
    today: 'Сегодня',
    week: 'Неделя',
    month: 'Месяц',
    quarter: 'Квартал',
    year: 'Год',
    custom: 'Произвольный',
  };

  const totals = useMemo(() => ({
    revenue: dashboard?.totalRevenue || 0,
    transactions: dashboard?.totalTransactions || 0,
    averageCheck: dashboard?.averageCheck || 0,
    revenueChange: dashboard?.revenueChange || 0,
  }), [dashboard]);

  const isLoading = dashboardLoading || salesLoading;
  const isError = dashboardError || salesError;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить данные отчётов</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['reports'] })}>
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Отчёты</h1>
          <p className="text-muted-foreground">
            Аналитика и статистика продаж
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={isFetching}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['reports'] });
              toast.success('Данные обновлены');
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.success('Экспорт будет доступен в следующей версии')}
          >
            <Download className="h-4 w-4 mr-2" />
            Экспорт
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

        {period === 'custom' && (
          <>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
              aria-label="Дата начала"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
              aria-label="Дата окончания"
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
                    <p className="text-sm text-muted-foreground">Выручка</p>
                    <p className="text-2xl font-bold">
                      {totals.revenue.toLocaleString()} ₛ
                    </p>
                    <div className={`flex items-center gap-1 text-sm ${totals.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {totals.revenueChange >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span>{Math.abs(totals.revenueChange)}% vs прошлый период</span>
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
                    <p className="text-sm text-muted-foreground">Транзакций</p>
                    <p className="text-2xl font-bold">{totals.transactions.toLocaleString()}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Средний чек</p>
                    <p className="text-2xl font-bold">{totals.averageCheck.toLocaleString()} ₛ</p>
                  </div>
                  <Package className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Активных автоматов</p>
                    <p className="text-2xl font-bold">{dashboard?.activeMachines || 0}</p>
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
              Динамика продаж
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <ChartSkeleton />
            ) : sales?.chartData?.length > 0 ? (
              <div className="h-64">
                <div className="flex items-end justify-between h-full gap-1">
                  {sales.chartData.slice(-14).map((item: SalesData, index: number) => {
                    const maxRevenue = Math.max(...sales.chartData.map((d: SalesData) => d.revenue));
                    const height = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-primary rounded-t"
                          style={{ height: `${height}%` }}
                          title={`${new Date(item.date).toLocaleDateString('ru-RU')}: ${item.revenue.toLocaleString()} ₛ`}
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
                Нет данных за выбранный период
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Топ товаров
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : sales?.topProducts?.length > 0 ? (
              <div className="space-y-4">
                {sales.topProducts.slice(0, 5).map((product: TopProduct, index: number) => (
                  <div key={product.productId} className="flex items-center gap-4">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.quantity} шт
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{product.revenue.toLocaleString()} ₛ</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Нет данных
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
            Топ автоматов по выручке
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : sales?.topMachines?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Автомат</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Транзакций</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Выручка</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ср. чек</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.topMachines.slice(0, 10).map((machine: TopMachine, index: number) => (
                    <tr key={machine.machineId} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Coffee className="h-4 w-4 text-muted-foreground" />
                          <span>{machine.machineName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">{machine.transactions}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {machine.revenue.toLocaleString()} ₛ
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {machine.transactions > 0
                          ? Math.round(machine.revenue / machine.transactions).toLocaleString()
                          : 0} ₛ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Нет данных за выбранный период
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
              <h3 className="font-medium">Отчёт по продажам</h3>
              <p className="text-sm text-muted-foreground">Детальная аналитика</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">Отчёт по складу</h3>
              <p className="text-sm text-muted-foreground">Остатки и движения</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">Отчёт по сотрудникам</h3>
              <p className="text-sm text-muted-foreground">Эффективность работы</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
