# Changelog

All notable changes to VendHub OS will be documented in this file.

The format is based on [Conventional Commits](https://www.conventionalcommits.org/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-03-26

### Features

- 84 NestJS API modules with full CRUD operations
- Multi-tenant architecture with OrganizationGuard
- Payment integrations: Payme, Click, Uzum Bank, Telegram Stars
- Admin panel: Next.js 16 with 104 pages and 44 shadcn/ui components
- Client PWA: Vite + React 19 with offline support
- Mobile app: React Native + Expo 52 (staff + client modes)
- Telegram bot: 25+ commands with WebApp integration
- RBAC: 7 roles (owner, admin, manager, operator, warehouse, accountant, viewer)
- Loyalty system: achievements, quests, promo codes, referrals
- HR module: employees, departments, attendance, payroll, reviews
- Real-time: Socket.IO with Redis adapter
- Fiscal: MultiKassa/OFD integration

### Security

- JWT with cookie + bearer dual extraction
- 5-layer guard stack (Throttler, CSRF, JWT, Roles, Organization)
- IDOR protection on all tenant-scoped endpoints
- Timing-safe webhook verification for payment providers
- CSP headers (no unsafe-eval in production)
- HSTS with preload

### Infrastructure

- Docker Compose with 12 services and resource limits
- CI/CD: 3 GitHub Actions workflows (ci, deploy, release)
- Kubernetes manifests with HPA (2-10 replicas)
- Monitoring: Prometheus + Grafana + Loki
- Blue-green deployment with automatic rollback
