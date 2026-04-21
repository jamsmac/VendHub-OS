import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { MachineSlot } from "../../machines/entities/machine.entity";
import { Product } from "../../products/entities/product.entity";
import { ConsumptionRateService } from "./consumption-rate.service";

export interface SlotForecast {
  machineId: string;
  productId: string;
  productName?: string;
  slotNumber?: string;
  currentStock: number;
  capacity: number;
  dailyRate: number;
  daysOfSupply: number;
  sellingPrice: number;
  costPrice: number;
}

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);
  private readonly MAX_DAYS = 999.99;

  constructor(
    @InjectRepository(MachineSlot)
    private readonly slotRepo: Repository<MachineSlot>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly consumptionRateService: ConsumptionRateService,
  ) {}

  async forecastMachine(
    organizationId: string,
    machineId: string,
  ): Promise<SlotForecast[]> {
    const slots = await this.slotRepo
      .createQueryBuilder("slot")
      .innerJoin("slot.machine", "machine")
      .where("slot.machine_id = :machineId", { machineId })
      .andWhere("machine.organization_id = :organizationId", { organizationId })
      .getMany();

    const rates = await this.consumptionRateService.getRatesForMachine(
      organizationId,
      machineId,
    );

    const rateMap = new Map<string, number>();
    for (const r of rates) {
      rateMap.set(r.productId, Number(r.ratePerDay));
    }

    const slotsWithProduct = slots.filter((s) => s.productId);
    const productIds = slotsWithProduct.map((s) => s.productId);

    const products =
      productIds.length > 0
        ? await this.productRepo.find({
            where: { id: In(productIds) },
            select: ["id", "sellingPrice", "purchasePrice"],
          })
        : [];

    const productMap = new Map<string, Product>();
    for (const p of products) {
      productMap.set(p.id, p);
    }

    return slotsWithProduct.map((slot) => {
      const dailyRate = rateMap.get(slot.productId) ?? 0;
      const daysOfSupply =
        dailyRate > 0
          ? Math.min(this.MAX_DAYS, slot.currentQuantity / dailyRate)
          : this.MAX_DAYS;

      const product = productMap.get(slot.productId);
      const sellingPrice = Number(slot.price ?? product?.sellingPrice ?? 0);
      const costPrice = Number(slot.costPrice ?? product?.purchasePrice ?? 0);

      return {
        machineId,
        productId: slot.productId,
        slotNumber: slot.slotNumber,
        currentStock: slot.currentQuantity,
        capacity: slot.capacity,
        dailyRate: Math.round(dailyRate * 10000) / 10000,
        daysOfSupply: Math.round(daysOfSupply * 100) / 100,
        sellingPrice,
        costPrice,
      };
    });
  }
}
