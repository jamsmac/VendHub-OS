/**
 * Timeout Interceptor
 * Ensures requests don't hang indefinitely
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
  SetMetadata,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const TIMEOUT_KEY = 'request-timeout';

/**
 * Decorator to set custom timeout for an endpoint
 * @param milliseconds Timeout in milliseconds
 */
export const Timeout = (milliseconds: number) =>
  SetMetadata(TIMEOUT_KEY, milliseconds);

const DEFAULT_TIMEOUT = 30000; // 30 seconds

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const customTimeout = this.reflector.getAllAndOverride<number>(
      TIMEOUT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const timeoutValue = customTimeout || DEFAULT_TIMEOUT;

    return next.handle().pipe(
      timeout(timeoutValue),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException(
                'Превышено время ожидания запроса. Попробуйте позже.',
              ),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}

// Preset timeout decorators
export const ShortTimeout = () => Timeout(5000); // 5 seconds
export const LongTimeout = () => Timeout(120000); // 2 minutes
export const ReportTimeout = () => Timeout(300000); // 5 minutes for reports
