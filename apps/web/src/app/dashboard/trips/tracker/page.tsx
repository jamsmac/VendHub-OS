'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Navigation,
  ArrowLeft,
  Clock,
  User,
  MapPin,
  Radio,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { tripsApi } from '@/lib/api';
import Link from 'next/link';

interface ActiveTrip {
  id: string;
  status: string;
  employee?: { id: string; firstName: string; lastName?: string };
  vehicle?: { id: string; licensePlate?: string };
  route?: { id: string; name: string };
  currentStop?: { name: string; sequenceNumber: number };
  stopsCompleted?: number;
  stopsTotal?: number;
  startedAt?: string;
  distanceKm?: number;
}

const REFETCH_INTERVAL = 10_000;

function TrackerCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-2 w-2 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-40" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <Skeleton className="h-3 w-48" />
      </CardContent>
    </Card>
  );
}

export default function TripTrackerPage() {
  const { data: trips, isLoading, isError, refetch } = useQuery({
    queryKey: ['trips', 'active-all'],
    queryFn: () =>
      tripsApi.getAll({ status: 'active' }).then((res) => res.data.data || res.data),
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
  });

  const tripList: ActiveTrip[] = Array.isArray(trips) ? trips : [];

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Ошибка загрузки</p>
        <p className="text-muted-foreground mb-4">Не удалось загрузить активные рейсы</p>
        <Button onClick={() => refetch()}>Повторить</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/trips">
          <Button variant="ghost" size="sm" aria-label="Назад к рейсам">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Трекер рейсов</h1>
            <span className="relative flex h-3 w-3" aria-label="Обновление активно">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
          </div>
          <p className="text-muted-foreground">
            Активные рейсы обновляются каждые 10 секунд
          </p>
        </div>
      </div>

      {/* Active Trips Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <TrackerCardSkeleton key={i} />)}
        </div>
      ) : tripList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Нет активных рейсов</p>
            <p className="text-muted-foreground">Все рейсы завершены или ещё не начаты</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tripList.map((trip: ActiveTrip) => {
            const stopsCompleted = trip.stopsCompleted || 0;
            const stopsTotal = trip.stopsTotal || 1;
            const progress = Math.round((stopsCompleted / stopsTotal) * 100);

            return (
              <Link key={trip.id} href={`/dashboard/trips/${trip.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {trip.employee
                          ? `${trip.employee.firstName} ${trip.employee.lastName || ''}`
                          : 'Без водителя'}
                      </CardTitle>
                      <span className="relative flex h-2 w-2" aria-hidden="true">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {trip.route && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {trip.route.name}
                      </div>
                    )}

                    {trip.vehicle && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Navigation className="h-3 w-3" />
                        {trip.vehicle.licensePlate || 'Без номера'}
                      </div>
                    )}

                    {trip.currentStop && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-3 w-3 text-green-500" />
                        <span>Сейчас: {trip.currentStop.name}</span>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Прогресс</span>
                        <span className="font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {stopsCompleted} / {stopsTotal}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                      {trip.startedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Начало: {new Date(trip.startedAt).toLocaleTimeString('ru-RU')}
                        </span>
                      )}
                      {trip.distanceKm != null && (
                        <span>{trip.distanceKm.toFixed(1)} км</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
