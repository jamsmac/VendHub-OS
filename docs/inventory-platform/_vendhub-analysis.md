# VendHub OS Analysis for OLMA Integration — 2026-04-21

**Phase 1 deliverable.** Read-only analysis of current VendHub OS state. No solutions proposed.

---

## A. Доменные сущности

### A1. Location

Location entity at `apps/api/src/modules/locations/entities/location.entity.ts:1-287`. Has `code` field (lines 46-47) — **no `slug` field**. `isActive` boolean (line 196) — **no `publicEnabled` flag**. `timezone` present (line 122, default `"Asia/Tashkent"`). Flat structure — **no parent/child hierarchy**. Machine linking via `machine.locationId` FK (machines.entity.ts:131), one-to-many implicit; `machineCount` denormalized (line 158). 7 indexes on org/status/type/coordinates.

### A2. Machine

`apps/api/src/modules/machines/entities/machine.entity.ts:59-364`. Fields: type (MachineType enum, line 89), contentModel (ContentModel enum, line 97; defaults to SLOTS), locationId FK (line 131). OneToMany relation to MachineSlot (line 314). Has purchasePrice/depreciationMethod (lines 207-223) but no layout versioning entity.

### A3. MachineSlot

Same file, lines 370-427. Fields: `slotNumber` (string, "A1"/"B2" format, line 381), `productId` (nullable, line 384), `currentQuantity` (int, line 390), `capacity` (int, line 387), `price` (decimal, slot-level selling override, line 393), `costPrice` (decimal, slot-level cost override, line 396), `minQuantity` (refill trigger, line 402), `totalSold` (cumulative, line 408). **No versioning — qty is snapshot only**.

### A4. Product

`apps/api/src/modules/products/entities/product.entity.ts:37-200`. Fields: `sku` (unique, line 50), `name` (line 53), `barcode` (nullable, line 90), `purchasePrice` (line 97), `sellingPrice` (line 100), category as enum (line 70, **not separate entity**), `defaultSupplierId` (line 140), `vatRate` (line 113), `ikpuCode`/`mxikCode` (Uzbek tax codes, lines 107-110). Separate `ProductPriceHistory` entity (lines 525-553).

### A5. Supplier

`apps/api/src/modules/products/entities/product.entity.ts:559-620`. Fields: `code` (unique, line 568), `name` (line 571), `contactPerson`/`phone`/`email`/`address` (lines 574-583), `taxId` (INN, line 586), `bankAccount` (line 589), `telegramId`/`telegramUsername` (lines 592-596). Org-scoped via `organizationId` (line 565).

### A6. Users & RBAC

7 RBAC roles per `packages/shared/src/types/user.types.ts:6-14`: OWNER, ADMIN, MANAGER, OPERATOR, WAREHOUSE, ACCOUNTANT, VIEWER. **OWNER is system-wide**, others org-scoped via user.organizationId. **MachineAccess module** (`apps/api/src/modules/machine-access/entities/machine-access.entity.ts:23-124`) provides per-machine access grants independent of org role.

---

## B. Stock Operations

### B1. Event log / Immutable append-only

**MISSING formal event-sourcing log.** Pattern used: event emitters + listeners for side effects. `TransactionCreateService` emits `transaction.created` (transaction-create.service.ts:122). `QuantitySyncService` listens and decrements `MachineSlot.currentQuantity`. **No dedicated `stock_movements` / `inventory_movements` immutable table.** `BatchMovement` exists but tracks ingredient batches only, not final product stock deltas.

### B2. MachineSlot.currentQuantity mutation sites

Two mutation sites found:

1. **Decrement on sale** — `apps/api/src/modules/predictive-refill/services/quantity-sync.service.ts:37-51`. Raw SQL `GREATEST(current_quantity - N, 0)`, listens to `transaction.created` event.
2. **Reset on refill** — same file lines 59-73. Sets `currentQuantity = capacity` after refill recommendation is marked as acted upon.

Pattern: **mutational, not event-sourced**. Qty snapshots only.

### B3. Historical reconstruction

**MISSING.** Only current snapshot via `MachineSlot.currentQuantity`. No way to query "qty on 2026-04-10 at 14:00". Would require transaction replay or historical balances table (does not exist). Audit logs track entity field changes but not derived inventory values.

### B4. BatchMovement module

`apps/api/src/modules/batch-movements/entities/batch-movement.entity.ts:14-63`. Tracks ingredient batch movements (mix, consume, waste, transfer) for recipes/formulation. **Not used for vending machine product inventory.** `movementType` enum (line 25), `quantity` (line 28), `mixRatio` (line 40).

### B5. QuantitySyncService implementation

Single atomic SQL UPDATE per item. Validates `organizationId` via subquery JOIN to Machine (quantity-sync.service.ts:48). **Does NOT maintain historical log** — each call overwrites `current_quantity`. No undo/rollback.

### B6. Materialized balance table

**`analytics_snapshots` table exists** (migration `1773962776323-SyncDrift.ts:1948`). Stores point-in-time aggregates per (org, machine, location, product, snapshot_date, snapshot_type). **Not a real-time ledger** — periodic batch snapshot only. Unsuitable for transactional qty reconstruction.

