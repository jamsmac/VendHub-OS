/**
 * Standardized Error Codes for VendHub OS API
 *
 * All error responses include an errorCode field from this enum,
 * enabling clients to handle specific errors programmatically.
 *
 * Naming convention:
 *   - General errors: UPPERCASE (e.g., NOT_FOUND)
 *   - Domain-specific errors: DOMAIN_CODE (e.g., AUTH_TOKEN_EXPIRED)
 *
 * Format: DOMAIN_ACTION_REASON (e.g., MACHINE_OFFLINE, TRANSACTION_PAYMENT_FAILED)
 */
export enum ErrorCode {
  // ============================================================================
  // GENERIC / HTTP-LEVEL ERRORS
  // ============================================================================
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  FORBIDDEN = "FORBIDDEN",
  UNAUTHORIZED = "UNAUTHORIZED",
  CONFLICT = "CONFLICT",
  BAD_REQUEST = "BAD_REQUEST",
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID",
  AUTH_TOKEN_BLACKLISTED = "AUTH_TOKEN_BLACKLISTED",
  AUTH_REFRESH_TOKEN_INVALID = "AUTH_REFRESH_TOKEN_INVALID",
  AUTH_ACCOUNT_LOCKED = "AUTH_ACCOUNT_LOCKED",
  AUTH_ACCOUNT_DISABLED = "AUTH_ACCOUNT_DISABLED",
  AUTH_2FA_REQUIRED = "AUTH_2FA_REQUIRED",
  AUTH_2FA_INVALID_CODE = "AUTH_2FA_INVALID_CODE",
  AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_INSUFFICIENT_PERMISSIONS",
  AUTH_SESSION_EXPIRED = "AUTH_SESSION_EXPIRED",

  // ============================================================================
  // USERS
  // ============================================================================
  USER_NOT_FOUND = "USER_NOT_FOUND",
  USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS",
  USER_EMAIL_TAKEN = "USER_EMAIL_TAKEN",
  USER_PHONE_TAKEN = "USER_PHONE_TAKEN",
  USER_INVALID_ROLE = "USER_INVALID_ROLE",

  // ============================================================================
  // ORGANIZATIONS
  // ============================================================================
  ORG_NOT_FOUND = "ORG_NOT_FOUND",
  ORG_ALREADY_EXISTS = "ORG_ALREADY_EXISTS",
  ORG_HAS_CHILDREN = "ORG_HAS_CHILDREN",
  ORG_ACCESS_DENIED = "ORG_ACCESS_DENIED",

  // ============================================================================
  // MACHINES
  // ============================================================================
  MACHINE_NOT_FOUND = "MACHINE_NOT_FOUND",
  MACHINE_ALREADY_EXISTS = "MACHINE_ALREADY_EXISTS",
  MACHINE_OFFLINE = "MACHINE_OFFLINE",
  MACHINE_MAINTENANCE_REQUIRED = "MACHINE_MAINTENANCE_REQUIRED",
  MACHINE_SLOT_FULL = "MACHINE_SLOT_FULL",
  MACHINE_SLOT_EMPTY = "MACHINE_SLOT_EMPTY",

  // ============================================================================
  // TRANSACTIONS
  // ============================================================================
  TRANSACTION_NOT_FOUND = "TRANSACTION_NOT_FOUND",
  TRANSACTION_ALREADY_PROCESSED = "TRANSACTION_ALREADY_PROCESSED",
  TRANSACTION_REFUND_EXCEEDED = "TRANSACTION_REFUND_EXCEEDED",
  TRANSACTION_PAYMENT_FAILED = "TRANSACTION_PAYMENT_FAILED",

  // ============================================================================
  // PRODUCTS
  // ============================================================================
  PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND",
  PRODUCT_OUT_OF_STOCK = "PRODUCT_OUT_OF_STOCK",
  PRODUCT_PRICE_INVALID = "PRODUCT_PRICE_INVALID",

