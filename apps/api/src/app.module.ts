/**
 * VendHub Unified - Main Application Module
 *
 * Multi-tenant vending machine management system with:
 * - 7 roles: owner, admin, manager, operator, warehouse, accountant, viewer
 * - 3-level inventory: Warehouse → Operator → Machine
 * - Full audit trail for compliance
 * - Uzbekistan-specific payments (Payme, Click, Uzum)
 */

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { ClsModule } from 'nestjs-cls';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { redisStore } from 'cache-manager-redis-yet';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { CustomTypeOrmLogger } from './common/utils/typeorm-logger';

// Core Modules
import { CommonModule } from './common/common.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { MachinesModule } from './modules/machines/machines.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReferencesModule } from './modules/references/references.module';
import { LocationsModule } from './modules/locations/locations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { AiModule } from './modules/ai/ai.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { QuestsModule } from './modules/quests/quests.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { GeoModule } from './modules/geo/geo.module';
import { TelegramPaymentsModule } from './modules/telegram-payments/telegram-payments.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { MaterialRequestsModule } from './modules/material-requests/material-requests.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ContractorsModule } from './modules/contractors/contractors.module';
import { OrdersModule } from './modules/orders/orders.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { WorkLogsModule } from './modules/work-logs/work-logs.module';
import { StorageModule } from './modules/storage/storage.module';
import { ImportModule } from './modules/import/import.module';
import { HealthModule } from './modules/health/health.module';
import { WebSocketModule } from './modules/websocket/websocket.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { SecurityModule } from './modules/security/security.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { RoutesModule } from './modules/routes/routes.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { MachineAccessModule } from './modules/machine-access/machine-access.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { OperatorRatingsModule } from './modules/operator-ratings/operator-ratings.module';
import { ReconciliationModule } from './modules/reconciliation/reconciliation.module';
import { BillingModule } from './modules/billing/billing.module';
import { OpeningBalancesModule } from './modules/opening-balances/opening-balances.module';
import { PurchaseHistoryModule } from './modules/purchase-history/purchase-history.module';
import { SalesImportModule } from './modules/sales-import/sales-import.module';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module';
import { ClientModule } from './modules/client/client.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { BullBoardModule } from './modules/bull-board/bull-board.module';
import { DirectoriesModule } from './modules/directories/directories.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { TripsModule } from './modules/trips/trips.module';

