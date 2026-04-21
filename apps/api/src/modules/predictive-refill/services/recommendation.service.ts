import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  RefillRecommendation,
  RefillAction,
} from "../entities/refill-recommendation.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { ForecastService, SlotForecast } from "./forecast.service";
import { GetRecommendationsDto } from "../dto/forecast-query.dto";
import { AlertsService } from "../../alerts/alerts.service";
import {
  AlertRule,
  AlertMetric,
} from "../../alerts/entities/alert-rule.entity";
import { QuantitySyncService } from "./quantity-sync.service";

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectRepository(RefillRecommendation)
    private readonly recRepo: Repository<RefillRecommendation>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(AlertRule)
    private readonly alertRuleRepo: Repository<AlertRule>,
    private readonly forecastService: ForecastService,
    private readonly alertsService: AlertsService,
    private readonly quantitySyncService: QuantitySyncService,
  ) {}

  async generateForMachine(
    organizationId: string,
    machineId: string,
  ): Promise<RefillRecommendation[]> {
    const forecasts = await this.forecastService.forecastMachine(
      organizationId,
      machineId,
    );

    const results: RefillRecommendation[] = [];
    for (const forecast of forecasts) {
      const rec = await this.upsertRecommendation(organizationId, forecast);
      results.push(rec);
    }
    return results;
  }

  async generateForOrganization(organizationId: string): Promise<number> {
    const machines = await this.machineRepo.find({
      where: { organizationId },
      select: ["id", "name"],
    });

    const machineNameMap = new Map(machines.map((m) => [m.id, m.name]));
    let count = 0;
    const allRecs: RefillRecommendation[] = [];

    for (const machine of machines) {
      const recs = await this.generateForMachine(organizationId, machine.id);
      count += recs.length;
      allRecs.push(...recs);
    }

    await this.fireStockoutAlerts(organizationId, allRecs, machineNameMap);

    this.logger.log(
      `Generated ${count} recommendations for org ${organizationId}`,
    );
    return count;
  }

  async list(
    organizationId: string,
    query: GetRecommendationsDto,
  ): Promise<{ data: RefillRecommendation[]; total: number }> {
    const qb = this.recRepo
      .createQueryBuilder("r")
      .where("r.organization_id = :org", { org: organizationId })
      .leftJoinAndSelect("r.machine", "machine")
      .leftJoinAndSelect("r.product", "product");

    if (query.action) {
      qb.andWhere("r.recommended_action = :action", { action: query.action });
    }
    if (query.machineId) {
      qb.andWhere("r.machine_id = :machineId", { machineId: query.machineId });
    }

    qb.orderBy("r.priority_score", "DESC");
    qb.skip(((query.page ?? 1) - 1) * (query.limit ?? 50));
    qb.take(query.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async markActed(
    organizationId: string,
    recommendationId: string,
  ): Promise<RefillRecommendation> {
    const rec = await this.recRepo.findOne({
      where: { id: recommendationId, organizationId },
    });
    if (!rec) {
      throw new NotFoundException("Recommendation not found");
    }
    rec.actedUponAt = new Date();
    const saved = await this.recRepo.save(rec);
    await this.quantitySyncService.resetOnRefill(rec.machineId, rec.productId);
    return saved;
  }

  private async fireStockoutAlerts(
    organizationId: string,
    recs: RefillRecommendation[],
    machineNameMap: Map<string, string>,
  ): Promise<void> {
    const rule = await this.alertRuleRepo.findOne({
      where: {
        organizationId,
        metric: AlertMetric.PREDICTED_STOCKOUT,
        isActive: true,
      },
    });
    if (!rule) return;

    const urgentRecs = recs.filter(
      (r) => r.recommendedAction === RefillAction.REFILL_NOW,
    );

    for (const rec of urgentRecs) {
      const machineName = machineNameMap.get(rec.machineId) ?? rec.machineId;
      try {
        await this.alertsService.triggerAlert(
          organizationId,
          rule.id,
          rec.machineId,
          Number(rec.priorityScore),
          `${machineName}: ${rec.daysOfSupply} дн. запаса (маржа ${rec.margin} UZS/шт)`,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "unknown error";
        this.logger.debug(
          `Alert failed for machine ${rec.machineId}: ${message}`,
        );
      }
    }
  }

  private async upsertRecommendation(
    organizationId: string,
    forecast: SlotForecast,
  ): Promise<RefillRecommendation> {
    const margin = forecast.sellingPrice - forecast.costPrice;
    const dailyProfit = margin * forecast.dailyRate;
    const urgency = Math.min(
      10,
      forecast.daysOfSupply > 0 ? 1 / forecast.daysOfSupply : 10,
    );
    const priorityScore = urgency * Math.log10(1 + Math.max(0, dailyProfit));

    const action =
      forecast.daysOfSupply < 2
        ? RefillAction.REFILL_NOW
        : forecast.daysOfSupply < 5
          ? RefillAction.REFILL_SOON
          : RefillAction.MONITOR;

    const existing = await this.recRepo.findOne({
      where: {
        organizationId,
        machineId: forecast.machineId,
        productId: forecast.productId,
      },
    });

    const data = {
      currentStock: forecast.currentStock,
      capacity: forecast.capacity,
      dailyRate: forecast.dailyRate,
      daysOfSupply: forecast.daysOfSupply,
      priorityScore: Math.round(priorityScore * 10000) / 10000,
      recommendedAction: action,
      sellingPrice: forecast.sellingPrice,
      costPrice: forecast.costPrice,
      margin: Math.round(margin * 100) / 100,
      dailyProfit: Math.round(dailyProfit * 100) / 100,
      generatedAt: new Date(),
    };

    if (existing) {
      Object.assign(existing, data);
      return this.recRepo.save(existing);
    }

    return this.recRepo.save(
      this.recRepo.create({
        organizationId,
        machineId: forecast.machineId,
        productId: forecast.productId,
        ...data,
      }),
    );
  }
}
