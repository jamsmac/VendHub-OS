import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import * as crypto from "crypto";
import { Integration } from "../entities/integration.entity";
import { IntegrationService } from "./integration.service";
import {
  PaymentIntegrationConfig,
  EndpointConfig,
  AuthType,
  AuthConfig,
  ApiKeyAuthConfig,
  BasicAuthConfig,
  HmacAuthConfig,
  HttpMethod,
} from "../types/integration.types";

// ============================================
// Payment Request/Response Types
// ============================================

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  description?: string;
  returnUrl?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  status: GatewayPaymentStatus;
  amount: number;
  currency: string;
  redirectUrl?: string;
  qrCode?: string;
  rawResponse?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

export enum GatewayPaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
  EXPIRED = "expired",
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
}

// ============================================
// Payment Executor Service
// ============================================

@Injectable()
export class PaymentExecutorService {
  private readonly logger = new Logger(PaymentExecutorService.name);

  constructor(
    private integrationService: IntegrationService,
    private configService: ConfigService,
  ) {}

  // ============================================
  // Main Payment Methods
  // ============================================

  /**
   * Create a payment using the specified integration
   */
  async createPayment(
    integration: Integration,
    request: CreatePaymentRequest,
  ): Promise<PaymentResponse> {
    const config = integration.config;
    const endpoint = config.endpoints.createPayment;

    if (!endpoint) {
      throw new BadRequestException("Create payment endpoint not configured");
    }

    const startTime = Date.now();

    try {
      // Build request
      const axiosConfig = await this.buildRequest(integration, endpoint, {
        amount: request.amount,
        currency: request.currency,
        order_id: request.orderId,
        description: request.description,
        return_url: request.returnUrl,
        callback_url: request.callbackUrl,
        ...request.metadata,
        customer: request.customer,
      });

      // Execute request
      const response = await this.executeWithRetry(axiosConfig);

      // Log success
      await this.logRequest(
        integration,
        endpoint,
        axiosConfig,
        response,
        startTime,
        true,
      );

      // Parse response
      return this.parsePaymentResponse(config, endpoint, response.data);
    } catch (error: unknown) {
      const axiosErr = error instanceof AxiosError ? error : null;
      // Log error
      await this.logRequest(
        integration,
        endpoint,
        null,
        axiosErr?.response ?? undefined,
        startTime,
        false,
        error instanceof Error ? error.message : String(error),
      );

      throw this.handleError(error, config);
    }
  }

