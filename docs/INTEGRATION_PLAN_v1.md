# VendHub OS — Комплексный план интеграции и доработок

> Версия: 1.0 | Дата: 2026-03-20
> Основа: Vercel Ecosystem + VendHub_OS_Full_Spec_v2 + текущее состояние кодовой базы

---

## Резюме

План состоит из **6 фаз** (≈12 спринтов по 2 недели). Каждая фаза самодостаточна — можно деплоить после каждой.

**Текущее состояние:** 72 API модуля, 38+ UI страниц, Railway деплой, CI/CD pipeline.
**Цель:** Full Lifecycle Traceability по спецификации v2 + Vercel для фронтендов + AI-аналитика.

```
Фаза 0: Инфраструктурная подготовка (Vercel + Turborepo)     [2 спринта]
Фаза 1: Фундамент данных (entity_events, batches)            [3 спринта]
Фаза 2: UX-паттерны (мини-паспорт, карточка автомата)         [2 спринта]
Фаза 3: Движки (Calculated State, Alert Rules v2)            [2 спринта]
Фаза 4: AI-интеграция (прогнозы, аномалии, ассистент)        [2 спринта]
Фаза 5: Расширяемость (кастомные поля/вкладки)               [1 спринт]
```

---

## Фаза 0: Инфраструктурная подготовка

**Цель:** Перенести фронтенды на Vercel, улучшить DX, подготовить базу для AI.

### 0.1. Деплой фронтендов на Vercel

**Что:**

- `apps/web` (Next.js admin) → Vercel
- `apps/site` (Next.js landing) → Vercel
- `apps/client` (Vite PWA) → Vercel (static)

**Зачем:**

- Preview URLs для каждого PR (QA без деплоя)
- Edge CDN (latency для UZ инвесторов)
- Бесплатный SSL, автоматический CI
- Speed Insights + Web Analytics

**Изменения в коде:**

```
# apps/web/next.config.js
- output: "standalone"                    # УДАЛИТЬ (Vercel не нужен standalone)
+ // output: "standalone" — только для Railway/Docker

# apps/site/next.config.ts
- output: "standalone"                    # УДАЛИТЬ

# apps/client — добавить vercel.json
+ { "buildCommand": "pnpm build", "outputDirectory": "dist" }
```

**Архитектура деплоя (гибрид):**

```
┌────────────────────────────────┐
│        VERCEL PLATFORM         │
│  web (admin) ─── CDN + Preview │
│  site (landing) ─ CDN + ISR    │
│  client (PWA) ── Static CDN    │
└──────────┬─────────────────────┘
           │ NEXT_PUBLIC_API_URL
           ▼
┌────────────────────────────────┐
│     RAILWAY (Backend)          │
│  api (NestJS) ── 72 модуля    │
│  bot (Telegraf) ── webhook     │
│  PostgreSQL 16 ── managed      │
│  Redis 7 ── managed            │
└────────────────────────────────┘
```

**Шаги:**

1. `vercel link` для каждого фронтенда (3 проекта)
2. Настроить env vars: `NEXT_PUBLIC_API_URL` → Railway API URL
3. Настроить monorepo root directory в Vercel Dashboard
4. Conditional `output: "standalone"` через `process.env.DEPLOY_TARGET`
5. Обновить CI/CD: Railway деплоит только api+bot, Vercel автоматически деплоит фронтенды

**Конфигурация next.config.js (web):**

```javascript
const nextConfig = {
  // Standalone только для Railway/Docker, Vercel не нужен
  ...(process.env.DEPLOY_TARGET === "railway" && { output: "standalone" }),
  // ...остальное без изменений
};
```

### 0.2. Vercel Analytics + Speed Insights

**Что:** Добавить мониторинг производительности фронтендов.

```bash
pnpm --filter @vendhub/web add @vercel/analytics @vercel/speed-insights
pnpm --filter @vendhub/site add @vercel/analytics @vercel/speed-insights
```

**Файлы:**

```typescript
// apps/web/src/app/layout.tsx — добавить в RootLayout
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

// В JSX:
<Analytics />
<SpeedInsights />
```

**Не заменяет** Prometheus/Grafana (бэкенд мониторинг остаётся).

### 0.3. Turborepo Remote Caching

**Что:** Включить remote cache для ускорения CI/CD.

```bash
# В корне проекта
npx turbo login
npx turbo link
```

**Эффект:** Повторные сборки пакетов, не изменившихся между PR, берутся из кэша (~40-60% ускорение CI).

