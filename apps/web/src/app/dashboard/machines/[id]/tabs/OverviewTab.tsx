"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Coffee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface OverviewTabProps {
  machineId: string;
  machine: Record<string, unknown>;
}

function formatUZS(amount: number): string {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(amount)) + " UZS";
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function OverviewTab({ machineId, machine }: OverviewTabProps) {
  // Orders for this machine
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ["machine-orders-stats", machineId],
    queryFn: async () => {
      const res = await api.get(`/orders`, {
        params: { machineId, limit: 1000 },
      });
      const raw = res.data;
      const items: Record<string, unknown>[] =
        raw?.data?.data ?? raw?.data ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  // Collections for this machine
  const { data: collectionsData } = useQuery({
    queryKey: ["machine-collections", machineId],
    queryFn: async () => {
      const res = await api.get(`/collections`, {
        params: { machineId, limit: 5 },
      });
      const raw = res.data;
      const items = raw?.data?.data ?? raw?.data ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  // Tasks for this machine
  const { data: tasksData } = useQuery({
    queryKey: ["machine-tasks-overview", machineId],
    queryFn: async () => {
      const res = await api.get(`/tasks`, {
        params: { machineId, limit: 100 },
      });
      const raw = res.data;
      const items = raw?.data?.data ?? raw?.data ?? [];
      return Array.isArray(items) ? items : [];
    },
  });

  // Compute stats from orders
  const orders = ordersData ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const ordersToday = orders.filter(
    (o: Record<string, unknown>) =>
      String(o.createdAt ?? o.created_at ?? "").slice(0, 10) === today,
  );
  const ordersWeek = orders.filter(
    (o: Record<string, unknown>) =>
      String(o.createdAt ?? o.created_at ?? "").slice(0, 10) >= weekAgo,
  );
  const ordersMonth = orders.filter(
    (o: Record<string, unknown>) =>
      String(o.createdAt ?? o.created_at ?? "").slice(0, 10) >= monthAgo,
  );

  const sumAmount = (list: Record<string, unknown>[]) =>
    list.reduce(
      (sum, o) =>
        sum + Number(o.totalAmount ?? o.total_amount ?? o.amount ?? 0),
      0,
    );

  const revenueToday = sumAmount(ordersToday);
  const revenueWeek = sumAmount(ordersWeek);
  const revenueMonth = sumAmount(ordersMonth);
  const salesToday = ordersToday.length;
  const salesWeek = ordersWeek.length;
  const avgCheck = salesWeek > 0 ? revenueWeek / salesWeek : 0;

  // Top products (from all orders)
  const productCounts: Record<
    string,
    { name: string; count: number; revenue: number }
  > = {};
  orders.forEach((o: Record<string, unknown>) => {
    const name = String(o.productName ?? o.product_name ?? "Неизвестно");
    const amount = Number(o.totalAmount ?? o.total_amount ?? o.amount ?? 0);
    if (!productCounts[name])
      productCounts[name] = { name, count: 0, revenue: 0 };
    productCounts[name].count++;
    productCounts[name].revenue += amount;
  });
  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Last collection
  const collections = collectionsData ?? [];
  const lastCollection = collections[0] as Record<string, unknown> | undefined;

  // Active tasks
  const tasks = tasksData ?? [];
  const activeTasks = tasks.filter(
    (t: Record<string, unknown>) =>
      t.status === "pending" || t.status === "in_progress",
  );
  const overdueTasks = activeTasks.filter(
    (t: Record<string, unknown>) =>
      t.dueDate && new Date(String(t.dueDate)) < new Date(),
  );

  if (ordersLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Key metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Выручка сегодня</p>
                <p className="text-2xl font-bold">{formatUZS(revenueToday)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Неделя: {formatUZS(revenueWeek)}
                </p>
              </div>
              <Banknote className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Продажи сегодня</p>
                <p className="text-2xl font-bold">{salesToday}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Неделя: {salesWeek}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Средний чек</p>
                <p className="text-2xl font-bold">{formatUZS(avgCheck)}</p>
                <p className="text-xs text-muted-foreground mt-1">за 7 дней</p>
              </div>
              <Receipt className="h-8 w-8 text-violet-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Выручка за месяц
                </p>
                <p className="text-2xl font-bold">{formatUZS(revenueMonth)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ordersMonth.length} заказов
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Info + Top Products + Status */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Machine info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Автомат
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Coffee className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{String(machine.name)}</p>
                <p className="text-xs text-muted-foreground">
                  #{String(machine.machineNumber)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Тип</p>
                <p className="capitalize font-medium">
                  {String(machine.type ?? "—")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Статус</p>
                <Badge
                  variant={
                    machine.status === "active" ? "default" : "secondary"
                  }
                >
                  {String(machine.status)}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Адрес</p>
                <p className="font-medium">
                  {String(machine.address ?? "Не указан")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Топ продукты
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-4">
                        {i + 1}.
                      </span>
                      <span className="truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-muted-foreground text-xs">
                        {p.count} шт
                      </span>
                      <span className="font-medium">
                        {formatUZS(p.revenue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Статус
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Last collection */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  Последняя инкассация
                </p>
                <p className="text-sm font-medium">
                  {lastCollection
                    ? `${formatUZS(Number(lastCollection.totalAmount ?? lastCollection.total_amount ?? 0))} · ${formatDate(String(lastCollection.collectedAt ?? lastCollection.collected_at ?? ""))}`
                    : "Нет данных"}
                </p>
              </div>
            </div>

            {/* Last refill */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  Последняя загрузка
                </p>
                <p className="text-sm font-medium">
                  {formatDate(machine.lastRefillDate as string | undefined)}
                </p>
              </div>
            </div>

            {/* Active tasks */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              {overdueTasks.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Задачи</p>
                <p className="text-sm font-medium">
                  {activeTasks.length > 0
                    ? `${activeTasks.length} активных${overdueTasks.length > 0 ? `, ${overdueTasks.length} просрочено` : ""}`
                    : "Нет активных"}
                </p>
              </div>
            </div>

            {/* Uptime */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">В работе с</p>
                <p className="text-sm font-medium">
                  {formatDate(machine.createdAt as string | undefined)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
