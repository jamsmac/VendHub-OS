import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";

// Mock nodemailer
const mockSendMail = jest.fn();
const mockVerify = jest.fn();
const mockCreateTransport = jest.fn().mockReturnValue({
  sendMail: mockSendMail,
  verify: mockVerify,
});

jest.mock("nodemailer", () => ({
  createTransport: (...args: unknown[]) => mockCreateTransport(...args),
}));

describe("EmailService", () => {
  let service: EmailService;
  let _configService: ConfigService;

  const configuredSmtpValues: Record<string, string | number> = {
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: 587,
    SMTP_USER: "user@example.com",
    SMTP_PASSWORD: "secret",
    SMTP_FROM_EMAIL: "noreply@vendhub.com",
    SMTP_FROM_NAME: "VendHub",
    FRONTEND_URL: "https://app.vendhub.com",
  };

  const unconfiguredSmtpValues: Record<string, string | number | undefined> = {
    SMTP_HOST: undefined,
  };

  function createModule(
    configValues: Record<string, string | number | undefined>,
  ) {
    return Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              return key in configValues
                ? configValues[key]
                : (defaultValue ?? undefined);
            }),
          },
        },
      ],
    }).compile();
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await createModule(configuredSmtpValues);
    service = module.get<EmailService>(EmailService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  // ==========================================================================
  // Module creation
  // ==========================================================================

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // isConfigured
  // ==========================================================================

  describe("isConfigured", () => {
    it("should return true when SMTP_HOST is set", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should return false when SMTP_HOST is not set", async () => {
      const module = await createModule(unconfiguredSmtpValues);
      const unconfiguredService = module.get<EmailService>(EmailService);
      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  // ==========================================================================
  // sendEmail
  // ==========================================================================

  describe("sendEmail", () => {
    it("should send email via nodemailer transport", async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: "<test-123@example.com>",
        accepted: ["user@example.com"],
      });

      const result = await service.sendEmail({
        to: "user@example.com",
        subject: "Test Subject",
        text: "Test body",
      });

      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: { user: "user@example.com", pass: "secret" },
      });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Test Subject",
          text: "Test body",
        }),
      );
      expect(result.messageId).toBe("<test-123@example.com>");
      expect(result.accepted).toEqual(["user@example.com"]);
    });

    it("should join array recipients with comma", async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: "<test-456@example.com>",
        accepted: ["a@test.com", "b@test.com"],
      });

      await service.sendEmail({
        to: ["a@test.com", "b@test.com"],
        subject: "Multi",
        text: "Body",
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "a@test.com, b@test.com",
        }),
      );
    });

    it("should enable secure for port 465", async () => {
      const module = await createModule({
        ...configuredSmtpValues,
        SMTP_PORT: 465,
      });
      const secureService = module.get<EmailService>(EmailService);

      mockSendMail.mockResolvedValueOnce({
        messageId: "<ssl@example.com>",
        accepted: [],
      });

      await secureService.sendEmail({
        to: "user@test.com",
        subject: "SSL",
        text: "Body",
      });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true, port: 465 }),
      );
    });

    it("should throw when sendMail fails", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP connection refused"));

      await expect(
        service.sendEmail({
          to: "user@test.com",
          subject: "Fail",
          text: "Body",
        }),
      ).rejects.toThrow("SMTP connection refused");
    });
  });

  // ==========================================================================
  // Graceful degradation when SMTP not configured
  // ==========================================================================

  describe("graceful degradation (SMTP not configured)", () => {
    let unconfiguredService: EmailService;

    beforeEach(async () => {
      const module = await createModule(unconfiguredSmtpValues);
      unconfiguredService = module.get<EmailService>(EmailService);
    });

    it("should return empty result for sendEmail", async () => {
      const result = await unconfiguredService.sendEmail({
        to: "user@test.com",
        subject: "Test",
        text: "Body",
      });

      expect(result.messageId).toBe("");
      expect(result.accepted).toEqual([]);
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("should not throw for sendWelcomeEmail", async () => {
      await expect(
        unconfiguredService.sendWelcomeEmail(
          "user@test.com",
          "Test User",
          "admin",
        ),
      ).resolves.not.toThrow();
    });

    it("should not throw for sendPasswordResetEmail", async () => {
      await expect(
        unconfiguredService.sendPasswordResetEmail(
          "user@test.com",
          "Test User",
          "reset-token-123",
        ),
      ).resolves.not.toThrow();
    });

    it("should not throw for sendTaskNotification", async () => {
      await expect(
        unconfiguredService.sendTaskNotification(
          "user@test.com",
          "Пополнение",
          "VM-001",
        ),
      ).resolves.not.toThrow();
    });

    it("should not throw for sendLowStockAlert", async () => {
      await expect(
        unconfiguredService.sendLowStockAlert("user@test.com", "VM-001", [
          { name: "Кофе", current: 2, min: 10 },
        ]),
      ).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // sendWelcomeEmail
  // ==========================================================================

  describe("sendWelcomeEmail", () => {
    it("should send email with user name and role in template", async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: "<welcome@test.com>",
        accepted: ["new@test.com"],
      });

      await service.sendWelcomeEmail("new@test.com", "Иван Петров", "manager");

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain("Иван Петров");
      expect(callArgs.html).toContain("manager");
      expect(callArgs.html).toContain("VendHub");
      expect(callArgs.html).toContain("https://app.vendhub.com");
      expect(callArgs.subject).toContain("Добро пожаловать");
    });
  });

  // ==========================================================================
  // sendPasswordResetEmail
  // ==========================================================================

  describe("sendPasswordResetEmail", () => {
    it("should send email with reset URL containing the token", async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: "<reset@test.com>",
        accepted: ["user@test.com"],
      });

      await service.sendPasswordResetEmail(
        "user@test.com",
        "Мария Сидорова",
        "abc-reset-token-xyz",
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain("Мария Сидорова");
      expect(callArgs.html).toContain(
        "https://app.vendhub.com/auth/reset-password?token=abc-reset-token-xyz",
      );
      expect(callArgs.subject).toContain("Сброс пароля");
    });
  });

  // ==========================================================================
  // sendTaskNotification
  // ==========================================================================

  describe("sendTaskNotification", () => {
    it("should send task notification with type and machine number", async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: "<task@test.com>",
        accepted: ["operator@test.com"],
      });

      const dueDate = new Date("2026-03-15T14:00:00Z");

      await service.sendTaskNotification(
        "operator@test.com",
        "Пополнение",
        "VM-042",
        dueDate,
      );

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain("Пополнение");
      expect(callArgs.html).toContain("VM-042");
      expect(callArgs.subject).toContain("VM-042");
      expect(callArgs.subject).toContain("Пополнение");
    });

    it("should handle missing dueDate", async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: "<task-no-date@test.com>",
        accepted: ["op@test.com"],
      });

      await service.sendTaskNotification("op@test.com", "Ремонт", "VM-100");

      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain("Не указан");
    });
  });

  // ==========================================================================
  // sendLowStockAlert
  // ==========================================================================

  describe("sendLowStockAlert", () => {
    it("should send alert with items list", async () => {
      mockSendMail.mockResolvedValueOnce({
        messageId: "<stock@test.com>",
        accepted: ["manager@test.com"],
      });

      const items = [
        { name: "Кофе арабика", current: 2, min: 10 },
        { name: "Сахар", current: 0, min: 5 },
        { name: "Стаканы 200мл", current: 15, min: 50 },
      ];

      await service.sendLowStockAlert("manager@test.com", "VM-007", items);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.html).toContain("VM-007");
      expect(callArgs.html).toContain("Кофе арабика");
      expect(callArgs.html).toContain("Сахар");
      expect(callArgs.html).toContain("Стаканы 200мл");
      // Check current/min values are present in the HTML
      // Values are inside <td> tags with whitespace, so match with regex
      expect(callArgs.html).toMatch(/>\s*2\s*<\/td>/);
      expect(callArgs.html).toMatch(/>\s*10\s*<\/td>/);
      expect(callArgs.html).toMatch(/>\s*0\s*<\/td>/);
      expect(callArgs.html).toMatch(/>\s*5\s*<\/td>/);
      expect(callArgs.html).toMatch(/>\s*15\s*<\/td>/);
      expect(callArgs.html).toMatch(/>\s*50\s*<\/td>/);
      expect(callArgs.subject).toContain("VM-007");
      expect(callArgs.subject).toContain("3 поз.");
    });
  });

  // ==========================================================================
  // verifyConnection
  // ==========================================================================

  describe("verifyConnection", () => {
    it("should return true when SMTP connection is valid", async () => {
      mockVerify.mockResolvedValueOnce(true);

      // Trigger transport creation first
      mockSendMail.mockResolvedValueOnce({
        messageId: "",
        accepted: [],
      });
      await service.sendEmail({ to: "x@x.com", subject: "x", text: "x" });

      const result = await service.verifyConnection();
      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });

    it("should return false when SMTP connection fails", async () => {
      mockVerify.mockRejectedValueOnce(new Error("Connection refused"));

      // Trigger transport creation first
      mockSendMail.mockResolvedValueOnce({
        messageId: "",
        accepted: [],
      });
      await service.sendEmail({ to: "x@x.com", subject: "x", text: "x" });

      const result = await service.verifyConnection();
      expect(result).toBe(false);
    });

    it("should return false when SMTP not configured", async () => {
      const module = await createModule(unconfiguredSmtpValues);
      const unconfiguredService = module.get<EmailService>(EmailService);

      const result = await unconfiguredService.verifyConnection();
      expect(result).toBe(false);
    });
  });
});
