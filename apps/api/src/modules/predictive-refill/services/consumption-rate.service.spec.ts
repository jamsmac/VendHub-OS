import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConsumptionRateService } from "./consumption-rate.service";
import { ConsumptionRate } from "../entities/consumption-rate.entity";
import { Transaction } from "../../transactions/entities/transaction.entity";

// Helper: build the last N date strings (YYYY-MM-DD) relative to today,
// mirroring the batchGetRecentDailyRates loop: i goes from (days-1) down to 0.
function lastNDays(days: number): string[] {
  const today = new Date();
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split("T")[0]);
  }
  return result;
}

describe("ConsumptionRateService", () => {
  let service: ConsumptionRateService;
  let rateRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let txRepo: {
    createQueryBuilder: jest.Mock;
  };

  // Reusable QB builder — callers set getRawMany to return their desired rows
  function makeTxQb(getRawMany: jest.Mock) {
    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany,
    };
    return qb;
  }

  beforeEach(async () => {
    rateRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
    };

    txRepo = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumptionRateService,
        {
          provide: getRepositoryToken(ConsumptionRate),
          useValue: rateRepo,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: txRepo,
        },
      ],
    }).compile();

    service = module.get(ConsumptionRateService);
  });

  // =========================================================================
  // batchGetRecentDailyRates
  // =========================================================================

  describe("batchGetRecentDailyRates", () => {
    it("should return empty Map when pairs array is empty", async () => {
      const result = await service.batchGetRecentDailyRates("org-1", [], 7);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      // Should NOT hit the database at all
      expect(txRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("should return 7 elements per pair with default days=7", async () => {
      const getRawMany = jest.fn().mockResolvedValue([]);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb(getRawMany));

      const pairs = [
        { machineId: "m-1", productId: "p-1" },
        { machineId: "m-2", productId: "p-2" },
      ];
      const result = await service.batchGetRecentDailyRates("org-1", pairs, 7);

      expect(result.size).toBe(2);
      expect(result.get("m-1:p-1")).toHaveLength(7);
      expect(result.get("m-2:p-2")).toHaveLength(7);
    });

    it("should zero-fill all days when no transaction rows are returned", async () => {
      const getRawMany = jest.fn().mockResolvedValue([]);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb(getRawMany));

      const pairs = [{ machineId: "m-1", productId: "p-1" }];
      const result = await service.batchGetRecentDailyRates("org-1", pairs, 7);

      const rates = result.get("m-1:p-1")!;
      expect(rates).toHaveLength(7);
      expect(rates.every((v) => v === 0)).toBe(true);
    });

    it("should fill in the correct value for days that have data and zero otherwise", async () => {
      const days = 7;
      const dateStrings = lastNDays(days);
      // Provide data only for the 2nd day in the window
      const targetDay = dateStrings[1];
      const rows = [
        {
          machineId: "m-1",
          productId: "p-1",
          day: targetDay,
          qty: "5",
        },
      ];

      const getRawMany = jest.fn().mockResolvedValue(rows);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb(getRawMany));

      const pairs = [{ machineId: "m-1", productId: "p-1" }];
      const result = await service.batchGetRecentDailyRates(
        "org-1",
        pairs,
        days,
      );

      const rates = result.get("m-1:p-1")!;
      expect(rates).toHaveLength(days);
      expect(rates[0]).toBe(0); // first day — no data
      expect(rates[1]).toBe(5); // second day — has data
      for (let i = 2; i < days; i++) {
        expect(rates[i]).toBe(0);
      }
    });

    it("should handle multiple pairs independently", async () => {
      const days = 7;
      const dateStrings = lastNDays(days);
      const day0 = dateStrings[0];

      const rows = [
        { machineId: "m-1", productId: "p-1", day: day0, qty: "3" },
        { machineId: "m-2", productId: "p-2", day: day0, qty: "7" },
      ];

      const getRawMany = jest.fn().mockResolvedValue(rows);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb(getRawMany));

      const pairs = [
        { machineId: "m-1", productId: "p-1" },
        { machineId: "m-2", productId: "p-2" },
      ];
      const result = await service.batchGetRecentDailyRates(
        "org-1",
        pairs,
        days,
      );

      expect(result.get("m-1:p-1")![0]).toBe(3);
      expect(result.get("m-2:p-2")![0]).toBe(7);
    });

    it("should return exactly `days` elements when a custom days value is given", async () => {
      const customDays = 14;
      const getRawMany = jest.fn().mockResolvedValue([]);
      txRepo.createQueryBuilder.mockReturnValue(makeTxQb(getRawMany));

      const pairs = [{ machineId: "m-1", productId: "p-1" }];
      const result = await service.batchGetRecentDailyRates(
        "org-1",
        pairs,
        customDays,
      );

      expect(result.get("m-1:p-1")).toHaveLength(customDays);
    });
  });
});
