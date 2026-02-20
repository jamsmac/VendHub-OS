# VendHub OS Entity Schema Map

> Auto-generated context for AI agents. ~100 entities across 40+ modules.
> All entities extend BaseEntity (id: UUID, createdAt, updatedAt, deletedAt, createdById, updatedById).
> camelCase properties -> SnakeNamingStrategy -> snake_case DB columns.

## Core Domain

### User

Table: `users`
| Property | Type | Notes |
|----------|------|-------|
| organizationId | uuid | FK -> Organization |
| email | varchar(255) | unique |
| phone | varchar(20) | |
| firstName | varchar(100) | |
| lastName | varchar(100) | |
| passwordHash | text | |
| role | enum | owner/admin/manager/operator/warehouse/accountant/viewer |
| status | enum | ACTIVE/INACTIVE/SUSPENDED/LOCKED |
| twoFactorSecret | varchar | |
| twoFactorEnabled | boolean | |
| lastLoginAt | timestamp | |
| loginAttempts | int | |
| lockedUntil | timestamp | |
| preferences | jsonb | |

### Organization

Table: `organizations`
| Property | Type | Notes |
|----------|------|-------|
| name | varchar(255) | |
| slug | varchar(100) | unique |
| ownerId | uuid | FK -> User |
| status | enum | ACTIVE/INACTIVE/SUSPENDED |
| settings | jsonb | |
| subscription | jsonb | |

### Machine

Table: `machines`
| Property | Type | Notes |
|----------|------|-------|
| organizationId | uuid | FK |
| locationId | uuid | FK -> Location |
| machineNumber | varchar(100) | unique per org |
| name | varchar(200) | |
| type | enum | VENDING/COFFEE/COMBO/LOCKER |
| status | enum | ACTIVE/INACTIVE/MAINTENANCE/ERROR |
| model | varchar(200) | |
| manufacturer | varchar(200) | |
| serialNumber | varchar(100) | |
| firmwareVersion | varchar(50) | |
| latitude/longitude | decimal | |
| address | text | |
| installDate | date | |
| lastTelemetryAt | timestamp | |
| telemetryData | jsonb | |
| metadata | jsonb | |

Relations: Machine -> Location, Machine <- MachineSlot[], MachineComponent[], MachineError[], MaintenanceSchedule[]

### MachineSlot

Table: `machine_slots`
| Property | Type | Notes |
|----------|------|-------|
| machineId | uuid | FK |
| productId | uuid | FK -> Product |
| slotNumber | varchar(20) | |
| capacity | int | |
| currentQuantity | int | |
| price | decimal(15,2) | |
| status | enum | ACTIVE/INACTIVE/ERROR |

### Product

Table: `products`
| Property | Type | Notes |
|----------|------|-------|
| organizationId | uuid | FK |
| name | varchar(255) | |
| sku | varchar(100) | unique per org |
| barcode | varchar(50) | |
| type | enum | DRINK/SNACK/FOOD/OTHER |
| category | varchar(100) | |
| costPrice | decimal(15,2) | |
| sellingPrice | decimal(15,2) | |
| unit | varchar(20) | |
| imageUrl | text | |
| metadata | jsonb | |

Relations: Product <- Recipe[], ProductBatch[], PriceHistory[]

### Location

Table: `locations`
| Property | Type | Notes |
|----------|------|-------|
| organizationId | uuid | FK |
| name | varchar(200) | |
| address | text | |
| city | varchar(100) | |
| latitude/longitude | decimal | |
| type | enum | OFFICE/MALL/UNIVERSITY/HOSPITAL/OTHER |
| contactPerson/Phone | varchar | |
| metadata | jsonb | |

## Transactions & Payments

### Transaction

Table: `transactions`
| Property | Type | Notes |
|----------|------|-------|
| organizationId | uuid | FK |
| machineId | uuid | FK |
| locationId | uuid | FK |
| transactionNumber | varchar(50) | unique |
| status | enum | PENDING/PAYMENT_PENDING/PAID/DISPENSING/COMPLETED/FAILED/CANCELLED/REFUNDED |
| paymentMethod | enum | CASH/CARD/PAYME/CLICK/UZUM/QR/TELEGRAM_STARS |
| totalAmount | decimal(15,2) | |
| paidAmount | decimal(15,2) | |
| currency | varchar(3) | default UZS |
| providerTransactionId | varchar | |
| providerData | jsonb | |
| items | jsonb | TransactionItem[] |
| fiscalData | jsonb | receipt/fiscal info |
| metadata | jsonb | |

Relations: Transaction <- CollectionRecord, TransactionDailySummary

### CollectionRecord

Table: `collection_records`
| Property | Type | Notes |
|----------|------|-------|
| organizationId | uuid | FK |
| machineId | uuid | FK |
| collectorUserId | uuid | FK |
| cashAmount | decimal(15,2) | |
| coinAmount | decimal(15,2) | |
| totalAmount | decimal(15,2) | |
| verified | boolean | |
| verifiedByUserId | uuid | |
| collectedAt | timestamp | |

