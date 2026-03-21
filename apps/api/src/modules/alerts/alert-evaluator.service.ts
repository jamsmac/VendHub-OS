/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  AlertRule,
  AlertHistory,
  AlertHistoryStatus,
  AlertMetric,
  AlertCondition,
} from "./entities/alert-rule.entity";
import { Machine } from "../machines/entities/machine.entity";
import { CalculatedStateService } from "../calculated-state/calculated-state.service";
import { IngredientBatch } from "../products/entities/product.entity";

@Injectable()
export class AlertEvaluatorService {
  private readonly logger = new Logger(AlertEvaluatorService.name);

  constructor(
    @InjectRepository(AlertRule)
    private readonly ruleRepo: Repository<AlertRule>,
    @InjectRepository(AlertHistory)
    private readonly historyRepo: Repository<AlertHistory>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(IngredientBatch)
    private readonly batchRepo: Repository<IngredientBatch>,
    private readonly calculatedStateService: CalculatedStateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Run every 15 minutes. Evaluate all active alert rules
   * against calculated machine state.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async evaluateAllRules(): Promise<void> {
    this.logger.log("Starting alert rule evaluation...");

    const rules = await this.ruleRepo.find({ where: { isActive: true } });
    if (rules.length === 0) return;

    // Group rules by organization
    const rulesByOrg = new Map<string, AlertRule[]>();
    for (const rule of rules) {
      const orgRules = rulesByOrg.get(rule.organizationId) || [];
      orgRules.push(rule);
      rulesByOrg.set(rule.organizationId, orgRules);
    }

    let triggered = 0;

    for (const [orgId, orgRules] of rulesByOrg) {
      try {
        triggered += await this.evaluateOrgRules(orgId, orgRules);
      } catch (err) {
        this.logger.error(`Error evaluating rules for org ${orgId}: ${err}`);
      }
    }

    this.logger.log(
      `Alert evaluation complete: ${rules.length} rules, ${triggered} triggered`,
    );
  }

  private async evaluateOrgRules(
    orgId: string,
    rules: AlertRule[],
  ): Promise<number> {
    let triggered = 0;

    // Get all active machines for this org
    const machines = await this.machineRepo.find({
      where: { organizationId: orgId, status: "active" as any },
      select: ["id", "machineNumber", "organizationId"],
    });

    for (const rule of rules) {
      // Machine-specific or org-wide rule
      const targetMachines = rule.machineId
        ? machines.filter((m) => m.id === rule.machineId)
        : machines;

      for (const machine of targetMachines) {
        try {
          const didTrigger = await this.evaluateRuleForMachine(
            rule,
            machine,
            orgId,
          );
          if (didTrigger) triggered++;
        } catch (err) {
          // Don't let one machine failure stop evaluation
          this.logger.warn(
            `Rule ${rule.id} evaluation failed for machine ${machine.id}: ${err}`,
          );
        }
      }

      // Non-machine rules (e.g., expiry_warning)
      if (rule.metric === AlertMetric.EXPIRY_WARNING) {
        const didTrigger = await this.evaluateExpiryWarning(rule, orgId);
        if (didTrigger) triggered++;
      }
    }

    return triggered;
  }

  private async evaluateRuleForMachine(
    rule: AlertRule,
    machine: { id: string; organizationId: string },
    orgId: string,
  ): Promise<boolean> {
    let currentValue: number | null = null;

    // Get calculated state
    const state = await this.calculatedStateService.getMachineState(
      machine.id,
      orgId,
    );

    switch (rule.metric) {
      case AlertMetric.STOCK_LEVEL:
      case AlertMetric.CONSUMABLE_LOW: {
        // Check if any bunker is below threshold
        const lowBunker = state.bunkers.find(
          (b) => b.fillPercent < Number(rule.threshold),
        );
        if (lowBunker) currentValue = lowBunker.fillPercent;
        break;
      }

      case AlertMetric.COMPONENT_CYCLES: {
        // Check if any component exceeds cycle threshold
        const overComponent = state.components.find(
          (c) => c.cyclesSinceReset >= Number(rule.threshold),
        );
        if (overComponent) currentValue = overComponent.cyclesSinceReset;
        break;
      }

      case AlertMetric.FLUSH_DUE: {
        if (state.cleaning.cupsSinceFlush >= Number(rule.threshold)) {
          currentValue = state.cleaning.cupsSinceFlush;
        }
        break;
      }

      case AlertMetric.CLEANING_DUE: {
        if (state.cleaning.daysSinceDeepClean >= Number(rule.threshold)) {
          currentValue = state.cleaning.daysSinceDeepClean;
        }
        break;
      }

      case AlertMetric.CASH_LEVEL: {
        // Would need machine.currentCashAmount — already in Machine entity
        break;
      }

      default:
        return false;
    }

    if (currentValue === null) return false;

    // Check condition
    const isTriggered = this.checkCondition(
      rule.condition,
      currentValue,
      Number(rule.threshold),
      rule.thresholdMax ? Number(rule.thresholdMax) : undefined,
    );

    if (!isTriggered) return false;

    // Check cooldown — don't re-trigger within cooldown period
    const recentAlert = await this.historyRepo.findOne({
      where: {
        ruleId: rule.id,
        machineId: machine.id,
        status: AlertHistoryStatus.ACTIVE,
      },
      order: { triggeredAt: "DESC" },
    });

    if (recentAlert) {
      const cooldownMs = (rule.cooldownMinutes || 60) * 60 * 1000;
      if (
        Date.now() - new Date(recentAlert.triggeredAt).getTime() <
        cooldownMs
      ) {
        return false; // Still in cooldown
      }
    }

    // Create alert
    await this.createAlert(rule, machine.id, currentValue, orgId);
    return true;
  }

  private async evaluateExpiryWarning(
    rule: AlertRule,
    orgId: string,
  ): Promise<boolean> {
    const warningDays = Number(rule.threshold) || 7;
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + warningDays);

    const expiringBatches = await this.batchRepo
      .createQueryBuilder("b")
      .where("b.organization_id = :orgId", { orgId })
      .andWhere("b.status IN (:...statuses)", {
        statuses: ["in_stock", "partially_used"],
      })
      .andWhere("b.expiry_date IS NOT NULL")
      .andWhere("b.expiry_date <= :warningDate", { warningDate })
      .andWhere("b.deleted_at IS NULL")
      .getCount();

    if (expiringBatches === 0) return false;

    // Check cooldown
    const recentAlert = await this.historyRepo.findOne({
      where: {
        ruleId: rule.id,
        organizationId: orgId,
        status: AlertHistoryStatus.ACTIVE,
      },
      order: { triggeredAt: "DESC" },
    });

    if (recentAlert) {
      const cooldownMs = (rule.cooldownMinutes || 60) * 60 * 1000;
      if (
        Date.now() - new Date(recentAlert.triggeredAt).getTime() <
        cooldownMs
      ) {
        return false;
      }
    }

    await this.createAlert(rule, null, expiringBatches, orgId);
    return true;
  }

