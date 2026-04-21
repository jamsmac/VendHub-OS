# OLMA Inventory Platform — Production Spec for Claude Code

**Версия:** 1.0
**Дата:** 21 апреля 2026
**Автор:** Jamshid (OLMA, GLOBERENT, VendHub)
**Целевая платформа:** Cloud-hosted (Supabase + Vercel), доступ 24/7, multi-user

---

## 0. Как использовать этот документ

Этот документ — **полное техническое задание** для Claude Code на разработку production-версии OLMA Inventory Platform. Он основан на рабочем прототипе (`olma.html`, 4984 строки, ~220 КБ, vanilla JS + localStorage), который уже доказал бизнес-логику в пилоте.

**Claude Code должен:**

1. Прочитать разделы 1–5 для понимания контекста и целей
2. Использовать разделы 6–10 как авторитативную спецификацию БД, API и UI
3. Следовать этапам реализации из раздела 11
4. Свериться с артефактом-референсом `olma.html` для UX-деталей (приложен отдельно)

**Что НЕ нужно делать:**

- Не переизобретать бизнес-логику — она отработана в пилоте
- Не менять дизайн-систему Warm Brew без согласования
- Не упрощать структуру БД — все таблицы нужны
- Не выкидывать multi-level дедупликацию импорта продаж — это критично

---

## 1. Executive Summary

**OLMA Inventory Platform** — специализированная SaaS-платформа учёта товаров для сетей вендинговых автоматов и resale-бизнесов в Центральной Азии. Первый клиент — собственная сеть Jamshid'а (Ice Drink + Snack автоматы на площадке OLMA), далее масштабирование на клиентов GLOBERENT и VendHub.

**Ключевая ценность:**

- Полная прослеживаемость товара от закупки до продажи
- Автоматический импорт отчётов вендинговых автоматов (HICON, Multikassa, Click, Payme) с умной дедупликацией
- Сверка остатков с расчётом недостачи в сум
- Мобильный UX — основной интерфейс работает на iPhone (PWA + нативный мобильный сайт)

**Текущее состояние:**

- Работающий прототип-артефакт (HTML/JS, ~220 КБ, все функции локально)
- Протестирован на реальном ассортименте OLMA (40 SKU, 2 автомата)
- Реальный отчёт HICON распарсен и обработан корректно
- Логика дедупликации верифицирована симуляцией: дубли=0, delta-обновления=ок

**Цель этапа:**
Перенести в полноценную облачную инфраструктуру с синхронизацией между устройствами, ролевой моделью, публичным доступом арендатора и готовностью к масштабированию на десятки клиентов.

---

## 2. Стек и инфраструктура

### 2.1 Обязательный стек

```yaml
Frontend:
  framework: Next.js 14 (App Router)
  language: TypeScript strict mode
  ui_library: shadcn/ui (Radix UI + Tailwind)
  state: Zustand (глобальное) + TanStack Query (серверное)
  forms: react-hook-form + Zod
  charts: Recharts
  icons: Lucide React
  animations: Framer Motion (сдержанно)

Backend:
  api: tRPC v11 (type-safe RPC)
  validation: Zod
  runtime: Node.js 20+ LTS
  deployment: Vercel (serverless functions)

Database:
  type: PostgreSQL 15+
  host: Supabase (managed)
  orm: Drizzle ORM
  migrations: drizzle-kit
  backup: Supabase automated daily

Auth:
  provider: Supabase Auth
  methods: email+password, Google OAuth, (потом: Telegram WebApp)
  tokens: JWT через Supabase SDK

Storage:
  files: Supabase Storage (CSV импорты, бэкапы JSON, фото чеков)

Realtime:
  sync: Supabase Realtime (Postgres changes)
  channels: per-tenant isolation

External_APIs:
  xlsx_parsing: sheetjs (server-side)
  date: date-fns
  utils: lodash (точечно)

Mobile_Capabilities:
  pwa: next-pwa
  icons: правильные apple-touch-icon для iOS
  offline: Service Worker с фоновой синхронизацией операций
```

### 2.2 Запрещённый стек

- **НЕ использовать Redux** — избыточно для этой задачи
- **НЕ использовать Prisma** — Drizzle быстрее и типобезопаснее
- **НЕ использовать MUI / Ant Design / Chakra** — только shadcn/ui
- **НЕ использовать Firebase** — только Supabase
- **НЕ использовать Next.js Pages Router** — только App Router
- **НЕ хранить бизнес-логику в client components** — всё через tRPC

### 2.3 Инфраструктурная схема

```
┌───────────────────────────────────────────────────────────┐
│                        USERS                              │
│  Admin (iPhone)   Operator (iPhone)   Tenant (web)        │
└──────┬────────────────┬────────────────┬──────────────────┘
       │                │                │
       ▼                ▼                ▼
┌───────────────────────────────────────────────────────────┐
│                   Next.js App (Vercel)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ /admin      │  │ /operator    │  │ /tenant/[slug]   │  │
│  │ (full PWA)  │  │ (mobile)     │  │ (public)         │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
│         └────────────────┼──────────────────┘             │
│                          ▼                                │
│              ┌──────────────────────┐                     │
│              │  tRPC API Router     │                     │
│              │  + Zod validation    │                     │
│              │  + Auth guard        │                     │
│              │  + Tenant scoping    │                     │
│              └──────────┬───────────┘                     │
└─────────────────────────┼─────────────────────────────────┘
                          ▼
┌───────────────────────────────────────────────────────────┐
│                    Supabase                               │
│  ┌────────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐  │
│  │ PostgreSQL │  │  Auth   │  │ Storage  │  │ Realtime │  │
│  │ + RLS      │  │         │  │          │  │          │  │
│  └────────────┘  └─────────┘  └──────────┘  └──────────┘  │
└───────────────────────────────────────────────────────────┘
```

### 2.4 Среды

```
dev       — локальная разработка, локальный Supabase
staging   — Vercel preview branch + Supabase staging project
production — Vercel production + Supabase production project
```

---

## 3. Фундаментальные принципы

### 3.1 Multi-tenancy от первого коммита

С первого дня всё в системе принадлежит `organization_id`. Это не отдельная функция — это **закон**.

**Почему:** Jamshid планирует продавать систему GLOBERENT-клиентам и другим vend-сетям. Без изначально построенной multi-tenancy миграция позже = переписать 80% кода.

**Как:**

- Все таблицы (кроме самого `organizations`) имеют `organization_id` NOT NULL
- Все tRPC-процедуры автоматически скопированы tenant-id'ом пользователя через middleware
- Все запросы Drizzle обязательно включают `WHERE organization_id = ctx.orgId`
- Row Level Security (RLS) в PostgreSQL как дополнительная защита

### 3.2 Event Sourcing для критичных данных

Все изменения остатков — через **immutable `stock_movements`** записи. Нельзя просто обновить `balance`. Нужно создать движение, и таблица `inventory_balances` пересчитывается триггером.

**Почему:** Это даёт полный аудит "куда делись 15 Кока-кол". Любую недостачу можно расследовать.

**Типы движений:**

```
PURCHASE_IN          — приход от поставщика на склад
TRANSFER_TO_STORAGE  — склад → хранилище у автомата
TRANSFER_TO_MACHINE  — склад/хранилище → автомат (заправка)
TRANSFER_BACK        — автомат → склад (возврат неиспользованного)
SALE                 — продажа с автомата
WRITE_OFF            — списание (просрочка, порча)
ADJUSTMENT_PLUS      — корректировка после сверки (нашли больше)
ADJUSTMENT_MINUS     — корректировка после сверки (недостача)
SAMPLE               — образец клиенту бесплатно
```

### 3.3 Offline-first на мобильном

Оператор заправляет автомат на объекте, где может не быть интернета. Все действия должны:

1. Моментально отрабатывать в UI
2. Складываться в очередь в IndexedDB
3. Синхронизироваться когда появится сеть
4. При конфликтах — server wins, но показать пользователю что изменилось

Реализация: Service Worker + IndexedDB очередь + optimistic updates через TanStack Query.

### 3.4 Precision over verbosity

Jamshid не любит воду в интерфейсе. Каждый экран должен отвечать на конкретные вопросы без скролла и лишнего клика. Если информация не помогает принять решение — её нет.

### 3.5 Mobile-first, desktop-enhanced

Основной сценарий — iPhone 13+. Дашборды адмирала — desktop. Tenant-view читается и на том и на другом. Всё тестируется сначала на 380px ширине.

---

## 4. Роли и права доступа (RBAC + Resource-based)

### 4.1 Роли

```typescript
enum SystemRole {
  SUPER_ADMIN = "super_admin", // Anthropic-side / Jamshid как владелец платформы
  OWNER = "owner", // владелец организации (Jamshid для OLMA)
  MANAGER = "manager", // финансы + отчёты, без удалений
  OPERATOR = "operator", // заправка, продажи, списание
  AUDITOR = "auditor", // только чтение + сверки
  TENANT_VIEWER = "tenant_viewer", // арендатор — видит только прайс и статус наличия
}
```

### 4.2 Матрица прав

