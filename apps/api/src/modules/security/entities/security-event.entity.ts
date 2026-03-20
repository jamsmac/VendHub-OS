import { Entity, Column, Index, Unique } from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BaseEntity } from "../../../common/entities/base.entity";

// ============================================================================
// SECURITY EVENT ENUMS
// ============================================================================

export enum SecurityEventType {
  LOGIN_SUCCESS = "login_success",
  LOGIN_FAILED = "login_failed",
  LOGIN_LOCKED = "login_locked",
  LOGOUT = "logout",
  LOGOUT_ALL = "logout_all",
  TOKEN_REFRESH = "token_refresh",
  TOKEN_BLACKLISTED = "token_blacklisted",
  PASSWORD_CHANGED = "password_changed",
  PASSWORD_RESET_REQUESTED = "password_reset_requested",
  PASSWORD_RESET_COMPLETED = "password_reset_completed",
  TWO_FACTOR_ENABLED = "two_factor_enabled",
  TWO_FACTOR_DISABLED = "two_factor_disabled",
  TWO_FACTOR_FAILED = "two_factor_failed",
  ACCOUNT_CREATED = "account_created",
  ACCOUNT_APPROVED = "account_approved",
  ACCOUNT_REJECTED = "account_rejected",
  ACCOUNT_SUSPENDED = "account_suspended",
  ACCOUNT_REACTIVATED = "account_reactivated",
  ROLE_CHANGED = "role_changed",
  PERMISSION_CHANGED = "permission_changed",
  SUSPICIOUS_ACTIVITY = "suspicious_activity",
}

export enum SecuritySeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

@Entity("security_events")
@Index(["userId"])
@Index(["organizationId"])
@Index(["eventType"])
@Index(["severity"])
@Index(["ipAddress"])
@Index(["createdAt"])
export class SecurityEvent extends BaseEntity {
  @ApiProperty({ enum: SecurityEventType })
  @Column({ type: "enum", enum: SecurityEventType })
  eventType: SecurityEventType;

  @ApiProperty({ enum: SecuritySeverity })
  @Column({
    type: "enum",
    enum: SecuritySeverity,
    default: SecuritySeverity.LOW,
  })
  severity: SecuritySeverity;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  userId: string;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  organizationId: string;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string;

  @ApiPropertyOptional()
  @Column({ type: "text", nullable: true })
  userAgent: string;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 255, nullable: true })
  resource: string;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  resourceId: string;

  @ApiProperty()
  @Column({ type: "text" })
  description: string;

  @ApiPropertyOptional()
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown>;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 255, nullable: true })
  sessionId: string;

  @ApiProperty()
  @Column({ type: "boolean", default: false })
  isResolved: boolean;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  resolvedById: string;

  @ApiPropertyOptional()
  @Column({ type: "timestamp with time zone", nullable: true })
  resolvedAt: Date;

  @ApiPropertyOptional()
  @Column({ type: "text", nullable: true })
  resolutionNotes: string;
}

// Audit enums — canonical source is audit module
import {
  AuditEventType,
  AuditSeverity,
  AuditAction,
} from "../../audit/entities/audit.entity";
export { AuditEventType, AuditSeverity, AuditAction };

export enum AuditEntity {
  USER = "user",
  MACHINE = "machine",
  TASK = "task",
  INVENTORY = "inventory",
  TRANSACTION = "transaction",
  COMPLAINT = "complaint",
  INCIDENT = "incident",
  WAREHOUSE = "warehouse",
  EMPLOYEE = "employee",
  INTEGRATION = "integration",
  SETTING = "setting",
}

// ============================================================================
// AUDIT LOG ENTITY
// ============================================================================

// DUPLICATE: @Entity("audit_logs")
@Index(["eventType"])
@Index(["userId"])
@Index(["organizationId"])
@Index(["createdAt"])
@Index(["severity"])
@Index(["ipAddress"])
export class AuditLog extends BaseEntity {
  @ApiProperty({ enum: AuditEventType })
  @Column({ type: "enum", enum: AuditEventType })
  eventType: AuditEventType;

  @ApiProperty({ enum: AuditSeverity })
  @Column({
    type: "enum",
    enum: AuditSeverity,
    default: AuditSeverity.INFO,
  })
  severity: AuditSeverity;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  organizationId: string | null;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  userId: string | null;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  targetUserId: string | null;

  @ApiPropertyOptional()
  @Column({ type: "inet", nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional()
  @Column({ type: "text", nullable: true })
  userAgent: string | null;

  @ApiPropertyOptional()
  @Column({ type: "text", nullable: true })
  description: string | null;

  @ApiProperty()
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;

  @ApiProperty()
  @Column({ type: "boolean", default: true })
  success: boolean;

  @ApiPropertyOptional()
  @Column({ type: "text", nullable: true })
  errorMessage: string | null;
}

// ============================================================================
// SESSION LOG ENUMS
// ============================================================================

export enum SessionStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
  LOGGED_OUT = "logged_out",
}

// ============================================================================
// SESSION LOG ENTITY
// ============================================================================

@Entity("session_logs")
@Index(["userId", "status"])
@Index(["sessionId"])
@Index(["organizationId"])
@Index(["createdAt"])
export class SessionLog extends BaseEntity {
  @ApiProperty()
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty()
  @Column({ type: "uuid" })
  userId: string;

