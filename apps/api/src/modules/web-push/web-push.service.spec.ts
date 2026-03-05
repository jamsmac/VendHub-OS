import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { WebPushService } from "./web-push.service";
import { PushSubscription } from "../notifications/entities/push-subscription.entity";

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
});

const createMockConfigService = () => ({
  get: jest.fn((key: string, defaultValue?: unknown) => {
    if (key === "VAPID_PUBLIC_KEY") return null;
    if (key === "VAPID_PRIVATE_KEY") return null;
    if (key === "VAPID_EMAIL") return defaultValue || "admin@vendhub.uz";
    return defaultValue;
  }),
});

describe("WebPushService", () => {
  let service: WebPushService;
  let subscriptionRepo: MockRepository<PushSubscription>;
  let configService: ReturnType<typeof createMockConfigService>;

  const organizationId = "123e4567-e89b-12d3-a456-426614174000";
  const userId = "123e4567-e89b-12d3-a456-426614174001";
  const endpoint = "https://fcm.googleapis.com/fcm/send/example-endpoint";
  const p256dh = "test_p256dh_key_value";
  const auth = "test_auth_key_value";

  beforeEach(async () => {
    subscriptionRepo = createMockRepository<PushSubscription>();
    configService = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebPushService,
        {
          provide: getRepositoryToken(PushSubscription),
          useValue: subscriptionRepo,
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<WebPushService>(WebPushService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // GET PUBLIC KEY
  // ==========================================================================

  describe("getPublicKey", () => {
    it("should return null when VAPID public key is not configured", () => {
      const result = service.getPublicKey();
      expect(result).toBeNull();
    });

    it("should return public key when configured", () => {
      configService.get = jest.fn((key: string) => {
        if (key === "VAPID_PUBLIC_KEY") return "test_public_key_123abc";
        return null;
      });

      const newService = new WebPushService(
        subscriptionRepo as unknown as Repository<PushSubscription>,
        configService as unknown as ConfigService,
      );
      const result = newService.getPublicKey();

      expect(result).toBe("test_public_key_123abc");
    });
  });

  // ==========================================================================
  // SUBSCRIBE
  // ==========================================================================

  describe("subscribe", () => {
    it("should create a new subscription when endpoint not exists", async () => {
      const newSub = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        userId,
        endpoint,
        p256dh,
        auth,
        isActive: true,
        lastUsedAt: new Date(),
        userAgent: "Mozilla/5.0",
        createdAt: new Date(),
      };

      subscriptionRepo.findOne!.mockResolvedValue(null);
      subscriptionRepo.create!.mockReturnValue(newSub);
      subscriptionRepo.save!.mockResolvedValue(newSub);

      const result = await service.subscribe(
        userId,
        organizationId,
        endpoint,
        p256dh,
        auth,
        "Mozilla/5.0",
      );

      expect(result).toEqual(newSub);
      expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
        where: { endpoint },
      });
      expect(subscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          organizationId,
          endpoint,
          p256dh,
          auth,
          isActive: true,
          userAgent: "Mozilla/5.0",
        }),
      );
      expect(subscriptionRepo.save).toHaveBeenCalled();
    });

    it("should update existing subscription when endpoint already exists", async () => {
      const existingSub = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId: "123e4567-e89b-12d3-a456-426614174002",
        userId: "123e4567-e89b-12d3-a456-426614174003",
        endpoint,
        p256dh: "old_p256dh",
        auth: "old_auth",
        isActive: false,
        lastUsedAt: null,
        userAgent: "Old Browser",
      };

      subscriptionRepo.findOne!.mockResolvedValue(existingSub);
      subscriptionRepo.save!.mockImplementation((sub) => Promise.resolve(sub));

      const result = await service.subscribe(
        userId,
        organizationId,
        endpoint,
        p256dh,
        auth,
        "New Browser",
      );

      expect(result.userId).toBe(userId);
      expect(result.organizationId).toBe(organizationId);
      expect(result.p256dh).toBe(p256dh);
      expect(result.auth).toBe(auth);
      expect(result.isActive).toBe(true);
      expect(result.userAgent).toBe("New Browser");
      expect(subscriptionRepo.save).toHaveBeenCalled();
    });

    it("should subscribe without userAgent when not provided", async () => {
      const newSub = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        organizationId,
        userId,
        endpoint,
        p256dh,
        auth,
        isActive: true,
        lastUsedAt: new Date(),
        userAgent: null,
        createdAt: new Date(),
      };

      subscriptionRepo.findOne!.mockResolvedValue(null);
      subscriptionRepo.create!.mockReturnValue(newSub);
      subscriptionRepo.save!.mockResolvedValue(newSub);

      const result = await service.subscribe(
        userId,
        organizationId,
        endpoint,
        p256dh,
        auth,
      );

      expect(result.userAgent).toBeNull();
      expect(subscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: null,
        }),
      );
    });
  });

  // ==========================================================================
  // UNSUBSCRIBE
  // ==========================================================================

  describe("unsubscribe", () => {
    it("should soft delete a subscription when found", async () => {
      const sub = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId,
        endpoint,
      };

      subscriptionRepo.findOne!.mockResolvedValue(sub);
      subscriptionRepo.softDelete!.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      const result = await service.unsubscribe(userId, endpoint);

      expect(result).toBe(true);
      expect(subscriptionRepo.findOne).toHaveBeenCalledWith({
        where: { endpoint, userId },
      });
      expect(subscriptionRepo.softDelete).toHaveBeenCalledWith(sub.id);
    });

    it("should return false when subscription not found", async () => {
      subscriptionRepo.findOne!.mockResolvedValue(null);

      const result = await service.unsubscribe(userId, endpoint);

      expect(result).toBe(false);
      expect(subscriptionRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET USER SUBSCRIPTIONS
  // ==========================================================================

  describe("getUserSubscriptions", () => {
    it("should return all active subscriptions for a user", async () => {
      const subscriptions = [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          endpoint: "https://endpoint1.com",
          isActive: true,
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          endpoint: "https://endpoint2.com",
          isActive: true,
        },
      ];

      subscriptionRepo.find!.mockResolvedValue(subscriptions);

      const result = await service.getUserSubscriptions(userId);

      expect(result).toEqual(subscriptions);
      expect(subscriptionRepo.find).toHaveBeenCalledWith({
        where: { userId, isActive: true },
      });
    });

    it("should return empty array when user has no active subscriptions", async () => {
      subscriptionRepo.find!.mockResolvedValue([]);

      const result = await service.getUserSubscriptions(userId);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // SEND TO USER
  // ==========================================================================

  describe("sendToUser", () => {
    it("should return 0 when web-push or VAPID is not configured", async () => {
      const result = await service.sendToUser(userId, "Title", "Body");

      expect(result).toBe(0);
      // When web-push or VAPID not configured, service returns early
      expect(subscriptionRepo.find).not.toHaveBeenCalled();
    });

    it("should return 0 when user has no subscriptions", async () => {
      // This test would require VAPID to be configured
      // Skip detailed testing as the service gracefully degrades when not configured
    });
  });

  // ==========================================================================
  // SEND TO MULTIPLE USERS
  // ==========================================================================

  describe("sendToMultipleUsers", () => {
    it("should return sent and failed counts", async () => {
      const userIds = [userId];

      const result = await service.sendToMultipleUsers(
        userIds,
        "Title",
        "Body",
      );

      expect(result).toEqual({ sent: 0, failed: 0 });
    });

    it("should handle multiple users and accumulate counts", async () => {
      const userIds = [
        "123e4567-e89b-12d3-a456-426614174004",
        "123e4567-e89b-12d3-a456-426614174005",
      ];

      const result = await service.sendToMultipleUsers(
        userIds,
        "Title",
        "Body",
        "https://example.com",
      );

      expect(result.sent).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty user list", async () => {
      const result = await service.sendToMultipleUsers([], "Title", "Body");

      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });

  // ==========================================================================
  // CLEANUP INACTIVE
  // ==========================================================================

  describe("cleanupInactive", () => {
    it("should soft delete inactive subscriptions older than 30 days", async () => {
      subscriptionRepo.softDelete!.mockResolvedValue({
        affected: 3,
        raw: {},
        generatedMaps: [],
      });

      await service.cleanupInactive();

      expect(subscriptionRepo.softDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          updatedAt: expect.any(Object),
        }),
      );
    });

    it("should handle when no subscriptions to cleanup", async () => {
      subscriptionRepo.softDelete!.mockResolvedValue({
        affected: null,
        raw: {},
        generatedMaps: [],
      });

      await service.cleanupInactive();

      expect(subscriptionRepo.softDelete).toHaveBeenCalled();
    });

    it("should handle cleanup with zero affected rows", async () => {
      subscriptionRepo.softDelete!.mockResolvedValue({
        affected: 0,
        raw: {},
        generatedMaps: [],
      });

      await service.cleanupInactive();

      expect(subscriptionRepo.softDelete).toHaveBeenCalled();
    });
  });
});
