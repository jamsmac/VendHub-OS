/**
 * Exception Helpers
 *
 * Convenience factory functions that create pre-configured BusinessException
 * instances for the most common error scenarios. Import these in services
 * instead of constructing BusinessException directly.
 *
 * Usage:
 *   import { notFound, insufficientStock } from '../../common/exceptions';
 *
 *   throw notFound('Product', productId);
 *   throw insufficientStock(productId, 5, 2);
 */

import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';
import { BusinessException } from './business.exception';

export { BusinessException } from './business.exception';

// ---------------------------------------------------------------------------
// General helpers
// ---------------------------------------------------------------------------

/**
 * Resource not found.
 * Maps well-known resource names to specific error codes; falls back to
 * the generic NOT_FOUND code for unknown resources.
 */
export function notFound(resource: string, id?: string): BusinessException {
  const resourceCodeMap: Record<string, ErrorCode> = {
    Machine: ErrorCode.MACHINE_NOT_FOUND,
    Product: ErrorCode.PRODUCT_NOT_FOUND,
    Task: ErrorCode.TASK_NOT_FOUND,
    Order: ErrorCode.ORDER_NOT_FOUND,
    Employee: ErrorCode.EMPLOYEE_NOT_FOUND,
    Organization: ErrorCode.ORG_NOT_FOUND,
  };

  const errorCode = resourceCodeMap[resource] ?? ErrorCode.NOT_FOUND;
  const message = id
    ? `${resource} with id "${id}" not found`
    : `${resource} not found`;

  return new BusinessException(errorCode, message, HttpStatus.NOT_FOUND, {
    resource,
    ...(id && { id }),
  });
}

/**
 * Access denied / forbidden action.
 */
export function forbidden(message = 'Access denied'): BusinessException {
  return new BusinessException(
    ErrorCode.FORBIDDEN,
    message,
    HttpStatus.FORBIDDEN,
  );
}

/**
 * Resource conflict (duplicate, already exists, etc.).
 */
export function conflict(message: string): BusinessException {
  return new BusinessException(
    ErrorCode.CONFLICT,
    message,
    HttpStatus.CONFLICT,
  );
}

/**
 * Generic bad request with optional details payload.
 */
export function badRequest(
  message: string,
  details?: Record<string, any>,
): BusinessException {
  return new BusinessException(
    ErrorCode.BAD_REQUEST,
    message,
    HttpStatus.BAD_REQUEST,
    details,
  );
}

// ---------------------------------------------------------------------------
// Business-logic helpers
// ---------------------------------------------------------------------------

/**
 * Inventory: not enough stock to fulfil the operation.
 */
export function insufficientStock(
  productId: string,
  required: number,
  available: number,
): BusinessException {
  return new BusinessException(
    ErrorCode.INSUFFICIENT_STOCK,
    `Insufficient stock for product "${productId}": required ${required}, available ${available}`,
    HttpStatus.UNPROCESSABLE_ENTITY,
    { productId, required, available },
  );
}

/**
 * Wallet: balance too low to complete a transaction.
 */
export function insufficientBalance(
  amount: number,
  balance: number,
): BusinessException {
  return new BusinessException(
    ErrorCode.INSUFFICIENT_BALANCE,
    `Insufficient balance: required ${amount}, available ${balance}`,
    HttpStatus.UNPROCESSABLE_ENTITY,
    { amount, balance },
  );
}

/**
 * Payment processing failure from an external provider.
 */
export function paymentFailed(
  provider: string,
  reason: string,
): BusinessException {
  return new BusinessException(
    ErrorCode.PAYMENT_FAILED,
    `Payment failed via ${provider}: ${reason}`,
    HttpStatus.BAD_GATEWAY,
    { provider, reason },
  );
}
