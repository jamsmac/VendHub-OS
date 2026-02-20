# VendHub OS - Trips Frontend Implementation

**Статус Backend:** ✅ 100% ГОТОВ (trips.service.ts, все entities)
**Задача:** Создать Frontend UI для модуля Trips

---

## 📁 СТРУКТУРА ФАЙЛОВ ДЛЯ СОЗДАНИЯ

```
apps/web/src/
├── pages/trips/
│   ├── index.tsx                    # Список поездок
│   ├── [id]/index.tsx               # Детали поездки
│   └── tracker/index.tsx            # Live карта
├── components/trips/
│   ├── TripCard.tsx                 # Карточка поездки
│   ├── TripStatusBadge.tsx          # Статус (active/completed/cancelled)
│   ├── TripMap.tsx                  # Карта с маршрутом (Leaflet/Mapbox)
│   ├── TripStopsList.tsx            # Список остановок
│   ├── TripAnomaliesList.tsx        # Список аномалий
│   ├── TripPointsTimeline.tsx       # Timeline GPS точек
│   ├── TripStatsCard.tsx            # Статистика поездки
│   └── LiveTripTracker.tsx          # Real-time трекер
├── hooks/
│   └── useTrips.ts                  # React Query hooks
└── lib/
    └── trips-api.ts                 # API клиент
```

---

## 🔌 СУЩЕСТВУЮЩИЙ BACKEND API

### Endpoints (из trips.controller.ts):

```typescript
// Trip Lifecycle
POST   /trips/start          - startTrip(input)
POST   /trips/:id/end        - endTrip(tripId, input)
POST   /trips/:id/cancel     - cancelTrip(tripId, reason)
GET    /trips/active/:employeeId - getActiveTrip(employeeId)
GET    /trips/:id            - getTripById(id)
GET    /trips                - listTrips(filters)

// GPS Points
POST   /trips/:id/points     - addPoint(tripId, input)
POST   /trips/:id/points/batch - addPointsBatch(tripId, points)
GET    /trips/:id/route      - getTripRoute(tripId)
GET    /trips/:id/stops      - getTripStops(tripId)

// Anomalies
GET    /trips/:id/anomalies  - getTripAnomalies(tripId)
POST   /anomalies/:id/resolve - resolveAnomaly(anomalyId)
GET    /anomalies/unresolved - listUnresolvedAnomalies(filters)

// Analytics
GET    /trips/stats/employee - getEmployeeStats(input)
GET    /trips/stats/machines - getMachineVisitStats(input)
GET    /trips/stats/summary  - getTripsSummary(input)
```

---

## 📄 1. TRIPS LIST PAGE

