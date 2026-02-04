/**
 * Transform Interceptor
 * Wraps all responses in a standard format
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already in standard format, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
          };
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}

/**
 * Interceptor that adds pagination metadata
 */
@Injectable()
export class PaginationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Check if response has pagination structure
        if (data && 'data' in data && 'total' in data) {
          const { page = 1, limit = 20 } = context.switchToHttp().getRequest().query;
          const totalPages = Math.ceil(data.total / limit);

          return {
            success: true,
            data: data.data,
            meta: {
              total: data.total,
              page: parseInt(page, 10),
              limit: parseInt(limit, 10),
              totalPages,
              hasNextPage: parseInt(page, 10) < totalPages,
              hasPreviousPage: parseInt(page, 10) > 1,
            },
            timestamp: new Date().toISOString(),
          };
        }

        return data;
      }),
    );
  }
}
