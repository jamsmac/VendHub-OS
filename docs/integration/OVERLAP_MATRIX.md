# OVERLAP MATRIX — VendHub Ecosystem → VendHub-OS

> **Статус:** Discovery complete (2026-04-27). Эта матрица сопоставляет фичи каждого спутника с готовыми модулями VendHub-OS. Источники — `docs/integration/discovery/01..04`.
> **Решения по миграции** — в `DECISION_MATRIX.md`.

---

## 0. Сводка по стекам

| Репо                             | Стек                                                        | БД                               | Совместимость с OS (NestJS+TypeORM+Postgres)                                                            |
| -------------------------------- | ----------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **VendHub-OS** (target)          | NestJS 11, TypeORM 0.3, Next.js 16, Vite, Expo 52, Telegraf | Postgres 16 + Redis              | — (база сравнения)                                                                                      |
| **VendHub-Snack-Drinks**         | React 18 + Vite 8 + **Supabase** (PostgREST/Edge Functions) | Postgres 15 (Supabase)           | ⚠️ Schema совместима, runtime — переписать (RLS→Guards, Triggers→Service, Edge→Cron)                    |
| **Vendhub.uz** (`vendhub-site/`) | Next.js 16 + React 19 + **Supabase** + Leaflet              | Postgres 15 (Supabase, 7 таблиц) | ✅ Frontend — почти drop-in (Next.js 16 уже OS-стек). Backend через Supabase → переписать на NestJS API |
| **VendCashBot**                  | **NestJS 10** + **grammY** + TypeORM + React (frontend)     | Postgres 15 + Redis 7            | ✅ Самый совместимый. Только: grammY → Telegraf, namespace, миграции консолидировать                    |

**Ключевой инсайт:** VendCashBot уже на нативном стеке OS. Snack-Drinks и Vendhub.uz — Supabase-first → требуют переписывания backend-логики, но БД-схемы Postgres-совместимы (можно мигрировать SQL-скриптами).

---

## 1. Каталог продуктов (Products / Categories)

| Фича                     | Snack-Drinks                                                                                                                                                                           | Vendhub.uz                                                                         | VendCashBot | OS (target)                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| **Сущность Product**     | ✅ `products` (org_id, name, vol, barcode, category, group enum, selling_price, expected_sales_per_day, slot_capacity, default_supplier_id, tags[], image_url, is_active, soft delete) | ✅ `products` (22 hardcoded — coffee/tea/snacks с прайсом, options, изображениями) | ❌ нет      | ✅ `Product` entity (33 endpoints; barcode/recipes/batches/pricing/stock; basePrice→sellingPrice; costStatus enum) |
| **Сущность Category**    | ✅ `categories` (code, name, icon, color, sort_order, default_markup)                                                                                                                  | ⚪ через `site_content` JSONB                                                      | ❌ нет      | ✅ `Category` entity (CRUD, icon, color, sortOrder, isActive, org_isolated)                                        |
| **Recipe / Cost calc**   | ❌ нет                                                                                                                                                                                 | ❌ нет                                                                             | ❌ нет      | ✅ `recipes` + `recipe_snapshots` (versioned, cost recalculation)                                                  |
| **Batches / Expiration** | ❌ нет                                                                                                                                                                                 | ❌ нет                                                                             | ❌ нет      | ✅ `batches` (expiration tracking, expired check)                                                                  |
| **Price history**        | ✅ `price_history` (product × supplier × at)                                                                                                                                           | ❌ нет                                                                             | ❌ нет      | ✅ `price_history`                                                                                                 |
| **Изображения**          | ✅ `image_url` + Supabase Storage                                                                                                                                                      | ✅ `image_url` + Supabase Storage                                                  | ❌ нет      | ✅ `StorageService` (Supabase S3 API)                                                                              |

**Вывод:** OS — superset по фичам Product/Category. Snack-Drinks и Vendhub.uz покрываются. Уникально для Snack-Drinks: `vol` (объём), `slot_capacity`, `default_supplier_id`, `tags[]`, `expected_sales_per_day`. Эти поля надо добавить в OS Product.

---

## 2. Машины и раскладка (Machines / Slot Layout)

