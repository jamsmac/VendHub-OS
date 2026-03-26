# ADR-0001: Modular Monolith Architecture with NestJS

## Status

Accepted

## Date

2025-01-15

## Context

VendHub OS manages 31+ coffee vending machines in Uzbekistan with plans for 100+ machines and franchising. We needed an architecture that supports:
- Complex business logic (84 domain modules)
- Multi-tenant isolation per organization
- Real-time telemetry and WebSocket communication
- Multiple client apps (admin panel, PWA, mobile, Telegram bot)

Alternatives considered: microservices, serverless, pure monolith.

## Decision

Adopt a **modular monolith** using NestJS with Turborepo for the monorepo:
- Each domain area is an independent NestJS module with its own controller, service, DTOs, and entities
- Modules communicate via dependency injection and event emitter (not HTTP)
- Turborepo manages 6 apps + 1 shared package with parallel builds
- PostgreSQL as single database with per-organization tenant isolation via guards

## Consequences

### Positive

- Simple deployment (single API process) with low operational overhead
- Strong module boundaries via NestJS DI system enforce separation of concerns
- Easy refactoring — modules can be extracted to microservices later if needed
- Shared database simplifies transactions across modules

### Negative

- Single failure domain — one bad module can affect the entire API
- Database schema grows large (122 entities, 16 migrations)
- Horizontal scaling requires full application replication

### Risks

- If traffic exceeds single-process capacity, need to move to microservices for hot modules (payments, telemetry)
