# Фаза 2 — Матрица фичей OLMA → VendHub OS

**Date:** 2026-04-21
**Priority rule:** v1.3 > v1.2 > v1.1 > SPEC

---

## Feature Matrix

| #                                    | Фича OLMA                                                        | Статус в VendHub | Что делать                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Data model**                       |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 1                                    | `organizations` (slug, tenantPublicEnabled, settings JSONB)      | EXISTS_WORSE     | VendHub has Organization entity but no `slug`, no `tenantPublicEnabled`, no `settings` JSONB. Add 3 columns via migration. `organizations.service.ts`                                                                                                                                                                                                                                                                          |
| 2                                    | `users` (role enum: 6 roles)                                     | EXISTS_BETTER    | VendHub has 7 roles (OWNER, ADMIN, MANAGER, OPERATOR, WAREHOUSE, ACCOUNTANT, VIEWER) — richer than OLMA's 6. Keep VendHub roles. Map OLMA `auditor` → ACCOUNTANT, `tenant_viewer` → VIEWER. `packages/shared/src/types/user.types.ts:6-14`                                                                                                                                                                                     |
| 3                                    | `locations` (type enum, hierarchy, geoLat/Lng)                   | EXISTS_SAME      | VendHub Location has type, coordinates, timezone. Missing: `parentLocationId` hierarchy. OLMA has self-ref parent. **Add `parentLocationId` column for warehouse→storage→machine hierarchy.** `locations/entities/location.entity.ts`                                                                                                                                                                                          |
| 4                                    | `machines` (rows, cols, layout JSONB)                            | EXISTS_WORSE     | VendHub Machine has MachineSlot children but no grid layout (rows/cols/JSONB). MachineSlot uses `slotNumber` string ("A1"). **CONFLICT: OLMA uses grid JSONB [row][col], VendHub uses flat MachineSlot entities with slotNumber.** Both valid. **Decision: keep MachineSlot pattern (richer, already has price/cost/qty). Add `rows`/`cols` fields to Machine for UI rendering. Map slotNumber → (row,col) programmatically.** |
| 5                                    | `categories` (separate entity)                                   | EXISTS_WORSE     | VendHub uses Product.category as enum, not entity. OLMA has categories table with icon/color/defaultMarkup. **Add Category entity.** Better than enum for multi-tenant customization. `products/entities/product.entity.ts:70`                                                                                                                                                                                                 |
| 6                                    | `products` (expectedSalesPerDay, slotCapacity, group enum, tags) | EXISTS_SAME      | VendHub Product has sku, barcode, purchasePrice, sellingPrice. Missing: `expectedSalesPerDay`, `slotCapacity` (default in OLMA), `tags`. **Add 3 optional columns.**                                                                                                                                                                                                                                                           |
| 7                                    | `suppliers`                                                      | EXISTS_SAME      | VendHub Supplier has same fields (code, name, phone, email, address, taxId, bankAccount, telegram). Missing: `defaultPayment` enum, `legalName`. **Add 2 columns.**                                                                                                                                                                                                                                                            |
| **Purchases**                        |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 8                                    | `purchases` (header) + `purchaseItems` (lines)                   | MISSING          | VendHub has no purchase order module. OLMA has full lifecycle: DRAFT→RECEIVED→CANCELLED, auto-creates PURCHASE_IN movements on submit, updates priceHistory if cost changed. **Implement from scratch.**                                                                                                                                                                                                                       |
| **Stock movements (CRITICAL)**       |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 9                                    | `stockMovements` (event-sourced, immutable, 9 types)             | MISSING          | VendHub has NO immutable stock log. Only `QuantitySyncService` doing direct SQL UPDATE on `MachineSlot.currentQuantity`. **This is the biggest gap.** Create `stock_movements` table with 9 movement types. All existing qty mutations must go through this table.                                                                                                                                                             |
| 10                                   | `inventoryBalances` (materialized)                               | MISSING          | VendHub has only `MachineSlot.currentQuantity` snapshot. OLMA has `inventory_balances` rebuilt by trigger on `stock_movements`. **Add materialized balance table + Postgres trigger function.**                                                                                                                                                                                                                                |
| **Price tracking**                   |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 11                                   | `priceHistory` (COST + SELLING types, reason, supplier snapshot) | EXISTS_WORSE     | VendHub has `ProductPriceHistory` (product.entity.ts:525-553) with purchasePrice, sellingPrice, effectiveFrom/To. OLMA adds: `priceType` enum (COST/SELLING), `reason`, `supplierNameSnapshot`, `purchaseId` FK. **Extend existing entity with 3-4 new columns.**                                                                                                                                                              |
| **Sales import (CRITICAL)**          |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 12                                   | `salesImports` (import run metadata)                             | EXISTS_WORSE     | VendHub has `SalesImport` entity (metadata only, PENDING→PROCESSING→COMPLETED). Missing: `format` enum, `reportDate`, row counts (imported/skipped/unmapped/deltaAdjusted), `unmappedNames`, `deltaLog`. **Extend entity with ~10 new columns.**                                                                                                                                                                               |
| 13                                   | `salesTxnHashes` (dedup index)                                   | MISSING          | No hash-based dedup in VendHub. **Create new table.**                                                                                                                                                                                                                                                                                                                                                                          |
| 14                                   | `salesAggregated` (daily snapshot for delta)                     | MISSING          | No daily aggregation in VendHub. **Create new table with composite PK (org, reportDay, machine, product).**                                                                                                                                                                                                                                                                                                                    |
| 15                                   | HICON CSV parser                                                 | MISSING          | VendHub's `PaymentReportParserService` handles Payme/Click/Uzum but NOT HICON. **Create `HiconParserService`.**                                                                                                                                                                                                                                                                                                                |
| 16                                   | 3-level dedup (row hash + txnId + delta)                         | MISSING          | No dedup in VendHub at any level. **Implement all 3 levels per SPEC §9.3 + v1.2 Patch 15 (batched) + v1.3 Patch 20 (in-batch).**                                                                                                                                                                                                                                                                                               |
| 17                                   | Delta import (same-day re-upload)                                | MISSING          | VendHub re-imports blindly. **Implement HICON delta per SPEC §9.2.**                                                                                                                                                                                                                                                                                                                                                           |
| 18                                   | Fuzzy matcher (Jaccard + KNOWN_BRANDS)                           | MISSING          | No fuzzy matching. **Implement `matchProducts()` with 46-brand registry.**                                                                                                                                                                                                                                                                                                                                                     |
| 19                                   | ParseSession (wizard state in Storage)                           | MISSING          | No multi-step wizard. VendHub imports synchronously. **Implement Storage-backed sessions per v1.2 Patch 12.**                                                                                                                                                                                                                                                                                                                  |
| **Reconciliation**                   |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 20                                   | `reconciliations` + `reconciliationItems`                        | EXISTS_WORSE     | VendHub has `ReconciliationRun` + `ReconciliationMismatch` — designed for payment reconciliation (amount-based, tolerance matching). OLMA's reconciliation is physical stock count (qty-based, links to stock_movements for adjustments, calculates nedostacha in UZS at cost). **Different purpose.** Create OLMA-style inventory reconciliation as separate endpoint set. Keep existing payment recon as-is.                 |
| **Slot layout**                      |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 21                                   | `slotHistory` (layout change log)                                | MISSING          | VendHub MachineSlot has no change history. **Create `slot_history` table.**                                                                                                                                                                                                                                                                                                                                                    |
| 22                                   | Machine grid layout (rows×cols JSONB)                            | MISSING          | VendHub uses flat MachineSlot list with slotNumber string. **Add `rows`/`cols` to Machine entity + computed getter for grid view. MachineSlot stays as source of truth; grid JSONB NOT used (avoids dual source).**                                                                                                                                                                                                            |
| **Public tenant**                    |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 23                                   | `/tenant/[slug]` public menu + stock                             | MISSING          | VendHub's public endpoints are hardcoded to single org env var. **Implement per-org public view with slug resolution.** No cost/margin shown. 404 for nonexistent slug (not 403 — enumeration defense).                                                                                                                                                                                                                        |
| **Pagination**                       |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 24                                   | Offset pagination (limit + offset)                               | EXISTS_SAME      | VendHub uses skip/take (TypeORM equivalent of offset pagination). Same approach. Per v1.3 Patch 27 — offset for MVP, cursor deferred. **No change needed.**                                                                                                                                                                                                                                                                    |
| **Soft delete**                      |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 25                                   | deletedAt on all entities                                        | EXISTS_SAME      | VendHub's BaseEntity provides deletedAt (soft delete) on every entity. **No change needed.**                                                                                                                                                                                                                                                                                                                                   |
| **Timezone**                         |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 26                                   | Asia/Tashkent hardcoded + Intl.formatToParts                     | EXISTS_SAME      | VendHub already uses `{ timeZone: "Asia/Tashkent" }` on all cron jobs. Location entity has timezone field. **No change needed for MVP.**                                                                                                                                                                                                                                                                                       |
| **Audit log**                        |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 27                                   | `auditLog` (action, entityType, before/after JSONB)              | EXISTS_BETTER    | VendHub's AuditLog is much richer: 41 actions, 10 categories, device/geo info, retention policies, snapshots, alerts. OLMA's is simpler. **Keep VendHub's.**                                                                                                                                                                                                                                                                   |
| **Machine access (resource-scoped)** |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 28                                   | `userMachineAccess` (user × machine)                             | EXISTS_SAME      | VendHub has `MachineAccess` module with per-machine grants. **No change needed.**                                                                                                                                                                                                                                                                                                                                              |
| **Offline-first queue**              |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 29                                   | IndexedDB + Service Worker sync                                  | EXISTS_SAME      | VendHub mobile has `offline-queue.ts` (AsyncStorage, FIFO, auto-retry on reconnect from Sprint F P0-4). Not IndexedDB but equivalent for React Native. **No change for web; assess need for PWA later.**                                                                                                                                                                                                                       |
| **Supplier analytics**               |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 30                                   | Supplier purchase stats (total amount, item count)               | MISSING          | VendHub Supplier has no aggregate analytics. **Add computed query in supplier service.**                                                                                                                                                                                                                                                                                                                                       |
| **Dashboard analytics**              |                                                                  |                  |                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 31                                   | Revenue per period + top products + inventory value              | EXISTS_WORSE     | VendHub has `DashboardStatsService` with general KPIs but no inventory-specific dashboard. Predictive refill has KPI cards. OLMA dashboard is focused on inventory/revenue. **Extend dashboard with inventory-specific widgets.**                                                                                                                                                                                              |

