# VendHub API Integration Patterns

## API Client Setup

### Base Configuration
```typescript
// lib/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
    }
    return Promise.reject(error);
  }
);

export default api;
```

## API Module Pattern

### Example: Trips API
```typescript
// lib/api/trips.ts
import api from './client';
import { Trip, TripPoint, TripStop, TripAnomaly, TripFilters, TripStats } from '@/types';

export const tripsApi = {
  // List with pagination & filters
  list: async (filters: TripFilters) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.taskType) params.set('taskType', filters.taskType);
    if (filters.employeeId) params.set('employeeId', filters.employeeId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    const { data } = await api.get<{ data: Trip[]; total: number }>(`/trips?${params}`);
    return data;
  },

  // Get by ID
  getById: async (id: string) => {
    const { data } = await api.get<Trip>(`/trips/${id}`);
    return data;
  },

  // Get route points
  getRoute: async (tripId: string) => {
    const { data } = await api.get<TripPoint[]>(`/trips/${tripId}/route`);
    return data;
  },

  // Get stops
  getStops: async (tripId: string) => {
    const { data } = await api.get<TripStop[]>(`/trips/${tripId}/stops`);
    return data;
  },

  // Get anomalies
  getAnomalies: async (tripId: string) => {
    const { data } = await api.get<TripAnomaly[]>(`/trips/${tripId}/anomalies`);
    return data;
  },

  // Get stats summary
  getStats: async (filters: Pick<TripFilters, 'dateFrom' | 'dateTo'>) => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);

    const { data } = await api.get<TripStats>(`/trips/stats/summary?${params}`);
    return data;
  },

  // Mutations
  start: async (input: { taskType: string; vehicleId?: string }) => {
    const { data } = await api.post<Trip>('/trips/start', input);
    return data;
  },

  end: async (tripId: string, input: { notes?: string }) => {
    const { data } = await api.post<Trip>(`/trips/${tripId}/end`, input);
    return data;
  },

  cancel: async (tripId: string) => {
    const { data } = await api.post<Trip>(`/trips/${tripId}/cancel`);
    return data;
  },

  resolveAnomaly: async (tripId: string, anomalyId: string) => {
    const { data } = await api.post(`/trips/${tripId}/anomalies/${anomalyId}/resolve`);
    return data;
  },
};
```

## React Query Hooks Pattern

### List Hook with Filters
```typescript
// hooks/useTrips.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripsApi } from '@/lib/api/trips';
import { TripFilters } from '@/types';

export const TRIPS_QUERY_KEY = 'trips';

export function useTrips(filters: TripFilters) {
  return useQuery({
    queryKey: [TRIPS_QUERY_KEY, filters],
    queryFn: () => tripsApi.list(filters),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: [TRIPS_QUERY_KEY, id],
    queryFn: () => tripsApi.getById(id),
    enabled: !!id,
  });
}

export function useTripRoute(tripId: string) {
  return useQuery({
    queryKey: [TRIPS_QUERY_KEY, tripId, 'route'],
    queryFn: () => tripsApi.getRoute(tripId),
    enabled: !!tripId,
  });
}

export function useTripStops(tripId: string) {
  return useQuery({
    queryKey: [TRIPS_QUERY_KEY, tripId, 'stops'],
    queryFn: () => tripsApi.getStops(tripId),
    enabled: !!tripId,
  });
}

export function useTripAnomalies(tripId: string) {
  return useQuery({
    queryKey: [TRIPS_QUERY_KEY, tripId, 'anomalies'],
    queryFn: () => tripsApi.getAnomalies(tripId),
    enabled: !!tripId,
  });
}

export function useTripStats(filters: Pick<TripFilters, 'dateFrom' | 'dateTo'>) {
  return useQuery({
    queryKey: [TRIPS_QUERY_KEY, 'stats', filters],
    queryFn: () => tripsApi.getStats(filters),
  });
}
```