  /**
   * Check payment status
   */
  async checkGatewayPaymentStatus(
    integration: Integration,
    paymentId: string,
  ): Promise<PaymentResponse> {
    const config = integration.config;
    const endpoint = config.endpoints.checkStatus;

    if (!endpoint) {
      throw new BadRequestException("Check status endpoint not configured");
    }

    const startTime = Date.now();

    try {
      // Build request with path parameter
      const axiosConfig = await this.buildRequest(
        integration,
        endpoint,
        {},
        { payment_id: paymentId, id: paymentId },
      );

      // Execute request
      const response = await this.executeWithRetry(axiosConfig);

      // Log success
      await this.logRequest(
        integration,
        endpoint,
        axiosConfig,
        response,
        startTime,
        true,
      );

      // Parse response
      return this.parsePaymentResponse(config, endpoint, response.data);
    } catch (error: unknown) {
      const axiosErr = error instanceof AxiosError ? error : null;
      await this.logRequest(
        integration,
        endpoint,
        null,
        axiosErr?.response ?? undefined,
        startTime,
        false,
        error instanceof Error ? error.message : String(error),
      );
      throw this.handleError(error, config);
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(
    integration: Integration,
    paymentId: string,
  ): Promise<PaymentResponse> {
    const config = integration.config;
    const endpoint = config.endpoints.cancelPayment;

    if (!endpoint) {
      throw new BadRequestException("Cancel payment endpoint not configured");
    }

    const startTime = Date.now();

    try {
      const axiosConfig = await this.buildRequest(
        integration,
        endpoint,
        { payment_id: paymentId },
        { payment_id: paymentId, id: paymentId },
      );

      const response = await this.executeWithRetry(axiosConfig);
      await this.logRequest(
        integration,
        endpoint,
        axiosConfig,
        response,
        startTime,
        true,
      );

      return this.parsePaymentResponse(config, endpoint, response.data);
    } catch (error: unknown) {
      const axiosErr = error instanceof AxiosError ? error : null;
      await this.logRequest(
        integration,
        endpoint,
        null,
        axiosErr?.response ?? undefined,
        startTime,
        false,
        error instanceof Error ? error.message : String(error),
      );
      throw this.handleError(error, config);
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    integration: Integration,
    request: RefundRequest,
  ): Promise<PaymentResponse> {
    const config = integration.config;
    const endpoint = config.endpoints.refund;

    if (!endpoint) {
      throw new BadRequestException("Refund endpoint not configured");
    }

    const startTime = Date.now();

    try {
      const axiosConfig = await this.buildRequest(
        integration,
        endpoint,
        {
          payment_id: request.paymentId,
          amount: request.amount,
          reason: request.reason,
        },
        { payment_id: request.paymentId, id: request.paymentId },
      );

      const response = await this.executeWithRetry(axiosConfig);
      await this.logRequest(
        integration,
        endpoint,
        axiosConfig,
        response,
        startTime,
        true,
      );

      return this.parsePaymentResponse(config, endpoint, response.data);
    } catch (error: unknown) {
      const axiosErr = error instanceof AxiosError ? error : null;
      await this.logRequest(
        integration,
        endpoint,
        null,
        axiosErr?.response ?? undefined,
        startTime,
        false,
        error instanceof Error ? error.message : String(error),
      );
      throw this.handleError(error, config);
    }
  }

  // ============================================
  // Retry Logic
  // ============================================

  /**
   * Execute HTTP request with exponential backoff retry.
   * Retries on network errors and 5xx responses (up to 3 attempts).
   */
  private async executeWithRetry(
    config: AxiosRequestConfig,
    maxRetries: number = 2,
  ): Promise<AxiosResponse> {
    let lastError: AxiosError | Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await axios(config);
      } catch (error) {
        lastError = error as AxiosError;
        const axiosErr = error as AxiosError;
        const status = axiosErr.response?.status;

        // Only retry on network errors or 5xx server errors
        const isRetryable = !status || (status >= 500 && status < 600);

        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        this.logger.warn(
          `Payment API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms: ${axiosErr.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  // ============================================
  // Request Building
  // ============================================

  private async buildRequest(
    integration: Integration,
    endpoint: EndpointConfig,
    bodyData: Record<string, unknown>,
    pathParams?: Record<string, string>,
  ): Promise<AxiosRequestConfig> {
    const config = integration.config;
    const credentials = integration.sandboxMode
      ? integration.sandboxCredentials
      : integration.credentials;

    const baseUrl =
      integration.sandboxMode && config.sandboxBaseUrl
        ? config.sandboxBaseUrl
        : config.baseUrl;

    // Build path with parameters
    let path = endpoint.path;
    if (pathParams) {
      for (const [key, value] of Object.entries(pathParams)) {
        path = path.replace(`{${key}}`, value);
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...endpoint.headers,
    };

    // Add authentication
    await this.addAuthentication(headers, bodyData, config.auth, credentials);

    // Build request body
    const body = this.buildRequestBody(endpoint, bodyData, credentials);

    // Build query parameters
    const params = this.buildQueryParams(endpoint, bodyData);

    const axiosConfig: AxiosRequestConfig = {
      method: endpoint.method.toLowerCase() as AxiosRequestConfig["method"],
      url: `${baseUrl}${path}`,
      headers,
      timeout: endpoint.timeout || 30000,
    };

    if (endpoint.method !== HttpMethod.GET && body) {
      axiosConfig.data = body;
    }

    if (Object.keys(params).length > 0) {
      axiosConfig.params = params;
    }

    return axiosConfig;
  }

  private async addAuthentication(
    headers: Record<string, string>,
    body: Record<string, unknown>,
    auth: AuthConfig,
    credentials: Record<string, string>,
  ): Promise<void> {
    switch (auth.type) {
      case AuthType.API_KEY: {
        const config = auth.config as ApiKeyAuthConfig;
        const key = credentials[config.keyName] ?? credentials["api_key"] ?? "";
        const value = config.prefix ? `${config.prefix} ${key}` : key;

        if (config.keyLocation === "header") {
          headers[config.keyName || "Authorization"] = value;
        } else if (config.keyLocation === "query") {
          body[config.keyName || "api_key"] = key;
        }
        break;
      }

      case AuthType.BEARER: {
        const token = credentials["access_token"] || credentials["token"];
        headers["Authorization"] = `Bearer ${token}`;
        break;
      }

      case AuthType.BASIC: {
        const config = auth.config as BasicAuthConfig;
        const username = credentials[config.usernameField || "username"];
        const password = credentials[config.passwordField || "password"];
        const encoded = Buffer.from(`${username}:${password}`).toString(
          "base64",
        );
        headers["Authorization"] = `Basic ${encoded}`;
        break;
      }

      case AuthType.HMAC: {
        const config = auth.config as HmacAuthConfig;
        const secret = credentials[config.secretField || "secret"] ?? "";
        const dataToSign = this.buildSignatureData(
          config.dataToSign,
          body,
          headers,
        );
        const signature = this.calculateHmac(
          dataToSign,
          secret,
          config.algorithm,
          config.signatureFormat,
        );
        headers[config.signatureHeader || "X-Signature"] = signature;
        break;
      }

      case AuthType.CUSTOM: {
        // Custom auth is handled by the configuration
        break;
      }
    }
  }

  private buildRequestBody(
    endpoint: EndpointConfig,
    data: Record<string, unknown>,
    credentials: Record<string, string>,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (!endpoint.bodyParams) {
      return data;
    }

    for (const param of endpoint.bodyParams) {
      let value = data[param.name] ?? data[param.mapping || param.name];

      // Check if it's a credential reference
      if (value === undefined && credentials[param.name]) {
        value = credentials[param.name];
      }

      // Apply default value
      if (value === undefined && param.defaultValue !== undefined) {
        value = param.defaultValue;
      }

      // Apply transform
      if (param.transform && value !== undefined) {
        value = this.applyTransform(value, param.transform);
      }

      if (value !== undefined || param.required) {
        body[param.name] = value;
      }
    }

    return body;
  }

  private buildQueryParams(
    endpoint: EndpointConfig,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    if (!endpoint.queryParams) {
      return params;
    }

    for (const param of endpoint.queryParams) {
      const value =
        data[param.name] ??
        data[param.mapping || param.name] ??
        param.defaultValue;

      if (value !== undefined) {
        params[param.name] = value;
      }
    }

    return params;
  }

  // ============================================
  // Response Parsing
  // ============================================

  private parsePaymentResponse(
    config: PaymentIntegrationConfig,
    endpoint: EndpointConfig,
    data: unknown,
  ): PaymentResponse {
    const mapping = endpoint.responseMapping;
    const d = data as Record<string, unknown>;

    if (!mapping) {
      // Default parsing
      return {
        success: true,
        paymentId: String(d.id || d.payment_id || d.transaction_id || ""),
        status: this.mapStatus(String(d.status || d.state || "")),
        amount: Number(d.amount) || 0,
        currency: String(d.currency || "UZS"),
        redirectUrl: String(
          d.redirect_url || d.checkout_url || d.pay_url || "",
        ),
        qrCode: String(d.qr_code || d.qr_data || ""),
        rawResponse: data,
      };
    }

    // Use configured mapping
    const response: PaymentResponse = {
      success: true,
      paymentId: "",
      status: GatewayPaymentStatus.PENDING,
      amount: 0,
      currency: "UZS",
      rawResponse: data,
    };

    for (const field of mapping.fields) {
      const value = this.getNestedValue(data, field.source);
      const transformedValue = field.transform
        ? this.applyTransform(value, field.transform)
        : value;

      switch (field.target) {
        case "paymentId":
          response.paymentId = String(transformedValue);
          break;
        case "status":
          response.status = this.mapStatus(String(transformedValue));
          break;
        case "amount":
          response.amount = Number(transformedValue);
          break;
        case "currency":
          response.currency = String(transformedValue);
          break;
        case "redirectUrl":
          response.redirectUrl = String(transformedValue);
          break;
        case "qrCode":
          response.qrCode = String(transformedValue);
          break;
      }
    }

    return response;
  }

  private mapStatus(status: string): GatewayPaymentStatus {
    const statusMap: Record<string, GatewayPaymentStatus> = {
      // Common statuses
      pending: GatewayPaymentStatus.PENDING,
      processing: GatewayPaymentStatus.PROCESSING,
      completed: GatewayPaymentStatus.COMPLETED,
      success: GatewayPaymentStatus.COMPLETED,
      paid: GatewayPaymentStatus.COMPLETED,
      failed: GatewayPaymentStatus.FAILED,
      error: GatewayPaymentStatus.FAILED,
      cancelled: GatewayPaymentStatus.CANCELLED,
      canceled: GatewayPaymentStatus.CANCELLED,
      refunded: GatewayPaymentStatus.REFUNDED,
      expired: GatewayPaymentStatus.EXPIRED,

      // Payme statuses
      "0": GatewayPaymentStatus.PENDING,
      "1": GatewayPaymentStatus.PROCESSING,
      "2": GatewayPaymentStatus.COMPLETED,
      "-1": GatewayPaymentStatus.CANCELLED,
      "-2": GatewayPaymentStatus.FAILED,

      // Click statuses
      waiting: GatewayPaymentStatus.PENDING,
      preauth: GatewayPaymentStatus.PROCESSING,
      confirmed: GatewayPaymentStatus.COMPLETED,
    };

    return (
      statusMap[status?.toString()?.toLowerCase()] ||
      GatewayPaymentStatus.PENDING
    );
  }

  // ============================================
  // Helpers
  // ============================================

  private buildSignatureData(
    template: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
  ): string {
    let data = template;

    // Replace body placeholders
    for (const [key, value] of Object.entries(body)) {
      data = data.replace(`{body.${key}}`, String(value));
    }

    // Replace header placeholders
    for (const [key, value] of Object.entries(headers)) {
      data = data.replace(`{header.${key}}`, value);
    }

    // Replace timestamp
    data = data.replace("{timestamp}", Date.now().toString());

    return data;
  }

  private calculateHmac(
    data: string,
    secret: string,
    algorithm: string,
    format: "hex" | "base64",
  ): string {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(data);
    return hmac.digest(format);
  }

  private applyTransform(value: unknown, transform: unknown): unknown {
    const t = transform as Record<string, unknown>;
    const v = Number(value) || 0;

    switch (t.type) {
      case "format":
        if (t.format === "cents") {
          return Math.round(v * 100);
        }
        if (t.format === "tiyn") {
          return Math.round(v * 100);
        }
        return value;

      case "convert":
        // Safe predefined conversions (safeCalculate uses a fixed allowlist of operations)
        if (t.operation) {
          return this.safeCalculate(
            v,
            t.operation as string,
            t.operand as number | undefined,
          );
        }
        return value;

      case "multiply":
        return v * (Number(t.factor) || 1);

      case "divide":
        return t.divisor ? v / Number(t.divisor) : value;

      case "round":
        return (
          Math.round(v * (Number(t.precision) || 1)) /
          (Number(t.precision) || 1)
        );

      default:
        return value;
    }
  }

  /**
   * Safe arithmetic operations without eval()
   */
  private safeCalculate(
    value: number,
    operation: string,
    operand?: number,
  ): number {
    const numValue = Number(value);
    const numOperand = Number(operand) || 0;

    switch (operation) {
      case "add":
        return numValue + numOperand;
      case "subtract":
        return numValue - numOperand;
      case "multiply":
        return numValue * numOperand;
      case "divide":
        return numOperand !== 0 ? numValue / numOperand : numValue;
      case "percent":
        return numValue * (numOperand / 100);
      case "negate":
        return -numValue;
      case "abs":
        return Math.abs(numValue);
      case "floor":
        return Math.floor(numValue);
      case "ceil":
        return Math.ceil(numValue);
      default:
        this.logger.warn(
          `Unknown operation: ${operation}, returning original value`,
        );
        return numValue;
    }
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path
      .split(".")
      .reduce(
        (current: Record<string, unknown> | undefined, key) =>
          (current as Record<string, unknown> | undefined)?.[key] as
            | Record<string, unknown>
            | undefined,
        obj as Record<string, unknown>,
      );
  }

  private handleError(error: unknown, config: PaymentIntegrationConfig): Error {
    if (error instanceof AxiosError && error.response) {
      const errorData = error.response.data as
        | Record<string, unknown>
        | undefined;

      // Check error mapping
      if (config.endpoints.createPayment?.errorMapping) {
        const mapping = config.endpoints.createPayment.errorMapping.find(
          (m) =>
            m.code === (errorData as Record<string, unknown>)?.code ||
            m.code === error.response!.status,
        );

        if (mapping) {
          return new BadRequestException({
            code: mapping.internalCode,
            message: mapping.message,
            originalError: errorData,
          });
        }
      }

      return new BadRequestException({
        code: (errorData as Record<string, unknown>)?.code || "PAYMENT_ERROR",
        message:
          (errorData as Record<string, unknown>)?.message ||
          (errorData as Record<string, unknown>)?.error ||
          "Payment request failed",
        originalError: errorData,
      });
    }

    return new BadRequestException({
      code: "NETWORK_ERROR",
      message:
        error instanceof Error ? error.message : "Network error occurred",
    });
  }

  private async logRequest(
    integration: Integration,
    endpoint: EndpointConfig,
    request: AxiosRequestConfig | null,
    response: AxiosResponse | undefined,
    startTime: number,
    success: boolean,
    error?: string,
  ): Promise<void> {
    try {
      await this.integrationService.createLog({
        integrationId: integration.id,
        organizationId: integration.organizationId,
        action: endpoint.name,
        method: endpoint.method,
        endpoint: endpoint.path,
        requestHeaders: request?.headers as Record<string, string>,
        requestBody: request?.data,
        responseStatus: response?.status,
        responseHeaders: response?.headers as Record<string, string>,
        responseBody: response?.data,
        duration: Date.now() - startTime,
        success,
        error,
      });

      // Update integration statistics
      if (success) {
        await this.integrationService.update(
          integration.id,
          integration.organizationId,
          {
            lastUsedAt: new Date(),
            successCount: integration.successCount + 1,
          },
          "system",
        );
      } else {
        await this.integrationService.update(
          integration.id,
          integration.organizationId,
          {
            lastError: error,
            errorCount: integration.errorCount + 1,
          },
          "system",
        );
      }
    } catch (logError) {
      this.logger.error("Error logging request:", logError);
    }
  }
}
