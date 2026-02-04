'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Navigation,
  Search,
  Filter,
  MoreVertical,
  Clock,
  Play,
  Eye,
  Square,
  XCircle,
  AlertTriangle,
  CheckCircle2,

  MapPin,
  Radio,
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
import { tripsApi } from '@/lib/api';
import Link from 'next/link';

interface Trip {
  id: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  taskType?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName?: string;
  };
  vehicle?: {
    id: string;
    licensePlate?: string;
  };
  route?: {
    id: string;
    name: string;
  };
  stopsCount?: number;
  anomalyCount?: number;
  startedAt?: string;
  endedAt?: string;
  distanceKm?: number;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  planned: { label: 'Запланирован', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  active: { label: 'Активен', color: 'text-green-600', bgColor: 'bg-green-100' },
  completed: { label: 'Завершён', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  cancelled: { label: 'Отменён', color: 'text-red-600', bgColor: 'bg-red-100' },
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

function TripCardSkeleton() {
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

export default function TripsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ title: string; action: () => void } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: trips, isLoading, isError } = useQuery({
    queryKey: ['trips', debouncedSearch, statusFilter],
    queryFn: () =>
      tripsApi.getAll({ search: debouncedSearch, status: statusFilter }).then((res) => res.data.data || res.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => tripsApi.cancel(id, { reason: 'Отменён администратором' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Рейс отменён');
    },
    onError: () => {
      toast.error('Не удалось отменить рейс');
    },
  });

  const endMutation = useMutation({
    mutationFn: (id: string) => tripsApi.end(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Рейс завершён');
    },
    onError: () => {
      toast.error('Не удалось завершить рейс');
    },
  });

  const tripList = Array.isArray(trips) ? trips : [];

  const stats = useMemo(() => ({
    total: tripList.length,
    active: tripList.filter((t: Trip) => t.status === 'active').length,
    completed: tripList.filter((t: Trip) => t.status === 'completed').length,
    anomalies: tripList.reduce((acc: number, t: Trip) => acc + (t.anomalyCount || 0), 0),
  }), [tripList]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить список рейсов</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['trips'] })}>
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
          <h1 className="text-3xl font-bold">Рейсы</h1>
          <p className="text-muted-foreground">Управление рейсами сотрудников</p>
        </div>
        <Link href="/dashboard/trips/tracker">
          <Button>
            <Radio className="h-4 w-4 mr-2" />
            Трекер
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
                  <Navigation className="h-8 w-8 text-muted-foreground" />
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
                  <Play className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Завершённых</p>
                    <p className="text-2xl font-bold text-muted-foreground">{stats.completed}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Аномалий</p>
                    <p className="text-2xl font-bold text-red-600">{stats.anomalies}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
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
            aria-label="Поиск рейсов"
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

      {/* Trip List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <TripCardSkeleton key={i} />)}
        </div>
      ) : tripList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Navigation className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Рейсы не найдены</p>
            <p className="text-muted-foreground">Нет рейсов по выбранным фильтрам</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tripList.map((trip: Trip) => {
            const status = statusConfig[trip.status] || statusConfig.planned;

            return (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Navigation className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {trip.employee
                              ? `${trip.employee.firstName} ${trip.employee.lastName || ''}`
                              : 'Без водителя'}
                          </h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {trip.route && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {trip.route.name}
                            </span>
                          )}
                          {trip.vehicle && (
                            <span className="flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {trip.vehicle.licensePlate || 'Без номера'}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {trip.stopsCount || 0} остановок
                          </span>
                          {trip.startedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(trip.startedAt).toLocaleString('ru-RU')}
                            </span>
                          )}
                          {(trip.anomalyCount || 0) > 0 && (
                            <span className="flex items-center gap-1 text-red-500">
                              <AlertTriangle className="h-3 w-3" />
                              {trip.anomalyCount} аномалий
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {trip.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={endMutation.isPending}
                          onClick={() => {
                            setConfirmState({ title: 'Завершить рейс?', action: () => endMutation.mutate(trip.id) });
                          }}
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Завершить
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label="Действия">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/dashboard/trips/${trip.id}`}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Просмотр
                            </DropdownMenuItem>
                          </Link>
                          {trip.status === 'active' && (
                            <DropdownMenuItem
                              className="text-destructive"
                              disabled={cancelMutation.isPending}
                              onClick={() => {
                                setConfirmState({ title: 'Отменить рейс?', action: () => cancelMutation.mutate(trip.id) });
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Отменить
                            </DropdownMenuItem>
                          )}
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
