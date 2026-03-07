import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";
import { AxiosError, AxiosHeaders } from "axios";
import {
  PaymentExecutorService,
  CreatePaymentRequest,
  RefundRequest,
} from "./payment-executor.service";
import { IntegrationService } from "./integration.service";
import { Integration } from "../entities/integration.entity";
import {
  IntegrationCategory,
  IntegrationStatus,
  AuthType,
  HttpMethod,
  ParamLocation,
  PaymentIntegrationConfig,
  FieldType,
} from "../types/integration.types";

// Mock axios - the service calls `axios(config)` (default export as callable)
// Define the mock fn inside the factory (jest.mock is hoisted before variable declarations)
jest.mock("axios", () => {
  const actual = jest.requireActual("axios");
  const mockFn = jest.fn() as any;
  mockFn.get = jest.fn();
  mockFn.post = jest.fn();
  return {
    __esModule: true,
    default: mockFn,
    AxiosError: actual.AxiosError,
    AxiosHeaders: actual.AxiosHeaders,
  };
});

const axiosMock: jest.Mock = require("axios").default;

describe("PaymentExecutorService", () => {
  let service: PaymentExecutorService;
  let integrationService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  const orgId = "org-uuid-1";
  const integrationId = "int-uuid-1";

  const baseConfig: PaymentIntegrationConfig = {
    name: "test_provider",
    displayName: "Test Provider",
    sandboxMode: true,
    baseUrl: "https://api.provider.com",
    sandboxBaseUrl: "https://sandbox.provider.com",
    auth: {
      type: AuthType.API_KEY,
      config: {
        keyName: "Authorization",
        keyLocation: ParamLocation.HEADER,
      },
    },
    credentials: [],
    supportedCurrencies: ["UZS"],
    supportedMethods: [],
    endpoints: {
      createPayment: {
        id: "cp",
        name: "Create Payment",
        description: "Create a new payment",
        method: HttpMethod.POST,
        path: "/payments",
      },
      checkStatus: {
        id: "cs",
        name: "Check Status",
        description: "Check payment status",
        method: HttpMethod.GET,
        path: "/payments/{id}",
      },
      cancelPayment: {
        id: "cancel",
        name: "Cancel Payment",
        description: "Cancel payment",
        method: HttpMethod.POST,
        path: "/payments/{id}/cancel",
      },
      refund: {
        id: "refund",
        name: "Refund",
        description: "Refund payment",
        method: HttpMethod.POST,
        path: "/payments/{id}/refund",
      },
    },
  };

  const mockIntegration: Partial<Integration> = {
    id: integrationId,
    organizationId: orgId,
    name: "test_provider",
    displayName: "Test Provider",
    category: IntegrationCategory.PAYMENT,
    status: IntegrationStatus.ACTIVE,
    config: { ...baseConfig },
    credentials: { api_key: "prod-key-123" },
    sandboxCredentials: { api_key: "sandbox-key-456" },
    sandboxMode: true,
    successCount: 10,
    errorCount: 2,
  };

  beforeEach(async () => {
    integrationService = {
      createLog: jest.fn().mockResolvedValue({ id: "log-1" }),
      update: jest
        .fn()
        .mockImplementation(async (_id: string, _orgId: string, data: any) => ({
          ...mockIntegration,
          ...data,
        })),
      findOne: jest.fn().mockResolvedValue(mockIntegration),
    } as Record<string, jest.Mock>;

    configService = {
      get: jest.fn().mockReturnValue("test-value"),
    } as Record<string, jest.Mock>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentExecutorService,
        { provide: IntegrationService, useValue: integrationService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PaymentExecutorService>(PaymentExecutorService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ================================================================
  // createPayment
  // ================================================================

  describe("createPayment", () => {
    const paymentRequest: CreatePaymentRequest = {
      amount: 50000,
      currency: "UZS",
      orderId: "order-123",
      description: "Test payment",
      returnUrl: "https://example.com/return",
    };

    it("should create a payment successfully", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: { "content-type": "application/json" },
        data: {
          id: "pay-001",
          status: "pending",
          amount: 50000,
          currency: "UZS",
          redirect_url: "https://checkout.provider.com/pay-001",
        },
      });

      const result = await service.createPayment(
        mockIntegration as Integration,
        paymentRequest,
      );

      expect(result.success).toBe(true);
      expect(result.paymentId).toBe("pay-001");
      expect(result.status).toBe("pending");
      expect(result.amount).toBe(50000);
      expect(result.redirectUrl).toBe("https://checkout.provider.com/pay-001");

      // Should log the request
      expect(integrationService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationId,
          organizationId: orgId,
          action: "Create Payment",
          success: true,
        }),
      );

      // Should update integration stats on success
      expect(integrationService.update).toHaveBeenCalledWith(
        integrationId,
        orgId,
        expect.objectContaining({
          lastUsedAt: expect.any(Date),
          successCount: 11,
        }),
        "system",
      );
    });

    it("should use sandbox URL when sandboxMode is true", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-sb", status: "pending", amount: 50000 },
      });

      await service.createPayment(
        mockIntegration as Integration,
        paymentRequest,
      );

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://sandbox.provider.com/payments",
        }),
      );
    });

    it("should use production URL when sandboxMode is false", async () => {
      const prodIntegration = {
        ...mockIntegration,
        sandboxMode: false,
      };

      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-prod", status: "pending", amount: 50000 },
      });

      await service.createPayment(
        prodIntegration as Integration,
        paymentRequest,
      );

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://api.provider.com/payments",
        }),
      );
    });

    it("should throw BadRequestException when endpoint not configured", async () => {
      const noEndpointIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          endpoints: {
            ...baseConfig.endpoints,
            createPayment: undefined,
          },
        },
      };

      await expect(
        service.createPayment(
          noEndpointIntegration as any as Integration,
          paymentRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should handle API error and log failure", async () => {
      const axiosError = new AxiosError(
        "Request failed",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 400,
          data: { code: "INVALID_AMOUNT", message: "Amount too low" },
          statusText: "Bad Request",
          headers: {},
          config: { headers: new AxiosHeaders() },
        } as any,
      );

      axiosMock.mockRejectedValue(axiosError);

      await expect(
        service.createPayment(mockIntegration as Integration, paymentRequest),
      ).rejects.toThrow(BadRequestException);

      // Should log the failure
      expect(integrationService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
      );

      // Should increment error count
      expect(integrationService.update).toHaveBeenCalledWith(
        integrationId,
        orgId,
        expect.objectContaining({
          errorCount: 3,
        }),
        "system",
      );
    });

    it("should handle network error", async () => {
      axiosMock.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        service.createPayment(mockIntegration as Integration, paymentRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ================================================================
  // checkPaymentStatus
  // ================================================================

  describe("checkPaymentStatus", () => {
    it("should check payment status successfully", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: {
          id: "pay-001",
          status: "completed",
          amount: 50000,
          currency: "UZS",
        },
      });

      const result = await service.checkPaymentStatus(
        mockIntegration as Integration,
        "pay-001",
      );

      expect(result.paymentId).toBe("pay-001");
      expect(result.status).toBe("completed");
    });

    it("should replace path parameters in URL", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      await service.checkPaymentStatus(
        mockIntegration as Integration,
        "pay-001",
      );

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("/payments/pay-001"),
        }),
      );
    });

    it("should throw BadRequestException when endpoint not configured", async () => {
      const noStatusIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          endpoints: {
            ...baseConfig.endpoints,
            checkStatus: undefined,
          },
        },
      };

      await expect(
        service.checkPaymentStatus(
          noStatusIntegration as any as Integration,
          "pay-001",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ================================================================
  // cancelPayment
  // ================================================================

  describe("cancelPayment", () => {
    it("should cancel payment successfully", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "cancelled" },
      });

      const result = await service.cancelPayment(
        mockIntegration as Integration,
        "pay-001",
      );

      expect(result.status).toBe("cancelled");
    });

    it("should throw BadRequestException when cancel endpoint not configured", async () => {
      const noCancelIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          endpoints: {
            createPayment: baseConfig.endpoints.createPayment,
            checkStatus: baseConfig.endpoints.checkStatus,
            // cancelPayment is undefined
          },
        },
      };

      await expect(
        service.cancelPayment(
          noCancelIntegration as any as Integration,
          "pay-001",
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ================================================================
  // refundPayment
  // ================================================================

  describe("refundPayment", () => {
    const refundRequest: RefundRequest = {
      paymentId: "pay-001",
      amount: 25000,
      reason: "Customer request",
    };

    it("should refund payment successfully", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "refunded", amount: 25000 },
      });

      const result = await service.refundPayment(
        mockIntegration as Integration,
        refundRequest,
      );

      expect(result.status).toBe("refunded");
    });

    it("should throw BadRequestException when refund endpoint not configured", async () => {
      const noRefundIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          endpoints: {
            createPayment: baseConfig.endpoints.createPayment,
            checkStatus: baseConfig.endpoints.checkStatus,
            // refund is undefined
          },
        },
      };

      await expect(
        service.refundPayment(
          noRefundIntegration as any as Integration,
          refundRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ================================================================
  // Authentication methods
  // ================================================================

  describe("authentication", () => {
    it("should add API key to header", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      await service.createPayment(mockIntegration as Integration, {
        amount: 1000,
        currency: "UZS",
        orderId: "ord-1",
      });

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "sandbox-key-456",
          }),
        }),
      );
    });

    it("should add Bearer token", async () => {
      const bearerIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          auth: {
            type: AuthType.BEARER,
            config: {},
          },
        },
        sandboxCredentials: { access_token: "bearer-token-123" },
      };

      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      await service.createPayment(bearerIntegration as Integration, {
        amount: 1000,
        currency: "UZS",
        orderId: "ord-1",
      });

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer bearer-token-123",
          }),
        }),
      );
    });

    it("should add Basic auth header", async () => {
      const basicIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          auth: {
            type: AuthType.BASIC,
            config: {
              usernameField: "username",
              passwordField: "password",
            },
          },
        },
        sandboxCredentials: {
          username: "test-user",
          password: "test-pass",
        },
      };

      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      await service.createPayment(basicIntegration as Integration, {
        amount: 1000,
        currency: "UZS",
        orderId: "ord-1",
      });

      const expectedEncoded = Buffer.from("test-user:test-pass").toString(
        "base64",
      );

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedEncoded}`,
          }),
        }),
      );
    });

    it("should add HMAC signature", async () => {
      const hmacIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          auth: {
            type: AuthType.HMAC,
            config: {
              algorithm: "sha256",
              secretField: "secret",
              signatureHeader: "X-Signature",
              signatureFormat: "hex",
              dataToSign: "{body.amount}:{body.currency}",
            },
          },
        },
        sandboxCredentials: { secret: "hmac-secret" },
      };

      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      await service.createPayment(hmacIntegration as Integration, {
        amount: 1000,
        currency: "UZS",
        orderId: "ord-1",
      });

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Signature": expect.any(String),
          }),
        }),
      );
    });

    it("should use production credentials when sandboxMode is false", async () => {
      const prodIntegration = {
        ...mockIntegration,
        sandboxMode: false,
        credentials: { api_key: "prod-key-secret" },
      };

      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      await service.createPayment(prodIntegration as Integration, {
        amount: 1000,
        currency: "UZS",
        orderId: "ord-1",
      });

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "prod-key-secret",
          }),
        }),
      );
    });
  });

  // ================================================================
  // Response parsing and status mapping
  // ================================================================

  describe("response parsing", () => {
    it("should map common statuses correctly", async () => {
      const statuses = [
        { input: "pending", expected: "pending" },
        { input: "completed", expected: "completed" },
        { input: "success", expected: "completed" },
        { input: "paid", expected: "completed" },
        { input: "failed", expected: "failed" },
        { input: "cancelled", expected: "cancelled" },
        { input: "canceled", expected: "cancelled" },
        { input: "refunded", expected: "refunded" },
        { input: "expired", expected: "expired" },
      ];

      for (const { input, expected } of statuses) {
        axiosMock.mockResolvedValue({
          status: 200,
          headers: {},
          data: { id: "pay-001", status: input, amount: 1000 },
        });

        const result = await service.createPayment(
          mockIntegration as Integration,
          { amount: 1000, currency: "UZS", orderId: `ord-${input}` },
        );

        expect(result.status).toBe(expected);
      }
    });

    it("should map Payme numeric statuses", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "2", amount: 1000 },
      });

      const result = await service.createPayment(
        mockIntegration as Integration,
        { amount: 1000, currency: "UZS", orderId: "ord-1" },
      );

      expect(result.status).toBe("completed");
    });

    it("should default to pending for unknown status", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "unknown_status", amount: 1000 },
      });

      const result = await service.createPayment(
        mockIntegration as Integration,
        { amount: 1000, currency: "UZS", orderId: "ord-1" },
      );

      expect(result.status).toBe("pending");
    });

    it("should use response mapping when configured", async () => {
      const mappedIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          endpoints: {
            ...baseConfig.endpoints,
            createPayment: {
              ...baseConfig.endpoints.createPayment,
              responseMapping: {
                fields: [
                  {
                    source: "result.transaction_id",
                    target: "paymentId",
                    type: FieldType.STRING,
                  },
                  {
                    source: "result.state",
                    target: "status",
                    type: FieldType.STRING,
                  },
                  {
                    source: "result.total",
                    target: "amount",
                    type: FieldType.NUMBER,
                  },
                ],
              },
            },
          },
        },
      };

      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: {
          result: {
            transaction_id: "tx-999",
            state: "completed",
            total: 75000,
          },
        },
      });

      const result = await service.createPayment(
        mappedIntegration as Integration,
        { amount: 75000, currency: "UZS", orderId: "ord-1" },
      );

      expect(result.paymentId).toBe("tx-999");
      expect(result.status).toBe("completed");
      expect(result.amount).toBe(75000);
    });
  });

  // ================================================================
  // Request body building with bodyParams
  // ================================================================

  describe("request body building", () => {
    it("should build body from bodyParams configuration", async () => {
      const paramIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          endpoints: {
            ...baseConfig.endpoints,
            createPayment: {
              ...baseConfig.endpoints.createPayment,
              bodyParams: [
                {
                  name: "amount",
                  type: FieldType.NUMBER,
                  required: true,
                },
                {
                  name: "currency",
                  type: FieldType.STRING,
                  required: true,
                },
                {
                  name: "order_id",
                  type: FieldType.STRING,
                  required: true,
                  mapping: "order_id",
                },
              ],
            },
          },
        },
      };

      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      await service.createPayment(paramIntegration as Integration, {
        amount: 1000,
        currency: "UZS",
        orderId: "ord-1",
      });

      expect(axiosMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 1000,
            currency: "UZS",
          }),
        }),
      );
    });
  });

  // ================================================================
  // Error handling
  // ================================================================

  describe("error handling", () => {
    it("should map errors using errorMapping when configured", async () => {
      const errorMappedIntegration = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          endpoints: {
            ...baseConfig.endpoints,
            createPayment: {
              ...baseConfig.endpoints.createPayment,
              errorMapping: [
                {
                  code: "INSUFFICIENT_FUNDS",
                  message: "Insufficient funds on the card",
                  internalCode: "PAYMENT_INSUFFICIENT_FUNDS",
                  retry: false,
                },
              ],
            },
          },
        },
      };

      const axiosError = new AxiosError(
        "Request failed",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 400,
          data: { code: "INSUFFICIENT_FUNDS", message: "No money" },
          statusText: "Bad Request",
          headers: {},
          config: { headers: new AxiosHeaders() },
        } as any,
      );

      axiosMock.mockRejectedValue(axiosError);

      try {
        await service.createPayment(errorMappedIntegration as Integration, {
          amount: 1000,
          currency: "UZS",
          orderId: "ord-1",
        });
        fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        const response = (error as BadRequestException).getResponse() as any;
        // handleError creates BadRequestException({ code: mapping.internalCode, ... })
        expect(response.code).toBe("PAYMENT_INSUFFICIENT_FUNDS");
        expect(response.message).toBe("Insufficient funds on the card");
      }
    });

    it("should handle non-Axios errors gracefully", async () => {
      axiosMock.mockRejectedValue(new TypeError("Cannot read property"));

      await expect(
        service.createPayment(mockIntegration as Integration, {
          amount: 1000,
          currency: "UZS",
          orderId: "ord-1",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should not throw when logging fails", async () => {
      integrationService.createLog!.mockRejectedValue(
        new Error("DB connection lost"),
      );

      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      // Should not throw despite log failure
      const result = await service.createPayment(
        mockIntegration as Integration,
        { amount: 1000, currency: "UZS", orderId: "ord-1" },
      );

      expect(result.paymentId).toBe("pay-001");
    });
  });

  // ================================================================
  // Multi-tenant verification
  // ================================================================

  describe("multi-tenant filtering", () => {
    it("should pass organizationId to log creation", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      await service.createPayment(mockIntegration as Integration, {
        amount: 1000,
        currency: "UZS",
        orderId: "ord-1",
      });

      expect(integrationService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          integrationId,
        }),
      );
    });

    it("should pass organizationId when updating integration stats", async () => {
      axiosMock.mockResolvedValue({
        status: 200,
        headers: {},
        data: { id: "pay-001", status: "pending" },
      });

      await service.createPayment(mockIntegration as Integration, {
        amount: 1000,
        currency: "UZS",
        orderId: "ord-1",
      });

      expect(integrationService.update).toHaveBeenCalledWith(
        integrationId,
        orgId,
        expect.any(Object),
        "system",
      );
    });
  });
});
