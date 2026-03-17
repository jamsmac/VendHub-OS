import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
  Res,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { PasswordPolicyService } from "./services/password-policy.service";
import { CookieService } from "./services/cookie.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { Verify2FADto } from "./dto/two-factor.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import {
  Complete2FALoginDto,
  FirstLoginChangePasswordDto,
  ValidateResetTokenDto,
  Disable2FADto,
} from "./dto/auth-operations.dto";
import { RegisterWithInviteDto } from "./dto/register-with-invite.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { User } from "../users/entities/user.entity";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly cookieService: CookieService,
  ) {}

  @Post("register")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    schema: {
      example: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "viewer",
        organizationId: "550e8400-e29b-41d4-a716-446655440001",
      },
    },
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async register(
    @Body() registerDto: RegisterDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") _userAgent: string,
  ) {
    return this.authService.register(registerDto, ipAddress);
  }

  @Post("register/invite")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Register via invite code + Telegram or email/password",
  })
  @ApiResponse({ status: 201, description: "Registration successful" })
  @ApiResponse({ status: 400, description: "Invalid invite or missing data" })
  @ApiResponse({
    status: 409,
    description: "Email or Telegram already registered",
  })
  async registerWithInvite(
    @Body() dto: RegisterWithInviteDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerWithInvite(
      dto,
      ipAddress,
      userAgent,
    );

    if (result.accessToken) {
      this.cookieService.setTokenCookies(
        res,
        result.accessToken,
        result.refreshToken,
      );
    }

    return result;
  }

  @Post("login")
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    schema: {
      example: {
        accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        user: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "manager",
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    // Set httpOnly cookies if login returned tokens (not 2FA challenge)
    if ("accessToken" in result && result.accessToken) {
      this.cookieService.setTokenCookies(
        res,
        result.accessToken,
        result.refreshToken,
      );
    }

    return result;
  }

  @Post("telegram")
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login via Telegram WebApp" })
  @ApiResponse({ status: 200, description: "Login successful via Telegram" })
  @ApiResponse({ status: 401, description: "Invalid Telegram signature" })
  async loginTelegram(
    @Body("initData") initData: string,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginTelegram(
      initData,
      ipAddress,
      userAgent,
    );

    if (result.accessToken) {
      this.cookieService.setTokenCookies(
        res,
        result.accessToken,
        result.refreshToken,
      );
    }

    return result;
  }

  @Post("refresh")
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, description: "Token refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") _userAgent: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Allow refresh token from httpOnly cookie as fallback
    const cookieRefreshToken =
      this.cookieService.getRefreshTokenFromCookie(req);
    const dto = refreshTokenDto.refreshToken
      ? refreshTokenDto
      : { refreshToken: cookieRefreshToken || "" };

    const result = await this.authService.refreshToken(dto, ipAddress);

    // Update cookies with new tokens
    if (result.accessToken && result.refreshToken) {
      this.cookieService.setTokenCookies(
        res,
        result.accessToken,
        result.refreshToken,
      );
    }

    return result;
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout and invalidate session" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(
    @CurrentUser() user: User & { jti?: string; sessionId?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    this.cookieService.clearTokenCookies(res);

    if (!user.sessionId) {
      return this.authService.logoutAll(user.id);
    }
    return this.authService.logout(user.sessionId, user.jti);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @SkipThrottle()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "Current user profile" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async me(@CurrentUser() user: User) {
    return user;
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all active sessions" })
  @ApiResponse({ status: 200, description: "List of active sessions" })
  async getSessions(@CurrentUser() user: User) {
    return this.authService.getSessions(user.id);
  }

  @Post("password/forgot")
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset email" })
  @ApiResponse({
    status: 200,
    description: "If email exists, reset instructions will be sent",
  })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Ip() ipAddress: string,
  ) {
    return this.authService.requestPasswordReset(dto.email, ipAddress);
  }

  @Post("password/reset")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with token" })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async resetPassword(@Body() dto: ResetPasswordDto, @Ip() ipAddress: string) {
    return this.authService.resetPassword(dto.token, dto.password, ipAddress);
  }

  // ============================================================================
  // 2FA Login Completion + First Login
  // ============================================================================

  @Post("2fa/complete")
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Complete 2FA login with TOTP or backup code" })
  @ApiResponse({ status: 200, description: "Login completed" })
  @ApiResponse({ status: 401, description: "Invalid 2FA code" })
  async complete2FALogin(
    @Body() dto: Complete2FALoginDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.complete2FALogin(
      dto.challengeToken,
      dto.totpCode,
      dto.backupCode,
      ipAddress,
      userAgent,
    );

    if (result.accessToken && result.refreshToken) {
      this.cookieService.setTokenCookies(
        res,
        result.accessToken,
        result.refreshToken,
      );
    }

    return result;
  }

  @Post("first-login/change-password")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change temporary password on first login" })
  @ApiResponse({
    status: 200,
    description: "Password changed, session created",
  })
  @ApiResponse({ status: 400, description: "Password change not required" })
  async firstLoginChangePassword(
    @Body() dto: FirstLoginChangePasswordDto,
    @Ip() ipAddress: string,
    @Headers("user-agent") userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.firstLoginChangePassword(
      dto.challengeToken,
      dto.currentPassword,
      dto.newPassword,
      ipAddress,
      userAgent,
    );

    if (result.accessToken && result.refreshToken) {
      this.cookieService.setTokenCookies(
        res,
        result.accessToken,
        result.refreshToken,
      );
    }

    return result;
  }

  @Post("password/validate-reset-token")
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Validate password reset token" })
  @ApiResponse({ status: 200, description: "Token validation result" })
  async validateResetToken(@Body() dto: ValidateResetTokenDto) {
    return this.authService.validateResetToken(dto.token);
  }

  // ============================================================================
  // Two-Factor Authentication
  // ============================================================================

  @Post("2fa/enable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Enable two-factor authentication" })
  @ApiResponse({ status: 200, description: "2FA secret and QR code" })
  async enable2FA(@CurrentUser() user: User) {
    return this.authService.setupTotp(user.id);
  }

  @Post("2fa/verify")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify and activate 2FA" })
  @ApiResponse({ status: 200, description: "2FA enabled successfully" })
  @ApiResponse({ status: 400, description: "Invalid code" })
  async verify2FA(@CurrentUser() user: User, @Body() verifyDto: Verify2FADto) {
    return this.authService.verifyAndEnableTotp(user.id, verifyDto.code);
  }

  @Post("2fa/disable")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Disable two-factor authentication" })
  @ApiResponse({ status: 200, description: "2FA disabled successfully" })
  @ApiResponse({ status: 400, description: "Invalid password" })
  async disable2FA(@CurrentUser() user: User, @Body() dto: Disable2FADto) {
    return this.authService.disable2FA(user.id, dto.password);
  }

  @Post("2fa/backup-codes")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate new backup codes" })
  @ApiResponse({ status: 200, description: "New backup codes generated" })
  async generateBackupCodes(@CurrentUser() user: User) {
    return this.authService.regenerateBackupCodes(user.id);
  }

  // ============================================================================
  // Password Policy
  // ============================================================================

  @Get("password/requirements")
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 requests/min -- static data
  @ApiOperation({ summary: "Get password requirements" })
  @ApiResponse({ status: 200, description: "Password policy requirements" })
  async getPasswordRequirements() {
    return this.passwordPolicyService.getRequirements();
  }
}
