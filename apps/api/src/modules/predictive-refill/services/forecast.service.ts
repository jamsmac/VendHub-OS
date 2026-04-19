import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MachineSlot } from "../../machines/entities/machine.entity";
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
}

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);
  private readonly MAX_DAYS = 999.99;

  constructor(
    @InjectRepository(MachineSlot)
    private readonly slotRepo: Repository<MachineSlot>,
    private readonly consumptionRateService: ConsumptionRateService,
  ) {}

  async forecastMachine(
    organizationId: string,
    machineId: string,
  ): Promise<SlotForecast[]> {
    const slots = await this.slotRepo.find({
      where: { machineId },
    });

    const rates = await this.consumptionRateService.getRatesForMachine(
      organizationId,
      machineId,
    );

    const rateMap = new Map<string, number>();
    for (const r of rates) {
      rateMap.set(r.productId, Number(r.ratePerDay));
    }

    return slots
      .filter((s) => s.productId)
      .map((slot) => {
        const dailyRate = rateMap.get(slot.productId) ?? 0;
        const daysOfSupply =
          dailyRate > 0
            ? Math.min(this.MAX_DAYS, slot.currentQuantity / dailyRate)
            : this.MAX_DAYS;

        return {
          machineId,
          productId: slot.productId,
          slotNumber: slot.slotNumber,
          currentStock: slot.currentQuantity,
          capacity: slot.capacity,
          dailyRate: Math.round(dailyRate * 10000) / 10000,
          daysOfSupply: Math.round(daysOfSupply * 100) / 100,
        };
      });
  }
}