**Файл:** `apps/web/src/pages/trips/index.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  MapPin, 
  Clock, 
  Route as RouteIcon,
  AlertTriangle,
  User,
  Car,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'next/link';
import { tripsApi } from '@/lib/trips-api';

// Status badge mapping
const statusColors = {
  active: 'bg-green-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-gray-500',
  auto_closed: 'bg-orange-500',
};

const statusLabels = {
  active: 'Активна',
  completed: 'Завершена',
  cancelled: 'Отменена',
  auto_closed: 'Авто-закрыта',
};

const taskTypeLabels = {
  filling: 'Загрузка',
  collection: 'Инкассация',
  repair: 'Ремонт',
  maintenance: 'ТО',
  inspection: 'Проверка',
  merchandising: 'Мерчандайзинг',
  other: 'Другое',
};

export default function TripsListPage() {
  const [filters, setFilters] = useState({
    status: '',
    taskType: '',
    employeeId: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 20,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['trips', filters],
    queryFn: () => tripsApi.listTrips(filters),
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Поездки</h1>
        <div className="flex gap-2">
          <Link href="/trips/tracker">
            <Button variant="outline">
              <MapPin className="w-4 h-4 mr-2" />
              Live Tracker
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="completed">Завершённые</SelectItem>
                <SelectItem value="cancelled">Отменённые</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.taskType}
              onValueChange={(value) => setFilters({ ...filters, taskType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Тип задачи" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все</SelectItem>
                {Object.entries(taskTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DatePickerWithRange
              onChange={({ from, to }) => setFilters({
                ...filters,
                dateFrom: from?.toISOString() || '',
                dateTo: to?.toISOString() || '',
              })}
            />

            <Button onClick={() => setFilters({ ...filters, page: 1 })}>
              Применить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Trips Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сотрудник</TableHead>
                <TableHead>Транспорт</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Начало</TableHead>
                <TableHead>Длительность</TableHead>
                <TableHead>Км</TableHead>
                <TableHead>Остановки</TableHead>
                <TableHead>Аномалии</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {trip.employeeName || trip.employeeId.slice(0, 8)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      {trip.vehicle?.plateNumber || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {taskTypeLabels[trip.taskType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(trip.startedAt), 'dd MMM HH:mm', { locale: ru })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {trip.endedAt 
                        ? `${Math.round((new Date(trip.endedAt).getTime() - new Date(trip.startedAt).getTime()) / 60000)} мин`
                        : 'В процессе'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <RouteIcon className="w-4 h-4 text-muted-foreground" />
                      {Math.round(trip.calculatedDistanceMeters / 1000)} км
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{trip.totalStops}</Badge>
                  </TableCell>
                  <TableCell>
                    {trip.totalAnomalies > 0 ? (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {trip.totalAnomalies}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[trip.status]}>
                      {statusLabels[trip.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/trips/${trip.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Показано {data.data.length} из {data.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={filters.page === 1}
              onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            >
              Назад
            </Button>
            <Button
              variant="outline"
              disabled={filters.page >= data.totalPages}
              onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            >
              Вперёд
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📄 2. TRIP DETAIL PAGE

**Файл:** `apps/web/src/pages/trips/[id]/index.tsx`

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Clock,
  Route as RouteIcon,
  AlertTriangle,
  User,
  Car,
  Gauge,
  Play,
  Square,
  MapPinned,
} from 'lucide-react';
import { TripMap } from '@/components/trips/TripMap';
import { TripStopsList } from '@/components/trips/TripStopsList';
import { TripAnomaliesList } from '@/components/trips/TripAnomaliesList';
import { TripStatsCard } from '@/components/trips/TripStatsCard';
import { tripsApi } from '@/lib/trips-api';

export default function TripDetailPage() {
  const { id } = useParams();

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.getTripById(id as string),
  });

  const { data: route } = useQuery({
    queryKey: ['trip-route', id],
    queryFn: () => tripsApi.getTripRoute(id as string),
    enabled: !!trip,
  });

  const { data: stops } = useQuery({
    queryKey: ['trip-stops', id],
    queryFn: () => tripsApi.getTripStops(id as string),
    enabled: !!trip,
  });

  const { data: anomalies } = useQuery({
    queryKey: ['trip-anomalies', id],
    queryFn: () => tripsApi.getTripAnomalies(id as string),
    enabled: !!trip,
  });

  if (isLoading || !trip) {
    return <div>Загрузка...</div>;
  }

  const duration = trip.endedAt
    ? Math.round((new Date(trip.endedAt).getTime() - new Date(trip.startedAt).getTime()) / 60000)
    : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Поездка #{trip.id.slice(0, 8)}
            <Badge className={statusColors[trip.status]}>
              {statusLabels[trip.status]}
            </Badge>
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(trip.startedAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}
            {trip.endedAt && ` — ${format(new Date(trip.endedAt), 'HH:mm', { locale: ru })}`}
          </p>
        </div>
        {trip.status === 'active' && (
          <Button variant="destructive">
            <Square className="w-4 h-4 mr-2" />
            Завершить поездку
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <TripStatsCard
          icon={User}
          label="Сотрудник"
          value={trip.employeeName || trip.employeeId.slice(0, 8)}
        />
        <TripStatsCard
          icon={Car}
          label="Транспорт"
          value={trip.vehicle?.plateNumber || 'Не указан'}
        />
        <TripStatsCard
          icon={Clock}
          label="Длительность"
          value={duration ? `${duration} мин` : 'В процессе'}
        />
        <TripStatsCard
          icon={RouteIcon}
          label="Расстояние"
          value={`${Math.round(trip.calculatedDistanceMeters / 1000)} км`}
        />
        <TripStatsCard
          icon={MapPinned}
          label="Остановки"
          value={trip.totalStops.toString()}
        />
        <TripStatsCard
          icon={AlertTriangle}
          label="Аномалии"
          value={trip.totalAnomalies.toString()}
          variant={trip.totalAnomalies > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Odometer */}
      {(trip.startOdometer || trip.endOdometer) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Одометр
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-8">
              <div>
                <p className="text-sm text-muted-foreground">Начало</p>
                <p className="text-2xl font-mono">{trip.startOdometer ?? '-'} км</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Конец</p>
                <p className="text-2xl font-mono">{trip.endOdometer ?? '-'} км</p>
              </div>
              {trip.startOdometer && trip.endOdometer && (
                <div>
                  <p className="text-sm text-muted-foreground">По одометру</p>
                  <p className="text-2xl font-mono">
                    {trip.endOdometer - trip.startOdometer} км
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map & Details Tabs */}
      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">Карта</TabsTrigger>
          <TabsTrigger value="stops">
            Остановки ({stops?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            Аномалии ({anomalies?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <Card className="h-[500px]">
            <TripMap
              route={route || []}
              stops={stops || []}
              startPoint={trip.startLatitude && trip.startLongitude ? {
                lat: trip.startLatitude,
                lng: trip.startLongitude,
              } : null}
              endPoint={trip.endLatitude && trip.endLongitude ? {
                lat: trip.endLatitude,
                lng: trip.endLongitude,
              } : null}
              isLive={trip.status === 'active' && trip.liveLocationActive}
            />
          </Card>
        </TabsContent>

        <TabsContent value="stops" className="mt-4">
          <TripStopsList stops={stops || []} />
        </TabsContent>

        <TabsContent value="anomalies" className="mt-4">
          <TripAnomaliesList 
            anomalies={anomalies || []} 
            onResolve={(anomalyId, notes) => {
              // mutation to resolve
            }}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          {/* Task links list */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 📄 3. TRIP MAP COMPONENT

**Файл:** `apps/web/src/components/trips/TripMap.tsx`

```tsx
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TripMapProps {
  route: Array<{ latitude: number; longitude: number; recordedAt: string }>;
  stops: Array<{
    latitude: number;
    longitude: number;
    machineId?: string;
    machineName?: string;
    durationSeconds?: number;
    isVerified?: boolean;
  }>;
  startPoint: { lat: number; lng: number } | null;
  endPoint: { lat: number; lng: number } | null;
  isLive?: boolean;
}