| Ресурс                | super | owner | manager | operator | auditor | tenant |
| --------------------- | ----- | ----- | ------- | -------- | ------- | ------ |
| Products CRUD         | ✓     | ✓     | edit    | view     | view    | view\* |
| Purchases create      | ✓     | ✓     | ✓       | —        | —       | —      |
| Purchases delete      | ✓     | ✓     | —       | —        | —       | —      |
| Suppliers CRUD        | ✓     | ✓     | ✓       | —        | view    | —      |
| Sales manual          | ✓     | ✓     | ✓       | ✓        | —       | —      |
| Sales import          | ✓     | ✓     | ✓       | —        | —       | —      |
| Refill/Writeoff       | ✓     | ✓     | ✓       | ✓        | —       | —      |
| Reconcile apply       | ✓     | ✓     | ✓       | ✓        | —       | —      |
| Price history         | ✓     | ✓     | view    | —        | view    | —      |
| Cost (закупочная)     | ✓     | ✓     | ✓       | —        | view    | —      |
| Movement log          | ✓     | ✓     | ✓       | own      | view    | —      |
| Users management      | ✓     | ✓     | —       | —        | —       | —      |
| Organization settings | ✓     | ✓     | —       | —        | —       | —      |
| Public tenant view    | ✓     | ✓     | ✓       | ✓        | ✓       | ✓      |

\*tenant видит products без cost и без margins, только name/vol/price и есть/нет на автомате

### 4.3 Resource-scoped access

`operator` может иметь доступ только к конкретным автоматам (например оператор только на OLMA не видит Центральный склад). Реализуется через таблицу `user_machine_access`.

### 4.4 Защита на 3 уровнях

1. **UI** — скрываем кнопки/страницы по роли (UX, не безопасность)
2. **tRPC middleware** — проверка роли перед процедурой (основная защита)
3. **PostgreSQL RLS** — запрос просто не вернёт чужие данные (дублирующая защита)

---

## 5. Бизнес-домен

### 5.1 Ключевые сущности

```
Organization (тенант)
  └─ Users (роли)
  └─ Locations (типы: WAREHOUSE, MACHINE_STORAGE, MACHINE, OFFICE)
       └─ Machines (физические автоматы, привязаны к MACHINE location)
            └─ SlotLayout (сетка N×M, текущий товар в каждом слоте)
            └─ SlotHistory (история изменений слотов)
  └─ Products (SKU)
       └─ PriceHistory (COST и SELLING отдельно)
       └─ Categories (cola/energy/snack/...)
  └─ Suppliers
  └─ Purchases (header + items)
       └─ PaymentMethods (cash/card/transfer/payme/click)
  └─ StockMovements (event log всех изменений остатков)
  └─ InventoryBalances (материализованное представление, пересчёт на триггере)
  └─ SalesImports (история загрузок отчётов)
       └─ SalesTxnHashes (дедупликация строк)
       └─ SalesAggregated (delta-snapshots для HICON-формата)
  └─ Reconciliations (история сверок с детализацией)
  └─ AuditLog (все действия пользователей)
```

### 5.2 Иерархия локаций

```
Warehouse (WAREHOUSE)
    │
    ├── transfer ──► Machine Storage (MACHINE_STORAGE)  [предзаправка]
    │                     │
    │                     └── refill ──► Machine (MACHINE)
    │                                         │
    └── transfer ──────────────────────────────┤
                                               │
                        SALE                   │
                            ◄──────────────────┘
```

### 5.3 Жизненный цикл закупки

```
DRAFT (пользователь набирает wizard'ом)
  │
  ├─ save draft ──► DRAFT (можно продолжить позже)
  │
  └─ submit ──► RECEIVED
                   │
                   ├─ создаются StockMovements (PURCHASE_IN)
                   ├─ обновляются InventoryBalances
                   ├─ обновляется PriceHistory (type=COST) если цена изменилась
                   └─ обновляется Product.sup (последний поставщик) — denorm
```

### 5.4 Жизненный цикл продажи

**Ручная продажа:**

```
operator opens /sale ──► select machine ──► select product ──► qty ──► submit
                                                                         │
                                                                         ▼
                                                           StockMovement(SALE)
                                                                         │
                                                                         ▼
                                                           InventoryBalance -= qty
```

**Импорт из отчёта HICON:**

```
upload CSV ──► parse (detect format HICON) ──► map columns
                                                    │
                                                    ▼
                                         map product names to catalog
                                                    │
                                                    ▼
                                             for each row:
                                                 L1: hash(raw row) in salesTxnHashes?
                                                     YES → skip
                                                     NO  → continue
                                                 L2: real txnId exists?
                                                     YES → dedup by txnKey
                                                 L3: format === HICON?
                                                     YES → check salesAggregated[day|machine|product]
                                                           if prev exists:
                                                               delta = qty - prev.qty
                                                               if delta <= 0: skip
                                                               else: create SALE(delta)
                                                           else: create SALE(qty)
                                                     NO → create SALE(qty)
                                                 save hash → salesTxnHashes
                                                 update salesAggregated
```

### 5.5 Сверка (Reconciliation)

```
user selects location ──► system shows expected balance per product
                                       │
                                       ▼
                              user enters actual count
                                       │
                                       ▼
                              system calculates diff per product:
                                  diff = 0 → ok
                                  diff > 0 → surplus (ADJUSTMENT_PLUS)
                                  diff < 0 → shortage (ADJUSTMENT_MINUS)
                                       │
                                       ▼
                         calculate total shortage value in UZS (at cost)
                                       │
                                       ▼
                              user commits all adjustments
                                       │
                                       ▼
                       save Reconciliation record + Movements
```

## 6. Database Schema (Drizzle ORM, PostgreSQL)

### 6.1 Директории

```
/src/server/db/
  schema/
    _common.ts         — timestamps, tenantId helpers, enums
    organizations.ts
    users.ts
    locations.ts
    machines.ts
    categories.ts
    products.ts
    suppliers.ts
    purchases.ts
    price_history.ts
    stock_movements.ts
    inventory_balances.ts
    slot_history.ts
    sales_imports.ts
    reconciliations.ts
    audit_log.ts
  index.ts             — экспорт всех схем
  client.ts            — drizzle() клиент
  migrations/          — autogen drizzle-kit
```

### 6.2 Базовые конвенции

```typescript
// _common.ts
import { pgEnum, pgTable, timestamp, uuid, text } from "drizzle-orm/pg-core";

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();
export const deletedAt = () => timestamp("deleted_at", { withTimezone: true }); // soft delete

export const orgId = () =>
  uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" });
export const byUser = () =>
  uuid("by_user_id").references(() => users.id, { onDelete: "set null" });

// Все primary keys — UUID v4
export const id = () => uuid("id").defaultRandom().primaryKey();
```

### 6.3 Полная схема

