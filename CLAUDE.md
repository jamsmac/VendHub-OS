# VendHub OS

Unified vending machine management platform for Uzbekistan. Turborepo monorepo migrating business logic from VHM24-repo (56 NestJS modules) into production-ready architecture.

## Tech Stack (VERIFIED -- DO NOT DEVIATE)

| Layer       | Technology                             | Version    |
| ----------- | -------------------------------------- | ---------- |
| Backend     | NestJS                                 | 11.1       |
| ORM         | TypeORM                                | 0.3.20     |
| Database    | PostgreSQL                             | 16         |
| Cache/Queue | Redis 7 + BullMQ 5 + ioredis           |            |
| Validation  | class-validator + class-transformer    | 0.14       |
| API Docs    | @nestjs/swagger                        | 11         |
| Auth        | Passport + JWT + TOTP (otplib)         |            |
| Real-time   | Socket.IO + Redis adapter              | 4.7        |
| Admin Panel | Next.js 16.1 + React 19                | App Router |
| Client PWA  | Vite 5.4 + React 19                    |            |
| Mobile      | React Native + Expo 52                 |            |
| Bot         | Telegraf                               | 4.16       |
| State       | Zustand 5                              |            |
| Forms       | React Hook Form 7.61 + Zod             |            |
| UI          | shadcn/ui + Radix UI + TailwindCSS 3.4 |            |
| Tables      | @tanstack/react-table 8                |            |
| Charts      | Recharts 2.15                          |            |
| Icons       | Lucide React                           |            |
| Monorepo    | Turborepo 2.5 + pnpm 9.15              |            |
| Testing     | Jest 29 + Playwright 1.48              |            |
| Infra       | Docker + Kubernetes + Terraform        |            |
| Monitoring  | Prometheus + Grafana + Loki            |            |

**CRITICAL:** NEVER use Drizzle, MySQL, tRPC, or Express standalone. Those are WRONG and come from outdated skill docs.

## Project Structure

```text
./
├── apps/
│   ├── api/              # NestJS backend (82 modules)
│   ├── web/              # Next.js admin panel
│   ├── client/           # Vite React PWA (customer-facing)
│   ├── mobile/           # React Native Expo app
│   └── site/             # Next.js landing/marketing site
├── packages/
│   └── shared/           # Shared types, utils, constants (tsup)
├── infrastructure/
│   ├── k8s/              # Kubernetes manifests
│   ├── helm/             # Helm charts
│   ├── terraform/        # IaC
│   ├── monitoring/       # Prometheus + Grafana + Loki
│   ├── nginx/            # Reverse proxy
│   ├── postgres/         # DB init scripts
│   └── redis/            # Redis config
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Mandatory Code Rules

### Rule 1: BaseEntity

Every entity MUST extend BaseEntity. No exceptions.

```typescript
import { BaseEntity } from "../../../common/entities/base.entity";

