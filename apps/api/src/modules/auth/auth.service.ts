import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository, MoreThan } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron } from "@nestjs/schedule";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

import {
  User,
  UserSession,
  PasswordResetToken,
  LoginAttempt,
  UserRole,
  UserStatus,
} from "../users/entities/user.entity";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { TokenBlacklistService } from "./services/token-blacklist.service";
import { TwoFactorService } from "./services/two-factor.service";
import { AuthSessionService } from "./services/auth-session.service";
import { PasswordPolicyService } from "./services/password-policy.service";
import { InvitesService } from "../invites/invites.service";
import { RegisterWithInviteDto } from "./dto/register-with-invite.dto";
import { v4 as uuidv4 } from "uuid";
import { MetricsService } from "../metrics/metrics.service";

interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  sessionId: string;
  jti: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MINUTES = 30;
  private readonly SESSION_DURATION_DAYS = 7;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetRepository: Repository<PasswordResetToken>,
    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly invitesService: InvitesService,
    private readonly twoFactorService: TwoFactorService,
    private readonly authSessionService: AuthSessionService,
    private readonly metricsService: MetricsService,
  ) {}

  // ==================== Challenge Token (prevents IDOR in 2FA/first-login) ====================

  /**
   * Issue a short-lived signed challenge token for 2FA or first-login flows.
   * Replaces exposing raw userId in @Public() endpoints.
   */
  private issueChallengeToken(
    userId: string,
    purpose: "2fa" | "first_login",
  ): string {
    return this.jwtService.sign(
      { sub: userId, purpose },
      {
        secret: this.configService.get<string>("JWT_SECRET"),
        expiresIn: "5m",
      },
    );
  }

  /**
   * Verify a challenge token and return the userId if valid.
   */
  private verifyChallengeToken(
    token: string,
    expectedPurpose: "2fa" | "first_login",
  ): string {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });
      if (payload.purpose !== expectedPurpose) {
        throw new UnauthorizedException("Invalid challenge token purpose");
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException("Invalid or expired challenge token");
    }
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
      throw new ConflictException("Email already registered");
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
        language: "ru",
        timezone: "Asia/Tashkent",
        theme: "system",
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
    await this.logLoginAttempt(dto.email, ipAddress, "", true, user.id);

    return {
      message: "Registration successful. Waiting for approval.",
      userId: user.id,
    };
  }

  /**
   * Register via invite code + Telegram auth (or email/password fallback).
   * Atomic transaction: verify invite -> create user -> claim invite.
   */
  async registerWithInvite(
    dto: RegisterWithInviteDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Validate the invite (throws if invalid/expired/used)
    const invite = await this.invitesService.validateInvite(dto.inviteCode);

    let telegramId: string | undefined;
    let telegramUsername: string | undefined;

    // 2. If Telegram auth provided, verify HMAC signature
    if (dto.telegramData) {
      const tgUser = this.verifyTelegramData(dto.telegramData);
      telegramId = String(tgUser.id);
      telegramUsername = tgUser.username;

      // Check if Telegram account is already linked
      const existingTg = await this.userRepository.findOne({
        where: { telegramId },
      });
      if (existingTg) {
        throw new ConflictException(
          "This Telegram account is already linked to another user",
        );
      }
    }

    // 3. If email/password registration
    if (dto.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (existingEmail) {
        throw new ConflictException("Email already registered");
      }
    }

    // Must have either Telegram auth or email+password
    if (!dto.telegramData && (!dto.email || !dto.password)) {
      throw new BadRequestException(
        "Either Telegram authentication or email + password is required",
      );
    }

    // 4. Hash password if provided
    let hashedPassword: string | undefined;
    if (dto.password) {
      const policyResult = this.passwordPolicyService.validate(dto.password, {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      });
      if (!policyResult.valid) {
        throw new BadRequestException(policyResult.errors);
      }
      hashedPassword = await bcrypt.hash(dto.password, 12);
    }

    // 5. Create user
    const user = this.userRepository.create({
      email: dto.email?.toLowerCase(),
      password: hashedPassword ?? "",
      firstName: dto.firstName,
      lastName: dto.lastName,
      telegramId,
      telegramUsername,
      role: invite.role,
      status: UserStatus.ACTIVE,
      organizationId: invite.organizationId,
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
      preferences: {
        language: "ru",
        timezone: "Asia/Tashkent",
        theme: "system",
        notifications: {
          email: true,
          push: true,
          telegram: true,
          sms: false,
        },
      },
    });

    await this.userRepository.save(user);

    // 6. Claim the invite (pessimistic lock)
    await this.invitesService.claimInvite(dto.inviteCode, user.id);

    // 7. Create session & generate tokens
    const deviceInfo = this.authSessionService.parseUserAgent(userAgent);
    const session = await this.authSessionService.createSession(
      user,
      ipAddress,
      deviceInfo,
    );
    const tokens = await this.generateTokens(user, session.id);

    this.logger.log(
      `Invite registration: user ${user.id} (role: ${invite.role}, invite: ${dto.inviteCode})`,
    );

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      sessionId: session.id,
    };
  }

  /**
   * Verify Telegram initData HMAC signature (supports both Mini App and Login Widget format).
   */
  private verifyTelegramData(initData: string): {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  } {
    const botToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      throw new InternalServerErrorException(
        "Telegram bot token not configured",
      );
    }

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      throw new UnauthorizedException("Missing hash in Telegram data");
    }

    params.delete("hash");
    const checkArr: string[] = [];
    params.forEach((value, key) => checkArr.push(`${key}=${value}`));
    checkArr.sort();
    const checkString = checkArr.join("\n");

    // HMAC-SHA256(checkString, HMAC-SHA256("WebAppData", botToken))
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(checkString)
      .digest("hex");

    if (computedHash !== hash) {
      throw new UnauthorizedException("Invalid Telegram signature");
    }

    const authDate = Number(params.get("auth_date") || 0);
    if (Date.now() / 1000 - authDate > 60) {
      throw new UnauthorizedException("Telegram auth data has expired");
    }

    const userJson = params.get("user");
    if (!userJson) {
      throw new UnauthorizedException("Missing user data in Telegram data");
    }

    return JSON.parse(userJson);
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
      relations: ["organization"],
    });

    if (!user) {
      await this.logLoginAttempt(
        email,
        ipAddress,
        userAgent,
        false,
        undefined,
        "User not found",
      );
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check if locked
    if (user.isLocked) {
      await this.logLoginAttempt(
        email,
        ipAddress,
        userAgent,
        false,
        user.id,
        "Account locked",
      );
      throw new ForbiddenException("Account is locked. Try again later.");
    }

    // Check status
    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException("Account is pending approval");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException("Account is suspended");
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException("Account is inactive");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      // Increment login attempts
      user.loginAttempts += 1;

      // Lock if too many attempts
      if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(
          Date.now() + this.LOCKOUT_DURATION_MINUTES * 60 * 1000,
        );
      }

      await this.userRepository.save(user);
      await this.logLoginAttempt(
        email,
        ipAddress,
        userAgent,
        false,
        user.id,
        "Invalid password",
      );
      this.metricsService.authLoginTotal.inc({ result: "failed" });

      throw new UnauthorizedException("Invalid credentials");
    }

    // Check IP whitelist if configured
    if (user.ipWhitelist?.length > 0 && !user.ipWhitelist.includes(ipAddress)) {
      await this.logLoginAttempt(
        email,
        ipAddress,
        userAgent,
        false,
        user.id,
        "IP not whitelisted",
      );
      throw new ForbiddenException("Access denied from this IP address");
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      if (!dto.totpCode && !dto.backupCode) {
        return {
          requiresTwoFactor: true,
          challengeToken: this.issueChallengeToken(user.id, "2fa"),
          methods: await this.twoFactorService.getAvailable2FAMethods(user.id),
        };
      }

      // Verify 2FA
      const isValid = await this.twoFactorService.verify2FA(
        user.id,
        dto.totpCode,
        dto.backupCode,
      );
      if (!isValid) {
        await this.logLoginAttempt(
          email,
          ipAddress,
          userAgent,
          false,
          user.id,
          "Invalid 2FA code",
        );
        throw new UnauthorizedException("Invalid two-factor code");
      }
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockedUntil = undefined as unknown as Date;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await this.userRepository.save(user);

    // Parse device info
    const deviceInfo = this.authSessionService.parseUserAgent(userAgent);

    // Create session
    const session = await this.authSessionService.createSession(
      user,
      ipAddress,
      deviceInfo,
    );

    // Generate tokens
    const tokens = await this.generateTokens(user, session.id);

    // Log successful login
    await this.logLoginAttempt(email, ipAddress, userAgent, true, user.id);
    this.metricsService.authLoginTotal.inc({ result: "success" });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      sessionId: session.id,
      mustChangePassword: user.mustChangePassword,
      ...(user.mustChangePassword && {
        challengeToken: this.issueChallengeToken(user.id, "first_login"),
      }),
    };
  }

  /**
   * Login via Telegram WebApp initData
   * Verifies HMAC-SHA256 signature per https://core.telegram.org/bots/webapps#validating-data
   */
  async loginTelegram(initData: string, ipAddress: string, userAgent: string) {
    const botToken = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      throw new InternalServerErrorException(
        "Telegram bot token is not configured",
      );
    }

    // Parse initData (URL-encoded query string)
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      throw new UnauthorizedException("Missing hash in Telegram initData");
    }

    // Build check string: sort params (except hash), join with \n
    params.delete("hash");
    const checkArr: string[] = [];
    params.forEach((value, key) => checkArr.push(`${key}=${value}`));
    checkArr.sort();
    const checkString = checkArr.join("\n");

    // Verify signature: HMAC-SHA256(checkString, HMAC-SHA256("WebAppData", botToken))
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(checkString)
      .digest("hex");

    if (computedHash !== hash) {
      throw new UnauthorizedException("Invalid Telegram signature");
    }

    // Check auth_date freshness (allow up to 60 seconds)
    const authDate = Number(params.get("auth_date") || 0);
    if (Date.now() / 1000 - authDate > 60) {
      throw new UnauthorizedException("Telegram auth data has expired");
    }

    // Extract user info
    const userJson = params.get("user");
    if (!userJson) {
      throw new UnauthorizedException("Missing user data in Telegram initData");
    }
    const tgUser = JSON.parse(userJson) as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };

    const telegramId = String(tgUser.id);

    // Find user by telegramId
    let user = await this.userRepository.findOne({
      where: { telegramId },
    });

    if (!user) {
      throw new UnauthorizedException(
        "No account linked to this Telegram ID. Please contact your administrator.",
      );
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException("Account is suspended");
    }

    // Update last login info + telegram username
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    if (tgUser.username) {
      user.telegramUsername = tgUser.username;
    }
    await this.userRepository.save(user);

    // Create session
    const deviceInfo = this.authSessionService.parseUserAgent(userAgent);
    const session = await this.authSessionService.createSession(
      user,
      ipAddress,
      deviceInfo,
    );

    // Generate tokens
    const tokens = await this.generateTokens(user, session.id);

    this.logger.log(`Telegram login: user ${user.id} (tg:${telegramId})`);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      sessionId: session.id,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: RefreshTokenDto, ipAddress: string) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException("Refresh token is required");
    }

    // Find session by token hint (first 16 chars of SHA-256)
    const tokenHash = crypto
      .createHash("sha256")
      .update(dto.refreshToken)
      .digest("hex");
    const tokenHint = tokenHash.substring(0, 16);

    const session = await this.sessionRepository.findOne({
      where: {
        refreshTokenHint: tokenHint,
        isRevoked: false,
      },
      relations: ["user", "user.organization"],
    });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Verify full token hash
    if (session.refreshTokenHash !== tokenHash) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Check expiration
    if (session.isExpired) {
      await this.authSessionService.revokeSession(session.id, "Token expired");
      throw new UnauthorizedException("Refresh token expired");
    }

    // Check user status
    if (!session.user.isActive) {
      await this.authSessionService.revokeSession(session.id, "User inactive");
      throw new ForbiddenException("Account is not active");
    }

    // Update session
    session.lastActivityAt = new Date();
    session.ipAddress = ipAddress;

    // Rotate refresh token
    const newRefreshToken = this.generateRefreshToken();
    const newTokenHash = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");
    session.refreshTokenHash = newTokenHash;
    session.refreshTokenHint = newTokenHash.substring(0, 16);
    session.expiresAt = new Date(
      Date.now() + this.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.sessionRepository.save(session);

    // Generate new access token
    const tokens = await this.generateTokens(
      session.user,
      session.id,
      newRefreshToken,
    );

    return {
      user: this.sanitizeUser(session.user),
      ...tokens,
      sessionId: session.id,
    };
  }

  /**
   * Logout (revoke session)
   */
  async logout(sessionId: string, jti?: string) {
    await this.authSessionService.revokeSession(sessionId, "User logout");
    if (jti) {
      await this.tokenBlacklistService.blacklist(jti, 15 * 60); // 15 min access token TTL
    }
    return { message: "Logged out successfully" };
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string) {
    await this.sessionRepository.update(
      { userId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: "Logout from all devices",
      },
    );

    // Blacklist all in-flight JWT tokens for this user (15 min = access token TTL)
    await this.tokenBlacklistService.blacklistAllForUser(userId, 15 * 60);

    return { message: "Logged out from all devices" };
  }

  /**
   * Get active sessions for user
   */
  async getSessions(userId: string) {
    return this.authSessionService.getSessions(userId);
  }

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string, reason: string = "Manual revocation") {
    return this.authSessionService.revokeSession(sessionId, reason);
  }

  // ==================== 2FA Methods ====================

  /**
   * Setup TOTP 2FA
   */
  async setupTotp(
    userId: string,
  ): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    return this.twoFactorService.setupTotp(userId);
  }

  /**
   * Verify and enable TOTP
   */
  async verifyAndEnableTotp(userId: string, code: string) {
    return this.twoFactorService.verifyAndEnableTotp(userId, code);
  }

  /**
   * Regenerate backup codes for user
   */
  async regenerateBackupCodes(
    userId: string,
  ): Promise<{ backupCodes: string[] }> {
    return this.twoFactorService.regenerateBackupCodes(userId);
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, password: string) {
    return this.twoFactorService.disable2FA(userId, password);
  }

  // ==================== Password Reset ====================

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string, ipAddress: string) {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: "If email exists, reset instructions will be sent" };
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Create reset token (expires in 1 hour)
    const resetToken = this.passwordResetRepository.create({
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ipAddress,
    });

    await this.passwordResetRepository.save(resetToken);

    // Build reset link
    const frontendUrl = this.configService.get(
      "FRONTEND_URL",
      "https://vendhub.uz",
    );
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

    // Send email with reset link
    try {
      await this.sendPasswordResetEmail(
        user.email,
        user.firstName || user.username,
        resetLink,
      );
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send password reset email to ${user.email}`,
        error instanceof Error ? error.stack : error,
      );
      // Don't expose email sending failure to user (security)
    }

    return { message: "If email exists, reset instructions will be sent" };
  }

  /**
   * Send password reset email
   */
  private async sendPasswordResetEmail(
    email: string,
    name: string,
    resetLink: string,
  ) {
    // Use EventEmitter to send email asynchronously
    this.eventEmitter.emit("email.send", {
      to: email,
      template: "password-reset",
      subject: "Сброс пароля VendHub",
      context: {
        name,
        resetLink,
        expiresIn: "1 час",
        supportEmail: this.configService.get(
          "SUPPORT_EMAIL",
          "support@vendhub.uz",
        ),
      },
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string, _ipAddress: string) {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await this.passwordResetRepository.findOne({
      where: { token: hashedToken },
      relations: ["user"],
    });

    if (!resetToken || !resetToken.isValid) {
      throw new BadRequestException("Invalid or expired reset token");
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

    return { message: "Password reset successfully" };
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException("Invalid current password");
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

    return { message: "Password changed successfully" };
  }

  getPasswordRequirements() {
    return this.passwordPolicyService.getRequirements();
  }

  // ==================== 2FA Login Completion (ported from VHM24-repo) ====================

  /**
   * Complete 2FA login after initial login returned requiresTwoFactor
   */
  async complete2FALogin(
    challengeToken: string,
    totpCode: string | undefined,
    backupCode: string | undefined,
    ipAddress: string,
    userAgent: string,
  ) {
    const userId = this.verifyChallengeToken(challengeToken, "2fa");
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["organization"],
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException("2FA is not enabled for this user");
    }

    const isValid = await this.twoFactorService.verify2FA(
      userId,
      totpCode,
      backupCode,
    );
    if (!isValid) {
      await this.logLoginAttempt(
        user.email,
        ipAddress,
        userAgent,
        false,
        userId,
        "Invalid 2FA code",
      );
      throw new UnauthorizedException("Invalid two-factor code");
    }

    // Reset login attempts on success
    user.loginAttempts = 0;
    user.lockedUntil = undefined as unknown as Date;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await this.userRepository.save(user);

    const deviceInfo = this.authSessionService.parseUserAgent(userAgent);
    const session = await this.authSessionService.createSession(
      user,
      ipAddress,
      deviceInfo,
    );
    const tokens = await this.generateTokens(user, session.id);

    await this.logLoginAttempt(user.email, ipAddress, userAgent, true, userId);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      sessionId: session.id,
      mustChangePassword: user.mustChangePassword,
      ...(user.mustChangePassword && {
        challengeToken: this.issueChallengeToken(user.id, "first_login"),
      }),
    };
  }

  /**
   * First login password change (REQ-AUTH-31)
   * Forces admin-created users to change their temporary password
   */
  async firstLoginChangePassword(
    challengeToken: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string,
  ) {
    const userId = this.verifyChallengeToken(challengeToken, "first_login");
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ["organization"],
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.mustChangePassword) {
      throw new BadRequestException("Password change is not required");
    }

    // Verify current (temporary) password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException("Invalid current password");
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

    // Update password
    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.loginAttempts = 0;
    await this.userRepository.save(user);

    // Create session and return tokens
    const deviceInfo = this.authSessionService.parseUserAgent(userAgent);
    const session = await this.authSessionService.createSession(
      user,
      ipAddress,
      deviceInfo,
    );
    const tokens = await this.generateTokens(user, session.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      sessionId: session.id,
    };
  }

  /**
   * Admin: unlock a locked account
   */
  async unlockAccount(userId: string): Promise<void> {
    const result = await this.userRepository.update(userId, {
      loginAttempts: 0,
      lockedUntil: undefined as unknown as Date,
    });
    if (result.affected === 0) {
      throw new NotFoundException("User not found");
    }
  }

  /**
   * Validate a password reset token without consuming it
   * Used by frontend to check token validity before showing the form
   */
  async validateResetToken(
    token: string,
  ): Promise<{ valid: boolean; email?: string; message?: string }> {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const resetToken = await this.passwordResetRepository.findOne({
      where: { token: hashedToken },
      relations: ["user"],
    });

    if (!resetToken) {
      return { valid: false, message: "Invalid reset token" };
    }
    if (resetToken.isUsed) {
      return { valid: false, message: "Token already used" };
    }
    if (resetToken.isExpired) {
      return { valid: false, message: "Token expired" };
    }
    return { valid: true, email: resetToken.user?.email };
  }

  /**
   * Cleanup expired/used password reset tokens (runs daily at 3 AM)
   */
  @Cron("0 3 * * *", { timeZone: "Asia/Tashkent" })
  async cleanupExpiredResetTokens(): Promise<number> {
    try {
      const result = await this.passwordResetRepository.softDelete({
        expiresAt: LessThan(new Date()),
      });
      const count = result.affected || 0;
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired password reset tokens`);
      }
      return count;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("Max client") ||
        msg.includes("MaxClients")
      )
        return 0;
      this.logger.error(`cleanupExpiredResetTokens failed: ${msg}`);
      return 0;
    }
  }

  /**
   * Cleanup expired/revoked sessions (runs daily at 4 AM)
   * Keeps sessions table manageable by removing rows that can never be used again.
   */
  @Cron("0 4 * * *", { timeZone: "Asia/Tashkent" })
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.sessionRepository.softDelete([
        { expiresAt: LessThan(new Date()) },
        { isRevoked: true },
      ]);
      const count = result.affected || 0;
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired/revoked sessions`);
      }
      return count;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("Max client") ||
        msg.includes("MaxClients")
      )
        return 0;
      this.logger.error(`cleanupExpiredSessions failed: ${msg}`);
      return 0;
    }
  }

  /**
   * Cleanup old login attempts older than 30 days (runs daily at 5 AM).
   * Login attempts are ephemeral security data, not business entities.
   * EXCEPTION: Uses hard delete (not softDelete) by design — these records
   * serve no audit/recovery purpose after 30 days, and GDPR requires
   * limiting retention of authentication-related PII.
   */
  @Cron("0 5 * * *", { timeZone: "Asia/Tashkent" })
  async cleanupOldLoginAttempts(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.loginAttemptRepository.delete({
        createdAt: LessThan(thirtyDaysAgo),
      });
      const count = result.affected || 0;
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} old login attempts`);
      }
      return count;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("Max client") ||
        msg.includes("MaxClients")
      )
        return 0;
      this.logger.error(`cleanupOldLoginAttempts failed: ${msg}`);
      return 0;
    }
  }

  // ==================== Private Helpers ====================

  private async generateTokens(
    user: User,
    sessionId: string,
    refreshToken?: string,
  ) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      sessionId,
      jti: uuidv4(),
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get("JWT_ACCESS_EXPIRES", "15m"),
    });

    if (!refreshToken) {
      refreshToken = this.generateRefreshToken();
      const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

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
    return crypto.randomBytes(64).toString("hex");
  }

  private async getRecentFailedAttempts(
    email: string,
    ipAddress: string,
  ): Promise<number> {
    const since = new Date(
      Date.now() - this.LOCKOUT_DURATION_MINUTES * 60 * 1000,
    );

    return this.loginAttemptRepository.count({
      where: [
        { email, success: false, createdAt: MoreThan(since) },
        { ipAddress, success: false, createdAt: MoreThan(since) },
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
      createdAt: user.createdAt,
    };
  }
}
