import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { QuestsService } from './quests.service';
import { Quest } from './entities/quest.entity';
import { UserQuest } from './entities/user-quest.entity';
import { User } from '../users/entities/user.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import {
  QuestPeriod,
  QuestType,
  QuestStatus,
  QuestDifficulty,
} from './constants/quest.constants';
import { PointsSource } from '../loyalty/constants/loyalty.constants';

describe('QuestsService', () => {
  let service: QuestsService;
  let questRepo: jest.Mocked<Repository<Quest>>;
  let userQuestRepo: jest.Mocked<Repository<UserQuest>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let loyaltyService: jest.Mocked<LoyaltyService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = 'org-uuid-1';

  // ---------------------------------------------------------------------------
  // Mock entities
  // ---------------------------------------------------------------------------

  const mockQuestBase = {
    id: 'quest-uuid-1',
    organizationId: orgId,
    title: 'First order of the day',
    titleUz: 'Kunning birinchi buyurtmasi',
    description: 'Make at least one order',
    descriptionUz: 'Kamida bitta buyurtma bering',
    period: QuestPeriod.DAILY,
    type: QuestType.ORDER_COUNT,
    difficulty: QuestDifficulty.MEDIUM,
    targetValue: 3,
    rewardPoints: 50,
    additionalRewards: [] as any[],
    metadata: null as any,
    requirements: null as any,
    icon: '🎯',
    color: '#4CAF50',
    imageUrl: null as string | null,
    startsAt: null as Date | null,
    endsAt: null as Date | null,
    isActive: true,
    isFeatured: false,
    displayOrder: 0,
    totalStarted: 10,
    totalCompleted: 5,
    userQuests: [] as any[],
    organization: null as any,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    deleted_at: null as Date | null,
    created_by_id: null as string | null,
    updated_by_id: null as string | null,
  };
  Object.defineProperties(mockQuestBase, {
    completionRate: {
      get() { return this.totalStarted === 0 ? 0 : Math.round((this.totalCompleted / this.totalStarted) * 100); },
    },
    isExpired: {
      get() { return this.endsAt ? new Date() > this.endsAt : false; },
    },
    isStarted: {
      get() { return this.startsAt ? new Date() >= this.startsAt : true; },
    },
    isAvailable: {
      get() { return this.isActive && this.isStarted && !this.isExpired; },
    },
  });
  const mockQuest = mockQuestBase as unknown as Quest;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    organizationId: orgId,
    email: 'test@vendhub.uz',
    firstName: 'Test',
    lastName: 'User',
    pointsBalance: 500,
  };

  const mockUserQuestBase = {
    id: 'uq-uuid-1',
    userId: 'user-uuid-1',
    questId: 'quest-uuid-1',
    quest: mockQuest,
    user: null as any,
    status: QuestStatus.COMPLETED,
    currentValue: 3,
    targetValue: 3,
    progressDetails: {},
    periodStart: new Date('2025-01-01'),
    periodEnd: new Date('2025-01-02'),
    rewardPoints: 50,
    pointsClaimed: null as number | null,
    rewardsClaimed: null as any,
    completedAt: new Date('2025-01-01T14:00:00Z') as Date | null,
    claimedAt: null as Date | null,
    expiredAt: null as Date | null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    deleted_at: null as Date | null,
    created_by_id: null as string | null,
    updated_by_id: null as string | null,
  };
  Object.defineProperties(mockUserQuestBase, {
    progressPercent: {
      get() { return this.targetValue === 0 ? 100 : Math.min(100, Math.floor((this.currentValue / this.targetValue) * 100)); },
    },
    isComplete: {
      get() { return this.currentValue >= this.targetValue; },
    },
    canClaim: {
      get() { return this.status === QuestStatus.COMPLETED; },
    },
    remaining: {
      get() { return Math.max(0, this.targetValue - this.currentValue); },
    },
  });
  const mockUserQuest = mockUserQuestBase as unknown as UserQuest;

  // ---------------------------------------------------------------------------
  // Mock query builder helpers
  // ---------------------------------------------------------------------------

  const createMockQueryBuilder = (result: any = [], rawResult: any = null) => ({
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
          provide: LoyaltyService,
          useValue: {
            earnPoints: jest.fn(),
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

    service = module.get<QuestsService>(QuestsService);
    questRepo = module.get(getRepositoryToken(Quest));
    userQuestRepo = module.get(getRepositoryToken(UserQuest));
    userRepo = module.get(getRepositoryToken(User));
    loyaltyService = module.get(LoyaltyService) as jest.Mocked<LoyaltyService>;
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // createQuest
  // ==========================================================================

  describe('createQuest', () => {
    const createDto = {
      title: 'Weekly warrior',
      titleUz: 'Haftalik jangchi',
      description: 'Make 10 orders this week',
      descriptionUz: 'Shu hafta 10 ta buyurtma bering',
      period: QuestPeriod.WEEKLY,
      type: QuestType.ORDER_COUNT,
      targetValue: 10,
      rewardPoints: 100,
    };

    it('should create a quest with provided difficulty', async () => {
      const dtoWithDifficulty = { ...createDto, difficulty: QuestDifficulty.HARD };
      const createdQuest = { id: 'new-quest-uuid', organizationId: orgId, ...dtoWithDifficulty };

      questRepo.create.mockReturnValue(createdQuest as any);
      questRepo.save.mockResolvedValue(createdQuest as any);

      const result = await service.createQuest(orgId, dtoWithDifficulty as any);

      expect(result).toEqual(createdQuest);
      expect(questRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          title: 'Weekly warrior',
          difficulty: QuestDifficulty.HARD,
        }),
      );
      expect(questRepo.save).toHaveBeenCalledWith(createdQuest);
    });

    it('should default difficulty to MEDIUM when not provided', async () => {
      const createdQuest = {
        id: 'new-quest-uuid',
        organizationId: orgId,
        ...createDto,
        difficulty: QuestDifficulty.MEDIUM,
      };

      questRepo.create.mockReturnValue(createdQuest as any);
      questRepo.save.mockResolvedValue(createdQuest as any);

      await service.createQuest(orgId, createDto as any);

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

  describe('updateQuest', () => {
    it('should update an existing quest', async () => {
      const updateDto = { title: 'Updated title', rewardPoints: 200 };
      const updatedQuest = { ...mockQuest, ...updateDto };

      questRepo.findOne.mockResolvedValue({ ...mockQuest } as any);
      questRepo.save.mockResolvedValue(updatedQuest as any);

      const result = await service.updateQuest('quest-uuid-1', orgId, updateDto as any);

      expect(result).toEqual(updatedQuest);
      expect(questRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'quest-uuid-1', organizationId: orgId },
      });
      expect(questRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when quest does not belong to organization', async () => {
      questRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateQuest('quest-uuid-1', 'other-org-uuid', { title: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when quest does not exist', async () => {
      questRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateQuest('nonexistent-uuid', orgId, { title: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // deleteQuest
  // ==========================================================================

  describe('deleteQuest', () => {
    it('should delete a quest successfully', async () => {
      questRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      await expect(
        service.deleteQuest('quest-uuid-1', orgId),
      ).resolves.toBeUndefined();

      expect(questRepo.delete).toHaveBeenCalledWith({
        id: 'quest-uuid-1',
        organizationId: orgId,
      });
    });

    it('should throw NotFoundException when quest not found for deletion', async () => {
      questRepo.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(
        service.deleteQuest('nonexistent-uuid', orgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getQuests
  // ==========================================================================

  describe('getQuests', () => {
    it('should return quests for an organization with default filter', async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.getQuests(orgId, {});

      expect(result).toEqual([mockQuest]);
      expect(qb.where).toHaveBeenCalledWith(
        '(q.organizationId = :organizationId OR q.organizationId IS NULL)',
        { organizationId: orgId },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('q.displayOrder', 'ASC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('q.createdAt', 'DESC');
    });

    it('should filter by period when specified', async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.getQuests(orgId, { period: QuestPeriod.DAILY });

      expect(qb.andWhere).toHaveBeenCalledWith('q.period = :period', {
        period: QuestPeriod.DAILY,
      });
    });

    it('should filter by type when specified', async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.getQuests(orgId, { type: QuestType.ORDER_COUNT } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('q.type = :type', {
        type: QuestType.ORDER_COUNT,
      });
    });

    it('should filter by isActive when specified', async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.getQuests(orgId, { isActive: true });

      expect(qb.andWhere).toHaveBeenCalledWith('q.isActive = :isActive', {
        isActive: true,
      });
    });

    it('should exclude expired quests by default', async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.getQuests(orgId, {});

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(q.endsAt IS NULL OR q.endsAt > :now)',
        expect.objectContaining({ now: expect.any(Date) }),
      );
    });

    it('should include expired quests when includeExpired is true', async () => {
      const qb = createMockQueryBuilder([mockQuest]);
      questRepo.createQueryBuilder.mockReturnValue(qb as any);

      await service.getQuests(orgId, { includeExpired: true });

      // When includeExpired is true the "endsAt" filter is NOT applied.
      // Verify it was NOT called with the endsAt condition.
      const endsAtCalls = qb.andWhere.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('endsAt'),
      );
      expect(endsAtCalls).toHaveLength(0);
    });
  });

  // ==========================================================================
  // getUserQuestsSummary
  // ==========================================================================

  describe('getUserQuestsSummary', () => {
    it('should return user quests summary grouped by period', async () => {
      // Stub the internal ensureUserHasQuests path
      userRepo.findOne.mockResolvedValue(mockUser as any);
      userQuestRepo.count.mockResolvedValue(1); // existing quests present

      const dailyUQ = {
        ...mockUserQuest,
        id: 'uq-daily-1',
        quest: { ...mockQuest, period: QuestPeriod.DAILY },
        status: QuestStatus.IN_PROGRESS,
        currentValue: 1,
        rewardPoints: 20,
        completedAt: null,
        get progressPercent() { return 33; },
        get remaining() { return 2; },
        get canClaim() { return false; },
      };

      const completedUQ = {
        ...mockUserQuest,
        id: 'uq-daily-2',
        quest: { ...mockQuest, period: QuestPeriod.DAILY },
        status: QuestStatus.COMPLETED,
        currentValue: 3,
        rewardPoints: 50,
        completedAt: new Date(),
        get progressPercent() { return 100; },
        get remaining() { return 0; },
        get canClaim() { return true; },
      };

      const uqQB = createMockQueryBuilder([dailyUQ, completedUQ]);
      userQuestRepo.createQueryBuilder.mockReturnValue(uqQB as any);

      const result = await service.getUserQuestsSummary('user-uuid-1');

      expect(result.totalActive).toBe(2);
      expect(result.readyToClaim).toBe(1);
      expect(result.pointsAvailable).toBe(50);
      expect(result.daily).toHaveLength(2);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // First findOne in ensureUserHasQuests returns null; second in
      // getUserQuestsSummary also returns null.
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getUserQuestsSummary('nonexistent-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getUserQuest
  // ==========================================================================

  describe('getUserQuest', () => {
    it('should return a single user quest with progress', async () => {
      userQuestRepo.findOne.mockResolvedValue(mockUserQuest as any);

      const result = await service.getUserQuest('user-uuid-1', 'uq-uuid-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('uq-uuid-1');
      expect(result.questId).toBe('quest-uuid-1');
      expect(result.status).toBe(QuestStatus.COMPLETED);
      expect(userQuestRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'uq-uuid-1', userId: 'user-uuid-1' },
        relations: ['quest'],
      });
    });

    it('should throw NotFoundException when user quest not found', async () => {
      userQuestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getUserQuest('user-uuid-1', 'nonexistent-uq'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // claimReward
  // ==========================================================================

  describe('claimReward', () => {
    it('should claim reward for a completed quest and award points', async () => {
      const completedUQ = {
        ...mockUserQuest,
        status: QuestStatus.COMPLETED,
        quest: { ...mockQuest, period: QuestPeriod.DAILY, additionalRewards: [] },
      } as any;

      userQuestRepo.findOne.mockResolvedValue(completedUQ);
      userRepo.findOne.mockResolvedValue(mockUser as any);
      loyaltyService.earnPoints.mockResolvedValue({
        earned: 50,
        newBalance: 550,
        levelUp: null,
        streakBonus: null,
        message: 'Earned 50 points',
      } as any);
      userQuestRepo.save.mockResolvedValue({
        ...completedUQ,
        status: QuestStatus.CLAIMED,
        claimedAt: new Date(),
        pointsClaimed: 50,
      });

      const result = await service.claimReward('user-uuid-1', 'uq-uuid-1');

      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBe(50);
      expect(result.newBalance).toBe(550);
      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          organizationId: orgId,
          amount: 50,
          source: PointsSource.DAILY_QUEST,
          referenceId: 'uq-uuid-1',
          referenceType: 'user_quest',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'quest.claimed',
        expect.objectContaining({
          userId: 'user-uuid-1',
          questId: 'quest-uuid-1',
          points: 50,
        }),
      );
    });

    it('should throw BadRequestException when quest is not completed', async () => {
      const inProgressUQ = {
        ...mockUserQuest,
        status: QuestStatus.IN_PROGRESS,
      } as any;
      userQuestRepo.findOne.mockResolvedValue(inProgressUQ);

      await expect(
        service.claimReward('user-uuid-1', 'uq-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user quest does not exist', async () => {
      userQuestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.claimReward('user-uuid-1', 'nonexistent-uq'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user does not exist during claim', async () => {
      const completedUQ = {
        ...mockUserQuest,
        status: QuestStatus.COMPLETED,
      } as any;
      userQuestRepo.findOne.mockResolvedValue(completedUQ);
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.claimReward('nonexistent-user', 'uq-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should map WEEKLY period to WEEKLY_QUEST points source', async () => {
      const weeklyUQ = {
        ...mockUserQuest,
        status: QuestStatus.COMPLETED,
        quest: { ...mockQuest, period: QuestPeriod.WEEKLY, additionalRewards: [] },
      } as any;

      userQuestRepo.findOne.mockResolvedValue(weeklyUQ);
      userRepo.findOne.mockResolvedValue(mockUser as any);
      loyaltyService.earnPoints.mockResolvedValue({
        earned: 50,
        newBalance: 550,
        levelUp: null,
        streakBonus: null,
        message: 'Earned',
      } as any);
      userQuestRepo.save.mockResolvedValue(weeklyUQ);

      await service.claimReward('user-uuid-1', 'uq-uuid-1');

      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          source: PointsSource.WEEKLY_QUEST,
        }),
      );
    });

    it('should map ONE_TIME period to ACHIEVEMENT points source', async () => {
      const achievementUQ = {
        ...mockUserQuest,
        status: QuestStatus.COMPLETED,
        quest: { ...mockQuest, period: QuestPeriod.ONE_TIME, additionalRewards: [] },
      } as any;

      userQuestRepo.findOne.mockResolvedValue(achievementUQ);
      userRepo.findOne.mockResolvedValue(mockUser as any);
      loyaltyService.earnPoints.mockResolvedValue({
        earned: 50,
        newBalance: 550,
        levelUp: null,
        streakBonus: null,
        message: 'Earned',
      } as any);
      userQuestRepo.save.mockResolvedValue(achievementUQ);

      await service.claimReward('user-uuid-1', 'uq-uuid-1');

      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          source: PointsSource.ACHIEVEMENT,
        }),
      );
    });
  });

  // ==========================================================================
  // claimAllRewards
  // ==========================================================================

  describe('claimAllRewards', () => {
    it('should claim all completed-but-unclaimed quests', async () => {
      const uq1 = {
        ...mockUserQuest,
        id: 'uq-uuid-1',
        status: QuestStatus.COMPLETED,
        rewardPoints: 50,
        quest: { ...mockQuest, period: QuestPeriod.DAILY, additionalRewards: [] },
      } as any;

      const uq2 = {
        ...mockUserQuest,
        id: 'uq-uuid-2',
        status: QuestStatus.COMPLETED,
        rewardPoints: 100,
        quest: {
          ...mockQuest,
          id: 'quest-uuid-2',
          period: QuestPeriod.WEEKLY,
          additionalRewards: [],
        },
      } as any;

      // claimAllRewards first calls find() to get completed quests
      userQuestRepo.find.mockResolvedValue([uq1, uq2]);

      // Each individual claimReward call needs findOne, userRepo.findOne, etc.
      userQuestRepo.findOne
        .mockResolvedValueOnce(uq1)
        .mockResolvedValueOnce(uq2);
      userRepo.findOne.mockResolvedValue({
        ...mockUser,
        pointsBalance: 650,
      } as any);
      loyaltyService.earnPoints
        .mockResolvedValueOnce({ earned: 50, newBalance: 550, levelUp: null, streakBonus: null, message: '' } as any)
        .mockResolvedValueOnce({ earned: 100, newBalance: 650, levelUp: null, streakBonus: null, message: '' } as any);
      userQuestRepo.save.mockResolvedValue({} as any);

      const result = await service.claimAllRewards('user-uuid-1');

      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBe(150);
      expect(result.message).toContain('2');
    });

    it('should throw BadRequestException when no rewards to claim', async () => {
      userQuestRepo.find.mockResolvedValue([]);

      await expect(
        service.claimAllRewards('user-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe('getStats', () => {
    it('should return quest statistics for the organization', async () => {
      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');

      questRepo.count
        .mockResolvedValueOnce(10) // totalQuests
        .mockResolvedValueOnce(8); // activeQuests

      const statsQB = createMockQueryBuilder(
        [],
        { participants: '25', completed: '40', points: '5000' },
      );
      userQuestRepo.createQueryBuilder.mockReturnValue(statsQB as any);

      const result = await service.getStats(orgId, dateFrom, dateTo);

      expect(result.totalQuests).toBe(10);
      expect(result.activeQuests).toBe(8);
      expect(result.totalParticipants).toBe(25);
      expect(result.totalCompleted).toBe(40);
      expect(result.totalPointsAwarded).toBe(5000);
      expect(result.period).toEqual({ from: dateFrom, to: dateTo });
      expect(result.completionRate).toBe(Math.round((40 / 25) * 100));
    });

    it('should return zero stats when no data', async () => {
      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-01-31');

      questRepo.count
        .mockResolvedValueOnce(0) // totalQuests
        .mockResolvedValueOnce(0); // activeQuests

      const statsQB = createMockQueryBuilder(
        [],
        { participants: '0', completed: '0', points: '0' },
      );
      userQuestRepo.createQueryBuilder.mockReturnValue(statsQB as any);

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