```typescript
// ============================================
// organizations.ts
// ============================================
export const organizations = pgTable("organizations", {
  id: id(),
  slug: text("slug").notNull().unique(), // 'olma', 'globerent' — используется в URL
  name: text("name").notNull(),
  legalName: text("legal_name"), // ООО "Олма"
  inn: text("inn"), // ИНН
  country: text("country").default("UZ").notNull(),
  currency: text("currency").default("UZS").notNull(),
  tenantPublicEnabled: boolean("tenant_public_enabled")
    .default(false)
    .notNull(),
  settings: jsonb("settings")
    .$type<{
      leadDays: number; // 3
      safetyDays: number; // 4
      language: "ru" | "uz" | "en"; // 'ru'
      timezone: string; // 'Asia/Tashkent'
    }>()
    .notNull()
    .default({
      leadDays: 3,
      safetyDays: 4,
      language: "ru",
      timezone: "Asia/Tashkent",
    }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

// ============================================
// users.ts
// ============================================
export const roleEnum = pgEnum("role", [
  "super_admin",
  "owner",
  "manager",
  "operator",
  "auditor",
  "tenant_viewer",
]);

export const users = pgTable(
  "users",
  {
    id: id(),
    authId: uuid("auth_id").unique(), // Supabase auth.users.id
    organizationId: orgId(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: roleEnum("role").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => ({
    emailOrgUniq: unique().on(t.email, t.organizationId),
    authIdx: index("users_auth_idx").on(t.authId),
    orgIdx: index("users_org_idx").on(t.organizationId),
  }),
);

// ============================================
// locations.ts
// ============================================
export const locationTypeEnum = pgEnum("location_type", [
  "WAREHOUSE",
  "MACHINE_STORAGE",
  "MACHINE",
  "OFFICE",
]);

export const locations = pgTable(
  "locations",
  {
    id: id(),
    organizationId: orgId(),
    name: text("name").notNull(),
    type: locationTypeEnum("type").notNull(),
    address: text("address"),
    geoLat: numeric("geo_lat", { precision: 10, scale: 7 }),
    geoLng: numeric("geo_lng", { precision: 10, scale: 7 }),
    parentLocationId: uuid("parent_location_id").references(
      (): any => locations.id,
    ),
    machineId: uuid("machine_id"), // если type=MACHINE, ссылка на machine
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => ({
    orgIdx: index("locations_org_idx").on(t.organizationId),
    typeIdx: index("locations_type_idx").on(t.type),
  }),
);

// ============================================
// machines.ts (физический автомат)
// ============================================
export const machineTypeEnum = pgEnum("machine_type", [
  "ICE_DRINK",
  "SNACK",
  "COFFEE",
  "HYBRID",
]);

export const machines = pgTable(
  "machines",
  {
    id: id(),
    organizationId: orgId(),
    code: text("code").notNull(), // 'OLMA-ID-01', 'OLMA-SN-01'
    name: text("name").notNull(), // 'Ice Drink @ OLMA'
    type: machineTypeEnum("type").notNull(),
    brand: text("brand"), // 'HICON'
    model: text("model"),
    serialNumber: text("serial_number"),
    locationId: uuid("location_id").references(() => locations.id),
    storageLocationId: uuid("storage_location_id").references(
      () => locations.id,
    ), // хранилище рядом
    rows: integer("rows").notNull(), // количество полок
    cols: integer("cols").notNull(), // количество слотов в полке
    layout: jsonb("layout").$type<(string | null)[][]>().notNull(), // layout[row][col] = productId | null
    isActive: boolean("is_active").default(true).notNull(),
    installedAt: timestamp("installed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => ({
    codeUniq: unique().on(t.code, t.organizationId),
    orgIdx: index("machines_org_idx").on(t.organizationId),
  }),
);

// ============================================
// categories.ts
// ============================================
export const categories = pgTable(
  "categories",
  {
    id: id(),
    organizationId: orgId(),
    code: text("code").notNull(), // 'cola', 'energy', 'bar', 'chips'
    name: text("name").notNull(), // 'Кола/Газ'
    icon: text("icon"), // emoji или lucide-icon
    color: text("color"), // hex
    sortOrder: integer("sort_order").default(0).notNull(),
    defaultMarkup: numeric("default_markup", { precision: 5, scale: 2 }), // 60.00 = +60%
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => ({
    codeUniq: unique().on(t.code, t.organizationId),
  }),
);

// ============================================
// products.ts
// ============================================
export const productGroupEnum = pgEnum("product_group", [
  "drinks",
  "snacks",
  "other",
]);

export const products = pgTable(
  "products",
  {
    id: id(),
    organizationId: orgId(),
    name: text("name").notNull(),
    vol: text("vol"), // '0.5 PET', '50g'
    barcode: text("barcode"),
    categoryId: uuid("category_id").references(() => categories.id),
    group: productGroupEnum("group").notNull(),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 })
      .default("0")
      .notNull(), // UZS
    expectedSalesPerDay: numeric("expected_sales_per_day", {
      precision: 5,
      scale: 1,
    })
      .default("1")
      .notNull(),
    slotCapacity: integer("slot_capacity").default(8).notNull(),
    defaultSupplierId: uuid("default_supplier_id").references(
      () => suppliers.id,
    ),
    // cost НЕ храним как поле — всегда вычисляется из последней закупки
    tags: text("tags").array(),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => ({
    orgIdx: index("products_org_idx").on(t.organizationId),
    nameIdx: index("products_name_idx").on(t.name),
    barcodeIdx: index("products_barcode_idx").on(t.barcode),
  }),
);

// ============================================
// suppliers.ts
// ============================================
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card_humo",
  "card_uzcard",
  "card_visa",
  "transfer",
  "payme",
  "click",
  "other",
]);

export const suppliers = pgTable(
  "suppliers",
  {
    id: id(),
    organizationId: orgId(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    inn: text("inn"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    defaultPayment: paymentMethodEnum("default_payment").default("transfer"),
    cardLast4: text("card_last4"),
    note: text("note"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => ({
    orgIdx: index("suppliers_org_idx").on(t.organizationId),
  }),
);

// ============================================
// purchases.ts
// ============================================
export const purchaseStatusEnum = pgEnum("purchase_status", [
  "DRAFT",
  "RECEIVED",
  "CANCELLED",
]);

export const purchases = pgTable(
  "purchases",
  {
    id: id(),
    organizationId: orgId(),
    number: text("number"), // номер накладной
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    supplierNameSnapshot: text("supplier_name_snapshot").notNull(), // если поставщик удалён
    warehouseLocationId: uuid("warehouse_location_id")
      .notNull()
      .references(() => locations.id),
    paymentMethod: paymentMethodEnum("payment_method"),
    status: purchaseStatusEnum("status").default("DRAFT").notNull(),
    purchaseDate: timestamp("purchase_date", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    totalItems: integer("total_items").default(0).notNull(),
    note: text("note"),
    byUserId: byUser(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => ({
    orgIdx: index("purchases_org_idx").on(t.organizationId),
    statusIdx: index("purchases_status_idx").on(t.status),
    dateIdx: index("purchases_date_idx").on(t.purchaseDate),
  }),
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: id(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(), // qty * unitCost (computed но храним)
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => ({
    purchaseIdx: index("purchase_items_purchase_idx").on(t.purchaseId),
  }),
);

// ============================================
// price_history.ts
// ============================================
export const priceTypeEnum = pgEnum("price_type", ["COST", "SELLING"]);

export const priceHistory = pgTable(
  "price_history",
  {
    id: id(),
    organizationId: orgId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    priceType: priceTypeEnum("price_type").notNull(),
    oldPrice: numeric("old_price", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    newPrice: numeric("new_price", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason"),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    supplierNameSnapshot: text("supplier_name_snapshot"),
    purchaseId: uuid("purchase_id").references(() => purchases.id),
    byUserId: byUser(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => ({
    productIdx: index("price_history_product_idx").on(t.productId),
    typeIdx: index("price_history_type_idx").on(t.priceType),
  }),
);

// ============================================
// stock_movements.ts  (EVENT LOG — immutable!)
// ============================================
export const movementTypeEnum = pgEnum("movement_type", [
  "PURCHASE_IN",
  "TRANSFER_TO_STORAGE",
  "TRANSFER_TO_MACHINE",
  "TRANSFER_BACK",
  "SALE",
  "WRITE_OFF",
  "ADJUSTMENT_PLUS",
  "ADJUSTMENT_MINUS",
  "SAMPLE",
]);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: id(),
    organizationId: orgId(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    fromLocationId: uuid("from_location_id").references(() => locations.id),
    toLocationId: uuid("to_location_id").references(() => locations.id),
    quantity: integer("quantity").notNull(), // всегда положительное
    movementType: movementTypeEnum("movement_type").notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    referenceType: text("reference_type"), // 'purchase', 'sales_import', 'reconciliation'
    referenceId: uuid("reference_id"),
    note: text("note"),
    byUserId: byUser(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => ({
    orgIdx: index("movements_org_idx").on(t.organizationId),
    productIdx: index("movements_product_idx").on(t.productId),
    typeIdx: index("movements_type_idx").on(t.movementType),
    atIdx: index("movements_at_idx").on(t.at),
    // ! НЕТ updatedAt, deletedAt — движения immutable
  }),
);

// ============================================
// inventory_balances.ts  (materialized, rebuild by trigger)
// ============================================
export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    organizationId: orgId(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.organizationId, t.locationId, t.productId] }),
    locIdx: index("balances_loc_idx").on(t.locationId),
  }),
);

// Вычисление остатка за произвольный момент:
// SUM(CASE WHEN m.to_location_id = $loc AND m.product_id = $prod AND m.at <= $asOf THEN m.quantity ELSE 0 END)
// - SUM(CASE WHEN m.from_location_id = $loc AND m.product_id = $prod AND m.at <= $asOf THEN m.quantity ELSE 0 END)

// ============================================
// slot_history.ts
// ============================================
export const slotActionEnum = pgEnum("slot_action", ["SET", "CLEAR"]);

export const slotHistory = pgTable(
  "slot_history",
  {
    id: id(),
    organizationId: orgId(),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => machines.id),
    slotRow: integer("slot_row").notNull(),
    slotCol: integer("slot_col").notNull(),
    action: slotActionEnum("action").notNull(),
    prevProductId: uuid("prev_product_id").references(() => products.id),
    newProductId: uuid("new_product_id").references(() => products.id),
    note: text("note"),
    byUserId: byUser(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => ({
    machineIdx: index("slot_history_machine_idx").on(t.machineId),
    slotIdx: index("slot_history_slot_idx").on(
      t.machineId,
      t.slotRow,
      t.slotCol,
    ),
  }),
);

// ============================================
// sales_imports.ts
// ============================================
export const importFormatEnum = pgEnum("import_format", [
  "HICON",
  "MULTIKASSA",
  "CLICK",
  "PAYME",
  "UZUM",
  "CUSTOM",
]);

export const salesImports = pgTable(
  "sales_imports",
  {
    id: id(),
    organizationId: orgId(),
    fileName: text("file_name").notNull(),
    format: importFormatEnum("format").notNull(),
    machineId: uuid("machine_id").references(() => machines.id),
    reportDate: timestamp("report_date", { withTimezone: true }).notNull(),
    rowsTotal: integer("rows_total").notNull(),
    imported: integer("imported").default(0).notNull(),
    skipped: integer("skipped").default(0).notNull(),
    unmapped: integer("unmapped").default(0).notNull(),
    deltaAdjusted: integer("delta_adjusted").default(0).notNull(),
    totalQty: integer("total_qty").default(0).notNull(),
    totalRevenue: numeric("total_revenue", { precision: 14, scale: 2 })
      .default("0")
      .notNull(),
    deltaLog: jsonb("delta_log").$type<string[]>(),
    unmappedNames: text("unmapped_names").array(),
    rawFileUrl: text("raw_file_url"), // Supabase Storage URL
    byUserId: byUser(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => ({
    orgIdx: index("sales_imports_org_idx").on(t.organizationId),
    dateIdx: index("sales_imports_date_idx").on(t.reportDate),
  }),
);

export const salesTxnHashes = pgTable(
  "sales_txn_hashes",
  {
    hashKey: text("hash_key").notNull(),
    organizationId: orgId(),
    salesImportId: uuid("sales_import_id")
      .notNull()
      .references(() => salesImports.id),
    createdAt: createdAt(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.organizationId, t.hashKey] }),
  }),
);

export const salesAggregated = pgTable(
  "sales_aggregated",
  {
    organizationId: orgId(),
    reportDay: date("report_day").notNull(),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => machines.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    qty: integer("qty").notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    lastImportId: uuid("last_import_id")
      .notNull()
      .references(() => salesImports.id),
    lastUpdate: timestamp("last_update", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.organizationId, t.reportDay, t.machineId, t.productId],
    }),
  }),
);

// ============================================
// reconciliations.ts
// ============================================
export const reconciliations = pgTable("reconciliations", {
  id: id(),
  organizationId: orgId(),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  totalShortage: numeric("total_shortage", { precision: 14, scale: 2 })
    .default("0")
    .notNull(), // UZS at cost
  totalSurplus: numeric("total_surplus", { precision: 14, scale: 2 })
    .default("0")
    .notNull(),
  shortageSkuCount: integer("shortage_sku_count").default(0).notNull(),
  surplusSkuCount: integer("surplus_sku_count").default(0).notNull(),
  exactSkuCount: integer("exact_sku_count").default(0).notNull(),
  byUserId: byUser(),
  at: timestamp("at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const reconciliationItems = pgTable("reconciliation_items", {
  id: id(),
  reconciliationId: uuid("reconciliation_id")
    .notNull()
    .references(() => reconciliations.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  expectedQty: integer("expected_qty").notNull(),
  actualQty: integer("actual_qty").notNull(),
  diffQty: integer("diff_qty").notNull(), // actualQty - expectedQty
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  movementId: uuid("movement_id").references(() => stockMovements.id), // ссылка на созданное движение
});

// ============================================
// user_machine_access.ts  (для operator scoping)
// ============================================
export const userMachineAccess = pgTable(
  "user_machine_access",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => machines.id, { onDelete: "cascade" }),
    canRefill: boolean("can_refill").default(true).notNull(),
    canSell: boolean("can_sell").default(true).notNull(),
    grantedAt: createdAt(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.machineId] }),
  }),
);

// ============================================
// audit_log.ts  (все действия пользователей)
// ============================================
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    organizationId: orgId(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(), // 'product.create', 'purchase.submit', 'user.login'
    resourceType: text("resource_type"), // 'product', 'purchase'
    resourceId: uuid("resource_id"),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("audit_org_idx").on(t.organizationId),
    userIdx: index("audit_user_idx").on(t.userId),
    atIdx: index("audit_at_idx").on(t.at),
  }),
);
```