### Order

Table: `orders`
| Property | Type | Notes |
|----------|------|-------|
| organizationId | uuid | FK |
| machineId | uuid | FK |
| userId | uuid | FK |
| orderNumber | varchar(50) | unique |
| status | enum | PENDING/CONFIRMED/PREPARING/READY/COMPLETED/CANCELLED |
| paymentStatus | enum | PENDING/PAID/REFUNDED |
| totalAmount | decimal(15,2) | |
| items | jsonb | |
| metadata | jsonb | |

## HR & Employees

### Employee

Table: `employees`
| Property | Type | Notes |
|----------|------|-------|
| organizationId | uuid | FK |
| userId | uuid | FK -> User |
| employeeNumber | varchar(50) | |
| firstName/lastName | varchar | |
| phone/email | varchar | |
| employeeRole | enum | OPERATOR/TECHNICIAN/WAREHOUSE/DRIVER |
| status | enum | ACTIVE/ON_LEAVE/SUSPENDED/TERMINATED |
| departmentId | uuid | FK |
| positionId | uuid | FK |
| salary | decimal(15,2) | |
| hireDate/terminationDate | date | |
| telegramUserId | varchar | |

Relations: Employee -> Department, Position, User; Employee <- Attendance[], Payroll[], LeaveRequest[], WorkLog[]

### Department / Position / Attendance / Payroll / LeaveRequest / PerformanceReview / WorkLog / TimeOffRequest / Timesheet

Standard HR entities with organizationId + employeeId FK pattern.

## Routes & Trips

### Route -> RouteStop[]

Route planning with status lifecycle (PLANNED -> IN_PROGRESS -> COMPLETED).

### Trip -> TripPoint[], TripStop[], TripAnomaly[], TripTaskLink[]

GPS tracking with live location, odometer reconciliation, anomaly detection.

### Vehicle

Table: `vehicles` - company/personal vehicles with odometer tracking.

## Inventory & Warehouse

### Inventory / InventoryMovement

Machine-level stock tracking with movement history.

### Warehouse -> WarehouseZone[]

Warehouse management with zones, stock movements, batches.

### StockMovement / InventoryBatch

Inter-warehouse transfers and FIFO batch tracking.

## Finance

### BillingPlan / BillingSubscription / BillingInvoice / BillingPayment

SaaS billing with plans, subscriptions, invoicing.

### Contractor / ContractorInvoice / Contract / CommissionCalculation

Contractor management with commission tiers.

## Loyalty & Promotions

### PointsTransaction

Loyalty points ledger with earn/spend/expire/admin types.

### PromoCode / PromoCodeRedemption

Promo code management with usage limits and conditions.

### Quest / UserQuest

Gamification quests with progress tracking.

## Client-Facing

### ClientUser / ClientOrder / ClientPayment / ClientWallet / ClientWalletLedger / ClientLoyaltyAccount / ClientLoyaltyLedger

Customer-facing entities with wallet and loyalty integration.

## Fiscal & Tax

### FiscalDevice / FiscalShift / FiscalReceipt / FiscalQueue

OFD/Soliq.uz fiscal integration with receipt queue.

## Notifications

### Notification / FcmToken / PushSubscription

Multi-channel notifications (in-app, push, FCM).

## Security & Audit

### Audit / DataEncryption / SecurityEvent

Audit trail, field-level encryption tracking, security event monitoring.

## Reports & Analytics

### Report / AnalyticsSnapshot

Report generation and daily analytics snapshots.

### ReconciliationRun / ReconciliationMismatch / HwImportedSale

Payment reconciliation with hardware sales import.

## Other Modules

| Entity                          | Table               | Purpose                            |
| ------------------------------- | ------------------- | ---------------------------------- |
| Complaint                       | complaints          | Customer complaint lifecycle       |
| Incident                        | incidents           | Machine incident tracking          |
| Referral                        | referrals           | Referral program                   |
| Achievement / UserAchievement   | achievements        | Gamification                       |
| OperatorRating                  | operator_ratings    | Operator performance               |
| Favorite                        | favorites           | User favorites (products/machines) |
| MachineAccess                   | machine_accesses    | Machine access control             |
| AlertRule / AlertHistory        | alert_rules/history | Monitoring alerts                  |
| TelegramUser / TelegramSettings | telegram\_\*        | Bot integration                    |
| Integration                     | integrations        | External service config            |
| SystemSetting / AiProviderKey   | system_settings     | App configuration                  |
| Import / ImportSession          | imports             | Data import framework              |

## Key Patterns

- **Multi-tenant**: Every entity has `organizationId` (except User which has it directly)
- **Soft delete**: All entities via `deletedAt` from BaseEntity
- **UUID PKs**: All `id` fields are UUID v4
- **Status enums**: Lifecycle management via status fields
- **jsonb metadata**: Extensible data via `metadata` columns
- **Audit fields**: `createdById`, `updatedById` from BaseEntity
- **Index strategy**: `(organizationId)` on all tenant entities, plus status/date/unique natural keys
