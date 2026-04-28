import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";

import { LoyaltyEventListenerService } from "./loyalty-event-listener.service";
import { BonusEngineService } from "./bonus-engine.service";
import { AchievementService } from "./achievement.service";
import { LoyaltyService } from "../loyalty.service";
import { PointsTransaction } from "../entities/points-transaction.entity";
import {
  PointsSource,
  PointsTransactionType,
} from "../constants/loyalty.constants";

describe("LoyaltyEventListenerService", () => {
  let service: LoyaltyEventListenerService;
  let bonusEngine: jest.Mocked<
    Pick<BonusEngineService, "processOrderPoints" | "processFirstOrderBonus">
  >;
  let achievementService: jest.Mocked<
    Pick<AchievementService, "checkAndUnlock">
  >;
  let loyaltyService: jest.Mocked<Pick<LoyaltyService, "spendPoints">>;
  let pointsTransactionRepo: { findOne: jest.Mock };

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const orderId = "order-uuid-1";

  beforeEach(async () => {
    bonusEngine = {
      processOrderPoints: jest.fn().mockResolvedValue({
        earned: 100,
        newBalance: 100,
        levelUp: null,
        streakBonus: null,
      }),
      processFirstOrderBonus: jest.fn().mockResolvedValue(null),
    };
    achievementService = {
      checkAndUnlock: jest.fn().mockResolvedValue([]),
    };
    loyaltyService = {
      spendPoints: jest.fn().mockResolvedValue({
        spent: 0,
        newBalance: 0,
      }),
    };
    pointsTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyEventListenerService,
        { provide: BonusEngineService, useValue: bonusEngine },
        { provide: AchievementService, useValue: achievementService },
        { provide: LoyaltyService, useValue: loyaltyService },
        {
          provide: getRepositoryToken(PointsTransaction),
          useValue: pointsTransactionRepo,
        },
      ],
    }).compile();

    service = module.get<LoyaltyEventListenerService>(
      LoyaltyEventListenerService,
    );
  });

  describe("handleOrderCompleted", () => {
    it("grants order points + first-order bonus on a fresh order", async () => {
      await service.handleOrderCompleted({
        orderId,
        userId,
        totalAmount: 50_000,
        organizationId: orgId,
      });

      expect(pointsTransactionRepo.findOne).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          userId,
          referenceId: orderId,
          referenceType: "order",
          source: PointsSource.ORDER,
        },
      });
      expect(bonusEngine.processFirstOrderBonus).toHaveBeenCalledWith(
        userId,
        orgId,
        orderId,
      );
      expect(bonusEngine.processOrderPoints).toHaveBeenCalledWith(
        userId,
        orgId,
        orderId,
        50_000,
      );
      expect(achievementService.checkAndUnlock).toHaveBeenCalledWith(
        userId,
        orgId,
        "order.completed",
        { orderId, totalAmount: 50_000 },
      );
    });

    it("coerces string totalAmount (TypeORM decimal columns return strings)", async () => {
      await service.handleOrderCompleted({
        orderId,
        userId,
        totalAmount: "50000.00" as unknown as number,
        organizationId: orgId,
      });

      expect(bonusEngine.processOrderPoints).toHaveBeenCalledWith(
        userId,
        orgId,
        orderId,
        50_000,
      );
    });

    it("skips guest orders (no userId)", async () => {
      await service.handleOrderCompleted({
        orderId,
        userId: null,
        totalAmount: 50_000,
        organizationId: orgId,
      });

      expect(pointsTransactionRepo.findOne).not.toHaveBeenCalled();
      expect(bonusEngine.processOrderPoints).not.toHaveBeenCalled();
      expect(bonusEngine.processFirstOrderBonus).not.toHaveBeenCalled();
    });

    it("is idempotent — skips if points already granted for this order", async () => {
      pointsTransactionRepo.findOne.mockResolvedValueOnce({
        id: "existing-tx-id",
      });

      await service.handleOrderCompleted({
        orderId,
        userId,
        totalAmount: 50_000,
        organizationId: orgId,
      });

      expect(bonusEngine.processOrderPoints).not.toHaveBeenCalled();
      expect(bonusEngine.processFirstOrderBonus).not.toHaveBeenCalled();
    });

    it("does not throw when bonus engine fails (logs and swallows)", async () => {
      bonusEngine.processOrderPoints.mockRejectedValueOnce(
        new Error("DB unreachable"),
      );

      await expect(
        service.handleOrderCompleted({
          orderId,
          userId,
          totalAmount: 50_000,
          organizationId: orgId,
        }),
      ).resolves.toBeUndefined();

      // achievement check is gated on points-grant success: if points failed,
      // user.totalOrders may be in an inconsistent state, so skip the check
      expect(achievementService.checkAndUnlock).not.toHaveBeenCalled();
    });

    it("does not throw when achievement check fails (logs and swallows)", async () => {
      achievementService.checkAndUnlock.mockRejectedValueOnce(
        new Error("achievement repo down"),
      );

      await expect(
        service.handleOrderCompleted({
          orderId,
          userId,
          totalAmount: 50_000,
          organizationId: orgId,
        }),
      ).resolves.toBeUndefined();
      // points were granted before the failure
      expect(bonusEngine.processOrderPoints).toHaveBeenCalled();
    });

    it("spends applied points when pointsUsed is set", async () => {
      await service.handleOrderCompleted({
        orderId,
        userId,
        totalAmount: 50_000,
        pointsUsed: 1000,
        organizationId: orgId,
      });

      // Idempotency probe for spend uses type=SPEND + source=PURCHASE,
      // distinct from the earn-side probe (type omitted, source=ORDER).
      expect(pointsTransactionRepo.findOne).toHaveBeenCalledWith({
        where: {
          organizationId: orgId,
          userId,
          type: PointsTransactionType.SPEND,
          source: PointsSource.PURCHASE,
          referenceId: orderId,
          referenceType: "order",
        },
      });
      expect(loyaltyService.spendPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          organizationId: orgId,
          amount: 1000,
          referenceId: orderId,
          referenceType: "order",
        }),
      );
    });

    it("does not call spendPoints when pointsUsed is 0 or absent", async () => {
      await service.handleOrderCompleted({
        orderId,
        userId,
        totalAmount: 50_000,
        organizationId: orgId,
      });
      expect(loyaltyService.spendPoints).not.toHaveBeenCalled();

      await service.handleOrderCompleted({
        orderId: "order-uuid-2",
        userId,
        totalAmount: 50_000,
        pointsUsed: 0,
        organizationId: orgId,
      });
      expect(loyaltyService.spendPoints).not.toHaveBeenCalled();
    });

    it("does not double-spend when a SPEND transaction already exists", async () => {
      // Discriminate by the WHERE clause rather than call order — the spec
      // shouldn't break if we rearrange spend/earn probe order later.
      pointsTransactionRepo.findOne.mockImplementation(
        ({ where }: { where: { type?: string } }) => {
          if (where.type === PointsTransactionType.SPEND) {
            return Promise.resolve({ id: "existing-spend-tx" });
          }
          return Promise.resolve(null);
        },
      );

      await service.handleOrderCompleted({
        orderId,
        userId,
        totalAmount: 50_000,
        pointsUsed: 1000,
        organizationId: orgId,
      });

      expect(loyaltyService.spendPoints).not.toHaveBeenCalled();
      // Earn flow still runs — re-emitting the event must not block earning
      // for a customer who has already had their balance debited.
      expect(bonusEngine.processOrderPoints).toHaveBeenCalled();
    });

    it("does not throw when spendPoints fails (logs and swallows)", async () => {
      loyaltyService.spendPoints.mockRejectedValueOnce(
        new Error("Insufficient points balance"),
      );

      await expect(
        service.handleOrderCompleted({
          orderId,
          userId,
          totalAmount: 50_000,
          pointsUsed: 1000,
          organizationId: orgId,
        }),
      ).resolves.toBeUndefined();
      // Earn flow still runs after a spend failure — the customer paid for
      // the cash portion of the order regardless.
      expect(bonusEngine.processOrderPoints).toHaveBeenCalled();
    });

    it("does not throw when first-order bonus fails (only logs)", async () => {
      bonusEngine.processFirstOrderBonus.mockRejectedValueOnce(
        new Error("user not found"),
      );

      await expect(
        service.handleOrderCompleted({
          orderId,
          userId,
          totalAmount: 50_000,
          organizationId: orgId,
        }),
      ).resolves.toBeUndefined();
      // regular points must still be attempted even if first-order bonus fails
      expect(bonusEngine.processOrderPoints).toHaveBeenCalled();
    });
  });
});
