# VendHub OS -- Master Prompt: Migration to 100% Production-Ready

## CONTEXT

You are working on VendHub OS -- a vending machine management platform for Uzbekistan.
Two codebases exist:

1. **VHM24-repo** (`/VHM24-repo/backend/`) -- SOURCE: 56 NestJS modules, 120 TypeORM entities, 89 migrations, PostgreSQL. This is the battle-tested business logic.
2. **VendHub OS** (`/VendHub OS/vendhub-unified/`) -- TARGET: Turborepo monorepo with 37 existing modules. This is the production deployment target.

Your job: MERGE VHM24-repo business logic INTO VendHub OS until 100% production-ready.

## TECH STACK (VERIFIED -- DO NOT DEVIATE)

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | NestJS | 11.1 |
| ORM | TypeORM | 0.3.20 |
| Database | PostgreSQL | 16 |
| Validation | class-validator + class-transformer | 0.14 |
| API Docs | @nestjs/swagger | 11 |
| Frontend | Next.js | 16.1 |
| State | Zustand | 5 |
| UI | shadcn/ui + Radix + TailwindCSS 4 |
| Real-time | Socket.IO + Redis adapter | 4.7 |
| Queue | BullMQ | 5 |
| Cache | Redis (ioredis) | 7 |
| Bot | Telegraf | 4.16 |
| Auth | Passport + JWT + TOTP (otplib) |
| Testing | Jest + Playwright |

**CRITICAL:** NEVER use Drizzle, MySQL, tRPC, or Express (standalone). Those are WRONG and come from outdated docs.

## MANDATORY RULES

### Rule 1: BaseEntity

EVERY entity MUST extend BaseEntity:

```typescript
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('table_name')
export class MyEntity extends BaseEntity {
  // BaseEntity provides: id (UUID), created_at, updated_at, deleted_at, created_by_id, updated_by_id
  // DO NOT add these fields manually
}
```

### Rule 2: UUID everywhere

All primary keys are UUID (`string`), never `number`. All foreign keys are `string | null`.

```typescript
// CORRECT
@Column({ type: 'uuid' })
organization_id: string;

// WRONG
@Column()
organizationId: number;
```

### Rule 3: DB column naming

Use **snake_case** for all database columns (matching VHM24-repo convention):

```typescript
// CORRECT
@Column({ type: 'varchar', length: 100 })
machine_number: string;

// WRONG
@Column()
machineNumber: string;
```

### Rule 4: Validation on all inputs

Every controller endpoint that accepts body/query MUST use DTOs with class-validator decorators:

```typescript
export class CreateProductDto {
  @IsString() @Length(1, 255) name: string;
  @IsEnum(ProductType) type: ProductType;
  @IsOptional() @IsNumber() cost_price?: number;
}
```

### Rule 5: Swagger documentation

Every controller and DTO must have @ApiTags, @ApiOperation, @ApiProperty decorators.

### Rule 6: Soft delete

Use TypeORM's `@DeleteDateColumn` via BaseEntity. Never hard-delete records.
Use `.softDelete()` and `.restore()`, not `.delete()`.

### Rule 7: Multi-tenant

Every query that returns user-facing data MUST filter by `organization_id`.
Use a guard or interceptor to inject organization context.

### Rule 8: No orphan modules

Every new module must be:
1. Registered in `app.module.ts`
2. Have at least one test file
3. Be exported if used by other modules

## MIGRATION STRATEGY

For each module, determine the mode:

### MERGE (25 modules)
Both repos have this module. Compare entities field-by-field:
1. Read VHM24-repo entity
2. Read VendHub OS entity
3. Create merged entity with ALL fields from both
4. Prefer VHM24-repo business logic (more mature)
5. Create TypeORM migration for schema diff
6. Port service methods from VHM24-repo

### PORT (24 modules)
Only VHM24-repo has this module:
1. Copy entity files, adapting imports
2. Copy service, controller, module files
3. Adapt to VendHub OS conventions (if different)
4. Create TypeORM migration
5. Register in app.module.ts

### KEEP (4 modules)
Only VendHub OS has this. Don't touch.

## EXECUTION ORDER

### Phase 0: Foundation
```
0.1 Copy BaseEntity from VHM24-repo -> VendHub OS common/entities/
0.2 Run Appendix A SQL migration (EAV directories system)
0.3 Create typed reference entities (goods_classifiers, ikpu_codes, vat_rates, package_types, payment_providers)
0.4 Create DTOs with class-validator for each reference entity
0.5 Create ReferencesModule (controller + service)
0.6 Run seed data (VAT rates, package types, payment providers)
0.7 Import MXIK codes from CSV into goods_classifiers
```

