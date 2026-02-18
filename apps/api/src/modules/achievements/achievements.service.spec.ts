import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AchievementsService } from "./achievements.service";
import { Achievement } from "./entities/achievement.entity";
import { UserAchievement } from "./entities/user-achievement.entity";
import { LoyaltyService } from "../loyalty/loyalty.service";
import { AchievementConditionType } from "./constants/achievement.constants";

describe("AchievementsService", () => {
  let service: AchievementsService;

  const mockAchievementRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ count: "0", total: "0" }),
    })),
  };

  const mockUserAchievementRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ count: "0" }),
    })),
  };

  const mockLoyaltyService = {
    earnPoints: jest.fn().mockResolvedValue({ newBalance: 200 }),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementsService,
        {
          provide: getRepositoryToken(Achievement),
          useValue: mockAchievementRepo,
        },
        {
          provide: getRepositoryToken(UserAchievement),
          useValue: mockUserAchievementRepo,
        },
        { provide: LoyaltyService, useValue: mockLoyaltyService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AchievementsService>(AchievementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createAchievement", () => {
    it("should create an achievement", async () => {
      const dto = {
        name: "Test Achievement",
        description: "Test Description",
        condition_type: AchievementConditionType.ORDER_COUNT,
        condition_value: 10,
        bonus_points: 100,
      };
      const created = { id: "uuid-1", ...dto, organization_id: "org-1" };
      mockAchievementRepo.create.mockReturnValue(created);
      mockAchievementRepo.save.mockResolvedValue(created);

      const result = await service.createAchievement("org-1", dto);
      expect(result).toEqual(created);
      expect(mockAchievementRepo.create).toHaveBeenCalledWith({
        ...dto,
        organization_id: "org-1",
      });
    });
  });

  describe("deleteAchievement", () => {
    it("should soft delete an achievement", async () => {
      mockAchievementRepo.findOne.mockResolvedValue({
        id: "uuid-1",
        organization_id: "org-1",
      });
      mockAchievementRepo.softDelete.mockResolvedValue(undefined);

      await service.deleteAchievement("uuid-1", "org-1");
      expect(mockAchievementRepo.softDelete).toHaveBeenCalledWith("uuid-1");
    });

    it("should throw when deleting global achievement", async () => {
      mockAchievementRepo.findOne.mockResolvedValue({
        id: "uuid-1",
        organization_id: null,
      });

      await expect(
        service.deleteAchievement("uuid-1", "org-1"),
      ).rejects.toThrow("Cannot delete global achievements");
    });
  });

  describe("getUserAchievementsSummary", () => {
    it("should return summary", async () => {
      mockAchievementRepo.find.mockResolvedValue([]);
      mockUserAchievementRepo.find.mockResolvedValue([]);

      const result = await service.getUserAchievementsSummary("user-1");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("unlocked");
      expect(result).toHaveProperty("by_category");
    });
  });

  describe("getStats", () => {
    it("should return achievement stats", async () => {
      const result = await service.getStats("org-1");
      expect(result).toHaveProperty("total_achievements");
      expect(result).toHaveProperty("users_with_achievements");
      expect(result).toHaveProperty("most_popular");
      expect(result).toHaveProperty("total_points_distributed");
    });
  });
});
