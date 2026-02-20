// ============================================
// Universal Integration Types
// ============================================

/**
 * Supported integration categories
 */
export enum IntegrationCategory {
  PAYMENT = 'payment',
  FISCAL = 'fiscal',
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  ANALYTICS = 'analytics',
  CRM = 'crm',
  ERP = 'erp',
  DELIVERY = 'delivery',
  LOYALTY = 'loyalty',
  CUSTOM = 'custom',
}

/**
 * Integration status
 */
export enum IntegrationStatus {
  DRAFT = 'draft',           // Just created, not configured
  CONFIGURING = 'configuring', // AI is parsing docs
  TESTING = 'testing',       // Ready for sandbox testing
  ACTIVE = 'active',         // Live in production
  PAUSED = 'paused',         // Temporarily disabled
  ERROR = 'error',           // Has errors
  DEPRECATED = 'deprecated', // No longer supported
}

/**
 * HTTP methods for API calls
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

/**
 * Authentication types
 */
export enum AuthType {
  NONE = 'none',
  API_KEY = 'api_key',
  BEARER = 'bearer',
  BASIC = 'basic',
  OAUTH2 = 'oauth2',
  HMAC = 'hmac',
  CUSTOM = 'custom',
}

/**
 * Parameter location in request
 */
export enum ParamLocation {
  HEADER = 'header',
  QUERY = 'query',
  BODY = 'body',
  PATH = 'path',
}

/**
 * Field data types
 */
export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  DATE = 'date',
  ENUM = 'enum',
  FILE = 'file',
}

// ============================================
// Configuration Interfaces
// ============================================

/**
 * API Endpoint configuration
 */
export interface EndpointConfig {
  id: string;
  name: string;
  description: string;
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  queryParams?: FieldConfig[];
  bodyParams?: FieldConfig[];
  pathParams?: FieldConfig[];
  responseMapping?: ResponseMapping;
  errorMapping?: ErrorMapping[];
  timeout?: number;
  retryConfig?: RetryConfig;
}

/**
 * Field configuration
 */
export interface FieldConfig {
  name: string;
  type: FieldType;
  required: boolean;
  description?: string;
  defaultValue?: any;
  enumValues?: string[];
  validation?: ValidationRule[];
  mapping?: string; // Maps to internal field name
  transform?: TransformConfig;
}

/**
 * Validation rules
 */
export interface ValidationRule {
  type: 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'custom';
  value?: any;
  message: string;
  customValidator?: string; // JS code for custom validation
}

/**
 * Transform configuration
 */
export interface TransformConfig {
  type: 'format' | 'convert' | 'calculate' | 'custom';
  format?: string;
  expression?: string;
  customCode?: string;
}

/**
 * Response mapping
 */
export interface ResponseMapping {
  successPath?: string;
  dataPath?: string;
  errorPath?: string;
  fields: ResponseFieldMapping[];
}

/**
 * Response field mapping
 */
export interface ResponseFieldMapping {
  source: string; // JSON path in response
  target: string; // Internal field name
  type: FieldType;
  transform?: TransformConfig;
}

/**
 * Error mapping
 */
export interface ErrorMapping {
  code: string | number;
  message: string;
  internalCode: string;
  retry: boolean;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

// ============================================
// Authentication Configuration
// ============================================

/**
 * Authentication configuration
 */
export interface AuthConfig {
  type: AuthType;
  config: ApiKeyAuthConfig | BearerAuthConfig | BasicAuthConfig | OAuth2Config | HmacAuthConfig | CustomAuthConfig;
}

export interface ApiKeyAuthConfig {
  keyName: string;
  keyLocation: ParamLocation;
  prefix?: string;
}

export interface BearerAuthConfig {
  tokenEndpoint?: string;
  tokenField?: string;
  refreshEndpoint?: string;
  expiresIn?: number;
}

export interface BasicAuthConfig {
  usernameField: string;
  passwordField: string;
}

export interface OAuth2Config {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes: string[];
  clientIdField: string;
  clientSecretField: string;
}

export interface HmacAuthConfig {
  algorithm: 'sha1' | 'sha256' | 'sha512' | 'md5';
  secretField: string;
  signatureHeader: string;
  signatureFormat: 'hex' | 'base64';
  dataToSign: string; // Template for data to sign
}

export interface CustomAuthConfig {
  prepareRequest: string; // JS code to prepare request
  validateResponse: string; // JS code to validate response
}

// ============================================
// Webhook Configuration
// ============================================

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  enabled: boolean;
  path: string;
  method: HttpMethod;
  verification?: WebhookVerification;
  events: WebhookEvent[];
}

