# VendHub OS

Unified vending machine management platform for Uzbekistan. Turborepo monorepo migrating business logic from VHM24-repo (56 NestJS modules) into production-ready architecture.

## Tech Stack (VERIFIED -- DO NOT DEVIATE)

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | NestJS | 11.1 |
| ORM | TypeORM | 0.3.20 |
| Database | PostgreSQL | 16 |
| Cache/Queue | Redis 7 + BullMQ 5 + ioredis | |
| Validation | class-validator + class-transformer | 0.14 |
| API Docs | @nestjs/swagger | 11 |
| Auth | Passport + JWT + TOTP (otplib) | |
| Real-time | Socket.IO + Redis adapter | 4.7 |
| Admin Panel | Next.js 16.1 + React 19 | App Router |
| Client PWA | Vite 5.4 + React 19 | |
| Mobile | React Native + Expo 52 | |
| Bot | Telegraf | 4.16 |
| State | Zustand 5 | |
| Forms | React Hook Form 7.61 + Zod | |
| UI | shadcn/ui + Radix UI + TailwindCSS 3.4 | |
| Tables | @tanstack/react-table 8 | |
| Charts | Recharts 2.15 | |
| Icons | Lucide React | |
| Monorepo | Turborepo 2.5 + pnpm 9.15 | |
| Testing | Jest 29 + Playwright 1.48 | |
| Infra | Docker + Kubernetes + Terraform | |
| Monitoring | Prometheus + Grafana + Loki | |

**CRITICAL:** NEVER use Drizzle, MySQL, tRPC, or Express standalone. Those are WRONG and come from outdated skill docs.

## Project Structure

```
vendhub-unified/
├── apps/
│   ├── api/              # NestJS backend (37+ modules)
│   ├── web/              # Next.js admin panel
│   ├── client/           # Vite React PWA (customer-facing)
│   ├── bot/              # Telegram bot (Telegraf)
│   └── mobile/           # React Native Expo app
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
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('table_name')
export class MyEntity extends BaseEntity {
  // BaseEntity provides: id (UUID), created_at, updated_at,
  // deleted_at, created_by_id, updated_by_id
  // DO NOT add these fields manually
}
```

### Rule 2: UUID everywhere

All primary keys are UUID (`string`), never `number`. All foreign keys are `string | null`.

```typescript
@Column({ type: 'uuid' })
organization_id: string;
```

### Rule 3: snake_case DB columns

```typescript
@Column({ type: 'varchar', length: 100 })
machine_number: string;  // NOT machineNumber
```

### Rule 4: class-validator on all inputs

Every controller endpoint accepting body/query MUST use DTOs with class-validator decorators.

```typescript
export class CreateProductDto {
  @IsString() @Length(1, 255) name: string;
  @IsEnum(ProductType) type: ProductType;
  @IsOptional() @IsNumber() cost_price?: number;
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

| Role | Level | Access |
|------|-------|--------|
| owner | System-wide | Full access, organization management |
| admin | Organization | Full org access, user management |
| manager | Organization | Operations, reports, tasks |
| operator | Field | Machines, inventory, tasks (assigned) |
| warehouse | Organization | Inventory, warehouse, stock |
| accountant | Organization | Finance, reports, reconciliation |
| viewer | Organization | Read-only access |

## API Module Pattern

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
- Swagger UI: `/api/docs`
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

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL 16 |
| redis | 6379 | Redis 7 |
| api | 4000 | NestJS backend |
| web | 3000 | Next.js admin |
| client | 5173 | Vite PWA |
| bot | - | Telegram bot |

## Skills (AI Agent Tools)

19 specialized skills in `.claude/commands/` directory for domain-specific code generation:

| Skill | Purpose |
|-------|---------|
| `vhm24-api-generator` | NestJS REST API endpoint generation |
| `vhm24-auth-rbac` | Authentication and RBAC |
| `vhm24-charts` | Recharts data visualization |
| `vhm24-component-lib` | UI component library (shadcn/ui) |
| `vhm24-db-expert` | TypeORM schema and migrations |
| `vhm24-devops` | Docker, K8s, CI/CD |
| `vhm24-docs-generator` | Documentation generation |
| `vhm24-forms` | React Hook Form + Zod |
| `vhm24-i18n` | Localization (uz, ru, en) |
| `vhm24-mobile` | React Native/Expo mobile |
| `vhm24-monitoring` | Prometheus, Grafana, logging |
| `vhm24-orchestrator` | Workflow coordination |
| `vhm24-payments` | Payme, Click, Uzum Bank |
| `vhm24-qa-review` | Code review and QA |
| `vhm24-realtime` | Socket.IO real-time |
| `vhm24-security-hardening` | Security best practices |
| `vhm24-testing` | Jest + Playwright testing |
| `vhm24-ui-generator` | React UI generation |
| `vhm24-ux-spec` | UX specifications |

## Migration Context

Migrating from VHM24-repo (56 modules, 120 entities, 89 migrations) into VendHub OS (37 modules).

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

## Pre-Commit Checks

```bash
npx tsc --noEmit                    # TypeScript compiles
npx eslint src/ --max-warnings 0    # Lint passes
npx jest --passWithNoTests          # Tests pass
```

## Key Files

| What | Path |
|------|------|
| Master Prompt | `MASTER_PROMPT.md` |
| Migration Plan | `MIGRATION_PLAN_v4.md` |
| UI/UX Spec | `UI_UX_SPECIFICATION.md` |
| TypeORM Config | `vendhub-unified/apps/api/src/database/typeorm.config.ts` |
| API Modules | `vendhub-unified/apps/api/src/modules/` |
| Base Entity | `vendhub-unified/apps/api/src/common/entities/base.entity.ts` |
| App Module | `vendhub-unified/apps/api/src/app.module.ts` |
| Skills | `.claude/commands/` |
| Docker Compose | `vendhub-unified/docker-compose.yml` |
| Turbo Config | `vendhub-unified/turbo.json` |
| CI Pipeline | `vendhub-unified/.github/workflows/ci.yml` |
