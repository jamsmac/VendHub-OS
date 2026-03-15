import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";

import { QuestsService } from "./quests.service";
import { Quest } from "./entities/quest.entity";
import { UserQuest } from "./entities/user-quest.entity";
import { User } from "../users/entities/user.entity";
import {
  QuestPeriod,
  QuestType,
  QuestStatus,
  QuestDifficulty,
} from "./constants/quest.constants";
import { QuestProgressService } from "./services/quest-progress.service";
import {
  CreateQuestDto,
  UpdateQuestDto,
  QuestFilterDto,
} from "./dto/quest.dto";

describe("QuestsService", () => {
  let service: QuestsService;
  let questRepo: jest.Mocked<Repository<Quest>>;
  let userQuestRepo: jest.Mocked<Repository<UserQuest>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let questProgressService: jest.Mocked<QuestProgressService>;

  const orgId = "org-uuid-1";

  // ---------------------------------------------------------------------------
  // Mock entities
  // ---------------------------------------------------------------------------

  const mockQuestBase = {
    id: "quest-uuid-1",
    organizationId: orgId,
    title: "First order of the day",
    titleUz: "Kunning birinchi buyurtmasi",
    description: "Make at least one order",
    descriptionUz: "Kamida bitta buyurtma bering",
    period: QuestPeriod.DAILY,
    type: QuestType.ORDER_COUNT,
    difficulty: QuestDifficulty.MEDIUM,
    targetValue: 3,
    rewardPoints: 50,
    additionalRewards: [] as unknown[],
    metadata: null as Record<string, unknown> | null,
    requirements: null as Record<string, unknown> | null,
    icon: "🎯",
    color: "#4CAF50",
    imageUrl: null as string | null,
    startsAt: null as Date | null,
    endsAt: null as Date | null,
    isActive: true,
    isFeatured: false,
    displayOrder: 0,
    totalStarted: 10,
    totalCompleted: 5,
    userQuests: [] as UserQuest[],
    organization: null as unknown,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null as Date | null,
    createdById: null as string | null,
    updatedById: null as string | null,
  };
  Object.defineProperties(mockQuestBase, {
    completionRate: {
      get() {
        return this.totalStarted === 0
          ? 0
          : Math.round((this.totalCompleted / this.totalStarted) * 100);
      },
    },
    isExpired: {
      get() {
        return this.endsAt ? new Date() > this.endsAt : false;
      },
    },
    isStarted: {
      get() {
        return this.startsAt ? new Date() >= this.startsAt : true;
      },
    },
    isAvailable: {
      get() {
        return this.isActive && this.isStarted && !this.isExpired;
      },
    },
  });
  const mockQuest = mockQuestBase as unknown as Quest;

  const mockUser: Partial<User> = {
    id: "user-uuid-1",
    organizationId: orgId,
    email: "test@vendhub.uz",
    firstName: "Test",
    lastName: "User",
    pointsBalance: 500,
  };

  const mockUserQuestBase = {
    id: "uq-uuid-1",
    userId: "user-uuid-1",
    questId: "quest-uuid-1",
    quest: mockQuest,
    user: null as User | null,
    status: QuestStatus.COMPLETED,
    currentValue: 3,
    targetValue: 3,
    progressDetails: {},
    periodStart: new Date("2025-01-01"),
    periodEnd: new Date("2025-01-02"),
    rewardPoints: 50,
    pointsClaimed: null as number | null,
    rewardsClaimed: null as Record<string, unknown> | null,
    completedAt: new Date("2025-01-01T14:00:00Z") as Date | null,
    claimedAt: null as Date | null,
    expiredAt: null as Date | null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    deletedAt: null as Date | null,
    createdById: null as string | null,
    updatedById: null as string | null,
  };
  Object.defineProperties(mockUserQuestBase, {
    progressPercent: {
      get() {
        return this.targetValue === 0
          ? 100
          : Math.min(
              100,
              Math.floor((this.currentValue / this.targetValue) * 100),
            );
      },
    },
    isComplete: {
      get() {
        return this.currentValue >= this.targetValue;
      },
    },
    canClaim: {
      get() {
        return this.status === QuestStatus.COMPLETED;
      },
    },
    remaining: {
      get() {
        return Math.max(0, this.targetValue - this.currentValue);
      },
    },
  });
  const mockUserQuest = mockUserQuestBase as unknown as UserQuest;

  // ---------------------------------------------------------------------------
  // Mock query builder helpers
  // ---------------------------------------------------------------------------

  const createMockQueryBuilder = (
    result: unknown[] = [],
    rawResult: Record<string, unknown> | null = null,
  ) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getOne: jest.fn().mockResolvedValue(result[0] || null),
    getCount: jest.fn().mockResolvedValue(result.length),
    getRawOne: jest.fn().mockResolvedValue(rawResult),
    getRawMany: jest.fn().mockResolvedValue(rawResult || []),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  });

  // ---------------------------------------------------------------------------
  // Test module setup
  // ---------------------------------------------------------------------------

  beforeEach(async () => {
    const mockQuestQB = createMockQueryBuilder([mockQuest]);
    const mockUserQuestQB = createMockQueryBuilder([mockUserQuest]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestsService,
        {
          provide: getRepositoryToken(Quest),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            softDelete: jest.fn(),
            increment: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQuestQB),
          },
        },
        {
          provide: getRepositoryToken(UserQuest),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockUserQuestQB),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: QuestProgressService,
          useValue: {
            updateProgress: jest.fn(),
            checkCompletion: jest.fn(),
            getProgress: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuestsService>(QuestsService);
    questRepo = module.get(getRepositoryToken(Quest));
    userQuestRepo = module.get(getRepositoryToken(UserQuest));
    userRepo = module.get(getRepositoryToken(User));
    questProgressService = module.get(
      QuestProgressService,
    ) as jest.Mocked<QuestProgressService>;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // createQuest
  // ==========================================================================

  describe("createQuest", () => {
    const createDto = {
      title: "Weekly warrior",
      titleUz: "Haftalik jangchi",
      description: "Make 10 orders this week",
      descriptionUz: "Shu hafta 10 ta buyurtma bering",
      period: QuestPeriod.WEEKLY,
      type: QuestType.ORDER_COUNT,
      targetValue: 10,
      rewardPoints: 100,
    };

    it("should create a quest with provided difficulty", async () => {
      const dtoWithDifficulty = {
        ...createDto,
        difficulty: QuestDifficulty.HARD,
      };
      const createdQuest = {
        id: "new-quest-uuid",
        organizationId: orgId,
        ...dtoWithDifficulty,
      };

      questRepo.create.mockReturnValue(createdQuest as unknown as Quest);
      questRepo.save.mockResolvedValue(createdQuest as unknown as Quest);

      const result = await service.createQuest(
        orgId,
        dtoWithDifficulty as CreateQuestDto,
      );

      expect(result).toEqual(createdQuest);
      expect(questRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          title: "Weekly warrior",
          difficulty: QuestDifficulty.HARD,
        }),
      );
      expect(questRepo.save).toHaveBeenCalledWith(createdQuest);
    });

    it("should default difficulty to MEDIUM when not provided", async () => {
      const createdQuest = {
        id: "new-quest-uuid",
        organizationId: orgId,
        ...createDto,
        difficulty: QuestDifficulty.MEDIUM,
      };

      questRepo.create.mockReturnValue(createdQuest as unknown as Quest);
      questRepo.save.mockResolvedValue(createdQuest as unknown as Quest);

      await service.createQuest(orgId, createDto as CreateQuestDto);

      expect(questRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: QuestDifficulty.MEDIUM,
        }),
      );
    });
  });

  // ==========================================================================
  // updateQuest
  // ==========================================================================

  describe("updateQuest", () => {
    it("should update an existing quest", async () => {
      const updateDto = { title: "Updated title", rewardPoints: 200 };
      const updatedQuest = { ...mockQuest, ...updateDto };

      questRepo.findOne.mockResolvedValue({ ...mockQuest } as unknown as Quest);
      questRepo.save.mockResolvedValue(updatedQuest as unknown as Quest);

      const result = await service.updateQuest(
        "quest-uuid-1",
        orgId,
        updateDto as UpdateQuestDto,
      );

      expect(result).toEqual(updatedQuest);
      expect(questRepo.findOne).toHaveBeenCalledWith({
        where: { id: "quest-uuid-1", organizationId: orgId },
      });
      expect(questRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when quest does not belong to organization", async () => {
      questRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateQuest("quest-uuid-1", "other-org-uuid", {
          title: "x",
        } as UpdateQuestDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when quest does not exist", async () => {
      questRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateQuest("nonexistent-uuid", orgId, {
          title: "x",
        } as UpdateQuestDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // deleteQuest
  // ==========================================================================

  describe("deleteQuest", () => {
    it("should delete a quest successfully", async () => {
      questRepo.softDelete.mockResolvedValue({
        affected: 1,
        raw: {},
        generatedMaps: [],
      });

      await expect(
        service.deleteQuest("quest-uuid-1", orgId),
      ).resolves.toBeUndefined();

      expect(questRepo.softDelete).toHaveBeenCalledWith({
        id: "quest-uuid-1",
        organizationId: orgId,
      });
    });

    it("should throw NotFoundException when quest not found for deletion", async () => {
      questRepo.softDelete.mockResolvedValue({
        affected: 0,
        raw: {},
        generatedMaps: [],
      });

      await expect(
        service.deleteQuest("nonexistent-uuid", orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getQuests
  // ==========================================================================

  describe("getQuests", () => {
    it("should return quests for an organization with default filter", async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as ReturnType<Repository<Quest>["createQueryBuilder"]>,
      );

      const result = await service.getQuests(orgId, {});

      expect(result).toEqual([mockQuest]);
      expect(qb.where).toHaveBeenCalledWith(
        "(q.organizationId = :organizationId OR q.organizationId IS NULL)",
        { organizationId: orgId },
      );
      expect(qb.orderBy).toHaveBeenCalledWith("q.displayOrder", "ASC");
      expect(qb.addOrderBy).toHaveBeenCalledWith("q.createdAt", "DESC");
    });

    it("should filter by period when specified", async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as ReturnType<Repository<Quest>["createQueryBuilder"]>,
      );

      await service.getQuests(orgId, { period: QuestPeriod.DAILY });

      expect(qb.andWhere).toHaveBeenCalledWith("q.period = :period", {
        period: QuestPeriod.DAILY,
      });
    });

    it("should filter by type when specified", async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as ReturnType<Repository<Quest>["createQueryBuilder"]>,
      );

      await service.getQuests(orgId, {
        type: QuestType.ORDER_COUNT,
      } as QuestFilterDto);

      expect(qb.andWhere).toHaveBeenCalledWith("q.type = :type", {
        type: QuestType.ORDER_COUNT,
      });
    });

    it("should filter by isActive when specified", async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as ReturnType<Repository<Quest>["createQueryBuilder"]>,
      );

      await service.getQuests(orgId, { isActive: true });

      expect(qb.andWhere).toHaveBeenCalledWith("q.isActive = :isActive", {
        isActive: true,
      });
    });

    it("should exclude expired quests by default", async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as ReturnType<Repository<Quest>["createQueryBuilder"]>,
      );

      await service.getQuests(orgId, {});

      expect(qb.andWhere).toHaveBeenCalledWith(
        "(q.endsAt IS NULL OR q.endsAt > :now)",
        expect.objectContaining({ now: expect.any(Date) }),
      );
    });

    it("should include expired quests when includeExpired is true", async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(
        qb as unknown as ReturnType<Repository<Quest>["createQueryBuilder"]>,
      );

      await service.getQuests(orgId, { includeExpired: true });

      // When includeExpired is true the "endsAt" filter is NOT applied.
      // Verify it was NOT called with the endsAt condition.
      const endsAtCalls = qb.andWhere.mock.calls.filter(
        (call: unknown[]) =>
          typeof call[0] === "string" && (call[0] as string).includes("endsAt"),
      );
      expect(endsAtCalls).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getUserQuestsSummary
  // ==========================================================================

  describe("getUserQuestsSummary", () => {
    it("should delegate to questProgressService and return summary", async () => {
      const mockSummary = {
        totalActive: 2,
        readyToClaim: 1,
        pointsAvailable: 50,
        daily: [{}, {}],
        weekly: [],
        monthly: [],
        oneTime: [],
      };
      questProgressService.getUserQuestsSummary = jest
        .fn()
        .mockResolvedValue(mockSummary);

      const result = await service.getUserQuestsSummary("user-uuid-1");

      expect(result.totalActive).toBe(2);
      expect(result.readyToClaim).toBe(1);
      expect(result.pointsAvailable).toBe(50);
      expect(questProgressService.getUserQuestsSummary).toHaveBeenCalledWith(
        "user-uuid-1",
        expect.any(Function),
      );
    });

    it("should propagate errors from questProgressService", async () => {
      questProgressService.getUserQuestsSummary = jest
        .fn()
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.getUserQuestsSummary("nonexistent-user"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getUserQuest
  // ==========================================================================

  describe("getUserQuest", () => {
    it("should delegate to questProgressService", async () => {
      const mockProgress = {
        id: "uq-uuid-1",
        questId: "quest-uuid-1",
        status: QuestStatus.COMPLETED,
      };
      questProgressService.getUserQuest = jest
        .fn()
        .mockResolvedValue(mockProgress);

      const result = await service.getUserQuest("user-uuid-1", "uq-uuid-1");

      expect(result).toBeDefined();
      expect(result.id).toBe("uq-uuid-1");
      expect(questProgressService.getUserQuest).toHaveBeenCalledWith(
        "user-uuid-1",
        "uq-uuid-1",
      );
    });

    it("should propagate NotFoundException from questProgressService", async () => {
      questProgressService.getUserQuest = jest
        .fn()
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.getUserQuest("user-uuid-1", "nonexistent-uq"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // claimReward
  // ==========================================================================

  describe("claimReward", () => {
    it("should delegate to questProgressService and return result", async () => {
      const mockResult = {
        success: true,
        pointsEarned: 50,
        newBalance: 550,
        message: "Reward claimed",
      };
      questProgressService.claimReward = jest
        .fn()
        .mockResolvedValue(mockResult);

      const result = await service.claimReward("user-uuid-1", "uq-uuid-1");

      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBe(50);
      expect(result.newBalance).toBe(550);
      expect(questProgressService.claimReward).toHaveBeenCalledWith(
        "user-uuid-1",
        "uq-uuid-1",
      );
    });

    it("should propagate BadRequestException from questProgressService", async () => {
      questProgressService.claimReward = jest
        .fn()
        .mockRejectedValue(new BadRequestException());

      await expect(
        service.claimReward("user-uuid-1", "uq-uuid-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should propagate NotFoundException from questProgressService", async () => {
      questProgressService.claimReward = jest
        .fn()
        .mockRejectedValue(new NotFoundException());

      await expect(
        service.claimReward("user-uuid-1", "nonexistent-uq"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // claimAllRewards
  // ==========================================================================

  describe("claimAllRewards", () => {
    it("should delegate to questProgressService and return result", async () => {
      const mockResult = {
        success: true,
        pointsEarned: 150,
        message: "Claimed 2 rewards",
      };
      questProgressService.claimAllRewards = jest
        .fn()
        .mockResolvedValue(mockResult);

      const result = await service.claimAllRewards("user-uuid-1");

      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBe(150);
      expect(questProgressService.claimAllRewards).toHaveBeenCalledWith(
        "user-uuid-1",
      );
    });

    it("should propagate BadRequestException from questProgressService", async () => {
      questProgressService.claimAllRewards = jest
        .fn()
        .mockRejectedValue(new BadRequestException());

      await expect(service.claimAllRewards("user-uuid-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe("getStats", () => {
    it("should return quest statistics for the organization", async () => {
      const dateFrom = new Date("2025-01-01");
      const dateTo = new Date("2025-01-31");

      questRepo.count
        .mockResolvedValueOnce(10) // totalQuests
        .mockResolvedValueOnce(8); // activeQuests

      const statsQB = createMockQueryBuilder([], {
        participants: "25",
        completed: "40",
        points: "5000",
      });
      userQuestRepo.createQueryBuilder.mockReturnValue(
        statsQB as unknown as ReturnType<
          Repository<UserQuest>["createQueryBuilder"]
        >,
      );

      const result = await service.getStats(orgId, dateFrom, dateTo);

      expect(result.totalQuests).toBe(10);
      expect(result.activeQuests).toBe(8);
      expect(result.totalParticipants).toBe(25);
      expect(result.totalCompleted).toBe(40);
      expect(result.totalPointsAwarded).toBe(5000);
      expect(result.period).toEqual({ from: dateFrom, to: dateTo });
      expect(result.completionRate).toBe(Math.round((40 / 25) * 100));
    });

    it("should return zero stats when no data", async () => {
      const dateFrom = new Date("2025-01-01");
      const dateTo = new Date("2025-01-31");

      questRepo.count
        .mockResolvedValueOnce(0) // totalQuests
        .mockResolvedValueOnce(0); // activeQuests

      const statsQB = createMockQueryBuilder([], {
        participants: "0",
        completed: "0",
        points: "0",
      });
      userQuestRepo.createQueryBuilder.mockReturnValue(
        statsQB as unknown as ReturnType<
          Repository<UserQuest>["createQueryBuilder"]
        >,
      );

      const result = await service.getStats(orgId, dateFrom, dateTo);

      expect(result.totalQuests).toBe(0);
      expect(result.activeQuests).toBe(0);
      expect(result.totalParticipants).toBe(0);
      expect(result.totalCompleted).toBe(0);
      expect(result.totalPointsAwarded).toBe(0);
      expect(result.completionRate).toBe(0);
    });
  });
});
