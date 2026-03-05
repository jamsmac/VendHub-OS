/**
 * Cash Finance Service
 * Tracks cash-on-hand: money received from collections minus bank deposits
 * Uses REPEATABLE READ isolation for consistent snapshot reads
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { BankDeposit } from "./entities/bank-deposit.entity";
import {
  Collection,
  CollectionStatus,
} from "../collections/entities/collection.entity";
import { CreateDepositDto } from "./dto/create-deposit.dto";

@Injectable()
export class CashFinanceService {
  private readonly logger = new Logger(CashFinanceService.name);

  constructor(
    @InjectRepository(BankDeposit)
    private readonly depositRepo: Repository<BankDeposit>,
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Record a bank deposit
   */
  async createDeposit(
    organizationId: string,
    userId: string,
    dto: CreateDepositDto,
  ): Promise<BankDeposit> {
    const deposit = this.depositRepo.create({
      organizationId,
      amount: dto.amount,
      depositDate: new Date(dto.date),
      notes: dto.notes ?? null,
      createdById: userId,
    });

    const saved = await this.depositRepo.save(deposit);

    this.logger.log(
      `Bank deposit ${saved.id}: ${dto.amount} UZS on ${dto.date} by user ${userId}`,
    );

    return saved;
  }

  /**
   * List all bank deposits
   */
  async findAllDeposits(organizationId: string): Promise<BankDeposit[]> {
    return this.depositRepo.find({
      where: { organizationId },
      order: { depositDate: "DESC" },
    });
  }

  /**
   * Get cash-on-hand balance
   * balance = SUM(received collections) - SUM(bank deposits)
   * Uses REPEATABLE READ for consistent snapshot
   */
  async getBalance(organizationId: string): Promise<{
    received: number;
    deposited: number;
    balance: number;
  }> {
    return this.dataSource.transaction("REPEATABLE READ", async (manager) => {
      const receivedResult = await manager
        .createQueryBuilder(Collection, "c")
        .select("COALESCE(SUM(c.amount), 0)", "total")
        .where("c.organizationId = :organizationId", { organizationId })
        .andWhere("c.status = :status", { status: CollectionStatus.RECEIVED })
        .getRawOne();

      const depositedResult = await manager
        .createQueryBuilder(BankDeposit, "d")
        .select("COALESCE(SUM(d.amount), 0)", "total")
        .where("d.organizationId = :organizationId", { organizationId })
        .getRawOne();

      const received = parseFloat(receivedResult?.total ?? "0");
      const deposited = parseFloat(depositedResult?.total ?? "0");

      return {
        received,
        deposited,
        balance: received - deposited,
      };
    });
  }

  /**
   * Delete a bank deposit
   */
  async removeDeposit(id: string, organizationId: string): Promise<void> {
    const deposit = await this.depositRepo.findOne({
      where: { id, organizationId },
    });

    if (!deposit) {
      throw new NotFoundException("Bank deposit not found");
    }

    await this.depositRepo.softDelete(id);

    this.logger.log(`Bank deposit ${id} soft deleted`);
  }
}
