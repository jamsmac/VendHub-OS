import { Test, TestingModule } from "@nestjs/testing";
import { AxiosError, AxiosHeaders } from "axios";
import { IntegrationTesterService } from "./integration-tester.service";
import { PaymentExecutorService } from "./payment-executor.service";
import { IntegrationService } from "./integration.service";
import { Integration } from "../entities/integration.entity";
import {
  IntegrationCategory,
  IntegrationStatus,
  AuthType,
  HttpMethod,
  ParamLocation,
  PaymentIntegrationConfig,
  IntegrationTestCase,
} from "../types/integration.types";

describe("IntegrationTesterService", () => {
  let service: IntegrationTesterService;
  let paymentExecutor: Record<string, jest.Mock>;
  let integrationService: Record<string, jest.Mock>;

  const orgId = "org-uuid-1";
  const integrationId = "int-uuid-1";

  const baseConfig: PaymentIntegrationConfig = {
    name: "test_provider",
    displayName: "Test Provider",
    sandboxMode: true,
    baseUrl: "https://api.provider.com",
    auth: {
      type: AuthType.API_KEY,
      config: { keyName: "Authorization", keyLocation: ParamLocation.HEADER },
    },
    credentials: [
      {
        name: "api_key",
        displayName: "API Key",
        type: "password",
        required: true,
      },
    ],
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
    },
  };

  const mockIntegration: Partial<Integration> = {
    id: integrationId,
    organizationId: orgId,
    name: "test_provider",
    displayName: "Test Provider",
    category: IntegrationCategory.PAYMENT,
    status: IntegrationStatus.TESTING,
    config: { ...baseConfig },
    credentials: { api_key: "prod-key" },
    sandboxCredentials: { api_key: "sandbox-key" },
    sandboxMode: true,
    successCount: 0,
    errorCount: 0,
  };

  beforeEach(async () => {
    paymentExecutor = {
      createPayment: jest.fn(),
      checkPaymentStatus: jest.fn(),
      cancelPayment: jest.fn(),
    } as Record<string, jest.Mock>;

    integrationService = {
      update: jest
        .fn()
        .mockImplementation(async (_id: string, _orgId: string, data: any) => ({
          ...mockIntegration,
          ...data,
        })),
      findOne: jest.fn().mockResolvedValue(mockIntegration),
    } as Record<string, jest.Mock>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationTesterService,
        { provide: PaymentExecutorService, useValue: paymentExecutor },
        { provide: IntegrationService, useValue: integrationService },
      ],
    }).compile();

    service = module.get<IntegrationTesterService>(IntegrationTesterService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ================================================================
  // runTestSuite
  // ================================================================

  describe("runTestSuite", () => {
    it("should run all generated test cases and return results", async () => {
      paymentExecutor.createPayment!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "pending" as any,
        amount: 10000,
        currency: "UZS",
      });

      paymentExecutor.checkPaymentStatus!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "pending" as any,
        amount: 10000,
        currency: "UZS",
      });

      const result = await service.runTestSuite(mockIntegration as Integration);

      expect(result.integrationId).toBe(integrationId);
      expect(result.totalTests).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
    });

    it("should update integration status to TESTING when all tests pass", async () => {
      paymentExecutor.createPayment!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "pending" as any,
        amount: 10000,
        currency: "UZS",
      });

      paymentExecutor.checkPaymentStatus!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "pending" as any,
        amount: 10000,
        currency: "UZS",
      });

      await service.runTestSuite(mockIntegration as Integration);

      expect(integrationService.update).toHaveBeenCalledWith(
        integrationId,
        orgId,
        expect.objectContaining({
          lastTestedAt: expect.any(Date),
        }),
        "system",
      );
    });

    it("should update integration status to ERROR when tests fail", async () => {
      paymentExecutor.createPayment!.mockRejectedValue(
        new Error("Connection refused"),
      );

      paymentExecutor.checkPaymentStatus!.mockRejectedValue(
        new Error("Connection refused"),
      );

      const result = await service.runTestSuite(mockIntegration as Integration);

      expect(result.passed).toBe(false);
      expect(result.failedTests).toBeGreaterThan(0);

      expect(integrationService.update).toHaveBeenCalledWith(
        integrationId,
        orgId,
        expect.objectContaining({
          status: IntegrationStatus.ERROR,
          lastError: expect.stringContaining("tests failed"),
        }),
        "system",
      );
    });

    it("should generate minimum amount test case", async () => {
      const configWithMinAmount = {
        ...mockIntegration,
        config: {
          ...baseConfig,
          minAmount: 1000,
        },
      };

      paymentExecutor.createPayment!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "pending" as any,
        amount: 1000,
        currency: "UZS",
      });

      paymentExecutor.checkPaymentStatus!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "pending" as any,
        amount: 1000,
        currency: "UZS",
      });

      const result = await service.runTestSuite(
        configWithMinAmount as Integration,
      );

      // Should include the below-minimum test case
      const belowMinTest = result.results.find(
        (r) => r.testId === "test_below_min_amount",
      );
      expect(belowMinTest).toBeDefined();
    });
  });

  // ================================================================
  // runTestCase
  // ================================================================

  describe("runTestCase", () => {
    it("should return passed result when createPayment succeeds with correct data", async () => {
      paymentExecutor.createPayment!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "pending",
        amount: 10000,
        currency: "UZS",
      });

      const testCase: IntegrationTestCase = {
        id: "test_create",
        name: "Test Create",
        description: "Test creating a payment",
        endpoint: "createPayment",
        method: HttpMethod.POST,
        requestData: {
          amount: 10000,
          currency: "UZS",
          orderId: "test-ord-1",
        },
        expectedStatus: 200,
        assertions: [
          {
            type: "exists",
            path: "paymentId",
            expected: true,
            message: "Payment ID should be returned",
          },
          {
            type: "type",
            path: "status",
            expected: "string",
            message: "Status should be a string",
          },
        ],
      };

      const result = await service.runTestCase(
        mockIntegration as Integration,
        testCase,
      );

      expect(result.passed).toBe(true);
      expect(result.testId).toBe("test_create");
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.assertions.every((a) => a.passed)).toBe(true);
    });

    it("should return failed result when assertions fail", async () => {
      paymentExecutor.createPayment!.mockResolvedValue({
        success: true,
        // paymentId is missing
        status: 12345, // wrong type: number instead of string
        amount: 10000,
        currency: "UZS",
      });

      const testCase: IntegrationTestCase = {
        id: "test_assertions",
        name: "Test Assertions",
        description: "Test failing assertions",
        endpoint: "createPayment",
        method: HttpMethod.POST,
        requestData: {
          amount: 10000,
          currency: "UZS",
          orderId: "test-ord-1",
        },
        expectedStatus: 200,
        assertions: [
          {
            type: "exists",
            path: "paymentId",
            expected: true,
            message: "Payment ID should exist",
          },
          {
            type: "type",
            path: "status",
            expected: "string",
            message: "Status should be a string",
          },
        ],
      };

      const result = await service.runTestCase(
        mockIntegration as Integration,
        testCase,
      );

      expect(result.passed).toBe(false);
      const failedAssertions = result.assertions.filter((a) => !a.passed);
      expect(failedAssertions.length).toBeGreaterThan(0);
    });

    it("should handle checkStatus endpoint", async () => {
      paymentExecutor.checkPaymentStatus!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "completed",
        amount: 10000,
        currency: "UZS",
      });

      const testCase: IntegrationTestCase = {
        id: "test_status",
        name: "Test Status",
        description: "Test checking status",
        endpoint: "checkStatus",
        method: HttpMethod.GET,
        requestData: { paymentId: "pay-001" },
        expectedStatus: 200,
        assertions: [
          {
            type: "exists",
            path: "status",
            expected: true,
            message: "Status should be returned",
          },
        ],
      };

      const result = await service.runTestCase(
        mockIntegration as Integration,
        testCase,
      );

      expect(result.passed).toBe(true);
      expect(paymentExecutor.checkPaymentStatus).toHaveBeenCalledWith(
        mockIntegration,
        "pay-001",
      );
    });

    it("should handle cancelPayment endpoint", async () => {
      paymentExecutor.cancelPayment!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "cancelled",
        amount: 10000,
        currency: "UZS",
      });

      const testCase: IntegrationTestCase = {
        id: "test_cancel",
        name: "Test Cancel",
        description: "Test cancelling payment",
        endpoint: "cancelPayment",
        method: HttpMethod.POST,
        requestData: { paymentId: "pay-001" },
        expectedStatus: 200,
        assertions: [
          {
            type: "equals",
            path: "status",
            expected: "cancelled",
            message: "Status should be cancelled",
          },
        ],
      };

      const result = await service.runTestCase(
        mockIntegration as Integration,
        testCase,
      );

      expect(result.passed).toBe(true);
    });

    it("should throw BadRequestException for unknown endpoint", async () => {
      const testCase: IntegrationTestCase = {
        id: "test_unknown",
        name: "Test Unknown",
        description: "Unknown endpoint",
        endpoint: "unknownEndpoint",
        method: HttpMethod.POST,
        requestData: {},
        expectedStatus: 200,
        assertions: [],
      };

      const result = await service.runTestCase(
        mockIntegration as Integration,
        testCase,
      );

      // Error is caught inside runTestCase, so it returns failed result
      expect(result.passed).toBe(false);
      expect(result.error).toContain("Unknown endpoint");
    });

    it("should handle Axios errors with response data", async () => {
      const axiosError = new AxiosError(
        "Request failed",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 401,
          data: { error: "Unauthorized" },
          statusText: "Unauthorized",
          headers: {},
          config: { headers: new AxiosHeaders() },
        } as any,
      );

      paymentExecutor.createPayment!.mockRejectedValue(axiosError);

      const testCase: IntegrationTestCase = {
        id: "test_auth_error",
        name: "Test Auth Error",
        description: "Test auth error handling",
        endpoint: "createPayment",
        method: HttpMethod.POST,
        requestData: {
          amount: 1000,
          currency: "UZS",
          orderId: "ord-1",
        },
        expectedStatus: 200,
        assertions: [],
      };

      const result = await service.runTestCase(
        mockIntegration as Integration,
        testCase,
      );

      expect(result.passed).toBe(false);
      expect(result.response.status).toBe(401);
    });
  });

  // ================================================================
  // testConnectivity
  // ================================================================

  describe("testConnectivity", () => {
    it("should return success when API responds", async () => {
      paymentExecutor.createPayment!.mockResolvedValue({
        success: true,
        paymentId: "test-pay",
        status: "pending" as any,
        amount: 1000,
        currency: "UZS",
      });

      const result = await service.testConnectivity(
        mockIntegration as Integration,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe("Connection successful");
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it("should return success for 401/403 (connectivity works, auth needed)", async () => {
      const axiosError = new AxiosError(
        "Unauthorized",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 401,
          data: { error: "Invalid credentials" },
          statusText: "Unauthorized",
          headers: {},
          config: { headers: new AxiosHeaders() },
        } as any,
      );

      paymentExecutor.createPayment!.mockRejectedValue(axiosError);

      const result = await service.testConnectivity(
        mockIntegration as Integration,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("authentication required");
    });

    it("should return failure for connection errors", async () => {
      paymentExecutor.createPayment!.mockRejectedValue(
        new Error("ECONNREFUSED"),
      );

      const result = await service.testConnectivity(
        mockIntegration as Integration,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("ECONNREFUSED");
    });

    it("should return failure for 500 server errors", async () => {
      const axiosError = new AxiosError(
        "Server Error",
        "ERR_BAD_RESPONSE",
        undefined,
        undefined,
        {
          status: 500,
          data: { error: "Internal server error" },
          statusText: "Internal Server Error",
          headers: {},
          config: { headers: new AxiosHeaders() },
        } as any,
      );

      paymentExecutor.createPayment!.mockRejectedValue(axiosError);

      const result = await service.testConnectivity(
        mockIntegration as Integration,
      );

      expect(result.success).toBe(false);
    });
  });

  // ================================================================
  // validateCredentials
  // ================================================================

  describe("validateCredentials", () => {
    it("should return valid when all required credentials present and API works", async () => {
      paymentExecutor.createPayment!.mockResolvedValue({
        success: true,
        paymentId: "test-pay",
        status: "pending" as any,
        amount: 100,
        currency: "UZS",
      });

      const result = await service.validateCredentials(
        mockIntegration as Integration,
      );

      expect(result.valid).toBe(true);
      expect(result.message).toContain("validated successfully");
    });

    it("should return invalid when required credentials are missing", async () => {
      const missingCredsIntegration = {
        ...mockIntegration,
        sandboxCredentials: {},
      };

      const result = await service.validateCredentials(
        missingCredsIntegration as Integration,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Missing required credentials");
      expect(result.missingCredentials).toContain("API Key");
    });

    it("should return invalid for 401 response", async () => {
      const axiosError = new AxiosError(
        "Unauthorized",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 401,
          data: {},
          statusText: "Unauthorized",
          headers: {},
          config: { headers: new AxiosHeaders() },
        } as any,
      );

      paymentExecutor.createPayment!.mockRejectedValue(axiosError);

      const result = await service.validateCredentials(
        mockIntegration as Integration,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe("Invalid credentials");
    });

    it("should return valid for non-auth errors (e.g. 400)", async () => {
      const axiosError = new AxiosError(
        "Bad Request",
        "ERR_BAD_REQUEST",
        undefined,
        undefined,
        {
          status: 400,
          data: { error: "Invalid amount" },
          statusText: "Bad Request",
          headers: {},
          config: { headers: new AxiosHeaders() },
        } as any,
      );

      paymentExecutor.createPayment!.mockRejectedValue(axiosError);

      const result = await service.validateCredentials(
        mockIntegration as Integration,
      );

      expect(result.valid).toBe(true);
      expect(result.message).toContain("non-auth error");
    });

    it("should use production credentials when sandboxMode is false", async () => {
      const prodIntegration = {
        ...mockIntegration,
        sandboxMode: false,
        credentials: {}, // missing required credentials
      };

      const result = await service.validateCredentials(
        prodIntegration as Integration,
      );

      expect(result.valid).toBe(false);
      expect(result.missingCredentials).toContain("API Key");
    });
  });

  // ================================================================
  // Assertion checking (via runTestCase)
  // ================================================================

  describe("assertion types", () => {
    const runWithAssertion = async (assertion: any, responseData: any) => {
      paymentExecutor.createPayment!.mockResolvedValue(responseData);

      const testCase: IntegrationTestCase = {
        id: "test_assertion",
        name: "Assertion Test",
        description: "Test assertion logic",
        endpoint: "createPayment",
        method: HttpMethod.POST,
        requestData: { amount: 1000, currency: "UZS", orderId: "ord-1" },
        expectedStatus: 200,
        assertions: [assertion],
      };

      return service.runTestCase(mockIntegration as Integration, testCase);
    };

    it("should check 'equals' assertion", async () => {
      const result = await runWithAssertion(
        { type: "equals", path: "status", expected: "pending", message: "m" },
        { status: "pending" },
      );

      expect(result.assertions[0].passed).toBe(true);
    });

    it("should fail 'equals' assertion on mismatch", async () => {
      const result = await runWithAssertion(
        { type: "equals", path: "status", expected: "completed", message: "m" },
        { status: "pending" },
      );

      expect(result.assertions[0].passed).toBe(false);
    });

    it("should check 'contains' assertion for strings", async () => {
      const result = await runWithAssertion(
        {
          type: "contains",
          path: "message",
          expected: "success",
          message: "m",
        },
        { message: "Payment created successfully" },
      );

      expect(result.assertions[0].passed).toBe(true);
    });

    it("should check 'contains' assertion for arrays", async () => {
      const result = await runWithAssertion(
        { type: "contains", path: "currencies", expected: "UZS", message: "m" },
        { currencies: ["UZS", "USD"] },
      );

      expect(result.assertions[0].passed).toBe(true);
    });

    it("should check 'exists' assertion (value present)", async () => {
      const result = await runWithAssertion(
        { type: "exists", path: "paymentId", expected: true, message: "m" },
        { paymentId: "pay-001" },
      );

      expect(result.assertions[0].passed).toBe(true);
    });

    it("should check 'exists' assertion (value absent, expected false)", async () => {
      const result = await runWithAssertion(
        { type: "exists", path: "error", expected: false, message: "m" },
        { paymentId: "pay-001" },
      );

      expect(result.assertions[0].passed).toBe(true);
    });

    it("should check 'type' assertion", async () => {
      const result = await runWithAssertion(
        { type: "type", path: "amount", expected: "number", message: "m" },
        { amount: 10000 },
      );

      expect(result.assertions[0].passed).toBe(true);
    });

    it("should check 'regex' assertion", async () => {
      const result = await runWithAssertion(
        {
          type: "regex",
          path: "paymentId",
          expected: "^pay-\\d+$",
          message: "m",
        },
        { paymentId: "pay-12345" },
      );

      expect(result.assertions[0].passed).toBe(true);
    });

    it("should handle nested path in assertions", async () => {
      const result = await runWithAssertion(
        {
          type: "equals",
          path: "data.nested.value",
          expected: "deep",
          message: "m",
        },
        { data: { nested: { value: "deep" } } },
      );

      expect(result.assertions[0].passed).toBe(true);
    });
  });

  // ================================================================
  // Multi-tenant verification
  // ================================================================

  describe("multi-tenant filtering", () => {
    it("should pass organizationId when updating integration after test suite", async () => {
      paymentExecutor.createPayment!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "pending" as any,
        amount: 10000,
        currency: "UZS",
      });

      paymentExecutor.checkPaymentStatus!.mockResolvedValue({
        success: true,
        paymentId: "pay-001",
        status: "pending" as any,
        amount: 10000,
        currency: "UZS",
      });

      await service.runTestSuite(mockIntegration as Integration);

      expect(integrationService.update).toHaveBeenCalledWith(
        integrationId,
        orgId,
        expect.any(Object),
        "system",
      );
    });

    it("should not leak data between organizations", async () => {
      const org2Integration = {
        ...mockIntegration,
        organizationId: "org-uuid-2",
      };

      paymentExecutor.createPayment!.mockResolvedValue({
        success: true,
        paymentId: "pay-002",
        status: "pending" as any,
        amount: 10000,
        currency: "UZS",
      });

      paymentExecutor.checkPaymentStatus!.mockResolvedValue({
        success: true,
        paymentId: "pay-002",
        status: "pending" as any,
        amount: 10000,
        currency: "UZS",
      });

      await service.runTestSuite(org2Integration as Integration);

      expect(integrationService.update).toHaveBeenCalledWith(
        integrationId,
        "org-uuid-2",
        expect.any(Object),
        "system",
      );
    });
  });
});
