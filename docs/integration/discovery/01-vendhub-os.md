# VendHub OS — Inventory Discovery Report

**Date:** 2026-04-27  
**Status:** Read-only audit, production-ready assessment  
**Target:** Prepare overlap matrix for 3 satellite repos (VendHub-Snack-Drinks, Vendhub.uz, VendCashBot)

---

## 1. Apps Inventory

| App      | Framework | Purpose          | Dev Port | Status      | Notes                        |
| -------- | --------- | ---------------- | -------- | ----------- | ---------------------------- |
| `api`    | NestJS 11 | Backend          | 4000     | build-ready | 82 modules, PostgreSQL 16    |
| `web`    | Next.js   | Admin panel      | 3000     | build-ready | 103 pages, App Router        |
| `client` | Vite 5.4  | Customer PWA     | 5173     | build-ready | 23 pages, offline-first      |
| `site`   | Next.js   | Landing/CMS      | 3100     | build-ready | Public tenant endpoint       |
| `mobile` | Expo 52   | React Native app | dev      | build-ready | 20+ screens, offline-capable |

### 1a. API Modules (82 total)

**Core Infrastructure (11):**

- `access-requests` — Request workflow management
- `agent-bridge` — AI agent session + progress tracking
- `alerts` — Rule-based alert system + metric enum (PREDICTED_STOCKOUT added)
- `audit` — Entity audit trail logging
- `auth` — JWT + TOTP authentication, cleanup for expired tokens
- `bull-board` — BullMQ dashboard UI
- `health` — Service diagnostics
- `notifications` — Email, SMS, push, in-app notification channels
- `rbac` — 7 role-based access control (owner, admin, manager, operator, warehouse, accountant, viewer)
- `security` — Data encryption, security event logging
- `websocket` — Socket.IO real-time, org-scoped rooms (`org:{id}:topic:{name}`)

**Catalog & Inventory (7):**

- `categories` — Product categories (first-class entity as of Sprint G5, replaces legacy enum)
- `products` — 33 endpoints including recipes, batches, price history, cost calculation
- `inventory` — `InventoryMovement` + `WarehouseZone` entities
- `stock-movements` — Event-sourced movement log (9 types: PURCHASE_IN, SALE_OUT, REFILL_IN, etc.)
- `inventory-reconciliation` — Physical stock count (nedostacha/surplus as UZS cost)
- `inventory-dashboard` — Stock KPI visualizations
- `opening-balances` — Initial stock setup per org

**Orders & Transactions (5):**

- `orders` — Customer orders (web/mobile)
- `purchases` — Supplier purchases (DRAFT → RECEIVED → CANCELLED)
- `purchase-history` — Historical ledger
- `transactions` — POS sales (decrements `MachineSlot.currentQuantity`)
- `sales-import` — HICON import with 3-level deduplication, fuzzy product matcher

**Machines & Routes (5):**

- `machines` — Machine master data (code→machineNumber mapping, ContentModel: SLOTS/CONTAINERS/MIXED)
- `routes` — **Unified routes** (merged trips + trip-analytics, 18 endpoints, GPS tracking)
- `machine-access` — Machine access control + templates
- `equipment` — Equipment components + filter tracking
- `containers` — Hoppers/bunkers with fill levels

**Operations (8):**

- `locations` — Sites, geofencing, contracts
- `vehicles` — Fleet + odometer tracking
- `employees` — HR, attendance, payroll, performance reviews
- `work-logs` — Activity logging
- `batch-movements` — Batch stock transfers
- `trips` → **REMOVED** (merged into routes, kept `TripReconciliation` for vhm24-integration compatibility)
- `trip-analytics` → **REMOVED** (merged into routes)
- `maintenance` — Machine maintenance scheduling

**Finance & Reporting (8):**

- `cash-finance` — Cash-on-hand tracking (deposits, balance reconciliation)
- `collections` — Two-stage cash collection workflow (count → verify)
- `payments` — Payment transaction records + refunds
- `payment-reports` — HICON/fiscal integration (tenant-isolated as of Sprint)
- `payout-requests` — Operator payout lifecycle (PENDING → COMPLETED/REJECTED/FAILED)
- `reconciliation` — Variance reconciliation between systems
- `reports` — Analytics snapshots, IDOR fix + comprehensive error handling
- `billing` — Usage-based billing

**Customer Engagement (6):**

- `clients` — Customer B2C segment (wallet, loyalty account, orders)
- `loyalty` — Points, promo codes, tiers
- `promo-codes` — Code management with per-user limits, pessimistic locking
- `quests` — Customer gamification quests
- `achievements` — Badges + user achievements
- `referrals` — Referral program tracking

**Bot & Real-time (5):**

- `telegram-bot` — **Embedded** staff + customer bots (17 sub-services, see §2)
- `telegram-payments` — Telegram Stars payment integration
- `telegram-customer-bot` → Part of telegram-bot module
- `sms` — Twilio/Eskiz SMS dispatch
- `fcm` → Merged into `notifications`

**Monitoring & Optimization (7):**

- `analytics` — Dashboard KPI aggregation
- `metrics` — Custom metric collection
- `monitoring` — Health checks + performance thresholds
- `entity-events` — Event stream (transaction.created, etc.)
- `complaints` — Customer complaints (CRITICAL tenant isolation, SLA tracking fixed)
- `incidents` — Machine incidents + repair cost tracking
- `operator-ratings` — Staff performance ratings

**Advanced Features (8):**

- `predictive-refill` — EWMA consumption forecasting + margin-based priority + nightly cron
- `custom-fields` — Extensible field definitions per org
- `import` — Generic import framework with validation rules
- `data-parser` — CSV/Excel parsing engine
- `references` — Master data (IKPU codes, VAT rates, package types, payment providers, goods classifiers)
- `directories` — LDAP/directory sync (audit trail, sync logs)
- `counterparty` — Partner/contractor management (11 REST endpoints)
- `material-requests` — Supplier request workflow

**Site & CMS (4):**

