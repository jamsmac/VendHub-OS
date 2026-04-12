# VendHub OS — Full Project Analysis Report

**Date:** 2026-04-12
**Methodology:** 8-phase parallel audit using 8 specialized agents
**Scope:** 85 API modules, 124 entities, 30 migrations, 5 apps, 235 test files

## Verdict: REQUIRES WORK (before production)

**Overall Score: 78/100**

---

## Phase Results Summary

| Phase | Area                 | Score | Key Findings                                                    |
| ----- | -------------------- | ----- | --------------------------------------------------------------- |
| 0     | Compilation          | 9/10  | 0 TS errors across all 6 workspaces, 3 ESLint errors (web)      |
| 1     | Dependencies (CVE)   | 5/10  | 46 CVE: 3 CRITICAL, 19 HIGH, 21 MODERATE, 3 LOW                 |
| 1b    | Code Security        | 6/10  | 2 CRITICAL IDOR in transactions, 2 HIGH (vehicles/machines)     |
| 2     | DB & Migrations      | 8/10  | 2 HIGH (security module entities), 5 orphan tables              |
| 3-4   | Code Quality + Tests | 8/10  | N+1 in 8 services, but 4460+ test cases at 98.8% coverage       |
| 5     | VHM24 Migration      | 10/10 | 56/56 = 100% complete + 31 new modules                          |
| 6     | Infrastructure       | 6/10  | Dead bot references will break CI/deploy, 34 total issues       |
| 7     | Frontend             | 7/10  | 221 hardcoded RU strings, accessibility issues, 166 pages total |

---

## P0 — BLOCKERS (fix before deploy)

### 1. CRITICAL: Transactions IDOR — financial operations without tenant isolation

7 endpoints allow any authenticated user to perform financial operations on OTHER organizations' data:

- `POST :id/payment` — process payment on someone else's transaction
- `POST :id/dispense` — record dispense
- `POST :id/cancel` — cancel another org's transaction
- `POST :id/refund` — create refund
- `POST refunds/:refundId/process` — execute refund
- `POST :id/fiscalize` — fiscalize another org's receipt
- `PATCH collections/:collectionId/verify` — verify another org's collection

**Files:** `transactions.controller.ts`, `transaction-create.service.ts`, `transaction-reconcile.service.ts`
**Fix:** Add `@CurrentOrganizationId()` to controller, pass `organizationId` to all service methods.

### 2. CRITICAL: axios 1.13.6 — SSRF + Header Injection (2 CVE)

Installed in api, client, mobile. Allows SSRF via NO_PROXY bypass and cloud metadata exfiltration via header injection chain.

**Fix:** Add to root `package.json` pnpm overrides: `"axios": ">=1.15.0"`

### 3. CRITICAL: Dead bot references will break CI and deploy

`apps/bot/` was deleted (merged into API), but 15+ infrastructure files still reference it:

- `ci.yml`: lines 92, 166, 647-660, 712 (test, build, Trivy scan, Railway deploy)
- `nginx.prod.conf`: lines 95-98 (bot_backend upstream), 350-376 (bot server block)
- `k8s/base/bot-deployment.yml`: entire file
- `k8s/base/kustomization.yml`: includes bot-deployment
- `k8s/base/ingress.yml`: lines 88-98 (bot.vendhub.uz routing)
- `k8s/base/network-policies.yml`: lines 247-299 (bot network policy)
- `prometheus.yml`: lines 88-93 (bot scrape job)
- `helm/values.yaml`: lines 143-162 (bot section)

### 4. CRITICAL: Production docker-compose doesn't validate env vars

`docker-compose.prod.yml` — DB_PASSWORD, REDIS_PASSWORD, JWT_SECRET without `:?` required-variable syntax. If .env is missing these values, services start with empty strings instead of failing.

**Fix:** Add `${DB_PASSWORD:?DB_PASSWORD is required}` as in dev compose.

---

## P1 — HIGH (fix before release)

### Security

