import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Password strength policy returned by {@link PasswordPolicyService.getRequirements}.
 */
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minUniqueChars: number;
  preventCommonPasswords: boolean;
  preventUserInfoInPassword: boolean;
  maxConsecutiveRepeats: number;
  historyCount: number;
}

/**
 * Result returned by {@link PasswordPolicyService.validate}.
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Optional user context for contextual validation
 * (e.g. preventing email or name as part of the password).
 */
export interface PasswordUserContext {
  email?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Configurable password validation service.
 *
 * The default policy enforces reasonable production-grade rules.
 * Individual settings can be overridden via environment variables:
 *   PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH,
 *   PASSWORD_REQUIRE_UPPERCASE, PASSWORD_REQUIRE_LOWERCASE,
 *   PASSWORD_REQUIRE_NUMBERS, PASSWORD_REQUIRE_SPECIAL_CHARS,
 *   PASSWORD_MIN_UNIQUE_CHARS, PASSWORD_PREVENT_COMMON,
 *   PASSWORD_PREVENT_USER_INFO, PASSWORD_MAX_CONSECUTIVE_REPEATS,
 *   PASSWORD_HISTORY_COUNT
 */
@Injectable()
export class PasswordPolicyService {
  private readonly logger = new Logger(PasswordPolicyService.name);
  private readonly policy: PasswordPolicy;

  /**
   * A small set of the most common passwords.
   * In production you would load a larger dictionary from a file or external source.
   */
  private static readonly COMMON_PASSWORDS: ReadonlySet<string> = new Set([
    'password', 'password1', '123456', '12345678', '123456789',
    '1234567890', 'qwerty', 'qwerty123', 'abc123', 'letmein',
    'admin', 'welcome', 'monkey', 'master', 'dragon',
    'login', 'princess', 'football', 'shadow', 'sunshine',
    'trustno1', 'iloveyou', 'batman', 'access', 'hello',
    'charlie', 'donald', '!@#$%^&*', 'passw0rd', 'p@ssword',
    'p@ssw0rd', 'vendhub', 'vendhub123',
  ]);

  constructor(private readonly configService: ConfigService) {
    this.policy = {
      minLength: this.configService.get<number>('PASSWORD_MIN_LENGTH', 8),
      maxLength: this.configService.get<number>('PASSWORD_MAX_LENGTH', 128),
      requireUppercase: this.configService.get<string>('PASSWORD_REQUIRE_UPPERCASE', 'true') === 'true',
      requireLowercase: this.configService.get<string>('PASSWORD_REQUIRE_LOWERCASE', 'true') === 'true',
      requireNumbers: this.configService.get<string>('PASSWORD_REQUIRE_NUMBERS', 'true') === 'true',
      requireSpecialChars: this.configService.get<string>('PASSWORD_REQUIRE_SPECIAL_CHARS', 'false') === 'true',
      minUniqueChars: this.configService.get<number>('PASSWORD_MIN_UNIQUE_CHARS', 4),
      preventCommonPasswords: this.configService.get<string>('PASSWORD_PREVENT_COMMON', 'true') === 'true',
      preventUserInfoInPassword: this.configService.get<string>('PASSWORD_PREVENT_USER_INFO', 'true') === 'true',
      maxConsecutiveRepeats: this.configService.get<number>('PASSWORD_MAX_CONSECUTIVE_REPEATS', 3),
      historyCount: this.configService.get<number>('PASSWORD_HISTORY_COUNT', 0),
    };

    this.logger.log(
      `Password policy initialised: minLen=${this.policy.minLength}, ` +
      `requireUpper=${this.policy.requireUppercase}, requireLower=${this.policy.requireLowercase}, ` +
      `requireNum=${this.policy.requireNumbers}, requireSpecial=${this.policy.requireSpecialChars}`,
    );
  }

  /**
   * Validate a password against the current policy.
   *
   * @param password    The plaintext password to validate
   * @param userContext Optional context to prevent user info in password
   * @returns           An object with `valid` flag and list of `errors`
   */
  validate(password: string, userContext?: PasswordUserContext): PasswordValidationResult {
    const errors: string[] = [];

    // --- Length checks ---
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    }
    if (password.length > this.policy.maxLength) {
      errors.push(`Password must not exceed ${this.policy.maxLength} characters`);
    }

    // --- Character class checks ---
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (this.policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // --- Unique character count ---
    const uniqueChars = new Set(password.toLowerCase()).size;
    if (uniqueChars < this.policy.minUniqueChars) {
      errors.push(`Password must contain at least ${this.policy.minUniqueChars} unique characters`);
    }

    // --- Consecutive repeat check ---
    if (this.policy.maxConsecutiveRepeats > 0) {
      const regex = new RegExp(`(.)\\1{${this.policy.maxConsecutiveRepeats},}`);
      if (regex.test(password)) {
        errors.push(
          `Password must not contain more than ${this.policy.maxConsecutiveRepeats} consecutive repeated characters`,
        );
      }
    }

    // --- Common password check ---
    if (this.policy.preventCommonPasswords) {
      if (PasswordPolicyService.COMMON_PASSWORDS.has(password.toLowerCase())) {
        errors.push('Password is too common. Please choose a more unique password');
      }
    }

    // --- User info in password check ---
    if (this.policy.preventUserInfoInPassword && userContext) {
      const lower = password.toLowerCase();
      const parts: string[] = [];

      if (userContext.email) {
        // Use the local part of the email (before @)
        const localPart = userContext.email.toLowerCase().split('@')[0];
        if (localPart && localPart.length >= 3) {
          parts.push(localPart);
        }
      }
      if (userContext.firstName && userContext.firstName.length >= 3) {
        parts.push(userContext.firstName.toLowerCase());
      }
      if (userContext.lastName && userContext.lastName.length >= 3) {
        parts.push(userContext.lastName.toLowerCase());
      }

      for (const part of parts) {
        if (lower.includes(part)) {
          errors.push('Password must not contain your name or email');
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Return the current policy configuration.
   * Useful for sending to the frontend so it can display requirements to the user.
   */
  getRequirements(): PasswordPolicy {
    return { ...this.policy };
  }
}