### 0.4. Подготовка к AI Gateway

**Что:** Создать Vercel-проект для AI Gateway OIDC, подготовить env vars.

```bash
vercel link                          # Привязать к Vercel проекту
vercel env pull .env.local           # Получить OIDC credentials
```

**Новые env vars (apps/api):**

```env
# AI Gateway (для Фазы 4)
AI_GATEWAY_ENABLED=false             # Включится в Фазе 4
VERCEL_OIDC_TOKEN=                   # Автоматически через vercel env pull
```

---

## Фаза 1: Фундамент данных

**Цель:** Реализовать ядро спецификации v2 — единую ленту событий и партионный учёт.

### 1.1. entity_events — Единая лента событий

**Текущее состояние:** AuditLog с 20+ action types, но:

- Разные сущности логируются в разные таблицы
- Нет единого timeline view
- Нет типизации событий по спецификации (30 event types)

**Что создать:**

```
apps/api/src/modules/entity-events/
├── entity-events.module.ts
├── entity-events.controller.ts        # GET /api/v1/entity-events?entityId=...&type=...
├── entity-events.service.ts           # createEvent(), getTimeline(), getEntityHistory()
├── dto/
│   ├── create-entity-event.dto.ts
│   └── query-entity-events.dto.ts
└── entities/
    └── entity-event.entity.ts
```

**Entity (по спецификации 7.2):**

```typescript
@Entity("entity_events")
export class EntityEvent extends BaseEntity {
  @Column({ type: "uuid" })
  entityId: string;

  @Column({ type: "varchar", length: 50 })
  entityType: string; // machine, bunker, mixer, ingredient_batch, etc.

  @Column({ type: "enum", enum: EventType })
  eventType: EventType; // 30 типов из спецификации раздел 2.2

  @Column({ type: "timestamp" })
  eventDate: Date;

  @Column({ type: "uuid" })
  performedBy: string;

  @Column({ type: "uuid", nullable: true })
  relatedEntityId: string | null;

  @Column({ type: "uuid", nullable: true })
  relatedEventId: string | null;

  @Column({ type: "decimal", nullable: true })
  quantity: number | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  documentNumber: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", nullable: true })
  photos: string[] | null;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, any>;
}
```

**EventType enum (в @vendhub/shared):**

```typescript
export enum EntityEventType {
  CONTRACT_SIGNED = "contract_signed",
  PAYMENT_MADE = "payment_made",
  SHIPPED = "shipped",
  CUSTOMS_CLEARED = "customs_cleared",
  RECEIVED_AT_WAREHOUSE = "received_at_warehouse",
  QUALITY_CHECKED = "quality_checked",
  CONFIGURED = "configured",
  ISSUED_FROM_WAREHOUSE = "issued_from_warehouse",
  LOADED_TO_BUNKER = "loaded_to_bunker",
  BUNKER_MIXED = "bunker_mixed",
  INSTALLED_IN_MACHINE = "installed_in_machine",
  REMOVED_FROM_MACHINE = "removed_from_machine",
  LOADED_TO_SLOT = "loaded_to_slot",
  SOLD = "sold",
  ENCASHMENT = "encashment",
  REFILLED = "refilled",
  CLEANING_DAILY = "cleaning_daily",
  CLEANING_DEEP = "cleaning_deep",
  CLEANING_FULL = "cleaning_full",
  FLUSH_CYCLE = "flush_cycle",
  MAINTENANCE_SCHEDULED = "maintenance_scheduled",
  MAINTENANCE_UNSCHEDULED = "maintenance_unscheduled",
  SPARE_PART_REPLACED = "spare_part_replaced",
  RELOCATED = "relocated",
  DEACTIVATED = "deactivated",
  REACTIVATED = "reactivated",
  INVENTORY_CHECK = "inventory_check",
  WRITTEN_OFF = "written_off",
  TRANSFERRED_TO_OPERATOR = "transferred_to_operator",
  RETURNED_FROM_OPERATOR = "returned_from_operator",
}
```

**Интеграция:** Существующий AuditLog продолжает работать. EntityEvents — бизнес-события (не технический аудит). Сервисы других модулей вызывают `entityEventsService.createEvent()` при бизнес-действиях.

### 1.2. batches — Партионный учёт

**Текущее состояние:** Inventory module есть, но без партий (LOT-номеров), без отслеживания движения.

**Что создать:**