// Common Guards & Interceptors
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { OrganizationGuard } from './common/guards/organization.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    // ============================================
    // CORE CONFIGURATION
    // ============================================

    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      // Look for .env in both apps/api and monorepo root
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
      cache: true,
    }),

    // ============================================
    // DATABASE - PostgreSQL with TypeORM
    // ============================================

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        namingStrategy: new SnakeNamingStrategy(),
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5433),
        username: configService.get('DB_USER', 'vendhub'),
        password: configService.get('DB_PASSWORD', 'vendhub_secret'),
        database: configService.get('DB_NAME', 'vendhub'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        // subscribers are registered via NestJS DI in AuditModule
        subscribers: [],
        // SECURITY: synchronize MUST always be false in production.
        // Even in development it's off by default -- enable explicitly via DB_SYNCHRONIZE=true.
        synchronize:
          configService.get('NODE_ENV') !== 'production' &&
          configService.get('DB_SYNCHRONIZE', 'false') === 'true',
        logging: configService.get('DB_LOGGING', 'false') === 'true'
          ? true
          : ['error', 'warn', 'migration'],
        logger: new CustomTypeOrmLogger(
          configService.get<number>('DB_SLOW_QUERY_THRESHOLD', 1000),
        ),
        maxQueryExecutionTime: configService.get<number>('DB_SLOW_QUERY_THRESHOLD', 1000),
        ssl: (configService.get('DB_SSL') === 'true' || (configService.get('NODE_ENV') === 'production' && configService.get('DB_SSL') !== 'false'))
          ? { rejectUnauthorized: configService.get('DB_SSL_REJECT_UNAUTHORIZED') !== 'false' }
          : false,
        poolSize: configService.get<number>('DB_POOL_SIZE', 20),
        extra: {
          max: configService.get<number>('DB_POOL_SIZE', 20),
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
        },
      }),
    }),

    // ============================================
    // CACHING - Redis
    // ============================================

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        const store = await redisStore({
          url: redisUrl || undefined,
          socket: !redisUrl ? {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          } : undefined,
          password: configService.get('REDIS_PASSWORD') || undefined,
          ttl: configService.get<number>('CACHE_TTL', 300) * 1000,
        });
        return { store };
      },
    }),

    // ============================================
    // QUEUE - Bull with Redis
    // ============================================

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        return {
          connection: redisUrl ? { url: redisUrl } : {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
          },
        };
      },
    }),

    // ============================================
    // RATE LIMITING
    // ============================================

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: 1000, // 1 second
            limit: 10,
          },
          {
            name: 'medium',
            ttl: 10000, // 10 seconds
            limit: 50,
          },
          {
            name: 'long',
            ttl: 60000, // 1 minute
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // ============================================
    // SCHEDULING (Cron Jobs)
    // ============================================

    ScheduleModule.forRoot(),

    // ============================================
    // EVENT EMITTER
    // ============================================

    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // ============================================
    // CLS (Continuation Local Storage)
    // For request-scoped context across async calls
    // ============================================

    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req) => {
          cls.set('requestId', req.headers['x-request-id'] || crypto.randomUUID());
          cls.set('startTime', Date.now());
        },
      },
    }),

    // ============================================
    // COMMON MODULE
    // ============================================

    CommonModule,

    // ============================================
    // FEATURE MODULES
    // ============================================

    // Authentication & Authorization
    AuthModule,

    // User Management
    UsersModule,

    // Multi-Tenant Organizations (Headquarters, Franchise, Branch)
    OrganizationsModule,

    // Vending Machines
    MachinesModule,

    // Products, Categories, Recipes
    ProductsModule,

    // 3-Level Inventory System
    InventoryModule,

    // Service Tasks with Photo Validation
    TasksModule,

    // Reference Data (Currencies, Countries, etc.)
    ReferencesModule,

    // Locations & Geo
    LocationsModule,

    // Payment Providers (Payme, Click, Uzum)
    PaymentsModule,

    // Financial Transactions
    TransactionsModule,

    // QR-Code Complaints with SLA
    ComplaintsModule,

    // Multi-Channel Notifications
    NotificationsModule,

    // Reports & Analytics
    ReportsModule,

    // Webhooks for External Integrations
    WebhooksModule,

    // Comprehensive Audit Trail
    AuditModule,

    // Telegram Bot for Staff & Customers
    TelegramBotModule,

    // AI-Powered Features (Import, Analysis, Suggestions)
    AiModule,

    // Loyalty & Rewards Program
    LoyaltyModule,

    // Quests & Achievements
    QuestsModule,

    // Referral Program
    ReferralsModule,

    // User Favorites
    FavoritesModule,

    // Geo & Google Maps Integration
    GeoModule,

    // Telegram Payments (Stars, native payments)
    TelegramPaymentsModule,

    // Product Recommendations Engine
    RecommendationsModule,

    // Material Requests Workflow
    MaterialRequestsModule,

    // Employee Management
    EmployeesModule,

    // Contractor Management
    ContractorsModule,

    // Orders Management
    OrdersModule,

    // Extended Maintenance Workflow
    MaintenanceModule,

    // Work Logs & Time Tracking
    WorkLogsModule,

    // File Storage (S3/CloudFront)
    StorageModule,

    // Data Import (CSV, Excel, JSON)
    ImportModule,

    // Health Checks (liveness, readiness)
    HealthModule,

    // WebSocket Real-time Events
    WebSocketModule,

    // Universal Integrations (AI-powered configurator)
    IntegrationsModule,

    // Fiscal Module (MultiKassa, Receipts, Z-reports)
    FiscalModule,

    // Role-Based Access Control
    RbacModule,

    // Security Events & Encryption
    SecurityModule,

    // System Settings & Configuration
    SettingsModule,

    // Warehouse & Stock Management
    WarehouseModule,

    // Route Planning & Optimization
    RoutesModule,

    // Equipment Components, Spare Parts, Washing Schedules
    EquipmentModule,

    // Alert Rules & Monitoring
    AlertsModule,

    // Machine Access Control
    MachineAccessModule,

    // Incident Management
    IncidentsModule,

    // Operator Performance Ratings
    OperatorRatingsModule,

    // Data Reconciliation (HW vs Transactions vs Payments)
    ReconciliationModule,

    // Invoicing & Billing Payments
    BillingModule,

    // Stock Opening Balances
    OpeningBalancesModule,

    // Purchase History & Tracking
    PurchaseHistoryModule,

    // Sales Data Import (Excel, CSV)
    SalesImportModule,

    // Promo Codes & Discounts
    PromoCodesModule,

    // Client B2C (Customer-facing)
    ClientModule,

    // Application Monitoring & Metrics
    MonitoringModule,

    // Queue Dashboard (BullBoard UI at /admin/queues)
    BullBoardModule,

    // Directories / EAV Reference Data (справочники)
    DirectoriesModule,

    // Trip tracking & GPS (VendtripBot integration)
    VehiclesModule,
    TripsModule,
  ],
  providers: [
    // ============================================
    // GLOBAL GUARDS (order matters!)
    // ============================================

    // Rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // CSRF protection (origin verification for cookie-based auth)
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    // JWT Authentication
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Role-based access control
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Organization access control
    {
      provide: APP_GUARD,
      useClass: OrganizationGuard,
    },

    // ============================================
    // GLOBAL INTERCEPTORS
    // ============================================

    // Request/Response logging
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Response transformation
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Request timeout
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },

    // ============================================
    // GLOBAL EXCEPTION FILTER
    // ============================================

    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer) {
    // Add any global middleware here
  }
}
