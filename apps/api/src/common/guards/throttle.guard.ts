/**
 * Throttle Guard
 * Rate limiting for API endpoints
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number; // Number of requests allowed
  ttl: number; // Time window in seconds
  keyPrefix?: string; // Custom key prefix
}

/**
 * Decorator to set custom throttle limits for an endpoint
 */
export const Throttle = (limit: number, ttl: number, keyPrefix?: string) => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    const options: ThrottleOptions = { limit, ttl, keyPrefix };
    if (descriptor) {
      Reflect.defineMetadata(THROTTLE_KEY, options, descriptor.value);
    } else {
      Reflect.defineMetadata(THROTTLE_KEY, options, target);
    }
    return descriptor || target;
  };
};

/**
 * Decorator to skip throttling
 */
export const SkipThrottle = () => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(THROTTLE_KEY, null, descriptor.value);
    } else {
      Reflect.defineMetadata(THROTTLE_KEY, null, target);
    }
    return descriptor || target;
  };
};

// Default throttle settings
const DEFAULT_THROTTLE: ThrottleOptions = {
  limit: 100, // 100 requests
  ttl: 60, // per 60 seconds
};

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get throttle options from decorator
    const options = this.reflector.getAllAndOverride<ThrottleOptions | null>(
      THROTTLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Skip throttling if explicitly disabled
    if (options === null) {
      return true;
    }

    const throttleOptions = options || DEFAULT_THROTTLE;
    const request = context.switchToHttp().getRequest();

    // Generate rate limit key
    const key = this.generateKey(request, throttleOptions, context);

    // Get current count
    const currentCount = await this.cacheManager.get<number>(key) || 0;

    // Check if limit exceeded
    if (currentCount >= throttleOptions.limit) {
      throw new HttpException(
        {
          success: false,
          message: 'Слишком много запросов. Попробуйте позже.',
          retryAfter: throttleOptions.ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    await this.cacheManager.set(key, currentCount + 1, throttleOptions.ttl * 1000);

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', throttleOptions.limit);
    response.setHeader('X-RateLimit-Remaining', throttleOptions.limit - currentCount - 1);
    response.setHeader('X-RateLimit-Reset', Date.now() + throttleOptions.ttl * 1000);

    return true;
  }

  /**
   * Generate unique key for rate limiting
   */
  private generateKey(
    request: any,
    options: ThrottleOptions,
    context: ExecutionContext,
  ): string {
    const prefix = options.keyPrefix || 'throttle';
    const handler = context.getHandler().name;
    const controller = context.getClass().name;

    // Use user ID if authenticated, otherwise use IP
    const identifier = request.user?.id || request.ip || 'anonymous';

    return `${prefix}:${controller}:${handler}:${identifier}`;
  }
}

// ============================================================================
// Preset throttle decorators for common use cases
// ============================================================================

/**
 * Strict throttle for authentication endpoints
 */
export const AuthThrottle = () => Throttle(5, 60); // 5 requests per minute

/**
 * Relaxed throttle for read operations
 */
export const ReadThrottle = () => Throttle(200, 60); // 200 requests per minute

/**
 * Moderate throttle for write operations
 */
export const WriteThrottle = () => Throttle(50, 60); // 50 requests per minute

/**
 * Very strict throttle for sensitive operations
 */
export const SensitiveThrottle = () => Throttle(3, 300); // 3 requests per 5 minutes

/**
 * Webhook throttle
 */
export const WebhookThrottle = () => Throttle(1000, 60); // 1000 requests per minute