### 6.4 Триггер пересчёта балансов

```sql
-- Создаётся миграцией drizzle-kit
CREATE OR REPLACE FUNCTION update_inventory_balances()
RETURNS TRIGGER AS $$
BEGIN
  -- FROM location: уменьшить
  IF NEW.from_location_id IS NOT NULL THEN
    INSERT INTO inventory_balances (organization_id, location_id, product_id, quantity, last_updated_at)
    VALUES (NEW.organization_id, NEW.from_location_id, NEW.product_id, -NEW.quantity, NOW())
    ON CONFLICT (organization_id, location_id, product_id)
    DO UPDATE SET quantity = inventory_balances.quantity - NEW.quantity,
                  last_updated_at = NOW();
  END IF;

  -- TO location: увеличить
  IF NEW.to_location_id IS NOT NULL THEN
    INSERT INTO inventory_balances (organization_id, location_id, product_id, quantity, last_updated_at)
    VALUES (NEW.organization_id, NEW.to_location_id, NEW.product_id, NEW.quantity, NOW())
    ON CONFLICT (organization_id, location_id, product_id)
    DO UPDATE SET quantity = inventory_balances.quantity + NEW.quantity,
                  last_updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_movements_update_balance
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_inventory_balances();
```

### 6.5 Row Level Security (RLS)

```sql
-- Для каждой таблицы с organization_id:
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own org products"
ON products FOR SELECT
USING (organization_id = auth.jwt() ->> 'org_id'::uuid);

-- И аналогично для INSERT, UPDATE, DELETE с проверкой роли
```

## 7. tRPC API Structure

### 7.1 Директории

```
/src/server/api/
  trpc.ts                  — контекст, middleware
  root.ts                  — корневой роутер
  routers/
    auth.ts
    organizations.ts
    users.ts
    locations.ts
    machines.ts
    categories.ts
    products.ts
    suppliers.ts
    purchases.ts
    movements.ts
    sales.ts
    salesImport.ts         — самый сложный (см. 7.5)
    slots.ts
    reconciliations.ts
    priceHistory.ts
    analytics.ts
    tenant.ts              — публичные данные для арендаторов
```

### 7.2 Middleware

```typescript
// src/server/api/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";

export const t = initTRPC.context<Context>().create({ transformer: superjson });

// Публичные процедуры (без авторизации)
export const publicProcedure = t.procedure;

// Авторизованные процедуры
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Скоупинг по организации (tenant isolation)
export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.organizationId) throw new TRPCError({ code: "FORBIDDEN" });
  return next({
    ctx: {
      ...ctx,
      organizationId: ctx.user.organizationId,
      // Wrap db с автоматическим orgId фильтром:
      db: withOrgScope(ctx.db, ctx.user.organizationId),
    },
  });
});

// Ролевая защита
export const ownerProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (!["owner", "super_admin"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner only" });
  }
  return next();
});

export const managerProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (!["owner", "manager", "super_admin"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next();
});

// Для публичных страниц арендатора
export const tenantPublicProcedure = publicProcedure.use(
  async ({ input, next }) => {
    // Принимает { slug: string } и резолвит organizationId
    const slug = (input as any).slug;
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });
    if (!org || !org.tenantPublicEnabled)
      throw new TRPCError({ code: "NOT_FOUND" });
    return next({ ctx: { organizationId: org.id } });
  },
);
```

### 7.3 Пример простого роутера

```typescript
// src/server/api/routers/products.ts
import { z } from "zod";
import { createTRPCRouter, orgProcedure, managerProcedure } from "../trpc";
import { products, priceHistory } from "@/server/db/schema";

export const productsRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        q: z.string().optional(),
        group: z.enum(["drinks", "snacks"]).optional(),
        isActive: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.products.findMany({
        where: and(
          eq(products.isActive, input.isActive),
          input.q ? ilike(products.name, `%${input.q}%`) : undefined,
          input.group ? eq(products.group, input.group) : undefined,
        ),
        orderBy: [asc(products.name)],
      });
    }),

  byId: orgProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const p = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.id),
        with: {
          category: true,
          defaultSupplier: true,
        },
      });
      if (!p) throw new TRPCError({ code: "NOT_FOUND" });

      // Добавляем computed fields
      const currentCost = await getCurrentCost(ctx.db, p.id);
      const salesByDay14 = await buildSalesSparkline(ctx.db, p.id, 14);

      return { ...p, currentCost, salesByDay14 };
    }),

  create: managerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        vol: z.string().optional(),
        barcode: z.string().optional(),
        categoryId: z.string().uuid().optional(),
        group: z.enum(["drinks", "snacks"]),
        sellingPrice: z.number().min(0).default(0),
        // ...
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(products)
        .values({
          organizationId: ctx.organizationId,
          ...input,
        })
        .returning();

      // Если задана цена — пишем в price history
      if (input.sellingPrice > 0) {
        await ctx.db.insert(priceHistory).values({
          organizationId: ctx.organizationId,
          productId: created.id,
          priceType: "SELLING",
          oldPrice: 0,
          newPrice: input.sellingPrice,
          reason: "Создание товара",
          byUserId: ctx.user.id,
          at: new Date(),
        });
      }

      return created;
    }),

  // update, delete, softDelete — аналогично
});
```

### 7.4 Роутер закупок (со сложной логикой)