---

## CONFLICT detail: Machine grid layout (#4)

**OLMA:** `machines.layout = JSONB [row][col]` where each cell is `productId | null`. Slot data lives in the grid.

**VendHub:** `MachineSlot` entities are separate rows, each with `slotNumber` ("A1", "B2"), `productId`, `currentQuantity`, `capacity`, `price`, `costPrice`. Much richer per-slot data.

**Decision:** Keep VendHub's `MachineSlot` pattern as source of truth. Add `rows`/`cols` fields to Machine for UI grid rendering. Compute grid from MachineSlot rows (parse "A1" → row=0, col=0). **Do NOT add JSONB layout** — dual source of truth is worse than computed view.

**Trade-off:** Slightly more complex grid rendering, but no data duplication. Slot price/cost/qty stay in MachineSlot where they belong.

---

## Предлагаемый порядок интеграции

### Sprint G1: Event-sourced stock movements (фундамент)

**Items:** #9, #10

- Create `stock_movements` table (immutable, 9 types)
- Create `inventory_balances` materialized table
- Postgres trigger: on INSERT to stock_movements → update/insert inventory_balances
- Refactor `QuantitySyncService` to insert movements instead of direct UPDATE
- Migration: backfill initial balances from current `MachineSlot.currentQuantity`
- **Estimate:** 3-4 days

