import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Organization } from '../../organizations/entities/organization.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Loyalty levels for customer rewards program
 */
export enum LoyaltyLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

/**
 * User roles - 7 level hierarchy (optimized)
 */
export enum UserRole {
  OWNER = 'owner',           // Platform owner (full access)
  ADMIN = 'admin',           // Organization admin
  MANAGER = 'manager',       // Team manager
  OPERATOR = 'operator',     // Field operator (refill, collection, repair, cleaning)
  WAREHOUSE = 'warehouse',   // Warehouse manager
  ACCOUNTANT = 'accountant', // Accountant
  VIEWER = 'viewer',         // Read-only access
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  REJECTED = 'rejected',
  PASSWORD_CHANGE_REQUIRED = 'password_change_required',
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true, where: '"username" IS NOT NULL' })
@Index(['organizationId'])
@Index(['telegramId'], { unique: true, where: '"telegram_id" IS NOT NULL' })
@Index(['role'])
@Index(['status'])
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, unique: true })
  username: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  patronymic: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  // Telegram integration
  @Column({ nullable: true, unique: true })
  telegramId: string;

  @Column({ nullable: true })
  telegramUsername: string;

  // 2FA
  @Column({ default: false })
  twoFactorEnabled: boolean;

  // Security tracking
  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ nullable: true })
  lockedUntil: Date;

  @Column({ nullable: true })
  passwordChangedAt: Date;

  @Column({ default: false })
  mustChangePassword: boolean;

  // IP Whitelist (for extra security)
  @Column({ type: 'simple-array', nullable: true })
  ipWhitelist: string[];

  // Multi-tenant support
  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Approval workflow
  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  approvedById: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User;

  // Rejection workflow
  @Column({ nullable: true })
  rejectedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  rejectedById: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by_id' })
  rejectedBy: User;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ default: false })
  passwordChangedByUser: boolean;

  // ============================================
  // RBAC - Dynamic role assignment
  // ============================================
  @ManyToMany('Role', { eager: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: any[]; // Will be typed as Role[] after RBAC module is created

  // ============================================
  // LOYALTY PROGRAM FIELDS
  // ============================================

  /**
   * Current points balance
   */
  @Column({ type: 'int', default: 0 })
  pointsBalance: number;

  /**
   * Current loyalty level based on total earned points
   */
  @Column({
    type: 'enum',
    enum: LoyaltyLevel,
    default: LoyaltyLevel.BRONZE,
  })
  loyaltyLevel: LoyaltyLevel;

  /**
   * Total points ever earned (for level calculation)
   */
  @Column({ type: 'int', default: 0 })
  totalPointsEarned: number;

  /**
   * Total amount spent in sum
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalSpent: number;

  /**
   * Total number of completed orders
   */
  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  /**
   * Whether user has received welcome bonus
   */
  @Column({ default: false })
  welcomeBonusReceived: boolean;

  /**
   * Whether user has received first order bonus
   */
  @Column({ default: false })
  firstOrderBonusReceived: boolean;

  /**
   * Current consecutive days streak
   */
  @Column({ type: 'int', default: 0 })
  currentStreak: number;

  /**
   * Longest streak ever achieved
   */
  @Column({ type: 'int', default: 0 })
  longestStreak: number;

  /**
   * Last order date for streak calculation
   */
  @Column({ type: 'date', nullable: true })
  lastOrderDate: Date;

  /**
   * Referral code for this user
   */
  @Column({ nullable: true, unique: true })
  referralCode: string;

  /**
   * ID of user who referred this user
   */
  @Column({ nullable: true })
  referredById: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'referred_by_id' })
  referredBy: User;

  // Preferences
  @Column({ type: 'jsonb', default: {} })
  preferences: {
    language?: 'ru' | 'uz' | 'en';
    timezone?: string;
    theme?: 'light' | 'dark' | 'system';
    notifications?: {
      email?: boolean;
      push?: boolean;
      telegram?: boolean;
      sms?: boolean;
    };
    dateFormat?: string;
    currency?: string;
  };

  // Relations
  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];

  @OneToMany(() => TwoFactorAuth, (tfa) => tfa.user)
  twoFactorAuths: TwoFactorAuth[];

  // Virtual fields
  get fullName(): string {
    const parts = [this.lastName, this.firstName, this.patronymic].filter(Boolean);
    return parts.join(' ');
  }

  get initials(): string {
    return `${this.firstName?.charAt(0) || ''}${this.lastName?.charAt(0) || ''}`.toUpperCase();
  }

  get isLocked(): boolean {
    return this.lockedUntil && new Date() < this.lockedUntil;
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}