```typescript
// src/server/api/routers/purchases.ts
export const purchasesRouter = createTRPCRouter({

  submit: managerProcedure
    .input(purchaseSubmitSchema) // draft с items
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        // 1. Insert/update purchase header
        const [purchase] = await tx.insert(purchases).values({
          organizationId: ctx.organizationId,
          status: 'RECEIVED',
          supplierId: input.supplierId,
          supplierNameSnapshot: input.supplierName,
          warehouseLocationId: input.warehouseLocationId,
          paymentMethod: input.paymentMethod,
          purchaseDate: input.purchaseDate,
          receivedAt: new Date(),
          totalAmount: input.items.reduce((s, it) => s + it.qty * it.unitCost, 0),
          totalItems: input.items.reduce((s, it) => s + it.qty, 0),
          byUserId: ctx.user.id,
          note: input.note,
        }).onConflictDoUpdate({
          target: purchases.id,
          set: { status: 'RECEIVED', receivedAt: new Date() }
        }).returning();

        // 2. Insert items
        for (const item of input.items) {
          await tx.insert(purchaseItems).values({
            purchaseId: purchase.id,
            productId: item.productId,
            quantity: item.qty,
            unitCost: item.unitCost,
            lineTotal: item.qty * item.unitCost,
          });

          // 3. Создаём stock_movement (триггер обновит balance)
          await tx.insert(stockMovements).values({
            organizationId: ctx.organizationId,
            productId: item.productId,
            toLocationId: input.warehouseLocationId,
            quantity: item.qty,
            movementType: 'PURCHASE_IN',
            unitCost: item.unitCost,
            referenceType: 'purchase',
            referenceId: purchase.id,
            byUserId: ctx.user.id,
            at: input.purchaseDate,
            note: `Приход от ${input.supplierName}`,
          });

          // 4. Price history если цена изменилась
          const lastCost = await getCurrentCost(tx, item.productId, input.purchaseDate);
          if (lastCost !== item.unitCost) {
            await tx.insert(priceHistory).values({
              organizationId: ctx.organizationId,
              productId: item.productId,
              priceType: 'COST',
              oldPrice: lastCost,
              newPrice: item.unitCost,
              supplierId: input.supplierId,
              supplierNameSnapshot: input.supplierName,
              purchaseId: purchase.id,
              reason: `Приход от ${input.supplierName}`,
              byUserId: ctx.user.id,
              at: input.purchaseDate,
            });
          }
        }

        return purchase;
      });
    }),

  // Сохранение черновика
  saveDraft: managerProcedure...

  // Удаление черновика
  deleteDraft: managerProcedure...

  // Отмена оприходованной — создаёт compensating movements
  cancel: ownerProcedure...
});
```

### 7.5 Роутер импорта продаж (критичный)

Это самая сложная часть. Логика дедупликации должна ТОЧНО повторять прототип.

```typescript
// src/server/api/routers/salesImport.ts
import { parseSalesFile } from "@/server/lib/salesImport/parser";
import { detectFormat } from "@/server/lib/salesImport/detector";
import { matchProducts } from "@/server/lib/salesImport/matcher";

export const salesImportRouter = createTRPCRouter({
  // Шаг 1: парсинг файла, возврат превью для маппинга
  uploadAndParse: managerProcedure
    .input(
      z.object({
        fileUrl: z.string().url(), // Supabase Storage URL
        fileName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const content = await downloadFromStorage(input.fileUrl);
      const parsed = parseSalesFile(content, input.fileName);

      return {
        fileName: input.fileName,
        format: parsed.format, // 'HICON' | 'CUSTOM' etc
        reportDate: parsed.reportDate, // извлечена из имени
        headers: parsed.headers,
        sample: parsed.rows.slice(0, 3),
        totalRows: parsed.rows.length,
        guessedMapping: parsed.mapping,
        parseSessionId: storeSession(parsed), // Redis TTL=30мин
      };
    }),

  // Шаг 2: подтверждение маппинга колонок и выбор автомата
  confirmMapping: managerProcedure
    .input(
      z.object({
        parseSessionId: z.string(),
        machineId: z.string().uuid(),
        reportDate: z.string(),
        mapping: z.object({
          productCol: z.number().int(),
          qtyCol: z.number().int(),
          totalAmountCol: z.number().int(),
          priceCol: z.number().int(),
          txnIdCol: z.number().int(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = getSession(input.parseSessionId);
      // Извлекаем уникальные названия из отчёта
      const names = extractUniqueProductNames(session, input.mapping);
      // Автоматчим с каталогом
      const catalog = await ctx.db.query.products.findMany();
      const matched = matchProducts(names, catalog);

      return {
        uniqueNames: names,
        matchedMap: matched, // { 'Fanta CAN 250ml': 'product-uuid' | null }
      };
    }),

  // Шаг 3: Выполнение импорта
  execute: managerProcedure
    .input(
      z.object({
        parseSessionId: z.string(),
        machineId: z.string().uuid(),
        reportDate: z.string(),
        mapping: columnMappingSchema,
        productMap: z.record(z.string(), z.string().nullable()),
        format: z.enum([
          "HICON",
          "MULTIKASSA",
          "CLICK",
          "PAYME",
          "UZUM",
          "CUSTOM",
        ]),
        fileName: z.string(),
        rawFileUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = getSession(input.parseSessionId);
      const reportDay = input.reportDate.split("T")[0];
      const machineLocationId = await getMachineLocationId(
        ctx.db,
        input.machineId,
      );

      let imported = 0,
        skipped = 0,
        unmapped = 0,
        deltaAdjusted = 0;
      let totalQty = 0,
        totalRevenue = 0;
      const deltaLog: string[] = [];
      const unmappedNames = new Set<string>();
      const balanceWarnings: string[] = [];

      return await ctx.db.transaction(async (tx) => {
        // Создаём импорт-запись
        const [importRec] = await tx
          .insert(salesImports)
          .values({
            organizationId: ctx.organizationId,
            fileName: input.fileName,
            format: input.format,
            machineId: input.machineId,
            reportDate: new Date(input.reportDate),
            rowsTotal: session.rows.length,
            rawFileUrl: input.rawFileUrl,
            byUserId: ctx.user.id,
            at: new Date(),
          })
          .returning();

        for (const [rowIdx, row] of session.rows.entries()) {
          const rawName = cleanProductName(row[input.mapping.productCol]);
          if (!rawName) {
            unmapped++;
            continue;
          }

          const productId = input.productMap[rawName];
          if (!productId) {
            unmapped++;
            unmappedNames.add(rawName);
            continue;
          }

          const qty = parseQty(row[input.mapping.qtyCol]);
          const unitPrice = calcUnitPrice(row, input.mapping, qty);

          // === УРОВЕНЬ 1: hash всей сырой строки ===
          const rawRowStr = row.map((c) => String(c || "").trim()).join("|");
          const rawRowHash = hashString(
            `row:${reportDay}|${input.machineId}|${rawRowStr}`,
          );

          // Проверяем в salesTxnHashes
          const existing = await tx.query.salesTxnHashes.findFirst({
            where: and(
              eq(salesTxnHashes.organizationId, ctx.organizationId),
              eq(salesTxnHashes.hashKey, rawRowHash),
            ),
          });
          if (existing) {
            skipped++;
            continue;
          }

          // === УРОВЕНЬ 2: real transaction ID если есть ===
          const txnRaw =
            input.mapping.txnIdCol >= 0
              ? String(row[input.mapping.txnIdCol] || "").trim()
              : "";
          const isRealTxn =
            txnRaw && (txnRaw.length > 6 || /[a-zA-Z\-_]/.test(txnRaw));
          if (isRealTxn) {
            const txnKey = hashString(`txn:${txnRaw}|${productId}`);
            const existingTxn = await tx.query.salesTxnHashes.findFirst({
              where: and(
                eq(salesTxnHashes.organizationId, ctx.organizationId),
                eq(salesTxnHashes.hashKey, txnKey),
              ),
            });
            if (existingTxn) {
              skipped++;
              continue;
            }
            await tx.insert(salesTxnHashes).values({
              organizationId: ctx.organizationId,
              hashKey: txnKey,
              salesImportId: importRec.id,
            });
          }

          // === УРОВЕНЬ 3: DELTA для HICON ===
          let effectiveQty = qty;
          let deltaNote = "";

          if (input.format === "HICON") {
            const prev = await tx.query.salesAggregated.findFirst({
              where: and(
                eq(salesAggregated.organizationId, ctx.organizationId),
                eq(salesAggregated.reportDay, reportDay),
                eq(salesAggregated.machineId, input.machineId),
                eq(salesAggregated.productId, productId),
              ),
            });

            if (prev) {
              const deltaQty = qty - prev.qty;
              if (deltaQty === 0) {
                skipped++;
                continue;
              }
              if (deltaQty < 0) {
                balanceWarnings.push(
                  `${rawName}: было ${prev.qty}, стало ${qty}`,
                );
                skipped++;
                continue;
              }
              effectiveQty = deltaQty;
              deltaAdjusted++;
              deltaLog.push(
                `${rawName}: +${deltaQty} (было ${prev.qty} → стало ${qty})`,
              );
              deltaNote = ` [+${deltaQty} к ${prev.qty}]`;
            }
          }

          // Проверка остатка
          const bal = await getBalance(tx, machineLocationId, productId);
          if (bal < effectiveQty) {
            balanceWarnings.push(
              `${rawName}: на автомате ${bal}, нужно ${effectiveQty}`,
            );
          }

          // Создаём движение
          const currentCost = await getCurrentCost(tx, productId);
          await tx.insert(stockMovements).values({
            organizationId: ctx.organizationId,
            productId,
            fromLocationId: machineLocationId,
            quantity: effectiveQty,
            movementType: "SALE",
            unitCost: currentCost,
            unitPrice,
            referenceType: "sales_import",
            referenceId: importRec.id,
            byUserId: ctx.user.id,
            at: new Date(input.reportDate),
            note: `Импорт ${input.fileName}${deltaNote}${isRealTxn ? " · " + txnRaw : ""}`,
          });

          // Обновляем aggregated
          await tx
            .insert(salesAggregated)
            .values({
              organizationId: ctx.organizationId,
              reportDay,
              machineId: input.machineId,
              productId,
              qty,
              totalAmount: qty * unitPrice,
              lastImportId: importRec.id,
            })
            .onConflictDoUpdate({
              target: [
                salesAggregated.organizationId,
                salesAggregated.reportDay,
                salesAggregated.machineId,
                salesAggregated.productId,
              ],
              set: {
                qty,
                totalAmount: qty * unitPrice,
                lastImportId: importRec.id,
                lastUpdate: new Date(),
              },
            });

          // Сохраняем hash сырой строки
          await tx.insert(salesTxnHashes).values({
            organizationId: ctx.organizationId,
            hashKey: rawRowHash,
            salesImportId: importRec.id,
          });

          totalRevenue += effectiveQty * unitPrice;
          totalQty += effectiveQty;
          imported++;
        }

        // Обновляем импорт-запись финальной статистикой
        await tx
          .update(salesImports)
          .set({
            imported,
            skipped,
            unmapped,
            deltaAdjusted,
            totalQty,
            totalRevenue,
            deltaLog,
            unmappedNames: [...unmappedNames],
          })
          .where(eq(salesImports.id, importRec.id));

        clearSession(input.parseSessionId);

        return {
          importId: importRec.id,
          imported,
          skipped,
          unmapped,
          deltaAdjusted,
          totalQty,
          totalRevenue,
          balanceWarnings,
          deltaLog,
        };
      });
    }),

  history: managerProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.salesImports.findMany({
        orderBy: [desc(salesImports.at)],
        limit: input.limit,
        with: { machine: true, byUser: true },
      });
    }),
});
```