---

## C. Import Parsers

### C1. Parsers & formats

**sales-import module** is metadata-only (logs import runs, no built-in parsing). **payment-reports module** has the full parser:

- `PaymentReportParserService` (payment-report-parser.service.ts:42-126). Handles Excel via ExcelJS, CSV (line 73), ZIP (extracts first XLSX, line 58). Supports Payme/Click/Uzum/KASSA Fiscal/generic VendHub CSV (lines 89-106).
- Auto-format detection via `PaymentReportDetectorService` (line 80).

ZIP bomb protection: max 100 MB decompressed.

### C2. HICON-specific parser

**MISSING.** No grep matches for "HICON" or "hicon" anywhere in `apps/api/src/`.

### C3. Dedup mechanism

**MISSING 3-level dedup.** Parser computes SHA256 file hash (line 53) but no lookup to prevent re-import. Row-level dedup: not implemented. In-batch dedup: not implemented. Re-uploading same file would re-parse and create duplicates.

### C4. Delta import

**MISSING.** If updated report re-uploaded, system re-inserts all rows. No version tracking or delta calculation (lines 88-107).

### C5. Product name fuzzy matching

**MISSING.** No Levenshtein / fuzzy library imports. Parser returns `goodsName` as raw string. CSV→catalog matching appears to be manual or strict SKU equality.

### C6. ParseSession entity

**MISSING.** No wizard state tracking. Imports are: upload file → parse → save metadata synchronously, then async BullMQ job processes rows. SalesImport entity has status enum (PENDING→PROCESSING→COMPLETED/PARTIAL/FAILED) but no multi-step workflow state. Not streaming — file fully uploaded before parsing.

---

## D. API / Backend Stack

- **Framework**: NestJS 11.1 (per apps/api/package.json + CLAUDE.md)
- **ORM**: TypeORM 0.3.20 with SnakeNamingStrategy (camelCase → snake_case auto-conversion). BaseEntity provides id (UUID), createdAt, updatedAt, deletedAt, createdById, updatedById.
- **Multi-tenant**: `@CurrentOrganizationId()` decorator injected from JWT. `OrganizationGuard` hardens by injecting when none provided. Services thread `organizationId` through call stack.
- **Transactions**: TypeORM `queryBuilder` + manual `transaction()` wrapper for multi-statement ops. Pessimistic locks used in promo-code redemption.
- **API style**: REST + Swagger 11 (`@nestjs/swagger`). `@ApiTags`/`@ApiOperation`/`@ApiProperty` on every controller and DTO. Global prefix `api/v1`. Swagger UI at `/docs`.

---

## E. Auth / Supabase

### E1. Supabase scope

**Supabase is storage-only.** No Supabase Auth SDK. StorageService (storage.service.ts:159-176) wraps **AWS S3 SDK** against Supabase Storage's S3-compatible endpoint (`*.storage.supabase.co/storage/v1/s3`). Uses `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` env vars (not Supabase API keys).

### E2. Auth strategy

**Passport + JWT + TOTP** (`apps/api/src/modules/auth/strategies/`). `@nestjs/jwt`. bcrypt password hashing with cost 12 (auth.service.ts:139). 2FA via otplib. Challenge token pattern prevents 2FA IDOR (5-min expiry).

### E3. RLS policies

**MISSING.** No `ROW LEVEL SECURITY` or `CREATE POLICY` statements in any migration. **Application-level tenant filtering only** (organizationId in WHERE clauses).

### E4. Storage buckets

Single bucket: `vendhub-storage`. Org-scoped keys format: `{organizationId}/{folder}/{filename}`.

---

## F. Reconciliation / сверка

### F1. Module

**EXISTS.** `apps/api/src/modules/reconciliation/entities/reconciliation.entity.ts:60-194`. Two entities: `ReconciliationRun` + `ReconciliationMismatch`. Sources enum: HW, SALES_REPORT, FISCAL, PAYME, CLICK, UZUM. Mismatch types: ORDER_NOT_FOUND, AMOUNT_MISMATCH, TIME_MISMATCH, etc.

Additional: `HwImportedSale` entity (line 200) logs imported sales from hardware/Excel. ImportSource enum: EXCEL, CSV, API.

### F2. Shortage calculation

**Amount-based** via `discrepancyAmount` field (line 175). Also `matchScore` confidence (0-100, line 172). Tolerance-based fuzzy matching with `amountTolerance` default 0.01 (line 87). **Not qty-based.**

### F3. Workflow

Upload fiscal report → payment-reports parses → save HwImportedSale → trigger ReconciliationRun → compare stock snapshot vs fiscal → identify mismatches via tolerance-based matching.

---

## G. Public tenant / site view

### G1. Public routes

`@Public()` decorator used. Public controller at `apps/api/src/modules/site-cms/site-cms-public.controller.ts:18-83`. Routes: `GET /client/public/partners`, `/client/public/machine-types`, `/client/public/site-cms/:collection`, `POST /client/public/cooperation-requests`. Rate-limited: 30 req/min for GETs, 5 req/min for POST.

