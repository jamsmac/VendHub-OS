import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { QuestService } from "./quest.service";
import {
  Quest,
  QuestPeriod,
  QuestType,
  QuestDifficulty,
} from "../entities/quest.model";
import { UserQuest, UserQuestStatus } from "../entities/user-quest.model";
import { LoyaltyService } from "../loyalty.service";
import { PointsSource } from "../constants/loyalty.constants";

describe("QuestService", () => {
  let service: QuestService;
  let questRepo: any;
  let userQuestRepo: any;
  let loyaltyService: any;
  let eventEmitter: any;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const questId = "quest-uuid-1";

  const mockQuest: Partial<Quest> = {
    id: questId,
    organizationId: orgId,
    title: "Make 3 orders",
    titleUz: "3 ta buyurtma bering",
    description: "Complete 3 orders",
    descriptionUz: "3 ta buyurtma bajaring",
    period: QuestPeriod.DAILY,
    type: QuestType.ORDER_COUNT,
    difficulty: QuestDifficulty.EASY,
    targetValue: 3,
    rewardPoints: 50,
    additionalRewards: null as any,
    metadata: null as any,
    requirements: null as any,
    icon: "🎯",
    color: "#4CAF50",
    imageUrl: null as any,
    startsAt: null as any,
    endsAt: null as any,
    isActive: true,
    isFeatured: false,
    displayOrder: 0,
    totalStarted: 0,
    totalCompleted: 0,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  const mockUserQuest: Partial<UserQuest> = {
    id: "uq-uuid-1",
    userId,
    questId,
    quest: mockQuest as Quest,
    status: UserQuestStatus.IN_PROGRESS,
    currentValue: 1,
    targetValue: 3,
    rewardPoints: 50,
    startedAt: new Date("2026-01-01"),
    completedAt: null as any,
    claimedAt: null as any,
    expiredAt: null as any,
    periodStart: new Date("2026-01-01"),
    periodEnd: new Date("2026-01-01"),
  };

  const createMockQb = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  const mockQb = createMockQb();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestService,
        {
          provide: getRepositoryToken(Quest),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto })),
            save: jest
              .fn()
              .mockImplementation((entity) =>
                Promise.resolve(
                  Array.isArray(entity) ? entity : { id: questId, ...entity },
                ),
              ),
            findOne: jest.fn(),
            softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
            count: jest.fn().mockResolvedValue(0),
            increment: jest.fn().mockResolvedValue({ affected: 1 }),
            createQueryBuilder: jest.fn().mockReturnValue({ ...mockQb }),
          },
        },
        {
          provide: getRepositoryToken(UserQuest),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto })),
            save: jest
              .fn()
              .mockImplementation((entity) =>
                Promise.resolve(
                  Array.isArray(entity)
                    ? entity
                    : { id: "uq-uuid-1", ...entity },
                ),
              ),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({ ...mockQb }),
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

    service = module.get<QuestService>(QuestService);
    questRepo = module.get(getRepositoryToken(Quest));
    userQuestRepo = module.get(getRepositoryToken(UserQuest));
    loyaltyService = module.get(LoyaltyService);
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createQuest", () => {
    it("should create a quest and emit event", async () => {
      const dto = {
        title: "Make 3 orders",
        titleUz: "3 ta buyurtma bering",
        description: "Complete 3 orders",
        descriptionUz: "3 ta buyurtma bajaring",
        period: QuestPeriod.DAILY,
        type: QuestType.ORDER_COUNT,
        difficulty: QuestDifficulty.EASY,
        targetValue: 3,
        rewardPoints: 50,
      } as any;

      const result = await service.createQuest(orgId, dto);

      expect(questRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          title: dto.title,
          targetValue: 3,
          rewardPoints: 50,
          icon: "🎯",
          color: "#4CAF50",
        }),
      );
      expect(questRepo.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "quest.created",
        expect.objectContaining({
          organizationId: orgId,
        }),
      );
      expect(result).toHaveProperty("title", dto.title);
    });

    it("should use default icon and color when not provided", async () => {
      const dto = {
        title: "Test",
        description: "Desc",
        period: QuestPeriod.DAILY,
        type: QuestType.ORDER_COUNT,
        targetValue: 1,
        rewardPoints: 10,
      } as any;

      await service.createQuest(orgId, dto);

      expect(questRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          icon: "🎯",
          color: "#4CAF50",
        }),
      );
    });
  });

  describe("updateQuest", () => {
    it("should update quest fields", async () => {
      questRepo.findOne.mockResolvedValue({ ...mockQuest });

      const result = await service.updateQuest(questId, orgId, {
        title: "Updated",
      } as any);

      expect(questRepo.findOne).toHaveBeenCalledWith({
        where: { id: questId, organizationId: orgId },
      });
      expect(questRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty("title", "Updated");
    });

    it("should throw NotFoundException when quest not found", async () => {
      questRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateQuest("bad-id", orgId, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should clear endsAt when set to empty string", async () => {
      questRepo.findOne.mockResolvedValue({ ...mockQuest });

      await service.updateQuest(questId, orgId, { endsAt: "" } as any);

      expect(questRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          endsAt: null,
        }),
      );
    });
  });

  describe("deleteQuest", () => {
    it("should soft-delete a quest", async () => {
      questRepo.findOne.mockResolvedValue({ ...mockQuest });

      await service.deleteQuest(questId, orgId);

      expect(questRepo.softDelete).toHaveBeenCalledWith(questId);
    });

    it("should throw NotFoundException when quest not found", async () => {
      questRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteQuest("bad-id", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getQuests", () => {
    it("should return paginated quests", async () => {
      const qb = { ...mockQb };
      qb.getManyAndCount.mockResolvedValue([[mockQuest], 1]);
      questRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getQuests(orgId, {
        page: 1,
        limit: 50,
      } as any);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.totalPages).toBe(1);
    });

    it("should apply period and type filters", async () => {
      const qb = { ...mockQb };
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      questRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getQuests(orgId, {
        period: QuestPeriod.WEEKLY,
        type: QuestType.REFERRAL,
        isActive: true,
        page: 1,
        limit: 10,
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith("q.period = :period", {
        period: QuestPeriod.WEEKLY,
      });
      expect(qb.andWhere).toHaveBeenCalledWith("q.type = :type", {
        type: QuestType.REFERRAL,
      });
      expect(qb.andWhere).toHaveBeenCalledWith("q.isActive = :isActive", {
        isActive: true,
      });
    });
  });

  describe("getQuestStats", () => {
    it("should return quest statistics", async () => {
      questRepo.count.mockResolvedValueOnce(10).mockResolvedValueOnce(5);

      const qb1 = { ...mockQb };
      qb1.getRawOne.mockResolvedValue({
        total: "20",
        completed: "8",
        pointsRewarded: "400",
      });
      userQuestRepo.createQueryBuilder.mockReturnValue(qb1);

      const qb2 = { ...mockQb };
      qb2.getRawMany.mockResolvedValue([
        { period: "daily", count: "3", completions: "2" },
      ]);
      questRepo.createQueryBuilder.mockReturnValue(qb2);

      const result = await service.getQuestStats(orgId);

      expect(result.totalQuests).toBe(10);
      expect(result.activeQuests).toBe(5);
      expect(result.totalCompleted).toBe(8);
      expect(result.totalPointsRewarded).toBe(400);
      expect(result.byPeriod).toHaveLength(1);
    });
  });

  describe("claimReward", () => {
    it("should claim reward for a completed quest", async () => {
      const completedUq = {
        ...mockUserQuest,
        status: UserQuestStatus.COMPLETED,
        quest: { ...mockQuest, period: QuestPeriod.DAILY },
      };
      const qb = { ...mockQb };
      qb.getOne.mockResolvedValue(completedUq);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.claimReward(userId, questId, orgId);

      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBe(50);
      expect(result.newBalance).toBe(550);
      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          organizationId: orgId,
          amount: 50,
          source: PointsSource.DAILY_QUEST,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "quest.claimed",
        expect.any(Object),
      );
    });

    it("should throw BadRequestException when quest not completed", async () => {
      const qb = { ...mockQb };
      qb.getOne.mockResolvedValue(null);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.claimReward(userId, questId, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should use WEEKLY_QUEST source for weekly period", async () => {
      const completedUq = {
        ...mockUserQuest,
        status: UserQuestStatus.COMPLETED,
        quest: { ...mockQuest, period: QuestPeriod.WEEKLY },
      };
      const qb = { ...mockQb };
      qb.getOne.mockResolvedValue(completedUq);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb);

      await service.claimReward(userId, questId, orgId);

      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          source: PointsSource.WEEKLY_QUEST,
        }),
      );
    });

    it("should use MONTHLY_QUEST source for monthly period", async () => {
      const completedUq = {
        ...mockUserQuest,
        status: UserQuestStatus.COMPLETED,
        quest: { ...mockQuest, period: QuestPeriod.MONTHLY },
      };
      const qb = { ...mockQb };
      qb.getOne.mockResolvedValue(completedUq);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb);

      await service.claimReward(userId, questId, orgId);

      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          source: PointsSource.MONTHLY_QUEST,
        }),
      );
    });
  });

  describe("updateProgress", () => {
    it("should increment progress for matching user quests", async () => {
      const uq = {
        ...mockUserQuest,
        currentValue: 1,
        targetValue: 3,
        quest: { ...mockQuest, type: QuestType.ORDER_COUNT },
      };
      const qb = { ...mockQb };
      qb.getMany.mockResolvedValue([uq]);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb);

      await service.updateProgress(userId, orgId, "order.completed", {});

      expect(userQuestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentValue: 2,
        }),
      );
    });

    it("should mark quest as completed when target reached", async () => {
      const uq = {
        ...mockUserQuest,
        currentValue: 2,
        targetValue: 3,
        quest: { ...mockQuest, type: QuestType.ORDER_COUNT },
      };
      const qb = { ...mockQb };
      qb.getMany.mockResolvedValue([uq]);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb);

      await service.updateProgress(userId, orgId, "order.completed", {});

      expect(uq.status).toBe(UserQuestStatus.COMPLETED);
      expect(uq.completedAt).toBeInstanceOf(Date);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "quest.completed",
        expect.objectContaining({
          userId,
          questId,
        }),
      );
    });

    it("should not exceed target value", async () => {
      const uq = {
        ...mockUserQuest,
        currentValue: 2,
        targetValue: 3,
        quest: { ...mockQuest, type: QuestType.ORDER_AMOUNT },
      };
      const qb = { ...mockQb };
      qb.getMany.mockResolvedValue([uq]);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb);

      await service.updateProgress(userId, orgId, "order.completed", {
        amount: 100,
      });

      expect(uq.currentValue).toBe(3);
    });

    it("should use amount from eventData for ORDER_AMOUNT type", async () => {
      const uq = {
        ...mockUserQuest,
        currentValue: 0,
        targetValue: 10000,
        quest: { ...mockQuest, type: QuestType.ORDER_AMOUNT },
      };
      const qb = { ...mockQb };
      qb.getMany.mockResolvedValue([uq]);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb);

      await service.updateProgress(userId, orgId, "order.completed", {
        amount: 5000,
      });

      expect(uq.currentValue).toBe(5000);
    });

    it("should skip unknown event types", async () => {
      await service.updateProgress(userId, orgId, "unknown.event", {});

      expect(userQuestRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should skip if increment is zero", async () => {
      const uq = {
        ...mockUserQuest,
        currentValue: 0,
        targetValue: 100,
        quest: { ...mockQuest, type: QuestType.ORDER_AMOUNT },
      };
      const qb = { ...mockQb };
      qb.getMany.mockResolvedValue([uq]);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb);

      await service.updateProgress(userId, orgId, "order.completed", {
        amount: 0,
      });

      expect(userQuestRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("expireOverdueQuests", () => {
    it("should expire in-progress user quests past their period end", async () => {
      const expiredUq = {
        ...mockUserQuest,
        status: UserQuestStatus.IN_PROGRESS,
        periodEnd: new Date("2025-12-31"),
      };
      const uqQb = createMockQb();
      uqQb.getMany.mockResolvedValue([expiredUq]);
      userQuestRepo.createQueryBuilder.mockReturnValue(uqQb);

      const questQb = createMockQb();
      questQb.getMany.mockResolvedValue([]);
      questRepo.createQueryBuilder.mockReturnValue(questQb);

      await service.expireOverdueQuests();

      expect(expiredUq.status).toBe(UserQuestStatus.EXPIRED);
      expect(expiredUq.expiredAt).toBeInstanceOf(Date);
      expect(userQuestRepo.save).toHaveBeenCalledWith([expiredUq]);
    });

    it("should deactivate quests past their endsAt date", async () => {
      const uqQb = createMockQb();
      uqQb.getMany.mockResolvedValue([]);
      userQuestRepo.createQueryBuilder.mockReturnValue(uqQb);

      const endedQuest = {
        ...mockQuest,
        isActive: true,
        endsAt: new Date("2025-12-31"),
      };
      const questQb = createMockQb();
      questQb.getMany.mockResolvedValue([endedQuest]);
      questRepo.createQueryBuilder.mockReturnValue(questQb);

      await service.expireOverdueQuests();

      expect(endedQuest.isActive).toBe(false);
      expect(questRepo.save).toHaveBeenCalledWith([endedQuest]);
    });

    it("should not save when there are no expired quests", async () => {
      const uqQb = createMockQb();
      uqQb.getMany.mockResolvedValue([]);
      userQuestRepo.createQueryBuilder.mockReturnValue(uqQb);

      const questQb = createMockQb();
      questQb.getMany.mockResolvedValue([]);
      questRepo.createQueryBuilder.mockReturnValue(questQb);

      await service.expireOverdueQuests();

      expect(userQuestRepo.save).not.toHaveBeenCalled();
      expect(questRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("getActiveQuests", () => {
    it("should return active quests within date range", async () => {
      const qb = { ...mockQb };
      qb.getMany.mockResolvedValue([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getActiveQuests(orgId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("title", mockQuest.title);
    });
  });

  describe("getUserQuests", () => {
    it("should return user quest progress excluding expired", async () => {
      const qb1 = { ...mockQb };
      qb1.getMany.mockResolvedValue([]);
      questRepo.createQueryBuilder.mockReturnValue(qb1);

      const qb2 = { ...mockQb };
      qb2.getMany.mockResolvedValue([mockUserQuest]);
      userQuestRepo.createQueryBuilder.mockReturnValue(qb2);

      const result = await service.getUserQuests(userId, orgId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("questId", questId);
      expect(result[0]).toHaveProperty("progressPercent");
    });
  });
});
