# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for VendHub OS, documenting significant architectural decisions and their rationale.

## Format

Each ADR follows a standard format:

- **Status**: Accepted, Proposed, Deprecated, or Superseded
- **Date**: When the decision was made
- **Context**: The issue we're addressing and why it matters
- **Decision**: What we chose to do
- **Consequences**: The outcomes and tradeoffs of this decision

## All ADRs

| Number                                            | Title                             | Status   | Date       |
| ------------------------------------------------- | --------------------------------- | -------- | ---------- |
| [0001](./0001-monorepo-with-turborepo.md)         | Monorepo with Turborepo and pnpm  | Accepted | 2024-12-01 |
| [0002](./0002-nestjs-with-typeorm.md)             | NestJS with TypeORM               | Accepted | 2024-12-01 |
| [0003](./0003-nextjs-with-shadcn-ui.md)           | Next.js with Shadcn UI            | Accepted | 2024-12-01 |
| [0004](./0004-jwt-with-totp-authentication.md)    | JWT with TOTP Authentication      | Accepted | 2024-12-01 |
| [0005](./0005-multi-tenant-rbac.md)               | Multi-Tenant RBAC Architecture    | Accepted | 2024-12-01 |
| [0006](./0006-event-driven-notifications.md)      | Event-Driven Notifications System | Accepted | 2024-12-01 |
| [0007](./0007-soft-delete-pattern.md)             | Soft Delete Pattern               | Accepted | 2024-12-01 |
| [0008](./0008-uzbekistan-payment-integrations.md) | Uzbekistan Payment Integrations   | Accepted | 2024-12-01 |

## How to Propose a New ADR

1. Create a new file: `docs/adr/NNNN-short-title.md`
2. Copy the template from an existing ADR
3. Fill in the four sections: Status, Context, Decision, Consequences
4. Add an entry to this README table
5. Submit for team review and consensus

## References

- [Architectural Decision Records (Nygard)](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Org](https://adr.github.io/)