| Фича                          | Snack-Drinks                                                                                                                                  | Vendhub.uz                                                                | VendCashBot                                  | OS (target)                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| **Machine entity**            | ✅ `machines` (code, name, type enum ICE_DRINK/SNACK/COFFEE/HYBRID, brand, model, serial, location_id, rows×cols, layout JSONB, installed_at) | ✅ `machines` (16 в проде, addresses, GPS, status)                        | ✅ ссылается на machines (внешняя, через FK) | ✅ `Machine` entity                                                             |
| **Slot layout (grid editor)** | ✅ `layout` JSONB (slot→product mapping) + `slot_history` audit                                                                               | ❌ нет (только список)                                                    | ❌ нет                                       | ✅ есть Machine.layout, но **UI редактора в `apps/web` слабее** Snack-Drinks    |
| **GPS координаты на карте**   | ⚪ есть geo_lat/geo_lng                                                                                                                       | ✅ Leaflet + OpenStreetMap (16 маркеров, кластеризация, modal с деталями) | ⚪ есть (для distance check)                 | ⚪ есть в Machine, но **публичная карта с Leaflet → в OS отсутствует / слабая** |
| **Slot history audit**        | ✅ `slot_history` (action SET/CLEAR, prev/new product, by_user, at)                                                                           | ❌ нет                                                                    | ❌ нет                                       | ⚪ нужно проверить, скорее всего нет                                            |
| **Locations иерархия**        | ✅ `locations` (WAREHOUSE/MACHINE_STORAGE/MACHINE/OFFICE, parent_location_id self-ref)                                                        | ⚪ только адрес строкой                                                   | ⚪ внешняя FK                                | ✅ `Location` entity                                                            |

**Вывод:** OS близок к Snack-Drinks, но публичная Leaflet-карта (Vendhub.uz) и slot layout editor UI (Snack-Drinks) — закрыть пробелы.

---

## 3. Inventory & Stock movements

| Фича                                   | Snack-Drinks                                                                                                                 | Vendhub.uz | VendCashBot | OS (target)                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | ------------------------------------------------------------------ |
| **Stock movements (SSOT)**             | ✅ `stock_movements` (PURCHASE_IN/TRANSFER/SALE/ADJUSTMENT_PLUS/MINUS/WRITE_OFF/RETURN) — single source of truth, idempotent | ❌ нет     | ❌ нет      | ✅ `inventory` модуль с stock_movements                            |
| **Inventory balances (materialized)**  | ✅ `inventory_balances` (триггер `apply_stock_movement` авто-обновляет)                                                      | ❌ нет     | ❌ нет      | ⚪ есть, но логика обновления — explicit service (не trigger)      |
| **Purchases / receiving**              | ✅ `purchases` + `purchase_items` (DRAFT→CONFIRMED→RECEIVED→CANCELLED, supplier snapshot)                                    | ❌ нет     | ❌ нет      | ⚪ нужно проверить — возможно есть в `inventory` или `procurement` |
| **Suppliers**                          | ✅ `suppliers` (contact, phone, email, address, is_active)                                                                   | ❌ нет     | ❌ нет      | ⚪ нужно проверить (в discovery 01 не выделено)                    |
| **HICON CSV parser**                   | ✅ UNIQUE (HICON 2.0/JSON, fuzzy matching, sales_imports + sales_txn_hashes dedup + sales_aggregated daily)                  | ❌ нет     | ❌ нет      | ❌ отсутствует                                                     |
| **Reconciliation (инвентаризация)**    | ✅ `reconciliations` + `reconciliation_items` (expected/actual/diff/unit_cost)                                               | ❌ нет     | ❌ нет      | ⚪ частично (`collections` + `cash-finance`)                       |
| **Web Push notifications (low stock)** | ✅ `push_subscriptions` + Edge Function `notify-low-stock`                                                                   | ❌ нет     | ❌ нет      | ❌ отсутствует                                                     |

**Вывод:** Snack-Drinks — лидер по inventory. **HICON CSV parser, Web Push, sales aggregation, supplier purchases — портировать в OS как новые фичи** (или модули).

---

## 4. Sales / Cash collection / Reconciliation

