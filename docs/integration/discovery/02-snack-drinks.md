# VendHub Snack-Drinks: Технический анализ интеграции

**Дата анализа:** 27.04.2026  
**Источник:** Свежий клон `/Users/js/Projects/_integration-source/VendHub-Snack-Drinks/` (main branch, state на момент анализа)  
**Статус:** Pre-commercial (внутренний тест ≤10 пользователей)

---

## 1. Stack Identity

### Фреймворк и runtime

- **Frontend:** React 18.2.0 (SPA) + Vite 8.0.10 (build tool)
- **Runtime:** Node.js 22.x
- **Type system:** TypeScript 6.0.3 (strict mode, JSDoc + `checkJs` floor = 0)
- **Package manager:** npm (монолит, no workspaces)

### Ключевые зависимости

**Production:**

- `@supabase/supabase-js` 2.104.1 — клиент Supabase (auth + realtime + storage)
- `react-i18next` 17.0.4 + `i18next` 26.0.8 — локализация (RU/EN)
- `lucide-react` 1.11.0 — UI иконки (200+ SVG icons inline)
- `@sentry/react` 10.50.0 — error tracking + performance monitoring
- `posthog-js` 1.372.1 — product analytics
- `xlsx` (vendored 0.20.3.tgz) — Excel import/export

**Dev:**

- `@playwright/test` 1.59.1 — E2E тесты (RLS isolation, smoke tests)
- `vitest` 4.1.5 — unit тесты
- `@testing-library/react` 16.3.2 — компонент-тесты
- `eslint` 9.39.4 + `eslint-plugin-jsx-a11y` 6.10.2 — linting + a11y

### Скрипты

```json
{
  "dev": "vite", // http://localhost:5173
  "build": "vite build && rm -f dist/**/*.map",
  "preview": "vite preview --port 5173",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit -p jsconfig.json",
  "typecheck:floor": "node scripts/typecheck-floor.mjs", // ratchet CI gate
  "test": "vitest run",
  "test:watch": "vitest",
  "smoke": "SECRET=$SECRET ANON=$ANON bash scripts/smoke-test.sh",
  "e2e": "playwright test",
  "e2e:install": "playwright install --with-deps chromium"
}
```

### Database adapter

- **РСУБД:** PostgreSQL 15+ (в Supabase)
- **Клиентская lib:** `@supabase/supabase-js` (REST API via PostgREST)
- **Миграции:** Raw SQL (в `/supabase/migrations/`)
- **RLS:** Включен на всех таблицах с проверкой `current_org_id()` из JWT
- **Realtime:** Supabase Realtime (postgres_changes на выбранных таблицах)

---

## 2. Database Schema

### Основные таблицы (21 таблица)

#### Core entities

| Таблица           | Назначение                     | Ключевые поля                                                                                                                                                                                                                                                                                     |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **organizations** | Тенанты платформы              | `id`, `slug`, `name`, `legal_name`, `inn`, `country`, `currency`, `tenant_public_enabled`, `settings` (jsonb), `created_at`, `deleted_at`                                                                                                                                                         |
| **users**         | Сотрудники тенанта             | `id`, `auth_id` (FK auth.users), `organization_id`, `email`, `name`, `role` (enum), `phone`, `avatar_url`, `telegram_id`, `telegram_username`, `is_active`, `last_login_at`, `extra_roles[]`                                                                                                      |
| **categories**    | Группы товаров (напитки/снеки) | `id`, `organization_id`, `code` (UNIQUE per org), `name`, `icon`, `color`, `sort_order`, `default_markup`, `created_at`                                                                                                                                                                           |
| **locations**     | Склады, машины, офисы          | `id`, `organization_id`, `name`, `type` (ENUM: WAREHOUSE/MACHINE_STORAGE/MACHINE/OFFICE), `address`, `geo_lat`/`geo_lng`, `parent_location_id` (self-ref), `machine_id`, `note`, `deleted_at`                                                                                                     |
| **suppliers**     | Поставщики                     | `id`, `organization_id`, `name`, `contact_name`, `phone`, `email`, `address`, `note`, `is_active`                                                                                                                                                                                                 |
| **products**      | Товары (снеки, напитки)        | `id`, `organization_id`, `name`, `vol` (объём "250ml"), `barcode`, `category_id`, `category_code` (denormalized string), `group` (ENUM: drinks/snacks/other), `selling_price`, `expected_sales_per_day`, `slot_capacity`, `default_supplier_id`, `tags[]`, `image_url`, `is_active`, `deleted_at` |
| **machines**      | Вендинг-автоматы               | `id`, `organization_id`, `code` (UNIQUE per org), `name`, `type` (ENUM: ICE_DRINK/SNACK/COFFEE/HYBRID), `brand`, `model`, `serial_number`, `location_id`, `storage_location_id`, `rows`, `cols`, `layout` (jsonb: slot→product mapping), `is_active`, `installed_at`, `deleted_at`                |

