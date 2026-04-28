# DECISION MATRIX — План интеграции спутников в VendHub-OS

> **Статус:** Pending approval (2026-04-27). Решения по каждой фиче. Источник — `OVERLAP_MATRIX.md`.
> **Условные обозначения:**
>
> - 🟢 **MIGRATE** — перенести в OS (с переписыванием под NestJS+TypeORM где надо)
> - 🟡 **REPLACE** — фича в OS лучше/равна, выкинуть из спутника, оставить OS
> - 🔵 **KEEP-AS-SERVICE** — оставить как отдельный микросервис, ходящий в OS API
> - ⚪ **DROP** — фича устарела или дублируется, не переносим
> - ⏸ **DEFER** — отложить (не в scope текущей миссии)

---

## 0. TL;DR — порядок исполнения

**Принцип очерёдности:** от наименьшего риска к наибольшему. Сначала фичи с минимальной переписью, в конце — Supabase-replatforming.

| Phase   | Спутник                                                            | Риск   | Срок (грубо) | Итог                                 |
| ------- | ------------------------------------------------------------------ | ------ | ------------ | ------------------------------------ |
| **2.1** | Schema diffs + SQL-scripts на entity'и                             | LOW    | 0.5 sprint   | Миграции готовы                      |
| **2.2** | **VendCashBot → bot-cash-ops**                                     | LOW    | 1 sprint     | Cash-бот в OS                        |
| **3.1** | **Vendhub.uz `vendhub-site/` → apps/site**                         | MEDIUM | 1.5 sprint   | Публичный сайт в OS                  |
| **3.2** | **Snack-Drinks core (Product/Inventory/Stock movements)**          | HIGH   | 2 sprints    | Inventory-функционал из Snack-Drinks |
| **3.3** | **Snack-Drinks UNIQUE (HICON, web push, slot editor, dashboards)** | HIGH   | 2 sprints    | Все уникальные фичи                  |
| **4**   | Bot consolidation (3 бота под одной крышей)                        | LOW    | 0.5 sprint   | Один процесс, общая БД               |
| **5**   | Site & Client unification + i18n merge                             | MEDIUM | 1 sprint     | 447 переводов + Leaflet              |
| **6**   | Deprecation 3 спутник-репо                                         | LOW    | 0.5 sprint   | Архивирование                        |
| **7**   | E2E verification                                                   | MEDIUM | 1 sprint     | `pnpm dev` поднимает всё             |

**Total estimate:** ~10 спринтов (2.5 месяца при 1-недельном спринте) — оценка грубая, скорректируется после Phase 2.1.

---

## 1. VendHub-Snack-Drinks — feature-by-feature

