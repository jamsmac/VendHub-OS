# VendHub OS — Project Architecture

## Overview

- Turborepo monorepo with 6 apps: api, web, client, bot, mobile, site
- PostgreSQL 16 + TypeORM 0.3.20 + SnakeNamingStrategy
- NestJS 11, Next.js 16, React 19, Expo 52

## App Ports

| App    | Port | Tech                    |
| ------ | ---- | ----------------------- |
| api    | 4000 | NestJS 11               |
| web    | 3000 | Next.js 16 (App Router) |
| client | 5173 | Vite 5.4 + React 19     |
| site   | 3100 | Next.js                 |
| bot    | -    | Telegraf 4.16           |
| mobile | -    | Expo 52                 |

## Key Directories

- `vendhub-unified/apps/api/src/modules/` — 37+ NestJS modules
- `vendhub-unified/apps/api/src/common/` — shared decorators, guards, entities, enums
- `vendhub-unified/apps/api/src/database/` — TypeORM config, migrations
- `vendhub-unified/infrastructure/` — K8s, monitoring, nginx, postgres, redis

## Entity Conventions

- All entities extend BaseEntity (UUID PK, soft delete, audit fields)
- **camelCase** TypeScript properties → SnakeNamingStrategy auto-converts to snake_case DB columns
- @JoinColumn({ name: "db_column_name" }) uses actual DB column names (snake_case)
- QueryBuilder uses property names (camelCase), not column names

## RBAC (7 roles)

owner, admin, manager, operator, warehouse, accountant, viewer

- NO "technician" role (removed during audit)
- RolesGuard returns true when no @Roles() → endpoints without @Roles() allow ANY authenticated user

## Real Decorators (NOT placeholders)

- `@Roles()` from `common/decorators/roles.decorator`
- `@CurrentUser()`, `@CurrentUserId()`, `@CurrentOrganizationId()` from `common/decorators/current-user.decorator`
- UserRole enum from `common/enums/index.ts`

## Migration Context

- Source: VHM24-repo (56 modules, NestJS 10, PostgreSQL 14)
- Target: VendHub OS (37+ modules, NestJS 11, PostgreSQL 16)
- Strategies: MERGE (25), PORT (24), KEEP (4)
