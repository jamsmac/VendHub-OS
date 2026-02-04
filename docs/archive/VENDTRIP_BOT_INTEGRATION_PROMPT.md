# VendtripBot Integration Prompt для VendHub OS

**Версия:** 1.0
**Дата:** Февраль 2026
**Цель:** Интеграция GPS-трекинга выездов специалистов в VendHub OS

---

## Обзор интеграции

### Назначение VendtripBot:
Отслеживание выездов ЛЮБЫХ специалистов к вендинговым автоматам:
- **Операторы** — загрузка/пополнение автоматов
- **Инкассаторы** — сбор выручки
- **Техники** — ремонт и обслуживание
- **Мерчендайзеры** — проверка витрин

### Что уже есть в VendHub OS:
- Таблицы: `employees`, `machines`, `tasks`, `workLogs`
- Роли сотрудников: operator, technician, collector
- Telegram интеграция для пользователей

### Что добавит VendtripBot:
- GPS-трекинг через Telegram Live Location
- Автоматическое определение остановок
- Верификация посещения точек (геофенсинг)
- Связь поездок с задачами
- Аномалии (длинные остановки, отклонения от маршрута)
- Сверка пробега транспорта

---

## ЧАСТЬ 1: Схема базы данных (Drizzle ORM)

```typescript
// packages/database/src/schema/trips.ts

import {
  mysqlTable, varchar, text, int, bigint, boolean, timestamp,
  json, mysqlEnum, index, uniqueIndex, decimal
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { employees, machines, tasks } from './index';

// ============================================
// ENUMS
// ============================================

export const tripStatusEnum = mysqlEnum('trip_status', [
  'ACTIVE',      // Поездка идёт
  'COMPLETED',   // Завершена нормально
  'CANCELLED',   // Отменена
  'AUTO_CLOSED', // Автозавершена системой
]);

export const tripTaskTypeEnum = mysqlEnum('trip_task_type', [
  'FILLING',       // Загрузка/пополнение (оператор)
  'COLLECTION',    // Инкассация (инкассатор)
  'REPAIR',        // Ремонт (техник)
  'MAINTENANCE',   // Плановое ТО (техник)
  'INSPECTION',    // Проверка (любой)
  'MERCHANDISING', // Мерчендайзинг
  'OTHER',         // Прочее
]);

export const vehicleTypeEnum = mysqlEnum('vehicle_type', [
  'COMPANY',   // Служебный транспорт
  'PERSONAL',  // Личный автомобиль
]);

export const anomalyTypeEnum = mysqlEnum('anomaly_type', [
  'LONG_STOP',           // Длительная остановка вне точек
  'SPEED_VIOLATION',     // Превышение скорости
  'ROUTE_DEVIATION',     // Отклонение от маршрута
  'GPS_JUMP',            // Прыжок GPS координат
  'MISSED_LOCATION',     // Пропущенная точка
  'UNPLANNED_STOP',      // Незапланированная остановка
  'MILEAGE_DISCREPANCY', // Расхождение пробега
]);

export const anomalySeverityEnum = mysqlEnum('anomaly_severity', [
  'INFO',
  'WARNING',
  'CRITICAL',
]);

// ============================================
// VEHICLES (Транспорт)
// ============================================

export const vehicles = mysqlTable('vehicles', {
  id: int('id').autoincrement().primaryKey(),

  // Владелец (для личного транспорта)
  ownerEmployeeId: int('owner_employee_id').references(() => employees.id),

  type: vehicleTypeEnum.notNull().default('COMPANY'),
  brand: varchar('brand', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }),
  plateNumber: varchar('plate_number', { length: 20 }).notNull(),

  // Одометр
  currentOdometer: int('current_odometer').default(0),
  lastOdometerUpdate: timestamp('last_odometer_update'),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  plateIdx: uniqueIndex('idx_vehicles_plate').on(table.plateNumber),
  ownerIdx: index('idx_vehicles_owner').on(table.ownerEmployeeId),
}));

// ============================================
// TRIPS (Поездки)
// ============================================

export const trips = mysqlTable('trips', {
  id: int('id').autoincrement().primaryKey(),

  // Кто и на чём
  employeeId: int('employee_id').notNull().references(() => employees.id),
  vehicleId: int('vehicle_id').references(() => vehicles.id),

  // Тип задачи (определяет логику верификации)
  taskType: tripTaskTypeEnum.notNull().default('OTHER'),

  // Статус
  status: tripStatusEnum.notNull().default('ACTIVE'),

  // Время
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),

  // Одометр
  startOdometer: int('start_odometer'),
  endOdometer: int('end_odometer'),
  calculatedDistanceMeters: int('calculated_distance_meters').default(0),

  // Начальная/конечная точка
  startLatitude: decimal('start_latitude', { precision: 10, scale: 8 }),
  startLongitude: decimal('start_longitude', { precision: 11, scale: 8 }),
  endLatitude: decimal('end_latitude', { precision: 10, scale: 8 }),
  endLongitude: decimal('end_longitude', { precision: 11, scale: 8 }),

  // Связь с локациями (если старт/финиш у машины)
  startMachineId: int('start_machine_id').references(() => machines.id),
  endMachineId: int('end_machine_id').references(() => machines.id),

  // Статистика
  totalPoints: int('total_points').default(0),
  totalStops: int('total_stops').default(0),
  totalAnomalies: int('total_anomalies').default(0),
  visitedMachinesCount: int('visited_machines_count').default(0),

  // Telegram Live Location
  liveLocationActive: boolean('live_location_active').default(false),
  lastLocationUpdate: timestamp('last_location_update'),
  telegramMessageId: bigint('telegram_message_id', { mode: 'number' }),

  // Заметки
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => ({
  employeeIdx: index('idx_trips_employee').on(table.employeeId),
  statusIdx: index('idx_trips_status').on(table.status),
  startedIdx: index('idx_trips_started').on(table.startedAt),
  // ВАЖНО: Только одна активная поездка на сотрудника
  activeEmployeeIdx: uniqueIndex('idx_trips_active_employee')
    .on(table.employeeId)
    // .where(eq(table.status, 'ACTIVE')), // Partial index через raw SQL
}));

// ============================================
// TRIP_POINTS (GPS точки маршрута)
// ============================================

export const tripPoints = mysqlTable('trip_points', {
  id: int('id').autoincrement().primaryKey(),
  tripId: int('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),

  // Координаты
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),

  // Метаданные GPS
  accuracyMeters: decimal('accuracy_meters', { precision: 8, scale: 2 }),
  speedMps: decimal('speed_mps', { precision: 8, scale: 2 }), // м/с
  heading: decimal('heading', { precision: 5, scale: 2 }), // 0-360°
  altitude: decimal('altitude', { precision: 10, scale: 2 }),

  // Расчётные значения
  distanceFromPrevMeters: decimal('distance_from_prev_meters', { precision: 10, scale: 2 }),

  // Фильтрация (отсев плохих точек)
  isFiltered: boolean('is_filtered').default(false),
  filterReason: varchar('filter_reason', { length: 50 }),

  recordedAt: timestamp('recorded_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tripTimeIdx: index('idx_trip_points_trip_time').on(table.tripId, table.recordedAt),
  validPointsIdx: index('idx_trip_points_valid').on(table.tripId, table.isFiltered),
}));

// ============================================
// TRIP_STOPS (Остановки)
// ============================================

export const tripStops = mysqlTable('trip_stops', {
  id: int('id').autoincrement().primaryKey(),
  tripId: int('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),

  // Координаты центра остановки
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),

  // Привязка к машине (если в геофенсе)
  machineId: int('machine_id').references(() => machines.id),
  machineName: varchar('machine_name', { length: 128 }),
  machineAddress: varchar('machine_address', { length: 256 }),
  distanceToMachineMeters: int('distance_to_machine_meters'),

  // Время остановки
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
  durationSeconds: int('duration_seconds'),

  // Флаги
  isVerified: boolean('is_verified').default(false), // Подтверждённое посещение
  isAnomaly: boolean('is_anomaly').default(false),
  notificationSent: boolean('notification_sent').default(false),

  // Заметки сотрудника
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tripIdx: index('idx_trip_stops_trip').on(table.tripId),
  machineIdx: index('idx_trip_stops_machine').on(table.machineId),
  startedIdx: index('idx_trip_stops_started').on(table.startedAt),
}));

// ============================================
// TRIP_ANOMALIES (Аномалии)
// ============================================

export const tripAnomalies = mysqlTable('trip_anomalies', {
  id: int('id').autoincrement().primaryKey(),
  tripId: int('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),

  type: anomalyTypeEnum.notNull(),
  severity: anomalySeverityEnum.notNull().default('WARNING'),

  // Где произошло
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),

  // Детали (JSON для разных типов)
  details: json('details').$type<AnomalyDetails>().default({}),

  // Уведомление
  notificationSent: boolean('notification_sent').default(false),

  // Разрешение
  resolved: boolean('resolved').default(false),
  resolvedBy: int('resolved_by').references(() => employees.id),
  resolvedAt: timestamp('resolved_at'),
  resolutionNotes: text('resolution_notes'),

  detectedAt: timestamp('detected_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tripIdx: index('idx_trip_anomalies_trip').on(table.tripId),
  typeIdx: index('idx_trip_anomalies_type').on(table.type),
  resolvedIdx: index('idx_trip_anomalies_resolved').on(table.resolved),
}));

// ============================================
// TRIP_TASK_LINKS (Связь поездок с задачами)
// ============================================

export const tripTaskLinks = mysqlTable('trip_task_links', {
  id: int('id').autoincrement().primaryKey(),
  tripId: int('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  taskId: int('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),

  // Статус выполнения в рамках поездки
  status: mysqlEnum('status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED']).default('PENDING'),

  // Верификация посещения
  verifiedByGps: boolean('verified_by_gps').default(false),
  verifiedAt: timestamp('verified_at'),

  // Время выполнения
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),

  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tripTaskIdx: uniqueIndex('idx_trip_task_links_unique').on(table.tripId, table.taskId),
}));

// ============================================
// TRIP_RECONCILIATIONS (Сверка пробега)
// ============================================

export const tripReconciliations = mysqlTable('trip_reconciliations', {
  id: int('id').autoincrement().primaryKey(),
  vehicleId: int('vehicle_id').notNull().references(() => vehicles.id),

  // Одометр
  actualOdometer: int('actual_odometer').notNull(),
  expectedOdometer: int('expected_odometer').notNull(),
  differenceKm: int('difference_km').notNull(),

  // Порог аномалии
  thresholdKm: int('threshold_km').notNull(),
  isAnomaly: boolean('is_anomaly').notNull(),

  // Кто провёл
  performedBy: int('performed_by').notNull().references(() => employees.id),
  performedAt: timestamp('performed_at').notNull().defaultNow(),

  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  vehicleIdx: index('idx_reconciliations_vehicle').on(table.vehicleId),
  performedIdx: index('idx_reconciliations_performed').on(table.performedAt),
}));

// ============================================
// RELATIONS
// ============================================

export const tripsRelations = relations(trips, ({ one, many }) => ({
  employee: one(employees, {
    fields: [trips.employeeId],
    references: [employees.id],
  }),
  vehicle: one(vehicles, {
    fields: [trips.vehicleId],
    references: [vehicles.id],
  }),
  startMachine: one(machines, {
    fields: [trips.startMachineId],
    references: [machines.id],
  }),
  endMachine: one(machines, {
    fields: [trips.endMachineId],
    references: [machines.id],
  }),
  points: many(tripPoints),
  stops: many(tripStops),
  anomalies: many(tripAnomalies),
  taskLinks: many(tripTaskLinks),
}));

export const tripStopsRelations = relations(tripStops, ({ one }) => ({
  trip: one(trips, {
    fields: [tripStops.tripId],
    references: [trips.id],
  }),
  machine: one(machines, {
    fields: [tripStops.machineId],
    references: [machines.id],
  }),
}));

// ============================================
// TYPES
// ============================================

export interface AnomalyDetails {
  // LONG_STOP
  durationMinutes?: number;
  expectedMaxMinutes?: number;

  // SPEED_VIOLATION
  speedKmh?: number;
  maxAllowedKmh?: number;

  // ROUTE_DEVIATION
  deviationMeters?: number;
  nearestPlannedPoint?: { lat: number; lng: number };

  // GPS_JUMP
  previousPoint?: { lat: number; lng: number };
  distanceMeters?: number;
  timeSeconds?: number;

  // MISSED_LOCATION
  machineId?: number;
  machineName?: string;
  distanceMeters?: number;

  // MILEAGE_DISCREPANCY
  expectedKm?: number;
  actualKm?: number;
  differenceKm?: number;
}

// ============================================
// CONSTANTS
// ============================================

export const TRIP_SETTINGS = {
  // Радиус геофенса для верификации (метры)
  GEOFENCE_RADIUS_METERS: 100,

  // Минимальное время для определения остановки (секунды)
  STOP_MIN_DURATION_SECONDS: 300, // 5 минут

  // Радиус определения остановки (метры)
  STOP_DETECTION_RADIUS_METERS: 40,

  // Автозавершение поездки без GPS (часы)
  AUTO_CLOSE_AFTER_HOURS: 8,

  // Порог расхождения пробега (км)
  MILEAGE_THRESHOLD_KM: 50,

  // Максимальная скорость (км/ч)
  MAX_SPEED_KMH: 120,

  // Минимальная точность GPS (метры)
  MIN_GPS_ACCURACY_METERS: 100,
};
```

