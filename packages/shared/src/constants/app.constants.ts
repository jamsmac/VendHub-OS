/**
 * Application Constants for VendHub OS
 */

// App info
export const APP_NAME = 'VendHub OS';
export const APP_VERSION = '1.0.0';
export const API_VERSION = 'v1';

// Supported locales
export const SUPPORTED_LOCALES = ['ru', 'uz', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'ru';

// Supported timezones
export const SUPPORTED_TIMEZONES = [
  'Asia/Tashkent',
  'Asia/Samarkand',
  'Europe/Moscow',
  'UTC',
] as const;
export const DEFAULT_TIMEZONE = 'Asia/Tashkent';

// Supported currencies
export const SUPPORTED_CURRENCIES = ['UZS', 'USD', 'RUB', 'EUR'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY_CODE: SupportedCurrency = 'UZS';

// Currency formatting
export const CURRENCY_CONFIG: Record<SupportedCurrency, {
  symbol: string;
  decimals: number;
  position: 'before' | 'after';
  thousandSeparator: string;
  decimalSeparator: string;
}> = {
  UZS: {
    symbol: "so'm",
    decimals: 0,
    position: 'after',
    thousandSeparator: ' ',
    decimalSeparator: ',',
  },
  USD: {
    symbol: '$',
    decimals: 2,
    position: 'before',
    thousandSeparator: ',',
    decimalSeparator: '.',
  },
  RUB: {
    symbol: '₽',
    decimals: 2,
    position: 'after',
    thousandSeparator: ' ',
    decimalSeparator: ',',
  },
  EUR: {
    symbol: '€',
    decimals: 2,
    position: 'after',
    thousandSeparator: ' ',
    decimalSeparator: ',',
  },
};

// Date/time formats
export const DATE_FORMATS = {
  DATE: 'dd.MM.yyyy',
  DATE_SHORT: 'dd.MM',
  DATE_LONG: 'd MMMM yyyy',
  TIME: 'HH:mm',
  TIME_SECONDS: 'HH:mm:ss',
  DATETIME: 'dd.MM.yyyy HH:mm',
  DATETIME_LONG: 'd MMMM yyyy, HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;

// File upload limits
export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILES_PER_REQUEST: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
  WEEK: 604800, // 7 days
} as const;

// Session/token expiration
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
  TWO_FACTOR_TOKEN: '5m',
  PASSWORD_RESET_TOKEN: '1h',
  EMAIL_VERIFICATION_TOKEN: '24h',
} as const;

// Rate limiting
export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 100,
  LOGIN_ATTEMPTS_PER_HOUR: 10,
  PASSWORD_RESET_PER_HOUR: 3,
  FILE_UPLOADS_PER_HOUR: 50,
} as const;

// Geolocation
export const GEOLOCATION = {
  DEFAULT_SEARCH_RADIUS: 5000, // 5km in meters
  MAX_SEARCH_RADIUS: 50000, // 50km
  MIN_SEARCH_RADIUS: 100, // 100m
  LOCATION_VERIFICATION_RADIUS: 100, // 100m for task verification
  TASHKENT_CENTER: {
    lat: 41.2995,
    lng: 69.2401,
  },
} as const;

// Inventory thresholds
export const INVENTORY_THRESHOLDS = {
  LOW_STOCK_PERCENTAGE: 20, // 20% of capacity
  CRITICAL_STOCK_PERCENTAGE: 10, // 10% of capacity
  OVERSTOCK_PERCENTAGE: 95, // 95% of capacity
} as const;

// Task settings
export const TASK_SETTINGS = {
  DEFAULT_PRIORITY: 'normal',
  PHOTO_MIN_WIDTH: 640,
  PHOTO_MIN_HEIGHT: 480,
  PHOTO_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_TASKS_PER_DAY: 50,
  TASK_OVERDUE_HOURS: 24,
} as const;

// Notification channels (simple string array)
export const NOTIFICATION_CHANNELS = ['email', 'telegram', 'sms', 'push'] as const;
export type NotificationChannelType = (typeof NOTIFICATION_CHANNELS)[number];

// Report periods
export const REPORT_PERIODS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_QUARTER: 'this_quarter',
  THIS_YEAR: 'this_year',
  CUSTOM: 'custom',
} as const;

// Feature flags
export const FEATURES = {
  TWO_FACTOR_AUTH: true,
  TELEGRAM_BOT: true,
  FISCAL_INTEGRATION: true,
  MOBILE_PAYMENTS: true,
  MACHINE_TELEMETRY: true,
  ROUTE_OPTIMIZATION: false, // Coming soon
  AI_RECOMMENDATIONS: false, // Coming soon
} as const;