| #    | Фича                                                                                                                                                     | Решение                | Куда в OS                                                  | Обоснование                                                                | Effort         |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- | -------------- |
| 1.1  | `products` таблица + поля `vol`, `slot_capacity`, `default_supplier_id`, `tags[]`, `expected_sales_per_day`, `image_url`                                 | 🟢 MIGRATE (поля)      | `Product` entity (расширить миграцией)                     | OS Product — superset, но недостающие поля привнести                       | S              |
| 1.2  | `categories` таблица                                                                                                                                     | 🟡 REPLACE             | OS `Category` (уже есть)                                   | Полное покрытие                                                            | XS             |
| 1.3  | `locations` иерархия (parent_location_id self-ref)                                                                                                       | 🟢 MIGRATE             | `Location` (если нет иерархии — добавить)                  | Snack-Drinks богаче — WAREHOUSE/MACHINE_STORAGE/MACHINE/OFFICE             | S              |
| 1.4  | `suppliers`                                                                                                                                              | 🟢 MIGRATE             | новый `suppliers` модуль или `procurement`                 | В discovery 01 не выделено — **проверить в Phase 2.1**                     | S              |
| 1.5  | `purchases` + `purchase_items` (DRAFT→CONFIRMED→RECEIVED→CANCELLED)                                                                                      | 🟢 MIGRATE             | новый `purchases` модуль (или существующий)                | Workflow закупок отсутствует / слабый в OS                                 | M              |
| 1.6  | `price_history`                                                                                                                                          | 🟡 REPLACE             | OS `price_history` (есть в `products`)                     | Уже есть                                                                   | XS             |
| 1.7  | `stock_movements` SSOT (7 movement_type'ов)                                                                                                              | 🟢 MIGRATE             | OS `inventory.stock_movements` (расширить enum)            | Унифицировать enum, схему                                                  | M              |
| 1.8  | `inventory_balances` materialized                                                                                                                        | 🟢 MIGRATE паттерн     | OS `inventory_balances` (explicit service, не trigger!)    | RLS-trigger переписать в TransactionService с idempotence                  | M              |
| 1.9  | `apply_stock_movement` Postgres trigger                                                                                                                  | 🟡 REPLACE паттерном   | NestJS `InventoryService.recordMovement()` в БД-транзакции | OS правило: triggers только для immutability (audit), не для бизнес-логики | M              |
| 1.10 | `sales_imports` + HICON CSV parser                                                                                                                       | 🟢 MIGRATE             | новый `sales-import` модуль                                | UNIQUE — не имеет аналога в OS                                             | L              |
| 1.11 | `sales_txn_hashes` (dedup)                                                                                                                               | 🟢 MIGRATE             | вместе с 1.10                                              | Часть HICON                                                                | XS             |
| 1.12 | `sales_aggregated` (daily aggregate)                                                                                                                     | 🟢 MIGRATE             | вместе с 1.10 + cron                                       | Часть HICON                                                                | S              |
| 1.13 | `reconciliations` + `reconciliation_items`                                                                                                               | 🟢 MIGRATE             | OS `collections` или новый `reconciliations`               | OS `collections` — кассовая, нужна отдельная инвентарная сверка            | M              |
| 1.14 | `cash_collections` (snack-drinks)                                                                                                                        | 🟡 REPLACE             | OS `Collection` + VendCashBot impl (см. раздел 3)          | OS workflow + VendCashBot UX — лучшая комбинация                           | XS             |
| 1.15 | `slot_history` audit                                                                                                                                     | 🟢 MIGRATE             | новая таблица в `machines` модуле                          | OS не имеет slot history                                                   | S              |
| 1.16 | `push_subscriptions` + Web Push (VAPID)                                                                                                                  | 🟢 MIGRATE             | новый `web-push` модуль или в `notifications`              | UNIQUE — нет в OS                                                          | M              |
| 1.17 | `invites` + `consume_invite` RPC                                                                                                                         | 🟢 MIGRATE             | OS `invites` (если нет — создать)                          | extra_roles + tenant_location_ids — гибче чем в OS                         | S              |
| 1.18 | RLS policies (`current_org_id()` everywhere)                                                                                                             | 🟡 REPLACE             | OS `OrganizationGuard` + `@CurrentOrg()` decorator         | OS правило: org isolation — в Guards, не в SQL                             | L (тщательно!) |
| 1.19 | Supabase Edge Functions (9 шт.)                                                                                                                          | 🟡 REPLACE             | NestJS `@nestjs/schedule` Cron + Controllers               | telegram-auth, notify-low-stock, archive-weekly, etc.                      | M              |
| 1.20 | Supabase Storage                                                                                                                                         | 🟡 REPLACE             | OS `StorageService` (Supabase S3 API)                      | Идентично, переключить SDK                                                 | XS             |
| 1.21 | Supabase Auth + Telegram WebApp HMAC                                                                                                                     | 🟡 REPLACE             | OS JWT + Telegram HMAC verify (если нет — добавить)        | Унификация на одном auth                                                   | M              |
| 1.22 | PWA installable + Service Worker offline-first                                                                                                           | 🟢 MIGRATE паттерн     | OS `apps/client` (расширить)                               | OS уже PWA, но усилить offline                                             | S              |
| 1.23 | Offline queue (localStorage queued mutations)                                                                                                            | 🟢 MIGRATE             | `apps/client/src/lib/offline-queue.ts`                     | UNIQUE паттерн                                                             | M              |
| 1.24 | Telegram Mini App + standalone PWA dual-mode                                                                                                             | 🟢 MIGRATE             | `apps/client`                                              | OS `apps/client` уже PWA — добавить Mini App detection                     | S              |
| 1.25 | UI: 23 экрана (Home, Catalog, Layout, Import, Reconcile, Purchases, Analytics, Margin, PnL, Finance, Suppliers, Categories, Users, Invites, Settings...) | 🟢 MIGRATE (выборочно) | `apps/web` (для admin) или `apps/client` (для оператора)   | Большинство — admin workflow → `apps/web/dashboard/*`                      | L              |
| 1.26 | Slot layout editor (visual grid)                                                                                                                         | 🟢 MIGRATE             | `apps/web/dashboard/machines/[id]/layout`                  | OS UI слабее                                                               | M              |
| 1.27 | HICON CSV importer UI                                                                                                                                    | 🟢 MIGRATE             | `apps/web/dashboard/sales/import`                          | UNIQUE                                                                     | M              |
| 1.28 | Margin / PnL / Finance dashboards                                                                                                                        | 🟢 MIGRATE             | `apps/web/dashboard/finance/*`                             | OS analytics беднее                                                        | M              |
| 1.29 | Role-based UI rendering (extra_roles, tenant_location_ids)                                                                                               | 🟢 MIGRATE паттерн     | `apps/web` permissions hook                                | Гибче чем в OS                                                             | S              |

---

## 2. Vendhub.uz — feature-by-feature

| #    | Фича                                                                                          | Решение            | Куда в OS                                                       | Обоснование                                                   | Effort |
| ---- | --------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------- | ------------------------------------------------------------- | ------ |
| 2.1  | `vendhub-site/` Next.js 16 + React 19 (вся кодовая база)                                      | 🟢 MIGRATE целиком | `apps/site` (заменить скелет)                                   | Production-tested, OS-стек, готовый landing                   | M      |
| 2.2  | 6 секций landing (hero, stats, products, map, promotions, why-vendhub)                        | 🟢 MIGRATE         | `apps/site/src/app/[locale]/page.tsx`                           | Готовый дизайн                                                | S      |
| 2.3  | Leaflet + OpenStreetMap карта автоматов                                                       | 🟢 MIGRATE         | `apps/site/src/app/[locale]/machines` (компонент)               | UNIQUE                                                        | S      |
| 2.4  | next-intl 4.8 с 447 ключами (ru+uz)                                                           | 🟢 MIGRATE         | `apps/site/messages/{ru,uz}.json` + словарь в `packages/shared` | Готовый словарь — экономия недель работы                      | S      |
| 2.5  | SEO (sitemap.ts, robots.ts, opengraph-image.tsx, JSON-LD)                                     | 🟢 MIGRATE         | `apps/site/src/app/*`                                           | OS сайт SEO слабее                                            | XS     |
| 2.6  | `cooperation_requests` table + form                                                           | 🟢 MIGRATE         | новый `cooperation` модуль в API + endpoint в site              | UNIQUE                                                        | S      |
| 2.7  | `partners` table (5 logos)                                                                    | 🟢 MIGRATE         | через `site-cms` (JSONB collection 'partners')                  | OS site-cms готов                                             | XS     |
| 2.8  | `promotions` table (4 active)                                                                 | 🟢 MIGRATE         | через `site-cms` (collection 'promotions')                      | Если в OS отдельный promotions — посмотреть; иначе — site-cms | S      |
| 2.9  | `loyalty_tiers` (Bronze/Silver/Gold/Platinum hardcoded)                                       | 🟡 REPLACE         | OS Wallet/Achievements система                                  | OS loyalty гораздо мощнее                                     | XS     |
| 2.10 | 22 продукта + 16 машин в Supabase production data                                             | 🟢 MIGRATE данные  | SQL script `pg_dump → INSERT` в OS Postgres                     | Production data — нельзя терять                               | S      |
| 2.11 | `site_content` JSONB                                                                          | 🟡 REPLACE         | OS `site-cms` (уже JSONB collections)                           | Идентичный паттерн                                            | XS     |
| 2.12 | Admin CRUD панель (products/machines/promotions/loyalty/content)                              | 🟡 REPLACE         | OS `apps/web` (полнее)                                          | Админ — единственный, не дублируем                            | XS     |
| 2.13 | Supabase Auth                                                                                 | 🟡 REPLACE         | OS JWT                                                          | Уже описано в Snack-Drinks                                    | XS     |
| 2.14 | Supabase Storage (изображения продуктов/машин)                                                | 🟡 REPLACE         | OS StorageService                                               | Уже описано                                                   | XS     |
| 2.15 | Railway 3-stage Docker + GitHub Actions CI                                                    | 🟡 REPLACE         | OS `railway.toml` + CI                                          | Унификация деплоя                                             | S      |
| 2.16 | Подпапки `VHM24-repo/`, `VHM24R_1/`, `VHM24R_2/`, `vendbot_manager/`, `vendhub-bot/` (пустые) | ⚪ DROP            | —                                                               | Ghost folders, 0 байт                                         | XS     |

---

## 3. VendCashBot — feature-by-feature

| #    | Фича                                                                      | Решение                              | Куда в OS                                                                       | Обоснование                                                                                                | Effort |
| ---- | ------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 3.1  | NestJS 10 backend + grammY                                                | 🟢 MIGRATE логику, REPLACE framework | `apps/api/src/modules/telegram-bot/services/bot-cash-ops.service.ts`            | grammY → Telegraf (одинаковый паттерн), но 10→11 NestJS upgrade                                            | M      |
| 3.2  | 5 команд (`/start`, `/collect`, `/mycollections`, `/pending`, `/help`)    | 🟢 MIGRATE                           | `bot-cash-ops.service.ts` (handlers)                                            | Готовый UX                                                                                                 | S      |
| 3.3  | Session state machine (Telegram session → step)                           | 🟢 MIGRATE паттерн                   | Telegraf `session()` middleware                                                 | Адаптировать ключи Redis (`cash:session:*`)                                                                | S      |
| 3.4  | `Collection` entity (operator, manager, GPS, photo, status state machine) | 🟢 MIGRATE поля                      | OS `Collection` (расширить миграцией)                                           | OS Collection — простой, привнести fields: latitude, longitude, distanceFromMachine, photoUrl, source enum | S      |
| 3.5  | `CollectionHistory` immutable audit + DB trigger                          | 🟢 MIGRATE                           | новая таблица в OS `collections` модуле                                         | UNIQUE — нет в OS                                                                                          | S      |
| 3.6  | GPS validation (distanceFromMachine)                                      | 🟢 MIGRATE                           | сервис `gps-validation.service.ts`                                              | UNIQUE                                                                                                     | S      |
| 3.7  | Photo evidence upload (Telegram CDN)                                      | 🟢 MIGRATE                           | в bot service + StorageService для архивации                                    | UNIQUE для collections                                                                                     | S      |
| 3.8  | Pessimistic locking при receive()                                         | 🟢 MIGRATE паттерн                   | `Collection.receive()` с `SELECT FOR UPDATE`                                    | Защита от race conditions                                                                                  | S      |
| 3.9  | Edit-in-place state machine (RECEIVED → editable amount)                  | 🟢 MIGRATE                           | в `Collection.update()` + `CollectionHistory`                                   | UNIQUE                                                                                                     | S      |
| 3.10 | Excel xlsx export отчётов                                                 | 🟢 MIGRATE                           | `apps/api/src/modules/reports/exporters/xlsx.exporter.ts`                       | UNIQUE                                                                                                     | XS     |
| 3.11 | Reports: by-machine, by-date, by-operator                                 | 🟢 MIGRATE                           | `apps/api/src/modules/reports/cash.reports.ts`                                  | UNIQUE                                                                                                     | S      |
| 3.12 | RBAC (operator/manager/admin) + JWT + refresh tokens                      | 🟡 REPLACE                           | OS auth система                                                                 | Унификация                                                                                                 | S      |
| 3.13 | React frontend (мини-админка bot-а)                                       | ⚪ DROP                              | —                                                                               | OS `apps/web` уже покрывает                                                                                | XS     |
| 3.14 | 18 миграций + 10 entities                                                 | 🟢 MIGRATE consolidate               | в OS `apps/api/src/database/migrations/`                                        | Консолидировать в 1–3 миграции с timestamps                                                                | M      |
| 3.15 | Docker Compose (5 сервисов + daily backups)                               | 🟡 REPLACE                           | OS `docker-compose.yml` + Railway                                               | Унификация инфры                                                                                           | XS     |
| 3.16 | Telegram bot username + token                                             | 🟢 MIGRATE                           | `.env.example` `CASH_BOT_TOKEN`, `CASH_BOT_USERNAME` (или сохранить prod token) | Третий бот в OS                                                                                            | XS     |
| 3.17 | Audit findings из `AUDIT_REPORT.md` (22 находки, 2 critical)              | 🟢 ИСПРАВИТЬ при миграции            | в коде новых services                                                           | Не тащить bug'и в OS: revoke exposed token, log receive() в audit                                          | S      |
| 3.18 | xlsx vulnerable dependency                                                | ⚪ DROP / 🟡 REPLACE                 | OS `exceljs` (или альтернатива)                                                 | Не тащить уязвимость                                                                                       | XS     |

---

## 4. Решения по бот-консолидации (Phase 4)

| Бот          | Бот-username (prod)       | Целевая структура в OS                                                                         |
| ------------ | ------------------------- | ---------------------------------------------------------------------------------------------- |
| Customer bot | (из OS env, существующий) | `apps/api/src/modules/telegram-bot/services/customer/*.service.ts` (9 sub-services уже есть)   |
| Staff bot    | (из OS env, существующий) | `apps/api/src/modules/telegram-bot/services/staff/*.service.ts` (8 sub-services уже есть)      |
| Cash bot     | (из VendCashBot env)      | `apps/api/src/modules/telegram-bot/services/cash/*.service.ts` (NEW, привнести из VendCashBot) |

**Архитектура:** один процесс NestJS, три webhook'а (`/webhook/customer`, `/webhook/staff`, `/webhook/cash`) с separate secrets, общий `TelegramUser` table с полем `botRoles[]` (массив, чтобы один Telegram-аккаунт мог быть и operator, и customer).

---

## 5. Решения по KEEP-AS-SERVICE

**Решение:** ❌ Никаких микросервисов. **Все 3 спутника — MIGRATE целиком**, не оставляем как отдельные сервисы.

**Обоснование:**

1. Главная цель миссии — **унификация**. Микросервисная архитектура противоречит цели.
2. Размеры спутников малы (10–21 таблица, 5–23 экрана) — не оправдывают operational complexity.
3. Стек везде Postgres-совместимый — нет технических барьеров для слияния.
4. У OS уже монорепо с 5 apps — добавить `apps/site` (готовый из Vendhub.uz) и расширить `apps/web` / `apps/client` — это естественное расширение.

**Исключение (временно):**

- В **transition window** (между Phase 3.1 и Phase 7) можно держать `vendhub.uz` production-сайт работающим до полной миграции `apps/site`, чтобы не уронить публичный домен.
- Аналогично — VendCashBot в проде до Phase 2.2 завершения.
- После Phase 6 — все 3 репо архивируются.

---

## 6. Решения по DROP

| Что                                                                                  | Откуда                   | Причина                                                                                                                             |
| ------------------------------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Подпапки `VHM24-repo/`, `VHM24R_1/`, `VHM24R_2/`, `vendbot_manager/`, `vendhub-bot/` | Vendhub.uz               | Пустые ghost folders (0 байт)                                                                                                       |
| React frontend VendCashBot                                                           | VendCashBot              | OS `apps/web` уже полностью покрывает админку                                                                                       |
| `xlsx` npm package                                                                   | VendCashBot              | Vulnerable, заменить на `exceljs`                                                                                                   |
| Audit-prompts/markdown файлы                                                         | VendCashBot/Snack-Drinks | Декоративная документация (`AUDIT_*.md`, `IMPLEMENTATION_*.md`) — заархивировать в `docs/integration/legacy/`, не в production code |
| Drizzle/MySQL код                                                                    | (если найдётся)          | OS правило — НЕ Drizzle, НЕ MySQL                                                                                                   |

---

## 7. Решения по DEFER (вне scope текущей миссии)

| Что                                             | Причина                                                      |
| ----------------------------------------------- | ------------------------------------------------------------ |
| Railway production deploy                       | P1.1 issue в `docs/ROADMAP-2026-Q2.md` — отдельная задача    |
| Production data backup-and-merge                | После schema confirmation в Phase 2.1                        |
| Telegram bot token rotation (security)          | Сделать **до** Phase 4 launch как отдельный pre-flight check |
| Mobile app расширение под Snack-Drinks features | После Phase 7                                                |
| AI/OCR features (если найдутся в спутниках)     | Отдельный sprint                                             |

---

## 8. Phase 2.1 — Schema diffs (что нужно сделать ДО кода)

Перед любой миграцией кода написать SQL diff'ы:

1. `OS.products` ← добавить поля: `vol`, `slot_capacity`, `default_supplier_id`, `tags[]`, `expected_sales_per_day`, `image_url` (из Snack-Drinks)
2. `OS.locations` ← добавить self-ref `parent_location_id`, enum `WAREHOUSE/MACHINE_STORAGE/MACHINE/OFFICE` (из Snack-Drinks)
3. `OS.collections` ← добавить `latitude`, `longitude`, `distanceFromMachine`, `photoUrl`, `source` enum, расширить state machine (из VendCashBot)
4. `OS.collection_history` ← создать (из VendCashBot)
5. `OS.suppliers` ← создать если нет (из Snack-Drinks)
6. `OS.purchases` + `purchase_items` ← создать если нет (из Snack-Drinks)
7. `OS.stock_movements` ← расширить enum типов movement_type (PURCHASE_IN/TRANSFER/SALE/ADJUSTMENT_PLUS/MINUS/WRITE_OFF/RETURN)
8. `OS.sales_imports`, `sales_txn_hashes`, `sales_aggregated` ← создать (HICON, из Snack-Drinks)
9. `OS.reconciliations` + `reconciliation_items` ← создать (из Snack-Drinks)
10. `OS.slot_history` ← создать (из Snack-Drinks)
11. `OS.push_subscriptions` ← создать (из Snack-Drinks)
12. `OS.cooperation_requests` ← создать (из Vendhub.uz)
13. `OS.partners` ← через site-cms (или отдельная таблица)

Каждый diff — отдельная миграция в `apps/api/src/database/migrations/{ts}-{Name}.ts` (raw SQL внутри `MigrationInterface`).

---

## 9. Risk register

| Риск                                                                  | Severity | Mitigation                                                                                                      |
| --------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| Snack-Drinks RLS policies не покроются Guards → security gap          | HIGH     | Phase 2.1: написать e2e тест `rls-isolation.spec.ts` (есть в Snack-Drinks) — портировать как Guard verification |
| Trigger-based inventory → race conditions при ручном перенесении      | HIGH     | Использовать БД-транзакции + `SELECT FOR UPDATE` + idempotency keys                                             |
| 18 миграций VendCashBot конфликтуют по timestamp с 39 OS миграциями   | MEDIUM   | Консолидировать в одну новую миграцию с актуальным timestamp                                                    |
| Production data Vendhub.uz (22 продукта/16 машин) — IDOR при миграции | MEDIUM   | SQL-script с явным `organization_id` для каждого record                                                         |
| 447 i18n ключей пересекаются с OS словарём                            | LOW      | Diff + manual reconciliation (1 час работы)                                                                     |
| Telegram bot tokens leakage (1 critical в VendCashBot)                | CRITICAL | Revoke + rotate **до** Phase 4                                                                                  |
| Supabase Auth ↔ JWT migration → юзеры залогинятся заново              | MEDIUM   | Email уведомление + grace period                                                                                |
| `xlsx` vulnerability → известная CVE                                  | MEDIUM   | Заменить на `exceljs` при миграции (не тащить vulnerability)                                                    |

---

## 10. Effort estimate (T-shirt)

- XS = 0.5–2 часа
- S = 2–8 часов (день)
- M = 1–3 дня
- L = 3+ дней

Сумма по таблицам:

- Snack-Drinks: ~6×L + 14×M + 8×S + 1×XS ≈ 25–35 рабочих дней
- Vendhub.uz: ~1×M + 5×S + 8×XS + 2×DROP ≈ 5–7 дней
- VendCashBot: ~3×M + 8×S + 5×XS + 2×DROP ≈ 8–12 дней

**Итого по миграции: ~40–55 рабочих дней (8–11 недель solo).** Без CI/тестов/деплоя.

---

## 11. Что нужно от пользователя ДО Phase 2

- [ ] **Утвердить эту матрицу** (или попросить изменить отдельные строки)
- [ ] Подтвердить, что VendCashBot prod-token можно ротировать (downtime бота на 1 минуту)
- [ ] Подтвердить, что vendhub.uz домен может быть offline на ~30 минут во время cutover
- [ ] Дать prod credentials Supabase (для pg_dump) или подтвердить что данные мигрировать через CSV/JSON export
- [ ] Подтвердить scope: всё ли делать или ограничиться MUST-HAVE (например, Phase 2.2 + 3.1 + 4 = working cash bot + сайт + унификация ботов как MVP, остальное отложить)
