# ADR-0005: Multi-Tenant RBAC Architecture

## Status: Accepted

## Date: 2024-12-01

## Context

VendHub OS serves multiple independent organizations (franchises, branches) with varying permission requirements. We needed a flexible architecture that prevents data leakage while supporting 7 distinct user roles with hierarchical organizations.

## Decision

Implement multi-tenancy at the application level with organization-scoped queries, role-based access control (RBAC), and hierarchical organization structure (Headquarters → Franchise → Branch).

## Consequences

- Organization context is passed through ClsModule for request-scoped access
- Row-level security (RLS) is enforced at the service layer, not database level
- Every query implicitly filters by organization_id to prevent cross-organization data access
- 7 roles (Owner, Admin, Manager, Operator, Warehouse, Accountant, Viewer) provide granular control
- Performance overhead from organization filtering on every query (mitigated by indexing)
- Database structure must account for organization isolation from initial design
- Multi-organization operations require explicit design and careful testing