```
apps/api/src/modules/batches/
├── batches.module.ts
├── batches.controller.ts              # CRUD + движение
├── batches.service.ts                 # createBatch(), issueBatch(), loadToBunker()
├── dto/
│   ├── create-batch.dto.ts
│   ├── issue-batch.dto.ts
│   └── query-batches.dto.ts
└── entities/
    ├── batch.entity.ts                # По спецификации 7.3
    └── batch-movement.entity.ts       # По спецификации 7.4
```

**Batch entity (по спецификации 7.3):**

```typescript
@Entity("batches")
export class Batch extends BaseEntity {
  @Column({ type: "uuid" })
  entityId: string; // Запись в entity_registry (если внедрим) или null

  @Column({ type: "varchar", length: 50, unique: true })
  batchNumber: string; // LOT-2026-0042

  @Column({ type: "uuid" })
  itemTypeId: string; // FK → item_types (справочник номенклатуры)

  @Column({ type: "uuid" })
  supplierId: string; // FK → counterparties

  @Column({ type: "uuid", nullable: true })
  contractId: string | null;

  @Column({ type: "decimal" })
  quantityReceived: number;

  @Column({ type: "decimal" })
  quantityRemaining: number;

  @Column({ type: "enum", enum: BatchUnit })
  unit: BatchUnit; // kg, g, ml, l, pcs

  @Column({ type: "decimal" })
  unitCost: number;

  @Column({ type: "date", nullable: true })
  expiryDate: Date | null;

  @Column({ type: "date" })
  receivedDate: Date;

  @Column({ type: "uuid" })
  receivedBy: string;

  @Column({ type: "enum", enum: BatchStatus })
  status: BatchStatus; // in_stock, partially_used, depleted, expired, written_off

  @Column({ type: "uuid" })
  organizationId: string; // Multi-tenant!
}
```

**BatchMovement entity (по спецификации 7.4):**

```typescript
@Entity("batch_movements")
export class BatchMovement extends BaseEntity {
  @Column({ type: "uuid" })
  batchId: string;

  @Column({ type: "uuid", nullable: true })
  eventId: string | null; // FK → entity_events

  @Column({ type: "enum", enum: MovementType })
  movementType: MovementType; // issue, load, consume, return, write_off, mix

  @Column({ type: "decimal" })
  quantity: number;

  @Column({ type: "uuid", nullable: true })
  bunkerId: string | null;

  @Column({ type: "uuid", nullable: true })
  machineId: string | null;

  @Column({ type: "uuid", nullable: true })
  mixedWithBatchId: string | null;

  @Column({ type: "jsonb", nullable: true })
  mixRatio: Record<string, number> | null;

  @Column({ type: "uuid" })
  performedBy: string;

  @Column({ type: "uuid" })
  organizationId: string;
}
```

**Автогенерация LOT-номеров:**

```typescript
// batches.service.ts
async generateBatchNumber(type: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = BATCH_PREFIXES[type]; // LOT, SPR, CON, CLN
  const count = await this.batchRepo.count({
    where: { batchNumber: Like(`${prefix}-${year}-%`) }
  });
  return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
}
```

### 1.3. sale_ingredients — Себестоимость по партиям

**Текущее состояние:** TransactionItem есть, но без привязки к партиям.

**Что создать:**

```typescript
// Новая entity: apps/api/src/modules/sales/entities/sale-ingredient.entity.ts
@Entity("sale_ingredients")
export class SaleIngredient extends BaseEntity {
  @Column({ type: "uuid" })
  saleId: string; // FK → transactions

  @Column({ type: "uuid" })
  ingredientTypeId: string; // FK → item_types

  @Column({ type: "uuid" })
  batchId: string; // FK → batches (конкретная партия!)

  @Column({ type: "uuid", nullable: true })
  bunkerId: string | null;

  @Column({ type: "decimal" })
  quantityUsed: number; // граммы/мл

  @Column({ type: "decimal" })
  unitCostAtTime: number; // Цена за единицу на момент продажи

  @Column({ type: "decimal" })
  costTotal: number; // quantityUsed * unitCostAtTime

  @Column({ type: "uuid" })
  organizationId: string;
}
```

**Ценность:** Каждая чашка кофе = реальная себестоимость по ценам конкретных партий. P&L по автомату точный.

### 1.4. item_types — Справочник номенклатуры

**Текущее состояние:** Частично есть в products. Но нет отдельного справочника для ингредиентов, расходников, запчастей.