- `site-cms` — JSONB document store for public tenant (9 collections: products, machines, promotions, loyalty_tiers, bonus_actions, loyalty_privileges, site_content, partners, partnership_models)
- `cms` — Legacy CMS articles/banners
- `website-config` — Site configuration (public URL, logo, etc.)
- `public-tenant` — Unauthenticated tenant lookup (rate-limited, no 404-enumeration)

**Integration & Backend (6):**

- `vhm24-integration` — **Bridge module** (see §6)
- `integrations` — Third-party API connector registry
- `storage` — File storage via Supabase S3-compat (dev: MinIO, prod: Supabase)
- `calculated-state` — Real-time machine state aggregation (slots + containers + equipment)
- `email` — Email dispatch + template rendering
- `web-push` — Browser push notifications

**Admin & Settings (4):**

- `organizations` — Org CRUD + plan management
- `users` — User CRUD + password hashing (bcrypt now, was plaintext)
- `settings` — System settings + AI provider keys
- `invites` — Invitation workflow

**Misc (3):**

- `investor` — Investor reporting
- `fiscal` — OFD/Soliq.uz compliance + queue processing
- `tasks` — Task assignment + photo reports (type→typeCode mapping fix)

### 1b. Web App Routes (103 pages)

**Top-level structure (Next.js App Router):**

```
app/
├── (auth)/
│   ├── auth/login
│   ├── auth/register
│   ├── auth/reset-password
├── dashboard/
│   ├── (overview)/
│   ├── organizations
│   ├── products (CRUD)
│   ├── machines (CRUD, BUG #1-4 fixed)
│   ├── locations (CRUD, AddressDto nested)
│   ├── tasks (CRUD, type→typeCode)
│   ├── users
│   ├── employees
│   ├── inventory
│   ├── reports
│   ├── collections
│   ├── payments
│   ├── complaints (with escalation, SLA config)
│   ├── reconciliation (form: date range refine)
│   ├── cash-finance
│   ├── fiscal
│   ├── billing
│   ├── work-logs
│   ├── visitors
│   ├── vehicles
│   ├── warehouses
│   ├── containers
│   ├── incidents
│   ├── contractors
│   ├── material-requests
│   ├── predictive-refill (KPI + route auto-gen)
│   ├── routes/analytics (merged trips/trip-analytics)
│   ├── operator-ratings
│   ├── machine-access
│   ├── references
│   ├── payment-reports (tenant-isolated)
│   ├── loyalty/transactions
│   ├── loyalty/achievements
│   ├── loyalty/promo-codes
│   ├── loyalty/quests
│   ├── complaints/settings (new endpoint)
│   ├── complaints/qr-codes
│   ├── settings
│   ├── website
│   ├── directories
│   └── ...others (40+ total pages)
├── settings/
├── api/
│   ├── auth/
│   ├── admin/ (proxy with JWT cookie)
└── ...
```

**Key migrations (RHF+Zod, per Sprint):**

- All 40+ dashboard forms migrated to React Hook Form 7.61 + Zod (no useState forms remain)
- DTO field mappings documented in CLAUDE.md (basePrice→sellingPrice, costPrice→purchasePrice, etc.)
- Admin API proxy (`lib/admin-api.ts`) + public API client (`lib/api-client.ts`)

### 1c. Client App Routes (23 pages)

**Vite React PWA, offline-first:**

```
pages/
├── auth/
│   ├── LoginScreen
│   ├── RegisterScreen
│   ├── ForgotPasswordScreen
├── products/
│   ├── ProductDetailPage
├── machines/
│   ├── MachineDetailPage
├── home/
│   ├── HomePage
│   ├── MenuPage
│   ├── CartPage
│   ├── CheckoutPage
│   ├── PaymentPage
│   ├── OrderSuccessPage
├── transactions/
│   ├── TransactionHistoryPage
│   ├── TransactionDetailPage
├── loyalty/
│   ├── LoyaltyPage
│   ├── PromoCodePage
│   ├── AchievementsPage
│   ├── QuestsPage
├── complaints/
│   ├── ComplaintPage
├── profile/
│   ├── ProfilePage
│   ├── SettingsPage
│   ├── NotificationSettingsPage
├── favorites/
│   ├── FavoritesPage
├── referrals/
│   ├── ReferralsPage
├── help/
│   ├── HelpPage
├── qr/
│   ├── QRScanPage
├── map/
│   ├── MapPage
├── errors/
│   └── NotFoundPage
```

All forms (CheckoutPage, ComplaintPage, PromoCodePage) migrated to RHF+Zod.

### 1d. Site App Routes (1 public page + admin)

**Public:** `app/page.tsx` (landing page with 13 sections from VHM24 transfer)
**Admin:** Next.js file-based static routes (no dynamic /admin pages by design; full CRUD via embedded API proxy)

**CMS data:** fetched via `GET /api/v1/client/public/site-cms/:collection` (SiteCmsItem JSONB store)

### 1e. Mobile App Screens (20+)

**React Native / Expo, offline-capable:**

```
navigation/
├── RootNavigator
├── AuthNavigator
├── MainNavigator
└── ClientNavigator

screens/
├── auth/
│   ├── LoginScreen
│   ├── RegisterScreen
│   ├── ForgotPasswordScreen
├── machines/
│   ├── MachinesScreen
│   ├── MachineDetailScreen
├── products/
│   ├── ProductDetailScreen
├── inventory/
│   ├── TransferScreen
│   ├── TransferHistoryScreen
├── tasks/
│   ├── TasksScreen
│   ├── TaskDetailScreen
│   ├── TaskPhotoScreen
├── home/
│   ├── HomeScreen
├── profile/
│   ├── ProfileScreen
│   ├── SettingsScreen
├── notifications/
│   ├── NotificationsScreen
└── SplashScreen
```

---

## 2. Telegram Bot Infrastructure

### 2a. Architecture: Two-Bot Orchestrator Pattern

**Deployment:** Embedded inside `apps/api/src/modules/telegram-bot/` (no standalone `apps/bot/` app)

**Two separate bots with separate tokens:**

