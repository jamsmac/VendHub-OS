# ADR-0002: Multi-Tenant Isolation via OrganizationGuard

## Status

Accepted

## Date

2025-02-01

## Context

VendHub OS must support multiple organizations (franchise model) sharing the same database and API instance. Each organization's data must be isolated — users should never see data from other organizations. Options considered:
1. Separate databases per tenant
2. Schema-per-tenant (PostgreSQL schemas)
3. Row-level filtering with organizationId column

## Decision

Use **row-level filtering** with a global `OrganizationGuard`:
- Every entity includes an `organizationId` UUID column (enforced by BaseEntity conventions)
- `OrganizationGuard` runs on every authenticated request, extracting and validating organizationId
- All service queries MUST filter by `organizationId` (enforced by code review and IDOR audits)
- Super admin can bypass organization checks; headquarters can access child organizations
- `@SkipOrgCheck()` decorator for cross-org operations (e.g., platform analytics)

## Consequences

### Positive

- Simplest operational model — single database, single schema, single migration path
- No connection pool multiplication (vs. database-per-tenant)
- Easy cross-tenant reporting for platform administrators
- Consistent backup and restore strategy

### Negative

- Every query must include `WHERE organization_id = ?` — easy to forget, causing IDOR
- Indexes must include organizationId for performance (compound indexes)
- Cannot offer per-tenant database customization

### Risks

- IDOR vulnerabilities if organizationId filtering is missed — mitigated by comprehensive audits (4 IDOR fixes applied in March 2026)