**Что создать:**

```typescript
@Entity("item_types")
export class ItemType extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string; // Кофе зерновой, Сухое молоко, Стакан 180мл

  @Column({ type: "enum", enum: ItemCategory })
  category: ItemCategory; // ingredient, resale, spare_part, consumable, cleaning

  @Column({ type: "enum", enum: MeasurementUnit })
  unit: MeasurementUnit; // kg, g, ml, l, pcs

  @Column({ type: "varchar", length: 100, nullable: true })
  sku: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, any>;

  @Column({ type: "uuid" })
  organizationId: string;
}
```

### 1.5. Миграции

Все новые таблицы создаются одной миграцией:

```
src/database/migrations/YYYYMMDDHHMMSS-AddLifecycleTraceability.ts
```

Таблицы: `item_types`, `batches`, `batch_movements`, `entity_events`, `sale_ingredients`.
Индексы: составные по `(organization_id, entity_type, event_date)`, `(batch_id, movement_type)`.

---

## Фаза 2: UX-паттерны

**Цель:** Реализовать ключевые UI-паттерны из спецификации v2.

### 2.1. Мини-паспорт (EntityPassport)

**Текущее состояние:** `SlideOver` компонент уже есть. Нужно создать обёртку.

**Что создать:**

```
apps/web/src/components/entity-passport/
├── EntityPassport.tsx          # Обёртка над SlideOver
├── EntityPassportHeader.tsx    # Код, название, статус бейдж
├── EntityPassportTimeline.tsx  # Последние 10 событий
├── EntityPassportLink.tsx      # Кликабельная ссылка на сущность (inline)
└── useEntityPassport.ts        # Хук: open/close, загрузка данных
```

**Паттерн использования:**

```tsx
// В любом месте интерфейса:
<EntityPassportLink entityId={machine.id} entityType="machine">
  {machine.code}
</EntityPassportLink>

// EntityPassportLink при клике открывает SlideOver с:
// - Заголовок: KIUT-01, Кофейный автомат, ● Активен
// - Краткие данные: локация, оператор, последняя активность
// - Последние 10 событий из entity_events
// - Кнопка "Открыть полную карточку"
```

### 2.2. Карточка автомата — 8 вкладок

**Текущее состояние:** Страница `/dashboard/machines/[id]` есть, но не по спецификации v2.

**Переработать:**

```
apps/web/src/app/dashboard/machines/[id]/
├── page.tsx                    # Шапка (всегда видна) + TabsLayout
├── tabs/
│   ├── PassportTab.tsx         # 4.1 — Приобретение, Техданные, Владение
│   ├── ContentsTab.tsx         # 4.2 — Бункеры, Компоненты, Доп.оборудование
│   ├── AnalyticsTab.tsx        # 4.3 — 4 подвкладки: Продажи, Состояние, Динамика, Экономика
│   ├── EncashmentTab.tsx       # 4.4 — Инкассации, сверка
│   ├── MaintenanceTab.tsx      # 4.5 — Чистки, ТО, Ремонты, Замены
│   ├── LocationsTab.tsx        # 4.6 — Текущая + история перемещений
│   ├── TasksTab.tsx            # 4.7 — Активные, просроченные, завершённые
│   └── TimelineTab.tsx         # 4.8 — Лента событий из entity_events
└── components/
    ├── MachineHeader.tsx       # Несменяемый блок: код, статус, оператор, кнопки
    ├── BunkerCard.tsx          # Карточка бункера с прогресс-баром
    ├── ComponentCard.tsx       # Миксер/гриндер со счётчиком циклов
    └── CompletionProgress.tsx  # "Заполнено 8 из 14 полей"
```

**Шапка (MachineHeader) — всегда видна:**

```tsx
<div className="sticky top-0 z-10 bg-background border-b p-4">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold">{machine.code}</h1>
      <p className="text-muted-foreground">{machine.name}</p>
    </div>
    <StatusBadge status={machine.status} />
  </div>
  <div className="flex gap-2 mt-3">
    <Button size="sm">Инкассация</Button>
    <Button size="sm">Загрузить</Button>
    <Button size="sm">+ Задача</Button>
    <Button size="sm" variant="outline">
      Редактировать
    </Button>
  </div>
  <CompletionProgress filled={8} total={14} className="mt-2" />
</div>
```

### 2.3. Расширение DirectorySelect

**Текущее состояние:** `DirectorySelect` уже поддерживает inline create. Но:

- Только для directories
- Нет универсальности для любого справочника

**Что сделать:** Создать универсальный `InlineCreateSelect` на базе `DirectorySelect`:

```tsx
// apps/web/src/components/forms/InlineCreateSelect.tsx
interface InlineCreateSelectProps<T> {
  label: string;
  endpoint: string; // /api/v1/counterparties, /api/v1/locations, etc.
  searchField?: string; // Поле для поиска (default: 'name')
  displayField?: string; // Поле для отображения (default: 'name')
  value: string | null;
  onChange: (id: string) => void;
  createFields?: FormFieldConfig[]; // Поля мини-формы создания
  allowCreate?: boolean;
}
```

### 2.4. Карточка товара (Product)

**По спецификации v2 раздел 5:**

```
apps/web/src/app/dashboard/products/[id]/
├── page.tsx
├── tabs/
│   ├── GeneralTab.tsx         # 5.1 — Общие поля, InlineCreateSelect
│   ├── RecipeTab.tsx          # 5.2 — Конструктор рецепта (CRUD строк)
│   ├── RecipeVersionsTab.tsx  # 5.2 — Версии рецепта, сравнение side-by-side
│   ├── PurchasesTab.tsx       # 5.3 — Партии (для resale)
│   ├── AnalyticsTab.tsx       # Продажи, маржа, топ автоматов
│   └── TimelineTab.tsx        # Лента событий
```

**Конструктор рецепта:**

```tsx
// RecipeTab.tsx — CRUD таблица ингредиентов
<DataTable
  columns={[
    { header: "Ингредиент", cell: (row) => (
      <InlineCreateSelect endpoint="/api/v1/item-types" value={row.itemTypeId} />
    )},
    { header: "Расход на порцию", cell: (row) => <Input type="number" /> },
    { header: "Единица", cell: (row) => <Select options={units} /> },
    { header: "Опциональный", cell: (row) => <Checkbox /> },
  ]}
  data={recipe.ingredients}
  onAdd={() => addIngredient()}
  onRemove={(id) => removeIngredient(id)}
/>
<div className="mt-4 p-4 bg-muted rounded">
  Себестоимость: {formatCurrency(calculatedCost)} сум |
  Прибыль: {formatCurrency(product.salePrice - calculatedCost)} сум |
  Маржа: {((1 - calculatedCost / product.salePrice) * 100).toFixed(1)}%
</div>
```

---

## Фаза 3: Движки

**Цель:** Calculated State Engine + улучшенный Alert Rules Engine.

### 3.1. Calculated State Engine

**Что это:** Расчёт состояния автомата из фактов (продажи × рецепты + загрузки). Нет телеметрии — всё математика.

**API сервис:**

```
apps/api/src/modules/calculated-state/
├── calculated-state.module.ts
├── calculated-state.service.ts
├── calculators/
│   ├── bunker-level.calculator.ts     # Остаток = Загружено − (Продажи × Расход)
│   ├── component-cycles.calculator.ts  # Циклы = кол-во продаж с последнего сброса
│   ├── consumable-level.calculator.ts  # Стаканы = загружено − продано
│   ├── cleaning-schedule.calculator.ts # Дней/чашек с последней чистки
│   └── forecast.calculator.ts          # Прогноз исчерпания (текущий темп)
└── dto/
    └── machine-state.dto.ts
```

**Ключевая формула (bunker-level):**

```typescript
async calculateBunkerLevel(bunkerId: string): Promise<BunkerLevel> {
  // 1. Последняя загрузка
  const lastLoad = await this.batchMovementRepo.findOne({
    where: { bunkerId, movementType: 'load' },
    order: { createdAt: 'DESC' },
  });

  // 2. Все продажи с этого бункера после загрузки
  const sales = await this.saleIngredientRepo.find({
    where: {
      bunkerId,
      createdAt: MoreThan(lastLoad.createdAt),
    },
  });

  // 3. Расчёт
  const totalUsed = sales.reduce((sum, s) => sum + Number(s.quantityUsed), 0);
  const remaining = Number(lastLoad.quantity) - totalUsed;
  const avgDailyUsage = totalUsed / daysSinceLoad;
  const daysUntilEmpty = remaining / avgDailyUsage;

  return { remaining, percentFull, daysUntilEmpty, portionsLeft };
}
```

**Кэширование:** Результат кэшируется в Redis (TTL 5 минут). Инвалидируется при новой продаже или загрузке.

