# ADR-0002: NestJS with TypeORM

## Status: Accepted

## Date: 2024-12-01

## Context

We needed a robust, scalable backend framework for VendHub OS that could handle complex multi-tenant logic, microservice patterns, and extensive database operations with strong typing support.

## Decision

Use NestJS as the application framework combined with TypeORM as the ORM layer for database abstraction and migration management.

## Consequences

- Strong TypeScript integration ensures type safety across the backend
- Dependency injection pattern promotes testability and modularity
- TypeORM migrations enable safe database schema evolution
- Comprehensive decorator-based patterns reduce boilerplate code
- GraphQL and REST coexist seamlessly through NestJS modules
- Learning curve for developers unfamiliar with decorators and inversion of control
- Database vendor lock-in to PostgreSQL with TypeORM (though abstraction allows migration)
