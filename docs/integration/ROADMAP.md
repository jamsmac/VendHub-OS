# VendHub-OS Integration Roadmap

> **Дата:** 2026-04-28. **Статус:** Audit-driven, executing Sprint 1.
> **Источники:** `OVERLAP_MATRIX.md`, `DECISION_MATRIX.md`, `audit/01..04.md`.
> **Принцип:** «evidence before assertions» — каждый gap верифицирован чтением исходного кода до начала работы.

---

## 0. Поправки к аудиту (2026-04-28)

После детального чтения кода обнаружено, что часть «critical gaps» из аудит-отчётов **ложные**. Это исправлено ниже.

### Audit 02 (maintenance) — ложные срабатывания

| Audit claim                                       | Реальность                                                                                                                                                                                                                                                            | Ссылка на код                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| ❌ «`autoCreateRequest` флаг игнорируется в cron» | ✅ **Уже работает.** `maintenance.service.ts:838-893` корректно ищет `dueSchedules` с `autoCreateRequest: true` и создаёт `MaintenanceRequest` через `this.create(...)`. Обновляет `lastExecutedDate`, `nextDueDate`, `timesExecuted`. Файл правлен 21.04 (Sprint F). | `apps/api/src/modules/maintenance/maintenance.service.ts:838` |
| ❌ «нет авто-генерации дневных задач»             | ✅ **Уже есть.** `@Cron(CronExpression.EVERY_HOUR)` запускает поиск каждый час                                                                                                                                                                                        | там же                                                        |

**Реальные gap'ы maintenance** (после поправки):

