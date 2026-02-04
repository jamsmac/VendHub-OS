/**
 * Alerts Service
 * Business logic for alert rules and alert history management
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  AlertRule,
  AlertHistory,
  AlertSeverity,
  AlertHistoryStatus,
  AlertCondition,
} from './entities/alert-rule.entity';
import {
  CreateAlertRuleDto,
  UpdateAlertRuleDto,
  AlertRuleQueryDto,
  AlertHistoryQueryDto,
} from './dto/create-alert-rule.dto';
import {
  AcknowledgeAlertDto,
  ResolveAlertDto,
  DismissAlertDto,
} from './dto/acknowledge-alert.dto';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(AlertRule)
    private readonly ruleRepository: Repository<AlertRule>,
    @InjectRepository(AlertHistory)
    private readonly historyRepository: Repository<AlertHistory>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ========================================================================
  // ALERT RULE CRUD
  // ========================================================================

  async createRule(
    organizationId: string,
    userId: string,
    dto: CreateAlertRuleDto,
  ): Promise<AlertRule> {
    // Validate BETWEEN condition has thresholdMax
    if (dto.condition === AlertCondition.BETWEEN && dto.thresholdMax == null) {
      throw new BadRequestException('thresholdMax is required for BETWEEN condition');
    }

    const rule = this.ruleRepository.create({
      organizationId,
      created_by_id: userId,
      ...dto,
    });

    const saved = await this.ruleRepository.save(rule);

    this.eventEmitter.emit('alerts.rule.created', { rule: saved });
    this.logger.log(`Alert rule created: ${saved.id} (${saved.name})`);

    return saved;
  }

  async findAllRules(
    organizationId: string,
    query: AlertRuleQueryDto,
  ): Promise<{ data: AlertRule[]; total: number; page: number; limit: number }> {
    const {
      metric,
      severity,
      machineId,
      activeOnly = true,
      search,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.ruleRepository
      .createQueryBuilder('r')
      .where('r.organizationId = :organizationId', { organizationId })
      .andWhere('r.deleted_at IS NULL');

    if (activeOnly) {
      qb.andWhere('r.isActive = true');
    }
    if (metric) {
      qb.andWhere('r.metric = :metric', { metric });
    }
    if (severity) {
      qb.andWhere('r.severity = :severity', { severity });
    }
    if (machineId) {
      qb.andWhere('(r.machineId = :machineId OR r.machineId IS NULL)', { machineId });
    }
    if (search) {
      qb.andWhere('(r.name ILIKE :search OR r.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('r.created_at', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOneRule(organizationId: string, id: string): Promise<AlertRule> {
    const rule = await this.ruleRepository.findOne({
      where: { id, organizationId },
    });

    if (!rule) {
      throw new NotFoundException(`Alert rule ${id} not found`);
    }

    return rule;
  }

  async updateRule(
    organizationId: string,
    id: string,
    dto: UpdateAlertRuleDto,
  ): Promise<AlertRule> {
    const rule = await this.findOneRule(organizationId, id);

    // Validate BETWEEN condition
    const newCondition = dto.condition ?? rule.condition;
    if (newCondition === AlertCondition.BETWEEN) {
      const thresholdMax = dto.thresholdMax ?? rule.thresholdMax;
      if (thresholdMax == null) {
        throw new BadRequestException('thresholdMax is required for BETWEEN condition');
      }
    }

    Object.assign(rule, dto);
    const saved = await this.ruleRepository.save(rule);

    this.eventEmitter.emit('alerts.rule.updated', { rule: saved });
    return saved;
  }

  async deleteRule(organizationId: string, id: string): Promise<void> {
    await this.findOneRule(organizationId, id);
    await this.ruleRepository.softDelete(id);
    this.eventEmitter.emit('alerts.rule.deleted', { ruleId: id });
  }

  // ========================================================================
  // ALERT TRIGGERING
  // ========================================================================

  /**
   * Trigger an alert for a given rule, creating an AlertHistory record
   */
  async triggerAlert(
    organizationId: string,
    ruleId: string,
    machineId: string | null,
    value: number,
    message?: string,
  ): Promise<AlertHistory> {
    const rule = await this.findOneRule(organizationId, ruleId);

    if (!rule.isActive) {
      throw new BadRequestException('Cannot trigger alert for inactive rule');
    }

    // Check cooldown: was there a recent alert for this rule/machine?
    const recentAlert = await this.historyRepository
      .createQueryBuilder('h')
      .where('h.ruleId = :ruleId', { ruleId })
      .andWhere('h.organizationId = :organizationId', { organizationId })
      .andWhere('h.triggeredAt > :cooldownTime', {
        cooldownTime: new Date(Date.now() - rule.cooldownMinutes * 60 * 1000),
      })
      .andWhere(machineId ? 'h.machineId = :machineId' : '1=1', { machineId })
      .getOne();

    if (recentAlert) {
      this.logger.debug(
        `Alert for rule ${ruleId} suppressed due to cooldown (last: ${recentAlert.triggeredAt})`,
      );
      return recentAlert;
    }

    const alertHistory = this.historyRepository.create({
      organizationId,
      ruleId,
      machineId,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      status: AlertHistoryStatus.ACTIVE,
      message: message || `${rule.name}: value ${value} ${rule.condition} ${rule.threshold}`,
    });

    const saved = await this.historyRepository.save(alertHistory);

    this.eventEmitter.emit('alerts.triggered', {
      alert: saved,
      rule,
      channels: rule.notifyChannels,
      userIds: rule.notifyUserIds,
    });

    this.logger.warn(
      `Alert triggered: ${rule.name} (${rule.severity}) - value: ${value}, threshold: ${rule.threshold}`,
    );

    return saved;
  }

  // ========================================================================
  // ALERT LIFECYCLE
  // ========================================================================

  async acknowledgeAlert(
    organizationId: string,
    alertId: string,
    userId: string,
    dto: AcknowledgeAlertDto,
  ): Promise<AlertHistory> {
    const alert = await this.findOneAlert(organizationId, alertId);

    if (alert.status !== AlertHistoryStatus.ACTIVE) {
      throw new BadRequestException(`Cannot acknowledge alert in ${alert.status} status`);
    }

    alert.status = AlertHistoryStatus.ACKNOWLEDGED;
    alert.acknowledgedByUserId = userId;
    alert.acknowledgedAt = new Date();

    if (dto.message) {
      alert.message = dto.message;
    }

    const saved = await this.historyRepository.save(alert);

    this.eventEmitter.emit('alerts.acknowledged', { alert: saved, userId });
    return saved;
  }

  async resolveAlert(
    organizationId: string,
    alertId: string,
    userId: string,
    dto: ResolveAlertDto,
  ): Promise<AlertHistory> {
    const alert = await this.findOneAlert(organizationId, alertId);

    if (![AlertHistoryStatus.ACTIVE, AlertHistoryStatus.ACKNOWLEDGED].includes(alert.status)) {
      throw new BadRequestException(`Cannot resolve alert in ${alert.status} status`);
    }

    alert.status = AlertHistoryStatus.RESOLVED;
    alert.resolvedAt = new Date();

    if (!alert.acknowledgedByUserId) {
      alert.acknowledgedByUserId = userId;
      alert.acknowledgedAt = new Date();
    }

    if (dto.message) {
      alert.message = dto.message;
    }

    const saved = await this.historyRepository.save(alert);

    this.eventEmitter.emit('alerts.resolved', { alert: saved, userId });
    return saved;
  }

  async dismissAlert(
    organizationId: string,
    alertId: string,
    userId: string,
    dto: DismissAlertDto,
  ): Promise<AlertHistory> {
    const alert = await this.findOneAlert(organizationId, alertId);

    if (![AlertHistoryStatus.ACTIVE, AlertHistoryStatus.ACKNOWLEDGED].includes(alert.status)) {
      throw new BadRequestException(`Cannot dismiss alert in ${alert.status} status`);
    }

    alert.status = AlertHistoryStatus.DISMISSED;

    if (dto.reason) {
      alert.message = dto.reason;
    }

    const saved = await this.historyRepository.save(alert);

    this.eventEmitter.emit('alerts.dismissed', { alert: saved, userId });
    return saved;
  }

  // ========================================================================
  // ALERT HISTORY QUERIES
  // ========================================================================

  async getAlertHistory(
    organizationId: string,
    query: AlertHistoryQueryDto,
  ): Promise<{ data: AlertHistory[]; total: number; page: number; limit: number }> {
    const {
      ruleId,
      machineId,
      status,
      severity,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'triggeredAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.historyRepository
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.rule', 'rule')
      .where('h.organizationId = :organizationId', { organizationId })
      .andWhere('h.deleted_at IS NULL');

    if (ruleId) {
      qb.andWhere('h.ruleId = :ruleId', { ruleId });
    }
    if (machineId) {
      qb.andWhere('h.machineId = :machineId', { machineId });
    }
    if (status) {
      qb.andWhere('h.status = :status', { status });
    }
    if (severity) {
      qb.andWhere('h.severity = :severity', { severity });
    }
    if (startDate && endDate) {
      qb.andWhere('h.triggeredAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    qb.orderBy(`h.${sortBy}`, sortOrder);

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async getActiveAlerts(
    organizationId: string,
    machineId?: string,
  ): Promise<AlertHistory[]> {
    const qb = this.historyRepository
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.rule', 'rule')
      .where('h.organizationId = :organizationId', { organizationId })
      .andWhere('h.status IN (:...statuses)', {
        statuses: [AlertHistoryStatus.ACTIVE, AlertHistoryStatus.ACKNOWLEDGED],
      })
      .andWhere('h.deleted_at IS NULL');

    if (machineId) {
      qb.andWhere('h.machineId = :machineId', { machineId });
    }

    qb.orderBy('h.severity', 'ASC') // CRITICAL first (alphabetical: critical < info < warning)
      .addOrderBy('h.triggeredAt', 'DESC');

    return qb.getMany();
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private async findOneAlert(organizationId: string, id: string): Promise<AlertHistory> {
    const alert = await this.historyRepository.findOne({
      where: { id, organizationId },
      relations: ['rule'],
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${id} not found`);
    }

    return alert;
  }
}
