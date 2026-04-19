# VendHub OS — Architecture

## System Overview

VendHub OS is a multi-tenant vending machine management platform for the Uzbekistan market. It runs as a Turborepo monorepo with 5 applications sharing types via `@vendhub/shared`.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Web      │  │ Client   │  │ Mobile   │  │ Telegram    │  │
│  │ (Next.js)│  │ (Vite)   │  │ (Expo)   │  │ (2 bots)    │  │
│  │ Admin    │  │ PWA      │  │ App      │  │ Staff+Cust  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │
│       │              │             │               │         │
│       └──────────────┴─────────────┴───────────────┘         │
│                          │ REST / WebSocket                  │
│                    ┌─────┴──────┐                            │
│                    │ API        │                            │
│                    │ (NestJS)   │                            │
│                    │ 82 modules │                            │
│                    └──┬────┬───┘                            │
│                       │    │                                 │
│              ┌────────┘    └────────┐                       │
│         ┌────┴────┐          ┌─────┴─────┐                 │
│         │ Postgres│          │   Redis   │                 │
│         │   16    │          │    7      │                 │
│         └─────────┘          └───────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## Applications

| App               | Framework              | Port | Purpose                                       |
| ----------------- | ---------------------- | ---- | --------------------------------------------- |
| `apps/api`        | NestJS 11              | 4000 | REST API, WebSocket, Telegram bots, cron jobs |
| `apps/web`        | Next.js 16             | 3000 | Admin dashboard (RBAC-protected)              |
| `apps/client`     | Vite + React 19        | 5173 | Customer-facing PWA (Mini App)                |
| `apps/site`       | Next.js 16             | 3100 | Public landing page (vendhub.uz)              |
| `apps/mobile`     | React Native + Expo 52 | —    | Mobile app (iOS/Android)                      |
| `packages/shared` | tsup                   | —    | Shared types, enums, utilities                |

## API Module Architecture

The API is organized into 82 NestJS modules under `apps/api/src/modules/`. Each module follows the pattern:

```
modules/<name>/
├── <name>.module.ts          # NestJS module definition
├── <name>.controller.ts      # REST endpoints
├── <name>.service.ts         # Business logic (or facade)
├── <name>-core.service.ts    # Core logic (if facade pattern used)
├── entities/                 # TypeORM entities
├── dto/                      # Request/response DTOs with class-validator
└── *.spec.ts                 # Jest unit tests
```

### Critical Modules

| Module         | Why Critical                                 | Security Controls                                                                     |
| -------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `payments`     | Financial transactions (Payme, Click, Uzum)  | HMAC/MD5 signature verification, `timingSafeEqual`, pessimistic DB locks, idempotency |
| `auth`         | JWT authentication, 2FA, password management | bcrypt hashing, ephemeral dev TOTP keys, ALLOW_DEV_FALLBACK gate                      |
| `complaints`   | Customer feedback with signed tokens         | JWT-scoped feedback tokens (14d TTL), tenant-bound claims                             |
| `referrals`    | Bonus credit distribution                    | `pessimistic_write` lock on activation, idempotent re-entry                           |
| `telegram-bot` | Two-bot architecture (staff + customer)      | Webhook secret validation via `timingSafeEqual`                                       |

## Multi-Tenancy

Tenant isolation is enforced at the **service layer** via `organizationId`:

1. **Guard**: `OrganizationGuard` (global) injects `user.organizationId` into request context
2. **Decorator**: `@CurrentOrganizationId()` extracts tenant ID for controllers
3. **Service**: Every query includes `WHERE organizationId = :orgId`
4. **Test**: `tenant-isolation.spec.ts` verifies cross-tenant access prevention

**RBAC**: 7 roles (owner → viewer), 1000+ `@Roles()` decorator usages. Global `JwtAuthGuard` + `RolesGuard` applied via `APP_GUARD`.

## Data Flow — Payment Webhook

```
Payme/Click/Uzum → POST /payments/webhook/{provider}
  → @Public() (no JWT)
  → Signature verification (HMAC-SHA256 / MD5)
  → Find transaction by providerTxId
  → pessimistic_write lock
  → Idempotency check (already completed? → return existing)
  → Update status → COMPLETED
  → Emit event → analytics listener
  → Return success to provider
```

## External Integrations

| Service          | Protocol                  | Config                                              |
| ---------------- | ------------------------- | --------------------------------------------------- |
| Payme            | JSON-RPC, Basic Auth      | `PAYME_MERCHANT_ID`, `PAYME_KEY`                    |
| Click            | REST, MD5 signature       | `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY`              |
| Uzum Bank        | REST, HMAC-SHA256         | `UZUM_MERCHANT_ID`, `UZUM_SECRET_KEY`               |
| Telegram         | Bot API (polling/webhook) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CUSTOMER_BOT_TOKEN` |
| Supabase Storage | S3-compatible API         | `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`         |
| Sentry           | HTTPS                     | `SENTRY_DSN`                                        |

## Infrastructure

- **Runtime**: Railway (API, Web, Client, Site)
- **Database**: PostgreSQL 16 (Railway managed)
- **Cache/Queue**: Redis 7 + BullMQ 5
- **Storage**: Supabase Storage (S3 API), MinIO for local dev
- **CI**: GitHub Actions (type-check, lint, test with coverage, build, e2e, k6 load test)
- **Monitoring**: Prometheus metrics (`/metrics`), Sentry errors, health checks (`/health/*`)
- **Containerization**: Docker + Kubernetes manifests (for future on-prem deployment)

## Key Conventions

See `CLAUDE.md` for the full list. Highlights:

- All entities extend `BaseEntity` (UUID PK, soft delete, audit fields)
- All DTOs use `class-validator` decorators
- All endpoints have `@ApiOperation` + `@ApiProperty` (7986 Swagger decorators)
- Cron jobs use `Asia/Tashkent` timezone
- Event names: plural entity prefix (`alerts.triggered`, `complaint.created`)
