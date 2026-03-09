import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { Response } from "express";

export const HTTP_CACHE_TTL_KEY = "http_cache_ttl";

/**
 * Decorator to set Cache-Control max-age on a handler.
 * @param seconds TTL in seconds (default 300 = 5 min)
 */
export const HttpCacheTTL = (seconds = 300) =>
  SetMetadata(HTTP_CACHE_TTL_KEY, seconds);

/**
 * Interceptor that adds Cache-Control headers to GET responses.
 * Only applies when @HttpCacheTTL() decorator is present.
 * Skips caching for non-GET methods.
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (request.method !== "GET") {
      return next.handle();
    }

    const ttl = this.reflector.getAllAndOverride<number | undefined>(
      HTTP_CACHE_TTL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (ttl === undefined) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        response.setHeader(
          "Cache-Control",
          `public, max-age=${ttl}, stale-while-revalidate=${Math.floor(ttl / 2)}`,
        );
      }),
    );
  }
}
