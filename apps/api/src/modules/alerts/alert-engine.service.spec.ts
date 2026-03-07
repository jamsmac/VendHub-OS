import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AlertEngineService } from "./alert-engine.service";
import {
  AlertRule,
  AlertCondition,
  AlertHistory,
  AlertHistoryStatus,
  AlertSeverity,
  AlertMetric,
} from "./entities/alert-rule.entity";
import { AlertsService } from "./alerts.service";
import { Machine } from "../machines/entities/machine.entity";
import {
  Incident,
  IncidentType,
  IncidentPriority,
} from "../incidents/entities/incident.entity";

describe("AlertEngineService", () => {
  let service: AlertEngineService;
  let ruleRepository: jest.Mocked<Repository<AlertRule>>;
  let historyRepository: jest.Mocked<Repository<AlertHistory>>;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let incidentRepository: jest.Mocked<Repository<Incident>>;
  let alertsService: jest.Mocked<AlertsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = "org-uuid-1";
  const machineId = "machine-uuid-1";
  const ruleId = "rule-uuid-1";

  const mockRule: AlertRule = {
    id: ruleId,
    organizationId: orgId,
    name: "Low Stock",
    description: null,
    metric: AlertMetric.STOCK_LEVEL,
    condition: AlertCondition.LESS_THAN,
    threshold: 20,
    thresholdMax: null,
    severity: AlertSeverity.WARNING,
    machineId: null,
    notifyChannels: ["in_app"],
    notifyUserIds: [],
    cooldownMinutes: 60,
    isActive: true,
    metadata: {},
  } as unknown as AlertRule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEngineService,
        {
          provide: getRepositoryToken(AlertRule),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AlertHistory),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Incident),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: AlertsService,
          useValue: {
            triggerAlert: jest.fn(),
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

    service = module.get<AlertEngineService>(AlertEngineService);
    ruleRepository = module.get(getRepositoryToken(AlertRule));
    historyRepository = module.get(getRepositoryToken(AlertHistory));
    machineRepository = module.get(getRepositoryToken(Machine));
    incidentRepository = module.get(getRepositoryToken(Incident));
    alertsService = module.get(AlertsService);
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("evaluateMetric", () => {
    it("should return true for GREATER_THAN when value exceeds threshold", () => {
      expect(service.evaluateMetric(50, AlertCondition.GREATER_THAN, 30)).toBe(
        true,
      );
    });

    it("should return false for GREATER_THAN when value is below threshold", () => {
      expect(service.evaluateMetric(10, AlertCondition.GREATER_THAN, 30)).toBe(
        false,
      );
    });

    it("should return true for LESS_THAN when value is below threshold", () => {
      expect(service.evaluateMetric(5, AlertCondition.LESS_THAN, 20)).toBe(
        true,
      );
    });

    it("should return true for EQUALS when value matches threshold", () => {
      expect(service.evaluateMetric(10, AlertCondition.EQUALS, 10)).toBe(true);
    });

    it("should return true for NOT_EQUALS when value differs from threshold", () => {
      expect(service.evaluateMetric(15, AlertCondition.NOT_EQUALS, 10)).toBe(
        true,
      );
    });

    it("should return true for BETWEEN when value is within range", () => {
      expect(service.evaluateMetric(50, AlertCondition.BETWEEN, 10, 100)).toBe(
        true,
      );
    });

    it("should return false for BETWEEN when thresholdMax is null", () => {
      expect(service.evaluateMetric(50, AlertCondition.BETWEEN, 10, null)).toBe(
        false,
      );
    });

    it("should return false for unknown condition", () => {
      expect(service.evaluateMetric(50, "unknown" as AlertCondition, 30)).toBe(
        false,
      );
    });
  });

  describe("checkAllRules", () => {
    it("should skip evaluation when no active rules exist", async () => {
      ruleRepository.find.mockResolvedValue([]);

      await service.checkAllRules([
        { organizationId: orgId, machineId, metric: "stock_level", value: 5 },
      ]);

      expect(alertsService.triggerAlert).not.toHaveBeenCalled();
    });

    it("should trigger alert when metric matches rule condition", async () => {
      ruleRepository.find.mockResolvedValue([mockRule]);
      alertsService.triggerAlert.mockResolvedValue(undefined as any);

      await service.checkAllRules([
        { organizationId: orgId, machineId, metric: "stock_level", value: 5 },
      ]);

      expect(alertsService.triggerAlert).toHaveBeenCalledWith(
        orgId,
        ruleId,
        machineId,
        5,
      );
    });

    it("should not trigger alert when metric does not match rule condition", async () => {
      ruleRepository.find.mockResolvedValue([mockRule]);

      await service.checkAllRules([
        {
          organizationId: orgId,
          machineId,
          metric: "stock_level",
          value: 50,
        },
      ]);

      expect(alertsService.triggerAlert).not.toHaveBeenCalled();
    });

    it("should skip rule when machineId does not match", async () => {
      const machineSpecificRule = {
        ...mockRule,
        machineId: "other-machine",
      } as unknown as AlertRule;
      ruleRepository.find.mockResolvedValue([machineSpecificRule]);

      await service.checkAllRules([
        { organizationId: orgId, machineId, metric: "stock_level", value: 5 },
      ]);

      expect(alertsService.triggerAlert).not.toHaveBeenCalled();
    });

    it("should handle triggerAlert errors gracefully", async () => {
      ruleRepository.find.mockResolvedValue([mockRule]);
      alertsService.triggerAlert.mockRejectedValue(
        new Error("Cooldown active"),
      );

      await expect(
        service.checkAllRules([
          {
            organizationId: orgId,
            machineId,
            metric: "stock_level",
            value: 5,
          },
        ]),
      ).resolves.not.toThrow();
    });
  });

  describe("checkEscalations", () => {
    it("should escalate level 0 alerts older than 1 hour to level 1", async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const alert = {
        id: "alert-1",
        organizationId: orgId,
        ruleId,
        machineId,
        escalationLevel: 0,
        triggeredAt: twoHoursAgo,
        status: AlertHistoryStatus.ACTIVE,
        rule: mockRule,
      } as unknown as AlertHistory;

      historyRepository.find.mockResolvedValue([alert]);
      historyRepository.save.mockResolvedValue(alert);

      await service.checkEscalations();

      expect(historyRepository.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "alert.escalated",
        expect.objectContaining({ level: 1 }),
      );
    });

    it("should escalate level 2 alerts older than 12 hours to incident", async () => {
      const thirteenHoursAgo = new Date(Date.now() - 13 * 60 * 60 * 1000);
      const alert = {
        id: "alert-2",
        organizationId: orgId,
        ruleId,
        machineId,
        escalationLevel: 2,
        triggeredAt: thirteenHoursAgo,
        status: AlertHistoryStatus.ESCALATED,
        rule: mockRule,
        metricSnapshot: { currentValue: 5 },
      } as unknown as AlertHistory;

      const savedIncident = { id: "incident-1" } as unknown as Incident;
      historyRepository.find.mockResolvedValue([alert]);
      incidentRepository.create.mockReturnValue(savedIncident);
      incidentRepository.save.mockResolvedValue(savedIncident);
      historyRepository.save.mockResolvedValue(alert);

      await service.checkEscalations();

      expect(incidentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IncidentType.OTHER,
          priority: IncidentPriority.HIGH,
        }),
      );
      expect(incidentRepository.save).toHaveBeenCalled();
    });

    it("should do nothing when no active alerts need escalation", async () => {
      historyRepository.find.mockResolvedValue([]);

      await service.checkEscalations();

      expect(historyRepository.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe("scheduledCheck", () => {
    it("should collect metrics from machines and evaluate rules", async () => {
      const machines = [
        {
          id: machineId,
          organizationId: orgId,
          status: "active",
          currentProductCount: 5,
          maxProductSlots: 100,
          currentCashAmount: 50000,
          cashCapacity: 100000,
          lastPingAt: new Date(Date.now() - 10 * 60000),
          totalSalesCount: 200,
        },
      ] as unknown as Machine[];

      machineRepository.find.mockResolvedValue(machines);
      ruleRepository.find.mockResolvedValue([]);

      await service.scheduledCheck();

      expect(machineRepository.find).toHaveBeenCalled();
    });

    it("should skip when no machines exist", async () => {
      machineRepository.find.mockResolvedValue([]);

      await service.scheduledCheck();

      expect(ruleRepository.find).not.toHaveBeenCalled();
    });
  });
});