---

## ЧАСТЬ 2: tRPC API Router

```typescript
// apps/api/src/modules/trips/trips.router.ts

import { z } from 'zod';
import { router, protectedProcedure, employeeProcedure } from '../../trpc';
import { TripsService } from './trips.service';
import { TRPCError } from '@trpc/server';

// ============================================
// INPUT SCHEMAS
// ============================================

const startTripSchema = z.object({
  vehicleId: z.number().optional(),
  taskType: z.enum(['FILLING', 'COLLECTION', 'REPAIR', 'MAINTENANCE',
                    'INSPECTION', 'MERCHANDISING', 'OTHER']).default('OTHER'),
  startOdometer: z.number().optional(),
  taskIds: z.array(z.number()).optional(), // Связанные задачи
  notes: z.string().optional(),
});

const endTripSchema = z.object({
  tripId: z.number(),
  endOdometer: z.number().optional(),
  notes: z.string().optional(),
});

const addPointSchema = z.object({
  tripId: z.number(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  altitude: z.number().optional(),
  recordedAt: z.date().optional(),
});

const listTripsSchema = z.object({
  employeeId: z.number().optional(),
  vehicleId: z.number().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'AUTO_CLOSED']).optional(),
  taskType: z.enum(['FILLING', 'COLLECTION', 'REPAIR', 'MAINTENANCE',
                    'INSPECTION', 'MERCHANDISING', 'OTHER']).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  page: z.number().default(1),
  limit: z.number().default(20).max(100),
});

// ============================================
// ROUTER
// ============================================

export const tripsRouter = router({
  // ==========================================
  // TRIP LIFECYCLE
  // ==========================================

  // Начать поездку
  start: employeeProcedure
    .input(startTripSchema)
    .mutation(async ({ ctx, input }) => {
      // Проверка что у сотрудника нет активной поездки
      const activeTrip = await ctx.tripsService.getActiveTrip(ctx.user.employeeId);
      if (activeTrip) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'У вас уже есть активная поездка. Завершите её перед началом новой.',
        });
      }

      return ctx.tripsService.startTrip({
        employeeId: ctx.user.employeeId,
        ...input,
      });
    }),

  // Завершить поездку
  end: employeeProcedure
    .input(endTripSchema)
    .mutation(async ({ ctx, input }) => {
      const trip = await ctx.tripsService.getTripById(input.tripId);

      // Проверка что поездка принадлежит этому сотруднику
      if (trip?.employeeId !== ctx.user.employeeId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      if (trip?.status !== 'ACTIVE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Поездка уже завершена',
        });
      }

      return ctx.tripsService.endTrip(input);
    }),

  // Отменить поездку
  cancel: employeeProcedure
    .input(z.object({ tripId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.tripsService.cancelTrip(input.tripId, input.reason);
    }),

  // Получить активную поездку сотрудника
  getActive: employeeProcedure
    .query(async ({ ctx }) => {
      return ctx.tripsService.getActiveTrip(ctx.user.employeeId);
    }),

  // ==========================================
  // GPS TRACKING
  // ==========================================

  // Добавить GPS точку
  addPoint: employeeProcedure
    .input(addPointSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.tripsService.addPoint(input);
    }),

  // Добавить пакет GPS точек (для batch отправки)
  addPoints: employeeProcedure
    .input(z.object({
      tripId: z.number(),
      points: z.array(addPointSchema.omit({ tripId: true })),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.tripsService.addPoints(input.tripId, input.points);
    }),

  // Обновить статус Live Location
  updateLiveLocation: employeeProcedure
    .input(z.object({
      tripId: z.number(),
      isActive: z.boolean(),
      telegramMessageId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.tripsService.updateLiveLocationStatus(input);
    }),

  // ==========================================
  // QUERIES
  // ==========================================

  // Получить поездку по ID
  getById: protectedProcedure
    .input(z.number())
    .query(async ({ ctx, input }) => {
      return ctx.tripsService.getTripById(input);
    }),

  // Список поездок
  list: protectedProcedure
    .input(listTripsSchema)
    .query(async ({ ctx, input }) => {
      return ctx.tripsService.listTrips(input);
    }),

  // Получить маршрут (GPS точки)
  getRoute: protectedProcedure
    .input(z.number()) // tripId
    .query(async ({ ctx, input }) => {
      return ctx.tripsService.getTripRoute(input);
    }),

  // Получить остановки
  getStops: protectedProcedure
    .input(z.number()) // tripId
    .query(async ({ ctx, input }) => {
      return ctx.tripsService.getTripStops(input);
    }),

  // Получить аномалии
  getAnomalies: protectedProcedure
    .input(z.number()) // tripId
    .query(async ({ ctx, input }) => {
      return ctx.tripsService.getTripAnomalies(input);
    }),

  // ==========================================
  // TASK LINKS
  // ==========================================

  tasks: router({
    // Привязать задачу к поездке
    link: employeeProcedure
      .input(z.object({
        tripId: z.number(),
        taskId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.tripsService.linkTask(input.tripId, input.taskId);
      }),

    // Отметить задачу выполненной
    complete: employeeProcedure
      .input(z.object({
        tripId: z.number(),
        taskId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.tripsService.completeLinkedTask(input);
      }),

    // Получить задачи поездки
    list: protectedProcedure
      .input(z.number()) // tripId
      .query(async ({ ctx, input }) => {
        return ctx.tripsService.getTripTasks(input);
      }),
  }),

  // ==========================================
  // ANOMALIES
  // ==========================================

  anomalies: router({
    // Разрешить аномалию
    resolve: protectedProcedure
      .input(z.object({
        anomalyId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.tripsService.resolveAnomaly(input.anomalyId, ctx.user.id, input.notes);
      }),

    // Список неразрешённых аномалий
    listUnresolved: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ ctx, input }) => {
        return ctx.tripsService.listUnresolvedAnomalies(input);
      }),
  }),

  // ==========================================
  // VEHICLES
  // ==========================================

  vehicles: router({
    // Список транспорта
    list: protectedProcedure
      .input(z.object({
        type: z.enum(['COMPANY', 'PERSONAL']).optional(),
        ownerId: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return ctx.tripsService.listVehicles(input);
      }),

    // Создать транспорт
    create: protectedProcedure
      .input(z.object({
        ownerEmployeeId: z.number().optional(),
        type: z.enum(['COMPANY', 'PERSONAL']),
        brand: z.string(),
        model: z.string().optional(),
        plateNumber: z.string(),
        currentOdometer: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.tripsService.createVehicle(input);
      }),

    // Обновить одометр
    updateOdometer: employeeProcedure
      .input(z.object({
        vehicleId: z.number(),
        odometer: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.tripsService.updateVehicleOdometer(input.vehicleId, input.odometer);
      }),
  }),

  // ==========================================
  // RECONCILIATION (Сверка пробега)
  // ==========================================

  reconciliation: router({
    // Провести сверку
    perform: employeeProcedure
      .input(z.object({
        vehicleId: z.number(),
        actualOdometer: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.tripsService.performReconciliation({
          ...input,
          performedBy: ctx.user.employeeId,
        });
      }),

    // История сверок
    history: protectedProcedure
      .input(z.object({
        vehicleId: z.number(),
        limit: z.number().default(10),
      }))
      .query(async ({ ctx, input }) => {
        return ctx.tripsService.getReconciliationHistory(input.vehicleId, input.limit);
      }),
  }),

  // ==========================================
  // ANALYTICS
  // ==========================================

  analytics: router({
    // Статистика сотрудника
    employeeStats: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        dateFrom: z.date(),
        dateTo: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        return ctx.tripsService.getEmployeeStats(input);
      }),

    // Статистика по машинам (какие посещались)
    machineVisits: protectedProcedure
      .input(z.object({
        machineId: z.number().optional(),
        dateFrom: z.date(),
        dateTo: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        return ctx.tripsService.getMachineVisitStats(input);
      }),

    // Общая статистика
    summary: protectedProcedure
      .input(z.object({
        dateFrom: z.date(),
        dateTo: z.date(),
      }))
      .query(async ({ ctx, input }) => {
        return ctx.tripsService.getTripsSummary(input);
      }),
  }),
});
```

