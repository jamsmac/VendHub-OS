import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { SmsService } from "./sms.service";
import { SmsStatus, SmsProvider } from "./dto/send-sms.dto";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("SmsService", () => {
  let service: SmsService;

  const createModule = async (
    configOverrides: Record<string, string> = {},
  ): Promise<TestingModule> => {
    const defaultConfig: Record<string, string> = {
      ESKIZ_EMAIL: "test@eskiz.uz",
      ESKIZ_PASSWORD: "secret123",
      ESKIZ_SENDER_ID: "4546",
      PLAYMOBILE_LOGIN: "",
      PLAYMOBILE_PASSWORD: "",
      PLAYMOBILE_SENDER_ID: "",
      ...configOverrides,
    };

    return Test.createTestingModule({
      providers: [
        SmsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              return defaultConfig[key] ?? defaultValue ?? "";
            }),
          },
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    mockFetch.mockReset();

    const module = await createModule();
    service = module.get<SmsService>(SmsService);
  });

  // ==========================================================================
  // MODULE CREATION
  // ==========================================================================

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // PHONE NUMBER FORMATTING
  // ==========================================================================

  describe("formatPhoneNumber", () => {
    it("should handle full international format with plus", () => {
      expect(service.formatPhoneNumber("+998901234567")).toBe("998901234567");
    });

    it("should handle full international format without plus", () => {
      expect(service.formatPhoneNumber("998901234567")).toBe("998901234567");
    });

    it("should prepend 998 for 9-digit local number", () => {
      expect(service.formatPhoneNumber("901234567")).toBe("998901234567");
    });

    it("should strip spaces, dashes, and parens", () => {
      expect(service.formatPhoneNumber("+998 90 123 45 67")).toBe(
        "998901234567",
      );
      expect(service.formatPhoneNumber("998-90-123-45-67")).toBe(
        "998901234567",
      );
      expect(service.formatPhoneNumber("(998) 90 123 4567")).toBe(
        "998901234567",
      );
    });

    it("should handle 00998 prefix", () => {
      expect(service.formatPhoneNumber("00998901234567")).toBe("998901234567");
    });

    it("should return cleaned number if cannot normalize", () => {
      // Too short to be valid
      const result = service.formatPhoneNumber("12345");
      expect(result).toBe("12345");
    });
  });

  // ==========================================================================
  // CONFIGURATION CHECK
  // ==========================================================================

  describe("isConfigured", () => {
    it("should return true when Eskiz is configured", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should return true when only PlayMobile is configured", async () => {
      const module = await createModule({
        ESKIZ_EMAIL: "",
        ESKIZ_PASSWORD: "",
        PLAYMOBILE_LOGIN: "pm_user",
        PLAYMOBILE_PASSWORD: "pm_pass",
      });
      const pmService = module.get<SmsService>(SmsService);

      expect(pmService.isConfigured()).toBe(true);
    });

    it("should return false when no provider is configured", async () => {
      const module = await createModule({
        ESKIZ_EMAIL: "",
        ESKIZ_PASSWORD: "",
        PLAYMOBILE_LOGIN: "",
        PLAYMOBILE_PASSWORD: "",
      });
      const unconfiguredService = module.get<SmsService>(SmsService);

      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  // ==========================================================================
  // SEND VIA ESKIZ
  // ==========================================================================

  describe("send via Eskiz", () => {
    it("should authenticate and send SMS successfully", async () => {
      // Mock Eskiz auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: "test-token-123" } }),
      });

      // Mock Eskiz send
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "eskiz-msg-001" }),
      });

      const result = await service.send({
        to: "998901234567",
        message: "Test SMS",
      });

      expect(result.status).toBe(SmsStatus.SENT);
      expect(result.provider).toBe(SmsProvider.ESKIZ);
      expect(result.messageId).toBe("eskiz-msg-001");

      // Verify auth call
      expect(mockFetch).toHaveBeenCalledWith(
        "https://notify.eskiz.uz/api/auth/login",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "test@eskiz.uz",
            password: "secret123",
          }),
        }),
      );

      // Verify send call
      expect(mockFetch).toHaveBeenCalledWith(
        "https://notify.eskiz.uz/api/message/sms/send",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token-123",
          }),
        }),
      );
    });

    it("should reuse cached Eskiz token", async () => {
      // First call: auth + send
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { token: "cached-token" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "msg-1" }),
        });

      await service.send({ to: "998901234567", message: "First" });

      mockFetch.mockReset();

      // Second call: should reuse token (no auth call)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "msg-2" }),
      });

      const result = await service.send({
        to: "998901234567",
        message: "Second",
      });

      expect(result.status).toBe(SmsStatus.SENT);
      // Only 1 fetch call (send only, no auth)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should retry with fresh token on 401", async () => {
      // Auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: "old-token" } }),
      });

      // Send returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Token expired",
      });

      // Re-auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: "new-token" } }),
      });

      // Retry send
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "retry-msg" }),
      });

      const result = await service.send({
        to: "998901234567",
        message: "Retry test",
      });

      expect(result.status).toBe(SmsStatus.SENT);
      expect(result.provider).toBe(SmsProvider.ESKIZ);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it("should return error response when Eskiz auth fails and no fallback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      });

      const result = await service.send({
        to: "998901234567",
        message: "Will fail",
      });

      expect(result.status).toBe(SmsStatus.FAILED);
      expect(result.provider).toBe(SmsProvider.ESKIZ);
      expect(result.error).toContain("Eskiz auth failed");
    });
  });

  // ==========================================================================
  // SEND VIA PLAYMOBILE
  // ==========================================================================

  describe("send via PlayMobile", () => {
    let pmService: SmsService;

    beforeEach(async () => {
      mockFetch.mockReset();
      const module = await createModule({
        ESKIZ_EMAIL: "",
        ESKIZ_PASSWORD: "",
        PLAYMOBILE_LOGIN: "pm_user",
        PLAYMOBILE_PASSWORD: "pm_pass",
        PLAYMOBILE_SENDER_ID: "VendHub",
      });
      pmService = module.get<SmsService>(SmsService);
    });

    it("should send SMS via PlayMobile", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await pmService.send({
        to: "998901234567",
        message: "PlayMobile test",
      });

      expect(result.status).toBe(SmsStatus.SENT);
      expect(result.provider).toBe(SmsProvider.PLAYMOBILE);
      expect(result.messageId).toBeDefined();

      // Verify basic auth header
      const authHeader = `Basic ${Buffer.from("pm_user:pm_pass").toString("base64")}`;
      expect(mockFetch).toHaveBeenCalledWith(
        "https://send.playmobile.uz/broker-api/send",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: authHeader,
          }),
        }),
      );
    });

    it("should return error response when PlayMobile fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Provider error",
      });

      const result = await pmService.send({
        to: "998901234567",
        message: "Will fail",
      });

      expect(result.status).toBe(SmsStatus.FAILED);
      expect(result.provider).toBe(SmsProvider.PLAYMOBILE);
      expect(result.error).toContain("PlayMobile send failed");
    });
  });

  // ==========================================================================
  // FALLBACK: ESKIZ -> PLAYMOBILE
  // ==========================================================================

  describe("fallback from Eskiz to PlayMobile", () => {
    let fallbackService: SmsService;

    beforeEach(async () => {
      mockFetch.mockReset();
      const module = await createModule({
        ESKIZ_EMAIL: "test@eskiz.uz",
        ESKIZ_PASSWORD: "secret",
        PLAYMOBILE_LOGIN: "pm_user",
        PLAYMOBILE_PASSWORD: "pm_pass",
        PLAYMOBILE_SENDER_ID: "VendHub",
      });
      fallbackService = module.get<SmsService>(SmsService);
    });

    it("should fall back to PlayMobile when Eskiz fails", async () => {
      // Eskiz auth fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Eskiz down",
      });

      // PlayMobile succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await fallbackService.send({
        to: "998901234567",
        message: "Fallback test",
      });

      expect(result.status).toBe(SmsStatus.SENT);
      expect(result.provider).toBe(SmsProvider.PLAYMOBILE);
    });
  });

  // ==========================================================================
  // NO PROVIDER CONFIGURED (GRACEFUL DEGRADATION)
  // ==========================================================================

  describe("no provider configured", () => {
    let unconfiguredService: SmsService;

    beforeEach(async () => {
      mockFetch.mockReset();
      const module = await createModule({
        ESKIZ_EMAIL: "",
        ESKIZ_PASSWORD: "",
        PLAYMOBILE_LOGIN: "",
        PLAYMOBILE_PASSWORD: "",
      });
      unconfiguredService = module.get<SmsService>(SmsService);
    });

    it("should return mock response without throwing", async () => {
      const result = await unconfiguredService.send({
        to: "998901234567",
        message: "No provider",
      });

      expect(result.status).toBe(SmsStatus.NOT_CONFIGURED);
      expect(result.provider).toBe(SmsProvider.MOCK);
      expect(result.error).toBe("No SMS provider configured");
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // VERIFICATION CODE TEMPLATE
  // ==========================================================================

  describe("sendVerificationCode", () => {
    it("should send verification code with bilingual template", async () => {
      // Auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: "token" } }),
      });
      // Send
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "verify-msg" }),
      });

      const result = await service.sendVerificationCode("998901234567", "4321");

      expect(result.status).toBe(SmsStatus.SENT);

      // Verify the message body includes the code
      const sendCall = mockFetch.mock.calls[1];
      const body = JSON.parse(sendCall[1].body as string);
      expect(body.message).toContain("4321");
      expect(body.message).toContain("VendHub");
    });
  });

  // ==========================================================================
  // TASK NOTIFICATION TEMPLATE
  // ==========================================================================

  describe("sendTaskNotification", () => {
    it("should send task notification with bilingual template", async () => {
      // Auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: "token" } }),
      });
      // Send
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "task-msg" }),
      });

      const result = await service.sendTaskNotification(
        "998901234567",
        "Refill",
        "VM-001",
      );

      expect(result.status).toBe(SmsStatus.SENT);

      const sendCall = mockFetch.mock.calls[1];
      const body = JSON.parse(sendCall[1].body as string);
      expect(body.message).toContain("Refill");
      expect(body.message).toContain("VM-001");
    });
  });

  // ==========================================================================
  // BULK SEND
  // ==========================================================================

  describe("sendBulk", () => {
    it("should send to all recipients and return array of responses", async () => {
      // We need auth once (cached) + 3 sends
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { token: "bulk-token" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "bulk-1" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "bulk-2" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "bulk-3" }),
        });

      const results = await service.sendBulk({
        recipients: ["998901234567", "998911234567", "998931234567"],
        message: "Bulk test",
      });

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.status === SmsStatus.SENT)).toBe(true);
    });

    it("should handle partial failures in bulk send", async () => {
      // Auth
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { token: "bulk-token" } }),
      });
      // First send succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "ok-1" }),
      });
      // Second send fails at Eskiz, no PlayMobile configured
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Server error",
      });

      const results = await service.sendBulk({
        recipients: ["998901234567", "998911234567"],
        message: "Partial fail test",
      });

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe(SmsStatus.SENT);
      expect(results[1].status).toBe(SmsStatus.FAILED);
    });
  });
});
