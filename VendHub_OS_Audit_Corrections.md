# VendHub OS Audit Report - Corrections & Updates

Date: 2026-03-07 (same day as audit)
Based on: VendHub_OS_Audit_Report.docx

## Stats Corrections

| Metric                | Report Says | Actual  | Note                            |
| --------------------- | ----------- | ------- | ------------------------------- |
| Lines of code         | 398,852     | 407,489 | ~2% difference, counting method |
| Test files (.spec.ts) | 176         | 181     | 5 added during fixes            |
| NestJS modules        | 78          | 78      | Correct                         |
| TypeORM migrations    | 56          | 56      | Correct                         |
| Next.js pages         | 79          | 79      | Correct                         |

## Finding Status Updates

### Already Fixed (report lists as active)

| #   | Finding                             | Status        | Details                                                                                                                              |
| --- | ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Swagger UI public in non-production | ALREADY FIXED | `createSwaggerAuthMiddleware` protects /docs in production with JWT + owner-only role check. `SWAGGER_ENABLED` config toggle exists. |

### Fixed During This Session

| #   | Finding                                   | Fix Applied                                                                                      |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 2   | bcrypt + bcryptjs dual dependency         | Removed `bcryptjs` and `@types/bcryptjs` from API package.json. Only `bcrypt` is used in source. |
| 3   | .md files in apps/web/src/                | Moved `COMPLETION_CHECKLIST.md` and `REFACTORING_SUMMARY.md` to `docs/web/`                      |
| 4   | Railway Project ID exposed in ci.yml      | Replaced hardcoded UUID with `[see RAILWAY_PROJECT_ID secret]` reference                         |
| 5   | turbo.json globalDependencies: [".env"]   | Changed to empty array `[]`. Each task specifies needed `env` vars individually.                 |
| 6   | 9 failing test suites (221 test failures) | All 157 suites pass, 3588/3588 tests pass                                                        |

### Fixed in Follow-up Session (2026-03-08)

| #   | Finding                                    | Fix Applied                                                                                |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| 7   | Client PWA low test coverage (1 test file) | Added 4 test files (utils, cart-store, user-store, ui-store) — now 5 files, 70 tests       |
| 11  | BOT_API_TOKEN not documented               | Documented in DEPLOY_RAILWAY.md and RAILWAY_ENV_VARS.md with generation instructions       |
| 12  | Client PWA running dev server on Railway   | Switched client railway.toml from Docker to Nixpacks (buildCommand/startCommand)           |
| 13  | CORS_ORIGINS missing Railway domains       | Updated local .env, docker-compose.prod.yml, CI health checks to use Railway domains       |
| 14  | Hardcoded vendhub.uz in runtime configs    | Updated bot miniAppUrl fallback, deploy.yml, release.yml to use Railway production domains |

### Confirmed & Acknowledged (not yet fixed)

| #   | Finding                                | Priority | Plan                                                     |
| --- | -------------------------------------- | -------- | -------------------------------------------------------- |
| 8   | Mobile no E2E tests (1 test file)      | HIGH     | Consider Detox or Maestro                                |
| 9   | Site no tests (0 test files)           | MEDIUM   | Add smoke tests                                          |
| 10  | DB partitioning for high-volume tables | MEDIUM   | Future: partition transactions, audit_logs by created_at |

## Commit Reference

- `5cdce90` - fix(tests): resolve all 9 failing test suites + audit fixes
- `3dd90cc` - feat(client): add PWA tests + switch all domains to Railway
- `916375a` - fix(deploy): switch client to Nixpacks build, document BOT_API_TOKEN