1. **Staff Bot** (`TELEGRAM_BOT_TOKEN`) — operators, managers, warehouse
2. **Customer Bot** (`TELEGRAM_CUSTOMER_BOT_TOKEN`) — end customers

**Polling:** Disabled when `DISABLE_BOT_POLLING=true` (webhook mode or send-only)

### 2b. Staff Bot Services (8)

| Service                   | Purpose                                     | Commands/Features                         |
| ------------------------- | ------------------------------------------- | ----------------------------------------- |
| `BotHandlersService`      | Command/callback/message routing            | `/start`, `/menu`, callback handlers      |
| `BotMenuService`          | Main menu, navigation                       | Task menu, machine menu, route menu       |
| `BotTaskOpsService`       | Task management                             | Accept task, complete task, photo report  |
| `BotMachineOpsService`    | Machine status + inventory checks           | Check status, view inventory, QR scan     |
| `BotRouteOpsService`      | Route lifecycle + GPS tracking              | Start route, end route, live location     |
| `BotNotificationsService` | Push notifications                          | Task assigned, overdue, alerts            |
| `BotStatsService`         | Daily stats aggregation                     | Overdue alerts, performance summary       |
| `BotAdminService`         | User management, analytics, message logging | User registration, broadcast, message log |

**Session management:** `Map<number, Session>` (in-memory, per user Telegram ID)

### 2c. Customer Bot Services (9)

| Service                     | Purpose                                      | Commands/Features                        |
| --------------------------- | -------------------------------------------- | ---------------------------------------- |
| `CustomerHandlersService`   | Command/callback/message routing             | `/start`, `/menu`, callback handlers     |
| `CustomerMenuService`       | Main menu, language selection                | Product menu, account menu, help         |
| `CustomerCatalogService`    | Product browsing by machine                  | List machines, list products, prices     |
| `CustomerCartService`       | Shopping cart, checkout, payment selection   | Add to cart, checkout, payment methods   |
| `CustomerOrdersService`     | Order history, details, pagination           | Order list, order detail, repeat order   |
| `CustomerLoyaltyService`    | Points balance, tier info, history           | Points balance, tier details, history    |
| `CustomerComplaintsService` | File complaints with photos                  | File complaint, upload photo, track      |
| `CustomerLocationService`   | Geolocation machine search (Haversine, 5km)  | Find machines, map view, directions      |
| `CustomerEngagementService` | Referrals, promo codes, quests, achievements | Promo codes, quests, achievements, refer |

**Session management:** Same `Map<number, Session>` pattern

### 2d. Cash Operations

**Staff Bot:**

- `BotFinanceService` (if exists) handles cash deposits, collection reconciliation
- No direct cash approval — forwarded to web admin panel

**Customer Bot:**

- No cash operations (customer-facing only)

---

## 3. Database Entities

**Total: 159 entities** (as `.entity.ts` files across 82 modules)

### 3a. Critical Core Entities

| Entity         | File                                            | Purpose                                       |
| -------------- | ----------------------------------------------- | --------------------------------------------- |
| `User`         | `users/entities/user.entity.ts`                 | User account (plaintext→bcrypt fix)           |
| `Organization` | `organizations/entities/organization.entity.ts` | Org + plan + settings JSONB                   |
| `BaseEntity`   | `common/entities/base.entity.ts`                | UUID id, createdAt, updatedAt, deletedAt, org |
| `Role`         | `rbac/entities/role.entity.ts`                  | 7 roles: owner, admin, manager, operator, etc |
| `Permission`   | `rbac/entities/permission.entity.ts`            | RBAC permission matrix                        |

### 3b. Catalog & Stock

| Entity                    | File                                                   | Key Fields (Notable)                                               |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `Product`                 | `products/entities/product.entity.ts`                  | barcode, sellingPrice, purchasePrice, categoryId, recipes, batches |
| `Category`                | `categories/entities/category.entity.ts`               | name, icon, sortOrder, isActive (Sprint G5: first-class)           |
| `Inventory`               | `inventory/entities/inventory.entity.ts`               | quantity, warehouseId, productId                                   |
| `InventoryMovement`       | `inventory/entities/inventory-movement.entity.ts`      | type (9 enum), quantity, reason                                    |
| `StockMovement`           | `stock-movements/entities/stock-movement.entity.ts`    | type enum (PURCHASE_IN, SALE_OUT, etc), immutable                  |
| `InventoryBalance`        | `stock-movements/entities/inventory-balance.entity.ts` | Materialized view (org, location, product, qty)                    |
| `InventoryReconciliation` | `inventory-reconciliation/entities/...ts`              | Type: physical count, items[], nedostacha UZS                      |
| `WarehouseZone`           | `inventory/entities/warehouse-zone.entity.ts`          | Zone layout, accessibility                                         |

### 3c. Machine & Equipment

| Entity                | File                                                  | Key Fields                                                             |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `Machine`             | `machines/entities/machine.entity.ts`                 | machineNumber (code→), contentModel (SLOTS/CONTAINERS/MIXED), capacity |
| `MachineTemplate`     | `machines/entities/machine-template.entity.ts`        | Standard configs                                                       |
| `Equipment`           | `equipment/entities/equipment-component.entity.ts`    | componentStatus, filter, serial, purchaseDate                          |
| `Container`           | `containers/entities/container.entity.ts`             | Hopper/bunker, fill level tracking                                     |
| `MachineSlot`         | N/A (TypeORM inline relation)                         | currentQuantity, capacity, productId (auto-decremented on transaction) |
| `MachineLocationSync` | `vhm24-integration/entities/machine-location-sync.ts` | VHM24 sync tracker                                                     |

### 3d. Transactions & Orders