  @ApiProperty()
  @Column({ type: "varchar", length: 100, unique: true })
  sessionId: string;

  @ApiProperty()
  @Column({ type: "varchar", length: 100 })
  ipAddress: string;

  @ApiPropertyOptional()
  @Column({ type: "text", nullable: true })
  userAgent: string | null;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 100, nullable: true })
  deviceType: string | null;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 100, nullable: true })
  browser: string | null;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 100, nullable: true })
  os: string | null;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 100, nullable: true })
  location: string | null;

  @ApiProperty({ enum: SessionStatus })
  @Column({ type: "enum", enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @ApiProperty()
  @Column({ type: "timestamp with time zone" })
  loggedInAt: Date;

  @ApiPropertyOptional()
  @Column({ type: "timestamp with time zone", nullable: true })
  loggedOutAt: Date | null;

  @ApiPropertyOptional()
  @Column({ type: "timestamp with time zone", nullable: true })
  expiresAt: Date | null;

  @ApiPropertyOptional()
  @Column({ type: "timestamp with time zone", nullable: true })
  lastActivityAt: Date | null;

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  actionsCount: number;

  @ApiProperty()
  @Column({ type: "boolean", default: false })
  isSuspicious: boolean;

  @ApiPropertyOptional()
  @Column({ type: "text", nullable: true })
  revokeReason: string | null;

  @ApiPropertyOptional()
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// TWO FACTOR AUTH ENUMS
// ============================================================================

export enum TwoFactorMethod {
  TOTP = "totp",
  SMS = "sms",
  EMAIL = "email",
  BACKUP_CODES = "backup_codes",
}

// ============================================================================
// TWO FACTOR AUTH ENTITY
// ============================================================================

// DUPLICATE: @Entity("two_factor_auth")
@Index(["userId"])
@Unique(["userId"])
export class TwoFactorAuth extends BaseEntity {
  @ApiProperty()
  @Column({ type: "uuid" })
  userId: string;

  @ApiProperty({ enum: TwoFactorMethod })
  @Column({ type: "enum", enum: TwoFactorMethod })
  method: TwoFactorMethod;

  @ApiProperty()
  @Column({ type: "boolean", default: false })
  isEnabled: boolean;

  @ApiProperty()
  @Column({ type: "boolean", default: false })
  isVerified: boolean;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 500, nullable: true })
  secret: string | null;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 50, nullable: true })
  phoneNumber: string | null;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 200, nullable: true })
  email: string | null;

  @ApiProperty()
  @Column({ type: "jsonb", default: [] })
  backupCodes: string[];

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  backupCodesUsed: number;

  @ApiPropertyOptional()
  @Column({ type: "timestamp with time zone", nullable: true })
  enabledAt: Date | null;

  @ApiPropertyOptional()
  @Column({ type: "timestamp with time zone", nullable: true })
  lastUsedAt: Date | null;

  @ApiProperty()
  @Column({ type: "integer", default: 0 })
  failedAttempts: number;

  @ApiPropertyOptional()
  @Column({ type: "timestamp with time zone", nullable: true })
  lockedUntil: Date | null;

  @ApiPropertyOptional()
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}

// ============================================================================
// ACCESS CONTROL LOG ENUMS
// ============================================================================

export enum AccessDecision {
  ALLOW = "allow",
  DENY = "deny",
}

export enum AccessType {
  READ = "read",
  WRITE = "write",
  DELETE = "delete",
  EXECUTE = "execute",
}

// ============================================================================
// ACCESS CONTROL LOG ENTITY
// ============================================================================

@Entity("access_control_logs")
@Index(["userId", "createdAt"])
@Index(["organizationId"])
@Index(["resourceType", "decision"])
export class AccessControlLog extends BaseEntity {
  @ApiProperty()
  @Column({ type: "uuid" })
  organizationId: string;

  @ApiProperty()
  @Column({ type: "uuid" })
  userId: string;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 200, nullable: true })
  userEmail: string | null;

  @ApiProperty()
  @Column({ type: "varchar", length: 100 })
  resourceType: string;

  @ApiPropertyOptional()
  @Column({ type: "uuid", nullable: true })
  resourceId: string | null;

  @ApiProperty({ enum: AccessType })
  @Column({ type: "enum", enum: AccessType })
  accessType: AccessType;

  @ApiProperty({ enum: AccessDecision })
  @Column({ type: "enum", enum: AccessDecision })
  decision: AccessDecision;

  @ApiPropertyOptional()
  @Column({ type: "text", nullable: true })
  reason: string | null;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 100, nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 500, nullable: true })
  endpoint: string | null;

  @ApiPropertyOptional()
  @Column({ type: "varchar", length: 20, nullable: true })
  httpMethod: string | null;

  @ApiProperty()
  @Column({ type: "jsonb", default: [] })
  userPermissions: string[];

  @ApiProperty()
  @Column({ type: "jsonb", default: [] })
  requiredPermissions: string[];

  @ApiPropertyOptional()
  @Column({ type: "jsonb", default: {} })
  metadata: Record<string, unknown>;
}
