# Audit: sales-import + predictive-refill + containers

> **Дата:** 2026-04-27. **Источник:** Explore-agent.

---

## 1. sales-import модуль

**Файл:** `apps/api/src/modules/sales-import/`

**HICON CSV:** ✅ полная поддержка. `HiconParserService` парсит 9 колонок: ProductID, CommodityCode, ProductName, PayByCash/unitPrice, Quantity, **TotalAmount**, скипает «总其他» и footer «итого». UTF-8 BOM поддержан (`replace(/^﻿/, "")`).

**API Endpoints:**

1. `POST /sales-import/upload` — загрузка CSV (DTO: `fileName`, `fileContent`, опц. `format`). Возвращает `sessionId`, format, headers, sample rows.
2. `POST /sales-import/confirm-mapping` — fuzzy-match продуктов. Принимает `sessionId`, `machineId`, `reportDay`, маппинг колонок. Возвращает `matchedMap` (productId, score).
3. `POST /sales-import/execute` — финальный import. Применяет productMap, создаёт `SalesImport` запись, вызывает `StockMovementsService.recordMovement()`.
4. `GET /sales-import/history`, `GET /sales-import/stats`, `GET /:id`, `DELETE /:id` (soft).

**Dedup (3-level):**

- L1 — row hash SHA-256 (`hashRow()`) — точные дубли строк
- L2 — txn hash SHA-256 (`hashTxn()`) — дубли транзакций при re-export файла
- L3 — HICON delta — `SalesAggregated` хранит last cumulative qty, импортируется только delta

**Stock Movements:**

- ✅ `SalesImportIngestService.execute()` → `stockMovementsService.recordMovement()` создаёт `MovementType.SALE_OUT`
- `InventoryBalance` обновляется через DB trigger на INSERT `stock_movements`

**Recipe (кофе-машины):** ❌ **НЕТ.** Парсит только simple SKU (`productName`, `quantity`, `totalAmount`). Cappuccino = «1 продажа», не «18g кофе + 150ml молока».

---

## 2. predictive-refill модуль

**Файл:** `apps/api/src/modules/predictive-refill/`

**Алгоритм:** EWMA (α=0.2), окно 14 дней.

- `ConsumptionRateService.updateRate()` — обновляет `consumption_rates` после каждой продажи
- `ForecastService.forecastMachine()` — JOIN `MachineSlot` с `Product` для price fallback. Returns `SlotForecast[]` с sellingPrice/costPrice resolved через slot override → product base.
- `RecommendationService.generateForOrganization()` — итерирует машины, upsert'ит `RefillRecommendation`. Margin-based priority:
  ```
  margin = sellingPrice - costPrice
  dailyProfit = margin × dailyRate
  urgency = min(10, 1/daysOfSupply)
  priorityScore = urgency × log10(1 + max(0, dailyProfit))
  ```

**Entities:**

- `ConsumptionRate` — unique (org, machine, product, period)
- `RefillRecommendation` — `recommended_action` enum: `REFILL_NOW`/`REFILL_SOON`/`NORMAL`

**Endpoints + Cron:**

- `GET /predictive-refill` — list + filter + pagination
- `POST /predictive-refill/trigger-refresh` — enqueue `recalc-all` на BullMQ `predictive-refill` queue
- `@Cron("0 2 * * *", { timeZone: "Asia/Tashkent" })` — ночной (PredictiveRefillCronService)

**Notifications:**

- ✅ `RecommendationService.fireStockoutAlerts()` → `AlertsService.triggerAlert()`
- Pre-seeded `PREDICTED_STOCKOUT` AlertRule per org
- AlertRule cooldown 1440 min — anti-duplicate
- ⚠️ Связь с web-push не явная — нужно проверить, подписан ли WebPushService на alert events

**Recipe-aware refill:** ❌ нет — для simple SKU работает, для бункеров с recipe (кофе) нет логики.

---

