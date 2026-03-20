import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

import { ReferralService } from "./referral.service";
import { Referral, ReferralStatus } from "../entities/referral.model";
import { LoyaltyService } from "../loyalty.service";
import { LOYALTY_BONUSES, PointsSource } from "../constants/loyalty.constants";

describe("ReferralService", () => {
  let service: ReferralService;
  let referralRepo: any;
  let loyaltyService: any;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const referrerId = "referrer-uuid-1";
  const referralId = "ref-uuid-1";
  const code = "VH3K9M2X";

  const mockReferral: Partial<Referral> = {
    id: referralId,
    organizationId: orgId,
    referrerId,
    referredId: null,
    code,
    status: ReferralStatus.PENDING,
    referrerRewarded: false,
    referredRewarded: false,
    completedAt: null,
  };

  const mockQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        {
          provide: getRepositoryToken(Referral),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...dto })),
            save: jest
              .fn()
              .mockImplementation((entity) =>
                Promise.resolve({ id: referralId, ...entity }),
              ),
            findOne: jest.fn(),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue({ ...mockQb }),
          },
        },
        {
          provide: LoyaltyService,
          useValue: {
            earnPoints: jest.fn().mockResolvedValue({ newBalance: 300 }),
          },
        },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
    referralRepo = module.get(getRepositoryToken(Referral));
    loyaltyService = module.get(LoyaltyService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateCode", () => {
    it("should return existing code if user already has a pending referral", async () => {
      referralRepo.findOne.mockResolvedValue({ ...mockReferral });

      const result = await service.generateCode(referrerId, orgId);

      expect(result).toBe(code);
      expect(referralRepo.save).not.toHaveBeenCalled();
    });

    it("should generate a new code if no existing pending referral", async () => {
      referralRepo.findOne
        .mockResolvedValueOnce(null) // no existing pending
        .mockResolvedValueOnce(null); // code does not exist yet

      const result = await service.generateCode(referrerId, orgId);

      expect(result).toBeDefined();
      expect(result.length).toBe(8);
      expect(referralRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          referrerId,
          organizationId: orgId,
          status: ReferralStatus.PENDING,
        }),
      );
      expect(referralRepo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException after max retry attempts", async () => {
      referralRepo.findOne
        .mockResolvedValueOnce(null) // no existing pending
        // All 10 code generation attempts find collisions
        .mockResolvedValue({ id: "existing" });

      await expect(service.generateCode(referrerId, orgId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("applyReferral", () => {
    it("should apply referral code successfully", async () => {
      referralRepo.findOne
        .mockResolvedValueOnce({ ...mockReferral }) // find by code
        .mockResolvedValueOnce(null) // user not already referred
        .mockResolvedValueOnce(null) // generateCode: no existing pending
        .mockResolvedValueOnce(null); // generateCode: code unique

      const result = await service.applyReferral(userId, code, orgId);

      expect(result.success).toBe(true);
      expect(referralRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          referredId: userId,
        }),
      );
    });

    it("should throw NotFoundException when code not found", async () => {
      referralRepo.findOne.mockResolvedValue(null);

      await expect(
        service.applyReferral(userId, "BADCODE1", orgId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should prevent self-referral", async () => {
      referralRepo.findOne.mockResolvedValue({
        ...mockReferral,
        referrerId: userId,
      });

      await expect(service.applyReferral(userId, code, orgId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.applyReferral(userId, code, orgId)).rejects.toThrow(
        "You cannot use your own referral code",
      );
    });

    it("should reject already used code (status not PENDING)", async () => {
      referralRepo.findOne.mockResolvedValue({
        ...mockReferral,
        status: ReferralStatus.COMPLETED,
      });

      await expect(service.applyReferral(userId, code, orgId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.applyReferral(userId, code, orgId)).rejects.toThrow(
        "This referral code is no longer active",
      );
    });

    it("should reject code that already has a referred user", async () => {
      referralRepo.findOne.mockResolvedValue({
        ...mockReferral,
        referredId: "other-user",
      });

      await expect(service.applyReferral(userId, code, orgId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.applyReferral(userId, code, orgId)).rejects.toThrow(
        "This referral code has already been used",
      );
    });

    it("should reject if user has already been referred by another code", async () => {
      referralRepo.findOne
        .mockResolvedValueOnce({ ...mockReferral }) // find by code
        .mockResolvedValueOnce({ id: "prev-referral" }); // already referred

      await expect(service.applyReferral(userId, code, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("completeReferral", () => {
    it("should complete referral and award both parties", async () => {
      referralRepo.findOne.mockResolvedValue({
        ...mockReferral,
        referredId: userId,
      });

      await service.completeReferral(userId, orgId);

      expect(loyaltyService.earnPoints).toHaveBeenCalledTimes(2);
      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: referrerId,
          amount: LOYALTY_BONUSES.referral,
          source: PointsSource.REFERRAL,
        }),
      );
      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          amount: LOYALTY_BONUSES.referralBonus,
          source: PointsSource.REFERRAL_BONUS,
        }),
      );
      expect(referralRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReferralStatus.COMPLETED,
          referrerRewarded: true,
          referredRewarded: true,
        }),
      );
    });

    it("should do nothing when no pending referral exists", async () => {
      referralRepo.findOne.mockResolvedValue(null);

      await service.completeReferral(userId, orgId);

      expect(loyaltyService.earnPoints).not.toHaveBeenCalled();
      expect(referralRepo.save).not.toHaveBeenCalled();
    });

    it("should handle earnPoints failure for referrer gracefully", async () => {
      referralRepo.findOne.mockResolvedValue({
        ...mockReferral,
        referredId: userId,
      });
      loyaltyService.earnPoints
        .mockRejectedValueOnce(new Error("DB error"))
        .mockResolvedValueOnce({ newBalance: 100 });

      await service.completeReferral(userId, orgId);

      expect(referralRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          referrerRewarded: false,
          referredRewarded: true,
        }),
      );
    });

    it("should handle earnPoints failure for referred user gracefully", async () => {
      referralRepo.findOne.mockResolvedValue({
        ...mockReferral,
        referredId: userId,
      });
      loyaltyService.earnPoints
        .mockResolvedValueOnce({ newBalance: 300 })
        .mockRejectedValueOnce(new Error("DB error"));

      await service.completeReferral(userId, orgId);

      expect(referralRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          referrerRewarded: true,
          referredRewarded: false,
        }),
      );
    });

    it("should not re-award already rewarded referrer", async () => {
      referralRepo.findOne.mockResolvedValue({
        ...mockReferral,
        referredId: userId,
        referrerRewarded: true,
      });

      await service.completeReferral(userId, orgId);

      expect(loyaltyService.earnPoints).toHaveBeenCalledTimes(1);
      expect(loyaltyService.earnPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          source: PointsSource.REFERRAL_BONUS,
        }),
      );
    });
  });

  describe("getStats", () => {
    it("should return referral stats for user", async () => {
      referralRepo.count
        .mockResolvedValueOnce(5) // totalCompleted
        .mockResolvedValueOnce(2) // totalPending
        .mockResolvedValueOnce(5) // getMyCode: completed count
        .mockResolvedValueOnce(2); // getMyCode: pending count
      referralRepo.findOne.mockResolvedValue({ ...mockReferral });

      const result = await service.getStats(userId, orgId);

      expect(result.totalCompleted).toBe(5);
      expect(result.totalPending).toBe(2);
      expect(result.totalPointsEarned).toBe(5 * LOYALTY_BONUSES.referral);
      expect(result.referralCode).toBe(code);
    });
  });

  describe("getAdminStats", () => {
    it("should return org-wide referral statistics", async () => {
      const qb = { ...mockQb };
      qb.getRawMany.mockResolvedValue([
        { status: ReferralStatus.COMPLETED, count: "10" },
        { status: ReferralStatus.PENDING, count: "3" },
        { status: ReferralStatus.EXPIRED, count: "2" },
        { status: ReferralStatus.CANCELLED, count: "1" },
      ]);
      referralRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAdminStats(orgId);

      expect(result.totalReferrals).toBe(16);
      expect(result.completedReferrals).toBe(10);
      expect(result.pendingReferrals).toBe(3);
      expect(result.expiredReferrals).toBe(2);
      expect(result.cancelledReferrals).toBe(1);
      expect(result.totalPointsAwarded).toBe(
        10 * (LOYALTY_BONUSES.referral + LOYALTY_BONUSES.referralBonus),
      );
    });

    it("should handle empty status counts", async () => {
      const qb = { ...mockQb };
      qb.getRawMany.mockResolvedValue([]);
      referralRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getAdminStats(orgId);

      expect(result.totalReferrals).toBe(0);
      expect(result.completedReferrals).toBe(0);
      expect(result.totalPointsAwarded).toBe(0);
    });
  });

  describe("getMyCode", () => {
    it("should return existing code if available", async () => {
      referralRepo.findOne.mockResolvedValue({ ...mockReferral });
      referralRepo.count
        .mockResolvedValueOnce(3) // completed
        .mockResolvedValueOnce(1); // pending

      const result = await service.getMyCode(userId, orgId);

      expect(result.code).toBe(code);
      expect(result.totalReferrals).toBe(3);
      expect(result.pendingReferrals).toBe(1);
    });

    it("should generate a new code when none exists", async () => {
      referralRepo.findOne
        .mockResolvedValueOnce(null) // no existing pending for getMyCode
        .mockResolvedValueOnce(null) // no existing pending for generateCode
        .mockResolvedValueOnce(null) // code is unique
        .mockResolvedValueOnce({ ...mockReferral, code: "NEWCODE1" }); // re-find after generate
      referralRepo.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const result = await service.getMyCode(userId, orgId);

      expect(result.code).toBeDefined();
      expect(referralRepo.save).toHaveBeenCalled();
    });
  });
});
