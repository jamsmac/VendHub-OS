# Phase 2: Backend Audit — Report

**Date:** 2025-02-17

## Summary

- **60 modules** — all registered in `app.module.ts`; all have matching folders in `modules/`.
- **59+ controllers** with `@ApiTags` (Swagger).
- **162 DTO files** across modules; create/update DTOs present for core modules.
- **97 entity files** with `@Entity`; **94** extend `BaseEntity`. **3 entities do not:** `directory-source`, `directory-entry-audit`, `directory-sync-log` (directories) — by design per comment "no BaseEntity".
- **63 service spec files** — most modules have tests; 11 suites currently fail to run due to TS errors in spec variable names (see Phase 1).
- **TypeORM config:** `synchronize` is `false` in production (only when `NODE_ENV !== 'production'` and `DB_SYNCHRONIZE === 'true'`). Snake naming strategy and entity/migration paths are set.

## Compliance Overview

| Criterion    | Status  | Notes                                                                                                                                                                    |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Structure    | OK      | All 60 have module, controller, service; 162 DTOs; entities per module.                                                                                                  |
| BaseEntity   | Partial | 94/97 entities extend BaseEntity; 3 directories entities intentionally do not.                                                                                           |
| UUID         | OK      | BaseEntity provides UUID PK; FK usage is string/uuid across entities.                                                                                                    |
| Swagger      | OK      | @ApiTags on all controllers; DTOs use @ApiProperty.                                                                                                                      |
| Guards       | OK      | JwtAuthGuard/UseGuards used across controllers; @Public() on auth, health, client, etc.                                                                                  |
| Multi-tenant | OK      | organization_id/organizationId used in services (60+ references).                                                                                                        |
| Soft delete  | Partial | Many services use .remove()/.delete(); some use softDelete/restore. Audit: ensure .remove() in services implements soft delete (TypeORM .remove(entity) is hard delete). |
| Tests        | Partial | 63 spec files; 11 suites fail due to TS (variable naming in spec files).                                                                                                 |

## Critical (P0)

1. **API build fails** — 28 TS errors in spec files (variable name mismatch: e.g. `_dailySummaryRepo` vs `dailySummaryRepo`, missing `taskItemRepository` declarations). Blocks CI and deployment.
2. **Entities not extending BaseEntity** — 3 directories entities. If project rule is "every entity MUST extend BaseEntity", add BaseEntity or document exception.

## Serious (P1)

1. **createQueryBuilder in production** — Used in reports, import, telegram-customer-bot. Ensure all query parameters are parameterized (no string concatenation) to avoid SQL injection.
2. **.remove() / .delete() in services** — Multiple controllers call `service.remove(id)`. Verify each service implements soft delete (e.g. repository.softDelete(id)) rather than hard delete.

## Improvements (P2)

1. **ESLint** — 533 `no-explicit-any` warnings; address in shared and API for strict typing.
2. **Missing service.spec** — Identify any module without at least one service test and add.
3. **@ApiOperation** — Verify every endpoint has @ApiOperation for full Swagger coverage.

## Modules without BaseEntity on some entities

- **directories:** `directory-source.entity.ts`, `directory-entry-audit.entity.ts`, `directory-sync-log.entity.ts`

## Security

- No `raw()` SQL found in production code (only in tests as mocks).
- `createQueryBuilder` used in reports, import, telegram-bot — review for parameterization.
- @Public() used on auth, health, client, geo, payments, complaints, transactions, monitoring, telegram-bot, promo-codes, settings — intentional for public/partner endpoints.

## Next

- Fix spec file variable names (P0) so API build and tests pass.
- Optionally align directories entities with BaseEntity or formalize exception.
- Proceed to Phase 3 (Web Admin).
