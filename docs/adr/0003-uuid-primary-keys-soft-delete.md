# ADR-0003: UUID Primary Keys and Soft Delete Strategy

## Status

Accepted

## Date

2025-01-15

## Context

We needed a consistent primary key and deletion strategy across 122 entities. Options:
- Auto-increment integers vs UUIDs for primary keys
- Hard delete vs soft delete for data removal

## Decision

**UUIDs everywhere + soft delete only:**
- All primary keys use `@PrimaryGeneratedColumn("uuid")` via BaseEntity
- All foreign keys are `string | null` (UUID references)
- Soft delete via `@DeleteDateColumn` (deletedAt) — never hard delete
- Unique indexes filtered by `WHERE deleted_at IS NULL` to allow re-creation of soft-deleted records
- BaseEntity provides: `id`, `createdAt`, `updatedAt`, `deletedAt`, `createdById`, `updatedById`

## Consequences

### Positive

- UUIDs are globally unique — safe for distributed systems, API exposure, and multi-tenant
- No sequential ID enumeration attack vector
- Soft delete preserves audit trail and allows data recovery
- BaseEntity enforces consistency across all 122 entities

### Negative

- UUIDs are larger (16 bytes vs 4 bytes) and slower for indexing than integers
- Soft delete accumulates data over time — need periodic archival strategy
- Filtered unique indexes add complexity to migrations

### Risks

- Performance degradation with very large tables — mitigate with partitioning when needed
