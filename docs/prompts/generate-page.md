# Prompt Template: Generate Page

## Usage
Copy this template and fill in the placeholders.

---

## Prompt

```
Создай страницу {PAGE_NAME} для VendHub OS.

## Контекст
- Читай: /docs/architecture.md, /docs/ui-components.md
- Спецификация: /docs/specs/{SPEC_FILE}.md
- Паттерны: смотри существующие страницы в apps/web/src/app/dashboard/

## Требования

### Файлы для создания
1. apps/web/src/app/dashboard/{path}/page.tsx
2. apps/web/src/components/{name}/*.tsx
3. apps/web/src/hooks/use{Name}.ts
4. apps/web/src/lib/api/{name}.ts

### Технологии
- Next.js 15 App Router
- shadcn/ui компоненты
- React Query для данных
- Zod для валидации

### API Endpoints
{LIST_OF_ENDPOINTS}

### Типы данных
{TYPESCRIPT_INTERFACES}

## Формат ответа
- Только код, без пояснений
- Один файл за раз
- Следуй существующим паттернам проекта
```

---

## Example: Trips List Page

```
Создай страницу списка поездок для VendHub OS.

## Контекст
- Читай: /docs/architecture.md, /docs/ui-components.md
- Спецификация: /docs/specs/trips-page-spec.md
- Паттерны: смотри apps/web/src/app/dashboard/tasks/page.tsx

## Требования

### Файлы для создания
1. apps/web/src/app/dashboard/trips/page.tsx
2. apps/web/src/components/trips/TripCard.tsx
3. apps/web/src/components/trips/TripStatusBadge.tsx
4. apps/web/src/components/trips/TripFilters.tsx
5. apps/web/src/hooks/useTrips.ts
6. apps/web/src/lib/api/trips.ts

### API Endpoints
GET /api/v1/trips - listTrips(filters)
GET /api/v1/trips/stats/summary - getTripsSummary(filters)

### Типы данных
interface Trip {
  id: string;
  employeeId: string;
  taskType: 'filling' | 'collection' | 'repair' | 'maintenance' | 'inspection' | 'merchandising' | 'other';
  status: 'active' | 'completed' | 'cancelled' | 'auto_closed';
  startedAt: string;
  endedAt: string | null;
  calculatedDistanceMeters: number;
  totalStops: number;
  totalAnomalies: number;
}

## Формат ответа
- Только код, без пояснений
- Начни с lib/api/trips.ts, затем hooks, затем компоненты, затем page
```

---

## Example: Detail Page

```
Создай страницу деталей поездки для VendHub OS.

## Контекст
- Читай: /docs/architecture.md, /docs/specs/trips-page-spec.md
- Уже создано: apps/web/src/lib/api/trips.ts, apps/web/src/hooks/useTrips.ts

## Требования

### Файлы для создания
1. apps/web/src/app/dashboard/trips/[id]/page.tsx
2. apps/web/src/components/trips/TripInfoCard.tsx
3. apps/web/src/components/trips/TripMap.tsx
4. apps/web/src/components/trips/TripStopsList.tsx
5. apps/web/src/components/trips/TripAnomaliesList.tsx

### API Endpoints
GET /api/v1/trips/:id - getTripById(id)
GET /api/v1/trips/:id/route - getTripRoute(tripId)
GET /api/v1/trips/:id/stops - getTripStops(tripId)
GET /api/v1/trips/:id/anomalies - getTripAnomalies(tripId)
POST /api/v1/trips/:id/end - endTrip(tripId, input)
POST /api/v1/trips/:id/cancel - cancelTrip(tripId)

### Компоненты
- TripMap: Leaflet карта с маршрутом и маркерами остановок
- TripStopsList: таблица остановок с временем и автоматами
- TripAnomaliesList: список аномалий с кнопкой resolve
```

---

## Quick Prompts

### Fix TypeScript Error
```
Исправь TypeScript ошибку в {FILE_PATH}:
{ERROR_MESSAGE}

Контекст: читай типы в packages/shared/src/types/
```

### Add Feature to Existing Page
```
Добавь {FEATURE} в страницу {PAGE_PATH}.

Текущий код: {CURRENT_FILE}
Требования: {REQUIREMENTS}
```

### Create Component
```
Создай компонент {ComponentName} для VendHub OS.

Путь: apps/web/src/components/{path}/{ComponentName}.tsx
Props: {PROPS_INTERFACE}
Функционал: {DESCRIPTION}
Паттерн: смотри apps/web/src/components/{SIMILAR_COMPONENT}.tsx
```

### Create Hook
```
Создай React Query хук use{Name} для VendHub OS.

Путь: apps/web/src/hooks/use{Name}.ts
API: {ENDPOINT}
Возвращает: {RETURN_TYPE}
Паттерн: смотри apps/web/src/hooks/useTasks.ts
```
