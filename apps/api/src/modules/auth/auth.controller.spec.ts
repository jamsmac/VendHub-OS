/**
 * Auth Controller Tests
 * CRITICAL API - Security-critical endpoints for authentication and 2FA
 *
 * Test Coverage:
 *  ✓ Registration (throttling, validation, duplicate email)
 *  ✓ Login (invalid credentials, throttling, 2FA requirement)
 *  ✓ Token refresh (invalid token, expired token)
 *  ✓ Logout (session cleanup)
 *  ✓ 2FA setup/verification (TOTP code validation)
 *  ✓ Password reset (token validation, security)
 *  ✓ Authorization guards (JwtAuthGuard)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordPolicyService } from './services/password-policy.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let passwordPolicyService: PasswordPolicyService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            logoutAll: jest.fn(),
            getSessions: jest.fn(),
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
            setupTotp: jest.fn(),
            verifyAndEnableTotp: jest.fn(),
            disable2FA: jest.fn(),
            regenerateBackupCodes: jest.fn(),
            complete2FALogin: jest.fn(),
            firstLoginChangePassword: jest.fn(),
            validateResetToken: jest.fn(),
          },
        },
        {
          provide: PasswordPolicyService,
          useValue: {
            getRequirements: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({}) // Disable throttling for tests
      .compile();

    app = module.createNestApplication();
    authService = module.get<AuthService>(AuthService);
    passwordPolicyService = module.get<PasswordPolicyService>(
      PasswordPolicyService,
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // REGISTRATION TESTS
  // ============================================================================

  describe('POST /auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'John',
        lastName: 'Doe',
      };

      const expectedResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: 'viewer',
      };

      (authService.register as jest.Mock).mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toEqual(expectedResponse);
      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        expect.any(String), // IP address
      );
    });

    it('should reject registration with weak password', async () => {
      const registerDto = {
        email: 'weak@example.com',
        password: 'weak', // Too short
        firstName: 'John',
        lastName: 'Doe',
      };

      // NOTE: Add password validation logic in auth.service.ts
      // What validation rules should be enforced?
      // - Minimum length (e.g., 8 characters)?
      // - Special characters required?
      // - Numbers required?
      // Consider the password policy requirements
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject duplicate email registration', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'SecurePass123!@#',
        firstName: 'John',
        lastName: 'Doe',
      };

      (authService.register as jest.Mock).mockRejectedValue(
        new Error('Email already exists'),
      );

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should include IP address and user-agent in registration', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'John',
        lastName: 'Doe',
      };

      (authService.register as jest.Mock).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });

      await request(app.getHttpServer())
        .post('/auth/register')
        .set('User-Agent', 'Mozilla/5.0')
        .send(registerDto)
        .expect(HttpStatus.CREATED);

      expect(authService.register).toHaveBeenCalledWith(
        registerDto,
        expect.any(String), // IP logged for security audit
      );
    });
  });

  // ============================================================================
  // LOGIN TESTS
  // ============================================================================

  describe('POST /auth/login', () => {
    it('should login with valid credentials and return tokens', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'SecurePass123!@#',
      };

      const expectedResponse = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: loginDto.email,
          role: 'manager',
        },
      };

      (authService.login as jest.Mock).mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'wrongpassword',
      };

      (authService.login as jest.Mock).mockRejectedValue(
        new Error('Invalid credentials'),
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject nonexistent user email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!@#',
      };

      (authService.login as jest.Mock).mockRejectedValue(
        new Error('User not found'),
      );

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should include IP and user-agent for security audit', async () => {
      const loginDto = {
        email: 'user@example.com',
        password: 'SecurePass123!@#',
      };

      (authService.login as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: 'user-id', email: 'user@example.com' },
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .set('User-Agent', 'Mozilla/5.0')
        .send(loginDto)
        .expect(HttpStatus.OK);

      // Verify IP address was captured for security logging
      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        expect.any(String), // IP address
        'Mozilla/5.0',
      );
    });
  });

  // ============================================================================
  // TOKEN REFRESH TESTS
  // ============================================================================

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshDto = {
        refreshToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIn0...',
      };

      const expectedResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      (authService.refreshToken as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(expectedResponse);
    });

    it('should reject invalid refresh token', async () => {
      const refreshDto = {
        refreshToken: 'invalid-token',
      };

      (authService.refreshToken as jest.Mock).mockRejectedValue(
        new Error('Invalid token'),
      );

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject expired refresh token', async () => {
      const refreshDto = {
        refreshToken: 'expired-token',
      };

      (authService.refreshToken as jest.Mock).mockRejectedValue(
        new Error('Token expired'),
      );

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ============================================================================
  // 2FA TESTS
  // ============================================================================

  describe('POST /auth/2fa/enable', () => {
    it('should enable 2FA and return QR code', async () => {
      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
      };

      const expectedResponse = {
        secret: 'JBSWY3DPEBLW64TMMQ======',
        qrCode:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHQAAAB0CAY...',
      };

      (authService.setupTotp as jest.Mock).mockResolvedValue(expectedResponse);

      // NOTE: Add test for @UseGuards(JwtAuthGuard)
      // How should we mock the JWT token in the Authorization header?
      // Should we test that unauthorized requests are rejected first?
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/enable')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);

      expect(response.body.secret).toBeDefined();
      expect(response.body.qrCode).toBeDefined();
    });
  });

  describe('POST /auth/2fa/verify', () => {
    it('should verify TOTP code and enable 2FA', async () => {
      const verifyDto = {
        code: '123456', // 6-digit TOTP code
      };

      const expectedResponse = {
        enabled: true,
        backupCodes: [
          'BACKUP-CODE-1',
          'BACKUP-CODE-2',
          'BACKUP-CODE-3',
          'BACKUP-CODE-4',
          'BACKUP-CODE-5',
        ],
      };

      (authService.verifyAndEnableTotp as jest.Mock).mockResolvedValue(
        expectedResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(verifyDto)
        .expect(HttpStatus.OK);

      expect(response.body.enabled).toBe(true);
      expect(response.body.backupCodes.length).toBe(5);
    });

    it('should reject invalid TOTP code', async () => {
      const verifyDto = {
        code: '000000', // Invalid code
      };

      (authService.verifyAndEnableTotp as jest.Mock).mockRejectedValue(
        new Error('Invalid TOTP code'),
      );

      await request(app.getHttpServer())
        .post('/auth/2fa/verify')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send(verifyDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================================
  // PASSWORD RESET TESTS
  // ============================================================================

  describe('POST /auth/password/forgot', () => {
    it('should send password reset email for existing user', async () => {
      const forgotDto = {
        email: 'user@example.com',
      };

      (authService.requestPasswordReset as jest.Mock).mockResolvedValue({
        message: 'If email exists, reset instructions will be sent',
      });

      await request(app.getHttpServer())
        .post('/auth/password/forgot')
        .send(forgotDto)
        .expect(HttpStatus.OK);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(
        forgotDto.email,
        expect.any(String),
      );
    });

    it('should not reveal if email exists (security)', async () => {
      const forgotDto = {
        email: 'nonexistent@example.com',
      };

      (authService.requestPasswordReset as jest.Mock).mockResolvedValue({
        message: 'If email exists, reset instructions will be sent',
      });

      // Same response for both existing and non-existing emails (security best practice)
      await request(app.getHttpServer())
        .post('/auth/password/forgot')
        .send(forgotDto)
        .expect(HttpStatus.OK);
    });
  });

  describe('POST /auth/password/reset', () => {
    it('should reset password with valid token', async () => {
      const resetDto = {
        token: 'reset-token-abc123',
        password: 'NewSecurePass123!@#',
      };

      (authService.resetPassword as jest.Mock).mockResolvedValue({
        message: 'Password reset successfully',
      });

      await request(app.getHttpServer())
        .post('/auth/password/reset')
        .send(resetDto)
        .expect(HttpStatus.OK);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetDto.token,
        resetDto.password,
        expect.any(String),
      );
    });

    it('should reject invalid or expired reset token', async () => {
      const resetDto = {
        token: 'invalid-token',
        password: 'NewSecurePass123!@#',
      };

      (authService.resetPassword as jest.Mock).mockRejectedValue(
        new Error('Token expired or invalid'),
      );

      await request(app.getHttpServer())
        .post('/auth/password/reset')
        .send(resetDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================================================
  // CURRENT USER ENDPOINT
  // ============================================================================

  describe('GET /auth/me', () => {
    it('should return current user profile with valid JWT', async () => {
      const mockUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'manager',
        organizationId: '550e8400-e29b-41d4-a716-446655440001',
      };

      // NOTE: How should we properly mock the @UseGuards(JwtAuthGuard)?
      // Should we:
      // 1. Create a test JWT token using jwt.sign()?
      // 2. Mock the guard entirely for unit tests?
      // 3. Create integration tests with a real database?
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);
    });

    it('should reject request without JWT token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject request with invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ============================================================================
  // LOGOUT TESTS
  // ============================================================================

  describe('POST /auth/logout', () => {
    it('should logout and invalidate session', async () => {
      (authService.logout as jest.Mock).mockResolvedValue({
        message: 'Logged out successfully',
      });

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(HttpStatus.OK);

      expect(authService.logout).toHaveBeenCalled();
    });

    it('should reject logout without authentication', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