---

## ЧАСТЬ 3: Сервис (ключевые методы)

```typescript
// apps/api/src/modules/trips/trips.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { eq, and, gte, lte, isNull, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../database';
import {
  trips, tripPoints, tripStops, tripAnomalies,
  tripTaskLinks, vehicles, tripReconciliations,
  TRIP_SETTINGS
} from '../../database/schema';
import { machines } from '../../database/schema';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  // ==========================================
  // TRIP LIFECYCLE
  // ==========================================

  async startTrip(input: {
    employeeId: number;
    vehicleId?: number;
    taskType: string;
    startOdometer?: number;
    taskIds?: number[];
    notes?: string;
  }) {
    return db.transaction(async (tx) => {
      // 1. Создаём поездку
      const [result] = await tx.insert(trips).values({
        employeeId: input.employeeId,
        vehicleId: input.vehicleId,
        taskType: input.taskType as any,
        status: 'ACTIVE',
        startOdometer: input.startOdometer,
        notes: input.notes,
      });

      const tripId = Number(result.insertId);

      // 2. Привязываем задачи если указаны
      if (input.taskIds?.length) {
        await tx.insert(tripTaskLinks).values(
          input.taskIds.map(taskId => ({
            tripId,
            taskId,
            status: 'PENDING' as const,
          }))
        );
      }

      return this.getTripById(tripId);
    });
  }

  async endTrip(input: {
    tripId: number;
    endOdometer?: number;
    notes?: string;
  }) {
    const trip = await this.getTripById(input.tripId);
    if (!trip) throw new Error('Trip not found');

    // Получаем последнюю точку для координат финиша
    const lastPoint = await db.query.tripPoints.findFirst({
      where: and(
        eq(tripPoints.tripId, input.tripId),
        eq(tripPoints.isFiltered, false)
      ),
      orderBy: [desc(tripPoints.recordedAt)],
    });

    // Рассчитываем общую дистанцию
    const distanceResult = await db
      .select({
        total: sql<number>`SUM(${tripPoints.distanceFromPrevMeters})`,
      })
      .from(tripPoints)
      .where(and(
        eq(tripPoints.tripId, input.tripId),
        eq(tripPoints.isFiltered, false)
      ));

    const totalDistance = Math.round(distanceResult[0]?.total || 0);

    // Подсчитываем посещённые машины
    const visitedMachines = await db.query.tripStops.findMany({
      where: and(
        eq(tripStops.tripId, input.tripId),
        sql`${tripStops.machineId} IS NOT NULL`
      ),
    });

    const uniqueMachines = new Set(visitedMachines.map(s => s.machineId)).size;

    // Обновляем поездку
    await db.update(trips)
      .set({
        status: 'COMPLETED',
        endedAt: new Date(),
        endOdometer: input.endOdometer,
        endLatitude: lastPoint?.latitude,
        endLongitude: lastPoint?.longitude,
        calculatedDistanceMeters: totalDistance,
        visitedMachinesCount: uniqueMachines,
        notes: input.notes ? `${trip.notes || ''}\n${input.notes}` : trip.notes,
        liveLocationActive: false,
      })
      .where(eq(trips.id, input.tripId));

    // Обновляем одометр транспорта если указан
    if (trip.vehicleId && input.endOdometer) {
      await db.update(vehicles)
        .set({
          currentOdometer: input.endOdometer,
          lastOdometerUpdate: new Date(),
        })
        .where(eq(vehicles.id, trip.vehicleId));
    }

    // Проверяем расхождение пробега
    if (trip.vehicleId && trip.startOdometer && input.endOdometer) {
      const reportedKm = input.endOdometer - trip.startOdometer;
      const calculatedKm = Math.round(totalDistance / 1000);
      const difference = Math.abs(reportedKm - calculatedKm);

      if (difference > TRIP_SETTINGS.MILEAGE_THRESHOLD_KM) {
        await this.createAnomaly(input.tripId, {
          type: 'MILEAGE_DISCREPANCY',
          severity: 'WARNING',
          details: {
            expectedKm: calculatedKm,
            actualKm: reportedKm,
            differenceKm: difference,
          },
        });
      }
    }

    return this.getTripById(input.tripId);
  }

  async getActiveTrip(employeeId: number) {
    return db.query.trips.findFirst({
      where: and(
        eq(trips.employeeId, employeeId),
        eq(trips.status, 'ACTIVE')
      ),
      with: {
        vehicle: true,
        taskLinks: {
          with: { task: true },
        },
      },
    });
  }

  // ==========================================
  // GPS TRACKING
  // ==========================================

  async addPoint(input: {
    tripId: number;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    altitude?: number;
    recordedAt?: Date;
  }) {
    // Фильтрация плохих точек
    let isFiltered = false;
    let filterReason: string | null = null;

    // Проверка точности GPS
    if (input.accuracy && input.accuracy > TRIP_SETTINGS.MIN_GPS_ACCURACY_METERS) {
      isFiltered = true;
      filterReason = 'LOW_ACCURACY';
    }

    // Получаем предыдущую точку для расчёта дистанции
    const prevPoint = await db.query.tripPoints.findFirst({
      where: and(
        eq(tripPoints.tripId, input.tripId),
        eq(tripPoints.isFiltered, false)
      ),
      orderBy: [desc(tripPoints.recordedAt)],
    });

    let distanceFromPrev = 0;
    if (prevPoint) {
      distanceFromPrev = this.calculateHaversineDistance(
        Number(prevPoint.latitude),
        Number(prevPoint.longitude),
        input.latitude,
        input.longitude
      );

      // Проверка на GPS прыжок
      if (distanceFromPrev > 1000) { // > 1 км за один интервал
        const timeDiff = input.recordedAt
          ? (input.recordedAt.getTime() - new Date(prevPoint.recordedAt).getTime()) / 1000
          : 30;

        const speedMs = distanceFromPrev / timeDiff;
        const speedKmh = speedMs * 3.6;

        if (speedKmh > TRIP_SETTINGS.MAX_SPEED_KMH * 1.5) {
          isFiltered = true;
          filterReason = 'GPS_JUMP';

          // Создаём аномалию
          await this.createAnomaly(input.tripId, {
            type: 'GPS_JUMP',
            severity: 'INFO',
            latitude: input.latitude,
            longitude: input.longitude,
            details: {
              previousPoint: {
                lat: Number(prevPoint.latitude),
                lng: Number(prevPoint.longitude),
              },
              distanceMeters: distanceFromPrev,
              timeSeconds: timeDiff,
            },
          });
        }
      }
    }

    // Сохраняем точку
    const [result] = await db.insert(tripPoints).values({
      tripId: input.tripId,
      latitude: input.latitude.toString(),
      longitude: input.longitude.toString(),
      accuracyMeters: input.accuracy?.toString(),
      speedMps: input.speed?.toString(),
      heading: input.heading?.toString(),
      altitude: input.altitude?.toString(),
      distanceFromPrevMeters: distanceFromPrev.toString(),
      isFiltered,
      filterReason,
      recordedAt: input.recordedAt || new Date(),
    });

    // Обновляем счётчик точек и время последнего обновления
    await db.update(trips)
      .set({
        totalPoints: sql`${trips.totalPoints} + 1`,
        lastLocationUpdate: new Date(),
      })
      .where(eq(trips.id, input.tripId));

    // Проверяем остановку
    if (!isFiltered) {
      await this.checkForStop(input.tripId, input.latitude, input.longitude);
    }

    return { id: Number(result.insertId), isFiltered, filterReason };
  }

  // ==========================================
  // STOP DETECTION
  // ==========================================

  private async checkForStop(tripId: number, lat: number, lng: number) {
    // Получаем последние точки за STOP_MIN_DURATION_SECONDS
    const thresholdTime = new Date(
      Date.now() - TRIP_SETTINGS.STOP_MIN_DURATION_SECONDS * 1000
    );

    const recentPoints = await db.query.tripPoints.findMany({
      where: and(
        eq(tripPoints.tripId, tripId),
        eq(tripPoints.isFiltered, false),
        gte(tripPoints.recordedAt, thresholdTime)
      ),
      orderBy: [desc(tripPoints.recordedAt)],
    });

    if (recentPoints.length < 2) return;

    // Проверяем что все точки в радиусе STOP_DETECTION_RADIUS_METERS
    const allInRadius = recentPoints.every(point => {
      const dist = this.calculateHaversineDistance(
        Number(point.latitude),
        Number(point.longitude),
        lat,
        lng
      );
      return dist <= TRIP_SETTINGS.STOP_DETECTION_RADIUS_METERS;
    });

    if (!allInRadius) return;

    // Проверяем есть ли уже активная остановка
    const existingStop = await db.query.tripStops.findFirst({
      where: and(
        eq(tripStops.tripId, tripId),
        isNull(tripStops.endedAt)
      ),
    });

    if (existingStop) {
      // Обновляем существующую остановку
      return;
    }

    // Создаём новую остановку
    const firstPoint = recentPoints[recentPoints.length - 1];
    const centerLat = Number(firstPoint.latitude);
    const centerLng = Number(firstPoint.longitude);

    // Ищем ближайшую машину
    const nearestMachine = await this.findNearestMachine(centerLat, centerLng);

    const [stopResult] = await db.insert(tripStops).values({
      tripId,
      latitude: centerLat.toString(),
      longitude: centerLng.toString(),
      machineId: nearestMachine?.machineId,
      machineName: nearestMachine?.machineName,
      machineAddress: nearestMachine?.machineAddress,
      distanceToMachineMeters: nearestMachine?.distance,
      startedAt: new Date(firstPoint.recordedAt),
      isVerified: nearestMachine?.isWithinRadius || false,
    });

    // Обновляем счётчик остановок
    await db.update(trips)
      .set({ totalStops: sql`${trips.totalStops} + 1` })
      .where(eq(trips.id, tripId));

    // Если остановка у машины — верифицируем связанные задачи
    if (nearestMachine?.isWithinRadius) {
      await this.verifyTaskAtMachine(tripId, nearestMachine.machineId);
    }
  }

  private async findNearestMachine(lat: number, lng: number) {
    const allMachines = await db.query.machines.findMany({
      where: eq(machines.status, 'online'),
    });

    let nearest: {
      machineId: number;
      machineName: string;
      machineAddress: string;
      distance: number;
      isWithinRadius: boolean;
    } | null = null;

    for (const machine of allMachines) {
      if (!machine.latitude || !machine.longitude) continue;

      const dist = this.calculateHaversineDistance(
        lat,
        lng,
        Number(machine.latitude),
        Number(machine.longitude)
      );

      if (!nearest || dist < nearest.distance) {
        nearest = {
          machineId: machine.id,
          machineName: machine.name || machine.machineCode || '',
          machineAddress: machine.address || '',
          distance: Math.round(dist),
          isWithinRadius: dist <= TRIP_SETTINGS.GEOFENCE_RADIUS_METERS,
        };
      }
    }

    return nearest;
  }

  private async verifyTaskAtMachine(tripId: number, machineId: number) {
    // Находим задачи поездки для этой машины
    const taskLinks = await db.query.tripTaskLinks.findMany({
      where: eq(tripTaskLinks.tripId, tripId),
      with: {
        task: true,
      },
    });

    for (const link of taskLinks) {
      if (link.task.machineId === machineId && link.status === 'PENDING') {
        await db.update(tripTaskLinks)
          .set({
            status: 'IN_PROGRESS',
            verifiedByGps: true,
            verifiedAt: new Date(),
            startedAt: new Date(),
          })
          .where(eq(tripTaskLinks.id, link.id));
      }
    }
  }

  // ==========================================
  // ANOMALY CREATION
  // ==========================================

  private async createAnomaly(tripId: number, data: {
    type: string;
    severity: string;
    latitude?: number;
    longitude?: number;
    details?: any;
  }) {
    const [result] = await db.insert(tripAnomalies).values({
      tripId,
      type: data.type as any,
      severity: data.severity as any,
      latitude: data.latitude?.toString(),
      longitude: data.longitude?.toString(),
      details: data.details || {},
    });

    await db.update(trips)
      .set({ totalAnomalies: sql`${trips.totalAnomalies} + 1` })
      .where(eq(trips.id, tripId));

    return Number(result.insertId);
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Радиус Земли в метрах
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ... остальные методы (getTripById, listTrips, etc.)
}
```

