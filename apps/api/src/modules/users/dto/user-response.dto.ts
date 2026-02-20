import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { BaseResponseDto } from "../../../common/dto";
import { UserRole, UserStatus, LoyaltyLevel } from "../entities/user.entity";

/**
 * User Response DTO
 * Safe representation of User entity for API responses
 * EXCLUDES sensitive fields: password, TOTP secrets, session tokens, IP whitelist, auth details
 */
@Expose()
export class UserResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "User email address" })
  @Expose()
  email: string;

  @ApiPropertyOptional({ description: "Username for login" })
  @Expose()
  username?: string;

  @ApiProperty({ description: "First name" })
  @Expose()
  firstName: string;

  @ApiProperty({ description: "Last name" })
  @Expose()
  lastName: string;

  @ApiPropertyOptional({ description: "Patronymic name" })
  @Expose()
  patronymic?: string;

  @ApiPropertyOptional({ description: "Phone number" })
  @Expose()
  phone?: string;

  @ApiPropertyOptional({ description: "Avatar URL" })
  @Expose()
  avatar?: string;

  @ApiProperty({ description: "User role", enum: UserRole })
  @Expose()
  role: UserRole;

  @ApiProperty({ description: "User status", enum: UserStatus })
  @Expose()
  status: UserStatus;

  @ApiPropertyOptional({ description: "Telegram user ID" })
  @Expose()
  telegramId?: string;

  @ApiPropertyOptional({ description: "Telegram username" })
  @Expose()
  telegramUsername?: string;

  @ApiProperty({ description: "Two-factor authentication enabled" })
  @Expose()
  twoFactorEnabled: boolean;

  @ApiPropertyOptional({ description: "Last login timestamp" })
  @Expose()
  lastLoginAt?: Date;

  @ApiProperty({ description: "Failed login attempts count" })
  @Expose()
  loginAttempts: number;

  @ApiPropertyOptional({ description: "Password change required flag" })
  @Expose()
  mustChangePassword: boolean;

  @ApiProperty({ description: "Organization ID" })
  @Expose()
  organizationId?: string;

  @ApiPropertyOptional({ description: "Approval timestamp" })
  @Expose()
  approvedAt?: Date;

  @ApiPropertyOptional({ description: "Approved by user ID" })
  @Expose()
  approvedById?: string;

  @ApiPropertyOptional({ description: "Rejection timestamp" })
  @Expose()
  rejectedAt?: Date;

  @ApiPropertyOptional({ description: "Rejection reason" })
  @Expose()
  rejectionReason?: string;

  // LOYALTY PROGRAM FIELDS
  @ApiProperty({ description: "Current loyalty points balance" })
  @Expose()
  pointsBalance: number;

  @ApiProperty({
    description: "Current loyalty level",
    enum: ["bronze", "silver", "gold", "platinum"],
  })
  @Expose()
  loyaltyLevel: LoyaltyLevel;

  @ApiProperty({ description: "Total points earned lifetime" })
  @Expose()
  totalPointsEarned: number;

  @ApiProperty({ description: "Total amount spent (UZS)" })
  @Expose()
  totalSpent: number;

  @ApiProperty({ description: "Total completed orders count" })
  @Expose()
  totalOrders: number;

  @ApiProperty({ description: "Welcome bonus received" })
  @Expose()
  welcomeBonusReceived: boolean;

  @ApiProperty({ description: "First order bonus received" })
  @Expose()
  firstOrderBonusReceived: boolean;

  @ApiProperty({ description: "Current consecutive days streak" })
  @Expose()
  currentStreak: number;

  @ApiProperty({ description: "Longest streak achieved" })
  @Expose()
  longestStreak: number;

  @ApiPropertyOptional({ description: "Last order date" })
  @Expose()
  lastOrderDate?: Date;

  @ApiPropertyOptional({ description: "Referral code for this user" })
  @Expose()
  referralCode?: string;

  @ApiPropertyOptional({ description: "ID of user who referred this user" })
  @Expose()
  referredById?: string;

  @ApiProperty({
    description: "User preferences",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  preferences: {
    language?: "ru" | "uz" | "en";
    timezone?: string;
    theme?: "light" | "dark" | "system";
    notifications?: {
      email?: boolean;
      push?: boolean;
      telegram?: boolean;
      sms?: boolean;
    };
    dateFormat?: string;
    currency?: string;
  };

  // Full name computed property
  @ApiProperty({ description: "Full name (computed)" })
  @Expose()
  get fullName(): string {
    const parts = [this.lastName, this.firstName, this.patronymic].filter(
      Boolean,
    );
    return parts.join(" ");
  }

  @ApiProperty({ description: "Name initials (computed)" })
  @Expose()
  get initials(): string {
    return `${this.firstName?.charAt(0) || ""}${this.lastName?.charAt(0) || ""}`.toUpperCase();
  }

  @ApiProperty({ description: "Is user account active (computed)" })
  @Expose()
  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  // ====== EXCLUDED SENSITIVE FIELDS ======
  // NEVER expose these fields in responses
  @Exclude()
  password?: string; // Password hash

  @Exclude()
  lastLoginIp?: string; // IP address is sensitive

  @Exclude()
  lockedUntil?: Date; // Account lock details

  @Exclude()
  passwordChangedAt?: Date; // Password change history

  @Exclude()
  passwordChangedByUser?: boolean;

  @Exclude()
  ipWhitelist?: string[]; // IP whitelist is sensitive

  @Exclude()
  approvedBy?: Record<string, unknown>; // Full related entity excluded

  @Exclude()
  rejectedBy?: Record<string, unknown>; // Full related entity excluded

  @Exclude()
  rejectedById?: string; // Related user ID excluded

  @Exclude()
  referredBy?: Record<string, unknown>; // Related user excluded

  @Exclude()
  roles?: Record<string, unknown>[]; // Dynamic roles excluded in base response

  @Exclude()
  sessions?: Record<string, unknown>[]; // Sessions excluded

  @Exclude()
  twoFactorAuths?: Record<string, unknown>[]; // 2FA details excluded

  @Exclude()
  organization?: Record<string, unknown>; // Full org excluded (too much data)
}

/**
 * User Session Response DTO
 * Safe representation of UserSession for audit/admin purposes
 */
@Expose()
export class UserSessionResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "User ID" })
  @Expose()
  userId: string;

  @ApiProperty({
    description: "Device information",
    type: "object",
    additionalProperties: true,
  })
  @Expose()
  deviceInfo: {
    os?: string;
    osVersion?: string;
    browser?: string;
    browserVersion?: string;
    deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  };

  @ApiProperty({ description: "IP address used for this session" })
  @Expose()
  ipAddress: string;

  @ApiProperty({ description: "Last activity timestamp" })
  @Expose()
  lastActivityAt: Date;

  @ApiProperty({ description: "Session expiration timestamp" })
  @Expose()
  expiresAt: Date;

  @ApiProperty({ description: "Session revoked status" })
  @Expose()
  isRevoked: boolean;

  @ApiPropertyOptional({ description: "Revocation timestamp" })
  @Expose()
  revokedAt?: Date;

  @ApiPropertyOptional({ description: "Revocation reason" })
  @Expose()
  revokedReason?: string;

  @ApiProperty({ description: "Is session valid (computed)" })
  @Expose()
  get isValid(): boolean {
    return !this.isRevoked && new Date() < this.expiresAt;
  }

  @ApiProperty({ description: "Is session expired (computed)" })
  @Expose()
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // ====== EXCLUDED SENSITIVE FIELDS ======
  @Exclude()
  refreshTokenHash?: string; // Token hash is sensitive

  @Exclude()
  refreshTokenHint?: string; // Even hint is excluded

  @Exclude()
  user?: Record<string, unknown>; // Full user excluded
}