  // ============================================================================
  // INVENTORY & COLLECTIONS
  // ============================================================================
  COLLECTION_NOT_FOUND = "COLLECTION_NOT_FOUND",
  COLLECTION_ALREADY_VERIFIED = "COLLECTION_ALREADY_VERIFIED",
  COLLECTION_AMOUNT_MISMATCH = "COLLECTION_AMOUNT_MISMATCH",
  INSUFFICIENT_STOCK = "INVENTORY_INSUFFICIENT_STOCK",

  // ============================================================================
  // PAYMENTS
  // ============================================================================
  PAYMENT_PROVIDER_ERROR = "PAYMENT_PROVIDER_ERROR",
  PAYMENT_TIMEOUT = "PAYMENT_TIMEOUT",
  PAYMENT_INVALID_AMOUNT = "PAYMENT_INVALID_AMOUNT",
  PAYMENT_FISCAL_ERROR = "PAYMENT_FISCAL_ERROR",
  PAYMENT_FAILED = "PAYMENT_FAILED",

  // ============================================================================
  // WALLET / BALANCE
  // ============================================================================
  INSUFFICIENT_BALANCE = "WALLET_INSUFFICIENT_BALANCE",

  // ============================================================================
  // INTEGRATIONS
  // ============================================================================
  INTEGRATION_CONNECTION_FAILED = "INTEGRATION_CONNECTION_FAILED",
  INTEGRATION_IMPORT_FAILED = "INTEGRATION_IMPORT_FAILED",
  INTEGRATION_VALIDATION_ERROR = "INTEGRATION_VALIDATION_ERROR",
  IMPORT_VALIDATION_FAILED = "IMPORT_VALIDATION_FAILED",

  // ============================================================================
  // STORAGE
  // ============================================================================
  STORAGE_UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED",
  STORAGE_FILE_NOT_FOUND = "STORAGE_FILE_NOT_FOUND",
  STORAGE_FILE_TOO_LARGE = "STORAGE_FILE_TOO_LARGE",
  STORAGE_INVALID_TYPE = "STORAGE_INVALID_TYPE",

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================
  NOTIFICATION_NOT_FOUND = "NOTIFICATION_NOT_FOUND",
  NOTIFICATION_TEMPLATE_NOT_FOUND = "NOTIFICATION_TEMPLATE_NOT_FOUND",
  NOTIFICATION_SEND_FAILED = "NOTIFICATION_SEND_FAILED",
  NOTIFICATION_ALREADY_READ = "NOTIFICATION_ALREADY_READ",

  // ============================================================================
  // REPORTS
  // ============================================================================
  REPORT_NOT_FOUND = "REPORT_NOT_FOUND",
  REPORT_GENERATION_FAILED = "REPORT_GENERATION_FAILED",
  REPORT_INVALID_PERIOD = "REPORT_INVALID_PERIOD",

  // ============================================================================
  // PROMO / DISCOUNT
  // ============================================================================
  PROMO_CODE_EXPIRED = "PROMO_CODE_EXPIRED",
  PROMO_CODE_LIMIT_REACHED = "PROMO_CODE_LIMIT_REACHED",

  // ============================================================================
  // RECONCILIATION
  // ============================================================================
  RECONCILIATION_MISMATCH = "RECONCILIATION_MISMATCH",

  // ============================================================================
  // DATABASE
  // ============================================================================
  DB_UNIQUE_VIOLATION = "DB_UNIQUE_VIOLATION",
  DB_FOREIGN_KEY_VIOLATION = "DB_FOREIGN_KEY_VIOLATION",
  DB_NOT_NULL_VIOLATION = "DB_NOT_NULL_VIOLATION",
  DB_INVALID_DATA = "DB_INVALID_DATA",

  // ============================================================================
  // LEGACY / DEPRECATED (kept for backwards compatibility)
  // ============================================================================
  INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
  TOKEN_INVALID = "AUTH_TOKEN_INVALID",
  TWO_FA_REQUIRED = "AUTH_2FA_REQUIRED",
  TWO_FA_INVALID = "AUTH_2FA_INVALID_CODE",
  TASK_NOT_FOUND = "TASK_NOT_FOUND",
  ORDER_NOT_FOUND = "ORDER_NOT_FOUND",
  EMPLOYEE_NOT_FOUND = "EMPLOYEE_NOT_FOUND",
}
