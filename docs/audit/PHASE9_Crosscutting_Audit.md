# Phase 9: Cross-Cutting Concerns — Report

**Date:** 2025-02-17

## Summary

### Dependencies

- **pnpm audit:** Run in CI with `--audit-level=high || true` (does not fail pipeline).
- **pnpm outdated:** Not run in CI; recommend periodic check.

### Environment

- **.env:** In .gitignore (.env, .env.local, .env.\*.local); !.env.example allowed.
- **.env.example:** Should list all required variables; no secrets in code.

### i18n

- **Locales:** uz, ru, en expected; files under apps (web/client) to be verified. Web sidebar uses hardcoded Russian.

### Error handling

- **API:** HttpExceptionFilter (from app.module).
- **Web:** error.tsx, loading.tsx (Next.js) — verify presence in app routes.
- **Client:** Error boundaries — verify in app tree.
- **Bot:** Handlers should catch and reply with user message.

### Logging

- **API:** NestJS Logger; avoid console.log in production. LoggingInterceptor in app.module.

## Gaps / Improvements

1. Add i18n to Web Admin (sidebar and all pages).
2. Ensure .env.example is complete and up to date.
3. Run pnpm audit without `|| true` once high/critical are fixed, or fail on high.

## Next

- Phase 10 (Final report).
