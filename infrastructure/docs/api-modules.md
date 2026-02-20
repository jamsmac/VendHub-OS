# VendHub OS — API Modules

Complete reference for all 55 API modules in VendHub OS.

## Core Modules

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **auth** | Authentication & Authorization | User, Session, RefreshToken | POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me, GET /auth/sessions, POST /auth/password/forgot, POST /auth/password/reset, POST /auth/2fa/enable, POST /auth/2fa/verify, POST /auth/2fa/disable, POST /auth/2fa/backup-codes, GET /auth/password/requirements |
| **users** | User Management | User | GET /users, POST /users, GET /users/:id, PATCH /users/:id, DELETE /users/:id, PATCH /users/:id/role, PATCH /users/:id/organization |
| **organizations** | Multi-tenant Organizations | Organization, OrganizationHierarchy | GET /organizations, POST /organizations, GET /organizations/:id, PATCH /organizations/:id, DELETE /organizations/:id, GET /organizations/:id/hierarchy |
| **common** | Shared services, guards, decorators | BaseEntity, Logger, Filters, Guards | N/A (shared infrastructure) |

## Vending Machine Operations

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **machines** | Vending Machine Management | Machine, MachineSlot, MachineComponent, MachineLocationHistory, MachineErrorLog, MachineMaintenanceSchedule | GET /machines, POST /machines, GET /machines/stats, GET /machines/map, GET /machines/:id, PATCH /machines/:id, PATCH /machines/:id/status, PATCH /machines/:id/telemetry, DELETE /machines/:id, GET /machines/:id/slots, POST /machines/:id/slots, PATCH /machines/:id/slots/:slotId, POST /machines/:id/slots/:slotId/refill, POST /machines/:id/move, GET /machines/:id/location-history, GET /machines/:id/components, POST /machines/:id/components, DELETE /machines/:id/components/:componentId, GET /machines/:id/errors, POST /machines/:id/errors, PATCH /machines/:id/errors/:errorId/resolve, GET /machines/:id/maintenance, POST /machines/:id/maintenance, PATCH /machines/:id/maintenance/:scheduleId/complete |
| **machine-access** | Machine Access Control | MachineAccess | GET /machine-access, POST /machine-access, DELETE /machine-access/:id |
| **locations** | Location Management | Location | GET /locations, POST /locations, GET /locations/:id, PATCH /locations/:id, DELETE /locations/:id |
| **equipment** | Equipment Components & Maintenance | EquipmentComponent, HopperType, SparePart, WashingSchedule | GET /equipment, POST /equipment, GET /equipment/:id, PATCH /equipment/:id, DELETE /equipment/:id, GET /hopper-types, POST /hopper-types, GET /hopper-types/:id, PATCH /hopper-types/:id, DELETE /hopper-types/:id, GET /spare-parts, POST /spare-parts, GET /spare-parts/:id, PATCH /spare-parts/:id, DELETE /spare-parts/:id, GET /washing-schedules, POST /washing-schedules, GET /washing-schedules/:id, PATCH /washing-schedules/:id, DELETE /washing-schedules/:id |

## Inventory & Products

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **products** | Product Catalog & Recipes | Product, ProductCategory, Recipe, RecipeIngredient | GET /products, POST /products, GET /products/:id, PATCH /products/:id, DELETE /products/:id, GET /products/:id/recipes |
| **inventory** | 3-Level Inventory System | Inventory, InventoryMovement, WarehouseZone | GET /inventory, POST /inventory, GET /inventory/:id, PATCH /inventory/:id, DELETE /inventory/:id, POST /inventory/movement |
| **warehouse** | Warehouse Management | Warehouse, WarehouseZone | GET /warehouse, POST /warehouse, GET /warehouse/:id, PATCH /warehouse/:id, DELETE /warehouse/:id |
| **material-requests** | Material Request Workflow | MaterialRequest | GET /material-requests, POST /material-requests, GET /material-requests/:id, PATCH /material-requests/:id/approve, PATCH /material-requests/:id/reject |
| **opening-balances** | Stock Opening Balances | StockOpeningBalance | GET /opening-balances, POST /opening-balances, GET /opening-balances/:id, PATCH /opening-balances/:id |

## Financial

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **payments** | Payment Providers Integration | PaymentTransaction, PaymentRefund | POST /payments/payme/create, POST /payments/click/create, POST /payments/uzum/create, POST /payments/qr/generate, POST /payments/webhook/payme, POST /payments/webhook/click, POST /payments/webhook/uzum, POST /payments/refund, GET /payments/transactions, GET /payments/transactions/stats, GET /payments/transactions/:id |
| **telegram-payments** | Telegram Payments (Stars) | TelegramPayment | GET /telegram-payments, POST /telegram-payments, GET /telegram-payments/:id |
| **transactions** | Financial Transactions | Transaction | GET /transactions, POST /transactions, GET /transactions/:id, PATCH /transactions/:id |
| **billing** | Invoicing & Billing | BillingInvoice, BillingPayment | GET /billing/invoices, POST /billing/invoices, GET /billing/invoices/:id, PATCH /billing/invoices/:id/pay |
| **reconciliation** | Data Reconciliation (HW vs Transactions vs Payments) | ReconciliationReport | GET /reconciliation, POST /reconciliation/run, GET /reconciliation/:id |
| **fiscal** | Fiscal Integration (MultiKassa, Receipts) | FiscalReceipt, ZReport | POST /fiscal/receipts, GET /fiscal/receipts/:id, POST /fiscal/z-report, GET /fiscal/z-reports |

