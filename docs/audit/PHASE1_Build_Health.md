# Phase 1: Build Health Check — Report

**Date:** 2025-02-17

## Build Health Summary

| App    | TS Errors | ESLint          | Build   | Tests                            |
| ------ | --------- | --------------- | ------- | -------------------------------- |
| API    | 28 (spec) | 0 err, 533 warn | FAIL    | 52 passed, 11 suites failed (TS) |
| Web    | 0         | 0 err, 533 warn | OK      | N/A                              |
| Client | 0         | 0 err, 533 warn | OK      | N/A                              |
| Site   | 0         | 0 err, 533 warn | OK      | N/A                              |
| Bot    | 0         | 0 err, 533 warn | OK      | N/A                              |
| Mobile | 8         | 0 err, 533 warn | not run | N/A                              |

**ESLint (root):** 0 errors, 533 warnings (`@typescript-eslint/no-explicit-any` mainly in packages/shared).

---

## Critical Build Blockers (P0)

### 1. API — Build fails (28 TS errors in spec files)

- **Cause:** Variable name mismatch in tests: declarations use underscore prefix (e.g. `_dailySummaryRepo`, `_commissionRepo`, `_alertHistoryRepo`, `taskItemRepository`/`taskComponentRepository`/`taskPhotoRepository` not declared).
- **Files:** `tasks.service.spec.ts`, `transactions.service.spec.ts`, `alerts.service.spec.ts`, and others (11 test suites fail to run).
- **Fix:** In each failing spec, align assignment targets with declared variable names (e.g. assign to `_dailySummaryRepo` or rename declarations to `dailySummaryRepo`). Add missing `let taskItemRepository`, `taskComponentRepository`, `taskPhotoRepository` in tasks.service.spec.ts.

### 2. Mobile — TypeScript (8 errors)

| File                  | Line | Issue                                                  |
| --------------------- | ---- | ------------------------------------------------------ |
| CartScreen.tsx        | 60   | `useRef` used before declaration                       |
| ClientHomeScreen.tsx  | 1    | `_useEffect` not exported from 'react' (typo?)         |
| DrinkDetailScreen.tsx | 192  | Type 'number' not assignable to '0 \| 100 \| 50 \| 25' |
| LoyaltyScreen.tsx     | 15   | 'LinearGradient' not exported from 'react-native'      |
| LoyaltyScreen.tsx     | 110  | Element implicitly has 'any' type (index)              |
| MapScreen.tsx         | 1    | `_useEffect` not exported from 'react'                 |
| BarcodeScanScreen.tsx | 19   | Cannot find module 'expo-barcode-scanner'              |

**Fix:** Fix React import typos (`_useEffect` → `useEffect`), install/add `expo-barcode-scanner`, use `expo-linear-gradient` for LinearGradient, fix CartScreen useRef order, fix DrinkDetailScreen and LoyaltyScreen types.

---

## Warnings (non-blocking)

1. **ESLint:** 533 `no-explicit-any` warnings. With `--max-warnings 0` lint would fail.
2. **Client build:** Chunk size >500 kB warning; consider code-splitting.
3. **API tests:** 1398 tests passed in 52 suites; 11 suites do not run due to TS errors in spec files.

---

## Next Steps

- Fix API spec variable names and missing declarations so that `pnpm --filter @vendhub/api build` and tests pass.
- Fix Mobile TS errors; then run Mobile build.
- Proceed to Phase 2 (Backend audit).
