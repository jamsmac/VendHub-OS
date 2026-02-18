# VendHub OS — Full Audit Report

**Date:** 2025-02-17

---

## 1. Executive Summary

- **Production readiness (estimate):** 55/100 — Core apps (Web, Client, Site, Bot) build and run; API build and 11 test suites fail due to TypeScript errors in spec files; Mobile has 8 TS errors.
- **Critical blockers (P0):** 2 (API spec TS errors; Mobile TS errors).
- **Serious issues (P1):** 3 (createQueryBuilder parameterization; soft delete verification; 3 entities without BaseEntity).
- **Improvements (P2):** ESLint any warnings, i18n, role-based sidebar, PWA lazy loading, monitoring probes.

### Verdict: **NEEDS WORK**

Unblock API build and tests and fix Mobile TS to reach a releasable state; then address P1 and P2.

---

## 2. Scorecard by Application

| App    | Build   | Types     | Tests            | Security | UX / API coverage    | Score |
| ------ | ------- | --------- | ---------------- | -------- | -------------------- | ----- |
| API    | FAIL    | 28 (spec) | 52 pass, 11 fail | OK       | —                    | 4/10  |
| Web    | OK      | 0         | N/A              | —        | Good (49 pages)      | 8/10  |
| Client | OK      | 0         | N/A              | —        | Good (22 pages, PWA) | 8/10  |
| Site   | OK      | 0         | N/A              | —        | Landing              | 8/10  |
| Bot    | OK      | 0         | N/A              | —        | Commands complete    | 8/10  |
| Mobile | not run | 8 errors  | N/A              | —        | Screens present      | 3/10  |
| Infra  | —       | —         | —                | OK       | —                    | 7/10  |

---

## 3. Critical Issues (P0) — Fix Immediately

### P0-1: API build and test suites fail (28 TS errors in spec files)

- **Where:** `apps/api/src/modules/*/**.service.spec.ts` (e.g. tasks, transactions, alerts).
- **What:** Variable name mismatch: declared as `_dailySummaryRepo` / `_commissionRepo` but assigned to `dailySummaryRepo` / `commissionRepo`; or missing declarations (e.g. `taskItemRepository`, `taskComponentRepository`, `taskPhotoRepository`).
- **Why critical:** CI type-check and build fail; 11 test suites do not run; blocks deployment.
- **Fix:** In each failing spec, use the same name for declaration and assignment (or add missing `let` declarations). Run `pnpm --filter api build` and `pnpm --filter api test` to confirm.
- **Estimate:** 2–4 hours.

### P0-2: Mobile TypeScript errors (8)

- **Where:** CartScreen, ClientHomeScreen, MapScreen, DrinkDetailScreen, LoyaltyScreen, BarcodeScanScreen.
- **What:** useRef order, `_useEffect` typo, type mismatch, LinearGradient from wrong package, missing expo-barcode-scanner.
- **Why critical:** Mobile app does not build.
- **Fix:** Fix React imports (`_useEffect` → `useEffect`), add expo-barcode-scanner and expo-linear-gradient, fix CartScreen useRef and types in DrinkDetailScreen/LoyaltyScreen.
- **Estimate:** 2–3 hours.

---

## 4. Serious Issues (P1) — Fix Before Release

### P1-1: createQueryBuilder parameterization

- **Where:** reports (reports.service, vendhub-report-generator), import.service, telegram-customer-bot (complaint query).
- **What:** Ensure all query parameters are bound (no string concatenation into SQL).
- **Fix:** Review each createQueryBuilder usage; use `.where(:param, { param: value })` or equivalent.
- **Estimate:** 1–2 hours.

### P1-2: Soft delete consistency

- **Where:** Multiple services expose `.remove(id)` or `.delete()` from controllers.
- **What:** Verify that these implement soft delete (e.g. repository.softDelete(id)) and not TypeORM .remove(entity) hard delete.
- **Fix:** Audit each such service; replace hard delete with softDelete/restore where required by project rules.
- **Estimate:** 2–4 hours.

### P1-3: Entities not extending BaseEntity

- **Where:** directories — directory-source, directory-entry-audit, directory-sync-log.
- **What:** Project rule: every entity MUST extend BaseEntity. These three do not (by design comment).
- **Fix:** Either add BaseEntity (and migration for new columns) or document and approve exception in CLAUDE.md.
- **Estimate:** 1 hour (decision + doc or implementation).

---

## 5. Improvements (P2)

