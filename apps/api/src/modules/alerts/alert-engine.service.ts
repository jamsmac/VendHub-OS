/**
 * Alert Engine Service
 * Evaluates metrics against alert rules, designed for cron job execution
 */

import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  AlertRule,
  AlertCondition,
} from './entities/alert-rule.entity';
import { AlertsService } from './alerts.service';
import { Machine } from '../machines/entities/machine.entity';

@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);

  constructor(
    @InjectRepository(AlertRule)
    private readonly ruleRepository: Repository<AlertRule>,
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * Evaluate a single metric value against a rule's condition and threshold.
   * Returns true if the condition is met (alert should trigger).
   */
  evaluateMetric(
    value: number,
    condition: AlertCondition,
    threshold: number,
    thresholdMax?: number | null,
  ): boolean {
    switch (condition) {
      case AlertCondition.GREATER_THAN:
        return value > threshold;
      case AlertCondition.LESS_THAN:
        return value < threshold;
      case AlertCondition.EQUALS:
        return value === threshold;
      case AlertCondition.NOT_EQUALS:
        return value !== threshold;
      case AlertCondition.BETWEEN:
        if (thresholdMax == null) return false;
        return value >= threshold && value <= thresholdMax;
      default:
        this.logger.warn(`Unknown condition: ${condition}`);
        return false;
    }
  }

  /**
   * Check all active rules against provided metric data.
   * This method is designed to be called by a cron job or external trigger.
   *
   * @param metricsData Array of { organizationId, machineId, metric, value }
   */
  async checkAllRules(
    metricsData: {
      organizationId: string;
      machineId: string;
      metric: string;
      value: number;
    }[],
  ): Promise<void> {
    this.logger.log(`Evaluating ${metricsData.length} metric data points against alert rules...`);

    // Load all active rules grouped by org
    const activeRules = await this.ruleRepository.find({
      where: { isActive: true },
    });

    if (activeRules.length === 0) {
      this.logger.debug('No active alert rules found');
      return;
    }

    // Build lookup: orgId -> metric -> rules[]
    const ruleLookup = new Map<string, Map<string, AlertRule[]>>();

    for (const rule of activeRules) {
      if (!ruleLookup.has(rule.organizationId)) {
        ruleLookup.set(rule.organizationId, new Map());
      }
      const orgMap = ruleLookup.get(rule.organizationId)!;
      if (!orgMap.has(rule.metric)) {
        orgMap.set(rule.metric, []);
      }
      orgMap.get(rule.metric)!.push(rule);
    }

    let triggeredCount = 0;

    for (const data of metricsData) {
      const orgMap = ruleLookup.get(data.organizationId);
      if (!orgMap) continue;

      const rules = orgMap.get(data.metric);
      if (!rules) continue;

      for (const rule of rules) {
        // Check if rule applies to this machine (null = all machines)
        if (rule.machineId && rule.machineId !== data.machineId) {
          continue;
        }

        const shouldTrigger = this.evaluateMetric(
          data.value,
          rule.condition,
          Number(rule.threshold),
          rule.thresholdMax ? Number(rule.thresholdMax) : null,
        );

        if (shouldTrigger) {
          try {
            await this.alertsService.triggerAlert(
              data.organizationId,
              rule.id,
              data.machineId,
              data.value,
            );
            triggeredCount++;
          } catch (error: unknown) {
            // Cooldown or other expected errors
            this.logger.debug(
              `Alert trigger skipped for rule ${rule.id}: ${error instanceof Error ? error.message : error}`,
            );
          }
        }
      }
    }

    this.logger.log(`Alert evaluation complete: ${triggeredCount} alerts triggered`);
  }

  /**
   * Cron job: collect machine metrics and evaluate against alert rules.
   * Runs every 5 minutes, collecting stock levels, cash levels, and online status.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledCheck(): Promise<void> {
    this.logger.debug('Scheduled alert check running...');

    try {
      // Collect metrics from all active machines
      const machines = await this.machineRepository.find({
        select: [
          'id', 'organizationId', 'status', 'currentProductCount',
          'maxProductSlots', 'currentCashAmount', 'cashCapacity',
          'lastPingAt', 'totalSalesCount',
        ],
      });

      if (machines.length === 0) {
        this.logger.debug('No active machines found');
        return;
      }

      const metricsData: {
        organizationId: string;
        machineId: string;
        metric: string;
        value: number;
      }[] = [];

      const now = Date.now();

      for (const machine of machines) {
        const orgId = machine.organizationId;
        const machineId = machine.id;

        // Stock level as percentage of capacity
        if (machine.maxProductSlots > 0) {
          const stockPercent = (machine.currentProductCount / machine.maxProductSlots) * 100;
          metricsData.push({
            organizationId: orgId,
            machineId,
            metric: 'stock_level',
            value: Math.round(stockPercent),
          });
        }

        // Cash amount metric
        if (machine.currentCashAmount !== undefined && machine.currentCashAmount !== null) {
          metricsData.push({
            organizationId: orgId,
            machineId,
            metric: 'cash_amount',
            value: Number(machine.currentCashAmount),
          });

          // Cash fill percentage
          if (machine.cashCapacity > 0) {
            const cashPercent = (Number(machine.currentCashAmount) / Number(machine.cashCapacity)) * 100;
            metricsData.push({
              organizationId: orgId,
              machineId,
              metric: 'cash_fill_percent',
              value: Math.round(cashPercent),
            });
          }
        }

        // Offline duration metric (minutes since last ping)
        if (machine.lastPingAt) {
          const offlineMinutes = (now - new Date(machine.lastPingAt).getTime()) / 60000;
          metricsData.push({
            organizationId: orgId,
            machineId,
            metric: 'offline_duration',
            value: Math.round(offlineMinutes),
          });
        }

        // Total sales count (for trend-based alerts)
        if (machine.totalSalesCount !== undefined) {
          metricsData.push({
            organizationId: orgId,
            machineId,
            metric: 'total_sales',
            value: Number(machine.totalSalesCount),
          });
        }
      }

      if (metricsData.length > 0) {
        await this.checkAllRules(metricsData);
      }

      this.logger.debug(
        `Scheduled alert check complete: ${machines.length} machines, ${metricsData.length} metrics`,
      );
    } catch (error) {
      this.logger.error(
        `Scheduled alert check failed: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
