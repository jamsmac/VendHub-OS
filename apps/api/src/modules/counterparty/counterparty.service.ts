import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import {
  Counterparty,
  Contract,
  CommissionCalculation,
  CounterpartyType,
  ContractStatus,
  CommissionType,
} from "./entities/counterparty.entity";

export interface CreateCounterpartyDto {
  name: string;
  shortName?: string;
  type: CounterpartyType;
  inn: string;
  oked?: string;
  mfo?: string;
  bankAccount?: string;
  bankName?: string;
  legalAddress?: string;
  actualAddress?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isVatPayer?: boolean;
  vatRate?: number;
  paymentTermDays?: number;
  creditLimit?: number;
  notes?: string;
}

export interface UpdateCounterpartyDto {
  name?: string;
  shortName?: string;
  type?: CounterpartyType;
  inn?: string;
  oked?: string;
  mfo?: string;
  bankAccount?: string;
  bankName?: string;
  legalAddress?: string;
  actualAddress?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isVatPayer?: boolean;
  vatRate?: number;
  paymentTermDays?: number;
  creditLimit?: number;
  notes?: string;
  isActive?: boolean;
}

export interface CreateContractDto {
  contractNumber: string;
  startDate: Date;
  endDate?: Date;
  counterpartyId: string;
  commissionType: CommissionType;
  commissionRate?: number;
  commissionFixedAmount?: number;
  paymentTermDays?: number;
  notes?: string;
}

@Injectable()
export class CounterpartyService {
  private readonly logger = new Logger(CounterpartyService.name);

  constructor(
    @InjectRepository(Counterparty)
    private readonly counterpartyRepository: Repository<Counterparty>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(CommissionCalculation)
    private readonly commissionRepository: Repository<CommissionCalculation>,
  ) {}

  // =========================================================================
  // COUNTERPARTY OPERATIONS
  // =========================================================================

  async createCounterparty(
    organizationId: string,
    dto: CreateCounterpartyDto,
  ): Promise<Counterparty> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    // Check if INN already exists
    const existing = await this.counterpartyRepository.findOne({
      where: { inn: dto.inn, deletedAt: IsNull() },
    });

    if (existing) {
      throw new BadRequestException(
        `Counterparty with INN "${dto.inn}" already exists`,
      );
    }

    const counterparty = this.counterpartyRepository.create({
      organizationId,
      ...dto,
      isActive: true,
      isVatPayer: dto.isVatPayer ?? true,
      vatRate: dto.vatRate ?? 15.0,
    });