#### Purchase & Stock Movement

| Таблица                | Назначение                                     | Ключевые поля                                                                                                                                                                                                                                                                                            |
| ---------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **purchases**          | Закупочные накладные                           | `id`, `organization_id`, `supplier_id`, `supplier_name_snapshot`, `warehouse_location_id`, `status` (ENUM: DRAFT/CONFIRMED/RECEIVED/CANCELLED), `purchase_date`, `received_at`, `total_amount`, `total_items`, `note`, `by_user_id`                                                                      |
| **purchase_items**     | Товары в накладной                             | `id`, `purchase_id`, `product_id`, `quantity`, `unit_cost`, `line_total`                                                                                                                                                                                                                                 |
| **price_history**      | История закупочных цен                         | `id`, `organization_id`, `product_id`, `supplier_id`, `unit_cost`, `source` (default: 'purchase'), `source_id`, `at` (timestamptz)                                                                                                                                                                       |
| **stock_movements**    | Single Source of Truth для остатков            | `id`, `organization_id`, `product_id`, `from_location_id`, `to_location_id`, `quantity` (>0), `movement_type` (ENUM: PURCHASE_IN/TRANSFER/SALE/ADJUSTMENT_PLUS/ADJUSTMENT_MINUS/WRITE_OFF/RETURN), `unit_cost`, `unit_price`, `reference_type`, `reference_id`, `note`, `by_user_id`, `at`, `created_at` |
| **inventory_balances** | Материализованный остаток (product × location) | `organization_id`, `location_id`, `product_id`, `quantity`, `last_updated_at` (PRIMARY KEY: location_id, product_id)                                                                                                                                                                                     |

#### Sales & Reconciliation

| Таблица                  | Назначение                                       | Ключевые поля                                                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **sales_imports**        | HICON-отчёты с автоматов                         | `id`, `organization_id`, `file_name`, `format` ('HICON2.0', 'JSON'), `machine_id`, `report_date`, `rows_total`, `imported`, `skipped`, `unmapped`, `delta_adjusted`, `total_qty`, `total_revenue`, `delta_log` (jsonb), `unmapped_names` (jsonb), `by_user_id`, `at` |
| **sales_txn_hashes**     | Дедупликация по хэшам транзакций                 | `id`, `organization_id`, `hash_key` (UNIQUE per org), `sales_import_id`, `created_at`                                                                                                                                                                                |
| **sales_aggregated**     | Дневной агрегат (report_day × machine × product) | `organization_id`, `report_day`, `machine_id`, `product_id`, `qty`, `total_amount`, `last_import_id`, `updated_at` (PRIMARY KEY: org, day, machine, product)                                                                                                         |
| **reconciliations**      | Инвентаризация (сверка физического остатка)      | `id`, `organization_id`, `location_id`, `total_shortage`, `note`, `by_user_id`, `at`                                                                                                                                                                                 |
| **reconciliation_items** | Товары в инвентаризации                          | `id`, `organization_id`, `reconciliation_id`, `product_id`, `expected_qty`, `actual_qty`, `diff_qty`, `unit_cost`                                                                                                                                                    |

#### Auxiliary

