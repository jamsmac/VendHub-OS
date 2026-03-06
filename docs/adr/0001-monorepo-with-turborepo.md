# ADR-0001: Monorepo with Turborepo and pnpm

## Status: Accepted

## Date: 2024-12-01

## Context

VendHub OS consists of multiple applications (API, Web, Site, Client, Bot) sharing common code. We needed a strategy for code organization, dependency management, and build orchestration to maintain consistency while allowing independent deployment.

## Decision

Use a monorepo structure with Turborepo for build orchestration and pnpm workspaces for dependency management.

## Consequences

- Shared packages (types, utils) are referenced directly without npm publishing
- Single lockfile for all apps ensures dependency consistency across the organization
- Turborepo caching significantly speeds up CI/CD builds
- All apps can be versioned and deployed independently
- New developers must understand the monorepo structure and workspace relationships
- Requires discipline to maintain proper package boundaries and avoid circular dependencies
