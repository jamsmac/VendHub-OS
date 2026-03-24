/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { Container } from "../containers/entities/container.entity";
import { EquipmentComponent } from "../equipment/entities/equipment-component.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { SaleIngredient } from "../transactions/entities/sale-ingredient.entity";
import { EntityEvent } from "../entity-events/entities/entity-event.entity";
import {
  MachineCalculatedState,
  BunkerState,
  ComponentState,
  CleaningState,
  MachinePnL,
} from "./dto/machine-state.dto";
import {
  EntityEventType,
  TransactionType,
  TransactionStatus,
} from "@vendhub/shared";

const STATE_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class CalculatedStateService {
  constructor(
    @InjectRepository(Container)
    private readonly containerRepo: Repository<Container>,
    @InjectRepository(EquipmentComponent)
    private readonly componentRepo: Repository<EquipmentComponent>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(SaleIngredient)
    private readonly saleIngredientRepo: Repository<SaleIngredient>,
    @InjectRepository(EntityEvent)
    private readonly eventRepo: Repository<EntityEvent>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * Get full calculated state for a machine.
   * Cached for 5 minutes; invalidated by sales/loads.
   */
  async getMachineState(
    machineId: string,
    organizationId: string,
  ): Promise<MachineCalculatedState> {
    const cacheKey = `machine-state:${machineId}`;
    const cached = await this.cache.get<MachineCalculatedState>(cacheKey);
    if (cached) return cached;

    const machine = await this.machineRepo.findOne({
      where: { id: machineId, organizationId },
    });
    if (!machine) throw new NotFoundException("Machine not found");

    const [bunkers, components, cleaning] = await Promise.all([
      this.calculateBunkerStates(machineId, organizationId),
      this.calculateComponentStates(machineId, organizationId),
      this.calculateCleaningState(machineId, organizationId),
    ]);

    const state: MachineCalculatedState = {
      machineId,
      machineCode: machine.machineNumber,
      calculatedAt: new Date(),
      bunkers,
      components,
      cleaning,
      summary: {
        totalPortionsLeft: bunkers.reduce(
          (sum, b) => sum + (b.portionsLeft ?? 0),
          0,
        ),
        lowStockBunkers: bunkers.filter((b) => b.isLow).length,
        componentsNeedingMaintenance: components.filter(
          (c) => c.needsMaintenance,
        ).length,
        overdueTasks: 0, // Will be filled by tasks module integration
      },
    };

    await this.cache.set(cacheKey, state, STATE_CACHE_TTL);
    return state;
  }

  /**
   * Calculate bunker fill levels from container data.
   * Level = currentQuantity (updated by batch_movements on load/consume).
   */
  private async calculateBunkerStates(
    machineId: string,
    organizationId: string,
  ): Promise<BunkerState[]> {
    const containers = await this.containerRepo.find({
      where: { machineId, organizationId },
      order: { slotNumber: "ASC" },
    });

    // Get average daily consumption per container (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Batch query: get consumption for ALL containers in one DB call (fixes N+1)
    const containerIds = containers.map((c) => c.id);
    const consumptionMap = new Map<string, number>();

    if (containerIds.length > 0) {
      try {
        const consumptionRows = await this.saleIngredientRepo
          .createQueryBuilder("si")
          .select("si.container_id", "containerId")
          .addSelect("COALESCE(SUM(si.quantity_used), 0)", "totalUsed")
          .where("si.container_id IN (:...ids)", { ids: containerIds })
          .andWhere("si.created_at >= :since", { since: sevenDaysAgo })
          .groupBy("si.container_id")
          .getRawMany<{ containerId: string; totalUsed: string }>();

        for (const row of consumptionRows) {
          consumptionMap.set(row.containerId, Number(row.totalUsed));
        }
      } catch {
        // sale_ingredients table may not exist yet — gracefully degrade
      }
    }

    const results: BunkerState[] = [];

    for (const container of containers) {
      const totalUsed7d = consumptionMap.get(container.id) ?? 0;
      const avgDailyUsage = totalUsed7d / 7;
      const remaining = Number(container.currentQuantity);
      const capacity = Number(container.capacity);

      results.push({
        containerId: container.id,
        slotNumber: container.slotNumber,
        ingredientName: container.name,
        ingredientId: container.nomenclatureId,
        batchNumber: null, // TODO: join with ingredient_batches via currentBatchId
        batchId: (container as any).currentBatchId || null,
        remaining,
        capacity,
        fillPercent:
          capacity > 0 ? Math.round((remaining / capacity) * 100) : 0,
        portionsLeft:
          avgDailyUsage > 0
            ? Math.floor(
                remaining /
                  (avgDailyUsage / this.getAvgSalesPerDay(totalUsed7d)),
              )
            : null,
        daysUntilEmpty:
          avgDailyUsage > 0 ? Math.round(remaining / avgDailyUsage) : null,
        isLow:
          container.minLevel !== null
            ? remaining <= Number(container.minLevel)
            : false,
      });
    }

    return results;
  }

  private getAvgSalesPerDay(totalUsed7d: number): number {
    // Estimate average cups/sales per day from total grams consumed.
    // ~28g per cup is the standard for hot drinks (configurable per recipe in future).
    const AVG_GRAMS_PER_CUP = 28;
    if (totalUsed7d <= 0) return 0;
    const cupsIn7Days = totalUsed7d / AVG_GRAMS_PER_CUP;
    return cupsIn7Days / 7;
  }

  /**
   * Calculate component cycle counts and maintenance status.
   * Cycles = number of sales since last cycle reset.
   */
  private async calculateComponentStates(
    machineId: string,
    organizationId: string,
  ): Promise<ComponentState[]> {
    const components = await this.componentRepo.find({
      where: { machineId, organizationId },
    });

    return components.map((comp) => {
      const maxCycles = comp.expectedLifeHours; // Using hours as proxy for cycles
      const cycles = comp.currentHours;
      const usagePercent =
        maxCycles && maxCycles > 0 ? Math.round((cycles / maxCycles) * 100) : 0;

      return {
        componentId: comp.id,
        name: comp.name,
        type: comp.componentType,
        cyclesSinceReset: cycles,
        maxCycles,
        usagePercent: Math.min(usagePercent, 100),
        needsMaintenance: maxCycles ? cycles >= maxCycles : false,
        lastMaintenanceDate: comp.lastMaintenanceDate,
      };
    });
  }

  /**
   * Calculate cleaning schedule status from entity_events.
   */
  private async calculateCleaningState(
    machineId: string,
    organizationId: string,
  ): Promise<CleaningState> {
    // Last flush event
    const lastFlush = await this.eventRepo.findOne({
      where: {
        entityId: machineId,
        organizationId,
        eventType: EntityEventType.FLUSH_CYCLE as any,
      },
      order: { eventDate: "DESC" },
    });

    // Last deep clean event
    const lastDeepClean = await this.eventRepo.findOne({
      where: {
        entityId: machineId,
        organizationId,
        eventType: EntityEventType.CLEANING_DEEP as any,
      },
      order: { eventDate: "DESC" },
    });

    // Count sales since last flush
    const salesSinceFlush = await this.transactionRepo.count({
      where: {
        machineId,
        organizationId,
        type: TransactionType.SALE,
        status: TransactionStatus.COMPLETED,
        ...(lastFlush
          ? { transactionDate: MoreThan(lastFlush.eventDate) }
          : {}),
      },
    });

    const now = new Date();
    const daysSinceDeepClean = lastDeepClean
      ? Math.floor(
          (now.getTime() - new Date(lastDeepClean.eventDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 999;

    // Default thresholds (can be made configurable per machine)
    const flushThreshold = 50;
    const deepCleanIntervalDays = 7;

    return {
      cupsSinceFlush: salesSinceFlush,
      flushThreshold,
      flushOverdue: salesSinceFlush >= flushThreshold,
      daysSinceDeepClean,
      deepCleanIntervalDays,
      deepCleanOverdue: daysSinceDeepClean >= deepCleanIntervalDays,
      lastFlushDate: lastFlush?.eventDate || null,
      lastDeepCleanDate: lastDeepClean?.eventDate || null,
    };
  }

  /**
   * Calculate P&L for a machine over a period.
   */
  async getMachinePnL(
    machineId: string,
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<MachinePnL> {
    // Revenue: sum of completed sales
    const revenueResult = await this.transactionRepo
      .createQueryBuilder("t")
      .select("COALESCE(SUM(t.total_amount), 0)", "revenue")
      .addSelect("COUNT(t.id)", "salesCount")
      .where("t.machine_id = :machineId", { machineId })
      .andWhere("t.organization_id = :organizationId", { organizationId })
      .andWhere("t.type = :type", { type: TransactionType.SALE })
      .andWhere("t.status = :status", { status: TransactionStatus.COMPLETED })
      .andWhere("t.transaction_date BETWEEN :start AND :end", {
        start: periodStart,
        end: periodEnd,
      })
      .getRawOne();

    const revenue = Number(revenueResult?.revenue || 0);
    const salesCount = Number(revenueResult?.salesCount || 0);

    // COGS: sum of sale_ingredients.cost_total for these transactions
    const cogsResult = await this.saleIngredientRepo
      .createQueryBuilder("si")
      .select("COALESCE(SUM(si.cost_total), 0)", "cogs")
      .innerJoin("transactions", "t", "t.id = si.transaction_id")
      .where("t.machine_id = :machineId", { machineId })
      .andWhere("si.organization_id = :organizationId", { organizationId })
      .andWhere("t.transaction_date BETWEEN :start AND :end", {
        start: periodStart,
        end: periodEnd,
      })
      .getRawOne();

    const costOfGoods = Number(cogsResult?.cogs || 0);

    // Rent: from location contracts (if tracked)
    // For now, estimate from expense transactions
    const rentResult = await this.transactionRepo
      .createQueryBuilder("t")
      .select("COALESCE(SUM(t.total_amount), 0)", "rent")
      .where("t.machine_id = :machineId", { machineId })
      .andWhere("t.organization_id = :organizationId", { organizationId })
      .andWhere("t.type = :type", { type: TransactionType.EXPENSE })
      .andWhere("t.expense_category = :cat", { cat: "rent" })
      .andWhere("t.transaction_date BETWEEN :start AND :end", {
        start: periodStart,
        end: periodEnd,
      })
      .getRawOne();

    const rentCost = Number(rentResult?.rent || 0);

    // Maintenance costs: repair + purchase expenses for this machine
    const maintResult = await this.transactionRepo
      .createQueryBuilder("t")
      .select("COALESCE(SUM(t.total_amount), 0)", "maint")
      .where("t.machine_id = :machineId", { machineId })
      .andWhere("t.organization_id = :organizationId", { organizationId })
      .andWhere("t.type = :type", { type: TransactionType.EXPENSE })
      .andWhere("t.expense_category IN (:...cats)", {
        cats: ["repair", "purchase"],
      })
      .andWhere("t.transaction_date BETWEEN :start AND :end", {
        start: periodStart,
        end: periodEnd,
      })
      .getRawOne();

    const maintenanceCost = Number(maintResult?.maint || 0);
    const grossProfit = revenue - costOfGoods;
    const operatingExpenses = rentCost + maintenanceCost;
    const netProfit = grossProfit - operatingExpenses;

    return {
      periodStart,
      periodEnd,
      revenue,
      costOfGoods,
      grossProfit,
      rentCost,
      maintenanceCost,
      operatingExpenses,
      netProfit,
      marginPercent: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
      salesCount,
      avgTransaction: salesCount > 0 ? Math.round(revenue / salesCount) : 0,
    };
  }

  /**
   * Invalidate cached state (call after sale, load, or maintenance event)
   */
  async invalidateCache(machineId: string): Promise<void> {
    await this.cache.del(`machine-state:${machineId}`);
  }
}