- Replace `any` in packages/shared and reduce ESLint warnings (533).
- Add i18n to Web Admin (sidebar and pages); ensure Client/Mobile use i18n.
- Role-based sidebar in Web (hide/disable items by role).
- Client PWA: lazy loading for routes; review chunk size.
- Mobile: ensure LinearGradient and barcode scanner dependencies are correct for target Expo SDK.
- K8s: add readiness/liveness probes; document .env.example.

---

## 6. Gap Analysis

### API vs Web

- API modules (60) have corresponding dashboard areas; 49 pages cover main flows and sub-routes (loyalty, employees, routes, trips, directories, users). **Status:** OK.

### API vs Client

- Client pages (22) cover auth, map, machine, menu, complaint, transactions, profile, loyalty, favorites, cart, checkout, quests, referrals, achievements, promo, order-success, drink, help, notifications. **Status:** OK.

### API vs Mobile

- Mobile screens cover staff (tasks, route, barcode, maintenance, machines), client (home, map, menu, drink, cart, checkout, order-success, favorites, loyalty, quests), auth, inventory. **Status:** OK; build blocked by TS.

---

## 7. Backend Compliance (60 modules)

- **Structure:** 60/60 have module, controller, service; DTOs and entities present.
- **BaseEntity:** 94/97 entities extend BaseEntity; 3 directories exceptions.
- **Swagger:** @ApiTags on all controllers.
- **Guards:** JwtAuthGuard / @Public() used appropriately.
- **Multi-tenant:** organization_id/organizationId used in services.
- **Tests:** 63 spec files; 11 suites failing due to TS (same as P0-1).
- **TypeORM:** synchronize false in production.

---

## 8. Security Findings

- **High:** None identified from code search (no raw SQL, secrets in repo).
- **Medium:** createQueryBuilder usage — ensure parameterization (P1-1).
- **Low:** @Public() endpoints (auth, health, client, geo, payments, complaints, etc.) — ensure rate limiting and validation.

---

## 9. Performance

- **Backend:** createQueryBuilder and report queries — ensure indexes and pagination where needed.
- **Client:** Bundle >500 kB; consider code-splitting and lazy loading.
- **Database:** Connection pooling and slow-query logging configured in TypeORM.

---

## 10. Prioritized Action Plan

### Week 1 (P0)

1. Fix API spec variable names and missing declarations; confirm build and tests pass. (2–4 h)
2. Fix 8 Mobile TS errors and verify build. (2–3 h)

### Weeks 2–3 (P1)

1. Review createQueryBuilder parameterization. (1–2 h)
2. Audit soft delete in services that expose remove/delete. (2–4 h)
3. Decide and implement or document BaseEntity for directories entities. (1 h)

### Week 4+ (P2)

1. Reduce `any` and ESLint warnings in shared and API.
2. Add i18n to Web Admin.
3. Role-based sidebar; PWA lazy loading; K8s probes; .env.example review.

**Rough total:** 10–18 human-days for P0+P1; P2 ongoing.

---

## 11. Architecture Recommendations

### Keep

- Monorepo (Turborepo, pnpm); NestJS + TypeORM + PostgreSQL; Next.js/Web, Vite/Client, Expo/Mobile, Telegraf/Bot.
- BaseEntity, UUID, snake_case, Swagger, guards, multi-tenant filtering.
- Docker Compose and K8s/Helm layout; monitoring stack (Prometheus, Grafana, Loki).

### Change

- Resolve spec file TS errors so API build is green.
- Align Mobile dependencies and types with Expo SDK.
- Formalize soft delete vs hard delete and apply consistently.

### Add

- i18n across Web (and verify Client/Mobile).
- Role-based visibility in Web sidebar.
- Optional: E2E smoke tests for critical flows after P0 fixed.

---

## Phase Reports

- [Phase 1: Build Health](PHASE1_Build_Health.md)
- [Phase 2: Backend Audit](PHASE2_Backend_Audit.md)
- [Phase 3: Web Admin](PHASE3_Web_Admin_Audit.md)
- [Phase 4: Client PWA](PHASE4_Client_PWA_Audit.md)
- [Phase 5: Mobile](PHASE5_Mobile_Audit.md)
- [Phase 6: Bot](PHASE6_Bot_Audit.md)
- [Phase 7: Infrastructure](PHASE7_Infrastructure_Audit.md)
- [Phase 8: Shared](PHASE8_Shared_Audit.md)
- [Phase 9: Cross-Cutting](PHASE9_Crosscutting_Audit.md)