### 3.2. Alert Rules Engine v2

**Текущее состояние:** Alert rules engine уже есть с metric-based triggering. Нужно расширить.

**Дополнить:**

```typescript
// Новые типы правил по спецификации 4.10:
export enum AlertRuleType {
  // Существующие
  LOW_STOCK = "low_stock",
  // Новые из спецификации:
  COMPONENT_CYCLES = "component_cycles", // Миксер > 200 циклов
  FLUSH_DUE = "flush_due", // Чашек с промывки > 50
  CLEANING_DUE = "cleaning_due", // Дней с глубокой чистки > 7
  EXPIRY_WARNING = "expiry_warning", // Срок годности < 7 дней
  INVENTORY_MISMATCH = "inventory_mismatch", // Расхождение > допуска
  CONSUMABLE_LOW = "consumable_low", // Стаканы < порога
}
```

**Интеграция с Calculated State:**

```typescript
@Cron('*/15 * * * *') // Каждые 15 минут
async evaluateAlertRules() {
  const machines = await this.machineService.findAllActive();
  for (const machine of machines) {
    const state = await this.calculatedStateService.getMachineState(machine.id);
    const rules = await this.alertRuleRepo.find({ where: { isActive: true } });

    for (const rule of rules) {
      if (this.isTriggered(rule, state)) {
        await this.createTaskOrNotification(rule, machine, state);
      }
    }
  }
}
```

**Telegram-уведомления:** Используем существующий bot через BullMQ queue `notifications`.

### 3.3. P&L по автомату

**Endpoint:** `GET /api/v1/machines/:id/pnl?from=2026-01-01&to=2026-03-20`

```typescript
interface MachinePnL {
  revenue: number; // Сумма продаж
  costOfGoods: number; // Себестоимость (из sale_ingredients!)
  grossProfit: number; // revenue - costOfGoods
  rentCost: number; // Аренда локации
  maintenanceCost: number; // ТО + ремонты + запчасти
  cleaningCost: number; // Чистящие средства
  operatingExpenses: number; // rent + maintenance + cleaning
  netProfit: number; // grossProfit - operatingExpenses
  margin: number; // netProfit / revenue * 100
  roi: number; // Суммарная прибыль / Стоимость автомата
  paybackDaysRemaining: number | null;
}
```

---

## Фаза 4: AI-интеграция

**Цель:** Добавить AI-аналитику через Vercel AI Gateway.

### 4.1. AI Service (Backend)

**Что создать:**

```
apps/api/src/modules/ai/
├── ai.module.ts
├── ai.service.ts              # Обёртка над AI SDK
├── ai.controller.ts           # Endpoints для AI-запросов
├── prompts/
│   ├── sales-analysis.ts      # Промпт анализа продаж
│   ├── anomaly-detection.ts   # Промпт детекции аномалий
│   ├── forecast.ts            # Промпт прогнозирования
│   └── operator-assistant.ts  # Промпт для бота-ассистента
└── dto/
    ├── ai-analysis-request.dto.ts
    └── ai-analysis-response.dto.ts
```

**Зависимости:**

```bash
pnpm --filter @vendhub/api add ai @ai-sdk/gateway
```

**AI Service:**

```typescript
import { generateText, streamText } from "ai";

@Injectable()
export class AiService {
  async analyzeSales(machineId: string, period: string): Promise<string> {
    const salesData = await this.salesService.getAggregated(machineId, period);
    const machineState =
      await this.calculatedStateService.getMachineState(machineId);

    const result = await generateText({
      model: "anthropic/claude-sonnet-4.6", // Через AI Gateway
      system: "Ты аналитик системы вендинг-автоматов VendHub в Узбекистане...",
      prompt: `Проанализируй данные: ${JSON.stringify({ salesData, machineState })}`,
    });

    return result.text;
  }

  async detectAnomalies(organizationId: string): Promise<AnomalyReport> {
    const metrics = await this.dashboardService.getOrgMetrics(organizationId);

    const result = await generateText({
      model: "anthropic/claude-sonnet-4.6",
      output: Output.object({ schema: anomalyReportSchema }), // Типизированный ответ
      prompt: `Найди аномалии в метриках за последние 7 дней: ${JSON.stringify(metrics)}`,
    });

    return result.object;
  }

  async forecastIngredient(bunkerId: string): Promise<ForecastResult> {
    // Прогноз на основе исторических данных + сезонности
    const history = await this.salesService.getDailyHistory(bunkerId, 30);

    const result = await generateText({
      model: "anthropic/claude-sonnet-4.6",
      output: Output.object({ schema: forecastSchema }),
      prompt: `Спрогнозируй расход ингредиента на 7 дней: ${JSON.stringify(history)}`,
    });

    return result.object;
  }
}
```