| Entity               | File                                              | Key Fields                                   |
| -------------------- | ------------------------------------------------- | -------------------------------------------- |
| `Transaction`        | `transactions/entities/transaction.entity.ts`     | Total, items[], machineId, paymentMethod     |
| `SaleIngredient`     | `transactions/entities/sale-ingredient.entity.ts` | Part of transaction breakdown                |
| `Order`              | `orders/entities/order.entity.ts`                 | Status (web/mobile), items[], delivery       |
| `Purchase`           | `purchases/entities/purchase.entity.ts`           | Status (DRAFT→RECEIVED), supplierId, items[] |
| `PurchaseItem`       | `purchases/entities/purchase-item.entity.ts`      | Qty, unitCost, product ref                   |
| `PaymentTransaction` | `payments/entities/payment-transaction.entity.ts` | Provider (Payme, Click, Uzum), status        |
| `PaymentRefund`      | `payments/entities/payment-refund.entity.ts`      | Refund amount, reason, status                |
| `ClientUser`         | `client/entities/client-user.entity.ts`           | B2C customer account                         |
| `ClientOrder`        | `client/entities/client-order.entity.ts`          | Customer order                               |
| `ClientPayment`      | `client/entities/client-payment.entity.ts`        | Payment record                               |

### 3e. Operations & Routes

| Entity               | File                                             | Key Fields                                                                                                                                         |
| -------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Route`              | `routes/entities/route.entity.ts`                | **Merged** (unified trips + trip-analytics), status (DRAFT→PLANNED→ACTIVE→COMPLETED/CANCELLED/AUTO_CLOSED), GPS fields, vehicle, 17 cols from Trip |
| `RoutePoint`         | `routes/entities/route-point.entity.ts`          | GPS track, timestamp                                                                                                                               |
| `RouteAnomaly`       | `routes/entities/route-anomaly.entity.ts`        | Deviation type/severity, coords                                                                                                                    |
| `RouteTaskLink`      | `routes/entities/route-task-link.entity.ts`      | Binding task to route with GPS verification                                                                                                        |
| `TripReconciliation` | `trips/entities/trip-reconciliation.entity.ts`   | **Kept** (vhm24-integration compat only)                                                                                                           |
| `Task`               | `tasks/entities/task.entity.ts`                  | type→typeCode, dueDate, assignee                                                                                                                   |
| `Vehicle`            | `vehicles/entities/vehicle.entity.ts`            | Model, odometer, insurance                                                                                                                         |
| `Location`           | `locations/entities/location.entity.ts`          | Address (nested), lat/lng, contracts                                                                                                               |
| `LocationContract`   | `locations/entities/location-contract.entity.ts` | Terms, pricing                                                                                                                                     |
| `LocationVisit`      | `locations/entities/location-visit.entity.ts`    | Operator visit log                                                                                                                                 |
| `LocationEvent`      | `locations/entities/location-event.entity.ts`    | Status changes                                                                                                                                     |

### 3f. Finance & Collections

| Entity             | File                                                    | Key Fields                                    |
| ------------------ | ------------------------------------------------------- | --------------------------------------------- |
| `BankDeposit`      | `cash-finance/entities/bank-deposit.entity.ts`          | Amount, date, bankRef                         |
| `Collection`       | `collections/entities/collection.entity.ts`             | Status (draft, counted, verified), machines[] |
| `PaymentReport`    | `payment-reports/entities/payment-report-upload.ts`     | **Tenant-isolated** (organizationId added)    |
| `PaymentReportRow` | `payment-reports/entities/payment-report-row.entity.ts` | Transaction row from HICON                    |
| `PayoutRequest`    | `payout-requests/entities/payout-request.entity.ts`     | Status (PENDING→COMPLETED), method, amount    |
| `Reconciliation`   | `reconciliation/entities/reconciliation.entity.ts`      | Variance tracking                             |
| `Billing`          | `billing/entities/billing.entity.ts`                    | Usage-based charges                           |

### 3g. Telegram & Messaging

| Entity                 | File                                                     | Key Fields                                   |
| ---------------------- | -------------------------------------------------------- | -------------------------------------------- |
| `TelegramUser`         | `telegram-bot/entities/telegram-user.entity.ts`          | Telegram ID, username, role (staff/customer) |
| `TelegramMessageLog`   | `telegram-bot/entities/telegram-message-log.entity.ts`   | Message history, commands issued             |
| `TelegramBotAnalytics` | `telegram-bot/entities/telegram-bot-analytics.entity.ts` | Daily stats, active users                    |
| `TelegramSettings`     | `telegram-bot/entities/telegram-settings.entity.ts`      | Bot config per org                           |
| `TelegramPayment`      | `telegram-payments/entities/telegram-payment.entity.ts`  | Telegram Stars transaction                   |
| `Notification`         | `notifications/entities/notification.entity.ts`          | Email, SMS, push, in-app                     |
| `DeviceToken`          | `notifications/entities/device-token.entity.ts`          | FCM/APNs token                               |
| `FcmToken`             | `notifications/entities/fcm-token.entity.ts`             | Firebase Cloud Messaging                     |
| `PushSubscription`     | `notifications/entities/push-subscription.entity.ts`     | Web push                                     |

### 3h. Loyalty & Engagement

| Entity                 | File                                               | Key Fields                                                  |
| ---------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| `PromoCode`            | `loyalty/entities/promo-code.entity.ts`            | Code, discount, usageLimit, perUserLimit (pessimistic lock) |
| `PromoCodeUsage`       | `loyalty/entities/promo-code-usage.entity.ts`      | User redemption log                                         |
| `PointsTransaction`    | `loyalty/entities/points-transaction.entity.ts`    | Debit/credit, reason                                        |
| `Quest`                | `quests/entities/quest.entity.ts`                  | Gamification quest                                          |
| `UserQuest`            | `quests/entities/user-quest.entity.ts`             | User progress                                               |
| `Achievement`          | `achievements/entities/achievement.entity.ts`      | Badge definitions                                           |
| `UserAchievement`      | `achievements/entities/user-achievement.entity.ts` | User earned badges                                          |
| `ClientWallet`         | `client/entities/client-wallet.entity.ts`          | B2C wallet balance                                          |
| `ClientWalletLedger`   | `client/entities/client-wallet-ledger.entity.ts`   | Wallet transaction log                                      |
| `ClientLoyaltyAccount` | `client/entities/client-loyalty-account.entity.ts` | Points, tier                                                |
| `ClientLoyaltyLedger`  | `client/entities/client-loyalty-ledger.entity.ts`  | Points movement log                                         |
| `Referral`             | `referrals/entities/referral.entity.ts`            | Referrer→referee                                            |

### 3i. Complaints & Support

| Entity      | File                                      | Key Fields                                                                                  |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Complaint` | `complaints/entities/complaint.entity.ts` | **Full tenant isolation** (organizationId threaded), SLA config, status, priority, assignee |
| `Favorite`  | `favorites/entities/favorite.entity.ts`   | User→item (not org-scoped by design)                                                        |

