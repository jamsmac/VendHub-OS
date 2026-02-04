/**
 * Contract Service
 * CRUD operations and lifecycle management for contractor contracts
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Contract, ContractStatus } from '../entities/contract.entity';
import { Contractor } from '../entities/contractor.entity';
import { CreateContractDto, UpdateContractDto } from '../dto/create-contract.dto';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    @InjectRepository(Contractor)
    private readonly contractorRepo: Repository<Contractor>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // CRUD
  // ============================================================================

  /**
   * Create a new contract
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateContractDto,
  ): Promise<Contract> {
    // Verify contractor belongs to organization
    const contractor = await this.contractorRepo.findOne({
      where: { id: dto.contractorId, organizationId },
    });

    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    // Check unique contract number within organization
    const existing = await this.contractRepo.findOne({
      where: { organizationId, contractNumber: dto.contractNumber },
    });

    if (existing) {
      throw new ConflictException(
        `Contract number "${dto.contractNumber}" already exists`,
      );
    }

    const contract = this.contractRepo.create({
      organizationId,
      contractorId: dto.contractorId,
      contractNumber: dto.contractNumber,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      status: ContractStatus.DRAFT,
      commissionType: dto.commissionType,
      commissionRate: dto.commissionRate,
      commissionFixedAmount: dto.commissionFixedAmount,
      commissionFixedPeriod: dto.commissionFixedPeriod,
      commissionTiers: dto.commissionTiers,
      commissionHybridFixed: dto.commissionHybridFixed,
      commissionHybridRate: dto.commissionHybridRate,
      currency: dto.currency || 'UZS',
      paymentTermDays: dto.paymentTermDays ?? 30,
      paymentType: dto.paymentType,
      minimumMonthlyRevenue: dto.minimumMonthlyRevenue,
      penaltyRate: dto.penaltyRate,
      specialConditions: dto.specialConditions,
      notes: dto.notes,
      contractFileId: dto.contractFileId,
      created_by_id: userId,
    });

    await this.contractRepo.save(contract);

    this.logger.log(
      `Contract ${contract.contractNumber} created for contractor ${contractor.companyName}`,
    );

    this.eventEmitter.emit('contract.created', {
      contractId: contract.id,
      contractorId: contractor.id,
      organizationId,
    });

    return contract;
  }

  /**
   * Get all contracts for organization with pagination and filters
   */
  async findAll(
    organizationId: string,
    params: {
      contractorId?: string;
      status?: ContractStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<{ items: Contract[]; total: number; page: number; limit: number; totalPages: number }> {
    const { contractorId, status, page = 1, limit = 20 } = params;

    const qb = this.contractRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.contractor', 'contractor')
      .where('c.organizationId = :organizationId', { organizationId });

    if (contractorId) {
      qb.andWhere('c.contractorId = :contractorId', { contractorId });
    }

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    const [items, total] = await qb
      .orderBy('c.created_at', 'DESC')
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

  /**
   * Get a single contract by ID with contractor relation
   */
  async findById(id: string, organizationId: string): Promise<Contract> {
    const contract = await this.contractRepo.findOne({
      where: { id, organizationId },
      relations: ['contractor'],
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  /**
   * Update a contract
   */
  async update(
    id: string,
    organizationId: string,
    dto: UpdateContractDto,
  ): Promise<Contract> {
    const contract = await this.findById(id, organizationId);

    if (contract.status === ContractStatus.TERMINATED) {
      throw new BadRequestException('Cannot update a terminated contract');
    }

    Object.assign(contract, {
      ...dto,
      endDate: dto.endDate ? new Date(dto.endDate) : contract.endDate,
    });

    await this.contractRepo.save(contract);

    this.logger.log(`Contract ${contract.contractNumber} updated`);

    return contract;
  }

  /**
   * Soft-delete a contract (only DRAFT contracts)
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const contract = await this.findById(id, organizationId);

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(
        'Only DRAFT contracts can be deleted. Use terminate for active contracts.',
      );
    }

    await this.contractRepo.softDelete(id);

    this.logger.log(`Contract ${contract.contractNumber} deleted (soft)`);

    this.eventEmitter.emit('contract.deleted', {
      contractId: contract.id,
      organizationId,
    });
  }

  // ============================================================================
  // LIFECYCLE TRANSITIONS
  // ============================================================================

  /**
   * Activate a DRAFT contract -> ACTIVE
   */
  async activate(id: string, organizationId: string): Promise<Contract> {
    const contract = await this.findById(id, organizationId);

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot activate contract in "${contract.status}" status. Only DRAFT contracts can be activated.`,
      );
    }

    contract.status = ContractStatus.ACTIVE;
    await this.contractRepo.save(contract);

    this.logger.log(`Contract ${contract.contractNumber} activated`);

    this.eventEmitter.emit('contract.activated', {
      contractId: contract.id,
      contractorId: contract.contractorId,
      organizationId,
    });

    return contract;
  }

  /**
   * Suspend an ACTIVE contract -> SUSPENDED
   */
  async suspend(id: string, organizationId: string): Promise<Contract> {
    const contract = await this.findById(id, organizationId);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot suspend contract in "${contract.status}" status. Only ACTIVE contracts can be suspended.`,
      );
    }

    contract.status = ContractStatus.SUSPENDED;
    await this.contractRepo.save(contract);

    this.logger.log(`Contract ${contract.contractNumber} suspended`);

    this.eventEmitter.emit('contract.suspended', {
      contractId: contract.id,
      contractorId: contract.contractorId,
      organizationId,
    });

    return contract;
  }

  /**
   * Terminate a contract (any non-terminated status) -> TERMINATED
   */
  async terminate(id: string, organizationId: string): Promise<Contract> {
    const contract = await this.findById(id, organizationId);

    if (contract.status === ContractStatus.TERMINATED) {
      throw new BadRequestException('Contract is already terminated');
    }

    contract.status = ContractStatus.TERMINATED;
    await this.contractRepo.save(contract);

    this.logger.log(`Contract ${contract.contractNumber} terminated`);

    this.eventEmitter.emit('contract.terminated', {
      contractId: contract.id,
      contractorId: contract.contractorId,
      organizationId,
    });

    return contract;
  }
}