| #   | Issue                                                               | Files                                          |
| --- | ------------------------------------------------------------------- | ---------------------------------------------- |
| 5   | `next` 16.1.7 → DoS via Server Components                           | apps/web, apps/site — upgrade to >=16.2.3      |
| 6   | `@nestjs/core` 11.1.12 → injection vulnerability                    | apps/api — upgrade to >=11.1.18                |
| 7   | `path-to-regexp` 0.1.12 → ReDoS                                     | pnpm override >=0.1.13                         |
| 8   | vehicles/machines — post-fetch org check instead of DB-level filter | vehicles.controller.ts, machines.controller.ts |
| 9   | Metrics endpoint open when METRICS_TOKEN not set (fail-open)        | metrics.controller.ts                          |

### Database

| #   | Issue                                                                                                                                            | Files                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 10  | security.module.ts registers `AuditLog` and `TwoFactorAuth` without @Entity → runtime crash                                                      | security.module.ts, security-event.entity.ts     |
| 11  | 5 entities without forFeature registration (OrganizationContract, OrganizationInvitation, OrganizationAuditLog, WarehouseBin, BinContentHistory) | organization.entity.ts, warehouse-zone.entity.ts |
| 12  | 5 orphaned trip\_\* tables — need DROP migration                                                                                                 | New migration needed                             |

### Infrastructure

| #   | Issue                                                                                  |
| --- | -------------------------------------------------------------------------------------- |
| 13  | Prod client service uses `Dockerfile.dev` instead of `Dockerfile`                      |
| 14  | `release.yml` rollback uses `psql` instead of `pg_restore` for custom-format dumps     |
| 15  | API Dockerfile `--max-old-space-size=384` too low for 82 modules (Docker limit is 2GB) |
| 16  | Prod health check path `/api/v1/health/live` ≠ dev `/api/v1/health` — inconsistent     |

### Code Quality

| #   | Issue                                                                                       |
| --- | ------------------------------------------------------------------------------------------- |
| 17  | N+1 query in `material-requests.service.ts` (loop findOne+save per item)                    |
| 18  | `orders.service.ts` (619 lines, 0 try/catch), `billing.service.ts` (555 lines, 0 try/catch) |
| 19  | 70 `as unknown as` double-casts (TypeORM typing workarounds)                                |

---

## P2 — MEDIUM (after release)

### Frontend

| #   | Issue                                                                              | Scale                                                                                                                          |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 20  | 221 hardcoded Russian strings in 25 web app files                                  | Breaks i18n for uz/en users                                                                                                    |
| 21  | 7 web app pages without i18n at all                                                | payment-reports, payout-requests, machines/[id], machines/new, products/[id], inventory/transfer, references/machine-templates |
| 22  | Form accessibility: machines/new, tasks/new, employees/new — 0 form labels         | Screen readers broken                                                                                                          |
| 23  | Duplicate pages: counterparty vs counterparties, dashboard/dashboard vs (overview) | UX confusion                                                                                                                   |
| 24  | 6 data-fetching pages without loading state                                        | help, promotions, dashboard, products, investor, counterparties                                                                |
| 25  | 3 forms on raw useState instead of RHF+Zod                                         | PromotionsWizard, machine-templates, invites                                                                                   |
| 26  | Supabase residuals in site/next.config.ts (CSP, image patterns)                    | Unnecessary attack surface                                                                                                     |

### Dependencies

| #   | Issue                                                                    |
| --- | ------------------------------------------------------------------------ |
| 27  | `nodemailer` 7.0.13 → SMTP injection — upgrade to 8.x                    |
| 28  | `next-intl` 4.8.3 → open redirect — upgrade to >=4.9.1                   |
| 29  | `handlebars` 4.7.8 → 8 advisories (devDep chain) — pnpm override >=4.7.9 |
| 30  | `lucide-react` version mismatch: 0.263.1 (site) vs 0.470.0 (web)         |

### Code