export function TripMap({ route, stops, startPoint, endPoint, isLive }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([41.2995, 69.2401], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Draw route polyline
    if (route.length > 0) {
      const routeCoords = route.map((p) => [p.latitude, p.longitude] as [number, number]);
      
      const polyline = L.polyline(routeCoords, {
        color: isLive ? '#22c55e' : '#3b82f6',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }

    // Add start marker
    if (startPoint) {
      const startIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs">S</div>`,
      });
      
      L.marker([startPoint.lat, startPoint.lng], { icon: startIcon })
        .addTo(map)
        .bindPopup('Начало поездки');
    }

    // Add end marker
    if (endPoint) {
      const endIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs">E</div>`,
      });
      
      L.marker([endPoint.lat, endPoint.lng], { icon: endIcon })
        .addTo(map)
        .bindPopup('Конец поездки');
    }

    // Add stop markers
    stops.forEach((stop, index) => {
      const stopIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-8 h-8 ${stop.isVerified ? 'bg-blue-500' : 'bg-yellow-500'} rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">${index + 1}</div>`,
      });

      L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
        .addTo(map)
        .bindPopup(`
          <strong>${stop.machineName || 'Остановка ' + (index + 1)}</strong><br/>
          ${stop.durationSeconds ? Math.round(stop.durationSeconds / 60) + ' мин' : 'В процессе'}
          ${stop.isVerified ? '<br/><span class="text-green-500">✓ Верифицировано</span>' : ''}
        `);
    });
  }, [route, stops, startPoint, endPoint, isLive]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-lg" />
  );
}
```

---

## 📄 4. API CLIENT

**Файл:** `apps/web/src/lib/trips-api.ts`

```typescript
import { apiClient } from './api-client';

