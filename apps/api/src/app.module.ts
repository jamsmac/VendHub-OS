/**
 * VendHub Unified - Main Application Module
 *
 * Multi-tenant vending machine management system with:
 * - 7 roles: owner, admin, manager, operator, warehouse, accountant, viewer
 * - 3-level inventory: Warehouse → Operator → Machine
 * - Full audit trail for compliance
 * - Uzbekistan-specific payments (Payme, Click, Uzum)
 */

import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as Joi from "joi";
import {
  databaseConfig,
  redisConfig,
  appConfig,
  parseDatabaseUrl,
} from "./config/env.config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bullmq";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { CacheModule } from "@nestjs/cache-manager";
import { ClsModule } from "nestjs-cls";
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { redisStore } from "cache-manager-redis-yet";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import { CustomTypeOrmLogger } from "./common/utils/typeorm-logger";

// Core Modules
import { CommonModule } from "./common/common.module";
import { TracingModule } from "./common/tracing/tracing.module";

// Feature Modules
import { MetricsModule } from "./modules/metrics/metrics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { MachinesModule } from "./modules/machines/machines.module";
import { ProductsModule } from "./modules/products/products.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { ReferencesModule } from "./modules/references/references.module";
import { LocationsModule } from "./modules/locations/locations.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { ComplaintsModule } from "./modules/complaints/complaints.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AuditModule } from "./modules/audit/audit.module";
import { TelegramBotModule } from "./modules/telegram-bot/telegram-bot.module";
import { AiModule } from "./modules/ai/ai.module";
import { LoyaltyModule } from "./modules/loyalty/loyalty.module";
import { QuestsModule } from "./modules/quests/quests.module";
import { ReferralsModule } from "./modules/referrals/referrals.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { GeoModule } from "./modules/geo/geo.module";
import { TelegramPaymentsModule } from "./modules/telegram-payments/telegram-payments.module";
import { RecommendationsModule } from "./modules/recommendations/recommendations.module";
import { MaterialRequestsModule } from "./modules/material-requests/material-requests.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { ContractorsModule } from "./modules/contractors/contractors.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { MaintenanceModule } from "./modules/maintenance/maintenance.module";
import { WorkLogsModule } from "./modules/work-logs/work-logs.module";
import { StorageModule } from "./modules/storage/storage.module";
import { ImportModule } from "./modules/import/import.module";
import { HealthModule } from "./modules/health/health.module";
import { WebSocketModule } from "./modules/websocket/websocket.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { FiscalModule } from "./modules/fiscal/fiscal.module";
import { RbacModule } from "./modules/rbac/rbac.module";
import { SecurityModule } from "./modules/security/security.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { WebsiteConfigModule } from "./modules/website-config/website-config.module";
import { CmsModule } from "./modules/cms/cms.module";
import { WarehouseModule } from "./modules/warehouse/warehouse.module";
import { RoutesModule } from "./modules/routes/routes.module";
import { EquipmentModule } from "./modules/equipment/equipment.module";
import { AlertsModule } from "./modules/alerts/alerts.module";
import { MachineAccessModule } from "./modules/machine-access/machine-access.module";
import { IncidentsModule } from "./modules/incidents/incidents.module";
import { OperatorRatingsModule } from "./modules/operator-ratings/operator-ratings.module";
import { ReconciliationModule } from "./modules/reconciliation/reconciliation.module";
import { BillingModule } from "./modules/billing/billing.module";
import { OpeningBalancesModule } from "./modules/opening-balances/opening-balances.module";
import { PurchaseHistoryModule } from "./modules/purchase-history/purchase-history.module";
import { SalesImportModule } from "./modules/sales-import/sales-import.module";
import { PromoCodesModule } from "./modules/promo-codes/promo-codes.module";
import { ClientModule } from "./modules/client/client.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { BullBoardModule } from "./modules/bull-board/bull-board.module";
import { DirectoriesModule } from "./modules/directories/directories.module";
import { VehiclesModule } from "./modules/vehicles/vehicles.module";
import { TripsModule } from "./modules/trips/trips.module";
import { AchievementsModule } from "./modules/achievements/achievements.module";
import { SmsModule } from "./modules/sms/sms.module";
import { EmailModule } from "./modules/email/email.module";
import { ContainersModule } from "./modules/containers/containers.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { CounterpartyModule } from "./modules/counterparty/counterparty.module";
import { AccessRequestsModule } from "./modules/access-requests/access-requests.module";
import { WebPushModule } from "./modules/web-push/web-push.module";
import { DataParserModule } from "./modules/data-parser/data-parser.module";
import { AgentBridgeModule } from "./modules/agent-bridge/agent-bridge.module";
import { FcmModule } from "./modules/fcm/fcm.module";
import { CashFinanceModule } from "./modules/cash-finance/cash-finance.module";
import { CollectionsModule } from "./modules/collections/collections.module";
import { InvestorModule } from "./modules/investor/investor.module";
import { TripAnalyticsModule } from "./modules/trip-analytics/trip-analytics.module";
import { Vhm24IntegrationModule } from "./modules/vhm24-integration/vhm24-integration.module";

