# VendHub OS — Hookify Rules

## Rule: no-drizzle-mysql-trpc

**Event**: PreToolUse (Write, Edit)
**When**: File content contains "drizzle", "Drizzle", "mysql", "MySQL", "tRPC", "trpc" in import statements or configuration
**Action**: BLOCK with message "VendHub OS uses TypeORM + PostgreSQL. Drizzle, MySQL, and tRPC are NOT part of the stack. Check CLAUDE.md."

## Rule: entity-must-extend-base

**Event**: PostToolUse (Write, Edit)
**When**: File path matches `**/entities/*.entity.ts` AND content contains `@Entity` but does NOT contain `extends BaseEntity`
**Action**: WARN with message "All VendHub entities MUST extend BaseEntity. Add: import { BaseEntity } from '../../../common/entities/base.entity'"

## Rule: no-hard-delete

**Event**: PreToolUse (Write, Edit)
**When**: File content contains `.delete(` or `.remove(` in service files but NOT `.softDelete(` or `.softRemove(`
**Action**: WARN with message "VendHub uses soft delete only. Use .softDelete() or .softRemove() instead of .delete() or .remove()"

## Rule: camelcase-entity-props

**Event**: PostToolUse (Write, Edit)
**When**: File path matches `**/entities/*.entity.ts` AND content contains property definitions with snake_case (e.g., `created_at:`, `full_name:`, `_id:` as property names NOT in @Column name attribute)
**Action**: WARN with message "Entity properties must be camelCase. SnakeNamingStrategy auto-converts to snake_case DB columns."

## Rule: multi-tenant-filter

**Event**: PostToolUse (Write, Edit)
**When**: File path matches `**/*.service.ts` AND content contains `.find(` or `.findOne(` or `.createQueryBuilder(` but does NOT contain `organizationId`
**Action**: WARN with message "Multi-tenant: every query must filter by organizationId."

## Rule: no-technician-role

**Event**: PreToolUse (Write, Edit)
**When**: File content contains "technician" as a role value (e.g., `'technician'`, `"technician"`, `TECHNICIAN`, `UserRole.TECHNICIAN`)
**Action**: BLOCK with message "The 'technician' role was removed. Use one of: owner, admin, manager, operator, warehouse, accountant, viewer."

## Rule: no-sync-production

**Event**: PreToolUse (Write, Edit)
**When**: File content contains `synchronize: true` in TypeORM configuration
**Action**: BLOCK with message "NEVER use synchronize: true. Use TypeORM migrations instead."

## Rule: no-env-commit

**Event**: PreToolUse (Bash)
**When**: Command contains `git add` AND (`.env` not followed by `.example`)
**Action**: WARN with message "Avoid committing .env files. Use .env.example instead."

## Rule: real-decorators-only

**Event**: PostToolUse (Write, Edit)
**When**: File path matches `**/*.controller.ts` AND content contains `function Roles(` or `function CurrentUser(` or `const Roles =` (local placeholder decorators)
**Action**: BLOCK with message "Use REAL decorators from common/decorators/, NOT local placeholders. Import @Roles() from common/decorators/roles.decorator"

## Rule: api-port-4000

**Event**: PreToolUse (Write, Edit)
**When**: File content references API on port 3001 (e.g., `localhost:3001/api`, `PORT=3001`, `containerPort: 3001` in API context)
**Action**: WARN with message "VendHub API runs on port 4000, not 3001. Check CLAUDE.md Docker Services table."
