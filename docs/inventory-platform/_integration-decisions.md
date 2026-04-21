# Фаза 3 + Фаза 5 — Integration Decisions

**Date:** 2026-04-21
**Scope:** Architectural decisions for OLMA integration into VendHub OS. Not up for debate; documented for future agents/humans.

---

## Фаза 3 — Стек решений (само-принятые)

### Decision 1: Keep VendHub stack (TypeORM + NestJS + REST + Passport + Socket.IO)

**Не переходим** на Drizzle / tRPC / Supabase Auth / Supabase Realtime.

**Обоснование:**

- 86 модулей, 7986 Swagger decorators, 5 аудитов безопасности (48+5 багов закрыто) — переписывать = риск регрессий
- TypeORM покрывает все OLMA-требования (FK, transactions, migrations, QueryBuilder)
- REST + Swagger дают публичные контракты; tRPC привязал бы клиентов к внутренним типам
- Passport JWT уже с 2FA (TOTP), bcrypt cost=12, challenge tokens против IDOR
- Socket.IO + Redis adapter уже работает (Sprint F P1-7: real-time notifications)

**Последствия для OLMA-паттернов:**

- OLMA-Drizzle-схема → TypeORM entities (field-by-field)
- OLMA-tRPC-routers → NestJS controllers
- OLMA-Zod-валидация → class-validator decorators
- OLMA-Supabase-Auth → существующий JWT strategy

### Decision 2: Migrations — additive only

Расширяем существующие таблицы через `ALTER TABLE ... ADD COLUMN`, не создаём параллельные.

**Исключение:** если фича принципиально не ложится (например, `stock_movements` — event-sourced log не совместим с мутационным `MachineSlot.currentQuantity` без отдельной таблицы). В таких случаях — новая таблица + backfill migration + dual-write period.

**Dual-write стратегия для критичных переходов:**

1. Создаём новую таблицу (напр. `stock_movements`)
2. Добавляем trigger/listener, который пишет в обе (current_quantity UPDATE + stock_movements INSERT) на переходный период
3. Backfill migration: заполняем stock_movements историческими данными из transaction + initial MachineSlot snapshot
4. Переключаем read-path на inventory_balances (trigger-materialized)
5. Через 1 спринт — убираем dual-write, оставляем только event-sourced

### Decision 3: 3-level dedup (обязательно) — реализуем точно как в OLMA

Согласно SPEC §9.3 + v1.2 Patch 15 (batched) + v1.3 Patch 20 (in-batch dedup):

```
L1: hashKey = DJB2(`row:${reportDay}|${machineId}|col1|col2|...`) → check salesTxnHashes
L2: if txnIdCol ≥ 0 && entropy(txnRaw) high → DJB2(`txn:${txnRaw}|${productId}`) → check salesTxnHashes
L3: if format = HICON → query salesAggregated by (reportDay, machineId, productId); deltaQty = currentQty - prevQty; skip if ≤ 0
```

Batched: собираем все хэши пачки перед единым `WHERE hashKey IN (...)`. In-batch: внутри одной execute-транзакции дедуплицируем даже если один файл содержит дубли строк.

### Decision 4: Timezone — Asia/Tashkent hardcoded via Intl API

`Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).formatToParts(date)` для формирования `reportDay` строки (YYYY-MM-DD) независимо от UTC сервера на Vercel.

**Когда появятся клиенты в другом поясе** — пересмотрим, но через `Location.timezone` field (уже есть) per-location, не глобально.

### Decision 5: Offset pagination для MVP

Согласно v1.3 Patch 27 — UUID v4 случайные, cursor пагинация по UUID нестабильна. VendHub уже использует `.skip(offset).take(limit)` в TypeORM (equivalent). Максимум 200 rows per page, default 50.

**Cursor pagination** — отложено до v2. Если нужно для больших списков (10K+), отдельный спринт.

### Decision 6: Site-public-view — 404 на всё (enumeration defense)

Согласно v1.2 Patch 14.1 + v1.3 Patch 26:

- Несуществующий slug → 404
- Существующий slug, но `publicEnabled=false` → **тоже 404** (не 403)

Атакующий не должен различать "слаг свободен" vs "слаг занят но закрыт".

