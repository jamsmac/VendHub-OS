# VendHub OS Architecture

## Overview
```
vendhub-unified/
├── apps/
│   ├── api/          # NestJS Backend
│   ├── web/          # Next.js Admin Panel
│   ├── client/       # Vite Customer App
│   ├── bot/          # Telegram Bot
│   └── mobile/       # React Native Staff App
├── packages/
│   └── shared/       # Shared types & utils
└── infrastructure/   # Docker, K8s, Terraform
```

## Apps

### API (apps/api) - Port 4000
- Framework: NestJS 11
- Database: PostgreSQL + TypeORM
- Cache: Redis
- Auth: JWT + Refresh tokens
- Docs: Swagger at /docs

Key modules (59 total):
- auth, users, organizations
- machines, products, inventory
- tasks, trips, routes
- payments, transactions
- complaints, notifications
- directories (MDM)

### Web (apps/web) - Port 3000
- Framework: Next.js 15 (App Router)
- UI: shadcn/ui + Tailwind
- State: React Query + Zustand
- Charts: Recharts
- Maps: Leaflet

Key pages (45 total):
- /dashboard - Overview
- /dashboard/machines - Машины
- /dashboard/products - Товары
- /dashboard/inventory - Склад
- /dashboard/tasks - Задачи
- /dashboard/trips - Поездки (нужно создать)
- /dashboard/routes - Маршруты (нужно создать)
- /dashboard/directories - Справочники

### Bot (apps/bot) - Port 3001
- Framework: Telegraf 4
- Sessions: Redis
- Commands: /start, /find, /points, /quests, /support

### Mobile (apps/mobile)
- Framework: React Native + Expo
- Navigation: React Navigation
- Target: Staff app for technicians

## Database Schema (93 entities)

### Core
- organizations, users, employees
- locations, machines, products

### Operations
- tasks, trips, trip_points, trip_stops
- routes, route_stops
- inventory, transactions

### MDM (Master Data)
- directories, directory_fields, directory_entries
- directory_sources, directory_sync_logs

### Payments
- payments, payment_transactions
- fiscal_receipts

## API Patterns

### Request/Response
```typescript
// DTO validation with class-validator
@IsUUID()
organizationId: string;

// Response pagination
{ data: T[], total: number, page: number, limit: number }
```

### Multi-tenant
All queries filter by organizationId.
Users see only their organization's data.

## Frontend Patterns

### Data Fetching
```typescript
// React Query hook
const { data, isLoading } = useQuery({
  queryKey: ['trips', filters],
  queryFn: () => api.trips.list(filters),
});
```

### Forms
```typescript
// React Hook Form + Zod
const form = useForm<TripInput>({
  resolver: zodResolver(tripSchema),
});
```

### Components
Use shadcn/ui from @/components/ui/*
Follow existing patterns in codebase.