| Таблица                | Назначение                     | Ключевые поля                                                                                                                                                                          |
| ---------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **slot_history**       | Лог изменений раскладки слотов | `id`, `organization_id`, `machine_id`, `slot_row`, `slot_col`, `action` ('SET'/'CLEAR'), `prev_product_id`, `new_product_id`, `by_user_id`, `at`                                       |
| **cash_collections**   | Выручка из автоматов           | `id`, `organization_id`, `machine_id`, `amount`, `period_from`, `period_to`, `expected_amount`, `discrepancy`, `note`, `by_user_id`                                                    |
| **push_subscriptions** | Web Push подписки (VAPID)      | `id`, `user_id`, `endpoint`, `auth_key`, `p256_key`, `created_at`                                                                                                                      |
| **invites**            | Telegram invite links          | `id`, `organization_id`, `token` (UNIQUE), `role`, `extra_roles[]`, `tenant_location_ids[]`, `label`, `max_uses`, `used_count`, `expires_at`, `created_by`, `created_at`, `revoked_at` |

### ENUM типы

```sql
role_enum: 'super_admin', 'owner', 'manager', 'operator', 'auditor', 'tenant_viewer'
location_type: 'WAREHOUSE', 'MACHINE_STORAGE', 'MACHINE', 'OFFICE'
machine_type: 'ICE_DRINK', 'SNACK', 'COFFEE', 'HYBRID'
product_group: 'drinks', 'snacks', 'other'
purchase_status: 'DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'
movement_type: 'PURCHASE_IN', 'TRANSFER', 'SALE', 'ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS', 'WRITE_OFF', 'RETURN'
```

### Триггеры & Functions

- **`apply_stock_movement()`** — trigger на `stock_movements` → автоматически обновляет `inventory_balances` и пишет в `price_history`
- **`consume_invite(token)`** — RPC для атомарного потребления invite (защита от race conditions)
- **`is_super_admin()`** — helper для RLS policies
- **`current_org_id()`** — extract org_id из JWT claim

### RLS Policy

Все таблицы используют принцип: `WHERE organization_id = current_org_id()` для изоляции между тенантами. Purchase items наследуют доступ через FK к purchases.

### Realtime subscriptions

Подписаны: products, machines, inventory_balances, stock_movements, sales_imports (для live-обновлений UI)

---

## 3. UI / Pages

### Целевая аудитория

- **Оператор склада** — основной пользователь (inventory reconciliation, sales import)
- **Менеджер/владелец** — analytics, margin, finance, user management
- **Super admin** — platform-wide: organizations, platform stats, user invites
- **Tenant viewer** — публичная витрина товаров (TenantPage.jsx на `/t/:slug`)

### Список экранов в App.jsx (23 экрана + публичный)

#### Primary navigation (bottom tab bar)

1. **Home** — dashboard: quick stats, recent movements, top products (для tenants — TenantDashboard)
2. **Reorder** — список товаров с low-stock alerts + кнопка "быстрой закупки"
3. **Catalog** — поиск/фильтр товаров по категориям, редактирование (CRUD)
4. **Purchases** — история закупок + формирование новой накладной
5. **More** (settings icon) — меню дополнительных экранов

#### Secondary screens (в меню "More", доступ по ролям)

**Аналитика & Финансы:**

- **Analytics** — обороты по дням, топ-товары, сезонность (perm: view_analytics)
- **Margin** — маржинальность по товарам (sell_price - cost), по категориям
- **PnL (P&L)** — ежемесячный profit/loss-отчёт
- **Finance Export** — XLSX с суммами, COGS, revenue для бухгалтерии

**Управление остатками:**

- **Import Sales** — CSV/HICON upload с автомата, парсинг + reconcile с expected
- **Import Purchases** — Excel/CSV с поставщиков → batch-insert в purchases
- **Reconcile** — физическая инвентаризация (сверка факта с expected)
- **Movements** — лог всех stock_movements (purchases, transfers, sales, adjustments)
- **Expiration** — товары со сроком годности < N дней (alert UI)
- **Route** — какие машины нужно обслужить (low stock)
- **Cash** — выручка с машин (cash_collections) + сверка с SALE movements

**Справочники (Manage Catalog):**

- **Layout** — редактор раскладки слотов машины (grid × product)
- **Suppliers** — CRUD поставщиков
- **Categories** — группировка товаров
- **Locations** — иерархия: warehouse → machine_storage → machines
- **Price** — История закупочных цен (публичный экран для арендаторов)
- **Price History** — график цен по товарам (view_all)
- **Slot History** — кто менял раскладку когда (audit trail для слотов)

**Admin & Users:**

