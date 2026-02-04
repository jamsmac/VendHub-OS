/**
 * VendHub OS - Common Constants
 * Centralized constants to avoid magic numbers in code
 */

// Error Codes
export * from './error-codes';

// ============================================================================
// TIME CONSTANTS
// ============================================================================

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const MS_PER_WEEK = 7 * MS_PER_DAY;

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;

// ============================================================================
// SUBSCRIPTION TIER LIMITS
// ============================================================================

export const TIER_LIMITS = {
  FREE: {
    maxUsers: 3,
    maxMachines: 5,
    maxProducts: 50,
    maxTransactionsPerMonth: 1000,
    maxStorageMb: 100,
    features: ['basic_reports', 'email_support'],
  },
  STARTER: {
    maxUsers: 10,
    maxMachines: 25,
    maxProducts: 200,
    maxTransactionsPerMonth: 10000,
    maxStorageMb: 500,
    features: ['basic_reports', 'inventory_management', 'email_support', 'telegram_bot'],
  },
  PROFESSIONAL: {
    maxUsers: 50,
    maxMachines: 100,
    maxProducts: 1000,
    maxTransactionsPerMonth: 100000,
    maxStorageMb: 2000,
    features: [
      'advanced_reports',
      'inventory_management',
      'multi_location',
      'api_access',
      'priority_support',
      'telegram_bot',
      'sms_notifications',
    ],
  },
  ENTERPRISE: {
    maxUsers: -1, // Unlimited
    maxMachines: -1,
    maxProducts: -1,
    maxTransactionsPerMonth: -1,
    maxStorageMb: -1,
    features: [
      'advanced_reports',
      'inventory_management',
      'multi_location',
      'api_access',
      'dedicated_support',
      'custom_integrations',
      'white_label',
      'sla_guarantee',
      'on_premise',
    ],
  },
} as const;

// ============================================================================
// COMPLAINT SLA SETTINGS
// ============================================================================

export const SLA_DEFAULTS = {
  // Response time in hours
  RESPONSE_TIME: {
    critical: 1,
    high: 4,
    medium: 8,
    low: 24,
  },
  // Resolution time in hours
  RESOLUTION_TIME: {
    critical: 4,
    high: 12,
    medium: 24,
    low: 72,
  },
  // Reminder before deadline (hours)
  REMINDER_BEFORE_HOURS: 2,
  // Auto-escalation threshold (hours after SLA breach)
  AUTO_ESCALATION_HOURS: 1,
} as const;

// ============================================================================
// PAGINATION DEFAULTS
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// ============================================================================
// CACHE TTL (in seconds)
// ============================================================================

export const CACHE_TTL = {
  // Short-lived cache
  REAL_TIME_DATA: 30, // 30 seconds
  USER_SESSION: 60, // 1 minute

  // Medium cache
  DASHBOARD_STATS: 300, // 5 minutes
  REPORT_DATA: 600, // 10 minutes

  // Long-lived cache
  REFERENCE_DATA: 3600, // 1 hour
  STATIC_CONFIG: 86400, // 24 hours

  // Very long cache
  MXIK_CODES: 604800, // 1 week
  REGIONS: 604800, // 1 week
} as const;

// ============================================================================
// SECURITY SETTINGS
// ============================================================================

export const SECURITY = {
  // Password settings
  BCRYPT_ROUNDS: 12,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,

  // Login attempts
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,

  // Session settings
  SESSION_DURATION_DAYS: 7,
  REFRESH_TOKEN_DURATION_DAYS: 30,
  ACCESS_TOKEN_DURATION_MINUTES: 15,

  // 2FA settings
  TOTP_WINDOW: 1,
  BACKUP_CODES_COUNT: 10,

  // Token expiry
  PASSWORD_RESET_EXPIRY_HOURS: 1,
  EMAIL_VERIFICATION_EXPIRY_HOURS: 24,
} as const;

// ============================================================================
// FILE UPLOAD LIMITS
// ============================================================================

export const FILE_UPLOAD = {
  MAX_FILE_SIZE_MB: 10,
  MAX_IMAGE_SIZE_MB: 5,
  MAX_DOCUMENT_SIZE_MB: 25,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// ============================================================================
// UZBEKISTAN SPECIFIC
// ============================================================================

export const UZ_SETTINGS = {
  // Currency
  CURRENCY_CODE: 'UZS',
  CURRENCY_SYMBOL: "so'm",

  // Phone format
  PHONE_PREFIX: '+998',
  PHONE_LENGTH: 12, // +998XXXXXXXXX

  // Tax settings
  VAT_RATE_STANDARD: 12,
  VAT_RATE_REDUCED: 0,

  // Working hours (for SLA calculations)
  WORK_START_HOUR: 9,
  WORK_END_HOUR: 18,
  WORK_DAYS: [1, 2, 3, 4, 5], // Monday to Friday
} as const;

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

export const NOTIFICATIONS = {
  // Batch sizes
  EMAIL_BATCH_SIZE: 50,
  SMS_BATCH_SIZE: 100,
  PUSH_BATCH_SIZE: 500,

  // Retry settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: [1000, 5000, 30000], // Exponential backoff

  // Rate limits (per minute)
  SMS_RATE_LIMIT: 10,
  EMAIL_RATE_LIMIT: 100,
} as const;

// ============================================================================
// INVENTORY SETTINGS
// ============================================================================

export const INVENTORY = {
  // Alert thresholds (percentage)
  LOW_STOCK_THRESHOLD: 20,
  CRITICAL_STOCK_THRESHOLD: 10,

  // Expiry warnings (days)
  EXPIRY_WARNING_DAYS: 30,
  EXPIRY_CRITICAL_DAYS: 7,

  // Count tolerance (percentage)
  COUNT_TOLERANCE_PERCENT: 2,
} as const;

// ============================================================================
// MACHINE SETTINGS
// ============================================================================

export const MACHINE = {
  // Heartbeat interval (seconds)
  HEARTBEAT_INTERVAL: 60,
  OFFLINE_THRESHOLD_MINUTES: 5,

  // Telemetry settings
  TELEMETRY_RETENTION_DAYS: 90,
  METRICS_AGGREGATION_INTERVAL_MINUTES: 15,

  // Maintenance
  MAINTENANCE_REMINDER_DAYS: 7,
} as const;