| Фича                                       | Snack-Drinks                                                           | Vendhub.uz | VendCashBot                                                                                                | OS (target)                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Cash collection workflow**               | ⚪ `cash_collections` (machine, amount, period, expected, discrepancy) | ❌ нет     | ✅ полный 2-этапный: COLLECTED→RECEIVED/CANCELLED, pessimistic locking, edit-in-place                      | ✅ `Collection` entity (DRAFT→COUNTED→VERIFIED) — близко, но проще |
| **GPS validation (distance from machine)** | ❌ нет                                                                 | ❌ нет     | ✅ UNIQUE (latitude/longitude + distanceFromMachine)                                                       | ❌ отсутствует                                                     |
| **Photo evidence upload**                  | ❌ нет                                                                 | ❌ нет     | ✅ `message:photo` → Telegram CDN                                                                          | ⚪ есть в `complaints`, но не для collections                      |
| **Audit trail (immutable)**                | ⚪ trigger-based (RLS)                                                 | ❌ нет     | ✅ UNIQUE `CollectionHistory` (changedBy, fieldName, oldValue, newValue, reason) + DB trigger immutability | ⚪ есть в некоторых модулях, не унифицировано                      |
| **Bank deposits / cash on hand**           | ❌ нет                                                                 | ❌ нет     | ⚪ через collection.amount aggregation                                                                     | ✅ `BankDeposit` + `cash-finance` (balance, deposits CRUD)         |
| **Excel экспорт отчётов**                  | ❌ нет                                                                 | ❌ нет     | ✅ xlsx library                                                                                            | ⚪ нужно проверить                                                 |
| **Sales import (HICON)**                   | ✅ см. раздел 3                                                        | ❌ нет     | ❌ нет                                                                                                     | ❌ отсутствует                                                     |

**Вывод:** OS уже имеет Collection workflow, но беднее. **VendCashBot привносит: GPS validation, photo evidence, immutable audit trail, edit-in-place + state machine.** Эти фичи надо втянуть в OS `collections` + `telegram-bot` модули.

---

## 5. Telegram Bots

| Фича                                    | Snack-Drinks                                | Vendhub.uz | VendCashBot                                                                                                   | OS (target)                                                      |
| --------------------------------------- | ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Bot framework**                       | ⚪ Telegram WebApp Auth (HMAC verify)       | ❌ нет     | ✅ **grammY**                                                                                                 | ✅ **Telegraf** (целевой)                                        |
| **Customer bot (catalog/cart/loyalty)** | ❌ нет                                      | ❌ нет     | ❌ нет                                                                                                        | ✅ 9 sub-services (catalog, cart, checkout, loyalty, complaints) |
| **Staff bot (tasks/machines/routes)**   | ❌ нет                                      | ❌ нет     | ❌ нет                                                                                                        | ✅ 8 sub-services (tasks, machines, routes, stats, admin)        |
| **Cash bot (collections/encashment)**   | ❌ нет                                      | ❌ нет     | ✅ 5 команд (`/start`, `/collect`, `/mycollections`, `/pending`, `/help`), state machine, pessimistic locking | ❌ отсутствует — **главный gap**                                 |
| **Telegram Mini App (PWA)**             | ✅ Mini App + standalone PWA dual-mode      | ❌ нет     | ❌ нет                                                                                                        | ⚪ `apps/client` — PWA, но не явно Mini App                      |
| **Invite tokens (deep links)**          | ✅ `invites` table + `consume_invite` RPC   | ❌ нет     | ✅ через invite codes на `/start`                                                                             | ⚪ нужно проверить                                               |
| **TelegramUser unified table**          | ✅ `users.telegram_id`, `telegram_username` | ❌ нет     | ✅ User entity с telegramId                                                                                   | ✅ `TelegramUser` entity                                         |

**Вывод:** OS имеет 2 ботa из 3. **VendCashBot — главный кандидат на MIGRATE как `bot-cash-ops.service.ts`.** grammY → переписать на Telegraf (одинаковый паттерн). Telegram Mini App от Snack-Drinks — отдельная история (см. раздел 7).

---

## 6. Публичный сайт (vendhub.uz domain)