---

## ЧАСТЬ 4: React компоненты

### 4.1 TripTracker (виджет для сотрудника)

```tsx
// apps/web/src/components/trips/TripTracker.tsx

import { useState, useEffect, useCallback } from 'react';
import {
  Play, Square, MapPin, Clock, Navigation2,
  AlertTriangle, CheckCircle, Truck, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/trpc';
import { formatDuration, formatDistance } from '@/lib/format';

const TASK_TYPE_LABELS: Record<string, string> = {
  FILLING: '📦 Загрузка',
  COLLECTION: '💰 Инкассация',
  REPAIR: '🔧 Ремонт',
  MAINTENANCE: '🛠 ТО',
  INSPECTION: '👁 Проверка',
  MERCHANDISING: '🏷 Мерчендайзинг',
  OTHER: '📋 Прочее',
};

export function TripTracker() {
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState('OTHER');
  const [selectedVehicle, setSelectedVehicle] = useState<number | undefined>();
  const [startOdometer, setStartOdometer] = useState('');
  const [endOdometer, setEndOdometer] = useState('');

  // Получаем активную поездку
  const {
    data: activeTrip,
    isLoading: isLoadingTrip,
    refetch: refetchTrip,
  } = trpc.trips.getActive.useQuery(undefined, {
    refetchInterval: 30000, // Обновляем каждые 30 сек
  });

  // Список транспорта
  const { data: vehicles } = trpc.trips.vehicles.list.useQuery();

  // Мутации
  const startMutation = trpc.trips.start.useMutation({
    onSuccess: () => {
      setStartDialogOpen(false);
      refetchTrip();
      startGpsTracking();
    },
  });

  const endMutation = trpc.trips.end.useMutation({
    onSuccess: () => {
      setEndDialogOpen(false);
      refetchTrip();
      stopGpsTracking();
    },
  });

  const addPointMutation = trpc.trips.addPoint.useMutation();

  // GPS трекинг
  const [watchId, setWatchId] = useState<number | null>(null);

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        if (activeTrip?.id) {
          addPointMutation.mutate({
            tripId: activeTrip.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
            altitude: position.coords.altitude || undefined,
          });
        }
      },
      (error) => {
        console.error('GPS error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 10000,
      }
    );

    setWatchId(id);
  }, [activeTrip?.id, addPointMutation]);

  const stopGpsTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // Запускаем GPS если есть активная поездка
  useEffect(() => {
    if (activeTrip && !watchId) {
      startGpsTracking();
    }
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [activeTrip, watchId, startGpsTracking]);

  const handleStartTrip = () => {
    startMutation.mutate({
      taskType: selectedTaskType as any,
      vehicleId: selectedVehicle,
      startOdometer: startOdometer ? parseInt(startOdometer) : undefined,
    });
  };

  const handleEndTrip = () => {
    if (!activeTrip) return;
    endMutation.mutate({
      tripId: activeTrip.id,
      endOdometer: endOdometer ? parseInt(endOdometer) : undefined,
    });
  };

  if (isLoadingTrip) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Нет активной поездки — показываем кнопку старта
  if (!activeTrip) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation2 className="h-5 w-5" />
              Отслеживание выезда
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Начните отслеживание перед выездом на маршрут
            </p>
            <Button onClick={() => setStartDialogOpen(true)} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Начать выезд
            </Button>
          </CardContent>
        </Card>

        {/* Диалог начала поездки */}
        <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Начать выезд</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Тип задачи */}
              <div className="space-y-2">
                <Label>Тип работы</Label>
                <Select
                  value={selectedTaskType}
                  onValueChange={setSelectedTaskType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Транспорт */}
              <div className="space-y-2">
                <Label>Транспорт (опционально)</Label>
                <Select
                  value={selectedVehicle?.toString()}
                  onValueChange={(v) => setSelectedVehicle(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите транспорт" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((v: any) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          {v.brand} {v.model} ({v.plateNumber})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Одометр */}
              {selectedVehicle && (
                <div className="space-y-2">
                  <Label>Показания одометра (км)</Label>
                  <Input
                    type="number"
                    value={startOdometer}
                    onChange={(e) => setStartOdometer(e.target.value)}
                    placeholder="Введите текущий пробег"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStartDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                onClick={handleStartTrip}
                disabled={startMutation.isPending}
              >
                {startMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Начать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Есть активная поездка — показываем статус
  const duration = activeTrip.startedAt
    ? Date.now() - new Date(activeTrip.startedAt).getTime()
    : 0;

  return (
    <>
      <Card className="border-green-500 border-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              Поездка активна
            </div>
            <Badge variant="outline">
              {TASK_TYPE_LABELS[activeTrip.taskType]}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">
                {formatDuration(duration)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                Время
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatDistance(activeTrip.calculatedDistanceMeters || 0)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Navigation2 className="h-3 w-3" />
                Пройдено
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {activeTrip.visitedMachinesCount || 0}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                Точек
              </div>
            </div>
          </div>

          {/* Аномалии */}
          {activeTrip.totalAnomalies > 0 && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                {activeTrip.totalAnomalies} аномалий обнаружено
              </span>
            </div>
          )}

          {/* Транспорт */}
          {activeTrip.vehicle && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4" />
              {activeTrip.vehicle.brand} {activeTrip.vehicle.model} ({activeTrip.vehicle.plateNumber})
            </div>
          )}

          {/* Кнопка завершения */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setEndDialogOpen(true)}
          >
            <Square className="h-4 w-4 mr-2" />
            Завершить выезд
          </Button>
        </CardContent>
      </Card>

      {/* Диалог завершения */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Завершить выезд</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Итоги */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Время</div>
                <div className="font-medium">{formatDuration(duration)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Пройдено</div>
                <div className="font-medium">
                  {formatDistance(activeTrip.calculatedDistanceMeters || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Точек посещено</div>
                <div className="font-medium">{activeTrip.visitedMachinesCount || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Остановок</div>
                <div className="font-medium">{activeTrip.totalStops || 0}</div>
              </div>
            </div>

            {/* Одометр */}
            {activeTrip.vehicle && (
              <div className="space-y-2">
                <Label>Показания одометра (км)</Label>
                <Input
                  type="number"
                  value={endOdometer}
                  onChange={(e) => setEndOdometer(e.target.value)}
                  placeholder="Введите текущий пробег"
                />
                {activeTrip.startOdometer && endOdometer && (
                  <p className="text-sm text-muted-foreground">
                    По одометру: {parseInt(endOdometer) - activeTrip.startOdometer} км
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEndDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleEndTrip}
              disabled={endMutation.isPending}
            >
              {endMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <CheckCircle className="h-4 w-4 mr-2" />
              Завершить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## ЧАСТЬ 5: Cron Jobs

```typescript
// apps/api/src/modules/trips/trips.cron.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { db } from '../../database';
import { trips, tripStops, TRIP_SETTINGS } from '../../database/schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TripsCronService {
  private readonly logger = new Logger(TripsCronService.name);

  constructor(private notifications: NotificationsService) {}

  // Каждые 15 минут — автозавершение зависших поездок
  @Cron(CronExpression.EVERY_15_MINUTES)
  async handleStaleTrips() {
    this.logger.log('Checking for stale trips...');

    const threshold = new Date(
      Date.now() - TRIP_SETTINGS.AUTO_CLOSE_AFTER_HOURS * 60 * 60 * 1000
    );

    // Находим поездки без обновлений > N часов
    const staleTrips = await db.query.trips.findMany({
      where: and(
        eq(trips.status, 'ACTIVE'),
        lt(trips.lastLocationUpdate, threshold)
      ),
      with: {
        employee: true,
      },
    });

    for (const trip of staleTrips) {
      this.logger.warn(`Auto-closing stale trip ${trip.id} for employee ${trip.employeeId}`);

      // Завершаем поездку с пометкой AUTO_CLOSED
      await db.update(trips)
        .set({
          status: 'AUTO_CLOSED',
          endedAt: new Date(),
          liveLocationActive: false,
          notes: `${trip.notes || ''}\n[Автозавершено системой: нет GPS обновлений более ${TRIP_SETTINGS.AUTO_CLOSE_AFTER_HOURS} часов]`,
        })
        .where(eq(trips.id, trip.id));

      // Закрываем открытые остановки
      await db.update(tripStops)
        .set({ endedAt: new Date() })
        .where(and(
          eq(tripStops.tripId, trip.id),
          isNull(tripStops.endedAt)
        ));

      // Уведомляем сотрудника
      if (trip.employee.telegramUserId) {
        await this.notifications.sendTelegram(
          trip.employee.telegramUserId,
          `⚠️ Ваша поездка была автоматически завершена из-за отсутствия GPS данных более ${TRIP_SETTINGS.AUTO_CLOSE_AFTER_HOURS} часов.`
        );
      }
    }

    this.logger.log(`Auto-closed ${staleTrips.length} stale trips`);
  }

  // Каждый час — проверка длинных остановок
  @Cron(CronExpression.EVERY_HOUR)
  async checkLongStops() {
    this.logger.log('Checking for long stops...');

    const longStopThreshold = 30 * 60; // 30 минут

    // Находим открытые остановки > 30 минут
    const longStops = await db.query.tripStops.findMany({
      where: and(
        isNull(tripStops.endedAt),
        eq(tripStops.notificationSent, false)
      ),
      with: {
        trip: {
          with: {
            employee: true,
          },
        },
      },
    });

    for (const stop of longStops) {
      const duration = (Date.now() - new Date(stop.startedAt).getTime()) / 1000;

      if (duration > longStopThreshold && !stop.machineId) {
        // Длинная остановка НЕ у машины — это аномалия
        this.logger.warn(`Long stop detected: ${stop.id}, duration: ${Math.round(duration / 60)} min`);

        // Создаём аномалию (через сервис)
        // await this.tripsService.createAnomaly(...)

        // Отмечаем что уведомление отправлено
        await db.update(tripStops)
          .set({
            notificationSent: true,
            isAnomaly: true,
          })
          .where(eq(tripStops.id, stop.id));
      }
    }
  }
}
```

---

## ЧАСТЬ 6: Checklist внедрения

### Backend:
- [ ] Создать схему таблиц (trips, trip_points, trip_stops, trip_anomalies, etc.)
- [ ] Запустить миграцию `drizzle-kit push`
- [ ] Создать TripsService
- [ ] Создать TripsRouter (tRPC)
- [ ] Создать TripsCronService (автозавершение, проверка аномалий)
- [ ] Добавить WebSocket Gateway для real-time обновлений
- [ ] Интегрировать с существующими tasks и employees

### Frontend:
- [ ] Создать TripTracker виджет
- [ ] Создать TripMap компонент (Leaflet)
- [ ] Создать TripDetails страницу
- [ ] Создать TripsList страницу с фильтрами
- [ ] Создать AnomaliesPanel для админки

### Telegram Bot:
- [ ] Добавить команду /trip для старта/стопа
- [ ] Добавить обработку Live Location
- [ ] Добавить уведомления об аномалиях

### Тестирование:
- [ ] Unit тесты для Haversine расчётов
- [ ] Integration тесты для API
- [ ] E2E тесты для полного цикла поездки

---

## Оценка времени

| Компонент | Часы |
|-----------|------|
| Database Schema + Migrations | 4-5 |
| tRPC API Router | 5-6 |
| TripsService (с GPS логикой) | 8-10 |
| TripTracker Component | 4-5 |
| TripMap + TripDetails | 6-8 |
| Cron Jobs | 2-3 |
| Telegram Bot интеграция | 4-5 |
| WebSocket real-time | 3-4 |
| Тестирование | 5-6 |
| **ИТОГО** | **41-52 часа** |

---

**Готово к реализации!**