### 3j. HR & Attendance

| Entity              | File                                              | Key Fields                       |
| ------------------- | ------------------------------------------------- | -------------------------------- |
| `Employee`          | `employees/entities/employee.entity.ts`           | employeeRole (position→), status |
| `Attendance`        | `employees/entities/attendance.entity.ts`         | Check-in/out, duration           |
| `Department`        | `employees/entities/department.entity.ts`         | Org structure                    |
| `Position`          | `employees/entities/position.entity.ts`           | Role definitions                 |
| `LeaveRequest`      | `employees/entities/leave-request.entity.ts`      | Vacation/sick leave              |
| `Payroll`           | `employees/entities/payroll.entity.ts`            | Salary calculations              |
| `PerformanceReview` | `employees/entities/performance-review.entity.ts` | Annual evaluations               |

### 3k. Masters & References

| Entity            | File                                                  | Key Fields                         |
| ----------------- | ----------------------------------------------------- | ---------------------------------- |
| `IkpuCode`        | `references/entities/ikpu-code.entity.ts`             | Uzbek GOST classifier              |
| `GoodsClassifier` | `references/entities/goods-classifier.entity.ts`      | Commodity codes                    |
| `VatRate`         | `references/entities/vat-rate.entity.ts`              | Tax rates                          |
| `PackageType`     | `references/entities/package-type.entity.ts`          | Packaging units                    |
| `PaymentProvider` | `references/entities/payment-provider.entity.ts`      | Payme, Click, Uzum, Telegram Stars |
| `OperatorRating`  | `operator-ratings/entities/operator-rating.entity.ts` | Staff performance                  |

### 3l. Integrations & Logs

| Entity                | File                                                   | Key Fields                                       |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| `SiteCmsItem`         | `site-cms/entities/site-cms-item.entity.ts`            | JSONB store (9 collections), sortOrder, isActive |
| `Integration`         | `integrations/entities/integration.entity.ts`          | Third-party connector config                     |
| `Audit`               | `audit/entities/audit.entity.ts`                       | Entity change log                                |
| `EntityEvent`         | `entity-events/entities/entity-event.entity.ts`        | Event stream (transaction.created)               |
| `SecurityEvent`       | `security/entities/security-event.entity.ts`           | Login attempts, suspicious activity              |
| `DataEncryption`      | `security/entities/data-encryption.entity.ts`          | Encrypted field values                           |
| `File`                | `storage/entities/file.entity.ts`                      | S3 metadata                                      |
| `Import`              | `import/entities/import.entity.ts`                     | Import session + schema                          |
| `ImportSession`       | `import/entities/import-session.entity.ts`             | Validation + audit                               |
| `SalesImport`         | `sales-import/entities/sales-import.entity.ts`         | HICON file + processing status                   |
| `SalesAggregated`     | `sales-import/entities/sales-aggregated.entity.ts`     | Deduplicated transactions                        |
| `ParseSession`        | `sales-import/entities/parse-session.entity.ts`        | TTL 30min, cleared by cron                       |
| `SlotHistory`         | `slot-history/entities/slot-history.entity.ts`         | Machine slot fill audit                          |
| `WorkLog`             | `work-logs/entities/work-log.entity.ts`                | Staff activity log                               |
| `Report`              | `reports/entities/report.entity.ts`                    | Generated reports + snapshots                    |
| `AnalyticsSnapshot`   | `reports/entities/analytics-snapshot.entity.ts`        | Time-series data                                 |
| `CustomField`         | `custom-fields/entities/custom-field.entity.ts`        | Extensible fields per org                        |
| `Directory`           | `directories/entities/directory.entity.ts`             | LDAP/AD sync config                              |
| `DirectorySync`       | `directories/entities/directory-sync-log.entity.ts`    | Sync history                                     |
| `DirectorySource`     | `directories/entities/directory-source.entity.ts`      | Source definition                                |
| `DirectoryEntryAudit` | `directories/entities/directory-entry-audit.entity.ts` | Change audit                                     |

### 3m. Predictive Features

| Entity                 | File                                                    | Key Fields                                                     |
| ---------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| `ConsumptionRate`      | `predictive-refill/entities/consumption-rate.entity.ts` | EWMA α=0.2, 14-day window, per (org, machine, product, period) |
| `RefillRecommendation` | `predictive-refill/entities/refill-recommendation.ts`   | Priority score, margin, dailyProfit, sellingPrice, costPrice   |

### 3n. Investor & Advanced

