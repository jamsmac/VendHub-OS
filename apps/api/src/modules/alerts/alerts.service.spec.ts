import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { AlertsService } from './alerts.service';
import {
  AlertRule,
  AlertHistory,
  AlertSeverity,
  AlertHistoryStatus,
  AlertCondition,
  AlertMetric,
} from './entities/alert-rule.entity';

describe('AlertsService', () => {
  let service: AlertsService;
  let ruleRepository: jest.Mocked<Repository<AlertRule>>;
  let historyRepository: jest.Mocked<Repository<AlertHistory>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';
  const ruleId = 'rule-uuid-1';
  const alertId = 'alert-uuid-1';

  const mockRule: AlertRule = {
    id: ruleId,
    organizationId: orgId,
    name: 'Low Stock Alert',
    description: 'Triggers when stock is below threshold',
    metric: AlertMetric.STOCK_LEVEL,
    condition: AlertCondition.LESS_THAN,
    threshold: 10,
    thresholdMax: null,
    severity: AlertSeverity.WARNING,
    machineId: null,
    notifyChannels: ['in_app'],
    notifyUserIds: [],
    cooldownMinutes: 60,
    isActive: true,
    metadata: {},
    created_by_id: userId,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    updated_by_id: null,
  } as unknown as AlertRule;

  const mockAlert: AlertHistory = {
    id: alertId,
    organizationId: orgId,
    ruleId,
    machineId: 'machine-uuid-1',
    triggeredAt: new Date(),
    value: 5,
    threshold: 10,
    severity: AlertSeverity.WARNING,
    status: AlertHistoryStatus.ACTIVE,
    acknowledgedByUserId: null,
    acknowledgedAt: null,
    resolvedAt: null,
    message: 'Low Stock Alert: value 5 less_than 10',
    metadata: {},
    rule: mockRule,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as unknown as AlertHistory;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockRule], 1]),
    getMany: jest.fn().mockResolvedValue([mockAlert]),
    getOne: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(AlertRule),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(AlertHistory),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
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

    service = module.get<AlertsService>(AlertsService);
    ruleRepository = module.get(getRepositoryToken(AlertRule));
    historyRepository = module.get(getRepositoryToken(AlertHistory));
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // ALERT RULE CRUD
  // ============================================================================

  describe('createRule', () => {
    it('should create a new alert rule', async () => {
      const dto = {
        name: 'Low Stock Alert',
        metric: AlertMetric.STOCK_LEVEL,
        condition: AlertCondition.LESS_THAN,
        threshold: 10,
        severity: AlertSeverity.WARNING,
      };

      ruleRepository.create.mockReturnValue(mockRule);
      ruleRepository.save.mockResolvedValue(mockRule);

      const result = await service.createRule(orgId, userId, dto as any);

      expect(result).toEqual(mockRule);
      expect(ruleRepository.create).toHaveBeenCalledWith({
        organizationId: orgId,
        created_by_id: userId,
        ...dto,
      });
      expect(ruleRepository.save).toHaveBeenCalledWith(mockRule);
      expect(eventEmitter.emit).toHaveBeenCalledWith('alerts.rule.created', {
        rule: mockRule,
      });
    });

    it('should throw BadRequestException for BETWEEN condition without thresholdMax', async () => {
      const dto = {
        name: 'Temperature Range',
        metric: AlertMetric.TEMPERATURE,
        condition: AlertCondition.BETWEEN,
        threshold: 5,
        severity: AlertSeverity.WARNING,
      };

      await expect(
        service.createRule(orgId, userId, dto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create rule with BETWEEN condition when thresholdMax provided', async () => {
      const dto = {
        name: 'Temperature Range',
        metric: AlertMetric.TEMPERATURE,
        condition: AlertCondition.BETWEEN,
        threshold: 5,
        thresholdMax: 25,
        severity: AlertSeverity.WARNING,
      };

      ruleRepository.create.mockReturnValue(mockRule);
      ruleRepository.save.mockResolvedValue(mockRule);

      const result = await service.createRule(orgId, userId, dto as any);

      expect(result).toEqual(mockRule);
    });
  });

  describe('findAllRules', () => {
    it('should return paginated alert rules', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockRule], 1]);

      const result = await service.findAllRules(orgId, {} as any);

      expect(result).toEqual({
        data: [mockRule],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(ruleRepository.createQueryBuilder).toHaveBeenCalledWith('r');
    });

    it('should apply metric filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllRules(orgId, {
        metric: AlertMetric.TEMPERATURE,
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'r.metric = :metric',
        { metric: AlertMetric.TEMPERATURE },
      );
    });

    it('should apply severity filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllRules(orgId, {
        severity: AlertSeverity.CRITICAL,
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'r.severity = :severity',
        { severity: AlertSeverity.CRITICAL },
      );
    });

    it('should apply search filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAllRules(orgId, {
        search: 'stock',
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(r.name ILIKE :search OR r.description ILIKE :search)',
        { search: '%stock%' },
      );
    });
  });

  describe('findOneRule', () => {
    it('should return a rule by id', async () => {
      ruleRepository.findOne.mockResolvedValue(mockRule);

      const result = await service.findOneRule(orgId, ruleId);

      expect(result).toEqual(mockRule);
      expect(ruleRepository.findOne).toHaveBeenCalledWith({
        where: { id: ruleId, organizationId: orgId },
      });
    });

    it('should throw NotFoundException when rule not found', async () => {
      ruleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOneRule(orgId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const dto = { name: 'Updated Name' };
      const updatedRule = { ...mockRule, name: 'Updated Name' };

      ruleRepository.findOne.mockResolvedValue(mockRule);
      ruleRepository.save.mockResolvedValue(updatedRule as AlertRule);

      const result = await service.updateRule(orgId, ruleId, dto as any);

      expect(result).toEqual(updatedRule);
      expect(eventEmitter.emit).toHaveBeenCalledWith('alerts.rule.updated', {
        rule: updatedRule,
      });
    });

    it('should throw NotFoundException when rule not found', async () => {
      ruleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateRule(orgId, 'non-existent', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when changing to BETWEEN without thresholdMax', async () => {
      const ruleWithoutMax = { ...mockRule, thresholdMax: null };
      ruleRepository.findOne.mockResolvedValue(ruleWithoutMax as AlertRule);

      await expect(
        service.updateRule(orgId, ruleId, {
          condition: AlertCondition.BETWEEN,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteRule', () => {
    it('should soft delete a rule', async () => {
      ruleRepository.findOne.mockResolvedValue(mockRule);
      ruleRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.deleteRule(orgId, ruleId);

      expect(ruleRepository.softDelete).toHaveBeenCalledWith(ruleId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('alerts.rule.deleted', {
        ruleId,
      });
    });

    it('should throw NotFoundException when rule not found', async () => {
      ruleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteRule(orgId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // ALERT TRIGGERING
  // ============================================================================

  describe('triggerAlert', () => {
    it('should create an alert history record', async () => {
      ruleRepository.findOne.mockResolvedValue(mockRule);
      mockQueryBuilder.getOne.mockResolvedValue(null); // no recent alert
      historyRepository.create.mockReturnValue(mockAlert);
      historyRepository.save.mockResolvedValue(mockAlert);

      const result = await service.triggerAlert(
        orgId,
        ruleId,
        'machine-uuid-1',
        5,
      );

      expect(result).toEqual(mockAlert);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'alerts.triggered',
        expect.objectContaining({
          alert: mockAlert,
          rule: mockRule,
        }),
      );
    });

    it('should throw BadRequestException for inactive rule', async () => {
      const inactiveRule = { ...mockRule, isActive: false };
      ruleRepository.findOne.mockResolvedValue(inactiveRule as AlertRule);

      await expect(
        service.triggerAlert(orgId, ruleId, null, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return recent alert during cooldown period', async () => {
      ruleRepository.findOne.mockResolvedValue(mockRule);
      mockQueryBuilder.getOne.mockResolvedValue(mockAlert); // recent alert exists

      const result = await service.triggerAlert(
        orgId,
        ruleId,
        'machine-uuid-1',
        5,
      );

      expect(result).toEqual(mockAlert);
      expect(historyRepository.save).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ALERT LIFECYCLE
  // ============================================================================

  describe('acknowledgeAlert', () => {
    it('should acknowledge an active alert', async () => {
      const acknowledged = {
        ...mockAlert,
        status: AlertHistoryStatus.ACKNOWLEDGED,
        acknowledgedByUserId: userId,
      };

      historyRepository.findOne.mockResolvedValue(mockAlert);
      historyRepository.save.mockResolvedValue(acknowledged as AlertHistory);

      const result = await service.acknowledgeAlert(
        orgId,
        alertId,
        userId,
        {} as any,
      );

      expect(result.status).toEqual(AlertHistoryStatus.ACKNOWLEDGED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'alerts.acknowledged',
        expect.objectContaining({ userId }),
      );
    });

    it('should throw BadRequestException for non-active alert', async () => {
      const resolvedAlert = {
        ...mockAlert,
        status: AlertHistoryStatus.RESOLVED,
      };
      historyRepository.findOne.mockResolvedValue(
        resolvedAlert as AlertHistory,
      );

      await expect(
        service.acknowledgeAlert(orgId, alertId, userId, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when alert not found', async () => {
      historyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.acknowledgeAlert(orgId, 'non-existent', userId, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an active alert', async () => {
      const resolved = {
        ...mockAlert,
        status: AlertHistoryStatus.RESOLVED,
      };

      historyRepository.findOne.mockResolvedValue(mockAlert);
      historyRepository.save.mockResolvedValue(resolved as AlertHistory);

      const result = await service.resolveAlert(
        orgId,
        alertId,
        userId,
        {} as any,
      );

      expect(result.status).toEqual(AlertHistoryStatus.RESOLVED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'alerts.resolved',
        expect.objectContaining({ userId }),
      );
    });

    it('should resolve an acknowledged alert', async () => {
      const acknowledgedAlert = {
        ...mockAlert,
        status: AlertHistoryStatus.ACKNOWLEDGED,
        acknowledgedByUserId: 'other-user',
      };
      const resolved = {
        ...acknowledgedAlert,
        status: AlertHistoryStatus.RESOLVED,
      };

      historyRepository.findOne.mockResolvedValue(
        acknowledgedAlert as AlertHistory,
      );
      historyRepository.save.mockResolvedValue(resolved as AlertHistory);

      const result = await service.resolveAlert(
        orgId,
        alertId,
        userId,
        {} as any,
      );

      expect(result.status).toEqual(AlertHistoryStatus.RESOLVED);
    });

    it('should throw BadRequestException for dismissed alert', async () => {
      const dismissed = {
        ...mockAlert,
        status: AlertHistoryStatus.DISMISSED,
      };
      historyRepository.findOne.mockResolvedValue(
        dismissed as AlertHistory,
      );

      await expect(
        service.resolveAlert(orgId, alertId, userId, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dismissAlert', () => {
    it('should dismiss an active alert', async () => {
      const dismissed = {
        ...mockAlert,
        status: AlertHistoryStatus.DISMISSED,
      };

      historyRepository.findOne.mockResolvedValue(mockAlert);
      historyRepository.save.mockResolvedValue(dismissed as AlertHistory);

      const result = await service.dismissAlert(
        orgId,
        alertId,
        userId,
        { reason: 'False positive' } as any,
      );

      expect(result.status).toEqual(AlertHistoryStatus.DISMISSED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'alerts.dismissed',
        expect.objectContaining({ userId }),
      );
    });

    it('should throw BadRequestException for resolved alert', async () => {
      const resolved = {
        ...mockAlert,
        status: AlertHistoryStatus.RESOLVED,
      };
      historyRepository.findOne.mockResolvedValue(
        resolved as AlertHistory,
      );

      await expect(
        service.dismissAlert(orgId, alertId, userId, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // ALERT HISTORY QUERIES
  // ============================================================================

  describe('getAlertHistory', () => {
    it('should return paginated alert history', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockAlert], 1]);

      const result = await service.getAlertHistory(orgId, {} as any);

      expect(result).toEqual({
        data: [mockAlert],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('should apply status filter', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.getAlertHistory(orgId, {
        status: AlertHistoryStatus.ACTIVE,
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'h.status = :status',
        { status: AlertHistoryStatus.ACTIVE },
      );
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts for organization', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockAlert]);

      const result = await service.getActiveAlerts(orgId);

      expect(result).toEqual([mockAlert]);
    });

    it('should apply machineId filter when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockAlert]);

      await service.getActiveAlerts(orgId, 'machine-uuid-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'h.machineId = :machineId',
        { machineId: 'machine-uuid-1' },
      );
    });
  });
});
