import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConsumptionRate } from "../entities/consumption-rate.entity";
import { Transaction } from "../../transactions/entities/transaction.entity";

@Injectable()
export class ConsumptionRateService {
  private readonly logger = new Logger(ConsumptionRateService.name);
  private readonly ALPHA = 0.2; // EWMA smoothing factor

  constructor(
    @InjectRepository(ConsumptionRate)
    private readonly rateRepo: Repository<ConsumptionRate>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
  ) {}

  async calculateRate(
    organizationId: string,
    machineId: string,
    productId: string,
    periodDays = 14,
  ): Promise<ConsumptionRate> {
    // Query daily sales aggregates
    const start = new Date();
    start.setDate(start.getDate() - periodDays);

    const dailySales = await this.txRepo
      .createQueryBuilder("t")
      .innerJoin("t.items", "ti")
      .select("DATE(t.created_at)", "day")
      .addSelect("COALESCE(SUM(ti.quantity), 0)", "qty")
      .where("t.organization_id = :org", { org: organizationId })
      .andWhere("t.machine_id = :machine", { machine: machineId })
      .andWhere("ti.product_id = :product", { product: productId })
      .andWhere("t.created_at >= :start", { start })
      .groupBy("day")
      .orderBy("day", "ASC")
      .getRawMany<{ day: string; qty: string }>();

    // Build day-by-day map
    const salesByDay = new Map<string, number>();
    for (const row of dailySales) {
      salesByDay.set(row.day, Number(row.qty));
    }

    // EWMA calculation
    let rate = 0;
    let sampleSize = 0;
    const today = new Date();
    for (let d = periodDays; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const key = date.toISOString().slice(0, 10);
      const daySales = salesByDay.get(key) ?? 0;
      if (daySales > 0) sampleSize++;
      rate = this.ALPHA * daySales + (1 - this.ALPHA) * rate;
    }

    // Upsert
    const existing = await this.rateRepo.findOne({
      where: { organizationId, machineId, productId, periodDays },
    });

    if (existing) {
      existing.ratePerDay = rate;
      existing.sampleSize = sampleSize;
      existing.lastCalculatedAt = new Date();
      return this.rateRepo.save(existing);
    }

    const newRate = this.rateRepo.create({
      organizationId,
      machineId,
      productId,
      periodDays,
      ratePerDay: rate,
      sampleSize,
      lastCalculatedAt: new Date(),
    });
    return this.rateRepo.save(newRate);
  }

  async getRatesForMachine(
    organizationId: string,
    machineId: string,
    periodDays = 14,
  ): Promise<ConsumptionRate[]> {
    return this.rateRepo.find({
      where: { organizationId, machineId, periodDays },
    });
  }
}
