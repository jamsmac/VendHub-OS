/**
 * VendHub Unified API - Bootstrap
 *
 * Production-ready NestJS application entry point
 * with comprehensive configuration for:
 * - Security (Helmet, CORS, Rate Limiting)
 * - API Versioning
 * - Swagger Documentation
 * - Graceful Shutdown
 * - Compression
 * - Clustering (optional)
 */

import { NestFactory, Reflector } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
  Logger,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import * as Sentry from '@sentry/node';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/services/logger.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ============================================
  // SENTRY ERROR TRACKING
  // ============================================

  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || '1.0.0',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
      ],
      beforeSend(event: Sentry.ErrorEvent) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEV_ENABLED) {
          return null;
        }
        return event;
      },
    });
    logger.log('✅ Sentry initialized');
  } else {
    logger.warn('⚠️ SENTRY_DSN not configured - error tracking disabled');
  }

  // Create app with Express
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);

  // ============================================
  // STRUCTURED LOGGING (Winston)
  // ============================================

  const appLogger = app.get(AppLoggerService);
  app.useLogger(appLogger);

  // ============================================
  // TRUST PROXY (for load balancers)
  // ============================================
  app.set('trust proxy', configService.get('TRUST_PROXY', 1));

  // ============================================
  // SECURITY MIDDLEWARE
  // ============================================

  // Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: configService.get('NODE_ENV') === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookie parser
  app.use(cookieParser(configService.get('COOKIE_SECRET')));

  // Compression
  app.use(compression());

  // Body parsers with size limits
  app.use(json({ limit: configService.get('MAX_BODY_SIZE', '10mb') }));
  app.use(urlencoded({ extended: true, limit: configService.get('MAX_BODY_SIZE', '10mb') }));

  // ============================================
  // CORS CONFIGURATION
  // ============================================

  const corsOrigins = configService.get('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(',').map((origin: string) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-Id',
      'X-Organization-Id',
      'Accept-Language',
    ],
    exposedHeaders: ['X-Request-Id', 'X-Total-Count', 'X-Page', 'X-Limit'],
    maxAge: 86400, // 24 hours
  });

  // ============================================
  // API VERSIONING
  // ============================================

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ============================================
  // GLOBAL PIPES
  // ============================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // ============================================
  // GLOBAL INTERCEPTORS
  // ============================================

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  // ============================================
  // SWAGGER DOCUMENTATION
  // ============================================

  if (configService.get('SWAGGER_ENABLED', 'true') === 'true') {
    const config = new DocumentBuilder()
      .setTitle(configService.get('SWAGGER_TITLE', 'VendHub API'))
      .setDescription(
        `
## VendHub Unified System API

Comprehensive API for vending machine management with:

### Core Features
- **Multi-Tenant Architecture**: Headquarters → Franchise → Branch
- **7 User Roles**: Owner, Admin, Manager, Operator, Warehouse, Accountant, Viewer
- **3-Level Inventory**: Warehouse → Operator → Machine

### Modules
- 🔐 **Auth** - JWT authentication with refresh tokens
- 👥 **Users** - User management with role-based access
- 🏢 **Organizations** - Multi-tenant organization hierarchy
- 🎰 **Machines** - Vending machine management
- 📦 **Products** - Product catalog with recipes
- 📊 **Inventory** - 3-level inventory tracking
- 📋 **Tasks** - Service tasks with photo validation
- 💳 **Payments** - Payme, Click, Uzum integration
- 💰 **Transactions** - Financial transactions
- 📝 **Complaints** - QR-code complaint system with SLA
- 🔔 **Notifications** - Multi-channel notifications
- 📈 **Reports** - Analytics and reporting
- 📜 **Audit** - Comprehensive audit trail
- 🤖 **Telegram Bot** - Customer & staff bot

### Authentication
All endpoints require JWT Bearer authentication except public endpoints.

### Rate Limiting
- Short: 10 requests/second
- Medium: 50 requests/10 seconds
- Long: 100 requests/minute
        `,
      )
      .setVersion(configService.get('SWAGGER_VERSION', '1.0.0'))
      .setContact('VendHub Team', 'https://vendhub.uz', 'support@vendhub.uz')
      .setLicense('Proprietary', '')
      .addServer(
        configService.get('API_URL', 'http://localhost:4000'),
        configService.get('NODE_ENV', 'development'),
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API Key for machine-to-machine communication',
        },
        'API-Key',
      )
      // Tags
      .addTag('auth', 'Authentication & Authorization')
      .addTag('users', 'User Management')
      .addTag('organizations', 'Multi-tenant Organizations')
      .addTag('machines', 'Vending Machines')
      .addTag('products', 'Products & Recipes')
      .addTag('inventory', '3-Level Inventory System')
      .addTag('tasks', 'Service Tasks & Photo Validation')
      .addTag('payments', 'Payment Providers Integration')
      .addTag('transactions', 'Financial Transactions')
      .addTag('complaints', 'QR-Code Complaints with SLA')
      .addTag('notifications', 'Multi-Channel Notifications')
      .addTag('reports', 'Analytics & Reports')
      .addTag('audit', 'Audit Trail')
      .addTag('telegram-bot', 'Telegram Bot')
      .addTag('webhooks', 'Webhook Integration')
      .addTag('references', 'Reference Data')
      .addTag('locations', 'Location Management')
      .addTag('health', 'Health Checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai',
        },
        tryItOutEnabled: true,
      },
      customSiteTitle: 'VendHub API Docs',
      customfavIcon: '/favicon.ico',
      customCss: `
        .swagger-ui .topbar { background-color: #1a1a2e; }
        .swagger-ui .topbar-wrapper img { content: url('/logo.png'); }
      `,
    });

    logger.log(`📚 Swagger docs available at /docs`);
  }

  // ============================================
  // HEALTH ENDPOINTS
  // ============================================

  // Kubernetes-style health probes
  app.getHttpAdapter().get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.getHttpAdapter().get('/ready', async (_req: any, res: any) => {
    try {
      // Check database connectivity
      const dataSource = app.get(DataSource);
      await dataSource.query('SELECT 1');

      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(503).json({
        status: 'not ready',
        error: message,
      });
    }
  });

  // ============================================
  // GRACEFUL SHUTDOWN
  // ============================================

  app.enableShutdownHooks();

  process.on('SIGTERM', async () => {
    logger.log('🛑 SIGTERM received. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('🛑 SIGINT received. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  // ============================================
  // START SERVER
  // ============================================

  const port = configService.get<number>('PORT', 4000);
  const host = configService.get('HOST', '0.0.0.0');

  await app.listen(port, host);

  const appUrl = await app.getUrl();

  logger.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🚀  VendHub Unified API v${configService.get('npm_package_version', '1.0.0').padEnd(40)}    ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   📡  Server:      ${appUrl.padEnd(53)}  ║
║   📚  Swagger:     ${(appUrl + '/docs').padEnd(53)}  ║
║   💚  Health:      ${(appUrl + '/health').padEnd(53)}  ║
║   ✅  Ready:       ${(appUrl + '/ready').padEnd(53)}  ║
║                                                                              ║
║   🌍  Environment: ${(configService.get('NODE_ENV') || 'development').padEnd(53)}  ║
║   🔧  Node:        ${process.version.padEnd(53)}  ║
║   💾  Memory:      ${(Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB').padEnd(53)}  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  Sentry.captureException(reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  Sentry.captureException(error);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