**Quality gate:** `npm run typecheck`, seeds run without errors, Swagger shows /references/* endpoints.

### Phase 1: Core (10 tasks)
```
1.1  MERGE auth (add 2FA, lockout, IP whitelist from VHM24-repo)
1.2  MERGE users (use VHM24-repo User entity as base -- 40+ fields)
1.3  PORT rbac (Role, Permission, user_roles from VHM24-repo)
1.4  MERGE organizations (franchise system)
1.5  MERGE locations (add type_code from dictionaries)
1.6  PORT security (EncryptionService, CSRF guard)
1.7  PORT audit-logs (centralized audit)
1.8  PORT settings (system settings)
1.9  Frontend: Login page with 2FA support
1.10 Frontend: Users CRUD with role assignment
```

**Quality gate:** Can login, create user, assign role, 2FA works, audit log records actions.

### Phase 2: Operations (23 tasks)
```
2.1  MERGE nomenclature/products (unified Nomenclature entity with type field)
2.2  PORT recipes (Recipe, RecipeIngredient, RecipeVersion)
2.3  PORT containers (hoppers/bunkers for machines)
2.4  PORT ingredient-batches (FIFO batch tracking)
2.5  MERGE machines (combine 60+ fields from both repos)
2.6  PORT machine-access (3 entities)
2.7  PORT equipment (6 entities: spare parts, components)
2.8  MERGE inventory (9 entities: 3-level system)
2.9  PORT warehouse (6 entities: zones, stock-take)
2.10 MERGE tasks (4 entities: task, item, comment, component)
2.11 PORT routes (route planning for operators)
2.12 PORT incidents (incident tracking)
2.13 MERGE complaints (customer complaints)
2.14 MERGE notifications (system notifications)
2.15 PORT alerts (alert rules and history)
2.16 MERGE websocket (real-time updates)
2.17 MERGE files/storage (file upload management)
2.18 PORT operator-ratings (performance tracking)
2.19 Frontend: Products list (drinks/snacks tabs)
2.20 Frontend: Machines list + Yandex Map integration
2.21 Frontend: Inventory dashboard (3 levels: warehouse -> operator -> machine)
2.22 Frontend: Tasks Kanban board
2.23 Frontend: Equipment management UI
```

**Quality gate:** All CRUD operations work, inventory movement creates stock records at correct levels, real-time updates flow through WebSocket.

### Phase 3: Finance (12 tasks)
```
3.1  MERGE transactions (financial transaction recording)
3.2  PORT reconciliation (3 entities: HW vs SW vs Payment provider)
3.3  PORT billing (invoices and payments)
3.4  MERGE counterparty/contractors (supplier management)
3.5  PORT analytics (4 entities: daily stats, dashboards)
3.6  MERGE reports (report generation)
3.7  PORT opening-balances (initial inventory setup)
3.8  PORT purchase-history (procurement tracking)
3.9  PORT sales-import (sales data import from machines)
3.10 Frontend: Transactions list with filters
3.11 Frontend: Reconciliation UI (match/mismatch visualization)
3.12 Frontend: Dashboard KPIs + Recharts
```

**Quality gate:** Reconciliation correctly matches HW export with SW transactions. Reports export to Excel. Dashboard shows real-time KPIs.

### Phase 4: Integrations (19 tasks)
```
4.1  MERGE payments (Payme JSON-RPC, Click, Uzum Bank)
4.2  MERGE intelligent-import (5 entities, AI field mapping)
4.3  MERGE telegram (bot integration, 4 entities)
4.4  PORT web-push (browser notifications)
4.5  PORT fcm (Firebase Cloud Messaging)
4.6  PORT sms (Twilio integration)
4.7  MERGE integration (API keys, webhooks, sync jobs)
4.8  PORT data-parser (CSV/Excel/JSON parsing)
4.9  PORT client (7 entities: B2C storefront, wallet, loyalty)
4.10 PORT promo-codes (promotional codes)
4.11 KEEP fiscal (OFD/Soliq.uz integration -- already in VendHub OS)
4.12 KEEP loyalty (loyalty points -- already in VendHub OS)
4.13 PORT hr (7 entities: employees, departments, payroll, leave)
4.14 PORT bull-board (queue management UI)
4.15 PORT monitoring (Prometheus metrics)
4.16 Frontend: Payment provider settings
4.17 Frontend: Intelligent Import wizard
4.18 Frontend: Notifications center
4.19 Frontend: HR module (employees, payroll)
```

**Quality gate:** Payme test payment succeeds. Import wizard maps Excel columns correctly. Telegram bot responds to commands. Prometheus /metrics endpoint works.

### Phase 5: Production Hardening
```
5.1  Security audit (rate limiting, CORS, CSP headers, SQL injection check)
5.2  Performance optimization (query analysis, N+1 detection, Redis caching)
5.3  Error handling standardization (global exception filter, error codes)
5.4  Logging standardization (structured JSON logs, correlation IDs)
5.5  Database optimization (missing indexes, query plans)
5.6  E2E tests for critical flows (login -> create order -> payment -> reconciliation)
5.7  Docker production build (multi-stage, health checks)
5.8  CI/CD pipeline (lint -> test -> build -> deploy)
5.9  Documentation (Swagger, README, deployment runbook)
5.10 Load testing (artillery.io or k6 for API endpoints)
```

**Quality gate:** All security checks pass. p95 latency <500ms under load. Zero unhandled exceptions in 24h soak test. Docker image <500MB.

## SKILLS USAGE

When executing tasks, use these skills in order:

| Task Type | Primary Skill | Secondary |
|-----------|---------------|-----------|
| Plan a module migration | `vhm24-orchestrator` | `vhm24-ux-spec` |
| Create/modify entities | `vhm24-db-expert`* | - |
| Create NestJS modules | `vhm24-api-generator`* | - |
| Create UI components | `vhm24-ui-generator` | `vhm24-component-lib` |
| Create forms | `vhm24-forms` | - |
| Create charts/dashboards | `vhm24-charts` | - |
| Auth/RBAC work | `vhm24-auth-rbac` | - |
| Write tests | `vhm24-testing` | - |
| Code review | `vhm24-qa-review` | - |
| Docker/CI/CD | `vhm24-devops` | - |
| Security hardening | `vhm24-security-hardening` | - |
| Generate docs | `vhm24-docs-generator` | - |
| Final QA | `production-quality-guardian` agent | - |

*NOTE: `vhm24-db-expert` and `vhm24-api-generator` currently reference Drizzle/MySQL/tRPC. Override their output to use TypeORM/PostgreSQL/NestJS REST until skills are updated.

## CRITICAL CHECKS BEFORE EACH COMMIT

```bash
# 1. TypeScript compiles
npx tsc --noEmit

# 2. Lint passes
npx eslint src/ --max-warnings 0

# 3. Tests pass
npx jest --passWithNoTests

# 4. No secrets in code
grep -r "PAYME_SECRET\|JWT_SECRET\|DATABASE_PASSWORD" src/ && echo "FAIL: secrets in code" || echo "OK"

# 5. All entities extend BaseEntity
grep -rL "extends BaseEntity" src/modules/*/entities/*.entity.ts && echo "FAIL: entities without BaseEntity" || echo "OK"
```

## FILE REFERENCES

| What | Path |
|------|------|
| Migration Plan v4 | `/VendHub OS/MIGRATION_PLAN_v4.md` |
| Appendix A SQL | `/Master Data/VHM24_Master_Data_Appendix_A_SQL_Migration.sql` |
| VHM24-repo BaseEntity | `/VHM24-repo/backend/src/common/entities/base.entity.ts` |
| VHM24-repo App Module | `/VHM24-repo/backend/src/app.module.ts` |
| VHM24-repo Entities | `/VHM24-repo/backend/src/modules/*/entities/*.entity.ts` |
| VendHub OS TypeORM Config | `/VendHub OS/vendhub-unified/apps/api/src/database/typeorm.config.ts` |
| VendHub OS Modules | `/VendHub OS/vendhub-unified/apps/api/src/modules/` |
| Skills | `/VendHub OS/skills/` |
| UI/UX Spec | `/VendHub OS/UI_UX_SPECIFICATION.md` |

## SUCCESS CRITERIA (100% Production-Ready)

- [ ] All 56 modules from VHM24-repo migrated or accounted for
- [ ] All entities extend BaseEntity (UUID, soft delete, audit)
- [ ] All endpoints have DTOs with class-validator
- [ ] All endpoints documented in Swagger
- [ ] RBAC enforced on all endpoints (7 roles + granular permissions)
- [ ] Multi-tenant: all queries filter by organization_id
- [ ] >60% unit test coverage on new code
- [ ] E2E tests cover: auth flow, CRUD operations, payment, reconciliation
- [ ] Payme/Click/Uzum integration tested in sandbox
- [ ] OFD fiscal integration working
- [ ] Telegram bot operational
- [ ] Real-time WebSocket updates working
- [ ] Docker production build with health checks
- [ ] CI/CD pipeline: lint -> test -> build -> deploy
- [ ] Prometheus metrics + health endpoint
- [ ] Structured logging with correlation IDs
- [ ] Rate limiting on all public endpoints
- [ ] <500ms p95 latency under 100 concurrent users
- [ ] Database backup/restore procedure tested
- [ ] Zero TypeScript errors, zero lint warnings
- [ ] README with setup instructions
- [ ] Deployment runbook

---

*Prompt version: 1.0*
*Created: 03 Feb 2026*
*For use with: Claude Code + VHM24 Skills*
