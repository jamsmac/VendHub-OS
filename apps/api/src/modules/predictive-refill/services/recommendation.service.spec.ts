import { Test, TestingModule } from "@nestjs/testing";
import { RecommendationService } from "./recommendation.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  RefillRecommendation,
  RefillAction,
} from "../entities/refill-recommendation.entity";
import { Machine } from "../../machines/entities/machine.entity";
import {
  AlertRule,
  AlertMetric,
} from "../../alerts/entities/alert-rule.entity";
import { ForecastService, SlotForecast } from "./forecast.service";
import { AlertsService } from "../../alerts/alerts.service";

// Helper: compute expected priorityScore from forecast inputs (mirrors service logic)
function computePriorityScore(
  sellingPrice: number,
  costPrice: number,
  dailyRate: number,
  daysOfSupply: number,
): number {
  const margin = sellingPrice - costPrice;
  const dailyProfit = margin * dailyRate;
  const urgency = Math.min(10, daysOfSupply > 0 ? 1 / daysOfSupply : 10);
  const raw = urgency * Math.log10(1 + Math.max(0, dailyProfit));
  return Math.round(raw * 10000) / 10000;
}

function makeForecast(overrides: Partial<SlotForecast> = {}): SlotForecast {
  return {
    machineId: "machine-1",
    productId: "product-1",
    currentStock: 10,
    capacity: 20,
    dailyRate: 2,
    daysOfSupply: 5,
    sellingPrice: 10000,
    costPrice: 6000,
    ...overrides,
  };
}

