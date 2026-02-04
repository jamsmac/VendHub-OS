'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Route,
  Search,
  Filter,
  MoreVertical,
  Plus,
  Eye,
  Trash2,
  Copy,
  Zap,
  MapPin,
  Ruler,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { routesApi } from '@/lib/api';
import Link from 'next/link';

interface RouteItem {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'inactive';
  stops?: any[];
  stopsCount?: number;
  totalDistanceKm?: number;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Черновик', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  active: { label: 'Активен', color: 'text-green-600', bgColor: 'bg-green-100' },
  inactive: { label: 'Неактивен', color: 'text-red-600', bgColor: 'bg-red-100' },
};

function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function RouteCardSkeleton() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function RoutesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; action: () => void } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: routes, isLoading, isError } = useQuery({
    queryKey: ['routes', debouncedSearch, statusFilter],
    queryFn: () =>
      routesApi.getAll({ search: debouncedSearch, status: statusFilter }).then((res) => res.data.data || res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: routesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Маршрут удалён');
    },
    onError: () => {
      toast.error('Не удалось удалить маршрут');
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: routesApi.optimize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Маршрут оптимизирован');
    },
    onError: () => {
      toast.error('Не удалось оптимизировать маршрут');
    },
  });

  const routeList: RouteItem[] = Array.isArray(routes) ? routes : [];

  const stats = useMemo(() => ({
    total: routeList.length,
    active: routeList.filter((r: RouteItem) => r.status === 'active').length,
    totalStops: routeList.reduce(
      (acc: number, r: RouteItem) => acc + (r.stopsCount || r.stops?.length || 0),
      0
    ),
    avgStops: routeList.length > 0
      ? Math.round(
          routeList.reduce(
            (acc: number, r: RouteItem) => acc + (r.stopsCount || r.stops?.length || 0),
            0
          ) / routeList.length
        )
      : 0,
  }), [routeList]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить список маршрутов</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['routes'] })}>
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
          <h1 className="text-3xl font-bold">Маршруты</h1>
          <p className="text-muted-foreground">Управление маршрутами обслуживания</p>
        </div>
        <Link href="/dashboard/routes/builder">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Создать маршрут
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Всего</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Route className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Активных</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Остановок</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalStops}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ср. остановок</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.avgStops}</p>
                  </div>
                  <Ruler className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Поиск маршрутов"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter ? statusConfig[statusFilter]?.label : 'Все статусы'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>
              Все статусы
            </DropdownMenuItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Route List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <RouteCardSkeleton key={i} />)}
        </div>
      ) : routeList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Route className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Маршруты не найдены</p>
            <p className="text-muted-foreground mb-4">Создайте первый маршрут</p>
            <Link href="/dashboard/routes/builder">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Создать маршрут
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {routeList.map((route: RouteItem) => {
            const status = statusConfig[route.status] || statusConfig.draft;
            const stopsCount = route.stopsCount || route.stops?.length || 0;

            return (
              <Card key={route.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Route className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{route.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {route.description && (
                            <span className="max-w-[300px] truncate">{route.description}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {stopsCount} остановок
                          </span>
                          {route.totalDistanceKm != null && (
                            <span className="flex items-center gap-1">
                              <Ruler className="h-3 w-3" />
                              {route.totalDistanceKm.toFixed(1)} км
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Действия">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/dashboard/routes/${route.id}`}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Просмотр
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem
                            disabled={optimizeMutation.isPending}
                            onClick={() => optimizeMutation.mutate(route.id)}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Оптимизировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                const res = await routesApi.getById(route.id);
                                const orig = res.data;
                                await routesApi.create({
                                  name: `${orig.name} (копия)`,
                                  description: orig.description,
                                });
                                queryClient.invalidateQueries({ queryKey: ['routes'] });
                                toast.success('Маршрут дублирован');
                              } catch {
                                toast.error('Не удалось дублировать маршрут');
                              }
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Дублировать
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => setConfirmState({ title: 'Удалить маршрут?', action: () => deleteMutation.mutate(route.id) })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => { if (!open) setConfirmState(null); }}
        title={confirmState?.title ?? ''}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
