/**
 * Winston Logger Service for VendHub OS
 *
 * Provides structured JSON logging in production and
 * human-readable colored output in development.
 *
 * Implements NestJS LoggerService interface so it can be
 * used as the application-wide logger via app.useLogger().
 */

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private logger: winston.Logger;

  constructor(private configService: ConfigService) {
    const isProduction = configService.get('NODE_ENV') === 'production';

    this.logger = winston.createLogger({
      level: configService.get('LOG_LEVEL', 'info'),
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? JSON.stringify(meta)
                : '';
              return `${timestamp} [${level}] ${message} ${metaStr}`;
            }),
          ),
      defaultMeta: {
        service: 'vendhub-api',
        version: configService.get('APP_VERSION', '1.0.0'),
      },
      transports: [new winston.transports.Console()],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  /**
   * Log an HTTP request with structured data.
   * Used by the LoggingInterceptor for consistent request/response logging.
   */
  logRequest(data: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    userId?: string;
    requestId?: string;
    ip?: string;
  }) {
    this.logger.info('HTTP Request', { type: 'http_request', ...data });
  }

  /**
   * Log a business domain event (e.g. machine restocked, payment processed).
   */
  logBusinessEvent(event: string, data: Record<string, any>) {
    this.logger.info(event, { type: 'business_event', ...data });
  }

  /**
   * Log a security-related event (e.g. failed login, role escalation attempt).
   */
  logSecurityEvent(event: string, data: Record<string, any>) {
    this.logger.warn(event, { type: 'security_event', ...data });
  }

  /**
   * Log a performance measurement (e.g. query duration, external API call).
   */
  logPerformance(
    operation: string,
    duration: number,
    meta?: Record<string, any>,
  ) {
    this.logger.info('Performance', {
      type: 'performance',
      operation,
      duration_ms: duration,
      ...meta,
    });
  }
}
