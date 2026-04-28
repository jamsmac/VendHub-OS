import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";

import { LoyaltyEventListenerService } from "./loyalty-event-listener.service";
import { BonusEngineService } from "./bonus-engine.service";
import { PointsTransaction } from "../entities/points-transaction.entity";
import { PointsSource } from "../constants/loyalty.constants";

describe("LoyaltyEventListenerService", () => {
  let service: LoyaltyEventListenerService;
  let bonusEngine: jest.Mocked<
    Pick<BonusEngineService, "processOrderPoints" | "processFirstOrderBonus">
  >;
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
    pointsTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyEventListenerService,
        { provide: BonusEngineService, useValue: bonusEngine },
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