### 7.6 Остальные роутеры (краткая спецификация)

**`suppliers`** — list, byId, create, update, delete (soft), withAnalytics (покажет сумму закупок и кол-во)

**`movements`** — list с фильтрами (тип, дата, локация, товар), byProduct, exportCsv

**`slots`** — updateSlot (атомарно меняет layout + пишет slotHistory), byMachine, history с фильтрами

**`reconciliations`** — start (создаёт сессию со снапшотом balance), submit (создаёт ADJUSTMENT movements), history

**`analytics`** — dashboardMetrics (выручка today/week/month, inventoryValue, topSellers), productStats

**`tenant`** — publicMenu (без cost), currentStock (только status available/out)

---

## 8. Frontend Structure

### 8.1 Routing (Next.js App Router)

```
/src/app/
  layout.tsx                    — корневой
  page.tsx                      — landing
  (auth)/
    login/page.tsx
    signup/page.tsx
    forgot/page.tsx
  (admin)/
    layout.tsx                  — проверка auth + role=owner/manager
    dashboard/page.tsx
    catalog/
      page.tsx                  — список товаров
      [id]/page.tsx             — карточка товара
      new/page.tsx              — создание
    layout/page.tsx             — раскладка автоматов
    inventory/page.tsx
    purchases/
      page.tsx                  — список
      new/page.tsx              — wizard
      [id]/page.tsx             — детали
    movements/page.tsx
    prices/
      page.tsx
      [productId]/page.tsx
    sales/
      page.tsx                  — ручная продажа
      import/
        page.tsx                — wizard загрузки
        [importId]/page.tsx     — детали импорта
    refill/page.tsx
    writeoff/page.tsx
    reconcile/page.tsx
    suppliers/
      page.tsx
      [id]/page.tsx
    slot-history/page.tsx
    machines/
      page.tsx
      [id]/page.tsx
    users/page.tsx              — owner only
    settings/page.tsx
  (operator)/                   — упрощённый мобильный UI для операторов
    layout.tsx
    today/page.tsx              — задачи на сегодня
    refill/page.tsx
    sale/page.tsx
    scan/page.tsx               — QR-сканер
  tenant/
    [slug]/page.tsx             — публичный прайс арендатора (без auth)
  api/
    trpc/[trpc]/route.ts
    webhooks/
      ...
```

### 8.2 Design System (Warm Brew)

```typescript
// tailwind.config.ts (дополнение)
theme: {
  extend: {
    colors: {
      // Warm Brew palette из текущего прототипа
      bg: { DEFAULT: '#0a0e13', elev: '#12171f', elev2: '#1a212c' },
      border: { DEFAULT: '#1f2937', soft: '#374151' },
      text: { DEFAULT: '#e5e7eb', dim: '#9ca3af', muted: '#6b7280' },
      accent: {
        DEFAULT: '#f59e0b',
        soft: '#f59e0b22',
        glow: '#f59e0b40',
        deep: '#b45309'
      },
      emerald: { DEFAULT: '#10b981', soft: '#10b98122' },
      // ... остальные как в прототипе
    },
    fontFamily: {
      sans: ['Manrope', 'system-ui'],
      mono: ['"IBM Plex Mono"', 'monospace'],
      display: ['"Instrument Serif"', 'serif'],
    },
    boxShadow: {
      glow: '0 0 24px var(--accent-glow)',
      soft: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      elev: '0 10px 30px rgba(0,0,0,0.4), 0 1px 8px rgba(0,0,0,0.2)',
    }
  }
}
```

### 8.3 Ключевые компоненты для переиспользования

```
/src/components/
  ui/                           — shadcn/ui (button, input, dialog, etc)
  domain/
    ProductCard.tsx             — карточка товара с sparkline
    ProductDot.tsx              — цветная точка категории
    MachineLayout.tsx           — grid раскладки с кликабельными слотами
    SlotPicker.tsx              — модалка выбора товара с вкладками
    PriceCalculator.tsx         — умный калькулятор (наценка %/сум/финал)
    PurchaseWizard.tsx          — 3-шаговый wizard
    SupplierForm.tsx            — inline создание/редактирование
    QtyStepper.tsx              — +/− с inline инпутом
    PaymentMethodTiles.tsx      — плитки способов оплаты
    SalesImportWizard.tsx       — 3-шаговый импорт
    ReconcileTable.tsx          — таблица сверки с вводом факта
    MovementRow.tsx             — строка журнала
    Sparkline.tsx               — SVG график без зависимостей
  layouts/
    AdminLayout.tsx
    OperatorLayout.tsx
    TenantLayout.tsx
  charts/
    DashboardMetrics.tsx
    SalesChart.tsx
    InventoryHeatmap.tsx
```

### 8.4 State management

```typescript
// Zustand для UI state (не серверного)
/src/stores/
  authStore.ts        — user, org, permissions
  uiStore.ts          — isSidebarOpen, toasts, activeModal
  purchaseDraftStore.ts — для wizard'а
  salesImportStore.ts

// TanStack Query через tRPC
// Автоматический кэш, invalidate после mutations
// Optimistic updates для заправки, продажи, списания
```

### 8.5 PWA и offline

```typescript
// next-pwa.config.js
{
  dest: 'public',
  runtimeCaching: [
    { urlPattern: /^\/api\/trpc\//, handler: 'NetworkFirst' },
    { urlPattern: /^\/_next\/static\//, handler: 'CacheFirst' },
  ]
}

// Очередь offline операций в IndexedDB
// src/lib/offline/queue.ts:
// - enqueue(operation) — сохраняет в IDB при сетевой ошибке
// - flushQueue() — вызывается при online событии
// - Операции: refill, sale, writeoff, reconcile — всё что не требует файлов
```

## 9. Критичная бизнес-логика (НЕ упрощать!)

Эти алгоритмы отработаны в прототипе и проверены на реальных данных. Перенести ТОЧНО.

### 9.1 Получение текущей закупочной цены

```typescript
// src/server/lib/pricing.ts
export async function getCurrentCost(
  db: Database,
  productId: string,
  asOf?: Date,
) {
  // Приоритет 1: последнее движение PURCHASE_IN с ценой > 0
  const lastPurchase = await db.query.stockMovements.findFirst({
    where: and(
      eq(stockMovements.productId, productId),
      eq(stockMovements.movementType, "PURCHASE_IN"),
      gt(stockMovements.unitCost, 0),
      asOf ? lte(stockMovements.at, asOf) : undefined,
    ),
    orderBy: [desc(stockMovements.at)],
  });
  if (lastPurchase?.unitCost) return Number(lastPurchase.unitCost);

  // Приоритет 2: последняя запись COST в price_history
  const lastPriceHist = await db.query.priceHistory.findFirst({
    where: and(
      eq(priceHistory.productId, productId),
      eq(priceHistory.priceType, "COST"),
    ),
    orderBy: [desc(priceHistory.at)],
  });
  if (lastPriceHist) return Number(lastPriceHist.newPrice);

  return 0;
}
```