### Sprint G2: Purchases + price tracking

**Items:** #8, #11

- Create Purchase/PurchaseItem entities + controller + service
- Purchase lifecycle: DRAFT → RECEIVED (auto-creates PURCHASE_IN movements) → CANCELLED
- Extend ProductPriceHistory with priceType, reason, supplierSnapshot, purchaseId
- On purchase receive: if unitCost differs from product.purchasePrice → create priceHistory entry
- **Estimate:** 2-3 days

### Sprint G3: HICON import with 3-level dedup

**Items:** #12, #13, #14, #15, #16, #17, #18, #19

- Create `SalesTxnHash` entity (dedup index)
- Create `SalesAggregated` entity (daily snapshot)
- Extend `SalesImport` entity with OLMA fields
- Implement `HiconParserService` (CSV parser)
- Implement 3-level dedup (row hash + txnId + delta)
- Implement fuzzy matcher (`matchProducts()` with 46 KNOWN_BRANDS)
- Storage-backed parse sessions (3-step wizard)
- **Estimate:** 4-5 days

### Sprint G4: Inventory reconciliation

**Items:** #20, #21

- Create `InventoryReconciliation` + `InventoryReconciliationItem` entities
- Reconciliation flow: start → calculate expected from inventory_balances → operator counts → submit → auto-create ADJUSTMENT movements → calculate nedostacha
- Create `SlotHistory` entity
- **Estimate:** 2-3 days

### Sprint G5: Public tenant + minor additions

**Items:** #1, #3, #5, #6, #7, #22, #23, #30, #31

- Add slug/publicEnabled to Organization
- Add parentLocationId to Location
- Create Category entity
- Add Machine rows/cols
- Supplier defaultPayment/legalName
- Product expectedSalesPerDay/slotCapacity/tags
- `/site/[slug]` public endpoint (per-org)
- Supplier analytics query
- Inventory dashboard widgets
- **Estimate:** 2-3 days

### Not needed (keep VendHub as-is)

**Items:** #2, #24, #25, #26, #27, #28, #29

---

## Total estimated effort: ~15-18 days across 5 sprints

---

## Items NOT doing (architectural conflicts resolved)

- **Drizzle ORM** — VendHub uses TypeORM. Entire codebase (86 modules) would need rewrite. TypeORM supports everything OLMA needs. **Keep TypeORM.**
- **tRPC** — VendHub uses REST/Swagger with 7986 decorators. Replacing = full rewrite. **Keep REST.**
- **Supabase Auth** — VendHub uses JWT/Passport with bcrypt. Already battle-tested with 2FA. **Keep Passport.**
- **Supabase Realtime** — VendHub uses Socket.IO + Redis adapter (just implemented WebSocket notifications in Sprint F P1). **Keep Socket.IO.**
- **RLS policies** — VendHub uses app-level tenant filtering (organizationId in WHERE). Proven with 5 security audits (48 bugs found+fixed in March 2026, 5 more in April 2026). **Keep app-level filtering.** RLS is defense-in-depth only if supabase-js clients used directly (VendHub doesn't).
- **JSONB layout** on Machine — resolved in CONFLICT #4 above.

---

**Готов ли ты аппрувнуть матрицу + порядок интеграции?** Или хочешь изменить приоритеты / порядок / scope?