## Operations & Tasks

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **tasks** | Service Tasks with Photo Validation | Task, TaskPhoto | GET /tasks, POST /tasks, GET /tasks/:id, PATCH /tasks/:id, DELETE /tasks/:id, PATCH /tasks/:id/assign, PATCH /tasks/:id/complete |
| **maintenance** | Extended Maintenance Workflow | Maintenance, MaintenanceSchedule | GET /maintenance, POST /maintenance, GET /maintenance/:id, PATCH /maintenance/:id, DELETE /maintenance/:id |
| **routes** | Route Planning & Optimization | Route, RouteStop | GET /routes, POST /routes, GET /routes/:id, PATCH /routes/:id, DELETE /routes/:id, POST /routes/:id/optimize |
| **work-logs** | Work Logs & Time Tracking | WorkLog | GET /work-logs, POST /work-logs, GET /work-logs/:id, PATCH /work-logs/:id |
| **incidents** | Incident Management | Incident | GET /incidents, POST /incidents, GET /incidents/:id, PATCH /incidents/:id/resolve |

## Customer Engagement

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **complaints** | QR-Code Complaints with SLA | Complaint, ComplaintComment | GET /complaints, POST /complaints, GET /complaints/:id, PATCH /complaints/:id/resolve, POST /complaints/:id/comments |
| **loyalty** | Loyalty & Rewards Program | LoyaltyAccount, PointsTransaction | GET /loyalty/account, POST /loyalty/earn, POST /loyalty/redeem, GET /loyalty/history |
| **quests** | Quests & Achievements | Quest, UserQuest | GET /quests, POST /quests, GET /quests/:id, POST /quests/:id/start, POST /quests/:id/complete |
| **referrals** | Referral Program | Referral | GET /referrals, POST /referrals, GET /referrals/stats |
| **favorites** | User Favorites | Favorite | GET /favorites, POST /favorites, DELETE /favorites/:id |
| **promo-codes** | Promo Codes & Discounts | PromoCode, PromoCodeRedemption | GET /promo-codes, POST /promo-codes, GET /promo-codes/:code/validate, POST /promo-codes/:code/redeem |
| **recommendations** | Product Recommendations Engine | N/A (computed) | GET /recommendations/products, GET /recommendations/machines |

## B2C Client

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **client** | Client B2C (Customer-facing) | ClientUser, ClientWallet, ClientWalletLedger, ClientLoyaltyAccount, ClientLoyaltyLedger, ClientOrder, ClientPayment | GET /client/profile, PATCH /client/profile, GET /client/wallet, GET /client/wallet/ledger, GET /client/loyalty, GET /client/loyalty/ledger, GET /client/orders, GET /client/orders/:id, POST /client/orders, GET /client/payments |
| **orders** | Orders Management | Order, OrderItem | GET /orders, POST /orders, GET /orders/:id, PATCH /orders/:id/status, DELETE /orders/:id |
| **purchase-history** | Purchase History & Tracking | PurchaseHistory | GET /purchase-history, GET /purchase-history/:id |

## Integrations & Communications

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **telegram-bot** | Telegram Bot for Staff & Customers | TelegramUser, TelegramMessageLog, TelegramSettings, TelegramBotAnalytics | GET /telegram-bot/webhook-info, POST /telegram-bot/set-webhook, DELETE /telegram-bot/delete-webhook, GET /telegram-bot/users, GET /telegram-bot/analytics |
| **notifications** | Multi-Channel Notifications | Notification, PushSubscription, FCMToken | GET /notifications, POST /notifications, PATCH /notifications/:id/read, POST /notifications/subscribe |
| **webhooks** | Webhooks for External Integrations | Webhook | GET /webhooks, POST /webhooks, GET /webhooks/:id, DELETE /webhooks/:id, POST /webhooks/:id/test |
| **integrations** | Universal Integrations (AI-powered) | Integration, IntegrationConfig | GET /integrations, POST /integrations, GET /integrations/:id, PATCH /integrations/:id, DELETE /integrations/:id |
| **geo** | Geo & Google Maps Integration | N/A (external API) | GET /geo/geocode, GET /geo/reverse-geocode, GET /geo/distance |

