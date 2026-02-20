/**
 * HTTP Exception Filter
 * Standardizes error responses across the API.
 *
 * Response shape:
 * {
 *   success: false,
 *   statusCode: number,
 *   errorCode: string,        // ErrorCode enum value
 *   message: string,
 *   details?: Record<string, any>,
 *   errors?: string[],        // validation error list
 *   path: string,
 *   timestamp: string,
 *   requestId?: string,
 *   stack?: string,           // development only
 * }
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { ErrorCode } from '../constants/error-codes';
import { BusinessException } from '../exceptions/business.exception';

interface ErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  details?: Record<string, any>;
  errors?: string[];
  path: string;
  timestamp: string;
  requestId?: string;
  stack?: string;
}

const isProduction = process.env.NODE_ENV === 'production';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: Record<string, any> | undefined;
    let errors: string[] | undefined;

    // -----------------------------------------------------------------
    // 1. BusinessException  (our typed domain exceptions)
    // -----------------------------------------------------------------
    if (exception instanceof BusinessException) {
      statusCode = exception.getStatus();
      errorCode = exception.errorCode;
      message = (exception.getResponse() as any).message ?? exception.message;
      details = exception.details;

    // -----------------------------------------------------------------
    // 2. Standard HttpException  (NestJS built-in / third-party)
    // -----------------------------------------------------------------
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorCode = this.httpStatusToErrorCode(statusCode);
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;

        // Preserve errorCode if the response already carries one
        if (responseObj.errorCode) {
          errorCode = responseObj.errorCode;
        }

        message = responseObj.message || message;

        // Handle class-validator validation errors (array of messages)
        if (Array.isArray(responseObj.message)) {
          errors = responseObj.message;
          errorCode = ErrorCode.VALIDATION_ERROR;
          message = 'Validation error';
        }
      }

    // -----------------------------------------------------------------
    // 3. TypeORM QueryFailedError
    // -----------------------------------------------------------------
    } else if (exception instanceof QueryFailedError) {
      statusCode = HttpStatus.BAD_REQUEST;
      errorCode = ErrorCode.BAD_REQUEST;
      message = this.handleDatabaseError(exception);

    // -----------------------------------------------------------------
    // 4. TypeORM EntityNotFoundError
    // -----------------------------------------------------------------
    } else if (exception instanceof EntityNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      errorCode = ErrorCode.NOT_FOUND;
      message = 'Record not found';

    // -----------------------------------------------------------------
    // 5. Generic Error / unknown
    // -----------------------------------------------------------------
    } else if (exception instanceof Error) {
      message = isProduction ? 'Internal server error' : exception.message;
    }

    // Log
    this.logError(exception, request, statusCode);

    // Build response
    const requestId =
      (request.headers['x-request-id'] as string) ?? undefined;

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode,
      errorCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // Optional fields -- only include when present
    if (details) {
      errorResponse.details = details;
    }
    if (errors) {
      errorResponse.errors = errors;
    }
    if (requestId) {
      errorResponse.requestId = requestId;
    }

    // Stack trace: only in non-production environments
    if (!isProduction && exception instanceof Error && exception.stack) {
      errorResponse.stack = exception.stack;
    }

    response.status(statusCode).json(errorResponse);
  }

  // ===================================================================
  // Private helpers
  // ===================================================================

  /**
   * Map an HTTP status code to the closest generic ErrorCode value.
   */
  private httpStatusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.TOO_MANY_REQUESTS;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION_ERROR;
      default:
        return status >= 500
          ? ErrorCode.INTERNAL_ERROR
          : ErrorCode.BAD_REQUEST;
    }
  }

  /**
   * Handle database-specific errors (PostgreSQL error codes).
   */
  private handleDatabaseError(error: QueryFailedError): string {
    const driverError = error.driverError as any;

    switch (driverError?.code) {
      case '23505': // unique_violation
        return this.extractUniqueViolationMessage(driverError);
      case '23503': // foreign_key_violation
        return 'Referenced record does not exist';
      case '23502': // not_null_violation
        return 'Required field is missing';
      case '22P02': // invalid_text_representation
        return 'Invalid data format';
      case '22001': // string_data_right_truncation
        return 'Field value exceeds maximum length';
      default:
        return 'Database error';
    }
  }

  /**
   * Extract a user-friendly message from a PostgreSQL unique-constraint
   * violation.
   */
  private extractUniqueViolationMessage(error: any): string {
    const detail = error.detail || '';

    const match = detail.match(/Key \(([^)]+)\)/);
    if (match) {
      const fieldName = match[1];
      const fieldLabels: Record<string, string> = {
        email: 'email',
        phone: 'phone',
        code: 'code',
        sku: 'SKU',
        serial_number: 'serial number',
        inn: 'INN',
      };

      const label = fieldLabels[fieldName] || fieldName;
      return `A record with this ${label} already exists`;
    }

    return 'A record with these values already exists';
  }

  /**
   * Log the error with the appropriate severity level.
   */
  private logError(
    exception: unknown,
    request: Request,
    statusCode: number,
  ): void {
    const errorInfo = {
      path: request.url,
      method: request.method,
      ip: request.ip,
      userId: (request as any).user?.id,
      statusCode,
      requestId: request.headers['x-request-id'],
    };

    if (statusCode >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
        errorInfo,
      );
    } else if (statusCode >= 400) {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${statusCode}`,
        errorInfo,
      );
    }
  }
}
