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
│   ├── api/              # NestJS backend (84 modules)
│   ├── web/              # Next.js admin panel
│   ├── client/           # Vite React PWA (customer-facing)
│   ├── bot/              # Telegram bot (Telegraf)
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

| Service  | Port | Description    |
| -------- | ---- | -------------- |
| postgres | 5432 | PostgreSQL 16  |
| redis    | 6379 | Redis 7        |
| api      | 4000 | NestJS backend |
| web      | 3000 | Next.js admin  |
| client   | 5173 | Vite PWA       |
| bot      | -    | Telegram bot   |
| site     | 3100 | Next.js site   |
| mobile   | -    | Expo dev       |

## VendHub24 Integration Status

**Readiness: ~99%** (updated from 97%)

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

- **4 new API modules created:**
  - `cash-finance`: Cash flow and financial tracking
  - `collections`: Collection and payment management
  - `trip-analytics`: Route and trip data analysis
  - `vhm24-integration`: VendHub24 legacy system bridge

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

| DTO field    | Entity field    | Notes                                          |
| ------------ | --------------- | ---------------------------------------------- |
| `code`       | `machineNumber` | Must be explicitly mapped in controller         |
| `contentModel` | `contentModel` | Optional, derived from type in frontend         |

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

Migrating from VHM24-repo (56 modules, 120 entities, 89 migrations) into VendHub OS (84 modules, 122 entities, 15 migrations).

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
