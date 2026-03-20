import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AchievementService } from "./achievement.service";
import {
  Achievement,
  AchievementCategory,
  AchievementConditionType,
  AchievementRarity,
} from "../entities/achievement.model";
import { UserAchievement } from "../entities/user-achievement.model";
import { User } from "../../users/entities/user.entity";
import { LoyaltyService } from "../loyalty.service";
import { PointsSource } from "../constants/loyalty.constants";

describe("AchievementService", () => {
  let service: AchievementService;
  let achievementRepo: any;
  let userAchievementRepo: any;
  let userRepo: any;
  let loyaltyService: any;
  let eventEmitter: any;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const achievementId = "ach-uuid-1";

  const mockAchievement: Partial<Achievement> = {
    id: achievementId,
    organizationId: orgId,
    title: "First Order",
    titleUz: "Birinchi buyurtma",
    description: "Make your first order",
    descriptionUz: "Birinchi buyurtmangizni bering",
    icon: "🎉",
    category: AchievementCategory.BEGINNER,
    rarity: AchievementRarity.COMMON,
    conditionType: AchievementConditionType.FIRST_ORDER,
    conditionValue: 1,
    pointsReward: 50,
    isActive: true,
    isHidden: false,
    sortOrder: 1,
    createdAt: new Date("2026-01-01"),
  };

  const mockUserAchievement: Partial<UserAchievement> = {
    id: "ua-uuid-1",
    organizationId: orgId,
    userId,
    achievementId,
    achievement: mockAchievement as Achievement,
    unlockedAt: new Date("2026-02-01"),
    pointsAwarded: 50,
  };

  const mockUser: Partial<User> = {
    id: userId,
    totalOrders: 5,
    totalSpent: 50000,
    currentStreak: 3,
    loyaltyLevel: "bronze" as any,
  };

  const mockQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementService,
        {
          provide: getRepositoryToken(Achievement),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto })),
            save: jest
              .fn()
              .mockImplementation((entity) =>
                Promise.resolve({ id: achievementId, ...entity }),
              ),
            findOne: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
            softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue({ ...mockQb }),
          },
        },
        {
          provide: getRepositoryToken(UserAchievement),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto })),
            save: jest
              .fn()
              .mockImplementation((entity) =>
                Promise.resolve({ id: "ua-uuid-new", ...entity }),
              ),
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue({ ...mockQb }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockUser),
          },
        },
        {
          provide: LoyaltyService,
          useValue: {
            earnPoints: jest.fn().mockResolvedValue({ newBalance: 550 }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AchievementService>(AchievementService);
    achievementRepo = module.get(getRepositoryToken(Achievement));
    userAchievementRepo = module.get(getRepositoryToken(UserAchievement));
    userRepo = module.get(getRepositoryToken(User));
    loyaltyService = module.get(LoyaltyService);
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createAchievement", () => {
    it("should create and return an achievement", async () => {
      const dto = {
        title: "First Order",
        description: "Make your first order",
        icon: "🎉",
        category: AchievementCategory.BEGINNER,
        rarity: AchievementRarity.COMMON,
        conditionType: AchievementConditionType.FIRST_ORDER,
        conditionValue: 1,
        pointsReward: 50,
      } as any;

      const result = await service.createAchievement(orgId, dto);

      expect(achievementRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          title: "First Order",
        }),
      );
      expect(achievementRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty("title", "First Order");
    });
  });

  describe("updateAchievement", () => {
    it("should update achievement fields", async () => {
      achievementRepo.findOne.mockResolvedValue({ ...mockAchievement });

      const result = await service.updateAchievement(achievementId, orgId, {
        title: "Updated",
      } as any);

      expect(achievementRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty("title", "Updated");
    });

    it("should throw NotFoundException when not found", async () => {
      achievementRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateAchievement("bad-id", orgId, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteAchievement", () => {
    it("should soft-delete an achievement", async () => {
      achievementRepo.findOne.mockResolvedValue({ ...mockAchievement });

      await service.deleteAchievement(achievementId, orgId);

      expect(achievementRepo.softDelete).toHaveBeenCalledWith(achievementId);
    });

    it("should throw NotFoundException when not found", async () => {
      achievementRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteAchievement("bad-id", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getUserAchievements", () => {
    it("should return user achievements with relations", async () => {
      userAchievementRepo.find.mockResolvedValue([mockUserAchievement]);

      const result = await service.getUserAchievements(userId, orgId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("pointsAwarded", 50);
      expect(result[0]).toHaveProperty("unlockedAt");
      expect(result[0].achievement).toHaveProperty("title", "First Order");
    });

    it("should return empty array when no achievements", async () => {
      userAchievementRepo.find.mockResolvedValue([]);

      const result = await service.getUserAchievements(userId, orgId);

      expect(result).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("should return achievement statistics", async () => {
      achievementRepo.count.mockResolvedValue(10);
      userAchievementRepo.count.mockResolvedValue(25);
      const qb = { ...mockQb };
      qb.getRawOne.mockResolvedValue({ total: "500" });
      userAchievementRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getStats(orgId);

      expect(result.totalAchievements).toBe(10);
      expect(result.totalUnlocked).toBe(25);
      expect(result.totalRewardsClaimed).toBe(500);
    });

    it("should handle null rewards total", async () => {
      achievementRepo.count.mockResolvedValue(0);
      userAchievementRepo.count.mockResolvedValue(0);
      const qb = { ...mockQb };
      qb.getRawOne.mockResolvedValue(null);
      userAchievementRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getStats(orgId);

      expect(result.totalRewardsClaimed).toBe(0);
    });
  });

  describe("checkAndUnlock", () => {
    it("should unlock achievement when condition is met (TOTAL_ORDERS)", async () => {
      const ach = {
        ...mockAchievement,
        conditionType: AchievementConditionType.TOTAL_ORDERS,
        conditionValue: 5,
        pointsReward: 100,
      };
      achievementRepo.find.mockResolvedValue([ach]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue({ ...mockUser, totalOrders: 5 });
      userAchievementRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "order.completed",
      );

      expect(result).toHaveLength(1);
      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          source: PointsSource.ACHIEVEMENT,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "achievement.unlocked",
        expect.any(Object),
      );
    });

    it("should skip already unlocked achievements", async () => {
      achievementRepo.find.mockResolvedValue([mockAchievement]);
      userAchievementRepo.find.mockResolvedValue([{ achievementId }]);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "order.completed",
      );

      expect(result).toEqual([]);
      expect(userAchievementRepo.save).not.toHaveBeenCalled();
    });

    it("should return empty when no active achievements", async () => {
      achievementRepo.find.mockResolvedValue([]);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "order.completed",
      );

      expect(result).toEqual([]);
    });

    it("should return empty when user not found", async () => {
      achievementRepo.find.mockResolvedValue([mockAchievement]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "order.completed",
      );

      expect(result).toEqual([]);
    });

    it("should evaluate TOTAL_SPENT condition", async () => {
      const ach = {
        ...mockAchievement,
        conditionType: AchievementConditionType.TOTAL_SPENT,
        conditionValue: 10000,
      };
      achievementRepo.find.mockResolvedValue([ach]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue({ ...mockUser, totalSpent: 50000 });
      userAchievementRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "order.completed",
      );

      expect(result).toHaveLength(1);
    });

    it("should evaluate STREAK_DAYS condition", async () => {
      const ach = {
        ...mockAchievement,
        conditionType: AchievementConditionType.STREAK_DAYS,
        conditionValue: 3,
      };
      achievementRepo.find.mockResolvedValue([ach]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue({ ...mockUser, currentStreak: 3 });
      userAchievementRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "login.streak",
      );

      expect(result).toHaveLength(1);
    });

    it("should evaluate NIGHT_ORDER condition with eventData", async () => {
      const ach = {
        ...mockAchievement,
        conditionType: AchievementConditionType.NIGHT_ORDER,
        conditionValue: 1,
      };
      achievementRepo.find.mockResolvedValue([ach]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue(mockUser);
      userAchievementRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "order.completed",
        { orderHour: 3 },
      );

      expect(result).toHaveLength(1);
    });

    it("should reject NIGHT_ORDER when hour >= 6", async () => {
      const ach = {
        ...mockAchievement,
        conditionType: AchievementConditionType.NIGHT_ORDER,
        conditionValue: 1,
      };
      achievementRepo.find.mockResolvedValue([ach]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "order.completed",
        { orderHour: 10 },
      );

      expect(result).toEqual([]);
    });

    it("should evaluate WEEKEND_ORDER condition", async () => {
      const ach = {
        ...mockAchievement,
        conditionType: AchievementConditionType.WEEKEND_ORDER,
        conditionValue: 1,
      };
      achievementRepo.find.mockResolvedValue([ach]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue(mockUser);
      userAchievementRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "order.completed",
        { orderDay: 6 },
      );

      expect(result).toHaveLength(1);
    });

    it("should evaluate REFERRALS_COUNT condition", async () => {
      const ach = {
        ...mockAchievement,
        conditionType: AchievementConditionType.REFERRALS_COUNT,
        conditionValue: 5,
      };
      achievementRepo.find.mockResolvedValue([ach]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue(mockUser);
      userAchievementRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "referral.created",
        { referralCount: 5 },
      );

      expect(result).toHaveLength(1);
    });

    it("should not award points when pointsReward is 0", async () => {
      const ach = {
        ...mockAchievement,
        conditionType: AchievementConditionType.FIRST_ORDER,
        conditionValue: 1,
        pointsReward: 0,
      };
      achievementRepo.find.mockResolvedValue([ach]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue({ ...mockUser, totalOrders: 1 });
      userAchievementRepo.findOne.mockResolvedValue(null);

      await service.checkAndUnlock(userId, orgId, "order.completed");

      expect(loyaltyService.earnPoints).not.toHaveBeenCalled();
    });

    it("should handle duplicate key error gracefully (race condition)", async () => {
      const ach = {
        ...mockAchievement,
        conditionType: AchievementConditionType.FIRST_ORDER,
        conditionValue: 1,
        pointsReward: 50,
      };
      achievementRepo.find.mockResolvedValue([ach]);
      userAchievementRepo.find.mockResolvedValue([]);
      userRepo.findOne.mockResolvedValue({ ...mockUser, totalOrders: 1 });
      userAchievementRepo.findOne.mockResolvedValue(null);
      userAchievementRepo.save.mockRejectedValue(
        new Error("duplicate key value violates unique constraint"),
      );

      const result = await service.checkAndUnlock(
        userId,
        orgId,
        "order.completed",
      );

      expect(result).toEqual([]);
    });
  });

  describe("seedDefaults", () => {
    it("should seed default achievements for new org", async () => {
      achievementRepo.findOne.mockResolvedValue(null);

      const result = await service.seedDefaults(orgId);

      expect(result.length).toBeGreaterThan(0);
      expect(achievementRepo.create).toHaveBeenCalled();
      expect(achievementRepo.save).toHaveBeenCalled();
    });

    it("should skip already existing achievements", async () => {
      achievementRepo.findOne.mockResolvedValue({ id: "existing" });

      const result = await service.seedDefaults(orgId);

      expect(result).toEqual([]);
      expect(achievementRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("getAchievements", () => {
    it("should return visible achievements with unlock counts", async () => {
      const qb = { ...mockQb };
      qb.getMany.mockResolvedValue([mockAchievement]);
      achievementRepo.createQueryBuilder.mockReturnValue(qb);

      const uaQb = { ...mockQb };
      uaQb.getRawMany.mockResolvedValue([{ achievementId, count: "5" }]);
      userAchievementRepo.createQueryBuilder.mockReturnValue(uaQb);

      const result = await service.getAchievements(orgId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("unlockedCount", 5);
    });

    it("should filter hidden achievements without userId", async () => {
      const hidden = { ...mockAchievement, isHidden: true };
      const qb = { ...mockQb };
      qb.getMany.mockResolvedValue([hidden]);
      achievementRepo.createQueryBuilder.mockReturnValue(qb);

      const uaQb = { ...mockQb };
      uaQb.getRawMany.mockResolvedValue([]);
      userAchievementRepo.createQueryBuilder.mockReturnValue(uaQb);

      const result = await service.getAchievements(orgId);

      expect(result).toEqual([]);
    });

    it("should show hidden achievements if user has unlocked them", async () => {
      const hidden = { ...mockAchievement, isHidden: true };
      const qb = { ...mockQb };
      qb.getMany.mockResolvedValue([hidden]);
      achievementRepo.createQueryBuilder.mockReturnValue(qb);

      const uaQb = { ...mockQb };
      uaQb.getRawMany.mockResolvedValue([]);
      userAchievementRepo.createQueryBuilder.mockReturnValue(uaQb);
      userAchievementRepo.find.mockResolvedValue([
        { achievementId, unlockedAt: new Date() },
      ]);

      const result = await service.getAchievements(orgId, userId);

      expect(result).toHaveLength(1);
    });
  });
});