- **Users** — управление сотрудниками (role assignment, deactivate)
- **Invites** — создание Telegram invite links (deep link с role-ом)
- **Audit** — полный лог действий (who/what/when)
- **Settings** — параметры организации (язык, timezone, lead_days, safety_days)

**Super Admin только:**

- **Organizations** — переключение между тенантами, список клиентов
- **Platform** — глобальная статистика (DB размер, cron health, audit summary)

**Публичный сайт (не требует auth):**

- **TenantPage** — витрина товаров org'а (`/t/:slug`), может быть встроена в website

### Ключевые UX flows

**Добавление товара:**

1. Catalog → "+" → форма (name, vol, barcode, category, price, supplier)
2. Optional: загрузка image через storage bucket → `image_url` в products
3. Auto-suggest категории по теме

**Редактирование закупки:**

1. Purchases → выбрать draft or new
2. Выбрать supplier, warehouse_location
3. Add line items (product, qty, unit_cost) с валидацией
4. Submit → status DRAFT → CONFIRMED → RECEIVED (три шага)

**Импорт с HICON (вендинг-машин):**

1. Import Sales → выбрать machine, upload CSV (дата, product_code, qty, price)
2. Parser ищет товары по barcode/name (fuzzy matching)
3. Highlight unmapped lines
4. Confirm + система создаёт SALE stock_movements + обновляет inventory_balances
5. Дедупликация по hash (txn_hashes table)

**Инвентаризация:**

1. Reconcile → выбрать location (machine или warehouse)
2. Scan/enter actual qty за каждый товар
3. System показит expected (из inventory_balances) vs actual
4. Итоговый difference → total_shortage
5. Submit → stock_movement с type ADJUSTMENT_PLUS/MINUS

**Фильтры & поиск:**

- Fuzzy search по names (lib.js: `fuzzyMatch()`)
- Filter по category, supplier, location, machine_type
- Date ranges для movements/imports/sales
- Role-based visibility (RLS + frontend can-check)

---

## 4. API / Backend

### Architecture

**No separate backend.** Архитектура "API-less" (на Supabase):

- **Frontend** → Supabase JavaScript client (`@supabase/supabase-js`)
- **Database** → PostgreSQL 15 (RLS + triggers для бизнес-логики)
- **Edge Functions** → Deno-based serverless functions (TypeScript)

### Edge Functions (9 функций в `/supabase/functions/`)

| Функция              | Метод          | Назначение                                                     | Auth                                      |
| -------------------- | -------------- | -------------------------------------------------------------- | ----------------------------------------- |
| **telegram-auth**    | POST           | HMAC-verify initData → create/update user → return session     | None (verifies HMAC)                      |
| **auth-web-link**    | POST           | Magic link auth для desktop browser (non-Telegram PWA)         | JWT (user must be authed to request link) |
| **send-push**        | POST           | Send Web Push notification (VAPID) по store.push_subscriptions | JWT                                       |
| **send-email**       | POST           | Send email via Resend API (digest, receipts)                   | JWT + internal only                       |
| **notify-low-stock** | Cron (daily)   | Scan products with qty < leadDays, send to owners              | Cron bearer (vault)                       |
| **archive-weekly**   | Cron (weekly)  | Move old records to archive table (Audit C-10)                 | Cron bearer                               |
| **archive-prune**    | Cron (monthly) | Delete archive older than 12 months                            | Cron bearer                               |
| **admin-ops**        | POST           | SQL probe, role grants, migration repairs (admin only)         | JWT + is_super_admin check                |
| **admin-metrics**    | GET            | Platform-wide stats (users, orgs, DB size)                     | JWT + origin allowlist                    |

**Cron jobs** (via pg_cron + HTTP):

- Daily 06:00 UTC: notify-low-stock
- Weekly (Sun 02:00): archive-weekly
- Monthly (1st, 02:00): archive-prune

### Client-side logic (offline-first)

- **Offline queue** (`offlineQueue.js`) — queues POST/PUT/DELETE when offline, auto-flushes on reconnect
- **Realtime subscriptions** (Supabase Realtime) — live updates на stock_movements, inventory_balances
- **Conflict resolution** — last-write-wins для stock_movements (хронологический order by `at`)

### HTTP API endpoints (implicit via PostgREST)

Нет явного REST layer — все идет через Supabase:

```
GET  /rest/v1/products?organization_id=eq.<org_id>
POST /rest/v1/stock_movements
PATCH /rest/v1/products?id=eq.<id>
DELETE /rest/v1/purchases?id=eq.<id>
RPC: supabase.functions.invoke('telegram-auth')
```

### Authentication

**Primary:** Telegram WebApp

- User clicks "Open App" in Telegram bot
- Telegram sends `initData` (HMAC-signed JSON with user profile)
- Edge Function `telegram-auth` verifies HMAC (SHA256 chain), upserts user, returns Supabase session
- JWT contains: `sub` (auth_id), `org_id` (from custom_access_token_hook), `role`

**Secondary:** Magic link (PWA browser)

- Desktop user: email → `auth-web-link` Edge Function → sends magic link
- Click link → Supabase auth auto-signs in + redirects to app

**JWT Claims (custom_access_token_hook):**

```json
{
  "sub": "uuid",
  "org_id": "org-uuid",
  "role": "owner|manager|operator|auditor|tenant_viewer|super_admin",
  "extra_roles": ["warehouse", "auditor"],
  "tenant_location_ids": ["loc-uuid-1", "loc-uuid-2"]
}
```

### Session management

- Stored in localStorage under key `inv-platform-auth`
- Auto-refresh via Supabase client (refreshToken behind the scenes)
- Logout: clear localStorage + clear offline queue

---

## 5. External Integrations

### Supabase (main backend)

- **Auth** (email + Telegram WebApp)
- **PostgreSQL 15** (RLS, triggers, functions, cron)
- **Realtime** (postgres_changes subscriptions)
- **Storage** (product images bucket, purchase receipts bucket)
- **Edge Functions** (Deno runtime)

### Vercel

- **Hosting:** SPA frontend (dist/ deployment)
- **Cache headers:** Service Worker (cache-first for static), no-cache for sw.js
- **CSP:** Strict (self + specific origins for Telegram, Sentry, PostHog)
- **Environment variables:** Injected at build time (VITE\_\* vars)

### Telegram

- **Bot API:** telegram-auth Edge Function calls Telegram API to get user profile (implicit via initData HMAC)
- **WebApp SDK:** Haptic feedback (HapticFeedback.impactOccurred), theme (isDark), window expansion
- **Mini App:** Configured via @BotFather → points to https://vend-hub-snack-drinks.vercel.app

### Observability

**Sentry** (`@sentry/react`):

- React error boundary + unhandled promise rejections
- Performance monitoring (Core Web Vitals)
- Source maps uploaded via `@sentry/vite-plugin` (on build)
- Sample rate: 10% (errors), 5% (transactions) — see main.jsx

**PostHog** (`posthog-js`):

- Product analytics: login_completed, first_session, create_purchase, import_sales events
- User identification: role, org_id, telegram_username
- Group tracking: organization (org_id → name)

### Optional email (Resend)

- When `RESEND_API_KEY` set in Edge Function secrets
- `notify-low-stock` Cron → send digest to owners/managers
- `send-email` function → for receipts, invites (future)

### Optional Web Push (VAPID)

- When `VAPID_*` keys set
- User can subscribe in Settings → push notifications
- Subscriptions stored in `push_subscriptions` table
- `send-push` Edge Function invokes Web Push API

### Environment variables (.env.local.example)

```
# Supabase
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Edge Functions only
SUPABASE_JWT_SECRET=...           # For admin-ops JWT verification

# Telegram
TG_BOT_TOKEN=1234567890:AAE...    # From @BotFather
VITE_TG_BOT=olma_inventory_bot    # Bot username
VITE_TG_MINIAPP=<short_name>      # Optional Mini App name (from /newapp)

# Web Push
VAPID_PUBLIC_KEY=B...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM="VendHub <digest@yourdomain.com>"

# Observability
VITE_SENTRY_DSN=https://...@<org>.ingest.sentry.io/<project>
SENTRY_AUTH_TOKEN=               # For uploading source maps
SENTRY_ORG=
SENTRY_PROJECT=vend-hub-snack-drinks

VITE_POSTHOG_KEY=phc_...
VITE_POSTHOG_HOST=https://us.i.posthog.com

# E2E RLS tests
TEST_SUPABASE_URL=
TEST_SUPABASE_ANON_KEY=
TEST_SUPABASE_SERVICE_ROLE_KEY=
TEST_USER_A_TOKEN=
TEST_USER_B_TOKEN=
TEST_ORG_B_ID=

# Admin endpoint allowlist
ALLOWED_ORIGINS=https://vend-hub-snack-drinks.vercel.app
```

