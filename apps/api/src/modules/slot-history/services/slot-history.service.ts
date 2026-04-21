import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, FindOptionsWhere } from "typeorm";
import {
  SlotHistory,
  SlotHistoryAction,
} from "../entities/slot-history.entity";

export interface LogSlotChangeInput {
  organizationId: string;
  machineId: string;
  slotNumber: string;
  action: SlotHistoryAction;
  prevProductId?: string | null;
  newProductId?: string | null;
  prevQuantity?: number | null;
  newQuantity?: number | null;
  prevPrice?: number | null;
  newPrice?: number | null;
  note?: string | null;
  byUserId?: string | null;
  at?: Date;
}

@Injectable()
export class SlotHistoryService {
  constructor(
    @InjectRepository(SlotHistory)
    private readonly historyRepo: Repository<SlotHistory>,
  ) {}

  async log(input: LogSlotChangeInput): Promise<SlotHistory> {
    return this.historyRepo.save(
      this.historyRepo.create({
        organizationId: input.organizationId,
        machineId: input.machineId,
        slotNumber: input.slotNumber,
        action: input.action,
        prevProductId: input.prevProductId ?? null,
        newProductId: input.newProductId ?? null,
        prevQuantity: input.prevQuantity ?? null,
        newQuantity: input.newQuantity ?? null,
        prevPrice: input.prevPrice ?? null,
        newPrice: input.newPrice ?? null,
        note: input.note ?? null,
        byUserId: input.byUserId ?? null,
        at: input.at ?? new Date(),
      }),
    );
  }

  async listByMachine(params: {
    organizationId: string;
    machineId: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: SlotHistory[]; total: number }> {
    const where: FindOptionsWhere<SlotHistory> = {
      organizationId: params.organizationId,
      machineId: params.machineId,
    };

    const [data, total] = await this.historyRepo.findAndCount({
      where,
      order: { at: "DESC" },
      skip: params.offset ?? 0,
      take: Math.min(params.limit ?? 50, 200),
      relations: ["prevProduct", "newProduct", "byUser"],
    });
    return { data, total };
  }
}
