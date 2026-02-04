/**
 * Business Exception
 *
 * Typed exception for domain/business-logic errors.
 * Carries a machine-readable errorCode (ErrorCode enum) alongside
 * the human-readable message and optional details payload.
 *
 * Usage:
 *   throw new BusinessException(
 *     ErrorCode.INSUFFICIENT_STOCK,
 *     'Not enough items in stock',
 *     HttpStatus.UNPROCESSABLE_ENTITY,
 *     { productId: '...', required: 5, available: 2 },
 *   );
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, any>,
  ) {
    super(
      {
        statusCode,
        errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}