### 4.2. AI Dashboard Widget

**На странице дашборда:**

```tsx
// apps/web/src/app/dashboard/(overview)/components/AiInsightsCard.tsx
export function AiInsightsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: () => api.get("/ai/daily-insights"),
    staleTime: 1000 * 60 * 30, // 30 минут
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Инсайты
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton />
        ) : (
          <div className="space-y-3">
            {data.insights.map((insight) => (
              <InsightItem key={insight.id} {...insight} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4.3. AI-ассистент в Telegram боте

**Расширить Telegraf бот:**

```typescript
// apps/bot/src/handlers/ai-assistant.handler.ts
bot.command("ask", async (ctx) => {
  const question = ctx.message.text.replace("/ask ", "");
  const user = await getUserFromTelegram(ctx.from.id);

  const response = await aiService.operatorAssistant({
    question,
    userId: user.id,
    organizationId: user.organizationId,
    // Контекст: какие автоматы назначены, текущие задачи, остатки
  });

  await ctx.reply(response.text, { parse_mode: "Markdown" });
});
```

**Примеры запросов:**

- "Что загрузить на KIUT-01?" → AI смотрит остатки, отвечает список
- "Какие автоматы требуют внимания?" → AI анализирует alerts + метрики
- "Продажи за неделю" → AI генерирует текстовый отчёт

### 4.4. AI для отчётов

**Endpoint:** `GET /api/v1/reports/:type/ai-summary`

AI генерирует текстовое резюме к любому отчёту:

- Дневной отчёт → "Продажи выросли на 12% (вт-ср). KIUT-03 показал аномально низкие продажи — возможна неисправность."
- P&L отчёт → "Маржа упала с 45% до 38% из-за роста цен на кофе (партия LOT-2026-0089). Рекомендуется пересмотреть цены или сменить поставщика."

---

## Фаза 5: Расширяемость

**Цель:** Кастомные поля и вкладки по спецификации v2 раздел 6.5 + 7.8.

### 5.1. entity_custom_fields + entity_custom_tabs

**Что создать:**

```
apps/api/src/modules/custom-fields/
├── custom-fields.module.ts
├── custom-fields.controller.ts     # CRUD для полей и вкладок
├── custom-fields.service.ts
└── entities/
    ├── entity-custom-field.entity.ts
    └── entity-custom-tab.entity.ts
```

**Entities:**

```typescript
@Entity("entity_custom_tabs")
export class EntityCustomTab extends BaseEntity {
  @Column({ type: "varchar", length: 50 })
  entityType: string; // machine, product, batch

  @Column({ type: "varchar", length: 100 })
  tabName: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  tabIcon: string | null;

  @Column({ type: "int", default: 100 })
  sortOrder: number;

  @Column({ type: "jsonb", default: [] })
  visibilityRoles: string[]; // ['owner', 'admin', 'manager']

  @Column({ type: "uuid" })
  organizationId: string;
}

@Entity("entity_custom_fields")
export class EntityCustomField extends BaseEntity {
  @Column({ type: "varchar", length: 50 })
  entityType: string;

  @Column({ type: "varchar", length: 100 })
  fieldName: string;

  @Column({ type: "enum", enum: CustomFieldType })
  fieldType: CustomFieldType; // text, number, date, select, file

  @Column({ type: "varchar", length: 100, nullable: true })
  tabName: string | null; // На какой вкладке показывать

  @Column({ type: "boolean", default: false })
  isRequired: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder: number;

  @Column({ type: "jsonb", nullable: true })
  optionsJson: string[] | null; // Для select: варианты выбора