## AI & Data

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **ai** | AI-Powered Features (Import, Analysis, Suggestions) | N/A (external AI) | POST /ai/analyze, POST /ai/suggest, POST /ai/chat |
| **import** | Data Import (CSV, Excel, JSON) | ImportSession, ImportAuditLog, SchemaDefinition, ValidationRule | POST /import/upload, GET /import/sessions, GET /import/sessions/:id, POST /import/validate, POST /import/execute |
| **sales-import** | Sales Data Import | SalesImport | POST /sales-import/upload, GET /sales-import/sessions, GET /sales-import/sessions/:id |

## Reporting & Analytics

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **reports** | Reports & Analytics | Report, AnalyticsSnapshot | GET /reports, POST /reports, GET /reports/:id, GET /reports/analytics, GET /reports/vendhub |
| **monitoring** | Application Monitoring & Metrics | N/A (Prometheus metrics) | GET /monitoring/metrics, GET /monitoring/health |
| **audit** | Comprehensive Audit Trail | AuditLog | GET /audit, GET /audit/:id |

## System & Security

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **health** | Health Checks (liveness, readiness) | N/A | GET /health, GET /health/live, GET /health/ready, GET /health/detailed |
| **security** | Security Events & Encryption | SecurityEvent, DataEncryption | GET /security/events, POST /security/events, GET /security/encrypt, POST /security/decrypt |
| **rbac** | Role-Based Access Control | Role, Permission | GET /rbac/roles, POST /rbac/roles, GET /rbac/permissions, POST /rbac/permissions |
| **settings** | System Settings & Configuration | SystemSetting, AIProviderKey | GET /settings, PATCH /settings/:key, GET /settings/ai-providers |
| **storage** | File Storage (S3/CloudFront) | N/A (external S3) | POST /storage/upload, GET /storage/download/:key, DELETE /storage/delete/:key |
| **websocket** | WebSocket Real-time Events | N/A (Socket.IO) | WebSocket connection at /ws |

## HR & Team Management

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **employees** | Employee Management | Employee, Department, Position, Attendance, LeaveRequest, Payroll, PerformanceReview | GET /employees, POST /employees, GET /employees/:id, PATCH /employees/:id, DELETE /employees/:id, GET /departments, POST /departments, GET /positions, POST /positions, GET /attendance, POST /attendance, GET /leave-requests, POST /leave-requests, GET /payroll, POST /payroll, GET /performance-reviews, POST /performance-reviews |
| **contractors** | Contractor Management | Contractor, Contract | GET /contractors, POST /contractors, GET /contractors/:id, PATCH /contractors/:id, DELETE /contractors/:id, GET /contracts, POST /contracts, GET /contracts/:id, PATCH /contracts/:id |
| **operator-ratings** | Operator Performance Ratings | OperatorRating | GET /operator-ratings, POST /operator-ratings, GET /operator-ratings/:operatorId |

## Reference Data

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **references** | Reference Data (Currencies, Countries, etc.) | GoodsClassifier, IKPUCode, VATRate, PackageType, PaymentProvider | GET /references/currencies, GET /references/countries, GET /references/goods-classifiers, GET /references/ikpu-codes, GET /references/vat-rates, GET /references/package-types, GET /references/payment-providers |
| **alerts** | Alert Rules & Monitoring | AlertRule, AlertLog | GET /alerts, POST /alerts, GET /alerts/:id, PATCH /alerts/:id, DELETE /alerts/:id |

## Admin Tools

| Module | Purpose | Key Entities | Endpoints |
|--------|---------|--------------|-----------|
| **bull-board** | Queue Dashboard (BullBoard UI) | N/A (BullBoard UI) | GET /admin/queues (UI interface) |

## API Architecture Notes

### Global Guards

Applied in order:
1. **ThrottlerGuard**: Rate limiting (10/sec, 50/10sec, 100/min)
2. **JwtAuthGuard**: JWT authentication (skip with @Public())
3. **RolesGuard**: Role-based access (configured with @Roles())
4. **OrganizationGuard**: Multi-tenant filtering

### Global Interceptors

1. **LoggingInterceptor**: Request/response logging
2. **TransformInterceptor**: Response standardization
3. **TimeoutInterceptor**: Request timeout (default 30s)

### Global Exception Filter

- **HttpExceptionFilter**: Consistent error responses

### Authentication

- **JWT Bearer Token**: Required for all endpoints except @Public()
- **API Key**: Alternative auth via X-API-Key header for M2M
- **2FA**: Optional TOTP for enhanced security

### Multi-Tenancy

All data is filtered by `organization_id` via OrganizationGuard. Owner role can access multiple organizations.

### Soft Deletes

All entities use soft delete via `deleted_at` (from BaseEntity). Use `.softDelete()` and `.restore()`.

### Pagination

Standard query params: `?page=1&limit=10&search=query`

### API Versioning

- Base path: `/api/v1/`
- Swagger docs: `/docs`
- Health: `/health`, `/ready`

### Rate Limiting

- Short: 10 requests/second
- Medium: 50 requests/10 seconds
- Long: 100 requests/minute

Custom limits per-endpoint via `@Throttle()` decorator.
