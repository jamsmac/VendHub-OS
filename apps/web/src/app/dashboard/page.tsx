'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Coffee,
  Package,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/reports/dashboard').then((res) => res.data),
  });

  const statCards = [
    {
      title: 'Всего автоматов',
      value: stats?.totalMachines || 0,
      icon: Coffee,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Активные',
      value: stats?.activeMachines || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Продажи сегодня',
      value: stats?.todaySales || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      title: 'Выручка сегодня',
      value: `${(stats?.todayRevenue || 0).toLocaleString()} UZS`,
      icon: Package,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      title: 'Низкий запас',
      value: stats?.lowStockAlerts || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      title: 'Задач в работе',
      value: stats?.pendingTasks || 0,
      icon: ClipboardList,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Панель управления</h1>
        <p className="text-muted-foreground">
          Обзор системы VendHub
        </p>
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
                {isLoading ? '...' : stat.value}
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
              Последние задачи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Нет активных задач
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Карта автоматов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                Карта загружается...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
