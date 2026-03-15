import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { LoyaltyService } from "./loyalty.service";
import { LoyaltyAnalyticsService } from "./services/loyalty-analytics.service";
import { BonusEngineService } from "./services/bonus-engine.service";
import { PointsTransaction } from "./entities/points-transaction.entity";
import { User } from "../users/entities/user.entity";
import {
  LoyaltyLevel,
  PointsTransactionType,
  PointsSource,
  LOYALTY_BONUSES,
  POINTS_RULES,
} from "./constants/loyalty.constants";

describe("LoyaltyService", () => {
  let service: LoyaltyService;
  let pointsTransactionRepo: jest.Mocked<Repository<PointsTransaction>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let bonusEngineService: jest.Mocked<BonusEngineService>;

  const orgId = "org-uuid-1";

  // ---------------------------------------------------------------------------
  // Mock data
  // ---------------------------------------------------------------------------

  const mockUser = {
    id: "user-uuid-1",
    organizationId: orgId,
    pointsBalance: 500,
    loyaltyLevel: LoyaltyLevel.BRONZE,
    currentStreak: 2,
    longestStreak: 5,
    welcomeBonusReceived: false,
    totalOrders: 0,
    totalSpent: 0,
    lastOrderDate: null,
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date("2025-06-01"),
  } as unknown as User;

  const mockTransaction = {
    id: "pt-uuid-1",
    organizationId: orgId,
    userId: "user-uuid-1",
    type: PointsTransactionType.EARN,
    amount: 100,
    balanceAfter: 600,
    source: PointsSource.ORDER,
    referenceId: "order-uuid-1",
    referenceType: "order",
    description: "Test earn",
    descriptionUz: null,
    metadata: null,
    expiresAt: new Date("2026-06-01"),
    isExpired: false,
    remainingAmount: 100,
    adminId: null,
    adminReason: null,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
  } as unknown as PointsTransaction;

  // ---------------------------------------------------------------------------
  // Shared query-builder mock
  // ---------------------------------------------------------------------------

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockTransaction]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockTransaction], 1]),
    getRawOne: jest.fn().mockResolvedValue({ total: "0" }),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  // ---------------------------------------------------------------------------
  // DataSource transaction mock
  // ---------------------------------------------------------------------------

  const mockManager = {
    getRepository: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb: any) => cb(mockManager)),
  };

  // ---------------------------------------------------------------------------
  // Module setup
  // ---------------------------------------------------------------------------

  beforeEach(async () => {
    // Reset all mock return values between tests
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.addSelect.mockReturnThis();
    mockQueryBuilder.groupBy.mockReturnThis();
    mockQueryBuilder.limit.mockReturnThis();
    mockQueryBuilder.setParameters.mockReturnThis();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockTransaction], 1]);
    mockQueryBuilder.getRawOne.mockResolvedValue({ total: "0" });
    mockQueryBuilder.getRawMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        {
          provide: getRepositoryToken(PointsTransaction),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: LoyaltyAnalyticsService,
          useValue: {
            getStats: jest.fn(),
            getExpiringPointsReport: jest.fn(),
            getLeaderboard: jest.fn(),
          },
        },
        {
          provide: BonusEngineService,
          useValue: {
            processWelcomeBonus: jest.fn(),
            processFirstOrderBonus: jest.fn(),
            processOrderPoints: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LoyaltyService>(LoyaltyService);
    pointsTransactionRepo = module.get(getRepositoryToken(PointsTransaction));
    userRepo = module.get(getRepositoryToken(User));
    eventEmitter = module.get(EventEmitter2);
    bonusEngineService = module.get(BonusEngineService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // getBalance
  // ==========================================================================

  describe("getBalance", () => {
    it("should return the user balance, level, and streak info", async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser } as User);

      // getTotalEarned, getTotalSpent, getExpiringPoints all use createQueryBuilder
      // They are invoked via Promise.all, each calling createQueryBuilder once
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: "1200" }) // totalEarned
        .mockResolvedValueOnce({ total: "700" }) // totalSpent
        .mockResolvedValueOnce({ total: "50" }); // expiringIn30Days

      const result = await service.getBalance("user-uuid-1");

      expect(result.balance).toBe(500);
      expect(result.currentLevel.level).toBe(LoyaltyLevel.BRONZE);
      expect(result.currentStreak).toBe(2);
      expect(result.longestStreak).toBe(5);
      expect(result.totalEarned).toBe(1200);
      expect(result.totalSpent).toBe(700);
      expect(result.expiringIn30Days).toBe(50);
      expect(result.welcomeBonusReceived).toBe(false);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getBalance("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should calculate progress to next level correctly", async () => {
      // User at 500 points (BRONZE), next level SILVER at 1000
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        pointsBalance: 500,
      } as User);
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: "500" })
        .mockResolvedValueOnce({ total: "0" })
        .mockResolvedValueOnce({ total: "0" });

      const result = await service.getBalance("user-uuid-1");

      expect(result.nextLevel).not.toBeNull();
      expect(result.nextLevel!.level).toBe(LoyaltyLevel.SILVER);
      expect(result.pointsToNextLevel).toBe(500); // 1000 - 500
      expect(result.progressPercent).toBe(50); // 500/1000 = 50%
    });

    it("should return 100% progress and null nextLevel for PLATINUM users", async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        pointsBalance: 25000,
        loyaltyLevel: LoyaltyLevel.PLATINUM,
      } as User);
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: "25000" })
        .mockResolvedValueOnce({ total: "0" })
        .mockResolvedValueOnce({ total: "0" });

      const result = await service.getBalance("user-uuid-1");

      expect(result.nextLevel).toBeNull();
      expect(result.pointsToNextLevel).toBe(0);
      expect(result.progressPercent).toBe(100);
    });
  });

  // ==========================================================================
  // getHistory
  // ==========================================================================

  describe("getHistory", () => {
    it("should return paginated transaction history", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockTransaction],
        1,
      ]);

      const result = await service.getHistory("user-uuid-1", {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it("should apply type and source filters when provided", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getHistory("user-uuid-1", {
        type: PointsTransactionType.EARN,
        source: PointsSource.ORDER,
        page: 1,
        limit: 10,
      });

      // andWhere called for type and source filters
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "pt.type = :type",
        { type: PointsTransactionType.EARN },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "pt.source = :source",
        { source: PointsSource.ORDER },
      );
    });

    it("should calculate totalPages correctly for multiple pages", async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([
        [mockTransaction],
        45,
      ]);

      const result = await service.getHistory("user-uuid-1", {
        page: 2,
        limit: 20,
      });

      expect(result.totalPages).toBe(3); // ceil(45/20) = 3
      expect(result.page).toBe(2);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (2-1)*20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  // ==========================================================================
  // getAllLevels
  // ==========================================================================

  describe("getAllLevels", () => {
    it("should return all loyalty levels with defaults when no userId", async () => {
      const result = await service.getAllLevels();

      expect(result.levels).toHaveLength(4); // BRONZE, SILVER, GOLD, PLATINUM
      expect(result.currentLevel).toBe(LoyaltyLevel.BRONZE);
      expect(result.currentPoints).toBe(0);
      expect(result.levels.map((l) => l.level)).toEqual([
        LoyaltyLevel.BRONZE,
        LoyaltyLevel.SILVER,
        LoyaltyLevel.GOLD,
        LoyaltyLevel.PLATINUM,
      ]);
    });

    it("should return user current level when userId provided", async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        loyaltyLevel: LoyaltyLevel.GOLD,
        pointsBalance: 6000,
      } as User);

      const result = await service.getAllLevels("user-uuid-1");

      expect(result.currentLevel).toBe(LoyaltyLevel.GOLD);
      expect(result.currentPoints).toBe(6000);
      expect(result.levels).toHaveLength(4);
    });
  });

  // ==========================================================================
  // earnPoints
  // ==========================================================================

  describe("earnPoints", () => {
    it("should earn points and apply bonus multiplier for BRONZE (x1)", async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser } as User);

      pointsTransactionRepo.create.mockReturnValue(mockTransaction as any);

      pointsTransactionRepo.save.mockResolvedValue(mockTransaction as any);

      userRepo.update.mockResolvedValue(undefined as any);

      const result = await service.earnPoints({
        userId: "user-uuid-1",
        organizationId: orgId,
        amount: 100,
        source: PointsSource.ORDER,
        referenceId: "order-uuid-1",
        referenceType: "order",
      });

      // BRONZE multiplier = 1, so 100 * 1 = 100
      expect(result.earned).toBe(100);
      expect(result.newBalance).toBe(600); // 500 + 100
      expect(result.levelUp).toBeNull();
      expect(pointsTransactionRepo.create).toHaveBeenCalled();
      expect(pointsTransactionRepo.save).toHaveBeenCalled();
      expect(userRepo.update).toHaveBeenCalledWith(
        "user-uuid-1",
        expect.objectContaining({
          pointsBalance: 600,
        }),
      );
    });

    it("should apply GOLD bonus multiplier (x1.5)", async () => {
      const goldUser = {
        ...mockUser,
        loyaltyLevel: LoyaltyLevel.GOLD,
        pointsBalance: 6000,
      } as User;
      userRepo.findOne.mockResolvedValue(goldUser);

      pointsTransactionRepo.create.mockReturnValue(mockTransaction as any);

      pointsTransactionRepo.save.mockResolvedValue(mockTransaction as any);

      userRepo.update.mockResolvedValue(undefined as any);

      const result = await service.earnPoints({
        userId: "user-uuid-1",
        organizationId: orgId,
        amount: 100,
        source: PointsSource.ORDER,
      });

      // GOLD multiplier = 1.5, so floor(100 * 1.5) = 150
      expect(result.earned).toBe(150);
      expect(result.newBalance).toBe(6150); // 6000 + 150
    });

    it("should emit loyalty.points_earned event", async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser } as User);

      pointsTransactionRepo.create.mockReturnValue(mockTransaction as any);

      pointsTransactionRepo.save.mockResolvedValue(mockTransaction as any);

      userRepo.update.mockResolvedValue(undefined as any);

      await service.earnPoints({
        userId: "user-uuid-1",
        organizationId: orgId,
        amount: 50,
        source: PointsSource.ORDER,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "loyalty.points_earned",
        expect.objectContaining({
          userId: "user-uuid-1",
          source: PointsSource.ORDER,
        }),
      );
    });

    it("should emit loyalty.level_up event when user levels up", async () => {
      // User at 900 BRONZE, earning 200 => 1100 => SILVER
      const nearLevelUpUser = {
        ...mockUser,
        pointsBalance: 900,
        loyaltyLevel: LoyaltyLevel.BRONZE,
      } as User;
      userRepo.findOne.mockResolvedValue(nearLevelUpUser);

      pointsTransactionRepo.create.mockReturnValue(mockTransaction as any);

      pointsTransactionRepo.save.mockResolvedValue(mockTransaction as any);

      userRepo.update.mockResolvedValue(undefined as any);

      const result = await service.earnPoints({
        userId: "user-uuid-1",
        organizationId: orgId,
        amount: 200,
        source: PointsSource.ORDER,
      });

      expect(result.newBalance).toBe(1100);
      expect(result.levelUp).not.toBeNull();
      expect(result.levelUp!.level).toBe(LoyaltyLevel.SILVER);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "loyalty.level_up",
        expect.objectContaining({
          userId: "user-uuid-1",
          oldLevel: LoyaltyLevel.BRONZE,
          newLevel: LoyaltyLevel.SILVER,
        }),
      );
    });

    it("should throw BadRequestException for zero or negative amount", async () => {
      await expect(
        service.earnPoints({
          userId: "user-uuid-1",
          organizationId: orgId,
          amount: 0,
          source: PointsSource.ORDER,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.earnPoints({
          userId: "user-uuid-1",
          organizationId: orgId,
          amount: -10,
          source: PointsSource.ORDER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user not found", async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.earnPoints({
          userId: "non-existent",
          organizationId: orgId,
          amount: 100,
          source: PointsSource.ORDER,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // spendPoints
  // ==========================================================================

  describe("spendPoints", () => {
    it("should deduct points and return discount amount using FIFO", async () => {
      const mockTxRepo = {
        create: jest.fn().mockReturnValue({
          ...mockTransaction,
          id: "spend-uuid-1",
          type: PointsTransactionType.SPEND,
          amount: -200,
        }),
        save: jest.fn().mockResolvedValue({
          ...mockTransaction,
          id: "spend-uuid-1",
        }),
        find: jest
          .fn()
          .mockResolvedValue([{ ...mockTransaction, remainingAmount: 300 }]),
        update: jest.fn().mockResolvedValue(undefined),
      };
      const mockUserRepoInTx = {
        findOne: jest.fn().mockResolvedValue({
          ...mockUser,
          pointsBalance: 1000,
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };

      mockManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepoInTx;
        return mockTxRepo;
      });

      const result = await service.spendPoints({
        userId: "user-uuid-1",
        organizationId: orgId,
        amount: 200,
        referenceId: "order-uuid-1",
        referenceType: "order",
      });

      expect(result.spent).toBe(200);
      expect(result.newBalance).toBe(800); // 1000 - 200
      expect(result.discountAmount).toBe(200 * POINTS_RULES.pointsValue);
      expect(result.transactionId).toBeDefined();
    });

    it("should throw BadRequestException for insufficient balance", async () => {
      const mockTxRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
      };
      const mockUserRepoInTx = {
        findOne: jest.fn().mockResolvedValue({
          ...mockUser,
          pointsBalance: 50,
        }),
        update: jest.fn(),
      };

      mockManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepoInTx;
        return mockTxRepo;
      });

      await expect(
        service.spendPoints({
          userId: "user-uuid-1",
          organizationId: orgId,
          amount: 200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when below minimum spend threshold", async () => {
      const mockTxRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
      };
      const mockUserRepoInTx = {
        findOne: jest.fn().mockResolvedValue({
          ...mockUser,
          pointsBalance: 1000,
        }),
        update: jest.fn(),
      };

      mockManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepoInTx;
        return mockTxRepo;
      });

      // minPointsToSpend = 100 per constants
      await expect(
        service.spendPoints({
          userId: "user-uuid-1",
          organizationId: orgId,
          amount: 10, // Below minimum
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should emit loyalty.points_spent event", async () => {
      const mockTxRepo = {
        create: jest.fn().mockReturnValue({
          ...mockTransaction,
          id: "spend-uuid-2",
          type: PointsTransactionType.SPEND,
          amount: -200,
        }),
        save: jest.fn().mockResolvedValue({
          ...mockTransaction,
          id: "spend-uuid-2",
        }),
        find: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue(undefined),
      };
      const mockUserRepoInTx = {
        findOne: jest.fn().mockResolvedValue({
          ...mockUser,
          pointsBalance: 1000,
        }),
        update: jest.fn().mockResolvedValue(undefined),
      };

      mockManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepoInTx;
        return mockTxRepo;
      });

      await service.spendPoints({
        userId: "user-uuid-1",
        organizationId: orgId,
        amount: 200,
        referenceId: "order-uuid-2",
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "loyalty.points_spent",
        expect.objectContaining({
          userId: "user-uuid-1",
          amount: 200,
          newBalance: 800,
        }),
      );
    });

    it("should throw NotFoundException when user not found", async () => {
      const mockTxRepo = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
      };
      const mockUserRepoInTx = {
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      };

      mockManager.getRepository.mockImplementation((entity: any) => {
        if (entity === User) return mockUserRepoInTx;
        return mockTxRepo;
      });

      await expect(
        service.spendPoints({
          userId: "non-existent",
          organizationId: orgId,
          amount: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // adjustPoints
  // ==========================================================================

  describe("adjustPoints", () => {
    it("should add points for positive adjustment", async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        pointsBalance: 500,
      } as User);

      pointsTransactionRepo.create.mockReturnValue(mockTransaction as any);

      pointsTransactionRepo.save.mockResolvedValue(mockTransaction as any);

      userRepo.update.mockResolvedValue(undefined as any);

      const result = await service.adjustPoints(
        "user-uuid-1",
        orgId,
        200,
        "Compensation for technical issue",
        "admin-uuid-1",
      );

      expect(result).toHaveProperty("earned", 200);
      expect(result).toHaveProperty("newBalance", 700);
      expect(pointsTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: PointsTransactionType.ADJUST,
          amount: 200,
          source: PointsSource.ADMIN,
          adminId: "admin-uuid-1",
        }),
      );
    });

    it("should deduct points for negative adjustment", async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        pointsBalance: 500,
      } as User);

      pointsTransactionRepo.create.mockReturnValue(mockTransaction as any);

      pointsTransactionRepo.save.mockResolvedValue(mockTransaction as any);

      userRepo.update.mockResolvedValue(undefined as any);

      const result = await service.adjustPoints(
        "user-uuid-1",
        orgId,
        -200,
        "Fraud correction",
        "admin-uuid-1",
      );

      expect(result).toHaveProperty("spent", 200);
      expect(result).toHaveProperty("newBalance", 300);
    });

    it("should throw BadRequestException when adjustment would make balance negative", async () => {
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        pointsBalance: 100,
      } as User);

      await expect(
        service.adjustPoints(
          "user-uuid-1",
          orgId,
          -500,
          "Over-deduction",
          "admin-uuid-1",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user not found", async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.adjustPoints(
          "non-existent",
          orgId,
          100,
          "Test",
          "admin-uuid-1",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // processWelcomeBonus
  // ==========================================================================

  describe("processWelcomeBonus", () => {
    it("should award welcome bonus to new user", async () => {
      const expectedResult = {
        earned: LOYALTY_BONUSES.welcome,
        newBalance: LOYALTY_BONUSES.welcome,
        levelUp: null,
        streakBonus: null,
        message: `Начислено ${LOYALTY_BONUSES.welcome} баллов`,
      };
      bonusEngineService.processWelcomeBonus.mockResolvedValue(expectedResult);

      const result = await service.processWelcomeBonus("user-uuid-1", orgId);

      expect(result).not.toBeNull();
      expect(result!.earned).toBe(LOYALTY_BONUSES.welcome);
      expect(bonusEngineService.processWelcomeBonus).toHaveBeenCalledWith(
        "user-uuid-1",
        orgId,
      );
    });

    it("should return null if user already received welcome bonus", async () => {
      bonusEngineService.processWelcomeBonus.mockResolvedValue(null);

      const result = await service.processWelcomeBonus("user-uuid-1", orgId);

      expect(result).toBeNull();
    });

    it("should return null if user not found", async () => {
      bonusEngineService.processWelcomeBonus.mockResolvedValue(null);

      const result = await service.processWelcomeBonus("user-uuid-1", orgId);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // processFirstOrderBonus
  // ==========================================================================

  describe("processFirstOrderBonus", () => {
    it("should award first-order bonus when totalOrders is 0 or 1", async () => {
      const expectedResult = {
        earned: LOYALTY_BONUSES.firstOrder,
        newBalance: 150,
        levelUp: null,
        streakBonus: null,
        message: `Начислено ${LOYALTY_BONUSES.firstOrder} баллов`,
      };
      bonusEngineService.processFirstOrderBonus.mockResolvedValue(
        expectedResult,
      );

      const result = await service.processFirstOrderBonus(
        "user-uuid-1",
        orgId,
        "order-uuid-1",
      );

      expect(result).not.toBeNull();
      expect(result!.earned).toBe(LOYALTY_BONUSES.firstOrder);
      expect(bonusEngineService.processFirstOrderBonus).toHaveBeenCalledWith(
        "user-uuid-1",
        orgId,
        "order-uuid-1",
      );
    });

    it("should return null if user has more than 1 order", async () => {
      bonusEngineService.processFirstOrderBonus.mockResolvedValue(null);

      const result = await service.processFirstOrderBonus(
        "user-uuid-1",
        orgId,
        "order-uuid-1",
      );

      expect(result).toBeNull();
    });

    it("should return null if user not found", async () => {
      bonusEngineService.processFirstOrderBonus.mockResolvedValue(null);

      const result = await service.processFirstOrderBonus(
        "user-uuid-1",
        orgId,
        "order-uuid-1",
      );

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // processOrderPoints
  // ==========================================================================

  describe("processOrderPoints", () => {
    it("should calculate and earn points based on order amount", async () => {
      const expectedResult = {
        earned: 100,
        newBalance: 300,
        levelUp: null,
        streakBonus: null,
        message: "Начислено 100 баллов",
      };
      bonusEngineService.processOrderPoints.mockResolvedValue(expectedResult);

      const result = await service.processOrderPoints(
        "user-uuid-1",
        orgId,
        "order-uuid-1",
        10000,
      );

      expect(result).toHaveProperty("earned");
      expect(result.earned).toBe(100);
      expect(bonusEngineService.processOrderPoints).toHaveBeenCalledWith(
        "user-uuid-1",
        orgId,
        "order-uuid-1",
        10000,
      );
    });

    it("should throw NotFoundException when user not found", async () => {
      bonusEngineService.processOrderPoints.mockRejectedValue(
        new NotFoundException("User not found"),
      );

      await expect(
        service.processOrderPoints(
          "non-existent",
          orgId,
          "order-uuid-1",
          10000,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should earn zero base points for orders below minimum amount", async () => {
      const expectedResult = {
        earned: 0,
        newBalance: 200,
        levelUp: null,
        streakBonus: null,
        message: "Заказ ниже минимальной суммы для начисления баллов",
      };
      bonusEngineService.processOrderPoints.mockResolvedValue(expectedResult);

      const result = await service.processOrderPoints(
        "user-uuid-1",
        orgId,
        "order-uuid-1",
        3000,
      );

      expect(result.earned).toBe(0);
    });

    it("should cap points at maxPointsPerOrder", async () => {
      const expectedResult = {
        earned: POINTS_RULES.maxPointsPerOrder,
        newBalance: 200 + POINTS_RULES.maxPointsPerOrder,
        levelUp: null,
        streakBonus: null,
        message: `Начислено ${POINTS_RULES.maxPointsPerOrder} баллов`,
      };
      bonusEngineService.processOrderPoints.mockResolvedValue(expectedResult);

      const result = await service.processOrderPoints(
        "user-uuid-1",
        orgId,
        "order-uuid-1",
        500000,
      );

      expect(result.earned).toBe(POINTS_RULES.maxPointsPerOrder);
    });
  });
});
