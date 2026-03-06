# ADR-0007: Soft Delete Pattern

## Status: Accepted

## Date: 2024-12-01

## Context

VendHub OS operates in a regulatory environment (Uzbekistan fiscal requirements) where data retention and audit trails are mandatory. Hard deletes destroy data irreversibly, making compliance audits impossible.

## Decision

Implement soft delete pattern with `deleted_at` timestamp and a global query filter that excludes deleted records by default. Hard delete is prohibited except by administrators with explicit override.

## Consequences

- Deleted records remain in database for audit trail and compliance
- All queries must use global scope filters to exclude soft-deleted records
- Recovery of accidentally deleted records is possible via direct database access
- Disk storage usage increases over time (mitigated by archiving old deleted records)
- Query complexity increases due to filtering logic
- Triggers and views help automate soft delete behavior in complex queries
- Enables compliance with Uzbekistan fiscal regulations requiring data retention