### Decision 7: Honest RLS — защита в middleware, не в DB

Согласно v1.2 Patch 13.3 + v1.3 Patch 24:

- VendHub не использует RLS в Postgres
- TypeORM + pg подключается под привилегированным user'ом, RLS всё равно был бы bypass
- Защита — `OrganizationGuard` + `@CurrentOrganizationId()` decorator + code review
- Все тесты проверяют org-isolation (5 аудитов, 53 бага закрыто)

RLS может быть добавлен **только** если появятся клиентские supabase-js запросы напрямую к Postgres. Пока — N/A.

### Decision 8: Fuzzy matcher — Jaccard + KNOWN_BRANDS (46 brands)

Копируем алгоритм из OLMA спеки полностью:

- Нормализация: lowercase, strip tabs/BOM, unit words remove (ml, можно, банка, бутылка), collapse whitespace
- Jaccard: `common_words / union_words`
- Brand bonus: если file_brands ⊂ catalog_brands → 50% similarity + 50% brand_ratio
- Brand mismatch penalty: × 0.2
- Exact match: 1.0
- Substring: +0.15
- Threshold: ≥ 0.4 — match, else unmapped

Регистр 46 брендов хранится в `apps/api/src/modules/sales-import/constants/known-brands.ts`.

### Decision 9: Storage-backed parse sessions (NOT in-memory)

Согласно v1.2 Patch 12: in-memory Map не работает на Vercel serverless (каждая request — отдельный лямбда-instance). Но VendHub на Railway (persistent container), где in-memory работало бы.

**Решение:** всё равно используем Postgres-backed таблицу `parse_sessions` с TTL 30 min. Причины:

1. При горизонтальном скейлинге (несколько instance'ов API) in-memory перестанет работать
2. При рестарте API — session теряется (плохой UX)
3. Postgres row нагрузка незначительна

Cleanup через `@Cron("0 * * * *", { timeZone: "Asia/Tashkent" })` — каждый час удаляет expired rows.

### Decision 10: Inventory reconciliation — новый модуль, не расширение существующего

`apps/api/src/modules/reconciliation/` уже есть, но для payment/fiscal reconciliation (amount-based, tolerance matching). OLMA reconciliation — физический подсчёт остатков (qty-based, link to stock_movements).

Создаём `apps/api/src/modules/inventory-reconciliation/` — отдельный модуль. Два не конфликтуют.

---

## Фаза 5 — Мультилокационность

### Site public view

**URL:** `/site/:locationSlug` и/или `/tenant/:orgSlug`

**Открытый вопрос:** По какой сущности slug?

Два варианта:

- **A) По Location** — каждая локация (офис арендатора, ТРЦ, БЦ) имеет свой `/site/chilanzar-mall`, показывает автоматы только этой локации
- **B) По Organization** — вся сеть одного клиента (VendHub LLC, GLOBERENT) показывается на `/tenant/vendhub`, все автоматы организации

OLMA-спек (SPEC §10) подразумевает **B** — `/tenant/[slug]` где slug принадлежит organizations. Это для сценария "арендатор даёт клиентам ссылку на свой публичный прайс".

**Решение: оба.**

- `/tenant/:orgSlug` — обзор всей организации (default VendHub use case)
- `/site/:locationSlug` — детальный публичный вид одной локации (OLMA use case — "OLMA на этой парковке")

Обе сущности имеют `slug` + `publicEnabled`. Независимо. Location наследует publicEnabled от своего Organization (если на org `publicEnabled=false`, все её локации не публичны).

### HICON import — резолвим локацию через автомат

Оператор выбирает автомат → система автоматически определяет его locationId. Стоковые движения:

- `stockMovements.toLocationId = NULL` (выбытие с автомата при продаже)
- `stockMovements.fromLocationId = machine.locationId`

Нет hardcode'а "если OLMA — импортируем в chilanzar-warehouse". Локация — это свойство машины.

### Reconciliation — доступ по RBAC + MachineAccess

Reconciliation сессии — per-location. Юзер может создавать/видеть только локации своей org, и только те машины, к которым у него есть `MachineAccess` (или OPERATOR+ роль без ограничений).

### Seed — конфиг-driven

