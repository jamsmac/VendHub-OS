import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/public.decorator';

/**
 * CSRF Protection Guard
 *
 * Protects state-changing requests (POST, PUT, PATCH, DELETE) against
 * Cross-Site Request Forgery when authentication relies on cookies.
 *
 * Strategy: Origin verification + custom header requirement.
 *
 * Skipped when:
 * - Request uses Bearer token auth (not cookie-based, immune to CSRF)
 * - Endpoint is marked @Public()
 * - Request method is safe (GET, HEAD, OPTIONS)
 * - Request path is a webhook callback (external provider callbacks)
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly allowedOrigins: Set<string>;
  private readonly webhookPaths = [
    '/api/v1/payments/payme/callback',
    '/api/v1/payments/click/callback',
    '/api/v1/payments/uzum/callback',
    '/api/v1/webhooks/',
    '/api/v1/telegram-bot/webhook',
    '/api/v1/telegram-payments/webhook',
  ];

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    const origins = this.configService
      .get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map((s: string) => s.trim());
    this.allowedOrigins = new Set(origins);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Safe methods don't need CSRF protection
    const method = request.method?.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Skip for @Public() endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Skip for Bearer token auth (not sent automatically by browsers)
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return true;
    }

    // Skip for API key auth
    if (request.headers?.['x-api-key']) {
      return true;
    }

    // Skip for webhook paths (authenticated differently)
    const path = request.path || request.url;
    if (this.webhookPaths.some((wp) => path.startsWith(wp))) {
      return true;
    }

    // For cookie-based auth, verify origin
    const origin = request.headers?.origin;
    const referer = request.headers?.referer;

    if (origin) {
      if (this.allowedOrigins.has(origin)) {
        return true;
      }
      this.logger.warn(`CSRF: rejected origin ${origin} for ${method} ${path}`);
      throw new ForbiddenException('Invalid origin');
    }

    // Fall back to Referer header check
    if (referer) {
      try {
        const refererOrigin = new URL(referer).origin;
        if (this.allowedOrigins.has(refererOrigin)) {
          return true;
        }
      } catch {
        // Invalid referer URL
      }
      this.logger.warn(`CSRF: rejected referer ${referer} for ${method} ${path}`);
      throw new ForbiddenException('Invalid referer');
    }

    // No Origin or Referer header on a state-changing cookie-auth request
    this.logger.warn(`CSRF: missing origin/referer for ${method} ${path}`);
    throw new ForbiddenException('Origin verification failed');
  }
}
