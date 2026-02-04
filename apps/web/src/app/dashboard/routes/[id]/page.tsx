'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Route,
  ArrowLeft,
  MapPin,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Zap,
  Play,
  CheckCircle2,
  Edit,
  Ruler,
  Clock,
  Coffee,
  AlertTriangle,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { routesApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RouteDetail {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'inactive';
  totalDistanceKm?: number;
  estimatedDurationMinutes?: number;
  createdAt: string;
}

interface RouteStop {
  id: string;
  sequenceNumber: number;
  machine?: { id: string; name: string; address?: string };
  estimatedArrivalMinutes?: number;
  estimatedDurationMinutes?: number;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Черновик', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  active: { label: 'Активен', color: 'text-green-600', bgColor: 'bg-green-100' },
  inactive: { label: 'Неактивен', color: 'text-red-600', bgColor: 'bg-red-100' },
};

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [newStopMachineId, setNewStopMachineId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [confirmState, setConfirmState] = useState<{ title: string; action: () => void } | null>(null);

  const { data: route, isLoading, isError } = useQuery({
    queryKey: ['routes', id],
    queryFn: () => routesApi.getById(id).then((res) => res.data),
  });

  const { data: stops } = useQuery({
    queryKey: ['routes', id, 'stops'],
    queryFn: () => routesApi.getStops(id).then((res) => res.data),
    enabled: !!route,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => routesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', id] });
      setIsEditing(false);
      toast.success('Маршрут обновлён');
    },
    onError: () => {
      toast.error('Не удалось обновить маршрут');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => routesApi.delete(id),
    onSuccess: () => {
      toast.success('Маршрут удалён');
      router.push('/dashboard/routes');
    },
    onError: () => {
      toast.error('Не удалось удалить маршрут');
    },
  });

  const optimizeMutation = useMutation({
    mutationFn: () => routesApi.optimize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', id] });
      queryClient.invalidateQueries({ queryKey: ['routes', id, 'stops'] });
      toast.success('Маршрут оптимизирован');
    },
    onError: () => {
      toast.error('Не удалось оптимизировать маршрут');
    },
  });

  const startMutation = useMutation({
    mutationFn: () => routesApi.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', id] });
      toast.success('Маршрут активирован');
    },
    onError: () => {
      toast.error('Не удалось активировать маршрут');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => routesApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', id] });
      toast.success('Маршрут завершён');
    },
    onError: () => {
      toast.error('Не удалось завершить маршрут');
    },
  });

  const addStopMutation = useMutation({
    mutationFn: (data: any) => routesApi.addStop(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', id, 'stops'] });
      setIsAddStopOpen(false);
      setNewStopMachineId('');
      toast.success('Остановка добавлена');
    },
    onError: () => {
      toast.error('Не удалось добавить остановку');
    },
  });

  const removeStopMutation = useMutation({
    mutationFn: (stopId: string) => routesApi.removeStop(id, stopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', id, 'stops'] });
      toast.success('Остановка удалена');
    },
    onError: () => {
      toast.error('Не удалось удалить остановку');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (data: any) => routesApi.reorderStops(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes', id, 'stops'] });
      toast.success('Порядок обновлён');
    },
    onError: () => {
      toast.error('Не удалось изменить порядок');
    },
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить маршрут</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['routes', id] })}>
          Повторить
        </Button>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Route className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Маршрут не найден</p>
        <Link href="/dashboard/routes">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к маршрутам
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[route.status] || statusConfig.draft;
  const stopList: RouteStop[] = Array.isArray(stops) ? stops : [];

  const handleMoveStop = (stopIndex: number, direction: 'up' | 'down') => {
    const newOrder = stopList.map((s: RouteStop) => s.id);
    const swapIndex = direction === 'up' ? stopIndex - 1 : stopIndex + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[stopIndex], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[stopIndex]];
    reorderMutation.mutate({ stopIds: newOrder });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/routes">
            <Button variant="ghost" size="sm" aria-label="Назад к маршрутам">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-64"
                    aria-label="Название маршрута"
                  />
                  <Button
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ name: editName })}
                  >
                    {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    Отмена
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold">{route.name}</h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Редактировать название"
                    onClick={() => {
                      setEditName(route.name);
                      setIsEditing(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
            </div>
            {route.description && (
              <p className="text-muted-foreground">{route.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {route.status === 'draft' && (
            <Button
              variant="outline"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate()}
            >
              <Play className="h-4 w-4 mr-2" />
              {startMutation.isPending ? 'Активация...' : 'Активировать'}
            </Button>
          )}
          {route.status === 'active' && (
            <Button
              variant="outline"
              disabled={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {completeMutation.isPending ? 'Завершение...' : 'Завершить'}
            </Button>
          )}
          <Button
            variant="outline"
            disabled={optimizeMutation.isPending}
            onClick={() => optimizeMutation.mutate()}
          >
            <Zap className="h-4 w-4 mr-2" />
            {optimizeMutation.isPending ? 'Оптимизация...' : 'Оптимизировать'}
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              setConfirmState({ title: 'Удалить маршрут?', action: () => deleteMutation.mutate() });
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
          </Button>
        </div>
      </div>

      {/* Route Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Остановок</p>
                <p className="text-xl font-bold">{stopList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {route.totalDistanceKm != null && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Расстояние</p>
                  <p className="text-xl font-bold">{route.totalDistanceKm.toFixed(1)} км</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {route.estimatedDurationMinutes != null && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Время</p>
                  <p className="text-xl font-bold">
                    {Math.floor(route.estimatedDurationMinutes / 60)}ч {route.estimatedDurationMinutes % 60}мин
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stops */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Остановки</CardTitle>
            <Dialog open={isAddStopOpen} onOpenChange={setIsAddStopOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить остановку
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить остановку</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">ID автомата</label>
                    <Input
                      placeholder="UUID автомата..."
                      value={newStopMachineId}
                      onChange={(e) => setNewStopMachineId(e.target.value)}
                      aria-label="ID автомата"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      addStopMutation.mutate({
                        machineId: newStopMachineId,
                        sequenceNumber: stopList.length + 1,
                      })
                    }
                    disabled={!newStopMachineId || addStopMutation.isPending}
                  >
                    {addStopMutation.isPending ? 'Добавление...' : 'Добавить'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {stopList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p>Остановок нет. Добавьте первую остановку.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stopList.map((stop: RouteStop, index: number) => (
                <div
                  key={stop.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold shrink-0">
                    {stop.sequenceNumber || index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {stop.machine?.name || `Остановка ${stop.sequenceNumber || index + 1}`}
                      </span>
                    </div>
                    {stop.machine?.address && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {stop.machine.address}
                      </p>
                    )}
                    {stop.estimatedArrivalMinutes != null && (
                      <p className="text-xs text-muted-foreground">
                        ~{stop.estimatedArrivalMinutes} мин
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Переместить вверх"
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => handleMoveStop(index, 'up')}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Переместить вниз"
                      disabled={index === stopList.length - 1 || reorderMutation.isPending}
                      onClick={() => handleMoveStop(index, 'down')}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Удалить остановку"
                      className="text-destructive hover:text-destructive"
                      disabled={removeStopMutation.isPending}
                      onClick={() => {
                        setConfirmState({ title: 'Удалить остановку?', action: () => removeStopMutation.mutate(stop.id) });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmState}
        onOpenChange={(open) => { if (!open) setConfirmState(null); }}
        title={confirmState?.title ?? ''}
        onConfirm={() => confirmState?.action()}
      />
    </div>
  );
}