export interface Trip {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string;
  vehicleId: string | null;
  vehicle: { id: string; plateNumber: string } | null;
  taskType: 'filling' | 'collection' | 'repair' | 'maintenance' | 'inspection' | 'merchandising' | 'other';
  status: 'active' | 'completed' | 'cancelled' | 'auto_closed';
  startedAt: string;
  endedAt: string | null;
  startOdometer: number | null;
  endOdometer: number | null;
  calculatedDistanceMeters: number;
  startLatitude: number | null;
  startLongitude: number | null;
  endLatitude: number | null;
  endLongitude: number | null;
  totalPoints: number;
  totalStops: number;
  totalAnomalies: number;
  visitedMachinesCount: number;
  liveLocationActive: boolean;
  notes: string | null;
}

export interface TripPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedMps: number | null;
  heading: number | null;
  distanceFromPrevMeters: number;
  recordedAt: string;
}

export interface TripStop {
  id: string;
  latitude: number;
  longitude: number;
  machineId: string | null;
  machineName: string | null;
  machineAddress: string | null;
  distanceToMachineMeters: number | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  isVerified: boolean;
  notes: string | null;
}

export interface TripAnomaly {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  latitude: number | null;
  longitude: number | null;
  details: Record<string, unknown>;
  resolved: boolean;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  detectedAt: string;
}

export const tripsApi = {
  listTrips: async (filters: {
    status?: string;
    taskType?: string;
    employeeId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    return apiClient.get<{
      data: Trip[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/trips?${params}`);
  },

  getTripById: async (id: string) => {
    return apiClient.get<Trip>(`/trips/${id}`);
  },

  getTripRoute: async (id: string) => {
    return apiClient.get<TripPoint[]>(`/trips/${id}/route`);
  },

  getTripStops: async (id: string) => {
    return apiClient.get<TripStop[]>(`/trips/${id}/stops`);
  },

  getTripAnomalies: async (id: string) => {
    return apiClient.get<TripAnomaly[]>(`/trips/${id}/anomalies`);
  },

  resolveAnomaly: async (anomalyId: string, notes?: string) => {
    return apiClient.post<TripAnomaly>(`/anomalies/${anomalyId}/resolve`, { notes });
  },

  endTrip: async (tripId: string, data: { endOdometer?: number; notes?: string }) => {
    return apiClient.post<Trip>(`/trips/${tripId}/end`, data);
  },

  cancelTrip: async (tripId: string, reason?: string) => {
    return apiClient.post<Trip>(`/trips/${tripId}/cancel`, { reason });
  },
};
```

---

## ⏱️ ОЦЕНКА ВРЕМЕНИ

| Компонент | Часы |
|-----------|------|
| TripsListPage | 4 |
| TripDetailPage | 6 |
| TripMap (Leaflet) | 4 |
| TripStopsList | 2 |
| TripAnomaliesList | 2 |
| API Client + Hooks | 2 |
| **ИТОГО** | **20** |

---

## 🔗 ЗАВИСИМОСТИ ДЛЯ УСТАНОВКИ

```bash
npm install leaflet @types/leaflet
npm install date-fns
```

---

*Этот промпт фокусируется только на Frontend, т.к. Backend уже 100% готов*