### 9.2 Умный калькулятор цены (Frontend)

```typescript
// src/lib/priceCalculator.ts
export function recalcPrice(
  changed: "pct" | "markup" | "price" | "init",
  values: { pct: number; markup: number; price: number },
  cost: number,
): { pct: number; markup: number; price: number } {
  if (cost <= 0) {
    // Без себестоимости работает только finalPrice
    return { pct: 0, markup: 0, price: values.price };
  }

  if (changed === "pct") {
    const newMarkup = Math.round((cost * values.pct) / 100);
    return { pct: values.pct, markup: newMarkup, price: cost + newMarkup };
  }
  if (changed === "markup") {
    return {
      pct: +((values.markup / cost) * 100).toFixed(1),
      markup: values.markup,
      price: cost + values.markup,
    };
  }
  if (changed === "price") {
    const newMarkup = values.price - cost;
    return {
      pct: +((newMarkup / cost) * 100).toFixed(1),
      markup: newMarkup,
      price: values.price,
    };
  }
  // init: из существующей цены восстанавливаем markup и pct
  if (values.price > 0) {
    const m = values.price - cost;
    return {
      pct: +((m / cost) * 100).toFixed(1),
      markup: m,
      price: values.price,
    };
  }
  return values;
}
```

### 9.3 Нормализация и fuzzy-matching товаров

```typescript
// src/server/lib/salesImport/matcher.ts
const KNOWN_BRANDS = [
  "coca",
  "cola",
  "pepsi",
  "fanta",
  "sprite",
  "redbull",
  "red",
  "bull",
  "fuse",
  "tea",
  "fusetea",
  "lipton",
  "nesquick",
  "borjomi",
  "moxito",
  "mojito",
  "laimon",
  "flash",
  "plus",
  "omaf",
  "ozbegim",
  "bonaqua",
  "hayat",
  "snickers",
  "twix",
  "bounty",
  "kitkat",
  "milkyway",
  "picnic",
  "kinder",
  "bueno",
  "strobar",
  "barni",
  "oreo",
  "contic",
  "velona",
  "lays",
  "pringles",
  "cheers",
  "tuc",
  "7days",
  "flint",
  "ermak",
];

export function normalizeProductName(s: string): string {
  return (
    (s || "")
      .toLowerCase()
      .replace(/\t/g, "")
      // ВАЖНО: без \b перед ml, потому что в JS \b не работает между буквой-буквой
      .replace(/(\d+)\s*ml/gi, (_, n) => (parseInt(n) / 1000).toString())
      .replace(/(\d+)\s*g\b/gi, (_, n) => n + "g")
      .replace(/cocacola/g, "coca cola")
      .replace(/fusetea/g, "fuse tea")
      .replace(/redbull/g, "red bull")
      .replace(/\b(can|pet|bottle|бутылка|банка)\b/gi, "")
      .replace(/[^\wа-яёa-z0-9.]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function matchProducts(
  fileNames: string[],
  catalog: Product[],
): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  for (const fileName of fileNames) {
    const normFile = normalizeProductName(fileName);
    const fileWords = new Set(normFile.split(" ").filter((w) => w.length >= 2));
    const fileBrands = new Set(
      [...fileWords].filter((w) => KNOWN_BRANDS.includes(w)),
    );

    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const p of catalog) {
      const normCat = normalizeProductName(p.name + " " + (p.vol || ""));
      const catWords = new Set(normCat.split(" ").filter((w) => w.length >= 2));
      const catBrands = new Set(
        [...catWords].filter((w) => KNOWN_BRANDS.includes(w)),
      );

      let common = 0;
      for (const w of fileWords) if (catWords.has(w)) common++;
      if (common === 0) continue;

      const union = new Set([...fileWords, ...catWords]).size;
      let score = common / union;

      if (fileBrands.size > 0) {
        let brandMatch = 0;
        for (const b of fileBrands) if (catBrands.has(b)) brandMatch++;
        const brandRatio = brandMatch / fileBrands.size;
        if (brandRatio === 0 && catBrands.size > 0) {
          score = score * 0.2; // бренд не совпал — штраф
        } else {
          score = score * 0.5 + brandRatio * 0.5;
        }
      }

      if (normCat === normFile) score = 1.0;
      else if (normCat.includes(normFile) || normFile.includes(normCat))
        score += 0.15;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = p.id;
      }
    }

    result[fileName] = bestScore >= 0.4 ? bestMatch : null;
  }

  return result;
}
```

### 9.4 Распознавание формата HICON

