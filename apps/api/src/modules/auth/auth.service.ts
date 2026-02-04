import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

import {
  User,
  UserSession,
  TwoFactorAuth,
  PasswordResetToken,
  LoginAttempt,
  UserRole,
  UserStatus,
} from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { v4 as uuidv4 } from 'uuid';

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  sessionId: string;
  jti: string;
}

interface DeviceInfo {
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;
  private readonly SESSION_DURATION_DAYS = 7;
  private readonly TOTP_WINDOW = 1;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    @InjectRepository(TwoFactorAuth)
    private readonly twoFactorRepository: Repository<TwoFactorAuth>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetRepository: Repository<PasswordResetToken>,
    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly passwordPolicyService: PasswordPolicyService,
  ) {
    // Configure TOTP
    authenticator.options = {
      window: this.TOTP_WINDOW,
    };
  }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto, ipAddress: string) {
    // Check if email exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Validate password policy
    const policyResult = this.passwordPolicyService.validate(dto.password, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    if (!policyResult.valid) {
      throw new BadRequestException(policyResult.errors);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: UserRole.VIEWER,
      status: UserStatus.PENDING,
      preferences: {
        language: 'ru',
        timezone: 'Asia/Tashkent',
        theme: 'system',
        notifications: {
          email: true,
          push: true,
          telegram: true,
          sms: false,
        },
      },
    });

    await this.userRepository.save(user);

    // Log registration attempt
    await this.logLoginAttempt(dto.email, ipAddress, '', true, user.id);

    return {
      message: 'Registration successful. Waiting for approval.',
      userId: user.id,
    };
  }

  /**
   * Login user
   */
  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    const email = dto.email.toLowerCase();

    // Check login attempts
    const recentAttempts = await this.getRecentFailedAttempts(email, ipAddress);
    if (recentAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenException(
        `Too many failed attempts. Try again in ${this.LOCKOUT_DURATION_MINUTES} minutes.`,
      );
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (!user) {
      await this.logLoginAttempt(email, ipAddress, userAgent, false, undefined, 'User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if locked
    if (user.isLocked) {
      await this.logLoginAttempt(email, ipAddress, userAgent, false, user.id, 'Account locked');
      throw new ForbiddenException('Account is locked. Try again later.');
    }

    // Check status
    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException('Account is pending approval');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts += 1;

      // Lock if too many attempts
      if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000);
      }

      await this.userRepository.save(user);
      await this.logLoginAttempt(email, ipAddress, userAgent, false, user.id, 'Invalid password');

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check IP whitelist if configured
    if (user.ipWhitelist?.length > 0 && !user.ipWhitelist.includes(ipAddress)) {
      await this.logLoginAttempt(email, ipAddress, userAgent, false, user.id, 'IP not whitelisted');
      throw new ForbiddenException('Access denied from this IP address');
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      if (!dto.totpCode && !dto.backupCode) {
        return {
          requiresTwoFactor: true,
          userId: user.id,
          methods: await this.getAvailable2FAMethods(user.id),
        };
      }

      // Verify 2FA
      const isValid = await this.verify2FA(user.id, dto.totpCode, dto.backupCode);
      if (!isValid) {
        await this.logLoginAttempt(email, ipAddress, userAgent, false, user.id, 'Invalid 2FA code');
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockedUntil = undefined as unknown as Date;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await this.userRepository.save(user);

    // Parse device info
    const deviceInfo = this.parseUserAgent(userAgent);

    // Create session
    const session = await this.createSession(user, ipAddress, deviceInfo);

    // Generate tokens
    const tokens = await this.generateTokens(user, session.id);

    // Log successful login
    await this.logLoginAttempt(email, ipAddress, userAgent, true, user.id);

    return {
      user: this.sanitizeUser(user),
      tokens,
      sessionId: session.id,
      mustChangePassword: user.mustChangePassword,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto, ipAddress: string) {
    // Find session by token hint (first 16 chars of SHA-256)
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const tokenHint = tokenHash.substring(0, 16);

    const session = await this.sessionRepository.findOne({
      where: {
        refreshTokenHint: tokenHint,
        isRevoked: false,
      },
      relations: ['user', 'user.organization'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify full token hash
    if (session.refreshTokenHash !== tokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check expiration
    if (session.isExpired) {
      await this.revokeSession(session.id, 'Token expired');
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check user status
    if (!session.user.isActive) {
      await this.revokeSession(session.id, 'User inactive');
      throw new ForbiddenException('Account is not active');
    }

    // Update session
    session.lastActivityAt = new Date();
    session.ipAddress = ipAddress;

    // Rotate refresh token
    const newRefreshToken = this.generateRefreshToken();
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    session.refreshTokenHash = newTokenHash;
    session.refreshTokenHint = newTokenHash.substring(0, 16);
    session.expiresAt = new Date(Date.now() + this.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await this.sessionRepository.save(session);

    // Generate new access token
    const tokens = await this.generateTokens(session.user, session.id, newRefreshToken);

    return {
      user: this.sanitizeUser(session.user),
      tokens,
      sessionId: session.id,
    };
  }

  /**
   * Logout (revoke session)
   */
  async logout(sessionId: string, jti?: string) {
    await this.revokeSession(sessionId, 'User logout');
    if (jti) {
      await this.tokenBlacklistService.blacklist(jti, 15 * 60); // 15 min access token TTL
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string) {
    await this.sessionRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date(), revokedReason: 'Logout from all devices' },
    );
    return { message: 'Logged out from all devices' };
  }

  /**
   * Get active sessions for user
   */
  async getSessions(userId: string) {
    const sessions = await this.sessionRepository.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { lastActivityAt: 'DESC' },
    });

    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      lastActivityAt: s.lastActivityAt,
      createdAt: s.created_at,
    }));
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string, reason: string = 'Manual revocation') {
    await this.sessionRepository.update(
      { id: sessionId },
      { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
    );
  }

  // ==================== 2FA Methods ====================

  /**
   * Setup TOTP 2FA
   */
  async setupTotp(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate QR code
    const otpauth = authenticator.keyuri(user.email, 'VendHub OS', secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Encrypt secret
    const { encrypted, iv } = this.encryptTotpSecret(secret);

    // Save or update 2FA record
    let twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });

    if (twoFactor) {
      twoFactor.totpSecret = encrypted;
      twoFactor.totpSecretIv = iv;
      twoFactor.backupCodes = hashedBackupCodes;
      twoFactor.usedBackupCodes = [];
    } else {
      twoFactor = this.twoFactorRepository.create({
        userId,
        totpSecret: encrypted,
        totpSecretIv: iv,
        backupCodes: hashedBackupCodes,
        usedBackupCodes: [],
      });
    }

    await this.twoFactorRepository.save(twoFactor);

    return { secret, qrCode, backupCodes };
  }

  /**
   * Verify and enable TOTP
   */
  async verifyAndEnableTotp(userId: string, code: string) {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });
    if (!twoFactor?.totpSecret) {
      throw new BadRequestException('TOTP not set up');
    }

    // Decrypt and verify
    const secret = this.decryptTotpSecret(twoFactor.totpSecret, twoFactor.totpSecretIv);
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Enable 2FA on user
    await this.userRepository.update(userId, { twoFactorEnabled: true });

    return { message: '2FA enabled successfully' };
  }

  /**
   * Regenerate backup codes for user
   */
  async regenerateBackupCodes(userId: string): Promise<{ backupCodes: string[] }> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });
    if (!twoFactor) {
      throw new BadRequestException('2FA not enabled');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Update record
    twoFactor.backupCodes = hashedBackupCodes;
    twoFactor.usedBackupCodes = [];
    await this.twoFactorRepository.save(twoFactor);

    return { backupCodes };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, password: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Disable 2FA
    await this.userRepository.update(userId, { twoFactorEnabled: false });
    await this.twoFactorRepository.delete({ userId });

    return { message: '2FA disabled successfully' };
  }

  /**
   * Verify 2FA code (TOTP or backup)
   */
  private async verify2FA(userId: string, totpCode?: string, backupCode?: string): Promise<boolean> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });
    if (!twoFactor) {
      return false;
    }

    // Check if locked
    if (twoFactor.isLocked) {
      return false;
    }

    // Try TOTP first
    if (totpCode && twoFactor.totpSecret) {
      const secret = this.decryptTotpSecret(twoFactor.totpSecret, twoFactor.totpSecretIv);
      const isValid = authenticator.verify({ token: totpCode, secret });

      if (isValid) {
        twoFactor.lastUsedAt = new Date();
        twoFactor.failedAttempts = 0;
        await this.twoFactorRepository.save(twoFactor);
        return true;
      }
    }

    // Try backup code
    if (backupCode && twoFactor.backupCodes?.length > 0) {
      for (const hashedCode of twoFactor.backupCodes) {
        const isValid = await bcrypt.compare(backupCode, hashedCode);
        if (isValid && !twoFactor.usedBackupCodes?.includes(hashedCode)) {
          twoFactor.usedBackupCodes = [...(twoFactor.usedBackupCodes || []), hashedCode];
          twoFactor.lastUsedAt = new Date();
          twoFactor.failedAttempts = 0;
          await this.twoFactorRepository.save(twoFactor);
          return true;
        }
      }
    }

    // Increment failed attempts
    twoFactor.failedAttempts += 1;
    if (twoFactor.failedAttempts >= 5) {
      twoFactor.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    }
    await this.twoFactorRepository.save(twoFactor);

    return false;
  }

  /**
   * Get available 2FA methods for user
   */
  private async getAvailable2FAMethods(userId: string): Promise<string[]> {
    const twoFactor = await this.twoFactorRepository.findOne({ where: { userId } });
    if (!twoFactor) return [];

    const methods: string[] = [];
    if (twoFactor.hasTotp) methods.push('totp');
    if (twoFactor.hasSms) methods.push('sms');
    if (twoFactor.hasEmail) methods.push('email');
    if (twoFactor.hasBackupCodes) methods.push('backup');

    return methods;
  }

  // ==================== Password Reset ====================

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string, ipAddress: string) {
    const user = await this.userRepository.findOne({ where: { email: email.toLowerCase() } });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If email exists, reset instructions will be sent' };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Create reset token (expires in 1 hour)
    const resetToken = this.passwordResetRepository.create({
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ipAddress,
    });

    await this.passwordResetRepository.save(resetToken);

    // Build reset link
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://vendhub.uz');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

    // Send email with reset link
    try {
      await this.sendPasswordResetEmail(user.email, user.firstName || user.username, resetLink);
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${user.email}`, error);
      // Don't expose email sending failure to user (security)
    }

    return { message: 'If email exists, reset instructions will be sent' };
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(email: string, name: string, resetLink: string) {
    // Use EventEmitter to send email asynchronously
    this.eventEmitter.emit('email.send', {
      to: email,
      template: 'password-reset',
      subject: 'Сброс пароля VendHub',
      context: {
        name,
        resetLink,
        expiresIn: '1 час',
        supportEmail: this.configService.get('SUPPORT_EMAIL', 'support@vendhub.uz'),
      },
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string, _ipAddress: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await this.passwordResetRepository.findOne({
      where: { token: hashedToken },
      relations: ['user'],
    });

    if (!resetToken || !resetToken.isValid) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate password policy
    const policyResult = this.passwordPolicyService.validate(newPassword, {
      email: resetToken.user.email,
      firstName: resetToken.user.firstName,
      lastName: resetToken.user.lastName,
    });
    if (!policyResult.valid) {
      throw new BadRequestException(policyResult.errors);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await this.userRepository.update(resetToken.userId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      loginAttempts: 0,
      lockedUntil: undefined as unknown as Date,
    });

    // Mark token as used
    resetToken.usedAt = new Date();
    await this.passwordResetRepository.save(resetToken);

    // Revoke all sessions
    await this.logoutAll(resetToken.userId);

    return { message: 'Password reset successfully' };
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid current password');
    }

    // Validate new password policy
    const policyResult = this.passwordPolicyService.validate(newPassword, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    if (!policyResult.valid) {
      throw new BadRequestException(policyResult.errors);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.userRepository.update(userId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
    });

    // Blacklist all tokens for this user
    const refreshTtl = this.SESSION_DURATION_DAYS * 24 * 60 * 60;
    await this.tokenBlacklistService.blacklistAllForUser(userId, refreshTtl);

    // Revoke all sessions except current
    await this.logoutAll(userId);

    return { message: 'Password changed successfully' };
  }

  getPasswordRequirements() {
    return this.passwordPolicyService.getRequirements();
  }

  // ==================== Helper Methods ====================

  private async createSession(user: User, ipAddress: string, deviceInfo: DeviceInfo): Promise<UserSession> {
    const refreshToken = this.generateRefreshToken();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const session = this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: tokenHash,
      refreshTokenHint: tokenHash.substring(0, 16),
      deviceInfo,
      ipAddress,
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000),
    });

    return this.sessionRepository.save(session);
  }

  private async generateTokens(user: User, sessionId: string, refreshToken?: string) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      sessionId,
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES', '15m'),
    });

    if (!refreshToken) {
      refreshToken = this.generateRefreshToken();
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      await this.sessionRepository.update(sessionId, {
        refreshTokenHash: tokenHash,
        refreshTokenHint: tokenHash.substring(0, 16),
      });
    }

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresIn: 15 * 60, // 15 minutes in seconds
      refreshTokenExpiresIn: this.SESSION_DURATION_DAYS * 24 * 60 * 60,
    };
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private encryptTotpSecret(secret: string): { encrypted: string; iv: string } {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encrypted: encrypted + ':' + authTag,
      iv: iv.toString('hex'),
    };
  }

  private decryptTotpSecret(encryptedData: string, ivHex: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const [encrypted, authTag] = encryptedData.split(':');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private getEncryptionKey(): Buffer {
    const keyHex = this.configService.get('ENCRYPTION_KEY');
    const nodeEnv = this.configService.get('NODE_ENV');

    if (!keyHex || keyHex.length !== 64) {
      // SECURITY: In production, encryption key MUST be set
      if (nodeEnv === 'production') {
        throw new Error(
          'CRITICAL: ENCRYPTION_KEY must be set in production. ' +
          'Generate with: openssl rand -hex 32',
        );
      }

      // Development only: use derived key with warning
      this.logger.warn(
        '⚠️  ENCRYPTION_KEY not set - using development fallback. ' +
        'DO NOT use in production!',
      );
      return crypto.scryptSync('vendhub-dev-key-unsafe', 'vendhub-salt', 32);
    }

    return Buffer.from(keyHex, 'hex');
  }

  private parseUserAgent(userAgent: string): DeviceInfo {
    const info: DeviceInfo = {
      userAgent,
      deviceType: 'unknown',
    };

    if (/mobile/i.test(userAgent)) {
      info.deviceType = 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      info.deviceType = 'tablet';
    } else {
      info.deviceType = 'desktop';
    }

    if (/windows/i.test(userAgent)) info.os = 'Windows';
    else if (/macintosh|mac os/i.test(userAgent)) info.os = 'macOS';
    else if (/linux/i.test(userAgent)) info.os = 'Linux';
    else if (/android/i.test(userAgent)) info.os = 'Android';
    else if (/iphone|ipad/i.test(userAgent)) info.os = 'iOS';

    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) info.browser = 'Chrome';
    else if (/firefox/i.test(userAgent)) info.browser = 'Firefox';
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) info.browser = 'Safari';
    else if (/edge/i.test(userAgent)) info.browser = 'Edge';

    return info;
  }

  private async getRecentFailedAttempts(email: string, ipAddress: string): Promise<number> {
    const since = new Date(Date.now() - this.LOCKOUT_DURATION_MINUTES * 60 * 1000);

    return this.loginAttemptRepository.count({
      where: [
        { email, success: false, created_at: MoreThan(since) },
        { ipAddress, success: false, created_at: MoreThan(since) },
      ],
    });
  }

  private async logLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    userId?: string,
    failureReason?: string,
  ) {
    const attempt = this.loginAttemptRepository.create({
      email,
      ipAddress,
      userAgent,
      success,
      userId,
      failureReason,
    });
    await this.loginAttemptRepository.save(attempt);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            slug: user.organization.slug,
            logo: user.organization.logo,
          }
        : null,
      preferences: user.preferences,
      createdAt: user.created_at,
    };
  }
}
