/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import {
  PasswordPolicyService,
  PasswordPolicy,
} from "./password-policy.service";

describe("PasswordPolicyService", () => {
  /**
   * Helper to build a PasswordPolicyService with the given env overrides.
   * Default config matches the service's built-in defaults.
   */
  async function createService(
    envOverrides: Record<string, any> = {},
  ): Promise<PasswordPolicyService> {
    const configValues: Record<string, any> = {
      PASSWORD_MIN_LENGTH: 8,
      PASSWORD_MAX_LENGTH: 128,
      PASSWORD_REQUIRE_UPPERCASE: "true",
      PASSWORD_REQUIRE_LOWERCASE: "true",
      PASSWORD_REQUIRE_NUMBERS: "true",
      PASSWORD_REQUIRE_SPECIAL_CHARS: "false",
      PASSWORD_MIN_UNIQUE_CHARS: 4,
      PASSWORD_PREVENT_COMMON: "true",
      PASSWORD_PREVENT_USER_INFO: "true",
      PASSWORD_MAX_CONSECUTIVE_REPEATS: 3,
      PASSWORD_HISTORY_COUNT: 0,
      ...envOverrides,
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        return key in configValues ? configValues[key] : defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordPolicyService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return module.get<PasswordPolicyService>(PasswordPolicyService);
  }

  it("should be defined", async () => {
    const service = await createService();
    expect(service).toBeDefined();
  });

  // ---------- Valid passwords ----------

  describe("valid password acceptance", () => {
    it("should accept a strong password meeting all default requirements", async () => {
      const service = await createService();

      const result = service.validate("Str0ngP@ss99");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept a password without special chars when not required", async () => {
      const service = await createService({
        PASSWORD_REQUIRE_SPECIAL_CHARS: "false",
      });

      const result = service.validate("StrongPass1");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ---------- Length checks ----------

  describe("length validation", () => {
    it("should reject a password shorter than minLength", async () => {
      const service = await createService({ PASSWORD_MIN_LENGTH: 8 });

      const result = service.validate("Ab1cdef");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long",
      );
    });

    it("should reject a password exceeding maxLength", async () => {
      const service = await createService({ PASSWORD_MAX_LENGTH: 10 });

      const result = service.validate("Abcdefgh1jk");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Password must not exceed 10 characters");
    });

    it("should accept a password at exactly minLength", async () => {
      const service = await createService({ PASSWORD_MIN_LENGTH: 8 });

      const result = service.validate("Abcdef1x");

      expect(result.valid).toBe(true);
    });
  });

  // ---------- Uppercase ----------

  describe("uppercase requirement", () => {
    it("should reject password without uppercase when required", async () => {
      const service = await createService({
        PASSWORD_REQUIRE_UPPERCASE: "true",
      });

      const result = service.validate("alllowercase1");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter",
      );
    });

    it("should accept password without uppercase when not required", async () => {
      const service = await createService({
        PASSWORD_REQUIRE_UPPERCASE: "false",
      });

      const result = service.validate("nouppercase1");

      expect(result.valid).toBe(true);
    });
  });

  // ---------- Lowercase ----------

  describe("lowercase requirement", () => {
    it("should reject password without lowercase when required", async () => {
      const service = await createService({
        PASSWORD_REQUIRE_LOWERCASE: "true",
      });

      const result = service.validate("ALLUPPERCASE1");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one lowercase letter",
      );
    });
  });

  // ---------- Numbers ----------

  describe("number requirement", () => {
    it("should reject password without numbers when required", async () => {
      const service = await createService({
        PASSWORD_REQUIRE_NUMBERS: "true",
      });

      const result = service.validate("NoNumbersHere");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one number",
      );
    });

    it("should accept password without numbers when not required", async () => {
      const service = await createService({
        PASSWORD_REQUIRE_NUMBERS: "false",
      });

      const result = service.validate("NoNumbersHere");

      expect(result.valid).toBe(true);
    });
  });

  // ---------- Special characters ----------

  describe("special character requirement", () => {
    it("should reject password without special chars when required", async () => {
      const service = await createService({
        PASSWORD_REQUIRE_SPECIAL_CHARS: "true",
      });

      const result = service.validate("NoSpecial1Chars");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character",
      );
    });

    it("should accept password with special chars when required", async () => {
      const service = await createService({
        PASSWORD_REQUIRE_SPECIAL_CHARS: "true",
      });

      const result = service.validate("HasSpec!al1");

      expect(result.valid).toBe(true);
    });
  });

  // ---------- Unique characters ----------

  describe("unique character requirement", () => {
    it("should reject password with too few unique characters", async () => {
      const service = await createService({ PASSWORD_MIN_UNIQUE_CHARS: 4 });

      // "AAAaaa11" has only 3 unique chars: a, 1 (case-insensitive: a, 1) — actually a=1, 1=1 = 2 unique
      const result = service.validate("Aaa1aaa1");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least 4 unique characters",
      );
    });
  });

  // ---------- Consecutive repeats ----------

  describe("consecutive repeat check", () => {
    it("should reject password with too many consecutive repeated characters", async () => {
      const service = await createService({
        PASSWORD_MAX_CONSECUTIVE_REPEATS: 3,
      });

      // 4 consecutive 'a' characters exceed max of 3
      const result = service.validate("Paaaass1");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must not contain more than 3 consecutive repeated characters",
      );
    });

    it("should accept password with exactly maxConsecutiveRepeats repeated chars", async () => {
      const service = await createService({
        PASSWORD_MAX_CONSECUTIVE_REPEATS: 3,
      });

      // 3 consecutive 'a' is exactly at the limit (regex checks for >3 repeats)
      const result = service.validate("Paaass1x");

      expect(result.valid).toBe(true);
    });
  });

  // ---------- Common passwords ----------

  describe("common password rejection", () => {
    it('should reject "password" as a common password', async () => {
      const service = await createService();

      const result = service.validate("password");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password is too common. Please choose a more unique password",
      );
    });

    it("should reject common passwords case-insensitively", async () => {
      const service = await createService();

      const result = service.validate("PASSWORD");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password is too common. Please choose a more unique password",
      );
    });

    it('should reject "vendhub123" as a project-specific common password', async () => {
      const service = await createService();

      const result = service.validate("vendhub123");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password is too common. Please choose a more unique password",
      );
    });

    it("should allow common password check to be disabled", async () => {
      const service = await createService({
        PASSWORD_PREVENT_COMMON: "false",
        PASSWORD_REQUIRE_UPPERCASE: "false",
      });

      const result = service.validate("password1");

      // Still may fail other rules, but not common password rule
      expect(
        result.errors.includes(
          "Password is too common. Please choose a more unique password",
        ),
      ).toBe(false);
    });
  });

  // ---------- User info in password ----------

  describe("user info prevention", () => {
    it("should reject password containing user email local part", async () => {
      const service = await createService();

      const result = service.validate("john123Abc", {
        email: "john@vendhub.uz",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must not contain your name or email",
      );
    });

    it("should reject password containing first name", async () => {
      const service = await createService();

      const result = service.validate("Alisher7pass", {
        firstName: "Alisher",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must not contain your name or email",
      );
    });

    it("should reject password containing last name", async () => {
      const service = await createService();

      const result = service.validate("MyKarimov1pass", {
        lastName: "Karimov",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "Password must not contain your name or email",
      );
    });

    it("should not flag short names (< 3 characters)", async () => {
      const service = await createService();

      const result = service.validate("Security1Li", {
        firstName: "Li",
      });

      // "Li" is too short to be flagged, so no user info error
      expect(
        result.errors.includes("Password must not contain your name or email"),
      ).toBe(false);
    });

    it("should skip user info check when userContext is not provided", async () => {
      const service = await createService();

      const result = service.validate("Str0ngPass1");

      expect(result.valid).toBe(true);
    });

    it("should skip user info check when disabled via config", async () => {
      const service = await createService({
        PASSWORD_PREVENT_USER_INFO: "false",
      });

      const result = service.validate("john1234Ab", {
        email: "john@example.com",
      });

      expect(
        result.errors.includes("Password must not contain your name or email"),
      ).toBe(false);
    });
  });

  // ---------- Multiple errors ----------

  describe("multiple validation errors", () => {
    it("should return all applicable errors at once", async () => {
      const service = await createService({
        PASSWORD_REQUIRE_SPECIAL_CHARS: "true",
      });

      // "abc" — too short, no uppercase, no number, no special char
      const result = service.validate("abc");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
      expect(result.errors).toContain(
        "Password must be at least 8 characters long",
      );
      expect(result.errors).toContain(
        "Password must contain at least one uppercase letter",
      );
      expect(result.errors).toContain(
        "Password must contain at least one number",
      );
      expect(result.errors).toContain(
        "Password must contain at least one special character",
      );
    });
  });

  // ---------- getRequirements() ----------

  describe("getRequirements", () => {
    it("should return a copy of the current policy", async () => {
      const service = await createService({
        PASSWORD_MIN_LENGTH: 12,
        PASSWORD_REQUIRE_SPECIAL_CHARS: "true",
      });

      const policy: PasswordPolicy = service.getRequirements();

      expect(policy.minLength).toBe(12);
      expect(policy.requireSpecialChars).toBe(true);
      expect(policy.requireUppercase).toBe(true);
      expect(policy.requireLowercase).toBe(true);
      expect(policy.requireNumbers).toBe(true);
      expect(policy.preventCommonPasswords).toBe(true);
    });

    it("should return a new object (not the internal reference)", async () => {
      const service = await createService();

      const policy1 = service.getRequirements();
      const policy2 = service.getRequirements();

      expect(policy1).not.toBe(policy2);
      expect(policy1).toEqual(policy2);
    });
  });
});
