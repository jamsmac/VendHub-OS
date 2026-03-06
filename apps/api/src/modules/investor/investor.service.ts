import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InvestorProfile } from "./entities/investor-profile.entity";
import { DividendPayment } from "./entities/dividend-payment.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Transaction } from "../transactions/entities/transaction.entity";

export interface InvestorDashboard {
  profile: InvestorProfile;
  kpis: {
    totalRevenue: number;
    netProfit: number;
    totalMachines: number;
    avgTransactionsPerDay: number;
    avgCheck: number;
  };
  currentValue: number;
  totalReturn: number;
  roiPercent: number;
  totalDividends: number;
  dividends: DividendPayment[];
}

@Injectable()
export class InvestorService {
  private readonly logger = new Logger(InvestorService.name);

  constructor(
    @InjectRepository(InvestorProfile)
    private readonly profileRepo: Repository<InvestorProfile>,
    @InjectRepository(DividendPayment)
    private readonly dividendRepo: Repository<DividendPayment>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async findProfile(
    organizationId: string,
    userId: string,
  ): Promise<InvestorProfile | null> {
    return this.profileRepo.findOne({
      where: { organizationId, userId },
    });
  }

  async findAllProfiles(organizationId: string): Promise<InvestorProfile[]> {
    return this.profileRepo.find({
      where: { organizationId },
      order: { sharePercent: "DESC" },
    });
  }

  async createProfile(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      sharePercent: number;
      totalInvested: number;
      paybackMonths?: number;
      notes?: string;
    },
  ): Promise<InvestorProfile> {
    const profile = this.profileRepo.create({
      organizationId,
      userId,
      name: data.name,
      sharePercent: data.sharePercent,
      totalInvested: data.totalInvested,
      paybackMonths: data.paybackMonths ?? null,
      notes: data.notes ?? null,
      createdById: userId,
    });
    return this.profileRepo.save(profile);
  }

  async updateProfile(
    id: string,
    organizationId: string,
    data: Partial<{
      name: string;
      sharePercent: number;
      totalInvested: number;
      paybackMonths: number | null;
      status: string;
      notes: string | null;
    }>,
  ): Promise<InvestorProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id, organizationId },
    });
    if (!profile) throw new NotFoundException("Investor profile not found");
    Object.assign(profile, data);
    return this.profileRepo.save(profile);
  }

  async getDashboard(
    organizationId: string,
    userId: string,
  ): Promise<InvestorDashboard> {
    const profile = await this.profileRepo.findOne({
      where: { organizationId, userId },
    });
    if (!profile) throw new NotFoundException("Investor profile not found");

    // Aggregate KPIs from existing data
    const [totalMachines, revenueResult, dividends] = await Promise.all([
      this.machineRepo.count({ where: { organizationId } }),
      this.transactionRepo
        .createQueryBuilder("t")
        .select("COALESCE(SUM(t.amount), 0)", "total")
        .where("t.organizationId = :organizationId", { organizationId })
        .getRawOne(),
      this.dividendRepo.find({
        where: { investorProfileId: profile.id },
        order: { paymentDate: "DESC" },
      }),
    ]);

    const totalRevenue = Number(revenueResult?.total ?? 0);
    const netProfit = Math.round(totalRevenue * 0.63); // approximate margin
    const totalDividends = dividends.reduce(
      (sum, d) => sum + Number(d.amount),
      0,
    );
    const totalInvested = Number(profile.totalInvested);
    const sharePercent = Number(profile.sharePercent);
    const currentValue = Math.round(
      (totalRevenue * sharePercent) / 100 + totalInvested,
    );
    const totalReturn = currentValue - totalInvested + totalDividends;
    const roiPercent =
      totalInvested > 0 ? +((totalReturn / totalInvested) * 100).toFixed(1) : 0;

    return {
      profile,
      kpis: {
        totalRevenue,
        netProfit,
        totalMachines,
        avgTransactionsPerDay: 0,
        avgCheck: 0,
      },
      currentValue,
      totalReturn,
      roiPercent,
      totalDividends,
      dividends,
    };
  }

  // Dividends
  async createDividend(
    organizationId: string,
    userId: string,
    data: {
      investorProfileId: string;
      period: string;
      paymentDate: string;
      amount: number;
      notes?: string;
    },
  ): Promise<DividendPayment> {
    const dividend = this.dividendRepo.create({
      organizationId,
      investorProfileId: data.investorProfileId,
      period: data.period,
      paymentDate: new Date(data.paymentDate),
      amount: data.amount,
      notes: data.notes ?? null,
      createdById: userId,
    });
    return this.dividendRepo.save(dividend);
  }

  async findDividends(investorProfileId: string): Promise<DividendPayment[]> {
    return this.dividendRepo.find({
      where: { investorProfileId },
      order: { paymentDate: "DESC" },
    });
  }
}
