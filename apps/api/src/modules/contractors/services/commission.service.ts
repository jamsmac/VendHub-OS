/**
 * Commission Service
 * Commission calculation, queries, and overdue detection for contractor contracts
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import {
  Contract,
  ContractStatus,
  CommissionType,
  CommissionCalculation,
  PaymentStatus,
  CommissionTier,
} from '../entities/contract.entity';
import { Transaction } from '../../transactions/entities/transaction.entity';
import { QueryCommissionsDto } from '../dto/commission.dto';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    @InjectRepository(CommissionCalculation)
    private readonly commissionRepo: Repository<CommissionCalculation>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // CALCULATE
  // ============================================================================

  /**
   * Calculate commission for a contract and period.
   * Fetches revenue from transactions and applies the contract's commission model.
   */
  async calculate(
    organizationId: string,
    contractId: string,
    periodStart: string,
    periodEnd: string,
    userId: string,
  ): Promise<CommissionCalculation> {
    // Validate contract
    const contract = await this.contractRepo.findOne({
      where: { id: contractId, organizationId },
      relations: ['contractor'],
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot calculate commission for contract in "${contract.status}" status. Contract must be ACTIVE.`,
      );
    }

    // Fetch total revenue from transactions for this contract and period
    const { totalRevenue, transactionCount } = await this.getRevenueForPeriod(
      organizationId,
      contractId,
      periodStart,
      periodEnd,
    );

    // Calculate commission based on type
    const { commissionAmount, calculationDetails } = this.computeCommission(
      contract,
      totalRevenue,
    );

    // Calculate payment due date
    const paymentDueDate = new Date(periodEnd);
    paymentDueDate.setDate(paymentDueDate.getDate() + contract.paymentTermDays);

    // Create commission calculation record
    const commission = this.commissionRepo.create({
      organizationId,
      contractId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      totalRevenue,
      transactionCount,
      commissionAmount,
      commissionType: contract.commissionType,
      calculationDetails,
      paymentStatus: PaymentStatus.PENDING,
      paymentDueDate,
      calculatedByUserId: userId,
      created_by_id: userId,
    });

    await this.commissionRepo.save(commission);

    this.logger.log(
      `Commission calculated for contract ${contract.contractNumber}: ` +
      `${commissionAmount} ${contract.currency} (revenue: ${totalRevenue}, txns: ${transactionCount})`,
    );

    this.eventEmitter.emit('commission.calculated', {
      commissionId: commission.id,
      contractId,
      organizationId,
      amount: commissionAmount,
    });

    return commission;
  }

  // ============================================================================
  // QUERY
  // ============================================================================

  /**
   * Get paginated list of commission calculations with filters
   */
  async findAll(
    organizationId: string,
    params: QueryCommissionsDto,
  ): Promise<{
    items: CommissionCalculation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { contractId, paymentStatus, dateFrom, dateTo, page = 1, limit = 20 } = params;

    const qb = this.commissionRepo
      .createQueryBuilder('cc')
      .leftJoinAndSelect('cc.contract', 'contract')
      .leftJoinAndSelect('contract.contractor', 'contractor')
      .where('cc.organizationId = :organizationId', { organizationId });

    if (contractId) {
      qb.andWhere('cc.contractId = :contractId', { contractId });
    }

    if (paymentStatus) {
      qb.andWhere('cc.paymentStatus = :paymentStatus', { paymentStatus });
    }

    if (dateFrom) {
      qb.andWhere('cc.periodStart >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('cc.periodEnd <= :dateTo', { dateTo });
    }

    const [items, total] = await qb
      .orderBy('cc.periodEnd', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // PAYMENT
  // ============================================================================

  /**
   * Mark a commission calculation as paid
   */
  async markAsPaid(
    id: string,
    organizationId: string,
    paymentTransactionId: string,
    notes?: string,
  ): Promise<CommissionCalculation> {
    const commission = await this.commissionRepo.findOne({
      where: { id, organizationId },
      relations: ['contract'],
    });

    if (!commission) {
      throw new NotFoundException('Commission calculation not found');
    }

    if (commission.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Commission is already marked as paid');
    }

    if (commission.paymentStatus === PaymentStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay a cancelled commission');
    }

    commission.paymentStatus = PaymentStatus.PAID;
    commission.paymentDate = new Date();
    commission.paymentTransactionId = paymentTransactionId;
    if (notes) {
      commission.notes = notes;
    }

    await this.commissionRepo.save(commission);

    this.logger.log(`Commission ${id} marked as paid (transaction: ${paymentTransactionId})`);

    this.eventEmitter.emit('commission.paid', {
      commissionId: commission.id,
      contractId: commission.contractId,
      organizationId,
      amount: commission.commissionAmount,
      paymentTransactionId,
    });

    return commission;
  }

  // ============================================================================
  // CRON: OVERDUE DETECTION
  // ============================================================================

  /**
   * Daily check for overdue commission payments (runs at 02:00 Asia/Tashkent)
   */
  @Cron('0 2 * * *', { timeZone: 'Asia/Tashkent' })
  async markAsOverdue(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueCommissions = await this.commissionRepo.find({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        paymentDueDate: LessThan(today),
      },
      relations: ['contract'],
    });

    for (const commission of overdueCommissions) {
      commission.paymentStatus = PaymentStatus.OVERDUE;
      await this.commissionRepo.save(commission);

      this.eventEmitter.emit('commission.overdue', {
        commissionId: commission.id,
        contractId: commission.contractId,
        organizationId: commission.organizationId,
        amount: commission.commissionAmount,
        dueDate: commission.paymentDueDate,
      });
    }

    if (overdueCommissions.length > 0) {
      this.logger.log(`Marked ${overdueCommissions.length} commission(s) as overdue`);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Get total revenue and transaction count for a contract within a period.
   * Queries the transactions table filtered by contractId and date range.
   */
  private async getRevenueForPeriod(
    organizationId: string,
    contractId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<{ totalRevenue: number; transactionCount: number }> {
    const result = await this.transactionRepo
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.totalAmount), 0)', 'totalRevenue')
      .addSelect('COUNT(t.id)', 'transactionCount')
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('t.contractId = :contractId', { contractId })
      .andWhere('t.transactionDate >= :periodStart', { periodStart })
      .andWhere('t.transactionDate <= :periodEnd', { periodEnd })
      .andWhere("t.status = 'completed'")
      .getRawOne();

    return {
      totalRevenue: Number(result?.totalRevenue) || 0,
      transactionCount: Number(result?.transactionCount) || 0,
    };
  }

  /**
   * Compute commission amount based on the contract's commission type
   */
  private computeCommission(
    contract: Contract,
    totalRevenue: number,
  ): {
    commissionAmount: number;
    calculationDetails: CommissionCalculation['calculationDetails'];
  } {
    switch (contract.commissionType) {
      case CommissionType.PERCENTAGE:
        return this.calculatePercentage(contract, totalRevenue);

      case CommissionType.FIXED:
        return this.calculateFixed(contract);

      case CommissionType.TIERED:
        return this.calculateTiered(contract, totalRevenue);

      case CommissionType.HYBRID:
        return this.calculateHybrid(contract, totalRevenue);

      default:
        throw new BadRequestException(
          `Unknown commission type: ${contract.commissionType}`,
        );
    }
  }

  /**
   * PERCENTAGE: totalRevenue * rate / 100
   */
  private calculatePercentage(
    contract: Contract,
    totalRevenue: number,
  ): {
    commissionAmount: number;
    calculationDetails: CommissionCalculation['calculationDetails'];
  } {
    const rate = Number(contract.commissionRate) || 0;
    const commissionAmount = Math.round((totalRevenue * rate) / 100 * 100) / 100;

    return {
      commissionAmount,
      calculationDetails: {
        baseRate: rate,
      },
    };
  }

  /**
   * FIXED: fixedAmount
   */
  private calculateFixed(
    contract: Contract,
  ): {
    commissionAmount: number;
    calculationDetails: CommissionCalculation['calculationDetails'];
  } {
    const fixedAmount = Number(contract.commissionFixedAmount) || 0;

    return {
      commissionAmount: fixedAmount,
      calculationDetails: {
        fixedAmount,
      },
    };
  }

  /**
   * TIERED: iterate tiers, apply matching rate for each revenue band
   */
  private calculateTiered(
    contract: Contract,
    totalRevenue: number,
  ): {
    commissionAmount: number;
    calculationDetails: CommissionCalculation['calculationDetails'];
  } {
    const tiers: CommissionTier[] = contract.commissionTiers || [];
    if (tiers.length === 0) {
      return {
        commissionAmount: 0,
        calculationDetails: { tierBreakdown: [] },
      };
    }

    // Sort tiers by minRevenue ascending
    const sortedTiers = [...tiers].sort((a, b) => a.minRevenue - b.minRevenue);

    let remainingRevenue = totalRevenue;
    let commissionAmount = 0;
    const tierBreakdown: { tier: number; amount: number; rate: number; commission: number }[] = [];

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const tierMax = tier.maxRevenue !== null ? tier.maxRevenue : Infinity;
      const tierRange = tierMax - tier.minRevenue;

      if (remainingRevenue <= 0) break;

      // Amount within this tier
      const amountInTier = Math.min(remainingRevenue, tierRange);
      const tierCommission = Math.round((amountInTier * tier.rate) / 100 * 100) / 100;

      commissionAmount += tierCommission;
      tierBreakdown.push({
        tier: i + 1,
        amount: amountInTier,
        rate: tier.rate,
        commission: tierCommission,
      });

      remainingRevenue -= amountInTier;
    }

    return {
      commissionAmount: Math.round(commissionAmount * 100) / 100,
      calculationDetails: { tierBreakdown },
    };
  }

  /**
   * HYBRID: fixed + (revenue * rate / 100)
   */
  private calculateHybrid(
    contract: Contract,
    totalRevenue: number,
  ): {
    commissionAmount: number;
    calculationDetails: CommissionCalculation['calculationDetails'];
  } {
    const hybridFixed = Number(contract.commissionHybridFixed) || 0;
    const hybridRate = Number(contract.commissionHybridRate) || 0;
    const percentagePart = Math.round((totalRevenue * hybridRate) / 100 * 100) / 100;
    const commissionAmount = Math.round((hybridFixed + percentagePart) * 100) / 100;

    return {
      commissionAmount,
      calculationDetails: {
        hybridFixed,
        hybridRate,
      },
    };
  }
}