    return this.counterpartyRepository.save(counterparty);
  }

  async getCounterparty(
    organizationId: string,
    id: string,
  ): Promise<Counterparty> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const counterparty = await this.counterpartyRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
      relations: ["contracts"],
    });

    if (!counterparty) {
      throw new NotFoundException(`Counterparty with ID "${id}" not found`);
    }

    return counterparty;
  }

  async getCounterpartiesByType(
    organizationId: string,
    type: CounterpartyType,
  ): Promise<Counterparty[]> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    return this.counterpartyRepository.find({
      where: {
        organizationId,
        type,
        isActive: true,
        deletedAt: IsNull(),
      },
      order: { name: "ASC" },
    });
  }

  async updateCounterparty(
    organizationId: string,
    id: string,
    dto: UpdateCounterpartyDto,
  ): Promise<Counterparty> {
    const counterparty = await this.getCounterparty(organizationId, id);

    // If INN changes, check uniqueness
    if (dto.inn && dto.inn !== counterparty.inn) {
      const existing = await this.counterpartyRepository.findOne({
        where: { inn: dto.inn, deletedAt: IsNull() },
      });

      if (existing) {
        throw new BadRequestException(
          `Counterparty with INN "${dto.inn}" already exists`,
        );
      }
    }

    Object.assign(counterparty, dto);
    return this.counterpartyRepository.save(counterparty);
  }

  async deleteCounterparty(organizationId: string, id: string): Promise<void> {
    const counterparty = await this.getCounterparty(organizationId, id);

    // Check if counterparty has active contracts
    const activeContracts = await this.contractRepository.count({
      where: {
        counterpartyId: id,
        status: ContractStatus.ACTIVE,
        deletedAt: IsNull(),
      },
    });

    if (activeContracts > 0) {
      throw new BadRequestException(
        "Cannot delete counterparty with active contracts",
      );
    }

    await this.counterpartyRepository.softRemove(counterparty);
    this.logger.log(
      `Counterparty "${counterparty.name}" soft deleted (ID: ${id})`,
    );
  }

  // =========================================================================
  // CONTRACT OPERATIONS
  // =========================================================================

  async createContract(
    organizationId: string,
    dto: CreateContractDto,
  ): Promise<Contract> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    // Verify counterparty exists
    await this.getCounterparty(organizationId, dto.counterpartyId);

    // Check contract number uniqueness
    const existing = await this.contractRepository.findOne({
      where: { contractNumber: dto.contractNumber, deletedAt: IsNull() },
    });

    if (existing) {
      throw new BadRequestException(
        `Contract number "${dto.contractNumber}" already exists`,
      );
    }

    const contract = this.contractRepository.create({
      organizationId,
      ...dto,
      status: ContractStatus.DRAFT,
      paymentTermDays: dto.paymentTermDays ?? 30,
    });

    return this.contractRepository.save(contract);
  }

  async getContract(organizationId: string, id: string): Promise<Contract> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const contract = await this.contractRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
      relations: ["counterparty", "commissionCalculations"],
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID "${id}" not found`);
    }

    return contract;
  }

  async getCounterpartyContracts(
    organizationId: string,
    counterpartyId: string,
  ): Promise<Contract[]> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    // Verify counterparty exists
    await this.getCounterparty(organizationId, counterpartyId);

    return this.contractRepository.find({
      where: {
        organizationId,
        counterpartyId,
        deletedAt: IsNull(),
      },
      order: { startDate: "DESC" },
      relations: ["commissionCalculations"],
    });
  }

  async activateContract(
    organizationId: string,
    id: string,
  ): Promise<Contract> {
    const contract = await this.getContract(organizationId, id);

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot activate contract with status "${contract.status}"`,
      );
    }

    contract.status = ContractStatus.ACTIVE;
    return this.contractRepository.save(contract);
  }

  async terminateContract(
    organizationId: string,
    id: string,
  ): Promise<Contract> {
    const contract = await this.getContract(organizationId, id);

    contract.status = ContractStatus.TERMINATED;
    contract.endDate = new Date();
    return this.contractRepository.save(contract);
  }

  // =========================================================================
  // COMMISSION CALCULATIONS
  // =========================================================================

  async getCommissionCalculations(
    organizationId: string,
    contractId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<CommissionCalculation[]> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const query: Record<string, unknown> = {
      organizationId,
      contractId,
      deletedAt: IsNull(),
    };

    if (fromDate || toDate) {
      query.periodStart = {};
      if (fromDate) {
        query.periodStart[">="] = fromDate;
      }
      if (toDate) {
        query.periodEnd = { "<=": toDate };
      }
    }

    return this.commissionRepository.find({
      where: query,
      order: { periodStart: "DESC" },
    });
  }

  async calculateTotalCommission(
    organizationId: string,
    contractId: string,
  ): Promise<number> {
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const result = await this.commissionRepository
      .createQueryBuilder("cc")
      .select("SUM(cc.commissionAmount)", "total")
      .where("cc.organizationId = :organizationId", { organizationId })
      .andWhere("cc.contractId = :contractId", { contractId })
      .andWhere("cc.deletedAt IS NULL")
      .getRawOne();

    return result?.total ? parseFloat(result.total) : 0;
  }
}
