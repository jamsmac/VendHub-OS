# Current Task: Trips Frontend

## Goal
Создать полный UI для модуля Trips (поездки сотрудников)

## Priority: HIGH

## Backend Status: ✅ READY
- trips.service.ts - полная реализация
- trips.controller.ts - все endpoints
- Entities: trip, trip_point, trip_stop, trip_anomaly, trip_task_link, trip_reconciliation

## API Endpoints
```
GET    /api/v1/trips              - listTrips(filters)
GET    /api/v1/trips/:id          - getTripById(id)
GET    /api/v1/trips/:id/route    - getTripRoute(tripId)
GET    /api/v1/trips/:id/stops    - getTripStops(tripId)
GET    /api/v1/trips/:id/anomalies - getTripAnomalies(tripId)
POST   /api/v1/trips/start        - startTrip(input)
POST   /api/v1/trips/:id/end      - endTrip(tripId, input)
POST   /api/v1/trips/:id/cancel   - cancelTrip(tripId)
GET    /api/v1/trips/stats/summary - getTripsSummary(filters)
```

## Files to Create

### Pages
- [ ] apps/web/src/app/dashboard/trips/page.tsx
- [ ] apps/web/src/app/dashboard/trips/[id]/page.tsx
- [ ] apps/web/src/app/dashboard/trips/tracker/page.tsx

### Components
- [ ] apps/web/src/components/trips/TripCard.tsx
- [ ] apps/web/src/components/trips/TripStatusBadge.tsx
- [ ] apps/web/src/components/trips/TripMap.tsx
- [ ] apps/web/src/components/trips/TripStopsList.tsx
- [ ] apps/web/src/components/trips/TripAnomaliesList.tsx
- [ ] apps/web/src/components/trips/TripStatsCard.tsx

### Hooks & API
- [ ] apps/web/src/hooks/useTrips.ts
- [ ] apps/web/src/lib/api/trips.ts

## Data Types

```typescript
interface Trip {
  id: string;
  organizationId: string;
  employeeId: string;
  vehicleId: string | null;
  taskType: 'filling' | 'collection' | 'repair' | 'maintenance' | 'inspection' | 'merchandising' | 'other';
  status: 'active' | 'completed' | 'cancelled' | 'auto_closed';
  startedAt: string;
  endedAt: string | null;
  calculatedDistanceMeters: number;
  totalStops: number;
  totalAnomalies: number;
  visitedMachinesCount: number;
}

interface TripPoint {
  id: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
}

interface TripStop {
  id: string;
  latitude: number;
  longitude: number;
  machineId: string | null;
  machineName: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  isVerified: boolean;
}

interface TripAnomaly {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  details: Record<string, unknown>;
  resolved: boolean;
  detectedAt: string;
}
```

## UI Requirements
- Таблица поездок с фильтрами (статус, тип, дата, сотрудник)
- Детальная страница поездки с картой маршрута
- Список остановок с привязкой к автоматам
- Список аномалий с возможностью разрешения
- Live tracker для активных поездок

## Reference Files
- See: /docs/specs/trips-page-spec.md
- Pattern: /docs/ui-components.md
- Schema: /docs/database-schema.md (Trips section)

## Estimated Time: 20 hours