| Фича                              | Snack-Drinks            | Vendhub.uz                                                        | VendCashBot | OS (target)                                                        |
| --------------------------------- | ----------------------- | ----------------------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| **Marketing landing**             | ❌ нет                  | ✅ 6 секций (hero, stats, products, map, promotions, partnership) | ❌ нет      | ⚪ `apps/site` — есть скелет + site-cms JSONB                      |
| **i18n (ru+uz)**                  | ⚪ через Telegram theme | ✅ next-intl 4.8 (447 ключей)                                     | ❌ нет      | ⚪ есть, но 447 ключей перевода — нужно мержить                    |
| **SEO (sitemap/robots/og)**       | ❌ нет                  | ✅ полный (sitemap.ts hreflang, opengraph-image.tsx, JSON-LD)     | ❌ нет      | ⚪ нужно проверить, скорее всего слабее                            |
| **Карта автоматов (Leaflet)**     | ❌ нет                  | ✅ Leaflet + OSM + clustering + modal                             | ❌ нет      | ❌ отсутствует                                                     |
| **Promotions**                    | ❌ нет                  | ✅ `promotions` table (4 active)                                  | ❌ нет      | ⚪ нужно проверить                                                 |
| **Loyalty tiers (public-facing)** | ❌ нет                  | ✅ 4 tiers (Bronze 0% → Platinum 10%) hardcoded                   | ❌ нет      | ✅ полная loyalty system (Wallet, achievements, quests, referrals) |
| **Cooperation form**              | ❌ нет                  | ✅ `cooperation_requests` (rate-limited, RLS)                     | ❌ нет      | ❌ отсутствует                                                     |
| **Partners list**                 | ❌ нет                  | ✅ `partners` (5 logos)                                           | ❌ нет      | ⚪ нужно проверить                                                 |

**Вывод:** Vendhub.uz `vendhub-site/` — **готовый production-grade landing**. OS `apps/site` — скелет. **MIGRATE целиком: vendhub-site/ → apps/site/, выкинуть Supabase, перевести на API через site-cms.**

---

## 7. Клиентское веб-приложение (PWA)

| Фича                                    | Snack-Drinks                                   | Vendhub.uz | VendCashBot            | OS (target)                       |
| --------------------------------------- | ---------------------------------------------- | ---------- | ---------------------- | --------------------------------- |
| **PWA installable**                     | ✅ Service Worker, offline-first               | ❌ нет     | ❌ нет                 | ✅ `apps/client` (Vite React PWA) |
| **Offline queue**                       | ✅ localStorage queued mutations + auto-replay | ❌ нет     | ❌ нет                 | ⚪ нужно проверить                |
| **Telegram Mini App + standalone dual** | ✅ работает в обоих режимах                    | ❌ нет     | ❌ нет                 | ⚪ нужно проверить                |
| **HICON CSV import UI**                 | ✅ uploader + preview + reconciliation         | ❌ нет     | ❌ нет                 | ❌ отсутствует                    |
| **Reconciliation UI**                   | ✅ inventarize machine workflow                | ❌ нет     | ❌ нет                 | ⚪ слабее                         |
| **Slot layout editor (grid)**           | ✅ visual editor для машин                     | ❌ нет     | ❌ нет                 | ⚪ слабее в `apps/web`            |
| **Margin / PnL / Finance dashboards**   | ✅ Analytics, Margin, PnL, Finance, Suppliers  | ❌ нет     | ⚪ только cash reports | ⚪ есть analytics, нужно сравнить |

**Вывод:** Snack-Drinks — отдельный полноценный client. **23 экрана, многие уникальные.** Что куда:

- HICON parser, slot editor, reconciliation, margin/PnL → **в `apps/web` (admin staff workflow)**, не в `apps/client` (это для покупателей в OS).
- PWA offline queue → паттерн для `apps/client`.

---

## 8. Auth & Permissions

| Фича                           | Snack-Drinks                                                                  | Vendhub.uz    | VendCashBot                   | OS (target)                            |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------- | ----------------------------- | -------------------------------------- |
| **Auth provider**              | Supabase Auth + Telegram WebApp HMAC                                          | Supabase Auth | JWT (NestJS) + refresh tokens | JWT + refresh tokens                   |
| **Roles**                      | super_admin, owner, manager, operator, auditor, tenant_viewer + extra_roles[] | (admin only)  | operator, manager, admin      | (нужно проверить, скорее всего шире)   |
| **Multi-tenant isolation**     | RLS policies (current_org_id() в JWT)                                         | RLS           | organizationId в каждом query | organizationId — **критичное правило** |
| **Telegram auth verification** | ✅ HMAC SHA-256                                                               | ❌ нет        | ✅ HMAC SHA-256               | ⚪ нужно проверить                     |
| **JWT в localStorage**         | ⚠️ да                                                                         | ⚠️ возможно   | ⚠️ да (XSS risk)              | ⚪ httpOnly cookies — целевой паттерн  |

**Вывод:** Все спутники — multi-tenant ready. RLS Snack-Drinks → переписать в NestJS Guards.

---

## 9. Уникальные фичи (только в одном репо)

