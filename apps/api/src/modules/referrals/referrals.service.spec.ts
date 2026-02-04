import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ReferralsService } from './referrals.service';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { User } from '../users/entities/user.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { LOYALTY_BONUSES } from '../loyalty/constants/loyalty.constants';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
  getRawOne: jest.fn(),
});

describe('ReferralsService', () => {
  let service: ReferralsService;
  let referralRepo: MockRepository<Referral>;
  let userRepo: MockRepository<User>;
  let loyaltyService: { earnPoints: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let configService: { get: jest.Mock };

  const orgId = 'org-1';

  beforeEach(async () => {
    referralRepo = createMockRepository<Referral>();
    userRepo = createMockRepository<User>();
    loyaltyService = { earnPoints: jest.fn().mockResolvedValue({}) };
    eventEmitter = { emit: jest.fn() };
    configService = { get: jest.fn().mockReturnValue('https://vendhub.uz') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: getRepositoryToken(Referral), useValue: referralRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: LoyaltyService, useValue: loyaltyService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // getReferralCode
  // ==========================================================================

  describe('getReferralCode', () => {
    it('should return existing referral code', async () => {
      const user = { id: 'u-1', referralCode: 'ABC12345' };
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.getReferralCode('u-1');

      expect(result.referralCode).toBe('ABC12345');
      expect(result.shareLink).toContain('ABC12345');
    });

    it('should generate a new code if user has none', async () => {
      const user = { id: 'u-1', referralCode: null };
      userRepo.findOne!.mockResolvedValue(user);
      // generateUniqueCode will call findOne to check for existing codes
      userRepo.findOne!.mockResolvedValueOnce(user).mockResolvedValueOnce(null);
      userRepo.update!.mockResolvedValue({});

      const result = await service.getReferralCode('u-1');

      expect(userRepo.update).toHaveBeenCalled();
      expect(result.referralCode).toBeDefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      await expect(service.getReferralCode('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // regenerateReferralCode
  // ==========================================================================

  describe('regenerateReferralCode', () => {
    it('should generate a new random code when no custom code provided', async () => {
      const user = { id: 'u-1', referralCode: 'OLD_CODE' };
      userRepo.findOne!.mockResolvedValueOnce(user).mockResolvedValueOnce(null);
      userRepo.update!.mockResolvedValue({});

      const result = await service.regenerateReferralCode('u-1');

      expect(userRepo.update).toHaveBeenCalled();
      expect(result.referralCode).toBeDefined();
      expect(result.referralCode.length).toBe(8);
    });

    it('should use custom code when provided and available', async () => {
      const user = { id: 'u-1', referralCode: 'OLD' };
      userRepo.findOne!
        .mockResolvedValueOnce(user)   // find user
        .mockResolvedValueOnce(null);  // check custom code availability
      userRepo.update!.mockResolvedValue({});

      const result = await service.regenerateReferralCode('u-1', { customCode: 'MYCODE' });

      expect(result.referralCode).toBe('MYCODE');
      expect(userRepo.update).toHaveBeenCalledWith('u-1', { referralCode: 'MYCODE' });
    });

    it('should throw ConflictException when custom code is taken by another user', async () => {
      const user = { id: 'u-1', referralCode: 'OLD' };
      const otherUser = { id: 'u-2', referralCode: 'TAKEN' };
      userRepo.findOne!
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(otherUser);

      await expect(
        service.regenerateReferralCode('u-1', { customCode: 'TAKEN' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      await expect(service.regenerateReferralCode('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // applyReferralCode
  // ==========================================================================

  describe('applyReferralCode', () => {
    const referredUser = {
      id: 'u-2',
      referredById: null,
      organizationId: orgId,
    };

    const referrer = {
      id: 'u-1',
      referralCode: 'REF123',
      organizationId: orgId,
      firstName: 'Alisher',
    };

    it('should apply referral code and award welcome bonus', async () => {
      userRepo.findOne!
        .mockResolvedValueOnce(referredUser)
        .mockResolvedValueOnce(referrer);
      userRepo.update!.mockResolvedValue({});
      referralRepo.create!.mockReturnValue({ id: 'ref-1' });
      referralRepo.save!.mockResolvedValue({ id: 'ref-1' });
      referralRepo.update!.mockResolvedValue({});

      const result = await service.applyReferralCode('u-2', {
        referralCode: 'REF123',
      });

      expect(result.success).toBe(true);
      expect(result.welcomeBonus).toBe(LOYALTY_BONUSES.referralBonus);
      expect(result.referrerName).toBe('Alisher');
      expect(loyaltyService.earnPoints).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('referral.created', expect.any(Object));
    });

    it('should throw NotFoundException when referred user not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.applyReferralCode('non-existent', { referralCode: 'REF123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is already referred', async () => {
      const alreadyReferred = { ...referredUser, referredById: 'someone-else' };
      userRepo.findOne!.mockResolvedValue(alreadyReferred);

      await expect(
        service.applyReferralCode('u-2', { referralCode: 'REF123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when referral code is invalid', async () => {
      userRepo.findOne!
        .mockResolvedValueOnce(referredUser)
        .mockResolvedValueOnce(null);

      await expect(
        service.applyReferralCode('u-2', { referralCode: 'INVALID' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when using own referral code', async () => {
      const selfRefer = { ...referrer, id: 'u-2' };
      userRepo.findOne!
        .mockResolvedValueOnce(referredUser)
        .mockResolvedValueOnce(selfRefer);

      await expect(
        service.applyReferralCode('u-2', { referralCode: 'REF123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when referrer is from different org', async () => {
      const diffOrgReferrer = { ...referrer, organizationId: 'other-org' };
      userRepo.findOne!
        .mockResolvedValueOnce(referredUser)
        .mockResolvedValueOnce(diffOrgReferrer);

      await expect(
        service.applyReferralCode('u-2', { referralCode: 'REF123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // handleOrderCompleted
  // ==========================================================================

  describe('handleOrderCompleted', () => {
    it('should activate referral when pending referral exists', async () => {
      const referral = {
        id: 'ref-1',
        referredId: 'u-2',
        referrerId: 'u-1',
        organizationId: orgId,
        status: ReferralStatus.PENDING,
        referrerRewardPoints: LOYALTY_BONUSES.referral,
        referrer: { firstName: 'Alisher' },
      };
      referralRepo.findOne!.mockResolvedValue(referral);
      referralRepo.update!.mockResolvedValue({});

      await service.handleOrderCompleted({
        userId: 'u-2',
        orderId: 'order-1',
        amount: 50000,
      });

      // Should update status to ACTIVATED then REWARDED
      expect(referralRepo.update).toHaveBeenCalledWith(
        'ref-1',
        expect.objectContaining({ status: ReferralStatus.ACTIVATED }),
      );
      expect(loyaltyService.earnPoints).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('referral.activated', expect.any(Object));
    });

    it('should do nothing when no pending referral exists', async () => {
      referralRepo.findOne!.mockResolvedValue(null);

      await service.handleOrderCompleted({
        userId: 'u-2',
        orderId: 'order-1',
        amount: 50000,
      });

      expect(referralRepo.update).not.toHaveBeenCalled();
      expect(loyaltyService.earnPoints).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // getReferralSummary
  // ==========================================================================

  describe('getReferralSummary', () => {
    it('should return complete referral summary', async () => {
      const user = { id: 'u-1', referralCode: 'CODE123' };
      userRepo.findOne!.mockResolvedValue(user);

      const referrals = [
        {
          id: 'ref-1',
          status: ReferralStatus.REWARDED,
          referrerRewardPaid: true,
          referrerRewardPoints: 200,
          referred: { firstName: 'Bob' },
          referredId: 'u-2',
          activatedAt: null,
          created_at: new Date(),
        },
        {
          id: 'ref-2',
          status: ReferralStatus.PENDING,
          referrerRewardPaid: false,
          referrerRewardPoints: 200,
          referred: { firstName: 'Alice' },
          referredId: 'u-3',
          activatedAt: null,
          created_at: new Date(),
        },
      ];
      referralRepo.find!.mockResolvedValue(referrals);

      const result = await service.getReferralSummary('u-1');

      expect(result.referralCode).toBe('CODE123');
      expect(result.totalReferrals).toBe(2);
      expect(result.pendingReferrals).toBe(1);
      expect(result.activatedReferrals).toBe(1);
      expect(result.totalPointsEarned).toBe(200);
      expect(result.pendingPoints).toBe(200);
      expect(result.rewardPerReferral).toBe(LOYALTY_BONUSES.referral);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      await expect(service.getReferralSummary('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // getUserReferrals
  // ==========================================================================

  describe('getUserReferrals', () => {
    it('should return paginated referral list', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([
        [
          {
            id: 'ref-1',
            referredId: 'u-2',
            status: ReferralStatus.REWARDED,
            referrerRewardPoints: 200,
            referrerRewardPaid: true,
            referred: { firstName: 'Bob' },
            created_at: new Date(),
            activatedAt: null,
          },
        ],
        1,
      ]);
      referralRepo.createQueryBuilder!.mockReturnValue(mockQb);

      const result = await service.getUserReferrals('u-1', { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      referralRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.getUserReferrals('u-1', { status: ReferralStatus.PENDING, page: 1, limit: 20 });

      expect(mockQb.andWhere).toHaveBeenCalledWith('r.status = :status', { status: ReferralStatus.PENDING });
    });

    it('should filter by date range when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      referralRepo.createQueryBuilder!.mockReturnValue(mockQb);

      await service.getUserReferrals('u-1', {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        page: 1,
        limit: 20,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('r.createdAt >= :dateFrom', expect.any(Object));
      expect(mockQb.andWhere).toHaveBeenCalledWith('r.createdAt <= :dateTo', expect.any(Object));
    });
  });

  // ==========================================================================
  // getStats
  // ==========================================================================

  describe('getStats', () => {
    it('should return computed referral stats', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');
      const now = new Date();

      const referrals = [
        {
          id: 'ref-1',
          referrerId: 'u-1',
          referredId: 'u-2',
          status: ReferralStatus.REWARDED,
          referrerRewardPaid: true,
          referrerRewardPoints: 200,
          referredRewardPoints: 100,
          activatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          source: 'code',
          referrer: { firstName: 'Alisher' },
        },
        {
          id: 'ref-2',
          referrerId: 'u-1',
          referredId: 'u-3',
          status: ReferralStatus.PENDING,
          referrerRewardPaid: false,
          referrerRewardPoints: 200,
          referredRewardPoints: 100,
          activatedAt: null,
          created_at: now,
          source: 'link',
          referrer: { firstName: 'Alisher' },
        },
      ];
      referralRepo.find!.mockResolvedValue(referrals);

      const result = await service.getStats(orgId, dateFrom, dateTo);

      expect(result.totalReferrals).toBe(2);
      expect(result.pendingReferrals).toBe(1);
      expect(result.activatedReferrals).toBe(1);
      expect(result.conversionRate).toBe(50);
      expect(result.totalPointsAwarded).toBe(300); // 200 referrer + 100 referred
      expect(result.topReferrers.length).toBeGreaterThanOrEqual(1);
      expect(result.bySource.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle zero referrals gracefully', async () => {
      referralRepo.find!.mockResolvedValue([]);

      const result = await service.getStats(orgId, new Date(), new Date());

      expect(result.totalReferrals).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.averageActivationDays).toBe(0);
      expect(result.topReferrers).toEqual([]);
      expect(result.bySource).toEqual([]);
    });
  });

  // ==========================================================================
  // buildCodeInfo (private, tested via public methods)
  // ==========================================================================

  describe('buildCodeInfo (via getReferralCode)', () => {
    it('should include share messages and QR code URL', async () => {
      const user = { id: 'u-1', referralCode: 'TEST123' };
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.getReferralCode('u-1');

      expect(result.shareLink).toBe('https://vendhub.uz/r/TEST123');
      expect(result.qrCodeUrl).toContain('TEST123');
      expect(result.referrerReward).toBe(LOYALTY_BONUSES.referral);
      expect(result.referredBonus).toBe(LOYALTY_BONUSES.referralBonus);
      expect(result.shareMessages).toBeDefined();
      expect(result.shareMessages.telegram).toContain('TEST123');
      expect(result.shareMessages.whatsapp).toContain('TEST123');
      expect(result.shareMessages.sms).toContain('TEST123');
    });
  });

  // ==========================================================================
  // generateUniqueCode (private, tested indirectly)
  // ==========================================================================

  describe('generateUniqueCode (via regenerateReferralCode)', () => {
    it('should generate an 8-character code', async () => {
      const user = { id: 'u-1', referralCode: 'OLD' };
      userRepo.findOne!
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(null); // code is unique
      userRepo.update!.mockResolvedValue({});

      const result = await service.regenerateReferralCode('u-1');

      expect(result.referralCode.length).toBe(8);
      expect(result.referralCode).toMatch(/^[A-Z2-9]+$/);
    });
  });
});
