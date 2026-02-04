/**
 * Standardized Error Codes for VendHub OS API
 *
 * All error responses include an errorCode field from this enum,
 * enabling clients to handle specific errors programmatically.
 *
 * Naming convention:
 *   - General errors: UPPERCASE (e.g., NOT_FOUND)
 *   - Domain-specific errors: DOMAIN_ERROR (e.g., AUTH_TOKEN_EXPIRED)
 */
export enum ErrorCode {
  // ============================================================================
  // General
  // ============================================================================
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // ============================================================================
  // Auth
  // ============================================================================
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  ACCOUNT_LOCKED = 'AUTH_ACCOUNT_LOCKED',
  TWO_FA_REQUIRED = 'AUTH_2FA_REQUIRED',
  TWO_FA_INVALID = 'AUTH_2FA_INVALID',

  // ============================================================================
  // Organization
  // ============================================================================
  ORG_NOT_FOUND = 'ORG_NOT_FOUND',
  ORG_ACCESS_DENIED = 'ORG_ACCESS_DENIED',

  // ============================================================================
  // Resource not found
  // ============================================================================
  MACHINE_NOT_FOUND = 'MACHINE_NOT_FOUND',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  EMPLOYEE_NOT_FOUND = 'EMPLOYEE_NOT_FOUND',

  // ============================================================================
  // Business logic
  // ============================================================================
  INSUFFICIENT_STOCK = 'INVENTORY_INSUFFICIENT_STOCK',
  INSUFFICIENT_BALANCE = 'WALLET_INSUFFICIENT_BALANCE',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PROMO_CODE_EXPIRED = 'PROMO_CODE_EXPIRED',
  PROMO_CODE_LIMIT_REACHED = 'PROMO_CODE_LIMIT_REACHED',
  IMPORT_VALIDATION_FAILED = 'IMPORT_VALIDATION_FAILED',
  RECONCILIATION_MISMATCH = 'RECONCILIATION_MISMATCH',
}