@Entity("table_name")
export class MyEntity extends BaseEntity {
  // BaseEntity provides: id (UUID), createdAt, updatedAt,
  // deletedAt, createdById, updatedById
  // DO NOT add these fields manually
}
```

### Rule 2: UUID everywhere

All primary keys are UUID (`string`), never `number`. All foreign keys are `string | null`.

```typescript
@Column({ type: 'uuid' })
organizationId: string;
```

### Rule 3: camelCase properties (SnakeNamingStrategy auto-converts to snake_case DB columns)

```typescript
@Column({ type: 'varchar', length: 100 })
machineNumber: string;  // SnakeNamingStrategy → DB column "machine_number"
```

### Rule 4: class-validator on all inputs

Every controller endpoint accepting body/query MUST use DTOs with class-validator decorators.

```typescript
export class CreateProductDto {
  @IsString() @Length(1, 255) name: string;
  @IsEnum(ProductType) type: ProductType;
  @IsOptional() @IsNumber() costPrice?: number;
}
```

### Rule 5: Swagger on all endpoints

Every controller and DTO must have @ApiTags, @ApiOperation, @ApiProperty decorators.

### Rule 6: Soft delete only

Use TypeORM `@DeleteDateColumn` via BaseEntity. Never hard-delete. Use `.softDelete()` and `.restore()`.

### Rule 7: Multi-tenant filtering

Every query returning user-facing data MUST filter by `organization_id`.

### Rule 8: No orphan modules

Every module must be registered in `app.module.ts`, have at least one test, and be exported if used by others.

### Rule 9: Storage backend is Supabase Storage via S3-compatible API

All file storage MUST go through `StorageService` (`apps/api/src/modules/storage/storage.service.ts`), which wraps the AWS SDK against Supabase Storage's S3-compatible endpoint. Do NOT introduce direct filesystem writes, alternative SDKs (`@supabase/supabase-js` for uploads), or new MinIO clients in production code paths. MinIO in `docker-compose.yml` is the **dev-only** S3-compatible mock — production traffic points at `*.storage.supabase.co/storage/v1/s3` via the `STORAGE_ENDPOINT` env var.

Config (production):

```
STORAGE_ENDPOINT=https://<project>.storage.supabase.co/storage/v1/s3
STORAGE_BUCKET=vendhub-storage
STORAGE_ACCESS_KEY_ID=<supabase-service-role-or-scoped-key>
STORAGE_SECRET_ACCESS_KEY=<…>
SUPABASE_URL=https://<project>.supabase.co  # for signed-URL generation helpers only
```

Why Supabase (not native Railway Buckets, not S3 directly): it was already wired, the 1 GB free tier is enough for MVP, and the S3 API keeps the code portable — Railway Buckets migration (roadmap Q3 2026) is a config swap, not a rewrite. Do NOT delete the Supabase adapter branch in `storage.service.ts` — it is the live code path.

## RBAC Roles (7 roles)

| Role       | Level        | Access                                |
| ---------- | ------------ | ------------------------------------- |
| owner      | System-wide  | Full access, organization management  |
| admin      | Organization | Full org access, user management      |
| manager    | Organization | Operations, reports, tasks            |
| operator   | Field        | Machines, inventory, tasks (assigned) |
| warehouse  | Organization | Inventory, warehouse, stock           |
| accountant | Organization | Finance, reports, reconciliation      |
| viewer     | Organization | Read-only access                      |

## API Modules Pattern

```
src/modules/<module-name>/
├── <module-name>.module.ts
├── <module-name>.controller.ts
├── <module-name>.service.ts
├── dto/
│   ├── create-<name>.dto.ts
│   └── update-<name>.dto.ts
├── entities/
│   └── <name>.entity.ts
└── strategies/           # (if auth-related)
```

## Key API Conventions

- API prefix: `api/v1`
- Swagger UI: `/docs`
- Auth: Bearer JWT token
- Guards: `JwtAuthGuard`, `RolesGuard`, `OrganizationGuard`, `ThrottlerGuard`
- Decorators: `@Public()`, `@Roles()`, `@Auth()`
- Interceptors: `TransformInterceptor`, `LoggingInterceptor`, `TimeoutInterceptor`
- Filters: `HttpExceptionFilter`

## Database

- PostgreSQL 16 with TypeORM
- Migrations: `src/database/migrations/`
- Run: `npm run migration:run` or `npm run db:migrate`
- Generate: `npm run migration:generate -- -n MigrationName`
- Entity paths: `src/modules/**/entities/*.entity{.ts,.js}`
- Connection pooling (default 10), SSL in production
- Never `synchronize: true` in production

## Environment Variables

Configured via `.env` (see `.env.example` for 100+ options):

- DB: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`
- Payments: Payme, Click, Uzum Bank credentials
- SMS: Eskiz, PlayMobile
- Storage: MinIO/S3
- Bot: `TELEGRAM_BOT_TOKEN`

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # All apps via Turborepo
pnpm --filter api dev       # Only API
pnpm --filter web dev       # Only admin panel
pnpm --filter client dev    # Only PWA

# Build
pnpm build                  # All apps
pnpm --filter api build     # Only API

# Testing
pnpm test                   # All tests
pnpm test:unit              # Unit tests (Jest)
pnpm test:e2e               # E2E tests (Playwright)
pnpm test:cov               # Coverage

# Database
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed data

# Code quality
pnpm lint                   # ESLint
pnpm lint:fix               # ESLint auto-fix
pnpm type-check             # TypeScript validation

# Docker
pnpm docker:up              # Start all services
pnpm docker:down            # Stop all services
pnpm docker:logs            # View logs
```

## Docker Services

| Service  | Port | Description                                     |
| -------- | ---- | ----------------------------------------------- |
| postgres | 5432 | PostgreSQL 16                                   |
| redis    | 6379 | Redis 7                                         |
| api      | 4000 | NestJS backend (includes Staff + Customer bots) |
| web      | 3000 | Next.js admin                                   |
| client   | 5173 | Vite PWA                                        |
| site     | 3100 | Next.js site                                    |
| mobile   | -    | Expo dev                                        |

## VendHub24 Integration Status

**Readiness: 100%**

### Landing Site (site app)

- Landing site (vendhub.uz) transferred from VendHub24
- 13 sections with responsive design
- i18n support: Uzbek (uz) and Russian (ru)
- SEO optimization implemented

### New Dashboard Pages (web app)

- **17 new dashboard pages added:**
  - Investor dashboard
  - Website analytics dashboard
  - Finance dashboard
  - Promotions management
  - Counterparties/Partners
  - Help & Support
  - Dashboard (extended with new sections)
  - Collections (two-stage cash collection workflow)
  - Analytics (KPI cards, top products/machines)
  - Containers (hopper/bunker management with fill levels)
  - Achievements (customer achievements management)
  - Promo Codes (promo code management with usage tracking)
  - Quests (customer quest management)
  - Referrals (referral program analytics)
  - Counterparty (counterparty/contract management)
  - Trip Analytics (driver/route performance)
  - Team (extended with new features)

### UI Component Library

- **24 new shadcn/ui components added:**
  - Accordion, Alert, Breadcrumb, Calendar
  - Checkbox, Chart, DataTable, Drawer
  - Empty state, Form, HoverCard, Pagination
  - Progress, RadioGroup, ScrollArea, Separator
  - SlideOver, Slider, Sonner (toast), Spinner
  - Toggle, ToggleGroup, Tooltip, and custom components

### React Hooks Migration

- **16 adapted React hooks** with Supabase → apiClient migration
- Ensures consistent API communication across all client apps
- Improved type safety and error handling

### Backend API Modules

- **5 new API modules created:**
  - `cash-finance`: Cash flow and financial tracking
  - `collections`: Collection and payment management
  - `trip-analytics`: Route and trip data analysis
  - `vhm24-integration`: VendHub24 legacy system bridge
  - `payout-requests`: Payout request lifecycle management

### Telegram Customer Bot Services

- **7 Telegram customer bot services added:**
  - Order management
  - Payment processing
  - Delivery tracking
  - Customer support
  - Promotional notifications
  - Loyalty program integration
  - Account management

### Location Services

- **GeocodingService** added to locations module
- Supports address geocoding and reverse geocoding
- Integration with mapping services for route optimization

### Deployment & DevOps

- **GitHub Actions CI/CD pipeline** added
- Health check paths fixed:
  - Docker Compose health checks updated
  - Kubernetes liveness/readiness probes verified
  - Helm chart health check paths corrected

### Service Merges

- **reports.service.ts**: IDOR vulnerability fix + comprehensive try/catch error handling
- **auth.service.ts**: cleanupExpiredResetTokens with proper error handling

### Package Synchronization

- Shared packages synced across all apps:
  - Common types and interfaces
  - Utility functions
  - Constants and enums

### Documentation

- **16 new documentation files added:**
  - Entity-Relationship (ER) diagram
  - Component tree structure
  - Master data specifications
  - Loyalty program specifications
  - API endpoint documentation
  - Database schema documentation
  - Integration guides
  - Deployment procedures

### Architecture Improvements (2026-03-16)

- **29 duplicate enums** consolidated to `@vendhub/shared` (single source of truth)
- **6 ambiguous enum names** disambiguated (PaymentStatus×3, RefundStatus×2, MaintenanceType×2)
- **5 shared enums** synced with API (ComplaintStatus, ComplaintCategory, NotificationType, TransactionStatus, UserStatus)
- **18 bot TypeScript errors** fixed (property mismatches, session typing)
- **Bot session** properly typed with `SessionPayload` interface
- **AnalyticsService** renamed to `DashboardStatsService` (clarity)
- **Counterparty module** completed: REST controller (11 endpoints), DTOs, tests
- **Client Dockerfile** added (Vite → nginx multi-stage)
- **Site admin stubs** documented (static data by design, full admin in apps/web)
- **DTO bug fix**: task DTO had divergent enum values from entity/DB

### Security & Quality Remediation (2026-03-22)

Comprehensive audit (2 independent reviews + 3 verification agents) with 40+ fixes:

**Security (P0):**

- **IDOR fixes**: 4 services (opening-balances, sales-import, users, rbac) — `findById()` now requires `organizationId`
- **OrganizationGuard hardened**: injects `user.organizationId` when no orgId in request
- **CSP**: `unsafe-eval` removed from production (dev-only conditional)
- **Next.js CVE**: 16.1.6 → 16.1.7
- **BaseEntity**: PaymentReportUpload/Row now extend BaseEntity + migration added
- **user.entity.ts**: `organizationId` column typed as `uuid`
- **Promo code race**: per-user limit re-checked inside pessimistic lock transaction

**Quality:**

- **React Hook Form + Zod**: products/new, CheckoutPage, ComplaintPage validated
- **CI matrix**: extended to all 6 apps (bot, site, mobile added)
- **ESLint**: `no-explicit-any` changed from `warn` to `error`
- **Coverage thresholds**: raised from 37-45% to 45-55%
- **3 test suites added**: batch-movements (13 cases), calculated-state (18 cases), custom-fields (24 cases)
- **Breadcrumbs**: dynamic dashboard breadcrumb component added

**Consolidation:**

- **Complaint enums**: ComplaintStatus/Category/Priority/Source → re-exported from `@vendhub/shared`
- **Dead code**: `packages/shared/src/menuData.ts` (838 lines) deleted
- **Dep vulnerabilities**: 20 → 6 (2 remaining are xlsx with no patch)
- **Terraform**: S3 remote state backend enabled
- **Prometheus**: non-existent web metrics scrape job disabled

**Bug fixes:**

- payment-report-detector `lowerName` typo
- payment-report-parser AdmZip import
- analytics-tab `Object.values(ReportType)` on type alias
- release.yml health check path `/health` → `/api/v1/health`
- payment-reports hardcoded port 3001 → 4000
- AGENTS.md `.Codex` → `.claude` path

### Production Readiness Remediation (2026-03-23)

Full audit (10 findings) → 3-sprint fix cycle. Key changes:

**Security (P0):**

- **payment-reports tenant isolation**: `organizationId` added to both entities + DB migration, all 16 endpoints secured with JwtAuthGuard + RolesGuard + @Roles(), all service queries filtered by org
- **payment-reports hard delete → soft delete**: `.softDelete()` + restore endpoint
- **xlsx CVE eliminated**: payment-reports migrated from vulnerable `xlsx` to `exceljs`, `xlsx` removed from package.json
- **Zip bomb protection**: AdmZip extraction capped at 100MB decompressed size
- **deploy.yml fail-fast**: migrations now fail pipeline (`set -e`, no `|| true`), health checks retry 5x then `exit 1`

**Tenant Isolation:**

- **collections**: 3 service methods + controller endpoint now pass `organizationId` (`findByOperator`, `checkDuplicate`, `countByMachine`)
- **sales-import**: internal processing chain (`startProcessing`, `updateProgress`, `complete`, `processImport`) now passes `organizationId` through call stack
- **agent-bridge**: `organizationId` column added to entity + migration, stats OR→AND bug fixed

**Architecture:**

- **Route prefix conflicts**: 4 controllers (`batch-movements`, `entity-events`, `calculated-state`, `custom-fields`) removed hardcoded `api/v1/` that doubled with global prefix
- **WebSocket hardening**: topic rooms now org-scoped (`org:{id}:topic:{name}`), generic topic fallback removed, `notifications:read` checks `organizationId`
- **calculated-state formula**: `getAvgSalesPerDay()` returns real value (was returning constant `1`), N+1 query → batch query with `IN (:...ids) GROUP BY`

**Testing:**

- **Client Vitest**: 99/99 green (fixed localStorage/spinner expectations)
- **Mobile Jest**: 13/13 green (added `setOnSessionExpired` mock)

### Machines Section Bug Fixes (2026-03-30)

4 bugs found and fixed during machines section verification. All compile clean (`tsc --noEmit` zero errors on API + Web).

**BUG #1 — `code` → `machineNumber` mapping lost (machines.controller.ts):**

- CreateMachineDto uses field `code`, but Machine entity uses `machineNumber`
- Spreading `{...dto}` silently ignored `code`, and `@BeforeInsert()` generated random `M-XXXXX`
- **Fix**: Destructure `code` from DTO, explicitly set `machineNumber: code` in controller

**BUG #2 — `contentModel` missing from CreateMachineDto:**

- Entity default is `SLOTS`, which is wrong for coffee/water machines (need `CONTAINERS`)
- **Fix**: Added optional `@IsEnum(ContentModel) contentModel` field to DTO + controller pass-through

**BUG #3 — `machine_slots` invisible in `/state` endpoint (6-file fix):**

- `CalculatedStateService` only queried containers and equipment_components, completely ignoring machine_slots
- For snack/drink machines (content_model=slots), the Contents tab showed nothing
- **Fix across 6 files**:
  - Backend: `SlotState` interface in DTO, `calculateSlotStates()` method in service, `MachineSlot` in module's TypeOrmModule.forFeature
  - Frontend: `SlotState` type in `use-machine-state.ts`, slots grid UI in `ContentsTab.tsx`

**BUG #4 — Frontend `toApiPayload` didn't send `contentModel` (machines/new/page.tsx):**

- Even after backend BUG #2 fix, manually-created machines still defaulted to `slots`
- **Fix**: Added `TYPE_TO_CONTENT_MODEL` mapping: `coffee`/`water` → `containers`, `combo` → `mixed`, rest → `slots`

**Seed Migration:**

- `1775300000000-SeedTestMachinesData.ts` — test data for 3 machines (coffee, snack, drink) with containers, equipment_components, and machine_slots
- Fixed column names: `component_status` (not `status`), `current_location_type` added, `filter` type (not `other`)
- 42 machine_slots seeded with deterministic fill levels (no `Math.random()`)

**Known DTO→Entity Field Mappings (CRITICAL for future development):**

| DTO field      | Entity field    | Notes                                        |
| -------------- | --------------- | -------------------------------------------- |
| `code`         | `machineNumber` | Must be explicitly mapped in controller      |
| `contentModel` | `contentModel`  | Optional, derived from type in frontend      |
| `basePrice`    | `sellingPrice`  | Products: mapped in controller create/update |
| `costPrice`    | `purchasePrice` | Products: mapped in controller create/update |
| `type`         | `typeCode`      | Tasks: mapped in controller create           |
| `parent_id`    | `parentId`      | Organizations: snake→camelCase in controller |

### Security & Tenant Isolation Remediation (2026-03-30)

Full audit (6-phase verification) → 48 real bugs found → 2-sprint fix cycle. All fixes compile clean (`tsc --noEmit` zero errors).

**Sprint 1 — Security Critical (13 files modified):**

- **Users password hashing**: `create()` was storing plaintext, now uses `bcrypt.hash(password, 12)`
- **Users tenant isolation**: `findByEmail()`, `findByTelegramId()`, `findByUsername()` accept optional `organizationId`
- **Complaints tenant isolation**: `findById()`, `findByNumber()` + all 7 internal callers (update, assign, resolve, escalate, reject, addComment, remove, bulkUpdate) + facade service + controller — full `organizationId` threading
- **Complaints route fix**: `@Get("number/:number")` moved before `@Get(":id")` to prevent shadowing
- **RBAC controller**: All 7 endpoints now extract `@CurrentOrganizationId()` and pass to service
- **RBAC service**: `syncRolePermissions()` now accepts optional `organizationId` for org-scoped role lookup
- **Collections**: `getHistory()` now verifies collection belongs to caller's org before returning history
- **Fiscal**: `processQueueItem()` now filters queue item lookup by `organizationId`
- **Trips**: `getTripById()` and `verifyTripAccess()` use DB-level tenant isolation instead of post-fetch checks
- **Products**: `create()` and `update()` now map `basePrice`→`sellingPrice`, `costPrice`→`purchasePrice`
- **Tasks**: `create()` now maps `type`→`typeCode`
- **Organizations**: `create()` and `update()` now map `parent_id`→`parentId`

**Sprint 2 — Infrastructure (9 files modified):**

- **12 time-sensitive cron jobs** fixed: added `{ timeZone: "Asia/Tashkent" }` to all daily/weekly/monthly crons
- Files: `reports/analytics.service.ts` (3), `analytics.service.ts` (1), `work-logs.service.ts` (1), `billing.service.ts` (1), `washing-schedule.service.ts` (1), `maintenance.service.ts` (1), `auth.service.ts` (3), `web-push.service.ts` (1)
- **13 interval crons** verified: every-N-minutes/hours crons don't need timezone (timezone-agnostic)
- **7 crons** already had `Asia/Tashkent` (loyalty, quests, contractors)
- **Route ordering audit**: NestJS multi-segment paths (e.g. `analytics/employee`) are NOT shadowed by single-segment `:id` — 5 audit findings reclassified as false positives

**Sprint 3 — Remaining Tenant Isolation (7 files modified):**

- **Complaints findByAssignee()**: now accepts optional `organizationId` for org-scoped query
- **Complaints findByMachine()**: now accepts optional `organizationId` for org-scoped query
- **Complaints Refund** (CRITICAL): `approveRefund()`, `processRefund()`, `rejectRefund()` — all 3 now filter by `organizationId` to prevent cross-org financial operations
- **Complaints QR codes**: `getQrCodesForMachine()` now filters by `organizationId`
- All changes threaded through facade service → controller with `@CurrentOrganizationId()`

**Sprint 4 — Final Sweep (8 files modified, 2026-03-30):**

Fresh audit found 4 additional bugs missed in Sprints 1-3:

- **SLA copy-paste bug** (complaints-analytics.service.ts): `URGENT` priority was referencing `CRITICAL`'s SLA config instead of its own — fixed `DEFAULT_SLA_CONFIG[ComplaintPriority.CRITICAL]` → `DEFAULT_SLA_CONFIG[ComplaintPriority.URGENT]`
- **Notifications tenant isolation** (controller + service):
  - `delete()` controller now extracts `@CurrentOrganizationId()` and passes to service
  - `startCampaign()` controller now extracts and passes `organizationId` — service filters campaign lookup by org
  - Service methods `update()`, `cancel()`, `resend()` now accept and forward `organizationId` to `findById()` (defense-in-depth)
- **Machines tenant isolation** (controller + core service + facade):
  - `update()` and `updateStatus()` — controller removed post-fetch org check pattern, now passes `organizationId` directly to service via owner-bypass pattern (`user.role === OWNER ? undefined : user.organizationId`)
  - Core service `update()` and `updateStatus()` now accept optional `organizationId` for DB-level filtering
  - Eliminates redundant `findById` + manual check + `update` triple call
- **Notifications bulk operations** (defense-in-depth):
  - `bulkDelete()` and `bulkMarkAsRead()` now accept optional `organizationId` and add to WHERE clause
  - Not currently exposed via controller endpoints, but protected for future-proofing

**Sprint 5 — Full Module Audit (7 files modified, 2026-03-30):**

Comprehensive audit of 11 remaining unaudited modules found 5 real vulnerabilities:

- **Inventory reservation tenant isolation** (controller + facade + reservation service):
  - `confirmReservation()`, `fulfillReservation()`, `cancelReservation()` — all 3 now accept optional `organizationId`
  - Reservation service adds `organizationId` to pessimistic-write lock WHERE clause (atomic tenant check + lock)
  - Controller extracts `@CurrentOrganizationId()` and passes through chain
- **Warehouse stock movement tenant isolation** (controller + stock-take service):
  - `completeMovement()` and `cancelMovement()` — both now accept optional `organizationId`
  - Controller extracts `@CurrentOrganizationId()` and passes to service
- **8 modules verified secure**: locations, equipment (4 controllers), billing, work-logs, maintenance, loyalty (5 controllers), promo-codes, favorites (user-scoped by design)
- **Agent-bridge**: intentionally global/admin-scoped (system-level AI agent bridge, not multi-tenant by design)

**Audit False Positives Identified:**

- 8 "missing UseGuards" bugs → guards are GLOBAL in `app.module.ts`
- 5 route ordering bugs → NestJS segment-count matching prevents shadowing
- Payment Reports `deleteUpload` → already uses `findUploadById(id, orgId)` before delete
- Users approve/reject/block/unblock/deactivate/activate — NOT exposed via controller endpoints (service-only methods, no REST vulnerability)
- Notifications update/cancel/resend — NOT exposed via controller endpoints (service-only, fixed as defense-in-depth)
- Favorites uses userId (not organizationId) — correct, favorites are per-user not per-org
- Agent-bridge has no org filtering — intentional, system-level admin-only module

### Frontend↔Backend DTO Mapping Audit (2026-03-31)

Full audit of 40+ dashboard form pages. 18 forms had field mapping bugs, all fixed across 4 commits. Both `apps/web` and `apps/api` compile with zero TypeScript errors.

**Batch 1** (a9feebc) — 6 forms:

- **equipment create/edit** (3 forms): wrong component status enums, missing `serialNumber`/`purchaseDate`
- **tasks/new**: missing 4 `replace_*` task types
- **employees/new**: `position` → `employeeRole`, 5 values → 7 values
- **locations/new**: flat `address` string → nested `AddressDto`, `contactPerson` → `primary_contact_name`

**Batch 2** (ad53624) — 4 forms:

- **tasks/[id]**: same task type fix as new, `dueDate` not converted to ISO string
- **employees/[id]**: `position` → `employeeRole`, status enum mismatch
- **locations/[id]**: same AddressDto + contact field fixes as new page
- **organizations**: camelCase form → snake_case DTO (`nameUz` → `name_uz`, `bankAccount` → `bank_account`, etc.)

**Batch 3** (b70fa0c) — 3 forms:

- **incidents**: snake_case form → camelCase DTO (`machine_id` → `machineId`, `repair_cost` → `repairCost`)
- **contractors**: `name` → `companyName`, `type` → `serviceType`, `contractEndDate` → `contractEnd`
- **warehouse**: `is_active` → `isActive`, missing required `code` field, stock movement `product_id` → `productId`

**Batch 4** (c0671cd) — 5 forms:

- **vehicles/odometer**: `currentOdometer` → `odometer` (UpdateOdometerDto)
- **notifications/templates**: `subject` → `titleRu`, `body` → `bodyRu`, `channels` → `defaultChannels`, `is_active` → `isActive`, auto-generate `code`
- **notifications/campaigns**: `message` → `body`, `audience_filter` → `targetType`+`targetRoles`, `scheduled_at` → `scheduledFor`
- **notifications/settings**: flat channel object → individual `*Enabled` boolean fields + `typeSettings`
- **notifications/rules toggle**: `is_active` → `isActive`

**Verified clean pages**: routes, collections, settings, products/new, machines/new, users/new, auth/login, auth/register, complaints/settings, complaints/qr-codes, directories, directories/[id]

**Known gap (RESOLVED)**: ~~Notification rules CRUD endpoints do NOT exist on backend~~ — Fixed in commit `1575d7b`: 5 CRUD endpoints added (GET/POST/PATCH/DELETE `/notifications/rules`).

**Known gap (RESOLVED)**: ~~Payout requests endpoint~~ — Fixed: full CRUD module created (`payout-requests`), frontend hook updated to use real API.

**Extended DTO→Entity Field Mappings (CRITICAL):**

| Frontend field     | Backend DTO field      | Module         | Notes                                  |
| ------------------ | ---------------------- | -------------- | -------------------------------------- |
| `code`             | `machineNumber`        | machines       | Explicit mapping in controller         |
| `contentModel`     | `contentModel`         | machines       | Derived from type in frontend          |
| `basePrice`        | `sellingPrice`         | products       | Mapped in controller create/update     |
| `costPrice`        | `purchasePrice`        | products       | Mapped in controller create/update     |
| `type`             | `typeCode`             | tasks          | Mapped in controller create            |
| `parent_id`        | `parentId`             | organizations  | snake→camelCase in controller          |
| `position`         | `employeeRole`         | employees      | Completely different field name        |
| `address` (string) | `address` (AddressDto) | locations      | Nested object with country/region/city |
| `contactPerson`    | `primary_contact_name` | locations      | Different naming convention            |
| `name`             | `companyName`          | contractors    | Different field name                   |
| `type`             | `serviceType`          | contractors    | Different field name                   |
| `contractEndDate`  | `contractEnd`          | contractors    | Shortened name                         |
| `machine_id`       | `machineId`            | incidents      | snake→camelCase                        |
| `repair_cost`      | `repairCost`           | incidents      | snake→camelCase + Number()             |
| `is_active`        | `isActive`             | warehouse      | snake→camelCase                        |
| `product_id`       | `productId`            | stock-movement | snake→camelCase                        |
| `currentOdometer`  | `odometer`             | vehicles       | Entity field ≠ DTO input field         |
| `subject`          | `titleRu`              | notifications  | i18n model in backend                  |
| `body`             | `bodyRu`               | notifications  | i18n model in backend                  |
| `channels`         | `defaultChannels`      | notifications  | Template-specific naming               |
| `message`          | `body`                 | campaigns      | Different field name                   |
| `audience_filter`  | `targetType`           | campaigns      | Structural: string → type+roles        |
| `scheduled_at`     | `scheduledFor`         | campaigns      | Different field name + Date conversion |

### React Hook Form + Zod Migration (2026-03-31)

13 forms migrated from raw `useState` to React Hook Form 7.61 + Zod validation, matching CLAUDE.md tech stack requirement. Pattern: `useForm<T>({ resolver: zodResolver(schema) })` with `Controller` for shadcn Select components.

**Migrated pages (Batch 1 — commit 5aaa920):**

| Page                                          | Fields      | Notes                                                                                             |
| --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `reconciliation/page.tsx`                     | 6           | `.refine()` for date range validation                                                             |
| `settings/page.tsx`                           | 16 (4 tabs) | Flat schema covering general/notifications/security/appearance, `useEffect` populates from server |
| `machine-access/page.tsx` (GrantAccessForm)   | 4           | UUID validation on machineId/userId                                                               |
| `machine-access/page.tsx` (TemplateForm)      | 4           | Template CRUD with machineIds parsing                                                             |
| `machine-access/page.tsx` (ApplyTemplateForm) | 1           | User IDs comma-separated input                                                                    |
| `complaints/settings/page.tsx`                | 11          | Connected to new API endpoint (was hardcoded TODO)                                                |

**Migrated pages (Batch 2):**

| Page                            | Fields | Notes                                                                 |
| ------------------------------- | ------ | --------------------------------------------------------------------- |
| `employees/[id]/page.tsx`       | 10     | Typed enums for EMPLOYEE_ROLES (7) and STATUSES (5)                   |
| `tasks/[id]/page.tsx`           | 9      | 12 task types including 4 `replace_*`, dueDate ISO conversion         |
| `locations/[id]/page.tsx`       | 10     | Nested AddressDto extraction in useEffect, lat/lng validation         |
| `loyalty/transactions/page.tsx` | 3      | Dialog form with Controller for user Select                           |
| `loyalty/achievements/page.tsx` | 12     | Dialog create/edit with `form.reset()` pattern, 3 enum Controllers    |
| `loyalty/promo-codes/page.tsx`  | 9      | Dialog create/edit, `generateCode()` uses `form.setValue()`           |
| `loyalty/quests/page.tsx`       | 12     | Dialog create/edit with 3 enum Controllers (period, type, difficulty) |
| `organizations/page.tsx`        | 16     | Sub-component `OrganizationForm`, camelCase→snake_case DTO mapping    |

**Batch 3 — References page (2026-03-31, commit TBD):**

| Page                  | Forms | Notes                                                                     |
| --------------------- | ----- | ------------------------------------------------------------------------- |
| `references/page.tsx` | 5     | MxikForm, IkpuForm, VatForm, PackageForm, ProviderForm — all dialog-based |

All dashboard forms are now migrated to RHF+Zod. No remaining useState forms.

### Payout Requests Module (2026-03-31)

New NestJS module for payout request lifecycle management:

- **Entity**: `PayoutRequest` extends BaseEntity, with status enum (PENDING→APPROVED→PROCESSING→COMPLETED, or REJECTED/CANCELLED/FAILED), payout method enum (bank_transfer/card/cash), tenant isolation via `organizationId`
- **7 endpoints**: GET list (paginated), GET stats, GET by ID, POST create, PATCH review (approve/reject), PATCH cancel, DELETE (soft)
- **Pessimistic write locks** on all status transitions to prevent race conditions
- **RBAC**: create (owner/admin/manager/operator), review (owner/admin), list/stats (owner/admin/manager/accountant)
- **Frontend hook** updated: `usePayoutRequests()` now calls real `/payout-requests` API, `useCreatePayoutRequest()` mutation added
- Files: entity, 3 DTOs, service, controller, module, index.ts

### Complaints Settings CRUD Endpoint (2026-03-31)

New backend endpoint storing complaint settings in Organization's `settings` JSONB column:

- `GET /complaints/settings` — returns SLA config, automation flags, notification prefs (with defaults)
- `PUT /complaints/settings` — partial update via JSONB merge (`settings || '...'::jsonb`)
- DTO: `UpdateComplaintSettingsDto` with nested `SlaConfigDto` + `ComplaintNotificationSettingsDto`
- Tenant isolation via `@CurrentOrganizationId()`
- Roles: GET (owner/admin/manager), PUT (owner/admin)
- Files: `dto/complaint-settings.dto.ts`, `complaints.service.ts`, `complaints.controller.ts`, `complaints.module.ts`

### Site Supabase → API Migration (2026-04-04)

Full migration of site app from supabase adapter to VendHub API. 30+ files changed, `lib/supabase.ts` deleted.

**API — `site-cms` module (JSONB document store):**

- **Entity**: `SiteCmsItem` — `collection` (VARCHAR 50), `data` (JSONB), `sortOrder` (INT), `isActive` (BOOLEAN), `organizationId` (UUID). Extends BaseEntity.
- **Admin controller** (`/site-cms/:collection[/:id]`): GET list, GET by ID, GET count, POST create, PATCH update, DELETE soft-delete. JWT required, roles: owner/admin.
- **Public controller** (`/client/public/*`): GET partners, GET machine-types, GET site-cms/:collection, POST cooperation-requests (rate-limited).
- **Service**: `findByCollection`, `countByCollection`, `findById`, `create`, `update`, `remove`. Returns flattened objects: `{id, ...data, sort_order, is_active, created_at, updated_at}`.
- **Migrations**: `1775900000000-CreateSiteCmsItems` (table + indexes), `1775900000001-SeedSiteCmsData` (84 rows across 9 collections)
- **Collections**: products (20), machines (16), promotions (3), loyalty_tiers (4), bonus_actions (11), loyalty_privileges (8), site_content (14), partners (4), partnership_models (4)

**Site — Auth proxy:**

- `app/api/auth/login/route.ts` — POST: proxy to API `/auth/login`, JWT → httpOnly cookie
- `app/api/auth/session/route.ts` — GET: validate JWT cookie via API `/auth/me`
- `app/api/auth/logout/route.ts` — POST: clear cookies
- `lib/admin-auth.ts` — `getSession()`, `signIn()`, `signOut()` via proxy routes

**Site — Admin API client:**

- `app/api/admin/[...path]/route.ts` — catch-all proxy: JWT from cookie → Bearer header → API
- `lib/admin-api.ts` — `cmsGetAll`, `cmsCount`, `cmsCreate`, `cmsUpdate`, `cmsDelete` helpers
- `lib/color-schemes.ts` — extracted COLOR_SCHEMES from data.ts

**Site — Public pages:**

- `lib/api-client.ts` extended: `fetchPublicPartners()`, `fetchPublicMachineTypes()`, `fetchPublicSiteCms()`, `submitCooperationRequest()`
- Public pages use api-client.ts with data.ts fallbacks
- Admin pages use admin-api.ts (no fallbacks, real CRUD)

**Deleted:** `lib/supabase.ts` (zero consumers remain)
**Kept:** `lib/data.ts` as fallback for 4 public pages

### Routes + Trips Merge (2026-04-01)

Unified Routes module — merged 3 modules (routes, trips, trip-analytics) into 1. Single lifecycle: `DRAFT → PLANNED → ACTIVE → COMPLETED/CANCELLED/AUTO_CLOSED`. Commit `a5153bc`.

**Backend (6 sprints, 50 files changed, -6872 / +3523 lines):**

- **Route entity extended**: +17 columns from Trip (vehicleId, transportType, startOdometer, endOdometer, calculatedDistanceMeters, start/endLatitude, start/endLongitude, liveLocationActive, lastLocationUpdate, telegramMessageId, totalPoints, totalStopsVisited, totalAnomalies, visitedMachinesCount, taxiTotalAmount)
- **RouteStop extended**: +6 columns from TripStop (machineName, machineAddress, distanceToMachineMeters, actualDurationSeconds, isVerified, isAnomaly)
- **3 new entities created**: RoutePoint (GPS track), RouteAnomaly (deviations), RouteTaskLink (task binding with GPS verification)
- **3 new enums**: `RouteStatus` (+draft, active, auto_closed), `TransportType`, `AnomalyType`/`AnomalySeverity`/`RouteTaskLinkStatus`
- **4 new services**: RouteTrackingService (GPS, stop detection, geofencing), RouteAnalyticsService (7 dashboards), GpsProcessingService (Haversine), RoutesCronService (auto-close, long stop detection)
- **18 new endpoints**: /start, /end, /cancel, /points, /points/batch, /track, /live-location, /tasks, /tasks/:taskId/complete, /anomalies, /anomalies/:id/resolve, /anomalies/unresolved, /active, /analytics/\* (main, activity, employees, vehicles, anomalies, taxi)
- **Migration**: `1775700000000-MergeTripsIntoRoutes.ts` — extends routes/route_stops tables, creates route_points/route_anomalies/route_task_links
- **vhm24-integration updated**: imports from routes instead of trips, TripReconciliation entity kept for backward compat

**Frontend:**

- **New page**: `routes/analytics/page.tsx` — KPI cards with period comparison, employee/vehicle/anomaly tabs
- **Sidebar**: removed "Рейсы" (Trips), removed "Trip Analytics", added "Route Analytics" → `/dashboard/routes/analytics`
- **API lib**: `tripsApi` redirected to `/routes/*`, `tripAnalyticsApi` renamed to `routeAnalyticsApi`
- **Deleted**: 5 trip frontend pages (trips/, trips/[id], trips/analytics, trips/tracker, trip-analytics/)

**Deleted modules:**

- `trips/` (18 files) — kept only `trip-reconciliation.entity.ts` for vhm24-integration
- `trip-analytics/` (5 files) — merged into `routes/services/route-analytics.service.ts`
- `app.module.ts` — removed `TripsModule` and `TripAnalyticsModule`

**Verification**: `tsc --noEmit` = 0 errors on API, Web, Client, Bot

**Unified Route Lifecycle:**

| Status        | Description                         | Transition                          |
| ------------- | ----------------------------------- | ----------------------------------- |
| `draft`       | Template/incomplete route           | → planned                           |
| `planned`     | Ready with stops, operator assigned | → active, cancelled                 |
| `active`      | Operator on the road, GPS tracking  | → completed, cancelled, auto_closed |
| `completed`   | All stops visited, route ended      | terminal                            |
| `cancelled`   | Manually cancelled                  | terminal                            |
| `auto_closed` | No GPS updates for 8h (cron)        | terminal                            |

### Telegram Bot Architecture Merge (2026-04-07)

Eliminated standalone `apps/bot/` (mixed staff+customer logic, HTTP proxy to API) in favor of embedded bots inside API module (`apps/api/src/modules/telegram-bot/`). Two separate bots with separate tokens, direct TypeORM DB access, no HTTP overhead.

**Architecture: Two-Bot Orchestrator Pattern**

- **Staff Bot** (`TELEGRAM_BOT_TOKEN`): `TelegramBotService` orchestrator → 8 sub-services via `setBot()` pattern
- **Customer Bot** (`TELEGRAM_CUSTOMER_BOT_TOKEN`): `TelegramCustomerBotService` orchestrator → 9 sub-services via `setBot()` pattern
- Both bots share session management (`Map<number, Session>`), run inside NestJS DI container
- Bot polling disabled when `DISABLE_BOT_POLLING=true` (for webhook mode or send-only)

**Staff Bot Sub-Services** (operators, managers, warehouse):

| Service                   | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `BotHandlersService`      | Command/callback/message routing                    |
| `BotMenuService`          | Main menu, navigation                               |
| `BotTaskOpsService`       | Task management (accept, complete, photo reports)   |
| `BotMachineOpsService`    | Machine status, inventory checks                    |
| `BotRouteOpsService`      | Route lifecycle, GPS tracking, vehicle selection    |
| `BotNotificationsService` | Push notifications (task assigned, overdue, alerts) |
| `BotStatsService`         | Daily stats, overdue alerts                         |
| `BotAdminService`         | User management, analytics, message logging         |

**Customer Bot Sub-Services** (end customers):

| Service                     | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `CustomerHandlersService`   | Command/callback/message routing                   |
| `CustomerMenuService`       | Main menu, language selection                      |
| `CustomerCatalogService`    | Product browsing by machine                        |
| `CustomerCartService`       | Shopping cart, checkout, payment method selection  |
| `CustomerOrdersService`     | Order history, details, pagination                 |
| `CustomerLoyaltyService`    | Points balance, tier info, history                 |
| `CustomerComplaintsService` | File complaints with photos                        |
| `CustomerLocationService`   | Geolocation machine search (Haversine, 5km radius) |
| `CustomerEngagementService` | Referrals, promo codes, quests, achievements       |

**Deleted:**

- `apps/bot/` directory (standalone Telegraf app with HTTP proxy — replaced entirely)
- `bot` service from `docker-compose.yml`, `docker-compose.prod.yml`
- `bot` Docker image build from CI (`ci.yml`, `deploy.yml`, `release.yml`)
- `apps/bot` reference from root `tsconfig.json`

**Key files:**

- `apps/api/src/modules/telegram-bot/telegram-bot.module.ts` — NestJS module with all entities/services
- `apps/api/src/modules/telegram-bot/telegram-bot.service.ts` — Staff bot orchestrator
- `apps/api/src/modules/telegram-bot/telegram-customer-bot.service.ts` — Customer bot orchestrator
- `apps/api/src/modules/telegram-bot/services/` — All sub-services (17 files)

## Skills (AI Agent Tools)

21 specialized skills in `.claude/commands/` directory for domain-specific code generation:

| Skill                      | Purpose                             |
| -------------------------- | ----------------------------------- |
| `vhm24-api-generator`      | NestJS REST API endpoint generation |
| `vhm24-auth-rbac`          | Authentication and RBAC             |
| `vhm24-charts`             | Recharts data visualization         |
| `vhm24-component-lib`      | UI component library (shadcn/ui)    |
| `vhm24-db-expert`          | TypeORM schema and migrations       |
| `vhm24-devops`             | Docker, K8s, CI/CD                  |
| `vhm24-docs-generator`     | Documentation generation            |
| `vhm24-forms`              | React Hook Form + Zod               |
| `vhm24-health-check`       | Service diagnostics & monitoring    |
| `vhm24-i18n`               | Localization (uz, ru, en)           |
| `vhm24-migration`          | Module migration VHM24→VendHub OS   |
| `vhm24-mobile`             | React Native/Expo mobile            |
| `vhm24-monitoring`         | Prometheus, Grafana, logging        |
| `vhm24-orchestrator`       | Workflow coordination               |
| `vhm24-payments`           | Payme, Click, Uzum Bank             |
| `vhm24-qa-review`          | Code review and QA                  |
| `vhm24-realtime`           | Socket.IO real-time                 |
| `vhm24-security-hardening` | Security best practices             |
| `vhm24-testing`            | Jest + Playwright testing           |
| `vhm24-ui-generator`       | React UI generation                 |
| `vhm24-ux-spec`            | UX specifications                   |

## Agents (AI Subagents)

6 specialized agents in `.claude/agents/` for automated workflows:

| Agent                         | Model  | Purpose                                  |
| ----------------------------- | ------ | ---------------------------------------- |
| `production-quality-guardian` | opus   | 8-phase production readiness audit       |
| `module-migrator`             | opus   | Module migration from VHM24-repo         |
| `build-verifier`              | sonnet | Verify all 6 apps compile without errors |
| `db-migration-helper`         | sonnet | TypeORM migration management             |
| `health-check`                | sonnet | Service diagnostics and monitoring       |
| `dependency-audit`            | sonnet | Security vulnerability and outdated deps |

## Migration Context

Migrating from VHM24-repo (56 modules, 120 entities, 89 migrations) into VendHub OS (82 modules, 125 entities, 16 migrations).

Strategies per module:

- **MERGE** (25): Both repos have it, combine field-by-field
- **PORT** (24): Only in VHM24-repo, move to VendHub OS
- **KEEP** (4): Only in VendHub OS, don't touch
- **NEW**: Create from scratch

See [MIGRATION_PLAN_v4.md](MIGRATION_PLAN_v4.md) and [MASTER_PROMPT.md](MASTER_PROMPT.md) for full migration details.

## Business Context

- Target market: Uzbekistan
- Currency: UZS (Uzbek Sum)
- Languages: Uzbek, Russian, English
- Payment methods: Payme, Click, Uzum Bank, Telegram Stars, cash
- Tax: OFD/Soliq.uz fiscal integration
- Locale: uz-UZ, ru-RU; timezone Asia/Tashkent

## Mandatory Workflow — Tool Usage Rules

**CRITICAL:** These rules are MANDATORY. Every task MUST route through the appropriate tools. Do NOT skip tool usage to "save time".

### Before ANY Code Change

1. **Read CLAUDE.md rules** — verify you're following all 8 mandatory code rules
2. **Check hookify rules** — `.claude/hookify.local.md` has 10 blocking/warning rules
3. **Use Serena** for symbol-level code navigation — `find_symbol`, `get_symbols_overview`, `find_referencing_symbols` before editing

### Task → Tool Routing Table

| Task Type                     | MUST Use (Skills/Plugins/Agents)                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **New API module/endpoint**   | `/vhm24-api-generator` skill → `vhm24-db-expert` for entities → `build-verifier` agent after               |
| **New UI page/component**     | `/vhm24-ux-spec` first → `/vhm24-ui-generator` or `/frontend-design` → `vercel-react-best-practices` skill |
| **New form**                  | `/vhm24-forms` skill (React Hook Form + Zod)                                                               |
| **Charts/dashboard**          | `/vhm24-charts` skill (Recharts)                                                                           |
| **Auth/RBAC changes**         | `/vhm24-auth-rbac` skill                                                                                   |
| **Database schema/migration** | `/vhm24-db-expert` skill → `db-migration-helper` agent                                                     |
| **Payment integration**       | `/vhm24-payments` skill                                                                                    |
| **Real-time/WebSocket**       | `/vhm24-realtime` skill                                                                                    |
| **Mobile (Expo)**             | `/vhm24-mobile` skill + `vercel-react-native-skills`                                                       |
| **i18n/localization**         | `/vhm24-i18n` skill                                                                                        |
| **Docker/K8s/CI**             | `/vhm24-devops` skill                                                                                      |
| **Monitoring/logging**        | `/vhm24-monitoring` skill                                                                                  |
| **Security hardening**        | `/vhm24-security-hardening` skill + `security-guidance` plugin                                             |
| **Testing**                   | `/vhm24-testing` skill                                                                                     |
| **Documentation**             | `/vhm24-docs-generator` skill                                                                              |
| **Module migration**          | `/vhm24-migration` skill → `module-migrator` agent                                                         |
| **Component library**         | `/vhm24-component-lib` skill + `web-design-guidelines`                                                     |
| **Multi-step/complex task**   | `/vhm24-orchestrator` skill to coordinate                                                                  |
| **Code review**               | `/vhm24-qa-review` skill → `code-review` plugin → `pr-review-toolkit`                                      |
| **Git commit**                | `/commit` (commit-commands plugin)                                                                         |
| **Create PR**                 | `/commit-push-pr` (commit-commands plugin)                                                                 |
| **Feature development**       | `/feature-dev` plugin (guided flow)                                                                        |
| **Bug investigation**         | `systematic-debugging` superpowers skill                                                                   |
| **Health check/diagnostics**  | `/vhm24-health-check` skill → `health-check` agent                                                         |

### After ANY Code Change

1. **Build verification** — run `build-verifier` agent (checks all 6 apps compile)
2. **Code review** — run `code-review` plugin or `pr-review-toolkit` for PR
3. **Simplification** — run `code-simplifier` plugin on changed files

### Quality Gates (Automatic)

- Before committing: `verification-before-completion` superpowers skill
- Before PR: `pr-review-toolkit` plugin (code-reviewer + silent-failure-hunter + type-design-analyzer)
- Before deploy: `production-quality-guardian` agent (8-phase audit)
- Dependency changes: `dependency-audit` agent

### MCP Servers (Always Available)

| Server         | Use For                                      |
| -------------- | -------------------------------------------- |
| **Serena**     | Symbol navigation, code editing, refactoring |
| **Context7**   | Library documentation lookup                 |
| **Playwright** | Browser testing and UI verification          |
| **Firebase**   | Firebase project management                  |
| **Greptile**   | PR review, code search, custom context       |
| **Sonatype**   | Dependency security analysis                 |

### Parallel Agent Dispatch

For complex tasks, launch multiple agents in parallel:

- `build-verifier` + `code-review` after implementation
- `dependency-audit` + `production-quality-guardian` before release
- Multiple `Explore` agents for cross-app investigation

## Pre-Commit Checks

```bash
npx tsc --noEmit                    # TypeScript compiles
npx eslint src/ --max-warnings 0    # Lint passes
npx jest --passWithNoTests          # Tests pass
```

## Key Files

| What           | Path                                          |
| -------------- | --------------------------------------------- |
| Master Prompt  | `MASTER_PROMPT.md`                            |
| Migration Plan | `MIGRATION_PLAN_v4.md`                        |
| UI/UX Spec     | `UI_UX_SPECIFICATION.md`                      |
| TypeORM Config | `apps/api/src/database/typeorm.config.ts`     |
| API Modules    | `apps/api/src/modules/`                       |
| Base Entity    | `apps/api/src/common/entities/base.entity.ts` |
| App Module     | `apps/api/src/app.module.ts`                  |
| Skills         | `.claude/commands/`                           |
| Docker Compose | `docker-compose.yml`                          |
| Turbo Config   | `turbo.json`                                  |
| CI Pipeline    | `.github/workflows/ci.yml`                    |
