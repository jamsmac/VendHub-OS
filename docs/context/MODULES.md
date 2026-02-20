# VendHub OS Module Map

> Auto-generated context for AI agents. 37+ NestJS modules.

## Module Categories

### Core Infrastructure

| Module              | Path                       | Purpose                                 |
| ------------------- | -------------------------- | --------------------------------------- |
| AppModule           | src/app.module.ts          | Root module, global guards/interceptors |
| AuthModule          | src/modules/auth/          | JWT + TOTP + Passport strategies        |
| UsersModule         | src/modules/users/         | User CRUD, password management          |
| OrganizationsModule | src/modules/organizations/ | Org CRUD, settings                      |
| DatabaseModule      | src/database/              | TypeORM config, migrations              |
| HealthModule        | src/modules/health/        | Liveness/readiness probes               |

### Business Domain

| Module           | Path                    | Purpose                                              |
| ---------------- | ----------------------- | ---------------------------------------------------- |
| MachinesModule   | src/modules/machines/   | Machine CRUD, slots, components, errors, maintenance |
| ProductsModule   | src/modules/products/   | Product catalog, recipes, batches, pricing           |
| InventoryModule  | src/modules/inventory/  | Stock tracking, transfers, reservations              |
| WarehousesModule | src/modules/warehouses/ | Warehouse management, zones, batches                 |
| LocationsModule  | src/modules/locations/  | Location CRUD, geographic data                       |
| SuppliersModule  | src/modules/suppliers/  | Supplier management                                  |

### Operations

| Module            | Path                     | Purpose                            |
| ----------------- | ------------------------ | ---------------------------------- |
| TasksModule       | src/modules/tasks/       | Task management, kanban, lifecycle |
| RoutesModule      | src/modules/routes/      | Route planning, stops              |
| TripsModule       | src/modules/trips/       | GPS tracking, anomalies, analytics |
| EmployeesModule   | src/modules/employees/   | HR, attendance, payroll, reviews   |
| MaintenanceModule | src/modules/maintenance/ | Maintenance scheduling             |

### Financial

| Module               | Path                        | Purpose                                        |
| -------------------- | --------------------------- | ---------------------------------------------- |
| PaymentsModule       | src/modules/payments/       | Payme, Click, Uzum integration                 |
| TransactionsModule   | src/modules/transactions/   | Vending transactions, collections, commissions |
| OrdersModule         | src/modules/orders/         | Order lifecycle                                |
| BillingModule        | src/modules/billing/        | SaaS billing, subscriptions, invoices          |
| ContractorsModule    | src/modules/contractors/    | Contractor management, contracts               |
| FiscalModule         | src/modules/fiscal/         | OFD/Soliq.uz fiscal receipts                   |
| ReconciliationModule | src/modules/reconciliation/ | Payment reconciliation                         |

### Customer-Facing

| Module           | Path                     | Purpose                            |
| ---------------- | ------------------------ | ---------------------------------- |
| ClientModule     | src/modules/client/      | Customer profiles, orders, wallets |
| LoyaltyModule    | src/modules/loyalty/     | Points, levels, leaderboard        |
| PromoCodesModule | src/modules/promo-codes/ | Promo code management              |
| FavoritesModule  | src/modules/favorites/   | User favorites                     |
| ComplaintsModule | src/modules/complaints/  | Complaint lifecycle, refunds       |

### Communication

| Module              | Path                       | Purpose                     |
| ------------------- | -------------------------- | --------------------------- |
| NotificationsModule | src/modules/notifications/ | Multi-channel notifications |
| WebsocketModule     | src/modules/websocket/     | Socket.IO real-time gateway |
| TelegramBotModule   | src/modules/telegram-bot/  | Telegraf bot integration    |

### Analytics & Admin

| Module             | Path                      | Purpose                                 |
| ------------------ | ------------------------- | --------------------------------------- |
| ReportsModule      | src/modules/reports/      | Report definitions, dashboards, widgets |
| AuditModule        | src/modules/audit/        | Audit logs, sessions, snapshots         |
| AlertsModule       | src/modules/alerts/       | Alert rules, history                    |
| SettingsModule     | src/modules/settings/     | System settings, AI providers           |
| IntegrationsModule | src/modules/integrations/ | External service connectors, AI parser  |
| ImportModule       | src/modules/import/       | Data import framework                   |

### Supporting

| Module              | Path                        | Purpose                                  |
| ------------------- | --------------------------- | ---------------------------------------- |
| StorageModule       | src/modules/storage/        | MinIO/S3 file storage                    |
| ReferencesModule    | src/modules/references/     | Payment providers, IKPU codes, VAT rates |
| MachineAccessModule | src/modules/machine-access/ | Machine access control                   |

## Common Infrastructure (src/common/)

| Component    | Path                           | Purpose                                      |
| ------------ | ------------------------------ | -------------------------------------------- |
| BaseEntity   | common/entities/base.entity.ts | UUID PK, audit fields, soft delete           |
| Guards       | common/guards/                 | CsrfGuard, ThrottlerGuard                    |
| Auth Guards  | modules/auth/guards/           | JwtAuthGuard, RolesGuard, OrganizationGuard  |
| Decorators   | common/decorators/             | @Roles(), @CurrentUser(), @Public(), @Auth() |
| Interceptors | common/interceptors/           | Transform, Logging, Timeout                  |
| Filters      | common/filters/                | HttpException filter                         |
| Enums        | common/enums/                  | UserRole and other shared enums              |
| DTOs         | common/dto/                    | Pagination, sorting base DTOs                |

## Global Guard Chain (APP_GUARD order)

1. **ThrottlerGuard** - Rate limiting (disabled in AGENT_MODE)
2. **CsrfGuard** - CSRF protection (disabled in AGENT_MODE)
3. **JwtAuthGuard** - JWT authentication (bypassed in AGENT_MODE)
4. **RolesGuard** - RBAC enforcement (returns true when no @Roles() metadata)
5. **OrganizationGuard** - Multi-tenant org filtering

## Apps Overview

| App    | Framework    | Port | Purpose           |
| ------ | ------------ | ---- | ----------------- |
| api    | NestJS 11    | 4000 | REST API backend  |
| web    | Next.js 16   | 3000 | Admin panel       |
| client | Vite + React | 5173 | Customer PWA      |
| bot    | Telegraf     | -    | Telegram bot      |
| mobile | Expo 52      | -    | React Native app  |
| site   | Next.js      | 3100 | Landing/marketing |