OLMA-seed (40 товаров, 21 supplier, 2 машины, 1 warehouse) — **пример для одной локации**. Скрипт seed принимает JSON конфиг:

```typescript
interface SeedConfig {
  organization: { slug: string; name: string; inn: string };
  locations: Array<{
    name: string;
    type: LocationType;
    slug?: string;
    publicEnabled?: boolean;
    parent?: string;
  }>;
  machines: Array<{
    code: string;
    type: MachineType;
    locationSlug: string;
    layout?: { rows: number; cols: number };
  }>;
  suppliers: Array<{ code: string; name: string; phone?: string }>;
  products: Array<{
    sku: string;
    name: string;
    category: string;
    purchasePrice: number;
    sellingPrice: number;
  }>;
  categories: Array<{
    code: string;
    name: string;
    color: string;
    icon: string;
  }>;
}
```

Дефолтный `olma.seed.json` — OLMA пример. `vendhub-prod.seed.json` — реальные 23 автомата VendHub. `demo.seed.json` — минимальный для тестов.

Команда: `pnpm --filter @vendhub/api db:seed --config olma.seed.json`.

### RBAC — не вводим OLMA-роли

OLMA имеет 6 ролей: `super_admin, owner, manager, operator, auditor, tenant_viewer`.
VendHub имеет 7: `owner, admin, manager, operator, warehouse, accountant, viewer`.

Маппинг OLMA → VendHub:
| OLMA | VendHub | Комментарий |
|------|---------|-------------|
| super_admin | OWNER | Полный доступ, система |
| owner | ADMIN | Управление организацией |
| manager | MANAGER | Операции, отчёты |
| operator | OPERATOR | Поле |
| auditor | ACCOUNTANT | Финансы, read-only для audit |
| tenant_viewer | VIEWER | Публичный read-only |

VendHub extras: WAREHOUSE (кладовщик — inventory only), ADMIN (отдельная org admin роль) — добавочные возможности, не мешают OLMA-логике.

### Per-tenant branding

Organization имеет `settings` JSONB (добавим в этом Sprint'е). Там:

```json
{
  "brandColor": "#D3A066",
  "logoUrl": "...",
  "publicPageTitle": "OLMA Кофе",
  "contactPhone": "+998...",
  "language": "ru",
  "timezone": "Asia/Tashkent",
  "currency": "UZS",
  "leadDays": 7,
  "safetyDays": 3
}
```

Public page `/tenant/:slug` читает эти настройки и применяет.

---

## Открытые решения (требуют твоего аппрува)

### Q1: URL naming для публичного вида

- Вариант A: `/tenant/:orgSlug` (OLMA-совместимый, как в спеке)
- Вариант B: `/site/:orgSlug` (VendHub уже имеет `apps/site`, но это отдельный Next.js app)
- Вариант C: Оба варианта работают (редирект `/site/:slug` → `/tenant/:slug`)

**Моя рекомендация:** Вариант A (`/tenant/:orgSlug`) + отдельный `/location/:locationSlug` для детального вида одной локации. Никаких `/site/` — оно занято.

### Q2: Где реализуем публичные страницы?

- Вариант A: В `apps/web` (основное Next.js admin panel) — добавить `/tenant/:slug` route
- Вариант B: В `apps/site` (отдельный Next.js landing) — логичнее т.к. "публичное"
- Вариант C: Новое приложение `apps/tenant`

**Моя рекомендация:** Вариант B (в `apps/site`). Оно уже публичное, есть инфра (SEO, i18n, rate limiting). Добавить dynamic route `/tenant/[slug]`.

### Q3: Оставлять ли существующий VENDHUB_PUBLIC_ORG_ID env var?

Существующий `/client/public/*` hardcoded на одну org через env var. После внедрения `/tenant/:slug` — этот legacy endpoint использовать или удалить?

**Моя рекомендация:** Оставить для обратной совместимости (если какие-то клиенты уже bookmarknули). Через 3 месяца — removal. Документировать как deprecated.

---

## Следующий шаг

После аппрува этих решений — начинаю **Sprint G1: Event-sourced stock movements**.

- Запросы по Q1, Q2, Q3 — могу сам выбрать рекомендации если не ответишь (все три рекомендации — безопасные и backward-compatible).