describe("RecommendationService", () => {
  let service: RecommendationService;
  let recRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let machineRepo: { find: jest.Mock };
  let alertRuleRepo: { findOne: jest.Mock };
  let forecastService: { forecastMachine: jest.Mock };
  let alertsService: { triggerAlert: jest.Mock };

  beforeEach(async () => {
    recRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      createQueryBuilder: jest.fn(),
    };

    machineRepo = {
      find: jest.fn().mockResolvedValue([{ id: "machine-1", name: "VM-01" }]),
    };

    alertRuleRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    forecastService = {
      forecastMachine: jest.fn().mockResolvedValue([]),
    };

    alertsService = {
      triggerAlert: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: getRepositoryToken(RefillRecommendation),
          useValue: recRepo,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: machineRepo,
        },
        {
          provide: getRepositoryToken(AlertRule),
          useValue: alertRuleRepo,
        },
        {
          provide: ForecastService,
          useValue: forecastService,
        },
        {
          provide: AlertsService,
          useValue: alertsService,
        },
      ],
    }).compile();

    service = module.get(RecommendationService);
  });

  // =========================================================================
  // Priority formula tests
  // =========================================================================

  describe("priority formula", () => {
    it("should compute correct priorityScore for REFILL_NOW case (daysOfSupply=1)", async () => {
      const forecast = makeForecast({
        daysOfSupply: 1,
        sellingPrice: 10000,
        costPrice: 6000,
        dailyRate: 2,
      });
      forecastService.forecastMachine.mockResolvedValueOnce([forecast]);
      recRepo.findOne.mockResolvedValue(null);

      const results = await service.generateForMachine("org-1", "machine-1");
      expect(results).toHaveLength(1);

      const expected = computePriorityScore(10000, 6000, 2, 1);
      expect(results[0].priorityScore).toBeCloseTo(expected, 4);
      expect(results[0].recommendedAction).toBe(RefillAction.REFILL_NOW);
    });

    it("should compute correct priorityScore for REFILL_SOON case (daysOfSupply=3)", async () => {
      const forecast = makeForecast({
        daysOfSupply: 3,
        sellingPrice: 12000,
        costPrice: 8000,
        dailyRate: 5,
      });
      forecastService.forecastMachine.mockResolvedValueOnce([forecast]);
      recRepo.findOne.mockResolvedValue(null);

      const results = await service.generateForMachine("org-1", "machine-1");
      expect(results).toHaveLength(1);

      const expected = computePriorityScore(12000, 8000, 5, 3);
      expect(results[0].priorityScore).toBeCloseTo(expected, 4);
      expect(results[0].recommendedAction).toBe(RefillAction.REFILL_SOON);
    });

    it("should compute correct priorityScore for MONITOR case (daysOfSupply=10)", async () => {
      const forecast = makeForecast({
        daysOfSupply: 10,
        sellingPrice: 5000,
        costPrice: 3000,
        dailyRate: 1,
      });
      forecastService.forecastMachine.mockResolvedValueOnce([forecast]);
      recRepo.findOne.mockResolvedValue(null);

      const results = await service.generateForMachine("org-1", "machine-1");
      expect(results).toHaveLength(1);

      const expected = computePriorityScore(5000, 3000, 1, 10);
      expect(results[0].priorityScore).toBeCloseTo(expected, 4);
      expect(results[0].recommendedAction).toBe(RefillAction.MONITOR);
    });

    it("should cap urgency at 10 when daysOfSupply is 0", async () => {
      const forecast = makeForecast({
        daysOfSupply: 0,
        sellingPrice: 10000,
        costPrice: 6000,
        dailyRate: 3,
      });
      forecastService.forecastMachine.mockResolvedValueOnce([forecast]);
      recRepo.findOne.mockResolvedValue(null);

      const results = await service.generateForMachine("org-1", "machine-1");
      expect(results).toHaveLength(1);

      // urgency = min(10, 10) = 10
      const expected = computePriorityScore(10000, 6000, 3, 0);
      expect(results[0].priorityScore).toBeCloseTo(expected, 4);
      expect(results[0].recommendedAction).toBe(RefillAction.REFILL_NOW);
    });

    it("should compute margin and dailyProfit correctly on saved record", async () => {
      const forecast = makeForecast({
        sellingPrice: 15000,
        costPrice: 9000,
        dailyRate: 4,
        daysOfSupply: 2,
      });
      forecastService.forecastMachine.mockResolvedValueOnce([forecast]);
      recRepo.findOne.mockResolvedValue(null);

      const results = await service.generateForMachine("org-1", "machine-1");
      expect(results).toHaveLength(1);

      // margin = 15000 - 9000 = 6000, dailyProfit = 6000 * 4 = 24000
      expect(results[0].margin).toBeCloseTo(6000, 2);
      expect(results[0].dailyProfit).toBeCloseTo(24000, 2);
    });
  });

  // =========================================================================
  // Alert wiring tests
  // =========================================================================

  describe("alert wiring", () => {
    const orgId = "org-alert-1";
    const activeRule = {
      id: "rule-1",
      isActive: true,
      metric: AlertMetric.PREDICTED_STOCKOUT,
    };

    it("should fire triggerAlert for REFILL_NOW recommendations when an active rule exists", async () => {
      alertRuleRepo.findOne.mockResolvedValue(activeRule);

      const urgentForecast = makeForecast({
        daysOfSupply: 1,
        machineId: "machine-1",
        productId: "product-1",
      });
      forecastService.forecastMachine.mockResolvedValueOnce([urgentForecast]);
      recRepo.findOne.mockResolvedValue(null);

      await service.generateForOrganization(orgId);

      expect(alertsService.triggerAlert).toHaveBeenCalledTimes(1);
      expect(alertsService.triggerAlert).toHaveBeenCalledWith(
        orgId,
        activeRule.id,
        "machine-1",
        expect.any(Number),
        expect.any(String),
      );
    });

    it("should NOT fire triggerAlert when no PREDICTED_STOCKOUT rule exists for the org", async () => {
      alertRuleRepo.findOne.mockResolvedValue(null);

      const urgentForecast = makeForecast({ daysOfSupply: 1 });
      forecastService.forecastMachine.mockResolvedValueOnce([urgentForecast]);
      recRepo.findOne.mockResolvedValue(null);

      await service.generateForOrganization(orgId);

      expect(alertsService.triggerAlert).not.toHaveBeenCalled();
    });

    it("should NOT fire triggerAlert for MONITOR recommendations even when rule exists", async () => {
      alertRuleRepo.findOne.mockResolvedValue(activeRule);

      const monitorForecast = makeForecast({ daysOfSupply: 10 });
      forecastService.forecastMachine.mockResolvedValueOnce([monitorForecast]);
      recRepo.findOne.mockResolvedValue(null);

      await service.generateForOrganization(orgId);

      expect(alertsService.triggerAlert).not.toHaveBeenCalled();
    });

    it("should NOT fire triggerAlert for REFILL_SOON recommendations when rule exists", async () => {
      alertRuleRepo.findOne.mockResolvedValue(activeRule);

      const soonForecast = makeForecast({ daysOfSupply: 3 });
      forecastService.forecastMachine.mockResolvedValueOnce([soonForecast]);
      recRepo.findOne.mockResolvedValue(null);

      await service.generateForOrganization(orgId);

      expect(alertsService.triggerAlert).not.toHaveBeenCalled();
    });

    it("should fire multiple alerts when multiple machines have REFILL_NOW", async () => {
      alertRuleRepo.findOne.mockResolvedValue(activeRule);

      machineRepo.find.mockResolvedValue([
        { id: "machine-1", name: "VM-01" },
        { id: "machine-2", name: "VM-02" },
      ]);

      forecastService.forecastMachine
        .mockResolvedValueOnce([
          makeForecast({ daysOfSupply: 1, machineId: "machine-1" }),
        ])
        .mockResolvedValueOnce([
          makeForecast({ daysOfSupply: 1, machineId: "machine-2" }),
        ]);

      recRepo.findOne.mockResolvedValue(null);

      await service.generateForOrganization(orgId);

      expect(alertsService.triggerAlert).toHaveBeenCalledTimes(2);
    });

    it("should not throw when triggerAlert fails (defensive try/catch in service)", async () => {
      alertRuleRepo.findOne.mockResolvedValue(activeRule);
      alertsService.triggerAlert.mockRejectedValue(
        new Error("Alert delivery failed"),
      );

      const urgentForecast = makeForecast({ daysOfSupply: 1 });
      forecastService.forecastMachine.mockResolvedValueOnce([urgentForecast]);
      recRepo.findOne.mockResolvedValue(null);

      await expect(
        service.generateForOrganization(orgId),
      ).resolves.not.toThrow();
    });
  });

  // =========================================================================
  // Upsert behaviour
  // =========================================================================

  describe("upsert behaviour", () => {
    it("should create a new recommendation when none exists", async () => {
      recRepo.findOne.mockResolvedValue(null);
      const forecast = makeForecast();
      forecastService.forecastMachine.mockResolvedValueOnce([forecast]);

      await service.generateForMachine("org-1", "machine-1");

      expect(recRepo.create).toHaveBeenCalled();
      expect(recRepo.save).toHaveBeenCalled();
    });

    it("should update existing recommendation on upsert", async () => {
      const existing = {
        id: "rec-1",
        ...makeForecast(),
        priorityScore: 0,
        recommendedAction: RefillAction.MONITOR,
      };
      recRepo.findOne.mockResolvedValue(existing);
      const forecast = makeForecast({ daysOfSupply: 1 }); // now urgent
      forecastService.forecastMachine.mockResolvedValueOnce([forecast]);

      await service.generateForMachine("org-1", "machine-1");

      expect(recRepo.create).not.toHaveBeenCalled();
      expect(recRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          recommendedAction: RefillAction.REFILL_NOW,
        }),
      );
    });
  });
});