---

## 6. Production Status

### Deployment

- **URL:** https://vend-hub-snack-drinks.vercel.app (Vercel)
- **Platform:** Vercel (serverless SPA hosting) + Supabase (PostgreSQL + Edge Functions on Deno)
- **Build:** `npm run build` → removes source maps → Vercel publishes dist/
- **Database:** Supabase EU/Asia region (pre-commercial, будет мигрирована в UZ per compliance)

### Health & Monitoring

- **Sentry dashboards:** Error tracking, release health, performance
- **PostHog:** User behavior, feature adoption, cohort analysis
- **Database:** Supabase dashboard (query performance, storage usage)
- **Cron jobs:** `admin-metrics` Edge Function exposes `/cron-http-health` view (monitor via external cron service)

### Status notes

- **Pre-commercial:** Internal testing only (≤10 users from GLOBERENT LLC)
- **Legal:** PII compliance in progress (N-21 localization, N-22 consent UI) — can wait until external user signup
- **Infrastructure migration:** Pre-launch, data will move to UZ data center (Закон ЗРУ-547)

---

## 7. Tests & Quality

### Unit / Component tests

- **Vitest + @testing-library/react** — 5 test files
  - `tests/format.test.js` — date/time/currency formatting
  - `tests/fuzzy.test.js` — fuzzy search matching
  - `tests/slot.test.js` — slot geometry (grid calculations)
  - `tests/roles.test.js` — permission matrix (can() function)
  - `tests/components.test.jsx` — shared UI components (Button, Input, Modal)

### E2E tests (Playwright)

- **`e2e/rls-isolation.spec.ts`** — Cross-tenant RLS probes (audit H-14)
  - User in org A cannot SELECT org B products
  - User in org A cannot INSERT into org B's tables
  - Telegram auth rejects bad HMAC
  - [Requires TEST_SUPABASE_* env vars]

- **`e2e/smoke.spec.ts`** — Basic happy-path flows
  - Login (Telegram Web App)
  - View catalog
  - Create purchase draft
  - Upload sales import

### Code quality gates

- **ESLint 9** — checkJs strict mode, JSX a11y rules, react-hooks rules
- **TypeScript 6** — `noEmit` type checking (jsconfig.json)
- **Typecheck floor** — ratchet CI gate (prevent regression)
- **Sentry source maps** — uploaded on production build (for debugging minified code)

### Coverage

- Not formally measured (no coverage tool configured)
- **Focus:** RLS isolation (security), permission matrix (audit), UI components (user-facing)

---

## 8. Что уникального

### Снак-Дринкс vs VendHub-OS (NestJS+TypeORM)

**Уникальные features (не в OS):**

1. **PWA (Progressive Web App)**
   - Installable на iPhone/Android без App Store
   - Service Worker с offline-first кэшингом
   - Выживает loss-of-connectivity, auto-syncs on reconnect
   - Telegram WebApp + PWA dual-mode

2. **Telegram Mini App integration**
   - Deep-link invite tokens (INV\_\*) → role-based provisioning
   - Haptic feedback + dark mode from Telegram theme
   - Standalone PWA mode (не зависит от Telegram)

3. **Inventory-first mental model**
   - `stock_movements` как single source of truth (все изменения остатков)
   - Trigger-based materialization (`inventory_balances`)
   - Price history by product & supplier (denormalized для быстрого поиска)

4. **HICON CSV parser + sales reconciliation**
   - Custom format detection (HICON 2.0, JSON variants)
   - Fuzzy matching product names → barcodes
   - Deduplication (sales_txn_hashes)
   - Daily aggregation (sales_aggregated) для cash reconciliation

5. **Slot layout editor**
   - Grid UI (rows × cols) для раскладки товаров в машине
   - slot_history tape (кто меняли когда)
   - Slot-specific inventory tracking

6. **Cash collection tracking**
   - Отдельная таблица (cash_collections) для выручки из машин
   - Reconciliation against expected SALE movements
   - Discrepancy reporting

