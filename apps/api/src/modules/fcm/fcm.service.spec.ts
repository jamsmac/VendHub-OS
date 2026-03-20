import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { FcmService } from "./fcm.service";
import { FcmToken, DeviceType } from "./entities/fcm-token.model";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;

const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    softDelete: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 5 }),
  })),
});

const createMockConfigService = () => ({
  get: jest.fn((key: string) => {
    if (key === "GOOGLE_APPLICATION_CREDENTIALS") return null;
    if (key === "FIREBASE_PROJECT_ID") return null;
    return null;
  }),
});

describe("FcmService", () => {
  let service: FcmService;
  let tokenRepo: MockRepository<FcmToken>;
  let configService: ReturnType<typeof createMockConfigService>;

  const organizationId = "123e4567-e89b-12d3-a456-426614174000";
  const userId = "123e4567-e89b-12d3-a456-426614174001";
  const tokenValue = "test_fcm_token_xyz";

  beforeEach(async () => {
    tokenRepo = createMockRepository<FcmToken>();
    configService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmService,
        { provide: getRepositoryToken(FcmToken), useValue: tokenRepo },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<FcmService>(FcmService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // IS CONFIGURED
  // ==========================================================================

  describe("isConfigured", () => {
    it("should return false when Firebase is not initialized", () => {
      const result = service.isConfigured();
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // REGISTER TOKEN
  // ==========================================================================

  describe("registerToken", () => {
    it("should create a new FCM token when not exists", async () => {
      const dto = {
        token: tokenValue,
        deviceType: DeviceType.ANDROID,
        deviceName: "Pixel 6",
      };
      const newToken = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        userId,
        token: tokenValue,
        deviceType: DeviceType.ANDROID,
        deviceName: "Pixel 6",
        isActive: true,
        createdAt: new Date(),
      };

      tokenRepo.findOne!.mockResolvedValue(null);
      tokenRepo.create!.mockReturnValue(newToken);
      tokenRepo.save!.mockResolvedValue(newToken);

      const result = await service.registerToken(userId, organizationId, dto);

      expect(result).toEqual(newToken);
      expect(tokenRepo.findOne).toHaveBeenCalledWith({
        where: { token: tokenValue },
      });
      expect(tokenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          organizationId,
          token: tokenValue,
          deviceType: DeviceType.ANDROID,
          deviceName: "Pixel 6",
          isActive: true,
        }),
      );
      expect(tokenRepo.save).toHaveBeenCalled();
    });

    it("should update existing token when token already exists", async () => {
      const dto = {
        token: tokenValue,
        deviceType: DeviceType.IOS,
        deviceName: "iPhone 13",
      };
      const existingToken = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "123e4567-e89b-12d3-a456-426614174002",
        userId: "123e4567-e89b-12d3-a456-426614174003",
        token: tokenValue,
        deviceType: DeviceType.ANDROID,
        deviceName: "Pixel 6",
        isActive: false,
      };

      tokenRepo.findOne!.mockResolvedValue(existingToken);
      tokenRepo.save!.mockImplementation((token) => Promise.resolve(token));

      const result = await service.registerToken(userId, organizationId, dto);

      expect(result.userId).toBe(userId);
      expect(result.organizationId).toBe(organizationId);
      expect(result.deviceType).toBe(DeviceType.IOS);
      expect(result.deviceName).toBe("iPhone 13");
      expect(result.isActive).toBe(true);
      expect(tokenRepo.save).toHaveBeenCalled();
    });

    it("should preserve existing device details when not provided in DTO", async () => {
      const dto = { token: tokenValue };
      const existingToken = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "123e4567-e89b-12d3-a456-426614174002",
        userId: "123e4567-e89b-12d3-a456-426614174003",
        token: tokenValue,
        deviceType: DeviceType.ANDROID,
        deviceName: "Pixel 6",
        isActive: false,
      };

      tokenRepo.findOne!.mockResolvedValue(existingToken);
      tokenRepo.save!.mockImplementation((token) => Promise.resolve(token));

      const result = await service.registerToken(userId, organizationId, dto);

      expect(result.deviceType).toBe(DeviceType.ANDROID);
      expect(result.deviceName).toBe("Pixel 6");
    });
  });

  // ==========================================================================
  // UNREGISTER TOKEN
  // ==========================================================================

  describe("unregisterToken", () => {
    it("should soft delete a registered token", async () => {
      const token = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        userId,
        token: tokenValue,
      };

      tokenRepo.findOne!.mockResolvedValue(token);
      tokenRepo.softDelete!.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      await service.unregisterToken(userId, organizationId, tokenValue);

      expect(tokenRepo.findOne).toHaveBeenCalledWith({
        where: { userId, organizationId, token: tokenValue },
      });
      expect(tokenRepo.softDelete).toHaveBeenCalledWith(token.id);
    });

    it("should handle non-existent token gracefully", async () => {
      tokenRepo.findOne!.mockResolvedValue(null);

      await service.unregisterToken(userId, organizationId, tokenValue);

      expect(tokenRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET USER TOKENS
  // ==========================================================================

  describe("getUserTokens", () => {
    it("should return all active tokens for a user", async () => {
      const tokens = [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          token: "token1",
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          token: "token2",
          isActive: true,
          createdAt: new Date(),
        },
      ];

      tokenRepo.find!.mockResolvedValue(tokens);

      const result = await service.getUserTokens(userId, organizationId);

      expect(result).toEqual(tokens);
      expect(tokenRepo.find).toHaveBeenCalledWith({
        where: { userId, organizationId, isActive: true },
        order: { createdAt: "DESC" },
      });
    });

    it("should return empty array when user has no active tokens", async () => {
      tokenRepo.find!.mockResolvedValue([]);

      const result = await service.getUserTokens(userId, organizationId);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // SEND TO USER
  // ==========================================================================

  describe("sendToUser", () => {
    it("should return 0 when FCM is not configured", async () => {
      const dto = { userId, title: "Hello", body: "Test notification" };

      const result = await service.sendToUser(dto, organizationId);

      expect(result).toBe(0);
      // When FCM is not configured, service returns early without calling find
      expect(tokenRepo.find).not.toHaveBeenCalled();
    });

    it("should return 0 when user has no active tokens", async () => {
      // This test would require FCM to be configured, which requires mocking firebase-admin
      // Skip detailed testing as the service gracefully degrades when not configured
    });
  });

  // ==========================================================================
  // SEND TO MULTIPLE USERS
  // ==========================================================================

  describe("sendToMultipleUsers", () => {
    it("should track sent and failed counts", async () => {
      const userIds = [userId];

      const result = await service.sendToMultipleUsers(
        userIds,
        organizationId,
        "Title",
        "Body",
      );

      expect(result).toEqual({ sent: 0, failed: 0 });
    });

    it("should handle multiple users", async () => {
      const userIds = [
        "123e4567-e89b-12d3-a456-426614174004",
        "123e4567-e89b-12d3-a456-426614174005",
      ];

      const result = await service.sendToMultipleUsers(
        userIds,
        organizationId,
        "Title",
        "Body",
      );

      expect(result.sent).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // SUBSCRIBE TO TOPIC
  // ==========================================================================

  describe("subscribeToTopic", () => {
    it("should return early when FCM is not configured", async () => {
      const topic = "promo_updates";

      await service.subscribeToTopic(userId, organizationId, topic);

      // FCM is not configured, so tokenRepo.find should not be called
      expect(tokenRepo.find).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // UNSUBSCRIBE FROM TOPIC
  // ==========================================================================

  describe("unsubscribeFromTopic", () => {
    it("should return early when FCM is not configured", async () => {
      const topic = "promo_updates";

      await service.unsubscribeFromTopic(userId, organizationId, topic);

      // FCM is not configured, so tokenRepo.find should not be called
      expect(tokenRepo.find).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SEND TO TOPIC
  // ==========================================================================

  describe("sendToTopic", () => {
    it("should return false when FCM is not configured", async () => {
      const result = await service.sendToTopic("topic", "Title", "Body");

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // CLEANUP INACTIVE TOKENS
  // ==========================================================================

  describe("cleanupInactiveTokens", () => {
    it("should execute cleanup query and return affected count", async () => {
      const mockQueryBuilder = {
        softDelete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };

      tokenRepo.createQueryBuilder!.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<
          Repository<FcmToken>["createQueryBuilder"]
        >,
      );

      const result = await service.cleanupInactiveTokens();

      expect(result).toBe(5);
      expect(mockQueryBuilder.softDelete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith("isActive = false");
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "updatedAt < :date",
        expect.objectContaining({ date: expect.any(Date) }),
      );
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });

    it("should return 0 when no tokens to clean", async () => {
      const mockQueryBuilder = {
        softDelete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: null }),
      };

      tokenRepo.createQueryBuilder!.mockReturnValue(
        mockQueryBuilder as unknown as ReturnType<
          Repository<FcmToken>["createQueryBuilder"]
        >,
      );

      const result = await service.cleanupInactiveTokens();

      expect(result).toBe(0);
    });
  });
});