### Snack-Drinks UNIQUE (отсутствует в OS):

1. **HICON CSV parser** + sales_aggregated daily + dedup hashes → новый `sales-import` модуль
2. **Trigger-based inventory SSOT** (паттерн → переписать как explicit service)
3. **Web Push notifications** (low-stock alerts) → `push-notifications` модуль
4. **Slot layout grid editor UI** (visual machine layout)
5. **Offline queue в IndexedDB/localStorage** (паттерн для PWA)
6. **HICON fuzzy matching** product names
7. **Margin / PnL / Finance dashboards**
8. **Reconciliation 2-step workflow UI** (inventarize)
9. **Invite tokens с extra_roles + tenant_location_ids[]**

### Vendhub.uz UNIQUE (только в `vendhub-site/`):

1. **Leaflet + OpenStreetMap карта** автоматов (clustering)
2. **next-intl с 447 ключами перевода** (ru+uz готовый словарь)
3. **Cooperation request form** (`cooperation_requests`)
4. **Partners table** (5 логотипов)
5. **Готовый production landing** (6 секций, JSON-LD, OG image)
6. **22 продукта + 16 машин** уже в Supabase (production data — мигрировать!)
7. **Promotions admin CRUD**

### VendCashBot UNIQUE:

1. **GPS validation + distanceFromMachine** для проверки реального присутствия инкассатора
2. **Photo evidence** через Telegram CDN
3. **CollectionHistory immutable audit** (DB trigger)
4. **Edit-in-place state machine** + pessimistic locking
5. **Excel xlsx export** отчётов
6. **2-stage workflow** operator → manager (в OS Collection — 3-stage, но без edit history)

---

## 10. Что есть только в OS (надо сохранить)

- 82 модуля API, 159 entities (vs 21 у Snack-Drinks, 7 у Vendhub.uz, 10 у VendCashBot)
- Recipes + Batches + Cost calculation (Product → Recipe → Ingredients → Snapshot versioning)
- Полный Customer bot (9 sub-services: catalog, cart, checkout, loyalty, complaints, referrals)
- Полный Staff bot (8 sub-services)
- Routes / Trips модуль
- Payments (Payme, Click, Uzum готовы)
- Wallet, Achievements, Quests, Referrals (loyalty system)
- vhm24-integration bridge
- 39 миграций production-grade
- Mobile app (`apps/mobile`, Expo 52, 20+ экранов)
- Turborepo с 5 apps и shared packages

---

## 11. Сводная таблица «слой → лучший репо»

| Слой                      | Лучший источник            | Почему                                                    |
| ------------------------- | -------------------------- | --------------------------------------------------------- |
| **Backend архитектура**   | OS                         | NestJS 11 + 82 модуля + 159 entities — superset           |
| **Telegram cash-bot UX**  | VendCashBot                | Готовый production-tested workflow с GPS, photos, audit   |
| **Inventory tracking**    | Snack-Drinks               | SSOT через stock_movements, HICON, web push               |
| **Public marketing site** | Vendhub.uz `vendhub-site/` | Готовый Next.js 16 production landing с картой, i18n, SEO |
| **Customer/Staff bots**   | OS                         | Уже есть, спутники не дублируют                           |
| **Loyalty system**        | OS                         | Wallet/achievements/quests vs hardcoded tiers Vendhub.uz  |
| **Map + i18n словарь**    | Vendhub.uz                 | Leaflet интеграция + 447 переводов                        |
| **Slot editor UI**        | Snack-Drinks               | Visual grid editor                                        |
| **Mobile app**            | OS                         | Expo 52 — есть только тут                                 |
| **Recipes / Batches**     | OS                         | Уникально в OS                                            |

---

## 12. Pre-Phase-2 чеклист

Перед миграцией кода нужно дополнительно проверить:

- [ ] Есть ли в OS supplier / purchase модули (discovery 01 не выделил)
- [ ] Где именно в OS живёт reconciliation (collections vs cash-finance vs новый модуль)
- [ ] Web push в OS — есть в `notifications` модуле?
- [ ] Slot editor UI в `apps/web` — насколько слаб vs Snack-Drinks
- [ ] Существует ли публичная карта автоматов в `apps/site`
- [ ] Совпадает ли формат TelegramUser в OS и VendCashBot User entity

Эти вопросы решаются 1 командой `grep` в Phase 2 — не блокеры для DECISION_MATRIX.