```typescript
// src/server/lib/salesImport/detector.ts
export function detectFormat(headers: string[]): ImportFormat {
  const lower = headers.map((h) => h.toLowerCase().trim());

  if (lower.includes("productid") && lower.includes("product name"))
    return "HICON";
  if (lower.includes("receipt_id") && lower.includes("amount")) return "CLICK";
  if (lower.includes("чек") && lower.includes("mfo")) return "MULTIKASSA";
  if (lower.includes("order_id") && lower.includes("merchant_trans_id"))
    return "PAYME";
  return "CUSTOM";
}

// Фильтрация служебных строк HICON:
export function filterHiconRows(rows: string[][]): string[][] {
  return rows.filter((r) => {
    if (!r.length || r.every((v) => !v.trim())) return false;
    const first = (r[0] || "").trim().toLowerCase();
    if (["total", "итого"].includes(first)) return false;
    // 其他 без ProductID
    if (!r[0].trim() && r[2] && r[2].trim() === "其他") return false;
    return true;
  });
}

// Извлечение даты из имени файла
export function extractDateFromFilename(fileName: string): string | null {
  // Product_name2026-4-21_15_34_44.csv
  const m = fileName.match(
    /(\d{4})-(\d{1,2})-(\d{1,2})_?(\d{1,2})?[_-]?(\d{1,2})?[_-]?(\d{1,2})?/,
  );
  if (!m) return null;
  const [_, y, mo, d, h = "12", mi = "00", s = "00"] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi.padStart(2, "0")}:${s.padStart(2, "0")}`;
}
```

### 9.5 Расчёт sparkline продаж

```typescript
// src/server/lib/analytics/sparkline.ts
export async function buildSalesSparkline(
  db: Database,
  productId: string,
  days: number,
) {
  const now = new Date();
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 86400000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const [stats] = await db
      .select({
        qty: sql<number>`COALESCE(SUM(${stockMovements.quantity}), 0)`,
        revenue: sql<number>`COALESCE(SUM(${stockMovements.quantity} * ${stockMovements.unitPrice}), 0)`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.productId, productId),
          eq(stockMovements.movementType, "SALE"),
          gte(stockMovements.at, dayStart),
          lt(stockMovements.at, dayEnd),
        ),
      );

    result.push({
      date: dayStart,
      qty: Number(stats.qty),
      revenue: Number(stats.revenue),
    });
  }
  return result;
}
```

---

## 10. UX Детали (из прототипа — повторить)

### 10.1 Wizard закупки (3 шага)

**Шаг 1 — Поставщик:**

- Прогресс-бар сверху (3 полоски, активная пульсирует)
- Hero-card с заголовком "От кого приход?" (Instrument Serif, 28px)
- Секция "⚡ Недавние" — 4 плитки самых частых поставщиков
- Секция "Все поставщики" — список с иконкой 🏭
- Большая кнопка "+ Создать нового поставщика" с accent рамкой
- Inline форма создания: только поле "название" обязательно, остальные optional
- Способ оплаты выбирается плитками (cash, card_humo, card_uzcard, transfer, payme, click)
- Ниже — Дата и № накладной (optional)

**Шаг 2 — Товары:**

- Большая кнопка "+ Добавить товар"
- В sheet'е — поиск + "+ Новый товар" для inline-создания
- После выбора товара — qty stepper (−/+) и выбор режима цены: "💵 За штуку" / "📦 Общая сумма"
- Live-калькулятор внизу: `12 × 5000 = 60000 сум` или `60000 ÷ 12 = 5000 сум/шт`
- Корзина показывает все позиции с возможностью редактирования (✏) и удаления (✕)
- Total gradient-card внизу с большим числом Instrument Serif 32px

**Шаг 3 — Подтверждение:**

- Сводка карточками (поставщик, дата, склад)
- Список всех позиций
- Big total — Instrument Serif 42px в градиентной карточке
- Кнопка "✓ Оприходовать" шириной 2/3

Кнопки между шагами: "← Назад", "💾 Черновик" (сохраняет status=DRAFT), "Далее →"

### 10.2 Wizard импорта (3 шага)

**Шаг 1 — Загрузка:**

- Hero-card с заголовком "📥 Импорт"
- Большая кнопка "📁 Выбрать файл" (accept=.csv,.xlsx,.xls,.tsv)
- Блок "💡 Как работает дедупликация" с 5 пунктами объяснения
- Ниже — история импортов с зелёной/красной статистикой и expandable "Показать дельта-обновления"

**Шаг 2 — Маппинг колонок:**

- Если HICON — зелёный баннер "✓ Формат распознан автоматически"
- Dropdown "📦 Автомат источник"
- Date picker "📅 Дата отчёта" (автозаполнена из имени файла)
- Для HICON — hidden inputs (маппинг фиксированный)
- Для custom — dropdowns для product, qty, totalAmount, price, txnId
- Preview table — первые 3 строки, подсвечены сопоставленные колонки оранжевым

**Шаг 3 — Маппинг товаров:**

- Автосопоставленные показаны зелёной галочкой, несопоставленные — знаком "?"
- Рядом с каждым — inline select для ручного выбора
- Кнопка "+ создать" для товаров которых нет в каталоге
- При клике — quick create с минимальным набором полей

### 10.3 Модалка выбора слота

- Заголовок: "🥤 Ice Drink · Полка 1 · Слот 2"
- Если слот занят — card с текущим товаром и "установлен 5 дн назад"
- 2 вкладки: "Выбор товара" / "История (N)"
- Вкладка "История": хронология с указанием
  - Кто (👤 username)
  - Когда (до секунды)
  - Было → Стало
  - Длительность удержания
  - Примечание

### 10.4 Dashboard

Карточки метрик сверху:

- Выручка сегодня
- Выручка за неделю
- Inventory value (остатки × себестоимость)
- Средний чек

Далее:

- Быстрые действия (крупные кнопки: заправка, продажа, импорт)
- Товары в низком остатке
- Последние движения
- График продаж за 14 дней (Recharts)

### 10.5 Sparkline в карточке товара

SVG без CDN — см. функцию `renderSparkline` в артефакте. Градиентная заливка под линией, точки на днях с продажами, подписи дат слева и справа, среднее в центре.

### 10.6 Haptic и анимации

- На каждый тап таба, подтверждение, ошибку — `navigator.vibrate()`
- Все transition через `cubic-bezier(0.16, 1, 0.3, 1)`
- Кнопки `:active` — scale(0.96)
- Табы при активации — анимация `tabPop` (scale 1→1.2→1)

### 10.7 Glassmorphism

- Топбар: `backdrop-filter: blur(24px) saturate(180%)` + `background: rgba(10,14,19,0.78)`
- Нижний навбар: то же с blur(28px)
- Активная иконка таба: `filter: drop-shadow(0 0 8px var(--accent-glow))`

---

## 11. План реализации

### Этап 0 — Инициализация проекта (День 1)

```bash
pnpm create next-app olma-platform --typescript --tailwind --app --no-src-dir
cd olma-platform
pnpm add drizzle-orm pg @supabase/supabase-js @supabase/ssr
pnpm add @trpc/server @trpc/client @trpc/next @trpc/react-query @tanstack/react-query
pnpm add zod zustand react-hook-form @hookform/resolvers
pnpm add date-fns lucide-react framer-motion
pnpm add xlsx papaparse
pnpm add next-pwa
pnpm add -D drizzle-kit @types/pg
# shadcn/ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input dialog card badge tabs select separator dropdown-menu table sheet toast
```

**Задачи:**

- Настроить `/src/server/db/client.ts` с Supabase connection pool
- Создать `drizzle.config.ts` с credentials из `.env`
- Настроить `@/` alias
- Базовый layout с темой Warm Brew

### Этап 1 — База данных (Дни 2-3)

- Написать все файлы схемы из раздела 6.3
- Сгенерировать миграцию `pnpm drizzle-kit generate`
- Применить `pnpm drizzle-kit migrate`
- Написать SQL-триггер для inventory_balances (раздел 6.4)
- Настроить RLS политики (раздел 6.5)
- Seed-скрипт для OLMA: organization, owner-пользователь, 5 локаций, 40 products, 13 suppliers, начальная раскладка обоих автоматов

### Этап 2 — Auth (День 4)

- Настроить Supabase Auth с email+password
- Создать `/login`, `/signup`, `/forgot` страницы
- tRPC middleware для инжекции user + organizationId в контекст
- Мидлварь для защиты `/admin/*` маршрутов
- Компонент AuthProvider

### Этап 3 — Core CRUD (Дни 5-7)

Приоритет — в таком порядке:

1. Products (list, detail, create, update, delete)
2. Suppliers (аналогично)
3. Categories (владелец может создавать)
4. Locations и Machines
5. Catalog page с поиском и фильтрами

Для каждой сущности:

- tRPC роутер с list/byId/create/update/delete
- Page компонент со списком
- Detail page с вкладками
- Модалки/sheets для форм

### Этап 4 — Закупки (Дни 8-9)

- Purchase Wizard component (3 шага)
- Zustand store для draft'а
- Submit логика с транзакцией (раздел 7.4)
- Save as draft и continue draft
- Purchase detail page
- Purchases list с разделением DRAFT / RECEIVED

### Этап 5 — Движения и остатки (Дни 10-11)

- Refill page (wizard: выбор автомата → склад-источник → товары с qty)
- Manual sale page
- Writeoff page
- Inventory page с фильтрами по локациям
- Movements log с фильтрами и экспортом CSV

### Этап 6 — Раскладка и slot history (День 12)

- MachineLayout component (grid)
- SlotPicker с 2 вкладками (выбор + история)
- Slot history screen с фильтрами
- Seed начальной истории при первой инициализации

### Этап 7 — Импорт продаж (Дни 13-15) — САМЫЙ СЛОЖНЫЙ

- Parser (раздел 9)
- Detector формата
- Matcher товаров (fuzzy)
- Upload UI → Supabase Storage
- 3-шаговый wizard
- Execute с многоуровневой дедупликацией
- **Обязательные тесты** на реальном CSV (приложен в handoff)

### Этап 8 — Сверка (День 16)

- Reconciliation page
- Input по каждому товару с stepper
- Calculation: expected vs actual → diff → total shortage/surplus
- Commit создаёт ADJUSTMENT movements
- История сверок

### Этап 9 — Price history и dashboard (Дни 17-18)

- Price history screens (раздельно COST и SELLING)
- Sparkline в карточке товара
- Dashboard metrics
- Analytics

### Этап 10 — Tenant public view (День 19)

- `/tenant/[slug]/page.tsx` без auth
- Список товаров текущего ассортимента (что в автоматах)
- Цена без себестоимости
- Статус наличия (есть / заканчивается / нет)
- Печать прайса

### Этап 11 — PWA и offline (День 20)

- next-pwa config
- Service Worker с offline queue
- Optimistic updates
- Online/offline indicator

### Этап 12 — Production readiness (Дни 21-22)

- Sentry для error tracking
- Логирование через structured JSON
- Health check endpoint
- Rate limiting на tRPC routes
- Backup скрипты Supabase
- Миграция данных из artifact JSON (если есть пользователи прототипа)

### Этап 13 — Документация и запуск (День 23)

- README с инструкциями
- Скрипт деплоя на Vercel
- Настройка домена
- Создание первой organization (OLMA)
- Приглашение Jamshid'а как owner
- Тестовая закупка и импорт реального отчёта

**Общая оценка: ~4-5 недель одного senior'а или 2-3 недели команды из двух.**

---

## 12. Definition of Done

Проект готов когда:

1. **Все 13 этапов завершены** и протестированы
2. **Реальный HICON-отчёт из `/uploads/Product_name2026-4-21_15_34_44.csv` успешно импортируется** с правильной дедупликацией (проверено повторной загрузкой)
3. **Сверка остатков** работает end-to-end: ввод факта → расчёт недостачи → применение ADJUSTMENT
4. **3 роли** (owner, manager, operator) имеют разные права и видят разные экраны
5. **Tenant public view** доступен без auth по URL `/tenant/olma`
6. **PWA устанавливается на iPhone** и работает offline (операции в очереди)
7. **Supabase backup** настроен и проверен восстановлением
8. **Все секреты в .env** и не в коде
9. **Deploy на Vercel** автоматический через main branch
10. **Jamshid может** создать закупку, оприходовать, импортировать HICON-отчёт, сделать сверку — всё с iPhone за один рабочий день

---

## 13. Что НЕ делать в MVP

Откладываем на позже, чтобы не перегрузить скоуп:

- Telegram Mini App
- QR-сканер штрих-кодов
- Интеграция с Multikassa API
- Автоматические push-уведомления
- ABC-анализ товаров
- Drag & drop раскладки
- Мультивалютность
- Мультиязычность (пока только RU)
- Расширенная аналитика (когорты, LTV)
- Рецепты для кофе-автоматов (пока только resale)

---

## 14. Контакты и ресурсы

**Владелец:** Jamshid
**Основная локация:** Ташкент, Узбекистан
**Ассортимент**: OLMA Ice Drink (5×8, 11 SKU напитков) + OLMA Snack (6×8, 30+ SKU)

**Референс-артефакт:** `olma.html` (220 КБ, vanilla JS, проверен на iPhone)
**Пример отчёта:** `Product_name2026-4-21_15_34_44.csv` (HICON формат, UTF-8 BOM)
**Типовые поставщики:** POSITI (напитки), Mars, Nestle, Red Bull UZ, Mondelez, Ferrero

**Коммуникация:** Русский язык в UI. Все суммы в сум (UZS). Временная зона Asia/Tashkent.

---

**КОНЕЦ СПЕЦИФИКАЦИИ**