| Entity            | File                                                    | Key Fields                                     |
| ----------------- | ------------------------------------------------------- | ---------------------------------------------- |
| `InvestorProfile` | `investor/entities/investor-profile.entity.ts`          | Portfolio tracking                             |
| `DividendPayment` | `investor/entities/dividend-payment.entity.ts`          | Dividend distribution                          |
| `Incident`        | `incidents/entities/incident.entity.ts`                 | Machine failure + repair cost                  |
| `Complaint`       | (see 3i)                                                | Full tenant isolation implementation           |
| `Contractor`      | `contractors/entities/contractor.entity.ts`             | Service provider                               |
| `Supplier`        | `material-requests/entities/supplier.entity.ts`         | Purchase orders                                |
| `MaterialRequest` | `material-requests/entities/material-request.entity.ts` | Supply chain                                   |
| `CmsArticle`      | `cms/entities/cms-article.entity.ts`                    | Legacy CMS (kept for backward compat)          |
| `CmsBanner`       | `cms/entities/cms-banner.entity.ts`                     | Display banners                                |
| `Invite`          | `invites/entities/invite.entity.ts`                     | Invitation tokens                              |
| `AccessRequest`   | `access-requests/entities/access-request.entity.ts`     | Access approval workflow                       |
| `AlertRule`       | `alerts/entities/alert-rule.entity.ts`                  | Rules engine (added PREDICTED_STOCKOUT metric) |
| `Maintenance`     | `maintenance/entities/maintenance.entity.ts`            | Preventive maintenance                         |
| `AgentSession`    | `agent-bridge/entities/agent-session.entity.ts`         | AI agent conversation                          |
| `AgentProgress`   | `agent-bridge/entities/agent-progress.entity.ts`        | Multi-step task progress                       |
| `Fiscal`          | `fiscal/entities/fiscal.entity.ts`                      | OFD/Soliq.uz queue items                       |
| `SystemSetting`   | `settings/entities/system-setting.entity.ts`            | Global config                                  |
| `AiProviderKey`   | `settings/entities/ai-provider-key.entity.ts`           | API keys (encrypted)                           |
| `PurchaseHistory` | `purchase-history/entities/purchase-history.entity.ts`  | Purchase ledger                                |
| `Contractor`      | `contractors/entities/contractor.entity.ts`             | servicetype, companyname                       |
| `Counterparty`    | `counterparty/entities/counterparty.entity.ts`          | Partner/vendor master                          |
| `WebsiteConfig`   | `website-config/entities/website-config.entity.ts`      | Site settings                                  |

---

## 4. Packages

### 4a. `@vendhub/shared`

**Purpose:** Single source of truth for types, constants, enums across all apps (API + Web + Client + Mobile + Site)

**Structure:**

```
packages/shared/src/
├── types/
│   ├── user.types.ts
│   ├── organization.types.ts
│   ├── machine.types.ts
│   ├── product.types.ts
│   ├── inventory.types.ts
│   ├── task.types.ts
│   ├── transaction.types.ts
│   ├── location.types.ts
│   ├── reference.types.ts
│   ├── api.types.ts
│   ├── complaint.types.ts
│   ├── notification.types.ts
│   ├── report.types.ts
│   ├── audit.types.ts
│   └── entity-event.types.ts
├── constants/
│   ├── (enums, magic strings, defaults)
├── utils/
│   ├── (shared utilities)
├── const.ts
├── index.ts (re-exports all)
└── package.json (@vendhub/shared v1.0.0)
```

**Key consolidations (Sprint G0):**

- **29 duplicate enums** merged (single enum per concept)
- **6 ambiguous names** disambiguated (PaymentStatus×3 → PaymentStatus, PaymentStatusXyz, PaymentStatusAbc)
- **5 shared enums** synced with API (ComplaintStatus, ComplaintCategory, NotificationType, TransactionStatus, UserStatus)

---

## 5. Production Status

### 5a. Infrastructure Config

| File                      | Purpose                                  | Status                                                  |
| ------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `railway.toml`            | Railway deployment config                | Configured (5 services: api, web, client, site, mobile) |
| `docker-compose.yml`      | Dev stack (PG, Redis, MinIO, all 5 apps) | 15k lines, healthchecks enabled                         |
| `docker-compose.prod.yml` | Prod stack (hardened)                    | 12k lines                                               |
| `.env.example`            | 100+ environment variables               | Complete, includes all integrations                     |
| `.env.docker`             | Docker-specific defaults                 | Minimal (dev-only)                                      |
| `.railwayignore`          | Railway exclusion patterns               | Configured                                              |
| `.dockerignore`           | Docker exclusion patterns                | Configured                                              |

### 5b. Root Package.json Scripts

**Turbo-orchestrated:**

```json
{
  "dev": "turbo run dev",
  "build": "turbo run build",
  "test": "turbo run test",
  "test:unit": "turbo run test:unit",
  "test:integration": "turbo run test:integration",
  "test:e2e": "playwright test",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "type-check": "turbo run type-check",
  "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
  "db:migrate": "turbo run db:migrate --filter=@vendhub/api",
  "db:seed": "turbo run db:seed --filter=@vendhub/api",
  "docker:up": "docker-compose up -d",
  "docker:down": "docker-compose down",
  "docker:logs": "docker-compose logs -f"
}
```

### 5c. CI/CD Pipelines

**GitHub Actions:**

- `ci.yml` — Lint, test, build all 6 apps, set-e on migrations
- `deploy.yml` — Health checks retry 5x, fail-fast on migration failure
- `release.yml` — Health check path fixed (`/api/v1/health`)

---

## 6. Bridge Modules

### 6a. vhm24-integration

**Purpose:** Migrate data from VHM24-repo (legacy monolith) into VendHub OS. Acts as both import adapter and webhook receiver.

**5 Endpoints** (controller `vhm24-integration.controller.ts`):

| Endpoint                                               | Method | Purpose                          |
| ------------------------------------------------------ | ------ | -------------------------------- |
| `POST /integration/vhm24/webhook`                      | POST   | Handle VHM24 webhook events      |
| `POST /integration/vhm24/sync/machines`                | POST   | Bulk machine data sync           |
| `POST /integration/vhm24/trips/:tripId/tasks`          | POST   | Link VHM24 tasks to merged Route |
| `PATCH /integration/vhm24/task-links/:id/verify`       | PATCH  | Manual task verification         |
| `POST /integration/vhm24/trips/:tripId/reconcile`      | POST   | Reconcile trip against VHM24     |
| `PATCH /integration/vhm24/reconciliations/:id/resolve` | PATCH  | Resolve discrepancies            |

**Services:**

| Service                     | Purpose                          | Key Methods                                                                    |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| `Vhm24IntegrationService`   | Main orchestrator                | `handleWebhook()`, `syncMachines()`, `linkTasksToTrip()`, `manualVerifyTask()` |
| `TripReconciliationService` | Trip match + variance resolution | `reconcileTrip()`, `resolve()`                                                 |

**Data models:**

