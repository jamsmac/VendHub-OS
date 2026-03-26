# ADR-0005: Shared Package as Single Source of Truth for Types

## Status

Accepted

## Date

2025-06-01

## Context

With 6 apps (API, web, client, bot, mobile, site) sharing types, enums, and constants, we had:
- 29 duplicate enum definitions across apps
- 6 ambiguous enum names (e.g., PaymentStatus defined 3 times with different values)
- Type mismatches causing runtime errors between frontend and backend

## Decision

Create `packages/shared` as the **single source of truth**:
- 15 type modules (user, machine, product, transaction, etc.)
- 3 constant modules (app, validation, regex)
- 5 utility modules (distance, date, format, validation, crypto)
- Built with tsup (CJS + ESM + source maps)
- Referenced as `@vendhub/shared` workspace dependency in all apps
- All enums consolidated — ambiguous names disambiguated (e.g., `PaymentTransactionStatus`, `OrderPaymentStatus`, `SubscriptionPaymentStatus`)

## Consequences

### Positive

- Type safety across all 6 apps — single change propagates everywhere
- No more duplicate/divergent enums
- Shared validation constants (string lengths, regex patterns) ensure consistency
- Multi-entry points (types, constants, utils) for tree-shaking

### Negative

- Changes to shared package require rebuilding dependent apps
- Turbo build dependency chain adds ~5s to cold builds
- Must be careful with breaking changes — affects all apps simultaneously

### Risks

- Shared package becoming a dumping ground — mitigate by keeping it focused on cross-app concerns only