  private checkCondition(
    condition: AlertCondition,
    value: number,
    threshold: number,
    thresholdMax?: number,
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
        return (
          thresholdMax !== undefined &&
          value >= threshold &&
          value <= thresholdMax
        );
      default:
        return false;
    }
  }

  private async createAlert(
    rule: AlertRule,
    machineId: string | null,
    value: number,
    orgId: string,
  ): Promise<void> {
    const alert = this.historyRepo.create({
      organizationId: orgId,
      ruleId: rule.id,
      machineId,
      title: rule.name,
      triggeredAt: new Date(),
      value,
      threshold: Number(rule.threshold),
      severity: rule.severity,
      status: AlertHistoryStatus.ACTIVE,
      message: `${rule.name}: значение ${value} (порог: ${rule.threshold})`,
      metricSnapshot: {
        currentValue: value,
        threshold: Number(rule.threshold),
        metric: rule.metric,
      },
    });

    await this.historyRepo.save(alert);

    // Emit event for notification system
    this.eventEmitter.emit("alert.triggered", {
      alert,
      rule,
      notifyChannels: rule.notifyChannels,
      notifyUserIds: rule.notifyUserIds,
    });

    this.logger.log(
      `Alert triggered: ${rule.name} (machine: ${machineId || "org-wide"}, value: ${value})`,
    );
  }
}