  @Column({ type: "uuid" })
  organizationId: string;
}
```

**Значения** хранятся в `metadata` (JSONB) основной сущности — по спецификации.

### 5.2. UI компонент для кастомных полей

```tsx
// apps/web/src/components/custom-fields/CustomFieldsRenderer.tsx
export function CustomFieldsRenderer({
  entityType,
  entityId,
  tabName,
}: {
  entityType: string;
  entityId: string;
  tabName?: string;
}) {
  const { data: fields } = useQuery({
    queryKey: ["custom-fields", entityType, tabName],
    queryFn: () =>
      api.get(`/custom-fields?entityType=${entityType}&tabName=${tabName}`),
  });

  return (
    <div className="space-y-4">
      {fields?.map((field) => (
        <CustomFieldInput key={field.id} field={field} entityId={entityId} />
      ))}
    </div>
  );
}
```

### 5.3. Admin UI для управления полями

```
apps/web/src/app/dashboard/settings/custom-fields/
├── page.tsx           # Список кастомных полей и вкладок по entity types
├── [entityType]/
│   └── page.tsx       # Поля и вкладки для конкретного типа
```

---

## Сводная таблица: Vercel Ecosystem интеграции

| Vercel продукт               | Фаза | Как используется                          | Приоритет               |
| ---------------------------- | ---- | ----------------------------------------- | ----------------------- |
| **Vercel Platform (deploy)** | 0    | Деплой web, site, client                  | Высокий                 |
| **Preview URLs**             | 0    | QA каждого PR                             | Высокий                 |
| **Vercel Analytics**         | 0    | Web analytics для admin+landing           | Средний                 |
| **Speed Insights**           | 0    | Core Web Vitals мониторинг                | Средний                 |
| **Turborepo Remote Cache**   | 0    | Ускорение CI на 40-60%                    | Средний                 |
| **AI Gateway**               | 4    | Маршрутизация AI запросов (OIDC auth)     | Средний                 |
| **AI SDK v6**                | 4    | generateText/streamText для аналитики     | Средний                 |
| **Edge Config**              | 5    | Feature flags для custom fields toggle    | Низкий                  |
| **Vercel Blob**              | —    | Фото (если уйти от MinIO)                 | Опционально             |
| **Neon Postgres**            | —    | Замена self-hosted (если уйти от Railway) | Не рекомендуется сейчас |
| **Upstash Redis**            | —    | Замена self-hosted (если уйти от Railway) | Не рекомендуется сейчас |

## Что НЕ интегрируем из Vercel (и почему)

| Vercel продукт     | Почему НЕ используем                                   |
| ------------------ | ------------------------------------------------------ |
| Vercel Functions   | NestJS = 72 модуля, не serverless                      |
| Vercel Queues      | BullMQ + Redis уже настроен, глубоко интегрирован      |
| Workflow DevKit    | BullMQ + @nestjs/schedule покрывают задачи             |
| Clerk Auth         | 7 кастомных ролей + OrgGuard + TOTP — Clerk не покроет |
| Chat SDK           | Telegraf бот уже написан, Slack/Teams не нужны         |
| Neon Postgres      | Railway Managed Postgres работает, миграция рискованна |
| Routing Middleware | Next.js proxy не нужен — API на отдельном домене       |
| Vercel Firewall    | Railway/K8s имеют свою защиту + Nginx rate limiting    |

---

## Зависимости между фазами

```
Фаза 0 ─────────────────────── (параллельно с любой фазой)
         │
Фаза 1 ──┤ entity_events + batches + sale_ingredients
         │         │
         │   Фаза 2 ──┤ UX: мини-паспорт, карточки (зависит от entity_events)
         │            │
         │      Фаза 3 ──┤ Движки (зависит от batches + entity_events)
         │               │
         │         Фаза 4 ──┤ AI (зависит от calculated state данных)
         │
Фаза 5 ─────────────────────── (независима, можно параллельно с 3-4)
```

**Фаза 0 можно начать прямо сейчас** — она не зависит от остальных и даёт немедленную пользу (Preview URLs, Analytics, быстрый CI).

---

## Метрики успеха

| Метрика                  | Текущее                | После всех фаз        |
| ------------------------ | ---------------------- | --------------------- |
| Покрытие спецификации v2 | ~40%                   | ~95%                  |
| Время деплоя фронтенда   | ~5 мин (Railway build) | ~1 мин (Vercel)       |
| Preview URLs для QA      | Нет                    | Каждый PR             |
| CI/CD время              | ~8 мин                 | ~5 мин (remote cache) |
| Себестоимость чашки      | Примерная              | Точная (по партиям)   |
| Прогноз исчерпания       | Нет                    | AI-прогноз на 7 дней  |
| Кастомные поля           | Нет                    | CRUD для admin        |
| Карточка автомата        | 3 вкладки              | 8+ вкладок            |
| AI-инсайты               | Нет                    | Дашборд + Telegram    |
