/**
 * Contractors Service
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import {
  Contractor,
  ContractorInvoice,
  ServiceType,
  InvoiceStatus,
} from './entities/contractor.entity';
import {
  CreateContractorDto,
  UpdateContractorDto,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordInvoicePaymentDto,
  ContractorFilterDto,
  InvoiceFilterDto,
  ContractorDto,
  ContractorListDto,
  InvoiceDto,
  InvoiceListDto,
  ContractorStatsDto,
} from './dto/contractor.dto';

@Injectable()
export class ContractorsService {
  private readonly logger = new Logger(ContractorsService.name);

  constructor(
    @InjectRepository(Contractor)
    private readonly contractorRepo: Repository<Contractor>,
    @InjectRepository(ContractorInvoice)
    private readonly invoiceRepo: Repository<ContractorInvoice>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // CONTRACTORS CRUD
  // ============================================================================

  /**
   * Создать подрядчика
   */
  async createContractor(
    organizationId: string,
    dto: CreateContractorDto,
  ): Promise<ContractorDto> {
    const contractor = this.contractorRepo.create({
      organizationId,
      ...dto,
      contractStart: dto.contractStart ? new Date(dto.contractStart) : undefined,
      contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : undefined,
    });

    await this.contractorRepo.save(contractor);

    this.logger.log(`Contractor ${contractor.companyName} created`);

    this.eventEmitter.emit('contractor.created', {
      contractorId: contractor.id,
      organizationId,
    });

    return this.mapContractorToDto(contractor);
  }

  /**
   * Обновить подрядчика
   */
  async updateContractor(
    contractorId: string,
    organizationId: string,
    dto: UpdateContractorDto,
  ): Promise<ContractorDto> {
    const contractor = await this.findContractor(contractorId, organizationId);

    Object.assign(contractor, {
      ...dto,
      contractStart: dto.contractStart ? new Date(dto.contractStart) : contractor.contractStart,
      contractEnd: dto.contractEnd ? new Date(dto.contractEnd) : contractor.contractEnd,
    });

    await this.contractorRepo.save(contractor);

    return this.mapContractorToDto(contractor);
  }

  /**
   * Удалить подрядчика (деактивировать)
   */
  async deleteContractor(
    contractorId: string,
    organizationId: string,
  ): Promise<void> {
    const contractor = await this.findContractor(contractorId, organizationId);

    // Check for pending invoices
    const pendingInvoices = await this.invoiceRepo.count({
      where: {
        contractorId,
        status: InvoiceStatus.PENDING,
      },
    });

    if (pendingInvoices > 0) {
      throw new BadRequestException('Cannot delete contractor with pending invoices');
    }

    contractor.isActive = false;
    await this.contractorRepo.save(contractor);

    this.eventEmitter.emit('contractor.deleted', {
      contractorId: contractor.id,
      organizationId,
    });
  }

  /**
   * Получить подрядчика
   */
  async getContractor(
    contractorId: string,
    organizationId: string,
  ): Promise<ContractorDto> {
    const contractor = await this.findContractor(contractorId, organizationId);
    return this.mapContractorToDto(contractor);
  }

  /**
   * Получить список подрядчиков
   */
  async getContractors(
    organizationId: string,
    filter: ContractorFilterDto,
  ): Promise<ContractorListDto> {
    const { serviceType, isActive, search, page = 1, limit = 20 } = filter;

    const qb = this.contractorRepo
      .createQueryBuilder('c')
      .where('c.organizationId = :organizationId', { organizationId });

    if (serviceType) {
      qb.andWhere('c.serviceType = :serviceType', { serviceType });
    }

    if (isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive });
    }

    if (search) {
      qb.andWhere(
        '(c.companyName ILIKE :search OR c.contactPerson ILIKE :search OR c.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await qb
      .orderBy('c.companyName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(c => this.mapContractorToDto(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить подрядчиков по типу услуг
   */
  async getContractorsByServiceType(
    organizationId: string,
    serviceType: ServiceType,
  ): Promise<ContractorDto[]> {
    const contractors = await this.contractorRepo.find({
      where: { organizationId, serviceType, isActive: true },
      order: { companyName: 'ASC' },
    });

    return contractors.map(c => this.mapContractorToDto(c));
  }

  // ============================================================================
  // INVOICES CRUD
  // ============================================================================

  /**
   * Создать счет
   */
  async createInvoice(
    contractorId: string,
    organizationId: string,
    dto: CreateInvoiceDto,
  ): Promise<InvoiceDto> {
    const contractor = await this.findContractor(contractorId, organizationId);

    // Check for duplicate invoice number
    const existing = await this.invoiceRepo.findOne({
      where: { organizationId, invoiceNumber: dto.invoiceNumber },
    });

    if (existing) {
      throw new ConflictException('Invoice number already exists');
    }

    const invoice = this.invoiceRepo.create({
      organizationId,
      contractorId,
      ...dto,
      issueDate: new Date(dto.issueDate),
      dueDate: new Date(dto.dueDate),
      status: InvoiceStatus.PENDING,
    });

    await this.invoiceRepo.save(invoice);

    this.logger.log(`Invoice ${invoice.invoiceNumber} created for contractor ${contractor.companyName}`);

    return this.mapInvoiceToDto(invoice, contractor);
  }

  /**
   * Обновить счет
   */
  async updateInvoice(
    invoiceId: string,
    organizationId: string,
    dto: UpdateInvoiceDto,
  ): Promise<InvoiceDto> {
    const invoice = await this.findInvoice(invoiceId, organizationId);

    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException('Can only update pending invoices');
    }

    Object.assign(invoice, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : invoice.dueDate,
    });

    await this.invoiceRepo.save(invoice);

    const contractor = await this.findContractor(invoice.contractorId, organizationId);
    return this.mapInvoiceToDto(invoice, contractor);
  }

  /**
   * Утвердить счет
   */
  async approveInvoice(
    invoiceId: string,
    organizationId: string,
    userId: string,
  ): Promise<InvoiceDto> {
    const invoice = await this.findInvoice(invoiceId, organizationId);

    if (invoice.status !== InvoiceStatus.PENDING) {
      throw new BadRequestException('Can only approve pending invoices');
    }

    invoice.status = InvoiceStatus.APPROVED;
    invoice.approvedBy = userId;
    invoice.approvedAt = new Date();

    await this.invoiceRepo.save(invoice);

    this.eventEmitter.emit('contractor-invoice.approved', {
      invoiceId: invoice.id,
      organizationId,
    });

    const contractor = await this.findContractor(invoice.contractorId, organizationId);
    return this.mapInvoiceToDto(invoice, contractor);
  }

  /**
   * Записать оплату счета
   */
  async recordInvoicePayment(
    invoiceId: string,
    organizationId: string,
    dto: RecordInvoicePaymentDto,
  ): Promise<InvoiceDto> {
    const invoice = await this.findInvoice(invoiceId, organizationId);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay cancelled invoice');
    }

    invoice.paidAmount = Number(invoice.paidAmount) + dto.amount;

    if (invoice.paidAmount >= invoice.amount) {
      invoice.status = InvoiceStatus.PAID;
      invoice.paidDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
    }

    await this.invoiceRepo.save(invoice);

    this.eventEmitter.emit('contractor-invoice.paid', {
      invoiceId: invoice.id,
      amount: dto.amount,
      organizationId,
    });

    const contractor = await this.findContractor(invoice.contractorId, organizationId);
    return this.mapInvoiceToDto(invoice, contractor);
  }

  /**
   * Отменить счет
   */
  async cancelInvoice(
    invoiceId: string,
    organizationId: string,
  ): Promise<InvoiceDto> {
    const invoice = await this.findInvoice(invoiceId, organizationId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel paid invoice');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    await this.invoiceRepo.save(invoice);

    const contractor = await this.findContractor(invoice.contractorId, organizationId);
    return this.mapInvoiceToDto(invoice, contractor);
  }

  /**
   * Получить счета подрядчика
   */
  async getContractorInvoices(
    contractorId: string,
    organizationId: string,
    filter: InvoiceFilterDto,
  ): Promise<InvoiceListDto> {
    await this.findContractor(contractorId, organizationId);

    return this.getInvoices(organizationId, { ...filter, contractorId });
  }

  /**
   * Получить все счета
   */
  async getInvoices(
    organizationId: string,
    filter: InvoiceFilterDto,
  ): Promise<InvoiceListDto> {
    const { status, contractorId, fromDate, toDate, page = 1, limit = 20 } = filter;

    const qb = this.invoiceRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.contractor', 'contractor')
      .where('i.organizationId = :organizationId', { organizationId });

    if (status) {
      qb.andWhere('i.status = :status', { status });
    }

    if (contractorId) {
      qb.andWhere('i.contractorId = :contractorId', { contractorId });
    }

    if (fromDate) {
      qb.andWhere('i.issueDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      qb.andWhere('i.issueDate <= :toDate', { toDate });
    }

    const [items, total] = await qb
      .orderBy('i.dueDate', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(i => this.mapInvoiceToDto(i, i.contractor)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Получить статистику
   */
  async getStats(organizationId: string): Promise<ContractorStatsDto> {
    const contractors = await this.contractorRepo.find({ where: { organizationId } });
    const invoices = await this.invoiceRepo.find({ where: { organizationId } });

    const stats: ContractorStatsDto = {
      totalContractors: contractors.length,
      activeContractors: contractors.filter(c => c.isActive).length,
      byServiceType: {} as Record<string, number>,
      totalInvoices: invoices.length,
      pendingInvoices: 0,
      overdueInvoices: 0,
      totalInvoiceAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
    };

    // Initialize service type counts
    for (const type of Object.values(ServiceType)) {
      stats.byServiceType[type] = 0;
    }

    // Count by service type
    for (const contractor of contractors) {
      if (contractor.isActive) {
        stats.byServiceType[contractor.serviceType]++;
      }
    }

    // Invoice stats
    const now = new Date();
    for (const invoice of invoices) {
      stats.totalInvoiceAmount += Number(invoice.amount);
      stats.paidAmount += Number(invoice.paidAmount);

      if (invoice.status === InvoiceStatus.PENDING || invoice.status === InvoiceStatus.APPROVED) {
        stats.pendingInvoices++;
        if (new Date(invoice.dueDate) < now) {
          stats.overdueInvoices++;
        }
      }
    }

    stats.unpaidAmount = stats.totalInvoiceAmount - stats.paidAmount;

    return stats;
  }

  // ============================================================================
  // CRON JOBS
  // ============================================================================

  /**
   * Отметить просроченные счета (ежедневно в 01:00)
   */
  @Cron('0 1 * * *', { timeZone: 'Asia/Tashkent' })
  async markOverdueInvoices(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await this.invoiceRepo.find({
      where: {
        status: InvoiceStatus.APPROVED,
        dueDate: LessThan(today),
      },
    });

    for (const invoice of overdueInvoices) {
      invoice.status = InvoiceStatus.OVERDUE;
      await this.invoiceRepo.save(invoice);

      this.eventEmitter.emit('contractor-invoice.overdue', {
        invoiceId: invoice.id,
        contractorId: invoice.contractorId,
        organizationId: invoice.organizationId,
      });
    }

    if (overdueInvoices.length > 0) {
      this.logger.log(`Marked ${overdueInvoices.length} invoices as overdue`);
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async findContractor(
    contractorId: string,
    organizationId: string,
  ): Promise<Contractor> {
    const contractor = await this.contractorRepo.findOne({
      where: { id: contractorId, organizationId },
    });

    if (!contractor) {
      throw new NotFoundException('Contractor not found');
    }

    return contractor;
  }

  private async findInvoice(
    invoiceId: string,
    organizationId: string,
  ): Promise<ContractorInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, organizationId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  private mapContractorToDto(contractor: Contractor): ContractorDto {
    return {
      id: contractor.id,
      organizationId: contractor.organizationId,
      companyName: contractor.companyName,
      contactPerson: contractor.contactPerson,
      phone: contractor.phone,
      email: contractor.email,
      address: contractor.address,
      serviceType: contractor.serviceType,
      contractStart: contractor.contractStart,
      contractEnd: contractor.contractEnd,
      contractNumber: contractor.contractNumber,
      paymentTerms: contractor.paymentTerms,
      rating: contractor.rating ? Number(contractor.rating) : undefined,
      isActive: contractor.isActive,
      bankDetails: contractor.bankDetails,
      notes: contractor.notes,
      createdAt: contractor.created_at,
      updatedAt: contractor.updated_at,
    };
  }

  private mapInvoiceToDto(invoice: ContractorInvoice, contractor?: Contractor): InvoiceDto {
    return {
      id: invoice.id,
      organizationId: invoice.organizationId,
      contractorId: invoice.contractorId,
      contractorName: contractor?.companyName,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      paidAmount: Number(invoice.paidAmount),
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidDate,
      description: invoice.description,
      approvedBy: invoice.approvedBy,
      approvedAt: invoice.approvedAt,
      attachmentUrls: invoice.attachmentUrls,
      createdAt: invoice.created_at,
    };
  }
}