/**
 * Webhook verification
 */
export interface WebhookVerification {
  type: 'signature' | 'token' | 'ip' | 'custom';
  config: Record<string, any>;
}

/**
 * Webhook event
 */
export interface WebhookEvent {
  name: string;
  description: string;
  payloadMapping: ResponseFieldMapping[];
  internalEvent: string;
}

// ============================================
// Payment-Specific Types
// ============================================

/**
 * Payment integration configuration
 */
export interface PaymentIntegrationConfig {
  // Basic info
  name: string;
  displayName: string;
  logo?: string;
  description?: string;
  website?: string;
  documentationUrl?: string;

  // Environment
  sandboxMode: boolean;
  baseUrl: string;
  sandboxBaseUrl?: string;

  // Authentication
  auth: AuthConfig;
  credentials: CredentialConfig[];

  // Supported features
  supportedCurrencies: string[];
  supportedMethods: PaymentMethod[];
  minAmount?: number;
  maxAmount?: number;

  // Endpoints
  endpoints: {
    createPayment: EndpointConfig;
    checkStatus: EndpointConfig;
    cancelPayment?: EndpointConfig;
    refund?: EndpointConfig;
    getReceipt?: EndpointConfig;
  };

  // Webhooks
  webhooks?: WebhookConfig;

  // UI Configuration
  checkoutConfig?: CheckoutConfig;
}

/**
 * Credential configuration
 */
export interface CredentialConfig {
  name: string;
  displayName: string;
  type: 'text' | 'password' | 'select' | 'textarea';
  required: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  options?: { label: string; value: string }[];
  validation?: ValidationRule[];
  sandboxValue?: string;
  helpUrl?: string;
}

/**
 * Payment methods
 */
export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  QR = 'qr',
  USSD = 'ussd',
  CASH = 'cash',
  CRYPTO = 'crypto',
  INSTALLMENT = 'installment',
}

/**
 * Checkout UI configuration
 */
export interface CheckoutConfig {
  type: 'redirect' | 'iframe' | 'popup' | 'inline' | 'qr';
  redirectUrlField?: string;
  iframeUrlField?: string;
  qrDataField?: string;
  customHtml?: string;
}

// ============================================
// AI Parser Types
// ============================================

/**
 * AI parsing request
 */
export interface AIParseRequest {
  documentationUrl?: string;
  documentationText?: string;
  additionalContext?: string;
  integrationType: IntegrationCategory;
  language?: string;
}

/**
 * AI parsing result
 */
export interface AIParseResult {
  success: boolean;
  confidence: number;
  config: Partial<PaymentIntegrationConfig>;
  warnings: string[];
  suggestions: string[];
  missingInfo: string[];
  rawAnalysis?: string;
}

/**
 * AI conversation message
 */
export interface AIConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * AI configuration session
 */
export interface AIConfigSession {
  id: string;
  integrationId: string;
  messages: AIConversationMessage[];
  currentConfig: Partial<PaymentIntegrationConfig>;
  status: 'active' | 'completed' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Testing Types
// ============================================

/**
 * Integration test case
 */
export interface IntegrationTestCase {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: HttpMethod;
  requestData: Record<string, any>;
  expectedStatus: number;
  expectedResponse?: Record<string, any>;
  assertions: TestAssertion[];
}

/**
 * Test assertion
 */
export interface TestAssertion {
  type: 'equals' | 'contains' | 'exists' | 'type' | 'regex';
  path: string;
  expected: any;
  message: string;
}

/**
 * Test result
 */
export interface TestResult {
  testId: string;
  passed: boolean;
  duration: number;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  };
  response: {
    status: number;
    headers: Record<string, string>;
    body: any;
  };
  assertions: {
    assertion: TestAssertion;
    passed: boolean;
    actual: any;
  }[];
  error?: string;
}