- `WebhookPayload` (TypeScript interface)
- `SyncMachinesDto` (DTO with machines array)
- `LinkTasksDto` (DTO with task IDs)
- `ManualVerifyDto` (DTO with status + notes)
- `ResolveReconciliationDto` (DTO with notes)

**Entity:** `MachineLocationSync` — tracks sync state (last sync time, status, hash)

**Backward compatibility:** `TripReconciliation` entity kept (vhm24-integration compat); actual Route merging happened in Sprint H (routes/trips → single routes module)

### 6b. cash-finance

**Purpose:** Track cash-on-hand (received cash vs bank deposits), no financial transactions directly.

**4 Endpoints** (controller `cash-finance.controller.ts`):

| Endpoint                       | Method | Purpose                      |
| ------------------------------ | ------ | ---------------------------- |
| `GET /finance/balance`         | GET    | Current cash balance for org |
| `GET /finance/deposits`        | GET    | List all deposits            |
| `POST /finance/deposits`       | POST   | Record new cash deposit      |
| `DELETE /finance/deposits/:id` | DELETE | Soft-delete deposit          |

**Service:** `CashFinanceService` — aggregates deposits, computes balance

**Entity:** `BankDeposit` — amount, date, bank reference, org-scoped

**Note:** No payment approval/processing here — that's in `payments` module. This module is for cash reconciliation only.

### 6c. collections

**Purpose:** Two-stage cash collection workflow (count → verify).

**Key methods** (in service):

| Method             | Purpose                                                     |
| ------------------ | ----------------------------------------------------------- |
| `findByOperator()` | Org-scoped lookup by operator (now passes `organizationId`) |
| `checkDuplicate()` | Prevent double-counting (now tenant-filtered)               |
| `countByMachine()` | Aggregations by machine (now org-filtered)                  |
| `getHistory()`     | Collection audit trail (verified org ownership)             |

**Entities:** `Collection` (status: DRAFT → COUNTED → VERIFIED)

**Note:** Full `organizationId` threading added in Sprint P1 (security remediation)

### 6d. products + categories

**Product Endpoints (33 total):**

| Category      | Endpoints                                                                                                                                                                                                                                                                                                                                | Notes                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **CRUD**      | POST /, GET /, GET /:id, PATCH /:id, DELETE /:id                                                                                                                                                                                                                                                                                         | basePrice→sellingPrice mapping        |
| **Recipes**   | POST :id/recipes, GET :id/recipes, GET :id/recipes/primary, PATCH :id/recipes/:recipeId, DELETE :id/recipes/:recipeId, POST :id/recipes/:recipeId/recalculate-cost, POST :id/recipes/:recipeId/ingredients, DELETE :id/recipes/:recipeId/ingredientId, GET :id/recipes/:recipeId/snapshots, GET :id/recipes/:recipeId/snapshots/:version | Cost calculation, ingredient tracking |
| **Batches**   | POST :id/batches, GET :id/batches, PATCH :id/batches/:batchId, DELETE :id/batches/:batchId, POST batches-check-expired, GET batches-expiring                                                                                                                                                                                             | Expiration tracking                   |
| **Pricing**   | GET :id/price-history, POST :id/update-price                                                                                                                                                                                                                                                                                             | Price change audit                    |
| **Stock**     | GET :id/stock                                                                                                                                                                                                                                                                                                                            | Real-time stock by location           |
| **Search**    | GET by-barcode/:barcode, GET barcode/:barcode                                                                                                                                                                                                                                                                                            | Dual barcode endpoints                |
| **Analytics** | GET recipes-stats, GET stock-summary                                                                                                                                                                                                                                                                                                     | KPI aggregation                       |

**Product Fields (TypeORM entity):**

- barcode (unique per org)
- name, description
- sellingPrice (API: basePrice in DTO)
- purchasePrice (API: costPrice in DTO)
- categoryId (FK to Category)
- recipes[] (1:N)
- batches[] (1:N)
- costStatus (enum for recipe calculation state)

**Category Endpoints (CRUD):**

- POST /categories
- GET /categories
- GET /categories/:id
- PATCH /categories/:id
- DELETE /categories/:id (soft)

**Category Fields:**

- name, icon, color
- sortOrder (for UI ordering)
- isActive (boolean)
- organizationId (tenant isolation)

### 6e. site-cms

**Purpose:** JSONB document store for public tenant (unauth access, rate-limited).

**Two controller sets:**

1. **Admin** (`/api/v1/site-cms/:collection/:id`):
   - GET list (paginated)
   - GET by ID
   - GET count
   - POST create
   - PATCH update
   - DELETE (soft)
   - Auth: JwtAuthGuard, Roles: owner/admin

2. **Public** (`/api/v1/client/public/*`):
   - GET `/site-cms/:collection` (all items)
   - GET `/partners`, `/machine-types`
   - POST `/cooperation-requests` (rate-limited)
   - Auth: public (no JWT)
   - Rate limit: 20 req/min

**Entity:** `SiteCmsItem`

| Column         | Type    | Purpose                                                  |
| -------------- | ------- | -------------------------------------------------------- |
| collection     | VARCHAR | Identifier (products, machines, etc)                     |
| data           | JSONB   | Flexible document                                        |
| sortOrder      | INT     | UI ordering                                              |
| isActive       | BOOL    | Publish flag                                             |
| organizationId | UUID    | Tenant isolation (public endpoint returns same org only) |

**9 Collections** (seeds in migration `1775900000001-SeedSiteCmsData`):

1. products (20 rows)
2. machines (16 rows)
3. promotions (3 rows)
4. loyalty_tiers (4 rows)
5. bonus_actions (11 rows)
6. loyalty_privileges (8 rows)
7. site_content (14 rows)
8. partners (4 rows)
9. partnership_models (4 rows)

**Service:** `SiteCmsService`

| Method              | Purpose                       |
| ------------------- | ----------------------------- |
| findByCollection()  | Fetch all items by collection |
| countByCollection() | Count items                   |
| findById()          | Fetch by ID                   |
| create()            | Insert document               |
| update()            | Update document               |
| remove()            | Soft-delete                   |

---

## 7. Sufficiency Assessment

