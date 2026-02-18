# Phase 8: Shared Packages Audit — Report

**Date:** 2025-02-17

## Summary

- **packages/shared:** Re-exports from `./types`, `./constants`, `./utils`.
- **Types:** user, complaint, audit, report, notification, product, machine, task, inventory, api, reference, location, transaction, organization (and index). Used for DTOs and API contracts.
- **Constants:** app.constants, regex.constants, validation.constants.
- **Utils:** validation, format, distance, date, crypto.
- **Build:** tsup (from repo root); consumed by apps via workspace package.

## Gaps / Improvements

1. **ESLint:** Many `no-explicit-any` warnings in shared types; replace `any` with proper types.
2. **Consumption:** Verify api, web, client, mobile import from `@vendhub/shared` (or equivalent) and do not duplicate types.
3. **Enums:** Ensure ROLES, LOYALTY_LEVELS, MachineStatus, OrderStatus, etc. are in shared and used consistently.

## Next

- Phase 9 (Cross-cutting).