| #   | Issue                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------ |
| 31  | N+1 in 7 more services (quest-progress, complaints, collections, storage, reports, loyalty, inventory-reservation) |
| 32  | `PaginationQueryDto` exists but 0 services import it — each reimplements pagination                                |
| 33  | site app: 0 tests, mobile: 1 test                                                                                  |
| 34  | web: ESLint conditional hook in error.tsx, storybook config parse errors                                           |

---

## Project Strengths

| Area                  | Assessment                                                                          |
| --------------------- | ----------------------------------------------------------------------------------- |
| VHM24 Migration       | 56/56 = 100% + 31 new modules created                                               |
| TypeScript            | 0 errors across all 6 workspaces                                                    |
| Test Coverage         | 4460+ cases, 7750+ assertions, 84/85 modules (98.8%)                                |
| BaseEntity Compliance | 236/236 entity classes correct                                                      |
| UUID + Soft Delete    | 0 violations (except 1 intentional hard delete in auth cleanup)                     |
| SQL Injection         | Clean — all raw queries parameterized                                               |
| Hardcoded Secrets     | Clean — 0 in production code                                                        |
| Input Validation      | All controllers use DTOs + class-validator                                          |
| Logger Usage          | 0 console.log in services/controllers — all 142 services use NestJS Logger          |
| API Clients           | Excellent architecture (mutex token refresh, envelope unwrapping) in all 4 apps     |
| Monitoring Stack      | Complete: Prometheus, Grafana (5 dashboards), Loki, AlertManager, 4 business alerts |
| Terraform             | 9/10 — remote state, variable validation, env separation                            |
| Mobile App            | Full-featured (33 screens, dual-mode staff/client, offline-first)                   |
| PWA                   | Workbox, manifest, runtime caching — fully configured                               |
| SEO (site)            | JSON-LD, OpenGraph, hreflang, sitemap, robots — excellent                           |
| RBAC                  | 7 roles, global guards, @Public() properly scoped                                   |
| Circular Dependencies | Only 4 forwardRef() — all legitimate (loyalty subsystem)                            |

---

## Recommended Action Plan

### Sprint 1 — P0 Blockers (1-2 days)

1. Fix transactions IDOR (7 endpoints + organizationId threading)
2. Add `axios` pnpm override → >=1.15.0
3. Remove all bot references from CI/nginx/K8s/Prometheus/Helm (15+ files)
4. Add required-variable syntax to prod docker-compose

### Sprint 2 — P1 High Priority (3-5 days)

5. Upgrade `next` → 16.2.3, `@nestjs/core` → 11.1.18, add `path-to-regexp` override
6. Fix vehicles/machines to DB-level org filtering
7. Fix security.module.ts entity registration
8. Create DROP migration for trip\_\* tables
9. Fix prod Dockerfile references (client Dockerfile.dev → Dockerfile, API memory limit)
10. Fix release.yml rollback (psql → pg_restore)

### Sprint 3 — P2 Medium Priority (1-2 weeks)

11. Extract 221 hardcoded Russian strings into locale files
12. Add form labels for accessibility
13. Upgrade nodemailer, next-intl, handlebars
14. Fix N+1 query patterns (8 services)
15. Clean up duplicate pages

---

## Methodology

8 specialized agents ran in parallel:

| Agent                           | Type                | Duration  | Tool Calls |
| ------------------------------- | ------------------- | --------- | ---------- |
| Phase 0: Build Verification     | build-verifier      | ~23 min   | 96         |
| Phase 1: Dependency Audit       | dependency-audit    | ~5.6 min  | 32         |
| Phase 1b: Security Analysis     | general-purpose     | ~5 min    | 73         |
| Phase 2: DB Consistency         | db-migration-helper | ~11.4 min | 131        |
| Phase 3-4: Code Quality + Tests | general-purpose     | ~6.1 min  | 79         |
| Phase 5: Migration Status       | general-purpose     | ~4.7 min  | 39         |
| Phase 6: Infrastructure Audit   | general-purpose     | ~5.9 min  | 46         |
| Phase 7: Frontend UX/UI         | general-purpose     | ~5.9 min  | 67         |

**Total wall-clock time:** ~23 minutes (parallel execution)
**Total tool calls:** 563
