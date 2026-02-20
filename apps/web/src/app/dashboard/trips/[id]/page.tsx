'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Navigation,
  ArrowLeft,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Square,
  ClipboardList,
  Car,
  Ruler,
  Timer,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { tripsApi } from '@/lib/api';
import Link from 'next/link';

interface TripDetail {
  id: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  taskType?: string;
  employee?: { id: string; firstName: string; lastName?: string };
  vehicle?: { id: string; licensePlate?: string; model?: string };
  route?: { id: string; name: string };
  startedAt?: string;
  endedAt?: string;
  distanceKm?: number;
  durationMinutes?: number;
  startOdometer?: number;
  endOdometer?: number;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
}

interface TripStop {
  id: string;
  sequenceNumber: number;
  status: 'pending' | 'arrived' | 'completed' | 'skipped';
  machine?: { id: string; name: string; address?: string };
  arrivedAt?: string;
  departedAt?: string;
}

interface TripAnomaly {
  id: string;
  type: 'route_deviation' | 'long_stop' | 'missed_stop' | 'speed_violation';
  severity: 'low' | 'medium' | 'high';
  description?: string;
  resolved: boolean;
  resolvedAt?: string;
  detectedAt: string;
}

interface TripTask {
  id: string;
  task?: { id: string; taskNumber: string; taskType: string; status: string };
  completedAt?: string;
  notes?: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  planned: { label: 'Запланирован', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  active: { label: 'Активен', color: 'text-green-600', bgColor: 'bg-green-100' },
  completed: { label: 'Завершён', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  cancelled: { label: 'Отменён', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const stopStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Ожидает', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  arrived: { label: 'Прибыл', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { label: 'Завершено', color: 'text-green-600', bgColor: 'bg-green-100' },
  skipped: { label: 'Пропущено', color: 'text-orange-600', bgColor: 'bg-orange-100' },
};

const anomalyTypeConfig: Record<string, string> = {
  route_deviation: 'Отклонение от маршрута',
  long_stop: 'Длительная остановка',
  missed_stop: 'Пропущенная остановка',
  speed_violation: 'Превышение скорости',
};

const severityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Низкая', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  medium: { label: 'Средняя', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  high: { label: 'Высокая', color: 'text-red-600', bgColor: 'bg-red-100' },
};

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-10 w-96" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardContent className="pt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </CardContent></Card>
        <Card><CardContent className="pt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
        </CardContent></Card>
      </div>
    </div>
  );
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: trip, isLoading, isError } = useQuery({
    queryKey: ['trips', id],
    queryFn: () => tripsApi.getById(id).then((res) => res.data),
  });

  const { data: stops } = useQuery({
    queryKey: ['trips', id, 'stops'],
    queryFn: () => tripsApi.getStops(id).then((res) => res.data),
    enabled: !!trip,
  });

  const { data: anomalies } = useQuery({
    queryKey: ['trips', id, 'anomalies'],
    queryFn: () => tripsApi.getAnomalies(id).then((res) => res.data),
    enabled: !!trip,
  });

  const { data: tasks } = useQuery({
    queryKey: ['trips', id, 'tasks'],
    queryFn: () => tripsApi.getTasks(id).then((res) => res.data),
    enabled: !!trip,
  });

  const endMutation = useMutation({
    mutationFn: () => tripsApi.end(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', id] });
      toast.success('Рейс завершён');
    },
    onError: () => toast.error('Не удалось завершить рейс'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => tripsApi.cancel(id, { reason: 'Отменён администратором' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips', id] });
      toast.success('Рейс отменён');
    },
    onError: () => toast.error('Не удалось отменить рейс'),
  });

  const [confirmState, setConfirmState] = useState<{ title: string; action: () => void } | null>(null);

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить рейс</p>
        <div className="flex gap-2">
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['trips', id] })}>
            Повторить
          </Button>
          <Link href="/dashboard/trips">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к рейсам
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Рейс не найден</p>
        <Link href="/dashboard/trips">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к рейсам
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[trip.status] || statusConfig.planned;
  const stopList: TripStop[] = Array.isArray(stops) ? stops : [];
  const anomalyList: TripAnomaly[] = Array.isArray(anomalies) ? anomalies : [];
  const taskList: TripTask[] = Array.isArray(tasks) ? tasks : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/trips">
            <Button variant="ghost" size="sm" aria-label="Назад к рейсам">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Рейс</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-muted-foreground">
              {trip.employee
                ? `${trip.employee.firstName} ${trip.employee.lastName || ''}`
                : 'Без водителя'}
              {trip.route ? ` — ${trip.route.name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {trip.status === 'active' && (
            <>
              <Button
                variant="outline"
                disabled={endMutation.isPending}
                onClick={() => setConfirmState({ title: 'Завершить рейс?', action: () => endMutation.mutate() })}
              >
                <Square className="h-4 w-4 mr-2" />
                {endMutation.isPending ? 'Завершение...' : 'Завершить'}
              </Button>
              <Button
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => setConfirmState({ title: 'Отменить рейс?', action: () => cancelMutation.mutate() })}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {cancelMutation.isPending ? 'Отмена...' : 'Отменить'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Информация</TabsTrigger>
          <TabsTrigger value="stops">Остановки ({stopList.length})</TabsTrigger>
          <TabsTrigger value="anomalies">Аномалии ({anomalyList.length})</TabsTrigger>
          <TabsTrigger value="tasks">Задачи ({taskList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Основная информация</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Водитель:</span>
                  <span className="text-sm font-medium">
                    {trip.employee ? `${trip.employee.firstName} ${trip.employee.lastName || ''}` : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Маршрут:</span>
                  <span className="text-sm font-medium">{trip.route?.name || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Транспорт:</span>
                  <span className="text-sm font-medium">
                    {trip.vehicle ? `${trip.vehicle.model || ''} ${trip.vehicle.licensePlate || ''}`.trim() : '—'}
                  </span>
                </div>
                {trip.taskType && (
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Тип:</span>
                    <span className="text-sm font-medium">{trip.taskType}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Время и расстояние</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Начало:</span>
                  <span className="text-sm font-medium">
                    {trip.startedAt ? new Date(trip.startedAt).toLocaleString('ru-RU') : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Конец:</span>
                  <span className="text-sm font-medium">
                    {trip.endedAt ? new Date(trip.endedAt).toLocaleString('ru-RU') : '—'}
                  </span>
                </div>
                {trip.distanceKm != null && (
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Расстояние:</span>
                    <span className="text-sm font-medium">{trip.distanceKm.toFixed(1)} км</span>
                  </div>
                )}
                {trip.durationMinutes != null && (
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Длительность:</span>
                    <span className="text-sm font-medium">
                      {Math.floor(trip.durationMinutes / 60)}ч {trip.durationMinutes % 60}мин
                    </span>
                  </div>
                )}
                {trip.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Заметки:</p>
                    <p className="text-sm">{trip.notes}</p>
                  </div>
                )}
                {trip.cancelReason && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-red-500">Причина отмены:</p>
                    <p className="text-sm">{trip.cancelReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stops" className="space-y-4">
          {stopList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Остановок нет</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {stopList.map((stop, index) => {
                const ss = stopStatusConfig[stop.status] || stopStatusConfig.pending;
                return (
                  <Card key={stop.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                          {stop.sequenceNumber || index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {stop.machine?.name || `Остановка ${stop.sequenceNumber || index + 1}`}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ss.bgColor} ${ss.color}`}>
                              {ss.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            {stop.machine?.address && <span>{stop.machine.address}</span>}
                            {stop.arrivedAt && <span>Прибытие: {new Date(stop.arrivedAt).toLocaleTimeString('ru-RU')}</span>}
                            {stop.departedAt && <span>Отбытие: {new Date(stop.departedAt).toLocaleTimeString('ru-RU')}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          {anomalyList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-lg font-medium">Аномалий нет</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {anomalyList.map((anomaly) => {
                const sev = severityConfig[anomaly.severity] || severityConfig.low;
                return (
                  <Card key={anomaly.id} className={anomaly.resolved ? 'opacity-60' : ''}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`h-5 w-5 ${anomaly.resolved ? 'text-muted-foreground' : 'text-red-500'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{anomalyTypeConfig[anomaly.type] || anomaly.type}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${sev.bgColor} ${sev.color}`}>{sev.label}</span>
                            {anomaly.resolved && <Badge variant="outline" className="text-green-600">Решено</Badge>}
                          </div>
                          {anomaly.description && <p className="text-sm text-muted-foreground mt-1">{anomaly.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{new Date(anomaly.detectedAt).toLocaleString('ru-RU')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {taskList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Задачи не привязаны</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {taskList.map((tripTask) => (
                <Card key={tripTask.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ClipboardList className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <span className="font-medium">
                            {tripTask.task ? `#${tripTask.task.taskNumber} — ${tripTask.task.taskType}` : 'Задача'}
                          </span>
                          {tripTask.task && <p className="text-sm text-muted-foreground">Статус: {tripTask.task.status}</p>}
                        </div>
                      </div>
                      {tripTask.completedAt ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Выполнено
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Ожидает</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => { if (!open) setConfirmState(null); }}
        title={confirmState?.title ?? ''}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
