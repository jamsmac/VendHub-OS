/**
 * Auth Entities
 * User sessions with device tracking and password reset tokens
 */

import { Entity, Column, Index, BeforeInsert } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// USER SESSION ENTITY
// ============================================================================

@Entity("user_sessions")
@Index(["userId"])
@Index(["isActive"])
@Index(["lastUsedAt"])
export class UserSession extends BaseEntity {
  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "text" })
  refreshTokenHash: string;

  /**
   * Token hint for fast lookup (first 16 chars of SHA-256 hash)
   * Allows O(1) index lookup before expensive bcrypt comparison
   */
  @Column({ type: "varchar", length: 16, nullable: true })
  @Index("idx_user_sessions_token_hint")
  refreshTokenHint: string | null;

  // Device information
  @Column({ type: "inet", nullable: true })
  ipAddress: string | null;

  @Column({ type: "text", nullable: true })
  userAgent: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  deviceType: string | null; // mobile, desktop, tablet

  @Column({ type: "varchar", length: 100, nullable: true })
  deviceName: string | null; // Chrome on Windows, Safari on iPhone, etc.

  @Column({ type: "varchar", length: 100, nullable: true })
  os: string | null; // Windows, macOS, iOS, Android, Linux

  @Column({ type: "varchar", length: 100, nullable: true })
  browser: string | null; // Chrome, Safari, Firefox, Edge

  // Session status
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  revokedAt: Date | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  revokedReason: string | null; // logout, security, max_sessions_exceeded

  @Column({ type: "jsonb", nullable: true, default: {} })
  metadata: Record<string, unknown>;

  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  get isValid(): boolean {
    return this.isActive && !this.isExpired && !this.revokedAt;
  }
}

// ============================================================================
// PASSWORD RESET TOKEN ENTITY
// ============================================================================

@Entity("password_reset_tokens")
@Index(["token"], { unique: true })
@Index(["userId"])
@Index(["expiresAt"])
export class PasswordResetToken extends BaseEntity {
  @Column({ type: "uuid", unique: true })
  token: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "timestamp with time zone" })
  expiresAt: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  usedAt: Date | null;

  @Column({ type: "inet", nullable: true })
  requestIp: string | null;

  @Column({ type: "text", nullable: true })
  requestUserAgent: string | null;

  @BeforeInsert()
  generateToken() {
    if (!this.token) {
      this.token = uuidv4();
    }
    if (!this.expiresAt) {
      // Default expiration: 1 hour
      this.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    }
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isUsed(): boolean {
    return this.usedAt !== null;
  }

  isTokenValid(): boolean {
    return !this.isExpired() && !this.isUsed();
  }
}