/**
 * User Session entity for tracking active sessions
 * Supports device fingerprinting and token rotation
 */
@Entity('user_sessions')
@Index(['userId'])
@Index(['refreshTokenHint'])
@Index(['expiresAt'])
export class UserSession extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  @Exclude()
  refreshTokenHash: string;

  // First 16 chars of SHA-256 for O(1) lookup
  @Column({ length: 16 })
  refreshTokenHint: string;

  // Device fingerprinting
  @Column({ type: 'jsonb', default: {} })
  deviceInfo: {
    os?: string;
    osVersion?: string;
    browser?: string;
    browserVersion?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    userAgent?: string;
  };

  @Column()
  ipAddress: string;

  @Column()
  lastActivityAt: Date;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @Column({ nullable: true })
  revokedAt: Date;

  @Column({ nullable: true })
  revokedReason: string;

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isValid(): boolean {
    return !this.isRevoked && !this.isExpired;
  }
}

/**
 * Two-Factor Authentication entity
 * Supports TOTP, SMS, Email, and Backup Codes
 */
@Entity('two_factor_auth')
@Index(['userId'], { unique: true })
export class TwoFactorAuth extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.twoFactorAuths, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // TOTP (Google Authenticator, Authy, etc.)
  @Column({ nullable: true })
  @Exclude()
  totpSecret: string; // Encrypted with AES-256-GCM

  @Column({ nullable: true })
  @Exclude()
  totpSecretIv: string;

  // SMS 2FA
  @Column({ nullable: true })
  smsPhone: string;

  // Email 2FA
  @Column({ nullable: true })
  emailAddress: string;

  // Backup codes (hashed)
  @Column({ type: 'simple-array', nullable: true })
  @Exclude()
  backupCodes: string[];

  @Column({ type: 'simple-array', nullable: true })
  usedBackupCodes: string[];

  // Security
  @Column({ default: 0 })
  failedAttempts: number;

  @Column({ nullable: true })
  lockedUntil: Date;

  @Column({ nullable: true })
  lastUsedAt: Date;

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  get isLocked(): boolean {
    return this.lockedUntil && new Date() < this.lockedUntil;
  }

  get hasTotp(): boolean {
    return !!this.totpSecret;
  }

  get hasSms(): boolean {
    return !!this.smsPhone;
  }

  get hasEmail(): boolean {
    return !!this.emailAddress;
  }

  get hasBackupCodes(): boolean {
    return this.backupCodes?.length > 0;
  }

  get availableBackupCodes(): number {
    const used = this.usedBackupCodes?.length || 0;
    const total = this.backupCodes?.length || 0;
    return total - used;
  }
}

/**
 * Password Reset Token entity
 */
@Entity('password_reset_tokens')
@Index(['token'], { unique: true })
@Index(['userId'])
@Index(['expiresAt'])
export class PasswordResetToken extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  @Exclude()
  token: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  usedAt: Date;

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isUsed(): boolean {
    return !!this.usedAt;
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isUsed;
  }
}

/**
 * Login Attempt tracking for security
 */
@Entity('login_attempts')
@Index(['email'])
@Index(['ipAddress'])
export class LoginAttempt extends BaseEntity {
  @Column()
  email: string;

  @Column()
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column()
  success: boolean;

  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  userId: string;
}

/**
 * Access Request for user approval workflow
 */
@Entity('access_requests')
@Index(['userId'], { unique: true })
@Index(['status'])
export class AccessRequest extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ nullable: true })
  requestedRole: UserRole;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  processedAt: Date;

  @Column({ nullable: true })
  processedById: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processed_by_id' })
  processedBy: User;

  @Column({ nullable: true })
  rejectionReason: string;
}
