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

### Confirmed & Acknowledged (not yet fixed)

| #   | Finding                                    | Priority | Plan                                                     |
| --- | ------------------------------------------ | -------- | -------------------------------------------------------- |
| 7   | Client PWA low test coverage (1 test file) | HIGH     | Needs Vitest + RTL tests for critical pages              |
| 8   | Mobile no E2E tests (1 test file)          | HIGH     | Consider Detox or Maestro                                |
| 9   | Site no tests (0 test files)               | MEDIUM   | Add smoke tests                                          |
| 10  | DB partitioning for high-volume tables     | MEDIUM   | Future: partition transactions, audit_logs by created_at |
| 11  | BOT_API_TOKEN not documented               | MEDIUM   | Add to README                                            |

## Commit Reference

- `5cdce90` - fix(tests): resolve all 9 failing test suites + audit fixes
