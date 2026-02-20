import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import {
  User,
  UserSession,
  TwoFactorAuth,
  PasswordResetToken,
  LoginAttempt,
  UserRole,
  UserStatus,
} from '../users/entities/user.entity';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { PasswordPolicyService } from './services/password-policy.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr'),
}));

// Mock otplib
jest.mock('otplib', () => ({
  authenticator: {
    options: {},
    generateSecret: jest.fn().mockReturnValue('MOCK_TOTP_SECRET'),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/VendHub:test@test.com'),
    verify: jest.fn(),
  },
}));

const bcrypt = require('bcrypt');
const { authenticator } = require('otplib');

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let sessionRepository: jest.Mocked<Repository<UserSession>>;
  let twoFactorRepository: jest.Mocked<Repository<TwoFactorAuth>>;
  let loginAttemptRepository: jest.Mocked<Repository<LoginAttempt>>;
  let passwordResetRepository: jest.Mocked<Repository<PasswordResetToken>>;
  let jwtService: jest.Mocked<JwtService>;
  let tokenBlacklistService: jest.Mocked<TokenBlacklistService>;
  let passwordPolicyService: jest.Mocked<PasswordPolicyService>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@vendhub.uz',
    password: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    username: 'testuser',
    phone: '+998901234567',
    avatar: null,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    organizationId: 'org-uuid-1',
    organization: { id: 'org-uuid-1', name: 'Test Org', slug: 'test-org', logo: null },
    loginAttempts: 0,
    lockedUntil: undefined as unknown as Date,
    isLocked: false,
    isActive: true,
    twoFactorEnabled: false,
    ipWhitelist: [],
    lastLoginAt: null,
    lastLoginIp: null,
    mustChangePassword: false,
    preferences: {},
    created_at: new Date(),
  } as unknown as User;

  const mockSession = {
    id: 'session-uuid-1',
    userId: 'user-uuid-1',
    refreshTokenHash: 'mock-hash',
    refreshTokenHint: 'mock-hint',
    isRevoked: false,
    isExpired: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastActivityAt: new Date(),
    deviceInfo: {},
    ipAddress: '127.0.0.1',
    user: mockUser,
    created_at: new Date(),
  } as unknown as UserSession;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserSession),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TwoFactorAuth),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LoginAttempt),
          useValue: {
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockImplementation((data) => data),
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                JWT_ACCESS_EXPIRES: '15m',
                ENCRYPTION_KEY: undefined as unknown as string,
                NODE_ENV: 'test',
                FRONTEND_URL: 'https://vendhub.uz',
                SUPPORT_EMAIL: 'support@vendhub.uz',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: TokenBlacklistService,
          useValue: {
            blacklist: jest.fn().mockResolvedValue(undefined),
            blacklistAllForUser: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PasswordPolicyService,
          useValue: {
            validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
            getRequirements: jest.fn().mockReturnValue({ minLength: 8 }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    sessionRepository = module.get(getRepositoryToken(UserSession));
    twoFactorRepository = module.get(getRepositoryToken(TwoFactorAuth));
    loginAttemptRepository = module.get(getRepositoryToken(LoginAttempt));
    passwordResetRepository = module.get(getRepositoryToken(PasswordResetToken));
    jwtService = module.get(JwtService);
    tokenBlacklistService = module.get(TokenBlacklistService);
    passwordPolicyService = module.get(PasswordPolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // REGISTER
  // ============================================================================

  describe('register', () => {
    it('should register a new user successfully', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(
        {
          email: 'new@vendhub.uz',
          password: 'StrongP@ss123',
          firstName: 'New',
          lastName: 'User',
          phone: '+998901234567',
        },
        '127.0.0.1',
      );

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('userId');
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register(
          {
            email: 'test@vendhub.uz',
            password: 'StrongP@ss123',
            firstName: 'Test',
            lastName: 'User',
            phone: '+998901234567',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if password policy fails', async () => {
      userRepository.findOne.mockResolvedValue(null);
      passwordPolicyService.validate.mockReturnValue({
        valid: false,
        errors: ['Password too weak'],
      } as any);

      await expect(
        service.register(
          {
            email: 'new@vendhub.uz',
            password: 'weak',
            firstName: 'Test',
            lastName: 'User',
            phone: '+998901234567',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // LOGIN
  // ============================================================================

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      userRepository.save.mockResolvedValue(mockUser);
      sessionRepository.create.mockReturnValue(mockSession);
      sessionRepository.save.mockResolvedValue(mockSession);
      sessionRepository.update.mockResolvedValue(undefined as any);

      const result = await service.login(
        { email: 'test@vendhub.uz', password: 'StrongP@ss123' },
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('sessionId');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, loginAttempts: 0 } as any);
      bcrypt.compare.mockResolvedValue(false);
      userRepository.save.mockResolvedValue(mockUser);

      await expect(
        service.login(
          { email: 'test@vendhub.uz', password: 'wrong' },
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for locked account', async () => {
      const lockedUser = { ...mockUser, isLocked: true } as unknown as User;
      userRepository.findOne.mockResolvedValue(lockedUser);

      await expect(
        service.login(
          { email: 'test@vendhub.uz', password: 'StrongP@ss123' },
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for pending account', async () => {
      const pendingUser = {
        ...mockUser,
        isLocked: false,
        status: UserStatus.PENDING,
      } as unknown as User;
      userRepository.findOne.mockResolvedValue(pendingUser);

      await expect(
        service.login(
          { email: 'test@vendhub.uz', password: 'StrongP@ss123' },
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'unknown@vendhub.uz', password: 'pass123' },
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when too many login attempts', async () => {
      loginAttemptRepository.count.mockResolvedValue(6);

      await expect(
        service.login(
          { email: 'test@vendhub.uz', password: 'pass' },
          '127.0.0.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return requiresTwoFactor when 2FA is enabled without code', async () => {
      const user2fa = {
        ...mockUser,
        twoFactorEnabled: true,
      } as unknown as User;
      userRepository.findOne.mockResolvedValue(user2fa);
      bcrypt.compare.mockResolvedValue(true);
      twoFactorRepository.findOne.mockResolvedValue({
        hasTotp: true,
        hasSms: false,
        hasEmail: false,
        hasBackupCodes: true,
      } as any);

      const result = await service.login(
        { email: 'test@vendhub.uz', password: 'StrongP@ss123' },
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toHaveProperty('requiresTwoFactor', true);
    });
  });

  // ============================================================================
  // REFRESH TOKEN
  // ============================================================================

  describe('refreshToken', () => {
    it('should throw UnauthorizedException for invalid refresh token', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refreshToken(
          { refreshToken: 'invalid-token' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============================================================================
  // LOGOUT
  // ============================================================================

  describe('logout', () => {
    it('should logout successfully and blacklist token', async () => {
      sessionRepository.update.mockResolvedValue(undefined as any);

      const result = await service.logout('session-uuid-1', 'jti-123');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(sessionRepository.update).toHaveBeenCalledWith(
        { id: 'session-uuid-1' },
        expect.objectContaining({ isRevoked: true }),
      );
      expect(tokenBlacklistService.blacklist).toHaveBeenCalledWith('jti-123', 900);
    });

    it('should logout without blacklisting when no jti provided', async () => {
      sessionRepository.update.mockResolvedValue(undefined as any);

      const result = await service.logout('session-uuid-1');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(tokenBlacklistService.blacklist).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SETUP TOTP
  // ============================================================================

  describe('setupTotp', () => {
    it('should set up TOTP and return secret, QR code, and backup codes', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      twoFactorRepository.findOne.mockResolvedValue(null);
      twoFactorRepository.create.mockImplementation((data) => data as any);
      twoFactorRepository.save.mockResolvedValue({} as any);

      const result = await service.setupTotp('user-uuid-1');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should throw BadRequestException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.setupTotp('non-existent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // LOGOUT ALL
  // ============================================================================

  describe('logoutAll', () => {
    it('should revoke all sessions for user', async () => {
      sessionRepository.update.mockResolvedValue(undefined as any);

      const result = await service.logoutAll('user-uuid-1');

      expect(result).toEqual({ message: 'Logged out from all devices' });
      expect(sessionRepository.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', isRevoked: false },
        expect.objectContaining({ isRevoked: true }),
      );
    });
  });
});