// Common Guards & Interceptors
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { OrganizationGuard } from "./common/guards/organization.guard";
import { CsrfGuard } from "./common/guards/csrf.guard";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { TimeoutInterceptor } from "./common/interceptors/timeout.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

const optionalString = () => Joi.string().empty("").optional();
const optionalUri = () => Joi.string().uri().empty("").optional();
const optionalBooleanString = () =>
  Joi.string().valid("true", "false").empty("").optional();
const defaultedString = (value: string) =>
  Joi.string().empty("").optional().default(value);
const defaultedNumber = (value: number) =>
  Joi.number().empty("").optional().default(value);

@Module({
  imports: [
    // ============================================
    // CORE CONFIGURATION
    // ============================================

    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      cache: true,
      load: [databaseConfig, redisConfig, appConfig],
      validationSchema: Joi.object({
        // Server
        NODE_ENV: Joi.string()
          .valid("development", "production", "test")
          .empty("")
          .default("development"),
        PORT: defaultedNumber(4000),

        // Database — either DATABASE_URL (Supabase/Railway) or individual vars
        DATABASE_URL: optionalUri(),
        DB_HOST: defaultedString("localhost"),
        DB_PORT: defaultedNumber(5432),
        DB_USER: defaultedString("vendhub"),
        DB_PASSWORD: Joi.string().allow("").optional().default(""),
        DB_NAME: defaultedString("vendhub"),
        DB_SSL: optionalBooleanString(),
        DB_SSL_REJECT_UNAUTHORIZED: optionalBooleanString(),
        DB_SYNCHRONIZE: optionalBooleanString(),
        DB_LOGGING: optionalBooleanString(),
        DB_POOL_SIZE: defaultedNumber(10),
        DB_MIGRATIONS_RUN: optionalBooleanString(),

        // Redis — either REDIS_URL (Upstash/Railway) or individual vars
        // No defaults: if not set, Redis features gracefully degrade
        REDIS_URL: optionalString(),
        REDIS_HOST: optionalString(),
        REDIS_PORT: Joi.number().empty("").optional(),
        REDIS_PASSWORD: Joi.string().allow("").optional(),

        // JWT (required)
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: defaultedString("1d"),
        JWT_REFRESH_SECRET: optionalString(),
        JWT_REFRESH_EXPIRES_IN: defaultedString("7d"),

        // CORS
        CORS_ORIGINS: optionalString(),

        // Swagger
        SWAGGER_ENABLED: optionalBooleanString(),

        // Optional services
        SENTRY_DSN: optionalUri(),
        TELEGRAM_BOT_TOKEN: optionalString(),
        TELEGRAM_CUSTOMER_BOT_TOKEN: optionalString(),
        STORAGE_ENDPOINT: optionalString(),
        STORAGE_PUBLIC_URL: optionalString(),
        STORAGE_FORCE_PATH_STYLE: optionalBooleanString(),
        STORAGE_ACCESS_KEY: optionalString(),
        STORAGE_SECRET_KEY: optionalString(),
        STORAGE_BUCKET: optionalString(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // ============================================
    // DATABASE - PostgreSQL with TypeORM
    // ============================================

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>("DATABASE_URL");
        const isProduction = configService.get("NODE_ENV") === "production";
        const poolSize = configService.get<number>("DB_POOL_SIZE", 10);
        const sslRejectUnauthorized = configService.get<string>(
          "DB_SSL_REJECT_UNAUTHORIZED",
        );

        // Parse DATABASE_URL if provided (Supabase, Railway, Neon)
        const dbConnection = databaseUrl
          ? parseDatabaseUrl(databaseUrl)
          : {
              host: configService.get("DB_HOST", "localhost"),
              port: configService.get<number>("DB_PORT", 5432),
              username: configService.get("DB_USER", "postgres"),
              password: configService.get("DB_PASSWORD", "postgres"),
              database: configService.get("DB_NAME", "vendhub"),
              ssl: false,
            };

        // SSL: auto-enable in production, respect DATABASE_URL ?sslmode, or DB_SSL env
        const useSsl =
          isProduction ||
          dbConnection.ssl ||
          configService.get("DB_SSL") === "true";

        return {
          type: "postgres" as const,
          namingStrategy: new SnakeNamingStrategy(),
          host: dbConnection.host,
          port: dbConnection.port,
          username: dbConnection.username,
          password: dbConnection.password,
          database: dbConnection.database,
          entities: [__dirname + "/**/*.entity{.ts,.js}"],
          migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
          // Subscribers are managed by NestJS DI (AuditSubscriber self-registers).
          // Do NOT use file-based subscriber loading — TypeORM's container can't
          // inject NestJS services (ClsService, etc.), causing runtime crashes.
          subscribers: [],
          // SECURITY: synchronize MUST always be false in production.
          synchronize:
            !isProduction &&
            configService.get("DB_SYNCHRONIZE", "false") === "true",
          logging:
            configService.get("DB_LOGGING", "false") === "true"
              ? true
              : (["error", "warn", "migration"] as const),
          logger: new CustomTypeOrmLogger(
            configService.get<number>("DB_SLOW_QUERY_THRESHOLD", 1000),
          ),
          maxQueryExecutionTime: configService.get<number>(
            "DB_SLOW_QUERY_THRESHOLD",
            1000,
          ),
          ssl: useSsl
            ? {
                // Managed Postgres providers commonly terminate TLS with cert
                // chains that require opting out of strict verification unless
                // the environment explicitly enables it.
                rejectUnauthorized:
                  sslRejectUnauthorized === "true"
                    ? true
                    : sslRejectUnauthorized === "false"
                      ? false
                      : !databaseUrl,
              }
            : false,
          // Connection pool: respect Supabase/PgBouncer limits
          // Free tier: max ~10, Pro tier: max ~50
          poolSize,
          extra: {
            max: poolSize,
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            // Supabase transaction-mode pooler (port 6543) reuses connections
            // across requests. Named prepared statements are connection-specific
            // and fail when PgBouncer assigns a different backend connection.
            // Setting statement_timeout protects against runaway queries.
            statement_timeout: 30000,
          },
          // Auto-run migrations on startup if DB_MIGRATIONS_RUN=true
          migrationsRun:
            configService.get("DB_MIGRATIONS_RUN", "false") === "true",
        };
      },
    }),

    // ============================================
    // CACHING - Redis
    // ============================================

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get("REDIS_URL");
        const redisHost = configService.get("REDIS_HOST");
        const ttl = configService.get<number>("CACHE_TTL", 300) * 1000;

        // If Redis is configured, use Redis store; otherwise fall back to in-memory
        if (redisUrl || redisHost) {
          try {
            const storePromise = redisStore({
              url: redisUrl || undefined,
              socket: !redisUrl
                ? {
                    host: redisHost,
                    port: configService.get<number>("REDIS_PORT", 6379),
                    connectTimeout: 5000,
                  }
                : {
                    connectTimeout: 5000,
                  },
              password: configService.get("REDIS_PASSWORD") || undefined,
              ttl,
            });
            // Timeout after 10s to prevent hanging during startup
            const store = await Promise.race([
              storePromise,
              new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error("Redis connection timeout (10s)")),
                  10000,
                ),
              ),
            ]);
            return { store };
          } catch (error) {
            // If Redis connection fails, gracefully fall back to in-memory
            console.warn(
              `⚠️ Redis cache unavailable, using in-memory cache: ${error instanceof Error ? error.message : error}`,
            );
            return { ttl };
          }
        }

        // No Redis configured — use in-memory cache (default cache-manager store)
        return { ttl };
      },
    }),

    // ============================================
    // QUEUE - Bull with Redis
    // ============================================

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get("REDIS_URL");
        const redisHost = configService.get("REDIS_HOST");

        // BullMQ requires Redis — configure connection with retry logic
        const connection = redisUrl
          ? {
              url: redisUrl,
              maxRetriesPerRequest: null as null,
              connectTimeout: 10000,
              retryStrategy: (times: number) => Math.min(times * 500, 5000),
            }
          : {
              host: redisHost || "localhost",
              port: configService.get<number>("REDIS_PORT", 6379),
              password: configService.get("REDIS_PASSWORD"),
              maxRetriesPerRequest: null as null,
              connectTimeout: 10000,
              retryStrategy: (times: number) => Math.min(times * 500, 5000),
            };

        return { connection };
      },
    }),

    // ============================================
    // RATE LIMITING
    // ============================================

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isAgent =
          configService.get("AGENT_MODE") === "true" &&
          configService.get("NODE_ENV") !== "production";
        return {
          throttlers: isAgent
            ? [{ name: "agent", ttl: 1000, limit: 10000 }]
            : [
                { name: "short", ttl: 1000, limit: 10 },
                { name: "medium", ttl: 10000, limit: 50 },
                {
                  name: "long",
                  ttl: 60000,
                  limit: configService.get<number>("THROTTLE_LIMIT", 100),
                },
              ],
        };
      },
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
      delimiter: ".",
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
          // SECURITY: Always generate our own request ID for tracing.
          // Store client-provided ID separately for correlation if needed.
          const clientRequestId = req.headers["x-request-id"] as
            | string
            | undefined;
          cls.set("requestId", crypto.randomUUID());
          if (clientRequestId) {
            cls.set("clientRequestId", clientRequestId);
          }
          cls.set("startTime", Date.now());
        },
      },
    }),

    // ============================================
    // COMMON MODULE
    // ============================================

    CommonModule,
    TracingModule,

    // ============================================
    // FEATURE MODULES
    // ============================================

    // Prometheus Metrics
    MetricsModule,

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

    // Website Configuration (SEO, Theme, Analytics, etc.)
    WebsiteConfigModule,

    // Content Management System (Articles, Help Content)
    CmsModule,

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

    // Achievements & Badges System
    AchievementsModule,

    // SMS Sending (Eskiz, PlayMobile)
    SmsModule,

    // Email Sending (SMTP / NodeMailer)
    EmailModule,

    // Container Management (Hoppers/Bunkers)
    ContainersModule,

    // Analytics (Daily Stats, Dashboards, Snapshots, Reports)
    AnalyticsModule,

    // Counterparties, Contracts & Commission Calculations
    CounterpartyModule,

    // Access Request Management (Telegram bot onboarding)
    AccessRequestsModule,

    // Web Push Notifications (VAPID-based browser push)
    WebPushModule,

    // Data Parser (CSV, Excel, JSON file parsing with UZ validators)
    DataParserModule,

    // Agent Bridge (AI agent session tracking & progress)
    AgentBridgeModule,

    // Firebase Cloud Messaging (Mobile Push Notifications)
    FcmModule,

    // Cash & Finance Management
    CashFinanceModule,
    InvestorModule,

    // Collections & Payment Recovery
    CollectionsModule,

    // Trip Analytics & Performance Metrics
    TripAnalyticsModule,

    // VHM24 System Integration
    Vhm24IntegrationModule,
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
