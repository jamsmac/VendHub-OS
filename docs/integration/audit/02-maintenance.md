# Audit: Maintenance + Equipment (cleaning schedule)

> **Дата:** 2026-04-27. **Источник:** Explore-agent + проверка чтением кода.
> **ВАЖНО:** этот аудит был частично скорректирован 2026-04-28 после прямого чтения `maintenance.service.ts:838-893`. См. секцию «Поправки» внизу и `ROADMAP.md §0`.

---

## 1. Equipment модуль — Entities & Endpoints

**Entities:**

- `EquipmentComponent` — id, organizationId, machineId, **componentType** (HOPPER, GRINDER, BREW_UNIT, MIXER + 14 типов), **serialNumber**, manufacturer, model, purchaseDate, warrantyUntil, installedAt, currentHours, lastMaintenanceDate, nextMaintenanceDate, currentLocationType (MACHINE/WAREHOUSE/WASHING/DRYING/REPAIR), maintenanceIntervalDays
- `WashingSchedule` — frequencyDays, machineId, componentId (опционально), lastWashDate, nextWashDate, assignedToUserId, isActive
- `ComponentMaintenance` — maintenanceType (CLEANING, REPAIR, REPLACEMENT...), performedByUserId, performedAt, photoUrls, partsUsed (JSONB)
- `ComponentMovement` — INSTALL/SEND_TO_WASH/RETURN_FROM_WASH location tracking

**Controllers:** `GET/POST /equipment`, `GET/POST /equipment/:id`, `POST /equipment/maintenance`, `GET /equipment/maintenance/history`, `POST /equipment/movements`, `GET /equipment/movements/history` + hopper-types + spare-parts endpoints.

**Связь с Machine:** `equipmentComponent.machineId → machines(id)` FK ✓.

---

## 2. Maintenance модуль — Entities & Workflow

**Entities:**

- `MaintenanceRequest` — full lifecycle: DRAFT → SUBMITTED → APPROVED → REJECTED → SCHEDULED → IN_PROGRESS → AWAITING_PARTS → COMPLETED → VERIFIED → CANCELLED. Поля: requestNumber, maintenanceType (PREVENTIVE/CORRECTIVE/PREDICTIVE/EMERGENCY/CLEANING...), status, priority, machineId, assignedTechnicianId, slaDueDate, slaBreached, photos (before/during/after), workLogs relation.
- `MaintenanceSchedule` — frequencyType (daily/weekly/monthly/quarterly/yearly/hours/sales), frequencyValue, **nextDueDate**, **autoCreateRequest**, notifyDaysBefore, checklistTemplate (JSONB).
- `MaintenancePart` + `MaintenanceWorkLog` — parts tracking & technician hours.

**Controllers (28 endpoints):**

- CRUD: `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`
- Workflow: `POST /:id/submit`, `/approve`, `/reject`, `/assign`, `/start`, `/awaiting-parts`, `/complete`, `/verify`, `/cancel`
- Parts: `POST /:id/parts`, `PUT /:id/parts/:partId`, `DELETE /:id/parts/:partId`
- Work logs: `POST /:id/work-logs`, `PUT /:id/work-logs/:logId`, `DELETE /:id/work-logs/:logId`
- Schedules: `POST/GET schedules`, `PUT/DELETE schedules/:id`
- Stats: `GET /stats`

**Tenant isolation:** все queries фильтруют по organizationId ✓.

---

## 3. Scheduling & Automation

**Cron jobs:**

- `@Cron(CronExpression.EVERY_HOUR)` → `checkScheduledMaintenance()` — ✅ **корректно создаёт `MaintenanceRequest`** при `autoCreateRequest=true && nextDueDate < today`. Обновляет `lastExecutedDate`, `nextDueDate`, `timesExecuted`. (См. `maintenance.service.ts:838-893`.)
- `@Cron("0 0 * * *", { timeZone: "Asia/Tashkent" })` → `checkSlaBreaches()` — отмечает `slaBreached=true` и emit'ит `eventEmitter.emit("maintenance.sla_breached")`.

**Queue:** только `@nestjs/schedule`, BullMQ не использовался.

---

## 4. Admin UI Pages (Next.js)

**Frontend API hooks** (`apps/web/src/lib/api/equipment.ts`):

- `washingSchedulesApi` — getAll, getById, create, update, delete, **complete**
- `maintenanceApi` — все 28 endpoints обёрнуты

**Pages:**

- `/dashboard/equipment` — main
- `/dashboard/equipment/washing/new` — create washing schedule
- `/dashboard/equipment/components/new` — create component
- `/dashboard/equipment/spare-parts/new` — create spare part
- `/dashboard/maintenance` — maintenance main page

---

## 5. Missing Pieces — Critical Gaps (после поправки)

1. ❌ **Нет quick `mark-completed` endpoint** — оператор должен пройти весь workflow `DRAFT→SUBMITTED→APPROVED→SCHEDULED→IN_PROGRESS→COMPLETED→VERIFIED`. Нужен upcut: `POST /maintenance/:id/mark-completed { photos, notes }` для уже SCHEDULED/IN_PROGRESS задачи.
2. ❌ **Telegram Bot интеграции для мойщиков нет** — главный gap по запросу пользователя. Сотрудник видит задачи только в web UI, нет «утреннего dailу-листа в боте».
3. ❌ **SLA breach уведомления** — `checkSlaBreaches()` ставит флаг + emit'ит event, но **listener не подписан**. Менеджер не получает push.
4. ❌ **`MaintenanceSchedule.componentId` отсутствует** — schedule привязана к Machine, но не к конкретному компоненту (гриндер №5 vs кофеварка №3). Невозможно график «мыть гриндер №5 каждые 3 дня».
5. ⚠️ **Нет state dashboard для админа** — `getStats()` есть, но UI overview (сегодня выполнено / просрочено / запланировано на завтра) не построен.

---

## 6. Поправки (2026-04-28)

Аудит-агент изначально утверждал «cron только логирует, не создаёт MaintenanceRequest» и «`autoCreateRequest` флаг игнорируется». **Это ложное findings.** Прямое чтение `maintenance.service.ts:838-893` показывает корректную работу: `find({ where: { isActive: true, autoCreateRequest: true, nextDueDate: LessThan(today) } })` → loop → `this.create(...)` → update schedule. Файл правлен 2026-04-21 (Sprint F).

Auto-generation **не нужно фиксить** (иначе сломаешь работающее). Реальные gap'ы — список выше.

---

## Top 5 actions to launch cleaning schedule

1. **Quick `mark-completed` endpoint** — обновить controller + service + e2e (~3h).
2. **`MaintenanceSchedule.componentId` миграция + service updates** (~3h).
3. **`BotCleaningTasksService`** в `staff/` — daily cron 9:00 AT отправляет staff'у их сегодняшние задачи (~8h).
4. **Bot photo+done flow** — фото → StorageService → MaintenanceRequest.photos → mark-completed (~8h).
5. **SLA breach listener** — push менеджеру + entry в notifications (~3h).

Подробный план — Sprint 2 в `ROADMAP.md`.