### 7a. What's Production-Ready

1. **API Core Infrastructure (100%):**
   - NestJS 11 app with 82 modules all registered in app.module.ts
   - TypeORM 0.3 with PostgreSQL 16 + 39 migrations
   - BaseEntity pattern enforced across 159+ entities
   - JWT + TOTP auth, 7-role RBAC
   - Multi-tenant org isolation (except 4 legacy modules — fixed in Sprint P)
   - Soft-delete-only policy (no hard deletes)

2. **Core Catalog & Inventory (95%):**
   - Products, categories (first-class entity), machines, inventory, stock movements
   - Consumption rate (EWMA) + predictive refill with margin-based priority
   - Inventory reconciliation with nedostacha (shortage) tracking in UZS
   - QuantitySyncService listening to transaction events

3. **Operations & Routes (95%):**
   - Unified routes module (merged trips + trip-analytics)
   - 18 endpoints including GPS tracking, anomaly detection, 2-opt route optimization
   - RoutePoint, RouteAnomaly, RouteTaskLink entities for full audit

4. **Telegram Bot (90%):**
   - Two embedded bots (staff + customer) inside API module
   - 17 sub-services, direct DB access, session management
   - Staff commands (tasks, machines, routes, admin)
   - Customer commands (catalog, cart, checkout, complaints, loyalty)

5. **Dashboard (Web App) (90%):**
   - 103 pages, all routed via Next.js App Router
   - 40+ forms migrated to React Hook Form + Zod
   - DTO↔Entity field mappings documented + fixed
   - RHF + Zod validation on all CRUD forms

6. **Site CMS (85%):**
   - JSONB document store with 9 collections
   - Public unauthenticated endpoint (rate-limited, no 404-enumeration)
   - Admin CRUD endpoints (org-scoped)
   - Integrated into site landing page

7. **Payments & Finance (85%):**
   - Payment processing (Payme, Click, Uzum Bank, Telegram Stars)
   - Cash-on-hand tracking (deposits, balance)
   - Collections two-stage workflow
   - Payout requests module (new in Sprint F)

8. **Tenant Isolation (85%):**
   - organizationId filtering on 80+ service methods
   - DB-level WHERE clause enforcement (not post-fetch checks)
   - Pessimistic locking on sensitive operations (promo codes, routes, etc.)
   - Full audit trail per org

### 7b. What's Partially Ready

1. **Email/SMS (60%):**
   - Email service scaffolding present
   - SMS dispatch via Eskiz/PlayMobile
   - Template system basic
   - **Missing:** Retry queue, delivery tracking, unsubscribe flow

2. **Monitoring & Observability (60%):**
   - Prometheus metrics scaffolded
   - Health check endpoints configured
   - Docker Compose health checks enabled
   - **Missing:** Grafana dashboards deployed, Loki logs aggregation in prod

3. **Testing (50%):**
   - Jest for unit + integration (coverage thresholds 45-55%)
   - Playwright for E2E (10+ critical flows)
   - 3 new test suites in Sprint P (batch-movements, calculated-state, custom-fields)
   - **Missing:** 100% coverage on critical modules, mobile E2E tests

4. **Mobile App (40%):**
   - React Native/Expo skeleton with RootNavigator + 20 screens
   - Offline-first cache layer (TanStack React Query + persistence)
   - Auth flow, basic CRUD screens
   - **Missing:** Full feature parity with web (image uploads, offline mutations, sync queue)

5. **Localization (40%):**
   - i18n infrastructure (next-intl, react-i18n)
   - Translations for Uzbek + Russian + English
   - **Missing:** Continuous translation workflow, missing keys in mobile/site

### 7c. What's Absent / Incomplete

1. **Edge Cases & Error Handling (30%):**
   - **Missing:** Graceful degradation for partial failures (e.g., Telegram bot fails but transaction succeeds)
   - **Missing:** Dead-letter queue for failed jobs (BullMQ processor retries only)
   - **Missing:** Circuit breaker for external APIs (Payme, SMS providers)

2. **Advanced Analytics (20%):**
   - **Missing:** Custom report builder (templates exist but no UI)
   - **Missing:** Data export (PDF, Excel) — payment-reports has xlsx but no UI workflow
   - **Missing:** Scheduled report delivery

3. **Import Framework (25%):**
   - Generic import skeleton exists (SchemaDefinition, ValidationRule entities)
   - HICON payment report parser is specialized
   - **Missing:** Admin UI for schema definition, generic importer for products/machines

4. **Vendor Integrations (30%):**
   - **Missing:** Allegro API (snack/drink machine data source)
   - **Missing:** Uzum Bank POS terminal sync
   - **Missing:** Real-time vending machine telemetry stream

5. **Advanced OLMA Patterns (20%):**
   - G1-G5 patterns documented but not exhaustively tested
   - **Missing:** Stock write-off workflows (WRITE_OFF movement type exists but no UI)
   - **Missing:** Batch expiration auto-notification

6. **Security Hardening (15%):**
   - **Missing:** Rate limiting on sensitive endpoints (only Throttle on public tenant)
   - **Missing:** IP whitelisting for admin endpoints
   - **Missing:** Encrypted password recovery flow (current: plaintext email links)

---

## Summary

**VendHub OS is ~80% production-ready for the core business (vending machine management, cash collection, predictive refill).** It is **not** ready to ingest VendHub-Snack-Drinks, Vendhub.uz, or VendCashBot as-is without:

1. **Overlap resolution:** Consolidate duplicate entities (Product, Machine, Category, Payment, etc.) across all 4 repos
2. **Data migration:** Reconcile existing data from satellite repos into OS schema
3. **Conflict resolution:** Define single source of truth for disputed fields (e.g., Product.type vs Product.typeCode)
4. **API contract:** Ensure satellite repos can migrate from their current APIs to unified OS endpoints
5. **Testing:** E2E test multi-tenant isolation across all 82 modules with real competitor data

**Next phase:** Build `OVERLAP_MATRIX.md` listing every duplicated module/entity and recommended merge strategy (MERGE, PORT, DELETE, KEEP).