7. **Offline-capable queue**
   - Local IndexedDB / localStorage для queued mutations
   - Auto-replay on reconnect
   - Audit trail (H-13: purge queue on logout)

8. **Role-based UI rendering**
   - Fine-grained permission system (view_all, manage_catalog, create_purchases, etc.)
   - Extra roles (warehouse, auditor) for multi-role users
   - Tenant location restrictions

### Что есть в OS, чего нет в Snack-Drinks

- Монорепо (turborepo / nx)
- Backend-как-сервис (NestJS с ORM)
- Отдельный API layer (чистая архитектура)
- DB migrations via TypeORM SeederFactory
- Полнотекстовый поиск (Elasticsearch / pgvector)
- Payment integrations (Stripe, UzCard)
- Webhook infrastructure
- Admin dashboard (отдельный SPA или NextJS pages/admin)

---

## 9. Migration Risks

### 1. **Supabase RLS → NestJS @nestjs/authz custom decorator**

**Risk:** High complexity  
RLS policies (40+ строк SQL) должны мигрировать в NestJS guards + decorators. Логика разбита между:

- PostgreSQL функция `current_org_id()` (читает JWT claim)
- RLS policies (проверяют в DB)
- Frontend permission matrix (`can()` function)

**Решение:** Переписать в NestJS Guard с тем же JWT payload (org_id, role, extra_roles). Потенциальная уязвимость: frontend validation должна быть подтверждена backend check.

---

### 2. **Trigger-based SSOT (stock_movements → inventory_balances) → Explicit service layer**

**Risk:** Medium  
Сейчас всё обновление остатков автоматическое (trigger `apply_stock_movement()`). В NestJS придётся явно вызывать метод InventoryService.recordMovement() в каждом endpoint'e.

**Решение:** Создать TransactionService, который обёртывает stock_movements INSERT + inventory_balances UPDATE в одну БД транзакцию. Важно: сохранить idempotence (если INSERT повторится, не создаст дубль).

---

### 3. **Edge Functions (Deno + TypeScript) → NestJS service architecture**

**Risk:** Medium  
9 Edge Functions (telegram-auth, send-push, notify-low-stock, etc.) переехать в NestJS Controllers или Scheduled Tasks:

- telegram-auth → AuthController.loginViaWebApp()
- send-push → NotificationService.sendWebPush()
- notify-low-stock → ScheduledTask (cron) via @nestjs/schedule

**Решение:** Создать 1:1 mapping между функциями и NestJS модулями. Убедиться что CORS, rate limiting, JWT verification работают одинаково.

---

### 4. **Offline queue (localStorage IndexedDB) → Not applicable in backend-only world**

**Risk:** High impact on UX  
Снак-Дринкс полагается на `offlineQueue.js` (queue mutations in localStorage, replay on reconnect). В NestJS+TypeORM это забочится сервер (транзакции, retry logic). Но frontend потеряет работу offline.

**Решение:**

- Если нужна offline функциональность → оставить PWA и frontend queue (работает с NestJS API как с Supabase)
- Если нет → документировать что app requires network (убрать Service Worker)
- Гибридный подход: sync queue в backend (сохранять queued requests в БД, обрабатывать асинхронно)

---

### 5. **Supabase JWT custom claims (org_id, role) → Supabase.RLS bridge disappears**

**Risk:** Critical  
Сейчас логика в 20+ SQL RLS policies. При миграции на NestJS:

- Либо оставить Supabase RLS (работает параллельно с NestJS) — сложно синхронизировать
- Либо выключить RLS и полагаться 100% на NestJS guards — потенциально опасно (дыра в permission check)

**Рекомендация:** Выключить RLS после мигрирования. Добавить интеграционные тесты (same cross-tenant probes что были в e2e/rls-isolation.spec.ts) в NestJS backend.

---

**Итоговая оценка миграции:** ⚠️ **Переписывать, не адаптировать.** Snack-Drinks построена на парадигме Supabase (edge functions, RLS, realtime). NestJS требует явной backend логики. Попытка 1:1 port приведёт к странной гибридной архитектуре. Лучше:

1. Выучить business logic (inventory, permissions, sales reconciliation)
2. Переписать с нуля в NestJS+TypeORM (respecting существующую DB schema)
3. Использовать existing tests как спецификацию (rls-isolation, smoke tests)
