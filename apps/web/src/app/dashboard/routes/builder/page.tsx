'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Route,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Zap,
  Save,
  Coffee,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { routesApi, machinesApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Machine {
  id: string;
  name: string;
  address?: string;
  location?: string;
}

interface BuilderStop {
  machineId: string;
  machineName: string;
  machineAddress?: string;
  sequenceNumber: number;
}

function MachineCardSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-8 w-24 shrink-0" />
    </div>
  );
}

export default function RouteBuilderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [machineSearch, setMachineSearch] = useState('');
  const [debouncedMachineSearch, setDebouncedMachineSearch] = useState('');
  const [stops, setStops] = useState<BuilderStop[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMachineSearch(machineSearch), 300);
    return () => clearTimeout(timer);
  }, [machineSearch]);

  const { data: machines, isLoading: machinesLoading, isError: machinesError } = useQuery({
    queryKey: ['machines', debouncedMachineSearch],
    queryFn: () =>
      machinesApi.getAll({ search: debouncedMachineSearch }).then((res) => res.data.data || res.data),
  });

  const machineList: Machine[] = Array.isArray(machines) ? machines : [];

  const addStop = (machine: Machine) => {
    if (stops.some((s) => s.machineId === machine.id)) return;
    setStops([
      ...stops,
      {
        machineId: machine.id,
        machineName: machine.name,
        machineAddress: machine.address || machine.location,
        sequenceNumber: stops.length + 1,
      },
    ]);
  };

  const removeStop = (index: number) => {
    const newStops = stops.filter((_, i) => i !== index);
    setStops(newStops.map((s, i) => ({ ...s, sequenceNumber: i + 1 })));
  };

  const moveStop = (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= stops.length) return;
    const newStops = [...stops];
    [newStops[index], newStops[swapIndex]] = [newStops[swapIndex], newStops[index]];
    setStops(newStops.map((s, i) => ({ ...s, sequenceNumber: i + 1 })));
  };

  const createRouteWithStops = async () => {
    const res = await routesApi.create({
      name: routeName,
      description: routeDescription || undefined,
    });
    const routeId = res.data.id;

    for (const stop of stops) {
      await routesApi.addStop(routeId, {
        machineId: stop.machineId,
        sequenceNumber: stop.sequenceNumber,
      });
    }

    return routeId;
  };

  const handleSave = async () => {
    if (!routeName.trim() || stops.length === 0) return;
    setIsSaving(true);
    try {
      const routeId = await createRouteWithStops();
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Маршрут создан');
      router.push(`/dashboard/routes/${routeId}`);
    } catch {
      toast.error('Не удалось создать маршрут');
      setIsSaving(false);
    }
  };

  const handleOptimize = async () => {
    if (!routeName.trim() || stops.length < 2) return;
    setIsSaving(true);
    try {
      const routeId = await createRouteWithStops();
      await routesApi.optimize(routeId);
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast.success('Маршрут создан и оптимизирован');
      router.push(`/dashboard/routes/${routeId}`);
    } catch {
      toast.error('Не удалось создать и оптимизировать маршрут');
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/routes">
          <Button variant="ghost" size="sm" aria-label="Назад к маршрутам">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Конструктор маршрута</h1>
          <p className="text-muted-foreground">
            Выберите автоматы и задайте порядок обслуживания
          </p>
        </div>
      </div>

      {/* Route Info */}
      <Card>
        <CardHeader>
          <CardTitle>Информация о маршруте</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Название *</label>
            <Input
              placeholder="Например: Маршрут Центр-1"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              aria-label="Название маршрута"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Описание</label>
            <Input
              placeholder="Описание маршрута..."
              value={routeDescription}
              onChange={(e) => setRouteDescription(e.target.value)}
              aria-label="Описание маршрута"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Machine Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              Доступные автоматы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск автоматов..."
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
                className="pl-10"
                aria-label="Поиск автоматов"
              />
            </div>

            {machinesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <MachineCardSkeleton key={i} />)}
              </div>
            ) : machinesError ? (
              <div className="text-center py-6">
                <p className="text-destructive mb-2">Ошибка загрузки автоматов</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['machines'] })}
                >
                  Повторить
                </Button>
              </div>
            ) : machineList.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                Автоматы не найдены
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {machineList.map((machine: Machine) => {
                  const isAdded = stops.some((s) => s.machineId === machine.id);
                  return (
                    <div
                      key={machine.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{machine.name}</p>
                        {machine.address && (
                          <p className="text-sm text-muted-foreground truncate">
                            {machine.address}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isAdded ? 'ghost' : 'outline'}
                        disabled={isAdded}
                        onClick={() => addStop(machine)}
                      >
                        {isAdded ? (
                          'Добавлен'
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Добавить
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Stop Order */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Остановки ({stops.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stops.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Route className="h-8 w-8 mx-auto mb-2" />
                <p>Добавьте автоматы из списка слева</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stops.map((stop, index) => (
                  <div
                    key={stop.machineId}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold shrink-0">
                      {stop.sequenceNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{stop.machineName}</p>
                      {stop.machineAddress && (
                        <p className="text-sm text-muted-foreground truncate">
                          {stop.machineAddress}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Переместить вверх"
                        disabled={index === 0}
                        onClick={() => moveStop(index, 'up')}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Переместить вниз"
                        disabled={index === stops.length - 1}
                        onClick={() => moveStop(index, 'down')}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Удалить остановку"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeStop(index)}
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
      </div>

      {/* Bottom: Save actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {stops.length} остановок в маршруте
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={stops.length < 2 || !routeName.trim() || isSaving}
                onClick={handleOptimize}
              >
                <Zap className="h-4 w-4 mr-2" />
                {isSaving ? 'Сохранение...' : 'Сохранить и оптимизировать'}
              </Button>
              <Button
                disabled={stops.length === 0 || !routeName.trim() || isSaving}
                onClick={handleSave}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Сохранение...' : 'Сохранить маршрут'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
