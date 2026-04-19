# Contributing to VendHub OS

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL + Redis in dev)

## Setup

```bash
git clone https://github.com/jamsmac/VendHub-OS.git
cd VendHub-OS
pnpm install
docker compose up -d postgres redis
pnpm db:migrate
pnpm dev
```

## Development Workflow

```bash
# Start all apps
pnpm dev

# Start specific app
pnpm --filter api dev
pnpm --filter web dev
pnpm --filter client dev

# Before committing
pnpm turbo type-check      # TypeScript (builds shared first)
pnpm turbo test             # All test suites
pnpm lint                   # ESLint
```

## Code Conventions

All conventions are documented in `CLAUDE.md`. Key rules:

1. Every entity extends `BaseEntity` (UUID, soft delete, audit fields)
2. Every DTO has `class-validator` decorators
3. Every endpoint has `@ApiOperation` + Swagger decorators
4. Every route has `@Roles()` or `@Public()` — RBAC canary test enforces this
5. Every query scopes by `organizationId` — tenant isolation test enforces this
6. Soft delete only (`@DeleteDateColumn`)
7. Multi-tenant filtering on all user-facing queries

## API Changes

When adding, removing, or modifying HTTP endpoints in `apps/api`:

1. Make your changes to controllers/DTOs
2. Regenerate the OpenAPI spec (requires Docker Postgres running):
   ```bash
   docker compose up -d postgres
   pnpm --filter @vendhub/api openapi:generate
   ```
3. Commit `apps/api/openapi.json` alongside your code changes

CI will fail on PRs if the spec drifts from the checked-in version.

## Commit Convention

Uses [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore, security, perf, ci
Scope: api, web, client, site, mobile, shared, infra, deps
```

## Pull Request Process

1. Create a branch from `main`
2. Make changes following code conventions
3. Run `pnpm turbo type-check && pnpm turbo test && pnpm lint`
4. Open PR — template will guide you through the checklist
5. CI must pass (type-check, lint, tests with coverage)

## Architecture

See `ARCHITECTURE.md` for system overview, module structure, data flows, and integration details.
