# VendHub OS

> Production-ready unified vending machine management platform for Uzbekistan market.

[![NestJS](https://img.shields.io/badge/NestJS-11.1-E0234E?logo=nestjs)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)](https://docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-ready-326CE5?logo=kubernetes)](https://kubernetes.io/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red)]()

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Architecture](#-architecture)
- [Modules](#-modules)
- [Testing](#-testing)
- [Monitoring](#-monitoring)
- [Contributing](#-contributing)

---

## Overview

VendHub OS is a comprehensive vending machine management platform designed specifically for the Uzbekistan market. It provides:

- **Multi-tenant SaaS** - Support for franchises, branches, and operator partners
- **Real-time monitoring** - Live machine status via WebSocket
- **Mobile-first** - Telegram Mini App for customers, PWA for operators
- **Full localization** - Uzbek, Russian, and English
- **Local payments** - Payme, Click, Uzum Bank, Telegram Stars
- **Tax compliance** - OFD/fiscal integration with Soliq.uz

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Backend API** | NestJS | 11.x | REST + WebSocket API |
| **Admin Panel** | Next.js | 16.x | Admin dashboard |
| **Client Web** | React + Vite | 19.x | Telegram Mini App |
| **Mobile App** | React Native + Expo | 52.x | Staff mobile app |
| **Database** | PostgreSQL | 16 | Primary database |
| **Cache** | Redis | 7 | Caching & sessions |
| **Queue** | BullMQ | 5.x | Background jobs |
| **ORM** | TypeORM | 0.3.x | Database ORM |
| **Bot** | Telegraf | 4.x | Telegram bot |
| **Monorepo** | Turborepo | 2.5.x | Build orchestration |
| **Package Manager** | pnpm | 9.x | Fast package manager |

---

## Project Structure

```
VendHub OS/
├── apps/
│   ├── api/                    # NestJS Backend (59 modules)
│   │   ├── src/
│   │   │   ├── common/         # Guards, decorators, filters
│   │   │   ├── config/         # Configuration files
│   │   │   ├── database/       # Migrations & seeds
│   │   │   └── modules/        # Feature modules
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── web/                    # Next.js Admin Panel
│   │   ├── src/
│   │   │   ├── app/           # App router pages
│   │   │   ├── components/    # React components
│   │   │   └── lib/           # Utilities
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── client/                 # Vite Telegram Mini App
│   │   ├── src/
│   │   │   ├── pages/         # Page components
│   │   │   ├── components/    # UI components
│   │   │   └── store/         # Zustand store
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── bot/                    # Telegram Bot
│   │   ├── src/
│   │   │   └── main.ts        # Bot entry point
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── mobile/                 # React Native Expo App
│       ├── app/               # Expo Router
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types & utilities
│   │   ├── src/
│   │   │   ├── types/         # TypeScript interfaces
│   │   │   ├── enums/         # Shared enums
│   │   │   └── utils/         # Utility functions
│   │   └── package.json
│   │
│   └── ui/                     # Shared UI components
│       ├── src/
│       │   └── components/    # Cross-platform components
│       └── package.json
│
├── infrastructure/
│   ├── k8s/                    # Kubernetes manifests
│   │   ├── base/              # Base configurations
│   │   └── overlays/          # Staging/Production
│   │
│   ├── helm/                   # Helm charts
│   │   └── vendhub/
│   │
│   ├── monitoring/             # Prometheus, Grafana, Loki
│   │   └── docker-compose.monitoring.yml
│   │
│   ├── nginx/                  # Reverse proxy
│   ├── postgres/               # DB init scripts
│   └── redis/                  # Cache config
│
├── scripts/
│   ├── backup/                 # Backup & restore scripts
│   ├── seed/                   # Database seeding
│   └── deploy/                 # Deployment scripts
│
├── e2e/                        # Playwright E2E tests
│   ├── api/                   # API tests
│   ├── web/                   # Admin panel tests
│   └── client/                # Mini App tests
│
├── .github/
│   └── workflows/              # CI/CD pipelines
│       ├── ci.yml             # Main CI pipeline
│       └── release.yml        # Production releases
│
├── docker-compose.yml          # Local development
├── docker-compose.prod.yml     # Production compose
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # Workspace config
├── .env.example                # Environment template
└── README.md
```

---

## Quick Start

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 9+ (`npm install -g pnpm`)
- **Docker** & Docker Compose
- **Git**

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/your-org/vendhub-unified.git
cd vendhub-unified

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your values (see Environment Variables section)
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, MinIO
docker-compose up -d postgres redis minio

# Wait for services to be ready
docker-compose logs -f postgres  # Watch for "database system is ready"
```

### 3. Initialize Database

```bash
# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed
```

### 4. Start Development

```bash
# Start all apps in development mode
pnpm dev

# Or start specific apps
pnpm dev --filter=@vendhub/api      # API only
pnpm dev --filter=@vendhub/web      # Admin only
pnpm dev --filter=@vendhub/client   # Mini App only
```

### 5. Access Applications

| Application | URL | Description |
|-------------|-----|-------------|
| API Server | http://localhost:4000 | Backend API |
| API Docs | http://localhost:4000/docs | Swagger UI |
| Admin Panel | http://localhost:3000 | Dashboard |
| Mini App | http://localhost:5173 | Client PWA |
| MinIO Console | http://localhost:9001 | File storage |

### Default Credentials

```
Admin Login:
  Email: admin@vendhub.uz
  Password: admin123
  2FA Code: Use Google Authenticator

Demo User:
  Phone: +998901234567
  OTP: 123456 (development only)
```

---

## Development

### Available Scripts

```bash
# Development
pnpm dev              # Start all apps
pnpm dev:api          # Start API only
pnpm dev:web          # Start Admin Panel only
pnpm dev:client       # Start Mini App only

# Build
pnpm build            # Build all apps
pnpm build:api        # Build API only

# Database
pnpm db:migrate       # Run migrations
pnpm db:migrate:undo  # Revert last migration
pnpm db:seed          # Seed database
pnpm db:reset         # Drop & recreate database

# Testing
pnpm test             # Run unit tests
pnpm test:e2e         # Run E2E tests
pnpm test:cov         # Test coverage

# Linting
pnpm lint             # Lint all apps
pnpm lint:fix         # Fix lint errors
pnpm format           # Format code

# Type checking
pnpm typecheck        # TypeScript check

# Docker
pnpm docker:build     # Build Docker images
pnpm docker:up        # Start with Docker Compose
pnpm docker:down      # Stop containers
```

### Code Style

- **ESLint** with TypeScript rules
- **Prettier** for formatting
- **Husky** pre-commit hooks
- **Conventional Commits** for commit messages

```bash
# Commit message format
feat: add new feature
fix: resolve bug
docs: update documentation
chore: maintenance task
```

### IDE Setup

**VSCode Extensions:**
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense
- Docker
- GitLens

**Settings (`.vscode/settings.json`):**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## Deployment

### Docker Compose (Simple)

```bash
# Production build
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Kubernetes (Production)

```bash
# Using Kustomize
kubectl apply -k infrastructure/k8s/overlays/production

# Using Helm
helm install vendhub ./infrastructure/helm/vendhub \
  --namespace vendhub \
  --values infrastructure/helm/vendhub/values-production.yaml
```

### Environment-Specific Configuration

| Environment | Config File | Description |
|-------------|-------------|-------------|
| Development | `.env` | Local development |
| Staging | `k8s/overlays/staging/` | Testing environment |
| Production | `k8s/overlays/production/` | Live environment |

### Required Services

| Service | Purpose | Recommended |
|---------|---------|-------------|
| PostgreSQL | Database | 16+ with pgvector |
| Redis | Cache & Sessions | 7+ with persistence |
| MinIO/S3 | File Storage | S3-compatible |
| NGINX | Reverse Proxy | With rate limiting |

---

## API Documentation

### Base URL

```
Production: https://api.vendhub.uz/api/v1
Development: http://localhost:4000/api/v1
```

### Authentication

```bash
# Login
POST /auth/login
{
  "email": "admin@vendhub.uz",
  "password": "admin123"
}

# Response
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "requiresTwoFactor": true
}

# 2FA Verification
POST /auth/2fa/verify
{
  "code": "123456",
  "tempToken": "..."
}
```

### Headers

```
Authorization: Bearer <access_token>
X-Organization-ID: <org_id>  # For multi-tenant
Content-Type: application/json
Accept-Language: uz  # uz, ru, en
```

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Auth** |||
| POST | `/auth/login` | Login |
| POST | `/auth/register` | Register |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/2fa/setup` | Setup 2FA |
| POST | `/auth/2fa/verify` | Verify 2FA |
| **Machines** |||
| GET | `/machines` | List machines |
| GET | `/machines/:id` | Get machine |
| POST | `/machines` | Create machine |
| PUT | `/machines/:id` | Update machine |
| GET | `/machines/:id/status` | Get status |
| GET | `/machines/nearby` | Find nearby |
| **Products** |||
| GET | `/products` | List products |
| GET | `/products/:id` | Get product |
| POST | `/products` | Create product |
| PUT | `/products/:id` | Update product |
| GET | `/products/categories` | Categories |
| **Orders** |||
| GET | `/orders` | List orders |
| GET | `/orders/:id` | Get order |
| POST | `/orders` | Create order |
| PUT | `/orders/:id/status` | Update status |
| **Inventory** |||
| GET | `/inventory/warehouse` | Warehouse stock |
| GET | `/inventory/machine/:id` | Machine stock |
| POST | `/inventory/transfer` | Transfer stock |
| POST | `/inventory/replenish` | Replenish machine |
| **Loyalty** |||
| GET | `/loyalty/points` | Get points |
| GET | `/loyalty/tiers` | Get tiers |
| POST | `/loyalty/redeem` | Redeem reward |
| GET | `/loyalty/history` | Points history |

### WebSocket Events

```javascript
// Connect
const socket = io('wss://api.vendhub.uz', {
  auth: { token: 'Bearer ...' }
});

// Subscribe to machine updates
socket.emit('machine:subscribe', { machineIds: ['m1', 'm2'] });

// Listen for events
socket.on('machine:status', (data) => {
  console.log('Machine status:', data);
});

socket.on('machine:sale', (data) => {
  console.log('New sale:', data);
});

socket.on('order:status', (data) => {
  console.log('Order update:', data);
});
```

### Error Responses

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/auth/login"
}
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  Admin Web  │  Mini App   │ Mobile App  │  Telegram   │  IoT    │
│  (Next.js)  │   (Vite)    │   (Expo)    │    Bot      │ Devices │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       └─────────────┴─────────────┼─────────────┴───────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │       NGINX / Ingress       │
                    │    (Load Balancer + TLS)    │
                    └──────────────┬──────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       │                           │                           │
┌──────▼──────┐           ┌────────▼────────┐          ┌───────▼───────┐
│   API Pod   │           │    API Pod      │          │   API Pod     │
│  (NestJS)   │           │   (NestJS)      │          │  (NestJS)     │
└──────┬──────┘           └────────┬────────┘          └───────┬───────┘
       │                           │                           │
       └───────────────────────────┼───────────────────────────┘
                                   │
         ┌─────────────┬───────────┼───────────┬─────────────┐
         │             │           │           │             │
   ┌─────▼─────┐ ┌─────▼─────┐ ┌───▼───┐ ┌────▼────┐ ┌──────▼──────┐
   │ PostgreSQL│ │   Redis   │ │ MinIO │ │ BullMQ  │ │  Prometheus │
   │  Primary  │ │  Cluster  │ │  S3   │ │  Queue  │ │  + Grafana  │
   └───────────┘ └───────────┘ └───────┘ └─────────┘ └─────────────┘
```

### Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     API MODULES (33)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   CORE          │  │   OPERATIONS    │  │   INTEGRATIONS  │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤ │
│  │ • Auth          │  │ • Inventory     │  │ • Telegram Bot  │ │
│  │ • Users         │  │ • Tasks         │  │ • Payments      │ │
│  │ • Organizations │  │ • Orders        │  │ • SMS           │ │
│  │ • Machines      │  │ • Transactions  │  │ • Email         │ │
│  │ • Products      │  │ • Complaints    │  │ • Storage       │ │
│  │ • Locations     │  │ • Maintenance   │  │ • Maps          │ │
│  │ • References    │  │ • Material Req  │  │ • Webhooks      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   HR            │  │   LOYALTY       │  │   SYSTEM        │ │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤ │
│  │ • Employees     │  │ • Points        │  │ • Notifications │ │
│  │ • Contractors   │  │ • Tiers         │  │ • Reports       │ │
│  │ • Work Logs     │  │ • Quests        │  │ • Audit         │ │
│  │ • Schedules     │  │ • Referrals     │  │ • Health        │ │
│  │                 │  │ • Rewards       │  │ • AI            │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Multi-Tenant Structure

```
Organization (Franchise)
├── Settings (branding, limits)
├── Locations
│   ├── Location A (Tashkent)
│   │   ├── Machines
│   │   └── Staff
│   └── Location B (Samarkand)
│       ├── Machines
│       └── Staff
├── Products (catalog)
├── Employees
└── Reports
```

### User Roles (7-Level RBAC)

| Role | Level | Permissions |
|------|-------|-------------|
| `owner` | 100 | Full system control, billing |
| `admin` | 90 | All except ownership transfer |
| `manager` | 70 | Tasks, reports, team management |
| `accountant` | 60 | Financial reports, transactions |
| `operator` | 50 | Tasks, machine service |
| `warehouse` | 40 | Inventory management |
| `viewer` | 10 | Read-only access |

---

## Modules

### Core Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Auth** | Authentication | JWT, Refresh tokens, 2FA TOTP, Password reset |
| **Users** | User management | CRUD, Roles, Permissions, Avatar |
| **Organizations** | Multi-tenant | Franchises, Settings, Branding |
| **Machines** | Vending machines | CRUD, Status, Telemetry, Maintenance |
| **Products** | Product catalog | Categories, Pricing, Images, Barcode |
| **Locations** | Location management | Addresses, Contracts, Working hours |
| **References** | Uzbekistan codes | MXIK, IKPU, VAT, Package types |

### Operations Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Inventory** | 3-Level system | Warehouse → Operator → Machine |
| **Tasks** | Task management | Assignment, Photo validation, SLA |
| **Orders** | Customer orders | Create, Status, Payment, Delivery |
| **Transactions** | Sales & payments | Recording, Refunds, Reports |
| **Complaints** | Customer service | QR submission, SLA tracking, Resolution |
| **Maintenance** | Equipment care | Scheduling, Parts, History |
| **Material Requests** | Supplies | Request → Approve → Deliver flow |

### Loyalty & Engagement

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Loyalty** | Points system | Earn, Redeem, Tiers, History |
| **Quests** | Gamification | Daily/Weekly challenges, Rewards |
| **Referrals** | User referrals | Codes, Tracking, Bonuses |
| **Favorites** | User preferences | Machines, Products, Quick access |
| **Recommendations** | AI suggestions | Based on history, Location |

### Integration Modules

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Telegram Bot** | Messaging | Commands, Notifications, Mini App |
| **Payments** | Payment gateways | Payme, Click, Uzum, Stars |
| **SMS** | SMS notifications | Eskiz, PlayMobile providers |
| **Email** | Email service | SMTP, Templates, Queue |
| **Storage** | File storage | S3/MinIO, Images, Documents |
| **Maps** | Geolocation | Google Maps, Machine finder |
| **Webhooks** | External events | Retry logic, Signatures |
| **AI** | Intelligence | Image parsing, Anomaly detection |

---

## Testing

### Test Structure

```
├── apps/api/src/
│   └── modules/
│       └── auth/
│           ├── auth.service.spec.ts    # Unit tests
│           └── auth.controller.spec.ts
│
├── e2e/
│   ├── api/                # API E2E tests
│   │   ├── auth.spec.ts
│   │   ├── machines.spec.ts
│   │   └── orders.spec.ts
│   ├── web/                # Admin E2E tests
│   │   ├── login.spec.ts
│   │   └── dashboard.spec.ts
│   └── client/             # Mini App E2E tests
│       ├── home.spec.ts
│       └── cart.spec.ts
```

### Running Tests

```bash
# Unit tests
pnpm test                    # All tests
pnpm test:api               # API tests only
pnpm test:watch             # Watch mode
pnpm test:cov               # With coverage

# E2E tests
pnpm test:e2e               # All E2E tests
pnpm test:e2e:api           # API tests
pnpm test:e2e:web           # Admin tests
pnpm test:e2e:client        # Mini App tests

# Specific test file
pnpm test -- auth.service.spec.ts
```

### Test Coverage Requirements

| Module | Min Coverage |
|--------|-------------|
| Auth | 90% |
| Users | 85% |
| Orders | 85% |
| Payments | 95% |
| Other | 80% |

---

## Monitoring

### Stack

| Component | Purpose | Port |
|-----------|---------|------|
| Prometheus | Metrics collection | 9090 |
| Grafana | Dashboards | 3001 |
| Loki | Log aggregation | 3100 |
| Alertmanager | Alert routing | 9093 |

### Start Monitoring

```bash
# Start monitoring stack
docker-compose -f infrastructure/monitoring/docker-compose.monitoring.yml up -d

# Access Grafana
open http://localhost:3001
# Login: admin / admin
```

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `http_request_duration_seconds` | Request latency | > 1s |
| `http_requests_total` | Request count | Rate > 1000/min |
| `db_connections_active` | DB connections | > 80% pool |
| `redis_memory_used_bytes` | Redis memory | > 80% |
| `machine_offline_count` | Offline machines | > 5 |
| `order_failed_count` | Failed orders | > 10/hour |

### Alerts

Configured alerts in `infrastructure/monitoring/alert-rules.yml`:

- **Infrastructure**: High CPU, Memory, Disk
- **Application**: Error rate, Latency, Queue depth
- **Database**: Connection pool, Slow queries
- **Business**: Failed orders, Offline machines, Low stock

---

## Environment Variables

See `.env.example` for full list. Key variables:

### Required

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vendhub
DB_USER=vendhub
DB_PASSWORD=secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
```

### Optional Integrations

```bash
# Payments
PAYME_MERCHANT_ID=
CLICK_MERCHANT_ID=
UZUM_MERCHANT_ID=

# SMS
SMS_PROVIDER=eskiz
SMS_API_KEY=

# Storage
STORAGE_ENDPOINT=localhost:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin

# AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

---

## Contributing

### Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes with tests
4. Run checks: `pnpm lint && pnpm test`
5. Commit: `git commit -m "feat: add my feature"`
6. Push: `git push origin feature/my-feature`
7. Open Pull Request

### Commit Convention

```
feat: new feature
fix: bug fix
docs: documentation
style: formatting
refactor: code restructure
test: add tests
chore: maintenance
```

### Code Review Checklist

- [ ] Tests pass
- [ ] Linting passes
- [ ] TypeScript types correct
- [ ] Documentation updated
- [ ] No secrets committed
- [ ] Migration included (if DB changes)

---

## Support

- **Documentation**: [docs.vendhub.uz](https://docs.vendhub.uz)
- **Issues**: [GitHub Issues](https://github.com/your-org/vendhub-unified/issues)
- **Telegram**: [@vendhub_support](https://t.me/vendhub_support)

---

## License

**UNLICENSED** - Proprietary software. All rights reserved.

---

<div align="center">
  <strong>VendHub OS</strong> - Built with insights from 9 VendHub projects
  <br>
  <sub>Made with care in Uzbekistan</sub>
</div>
