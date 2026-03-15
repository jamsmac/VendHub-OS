# Architecture Improvements — 2026-03-15

## Scope

Three areas: API architecture, frontend architecture, shared packages.

## Completed

### Phase 1: Shared Package Revival

**1. Fixed `typesVersions` in shared package.json**

- Added `typesVersions` field to enable subpath imports (`@vendhub/shared/types`, etc.) with `moduleResolution: "Node"`
- Root cause: API uses `moduleResolution: "Node"` which doesn't support `exports` map — this was why devs copied enums locally

**2. Eliminated enum duplication (14 enums consolidated)**

- `apps/api/src/common/enums/index.ts`: Replaced 5 duplicate enums (UserRole, PaymentMethod, CommissionType, ContractType, ContractStatus) with re-exports from `@vendhub/shared`
- `apps/api/src/modules/tasks/entities/task.entity.ts`: Replaced 4 duplicate enums + VALID_TASK_TRANSITIONS with import+re-export from `@vendhub/shared`
- `apps/api/src/modules/products/entities/product.entity.ts`: Replaced 5 duplicate enums with import+re-export from `@vendhub/shared`
- `apps/api/src/modules/tasks/dto/create-task.dto.ts`: Fixed **divergent** enums (different values from entity/DB!) — was a latent bug

**Bug found:** DTO `TaskType` had `REPLENISHMENT`, `MAINTENANCE`, `INSTALLATION` while entity/DB had `REFILL`, `REPAIR`, `INSTALL`. API would accept values that don't exist in the database.

### Phase 2: API Architecture Cleanup

**3. Renamed `AnalyticsService` → `DashboardStatsService`**

- Resolved naming confusion with `reports/services/analytics.service.ts`
- Files updated: service, controller, module, 2 spec files
- Only 1 external consumer (app.module.ts), change is self-contained

**4. Telegram-bot split — skipped (already well-organized)**

- 15 services are logically grouped: `bot-*` (staff) and `customer-*` (customer)
- Module header documents the two-bot architecture
- Splitting would add complexity without benefit

### Phase 3: Frontend Unification — deferred

**5. Locale-aware format utils — kept app-specific**

- Web and client format functions use different locale detection (next-intl vs react-i18next)
- Shared format utils are hardcoded to `ru-RU` — can't replace without losing locale-awareness
- Not pure duplicates — they add real value

**6. API client extraction — skipped (over-engineering)**

- Two clients are "similar but purposefully different" (proxy vs direct, redirect vs store logout, SSR guard)
- Factory would require parameterizing 4 differences — more complex, not simpler
- Interceptor pattern is stable and not causing bugs

## Files Changed

| File                                                          | Change                                         |
| ------------------------------------------------------------- | ---------------------------------------------- |
| `packages/shared/package.json`                                | Added `typesVersions`                          |
| `apps/api/src/common/enums/index.ts`                          | 65 lines → 13 lines (re-export from shared)    |
| `apps/api/src/modules/tasks/entities/task.entity.ts`          | Local enums → import+re-export from shared     |
| `apps/api/src/modules/products/entities/product.entity.ts`    | Local enums → import+re-export from shared     |
| `apps/api/src/modules/tasks/dto/create-task.dto.ts`           | Divergent enums → import from shared (bug fix) |
| `apps/api/src/modules/analytics/analytics.service.ts`         | `AnalyticsService` → `DashboardStatsService`   |
| `apps/api/src/modules/analytics/analytics.controller.ts`      | Updated class reference                        |
| `apps/api/src/modules/analytics/analytics.module.ts`          | Updated class reference                        |
| `apps/api/src/modules/analytics/analytics.service.spec.ts`    | Updated class reference                        |
| `apps/api/src/modules/analytics/analytics.controller.spec.ts` | Updated class reference                        |

## Verification

All 3 apps compile clean (API, web, client) — zero TypeScript errors.