/**
 * Two-Factor Auth Response DTO
 * Safe representation of TwoFactorAuth entity
 */
@Expose()
export class TwoFactorAuthResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "User ID" })
  @Expose()
  userId: string;

  @ApiPropertyOptional({ description: "SMS phone number for 2FA" })
  @Expose()
  smsPhone?: string;

  @ApiPropertyOptional({ description: "Email for 2FA" })
  @Expose()
  emailAddress?: string;

  @ApiProperty({ description: "Failed attempts count" })
  @Expose()
  failedAttempts: number;

  @ApiPropertyOptional({ description: "Account locked until timestamp" })
  @Expose()
  lockedUntil?: Date;

  @ApiPropertyOptional({ description: "Last time 2FA was used" })
  @Expose()
  lastUsedAt?: Date;

  @ApiProperty({ description: "Has TOTP (Google Authenticator) enabled" })
  @Expose()
  get hasTotp(): boolean {
    return false; // Never expose actual status of TOTP setup
  }

  @ApiProperty({ description: "Has SMS 2FA enabled" })
  @Expose()
  get hasSms(): boolean {
    return !!this.smsPhone;
  }

  @ApiProperty({ description: "Has Email 2FA enabled" })
  @Expose()
  get hasEmail(): boolean {
    return !!this.emailAddress;
  }

  @ApiProperty({ description: "Has backup codes enabled" })
  @Expose()
  get hasBackupCodes(): boolean {
    return false; // Never expose actual backup codes status
  }

  @ApiProperty({ description: "Number of available backup codes" })
  @Expose()
  get availableBackupCodes(): number {
    return 0; // Never expose actual count
  }

  @ApiProperty({ description: "Is account locked" })
  @Expose()
  get isLocked(): boolean {
    return !!this.lockedUntil && new Date() < this.lockedUntil;
  }

  // ====== EXCLUDED SENSITIVE FIELDS ======
  @Exclude()
  totpSecret?: string; // TOTP secret must never be exposed

  @Exclude()
  totpSecretIv?: string; // IV must never be exposed

  @Exclude()
  backupCodes?: string[]; // Backup codes must NEVER be exposed

  @Exclude()
  usedBackupCodes?: string[]; // Used codes list must be excluded

  @Exclude()
  user?: Record<string, unknown>;

  @Exclude()
  metadata?: Record<string, unknown>;
}

/**
 * Access Request Response DTO
 * For user access request workflow
 */
@Expose()
export class AccessRequestResponseDto extends BaseResponseDto {
  @ApiProperty({ description: "User ID requesting access" })
  @Expose()
  userId: string;

  @ApiProperty({
    description: "Request status",
    enum: ["pending", "approved", "rejected"],
  })
  @Expose()
  status: "pending" | "approved" | "rejected";

  @ApiPropertyOptional({ description: "Requested role" })
  @Expose()
  requestedRole?: UserRole;

  @ApiPropertyOptional({ description: "Request reason" })
  @Expose()
  reason?: string;

  @ApiPropertyOptional({ description: "Approval/rejection timestamp" })
  @Expose()
  processedAt?: Date;

  @ApiPropertyOptional({ description: "ID of user who processed this request" })
  @Expose()
  processedById?: string;

  @ApiPropertyOptional({ description: "Rejection reason" })
  @Expose()
  rejectionReason?: string;

  // ====== EXCLUDED SENSITIVE FIELDS ======
  @Exclude()
  user?: Record<string, unknown>;

  @Exclude()
  processedBy?: Record<string, unknown>;
}