1. ❌ Нет quick `mark-completed` endpoint — сотрудник вынужден проходить полный workflow `DRAFT→SUBMITTED→APPROVED→SCHEDULED→IN_PROGRESS→COMPLETED→VERIFIED`
2. ❌ Нет Telegram-бота для мойщиков (главный gap по запросу пользователя)
3. ❌ Нет SLA breach уведомлений (cron только пишет в лог + emit event, но `eventEmitter.emit("maintenance.sla_breached")` listeners не подписаны)
4. ❌ `MaintenanceSchedule` не имеет `componentId` — мойка привязана к машине, а не к конкретному компоненту (гриндер #5 vs кофеварка #3)

### Audit 01 (loyalty) — gap'ы верифицированы

Все 7 gap'ов остаются актуальными:

1. No points grant on order completion
2. No quest auto-complete on transaction
3. No achievement unlock triggers
4. No referral points on signup
5. No spend UI at checkout (apps/client)
6. No tier-up animations
7. No expiry notifications

### Audit 03 (sales+refill) — verified

- ❌ **Нет Recipe модели** для кофе-машин — критично
- ⚠️ Generic API endpoint только VHM24-specific
- ⚠️ Per-bunker себестоимость не считается

### Audit 04 (apps/web) — verified

5 пробелов:

1. ❌ Slot Layout Editor (`/dashboard/machines/[id]/slots/layout`)
2. ❌ Cost Calculation страница
3. ⚠️ Alert Rules CRUD (только список)
4. ❌ Supplier Management
5. ⚠️ Container Refill History

---

## 1. Приоритеты пользователя (явно сформулированные 2026-04-28)

В порядке озвученности:

1. **Бонусная система для клиентов** в веб-приложении (apps/client / Telegram Mini App) — №1
2. **Управление всем через админку** — расширить `apps/web`
3. **Учёт автоматов / ОС / инвентаря / ингредиентов / товаров / "вспомогательных материалов"** — `equipment` уже есть
4. **API endpoints для машин** (загрузка продаж) — `sales-import` уже есть, нужен generic endpoint
5. **Расчёт расходов / себестоимости / движения бункеров** — нужна Recipe модель
6. **Графики моек кофеварок / гриндеров / бункеров / миксеров** — `maintenance + equipment` готов на 70%, нет Telegram-бота для сотрудников
7. **Автоматические сообщения о пополнении** — `predictive-refill` готов, нужно дозамкнуть с `web-push` для бункеров

«Лендинг сайт работает» → Phase 3.1 (миграция Vendhub.uz → apps/site) **отложена**, twой landing уже в проде.

---

## 2. Sprint Plan (приоритезированный по импакту × низкому риску)

### Sprint 1 — Loyalty for Clients (1.5 недели, ~50 часов)

**Цель:** клиент в Telegram Mini App видит свои бонусы и тратит их на checkout. Это №1 приоритет.

| #   | Task                                                                                                                                                                                                                                                                                    | Effort | Owner    |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| 1.1 | **Wire points grant on order completion** — listener `OnEvent("order.completed")` в loyalty service вызывает `LoyaltyService.grantPointsForOrder({ userId, orderId, amount })`. Использовать существующий `transaction.created` event если order не emitит свой. TDD: spec на listener. | S (4h) | Backend  |
| 1.2 | **Wire achievement unlock triggers** — listener `OnEvent("transaction.created")` проверяет achievement criteria (количество заказов, сумма за период) и unlock'ает.                                                                                                                     | S (4h) | Backend  |
| 1.3 | **Wire quest auto-complete** — listener в quests service.                                                                                                                                                                                                                               | S (3h) | Backend  |
| 1.4 | **Wire referral points on signup** — listener `OnEvent("user.created")` если есть referral code.                                                                                                                                                                                        | S (2h) | Backend  |
| 1.5 | **Apps/client checkout: Spend UI** — на странице checkout добавить блок «Использовать бонусы» (slider или input) + расчёт final price. Hook `useLoyaltyBalance()`.                                                                                                                      | M (8h) | Frontend |
| 1.6 | **Apps/client: страница «Мои бонусы»** — баланс, история, available achievements/quests. Использует существующие endpoints loyalty.                                                                                                                                                     | M (8h) | Frontend |
| 1.7 | **Tier-up + redemption notifications** — web-push при достижении нового tier и при использовании бонусов.                                                                                                                                                                               | S (4h) | Backend  |
| 1.8 | **E2E test** — Playwright тест: клиент создаёт заказ → видит начисленные points → следующий заказ тратит их.                                                                                                                                                                            | M (6h) | QA       |
| 1.9 | **Telegram Mini App polish** — `useTelegramAuth` уже работает, добавить haptic feedback, Telegram theme integration.                                                                                                                                                                    | S (4h) | Frontend |

**DoD:** клиент в проде заказывает товар → получает SMS/push «+50 бонусов» → на следующем заказе видит slider «Использовать бонусы (доступно: 50)» → списывается → история обновляется.

---

### Sprint 2 — Cleaning Schedule + Telegram Bot для мойщиков (1 неделя, ~35 часов)

**Цель:** сотрудник в Telegram-боте утром видит «помыть сегодня: кофеварка #5, гриндер #3, бункер #7» — отмечает «готово» с фото — менеджер видит в реальном времени.

| #   | Task                                                                                                                                                                                            | Effort |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2.1 | **MaintenanceSchedule.componentId** — миграция: добавить FK к `EquipmentComponent`. Schedule «мыть гриндер №5 каждые 3 дня» теперь возможен.                                                    | S (3h) |
| 2.2 | **Quick `mark-completed` endpoint** — `POST /maintenance/:id/mark-completed { photos, notes }` минующий `SUBMITTED→APPROVED→IN_PROGRESS`. Только для assigned operator или manager.             | S (3h) |
| 2.3 | **`BotCleaningTasksService`** в `apps/api/src/modules/telegram-bot/services/staff/` — daily cron в 9:00 Asia/Tashkent отправляет staff'у список сегодняшних задач из их `assignedTechnicianId`. | M (8h) |
| 2.4 | **Bot photo + done flow** — сотрудник присылает фото → bot вызывает StorageService → сохраняет в `MaintenanceRequest.photos.during/after` → вызывает `mark-completed` endpoint.                 | M (8h) |
| 2.5 | **SLA breach → manager push** — listener на `eventEmitter.emit("maintenance.sla_breached")` вызывает `web-push` менеджеру + entry в `notifications`.                                            | S (3h) |
| 2.6 | **Admin UI: график моек на неделю** — новая страница `/dashboard/maintenance/schedule-calendar` с календарём (FullCalendar или Recharts gantt) — кто, что, когда.                               | M (8h) |
| 2.7 | **E2E** — сценарий: admin создаёт schedule → cron 9:00 → operator получает в боте → отправляет фото → admin видит «выполнено».                                                                  | S (4h) |

**DoD:** в Asia/Tashkent timezone утром мойщик получает в Telegram-бот список задач, отмечает выполнение — это видно в admin UI.

---

### Sprint 3 — Recipe модель + Coffee Machines + Bunker tracking (2 недели, ~60 часов)

**Цель:** для кофе-машины 1 продажа Cappuccino = списание 18g кофе + 150ml молока + 100ml воды из соответствующих бункеров. Уведомления когда бункер скоро пустой.

| #   | Task                                                                                                                                                                                     | Effort                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 3.1 | **`Recipe` entity** + миграция: `recipes` (productId FK) + `recipe_ingredients` (recipeId, productId/containerType, amount, unit).                                                       | M (8h)                                                                                                     |
| 3.2 | **Recipe consumption listener** — `OnEvent("transaction.created")` если product.hasRecipe → списать ingredients из `Container.currentQuantity` (по containerType slot mapping в машине). | M (10h)                                                                                                    |
| 3.3 | **Generic Sales API** — `POST /api/v1/sales-api/webhook/{machineId}` принимает `[{productId                                                                                              | productName, quantity, unitPrice, soldAt}]`. Вызывает sales-import workflow inline. Auth: machine API key. | M (8h) |
| 3.4 | **Bunker-level alerts** — extension `predictive-refill`: если `Container.fillPercentage < minLevel` → trigger AlertRule `BUNKER_LOW`. Web-push к `accountant`/`warehouse` ролям.         | S (4h)                                                                                                     |
| 3.5 | **Admin UI: Recipe editor** — `/dashboard/products/[id]/recipe` — добавить ингредиенты.                                                                                                  | M (10h)                                                                                                    |
| 3.6 | **Admin UI: Cost calculation page** — `/dashboard/products/[id]/cost` — показывает себестоимость per-product (сумма ingredients × purchasePrice).                                        | S (4h)                                                                                                     |
| 3.7 | **Container refill audit page** — `/dashboard/containers/[id]/history` — все refill события с операторами.                                                                               | S (4h)                                                                                                     |
| 3.8 | **E2E** — продажа Cappuccino → бункер кофе уменьшен на 18g → когда `< minLevel` → менеджер получает push «бункер кофе #3 в M-005 пора пополнить».                                        | M (8h)                                                                                                     |

**DoD:** установлен полный sales→cost→refill loop для кофе-машин.

---

### Sprint 4 — Admin UI gaps (1 неделя, ~30 часов)

| #   | Task                                                                                                                        | Effort                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 4.1 | **Slot Layout Editor** — visual grid editor `/dashboard/machines/[id]/slots/layout` (drag-drop из каталога).                | L (12h)                                                                               |
| 4.2 | **Alert Rules CRUD** — `/dashboard/alerts/rules` (список → create/edit с триггер-условиями + cooldown + recipients).        | M (8h)                                                                                |
| 4.3 | **Supplier Management** — `/dashboard/suppliers` (отдельный модуль, не в `references`). Контракты + цены + история закупок. | M (8h)                                                                                |
| 4.4 | **CMS site editor расширение** — управление контентом vendhub.uz через site-cms (hero, partners, FAQ, promotions).          | S (4h) — большая часть уже в `apps/site` после Site Supabase→API migration 2026-04-04 |

---

### Sprint 5 — VendCashBot integration (1 спринт, ~40 часов)

После Sprint 1-4 фундамент готов. Теперь подтягиваем спутник VendCashBot из `_integration-source/`.

| #   | Task                                                                                                                                                   | Effort  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 5.1 | **Schema diffs**: `Collection` + `latitude/longitude/distanceFromMachine/photoUrl/source`, новая `CollectionHistory` audit table.                      | S (4h)  |
| 5.2 | **`bot-cash-ops.service.ts`** в `staff/` (5 команд из VendCashBot, переписать grammY → Telegraf).                                                      | M (12h) |
| 5.3 | **GPS validation service** — distance from machine.                                                                                                    | S (3h)  |
| 5.4 | **Photo evidence через Telegram CDN → StorageService**.                                                                                                | S (4h)  |
| 5.5 | **Excel export** через `exceljs` (НЕ `xlsx` — CVE).                                                                                                    | S (4h)  |
| 5.6 | **Migration консолидация** — 18 миграций VendCashBot → 1-2 в `apps/api/src/database/migrations/`.                                                      | S (6h)  |
| 5.7 | **E2E** — оператор в боте: `/collect` → выбор машины → ввод суммы + GPS + фото → manager в боте: `/pending` → подтверждение → admin в UI видит запись. | M (7h)  |

---

### Sprint 6 — Snack-Drinks unique features (опционально, 2 недели)

Только если у пользователя есть production-данные в Snack-Drinks которые нельзя потерять. Иначе **DROP** — функциональность в OS уже есть/перекрывается.

| #   | Task                                                                                                      | Effort |
| --- | --------------------------------------------------------------------------------------------------------- | ------ |
| 6.1 | HICON CSV import UI в `apps/web` (sales-import уже работает на бэке, нужен upload UI).                    | S      |
| 6.2 | Margin/PnL/Finance dashboard pages.                                                                       | M      |
| 6.3 | Web-push enhancements (если в OS web-push не покрывает все use-cases Snack-Drinks).                       | S      |
| 6.4 | Production data migration (22 продукта/16 машин из Vendhub.uz, ~21 таблица из Snack-Drinks → SQL script). | M      |

---

### Sprint 7 — E2E Verification + Deprecation (1 неделя)

| #   | Task                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 | Полный E2E flow: admin создаёт продукт → site показывает → клиент покупает → loyalty начисляет → бункер списывается → predictive-refill алертит → operator везёт → cash-bot фиксирует инкассацию. |
| 7.2 | Deprecation 3 satellite repo — README с архивной нотой, последний tag, ссылка на VendHub-OS.                                                                                                      |
| 7.3 | Update memory, CLAUDE.md, OVERLAP/DECISION matrices с фактическим состоянием.                                                                                                                     |

---

## 3. Total estimate

| Sprint                 | Effort | Cumulative |
| ---------------------- | ------ | ---------- |
| 1. Loyalty for Clients | ~50h   | 50h        |
| 2. Cleaning + Telegram | ~35h   | 85h        |
| 3. Recipe + Coffee     | ~60h   | 145h       |
| 4. Admin UI gaps       | ~30h   | 175h       |
| 5. VendCashBot         | ~40h   | 215h       |
| 6. Snack-Drinks (опц.) | ~50h   | 265h       |
| 7. E2E + Deprecation   | ~25h   | 290h       |

**Solo пользователь, 25–30 часов в неделю:** ~10–12 недель до Sprint 5 включительно. Sprint 6 опциональный.

---

## 4. Decision points (требуют твоего «да/нет»)

| #   | Вопрос                                                          | По умолчанию                                                |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| 4.1 | Идём по текущему порядку Sprint 1→7?                            | Да, начинаю Sprint 1                                        |
| 4.2 | Snack-Drinks Sprint 6 — включить или DROP?                      | DROP (vendhub.uz landing уже работает, остальное в OS есть) |
| 4.3 | VendCashBot prod token — ротировать сразу или после Sprint 5?   | После Sprint 5 (отдельная процедура)                        |
| 4.4 | Расширять scope каждого sprint'а или замораживать после старта? | Замораживать (новые требования → следующий sprint)          |

---

## 5. Текущий статус (live-обновляется)

### Завершено

- [x] Phase 0 — Discovery (4 файла в `discovery/`)
- [x] Phase 1 — OVERLAP_MATRIX + DECISION_MATRIX
- [x] Phase 1.5 — Audit existing OS modules (4 файла в `audit/`)
- [x] Phase 1.6 — Roadmap correction
- [x] **Sprint 1 — Loyalty for clients** (закрыт 2026-04-28; 9 коммитов)
  - [x] 1.1 Wire points grant on order.completed (`2b3c0ef`)
  - [x] 1.2 Wire achievement unlock (`358138a`)
  - [x] 1.3 Wire quest auto-complete — already in place (`quest-progress.service.ts:277`)
  - [x] 1.4 Wire referral on first order — already in place (`referrals.service.ts:213`)
  - [x] 1.5 apps/client checkout Spend UI (`cca3112`)
  - [x] 1.6 apps/client LoyaltyPage redeem wire (`dc62d59`)
  - [x] 1.7 Tier-up web-push (`1f3a43f`)
  - [x] 1.8 ⏸ E2E Playwright — DEFERRED (отдельная задача с DB seed)
  - [x] 1.9 TMA haptic feedback (`f94bf59`)
  - [x] BUG: `pointsUsed` не списывался — fixed (`0d155d3`)
  - [x] BUG: `order.completed` payload mismatch (`amount` alias) — fixed (`66e7fc6`)
- [x] **Sprint 2 — частично** (3/7 закрыто)
  - [x] 2.1 MaintenanceSchedule.componentId migration (`cb02ee2`)
  - [x] 2.2 Quick mark-completed endpoint (`347b8d4`)
  - [x] 2.5 SLA breach web-push к manager + assigned tech (`a2052f2`)

### В работе

- [ ] **Sprint 2.3 — `BotCleaningTasksService`** ← СЛЕДУЮЩАЯ. Daily cron 9:00 Asia/Tashkent шлёт staff'у их сегодняшние задачи в Telegram (~8h).
- [ ] **Sprint 2.4 — Bot photo + done flow.** Фото из бота → StorageService → MaintenanceRequest.photos → mark-completed (~8h). Связан с 2.3.
- [ ] **Sprint 2.6 — Admin UI calendar** `/dashboard/maintenance/schedule-calendar` — кто что когда моет (~8h).
- [ ] **Sprint 2.7 — E2E** cleaning flow.

### Дальше

- [ ] Sprint 3 — Recipe модель + кофе-машины (~60h)
- [ ] Sprint 4 — Admin UI gaps: slot layout editor, alert rules CRUD, supplier management, cost calc (~30h)
- [ ] Sprint 5 — VendCashBot integration (~40h)
- [ ] Sprint 6 — Snack-Drinks (опц., DROP по умолчанию)
- [ ] Sprint 7 — E2E + deprecation
- [ ] Sprint 5 — VendCashBot
- [ ] Sprint 6 — Snack-Drinks (если нужен)
- [ ] Sprint 7 — E2E + Deprecation
