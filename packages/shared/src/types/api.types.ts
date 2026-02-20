/**
 * API Types for VendHub OS
 * Common API request/response types
 */

/**
 * Pagination request parameters
 */
export interface IPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination metadata
 */
export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response
 */
export interface IPaginatedResponse<T> {
  data: T[];
  meta: IPaginationMeta;
}

/**
 * Standard API response wrapper
 */
export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: IApiError;
  timestamp: string;
}

/**
 * API error structure
 */
export interface IApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * Filter parameters for list endpoints
 */
export interface IFilterParams {
  search?: string;
  status?: string | string[];
  type?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
  [key: string]: any;
}

/**
 * Bulk operation request
 */
export interface IBulkOperationRequest<T = any> {
  ids: string[];
  action: string;
  data?: T;
}

/**
 * Bulk operation response
 */
export interface IBulkOperationResponse {
  success: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
  total: number;
  successCount: number;
  failedCount: number;
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  // Machine events
  MACHINE_STATUS_CHANGED = 'machine.status_changed',
  MACHINE_ERROR = 'machine.error',
  MACHINE_OFFLINE = 'machine.offline',
  MACHINE_LOW_STOCK = 'machine.low_stock',

  // Transaction events
  TRANSACTION_COMPLETED = 'transaction.completed',
  TRANSACTION_FAILED = 'transaction.failed',
  TRANSACTION_REFUNDED = 'transaction.refunded',

  // Task events
  TASK_CREATED = 'task.created',
  TASK_ASSIGNED = 'task.assigned',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',

  // Inventory events
  INVENTORY_LOW = 'inventory.low',
  INVENTORY_CRITICAL = 'inventory.critical',
  INVENTORY_EXPIRED = 'inventory.expired',

  // Collection events
  COLLECTION_COMPLETED = 'collection.completed',
  COLLECTION_DISCREPANCY = 'collection.discrepancy',
}

/**
 * Webhook payload structure
 */
export interface IWebhookPayload<T = any> {
  id: string;
  event: WebhookEventType;
  organizationId: string;
  timestamp: string;
  data: T;
  signature?: string;
}

/**
 * File upload response
 */
export interface IFileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
}

/**
 * Export request parameters
 */
export interface IExportRequest {
  format: 'csv' | 'xlsx' | 'pdf';
  fields?: string[];
  filters?: IFilterParams;
  dateRange?: {
    from: string;
    to: string;
  };
}

/**
 * Export response
 */
export interface IExportResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: string;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Health check response
 */
export interface IHealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    queue: 'up' | 'down';
  };
}

/**
 * API version info
 */
export interface IApiVersionInfo {
  version: string;
  apiVersion: string;
  environment: string;
  buildDate: string;
  commitHash?: string;
}

// Error codes
export const API_ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'AUTH_001',
  INVALID_TOKEN: 'AUTH_002',
  TOKEN_EXPIRED: 'AUTH_003',
  INVALID_CREDENTIALS: 'AUTH_004',
  TWO_FACTOR_REQUIRED: 'AUTH_005',
  INVALID_TWO_FACTOR: 'AUTH_006',

  // Authorization errors
  FORBIDDEN: 'AUTHZ_001',
  INSUFFICIENT_PERMISSIONS: 'AUTHZ_002',

  // Validation errors
  VALIDATION_ERROR: 'VAL_001',
  INVALID_INPUT: 'VAL_002',
  MISSING_REQUIRED_FIELD: 'VAL_003',

  // Resource errors
  NOT_FOUND: 'RES_001',
  ALREADY_EXISTS: 'RES_002',
  CONFLICT: 'RES_003',

  // Business logic errors
  INSUFFICIENT_STOCK: 'BUS_001',
  INVALID_STATUS_TRANSITION: 'BUS_002',
  MACHINE_OFFLINE: 'BUS_003',
  PAYMENT_FAILED: 'BUS_004',

  // System errors
  INTERNAL_ERROR: 'SYS_001',
  SERVICE_UNAVAILABLE: 'SYS_002',
  DATABASE_ERROR: 'SYS_003',
  EXTERNAL_SERVICE_ERROR: 'SYS_004',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_001',
} as const;

// HTTP status codes mapping
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Default pagination values
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