**Org scoping:** Hard-coded to `VENDHUB_PUBLIC_ORG_ID` env (default `d0000000-0000-0000-0000-000000000001`, line 28). **Public org is separate from user's org** — no per-tenant public URLs.

### G2. Site-CMS module

**JSONB document store** (SiteCmsItem entity, 14 in site-cms-item.entity.ts). 9 collections: partners, machine_types, site_content, products, promotions, loyalty_tiers, bonus_actions, loyalty_privileges, cooperation_requests (84 seeded rows per CLAUDE.md).

### G3. apps/site app

**Next.js landing/marketing site**. Uses API client for public CMS collections. Proxy auth routes issue JWT. Admin pages use admin API proxy.

**No `/site/[locationSlug]` or `/tenant/[slug]` route** for per-tenant public views.

---

## H. Price history + audit

### H1. Price history

**EXISTS** as `ProductPriceHistory` entity (product.entity.ts:525-553). Fields: productId FK, purchasePrice, sellingPrice, effectiveFrom, effectiveTo (nullable when current), changeReason, changedByUserId. Indexed for "price on date X" queries. **Not slot-level** — applies to product base price only. Slot overrides in `MachineSlot.price`/`costPrice` have **no versioning**.

### H2. Audit log

**EXISTS** as `AuditLog` entity (audit.entity.ts:334-455). 41 AuditAction values. AuditCategory: AUTHENTICATION, AUTHORIZATION, DATA_ACCESS, DATA_MODIFICATION, SYSTEM, SECURITY, COMPLIANCE, FINANCIAL, OPERATIONAL, INTEGRATION. Tracks module/controller/method/endpoint, device info, geo (IP/country/region/city/ISP).

Additional: `AuditSnapshot` (line 457) for point-in-time captures, `AuditRetentionPolicy` (line 505), `AuditAlert` (line 555).

---

## Summary table

| Area                               | Status                | File:line                        |
| ---------------------------------- | --------------------- | -------------------------------- |
| Event-sourced stock log            | **MISSING**           | —                                |
| Immutable qty ledger               | **MISSING**           | —                                |
| Historical qty reconstruction      | **MISSING**           | —                                |
| Append-only stock movements        | **MISSING**           | —                                |
| Current qty snapshot (MachineSlot) | EXISTS                | machine.entity.ts:390            |
| Quantity decrement on transaction  | EXISTS                | quantity-sync.service.ts:37-51   |
| Org-scoped multi-tenancy           | EXISTS                | location.entity.ts:209           |
| 7 RBAC roles                       | EXISTS                | user.types.ts:6-14               |
| Per-machine access grants          | EXISTS                | machine-access.entity.ts:23-124  |
| Product price history table        | EXISTS                | product.entity.ts:525-553        |
| Slot-level price versioning        | **MISSING**           | —                                |
| Audit log table                    | EXISTS                | audit.entity.ts:334-455          |
| HICON parser                       | **MISSING**           | —                                |
| File dedup (hash-based)            | **MISSING**           | —                                |
| Row-level dedup on import          | **MISSING**           | —                                |
| In-batch dedup on import           | **MISSING**           | —                                |
| Fuzzy product name matching        | **MISSING**           | —                                |
| Delta import                       | **MISSING**           | —                                |
| ParseSession wizard state          | **MISSING**           | —                                |
| Public site-cms API                | EXISTS                | site-cms-public.controller.ts:18 |
| Per-tenant public URL              | **MISSING**           | —                                |
| Supabase Auth integration          | NO (JWT only)         | auth.service.ts:139              |
| Supabase Storage S3 API            | EXISTS                | storage.service.ts:159-176       |
| RLS policies (DB-level)            | **MISSING**           | —                                |
| Reconciliation module              | EXISTS                | reconciliation.entity.ts:56-128  |
| Shortage calc                      | EXISTS (amount-based) | reconciliation.entity.ts:175     |
| Analytics snapshots                | EXISTS (batch only)   | migration 1773962776323          |

---

## Key observations

1. **Stock operations are mutational, not event-sourced.** No immutable ledger. This is the single biggest architectural difference from OLMA spec.
2. **RBAC is rich and already multi-tenant.** 7 roles + per-machine access grants. OLMA roles should map onto existing ones, not replace.
3. **Auth is JWT/Passport, not Supabase Auth.** OLMA's Custom Access Token Hook and RLS-with-supabase-js patterns don't apply.
4. **Reconciliation module exists** but focuses on payment/fiscal reconciliation, not physical stock reconciliation.
5. **Price history exists** at product level only. Slot-level pricing has no history.
6. **No public per-tenant URL pattern** (`/site/[slug]`). Site-cms is single-org via env var.
7. **No HICON parser, no fuzzy matching, no 3-level dedup.** These are greenfield additions.
8. **Stack: NestJS+TypeORM+Postgres (no Drizzle, no tRPC).** OLMA spec assumes Drizzle + tRPC + Supabase-js; translations needed.