### Mutation Hooks
```typescript
// hooks/useTrips.ts (continued)

export function useStartTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tripsApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
    },
  });
}

export function useEndTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId, input }: { tripId: string; input: { notes?: string } }) =>
      tripsApi.end(tripId, input),
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY, tripId] });
    },
  });
}

export function useCancelTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: tripsApi.cancel,
    onSuccess: (_, tripId) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY, tripId] });
    },
  });
}

export function useResolveAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tripId, anomalyId }: { tripId: string; anomalyId: string }) =>
      tripsApi.resolveAnomaly(tripId, anomalyId),
    onSuccess: (_, { tripId }) => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY, tripId, 'anomalies'] });
    },
  });
}
```

## Page Component Pattern

### List Page
```typescript
// app/dashboard/trips/page.tsx
'use client';

import { useState } from 'react';
import { useTrips, useTripStats } from '@/hooks/useTrips';
import { TripFilters } from '@/components/trips/TripFilters';
import { TripStatsCards } from '@/components/trips/TripStatsCards';
import { TripTable } from '@/components/trips/TripTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function TripsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
  });

  const { data, isLoading } = useTrips(filters);
  const { data: stats } = useTripStats({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Поездки</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Новая поездка
        </Button>
      </div>

      <TripFilters filters={filters} onChange={setFilters} />

      {stats && <TripStatsCards stats={stats} />}

      <TripTable
        trips={data?.data ?? []}
        total={data?.total ?? 0}
        page={filters.page}
        limit={filters.limit}
        isLoading={isLoading}
        onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
      />
    </div>
  );
}
```

### Detail Page
```typescript
// app/dashboard/trips/[id]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTrip, useTripStops, useTripAnomalies, useEndTrip, useCancelTrip } from '@/hooks/useTrips';
import { TripInfoCard } from '@/components/trips/TripInfoCard';
import { TripMap } from '@/components/trips/TripMap';
import { TripStopsList } from '@/components/trips/TripStopsList';
import { TripAnomaliesList } from '@/components/trips/TripAnomaliesList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const { data: trip, isLoading } = useTrip(tripId);
  const { data: stops } = useTripStops(tripId);
  const { data: anomalies } = useTripAnomalies(tripId);

  const endTrip = useEndTrip();
  const cancelTrip = useCancelTrip();

  const handleEnd = async () => {
    try {
      await endTrip.mutateAsync({ tripId, input: {} });
      toast.success('Поездка завершена');
    } catch (error) {
      toast.error('Ошибка завершения поездки');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelTrip.mutateAsync(tripId);
      toast.success('Поездка отменена');
    } catch (error) {
      toast.error('Ошибка отмены поездки');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!trip) return <div>Trip not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">Поездка #{trip.id.slice(0, 8)}</h1>
        </div>

        {trip.status === 'active' && (
          <div className="flex gap-2">
            <Button onClick={handleEnd} disabled={endTrip.isPending}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Завершить
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelTrip.isPending}>
              <XCircle className="mr-2 h-4 w-4" />
              Отменить
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TripInfoCard trip={trip} />
        <TripMap tripId={tripId} />
      </div>

      <Tabs defaultValue="stops">
        <TabsList>
          <TabsTrigger value="stops">Остановки ({stops?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="anomalies">
            Аномалии ({anomalies?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stops">
          <TripStopsList stops={stops ?? []} />
        </TabsContent>

        <TabsContent value="anomalies">
          <TripAnomaliesList tripId={tripId} anomalies={anomalies ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## Response Format

### Paginated List
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

### Single Item
```json
{
  "id": "uuid",
  "field": "value",
  ...
}
```

### Error
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email" }
  ]
}
```

## Authentication Headers
```
Authorization: Bearer <jwt_token>
X-Organization-Id: <org_uuid>  (optional, for multi-org users)
Accept-Language: ru  (optional, for localization)
```