## 3. containers модуль (бункеры)

**Файл:** `apps/api/src/modules/containers/`

**Моделирует:** hoppers/bunkers внутри machine. `slotNumber` (unique per machine), `nomenclatureId` (FK Product, optional), `capacity`, `currentQuantity`, `unit` (g/ml/pcs), `minLevel`.

**Поля состояния:**

- ✅ `currentQuantity`, `capacity`
- ✅ `fillPercentage` (computed property)
- ✅ `isLow` (currentQuantity ≤ minLevel)
- ✅ `deficit` (capacity - currentQuantity)
- ✅ `lastRefillDate`, `status` (ACTIVE/EMPTY/MAINTENANCE), `currentBatchId` (batch traceability)

**Связи:**

- `ManyToOne Machine` (CASCADE)
- `ManyToOne Product` (nomenclatureId, SET NULL)
- `ManyToOne IngredientBatch` (currentBatchId)

**Gap:** `Container.nomenclatureId → Product`, но Product не знает о рецепте. Нет `Recipe`/`ProductIngredient` таблицы.

---

## 4. machines + vhm24-integration

**Endpoint для внешних систем:**

- ✅ `POST /integration/vhm24/webhook` (с проверкой organizationId) — основной приём данных продаж
- ❌ Это VHM24-specific. Нет generic `POST /api/v1/sales` для произвольных автоматов.

**Что отправляет машина:** VHM24 webhook → `WebhookPayload` (terminal_id, sale_date, items[]) → `Vhm24IntegrationService.handleWebhook()` → machine sync, task linking, trip reconciliation.

**Web API машин:** Полностью покрыты (`POST /machines`, `PATCH /machines/:id`, `GET /machines/:id/state`). Состояние: location, status, contentModel (SLOTS/CONTAINERS/MIXED), lastSync.

---

## 5. Coverage matrix

| Требование                         | Модуль                           | Статус | Gap                                    |
| ---------------------------------- | -------------------------------- | ------ | -------------------------------------- |
| Загрузка продаж через API          | sales-import + vhm24-integration | ✅     | Только VHM24, нужен generic endpoint   |
| Расчёт расхода ингредиентов (кофе) | —                                | ❌     | Нет Recipe/Ingredient модели           |
| Автоапдейт остатков после продажи  | stock-movements                  | ✅     | Работает для simple SKU, не для recipe |
| Расчёт себестоимости               | predictive-refill                | ⚠️     | margin есть, per-bunker cost нет       |
| Уведомление о пополнении бункеров  | alerts + web-push                | ✅     | Связь не явная, проверить wire         |
| Уведомление о пополнении продукции | alerts + web-push                | ✅     | —                                      |
| Графики/отчёты по продажам         | (dashboard)                      | ⚠️     | Отдельный аудит нужен                  |

---

## Top 5 actions to enable end-to-end sales flow

1. **Recipe Model** — `Recipe`(productId) + `RecipeIngredient`(recipeId, ingredientProductId/containerType, amount, unit). Миграция + seed. **HIGH.**
2. **Generic Sales API** — `POST /api/v1/sales-api/webhook/{machineId}` принимает `[{productId|productName, quantity, unitPrice, soldAt}]`. Inline sales-import workflow. **HIGH.**
3. **Recipe Consumption Service** — `@OnEvent("transaction.created")` → если product.hasRecipe → списать ingredients из Container.currentQuantity. **MEDIUM.**
4. **Bunker-level Alerts** — extension predictive-refill: AlertRule per bunker (не per product). Trigger `BUNKER_LOW` когда `fillPercentage < minLevel%`. Notification: «пополнить бункер кофе #3 в M-001». **MEDIUM.**
5. **Cost Tracking Dashboard** — Таблица: machine × date × revenue × ingredient_cost (sum recipe) × gross_margin. Графики по дням/неделям. **LOW.**

Подробный план — Sprint 3 в `ROADMAP.md`.
