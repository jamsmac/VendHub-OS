/**
 * Billing Service
 * Логика управления счетами и платежами
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  Invoice,
  BillingPayment,
  InvoiceStatus,
  BillingPaymentStatus,
} from "./entities/billing.entity";
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  QueryInvoicesDto,
} from "./dto/create-invoice.dto";
import {
  BillingCreatePaymentDto,
  QueryPaymentsDto,
} from "./dto/create-payment.dto";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(BillingPayment)
    private readonly paymentRepo: Repository<BillingPayment>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================================
  // CREATE INVOICE
  // ============================================================================

  /**
   * Создать инвойс с автогенерацией номера и расчётом итогов
   */
  async createInvoice(
    organizationId: string,
    userId: string,
    dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    return this.dataSource.transaction(async (manager) => {
      const txInvoiceRepo = manager.getRepository(Invoice);

      // Auto-generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(
        organizationId,
        txInvoiceRepo,
      );

      // Calculate totals from line items
      let subtotal = 0;
      let taxAmount = 0;

      for (const item of dto.lineItems) {
        subtotal += item.amount;
        if (item.taxRate) {
          taxAmount += item.amount * (item.taxRate / 100);
        }
      }

      const totalAmount = subtotal + taxAmount;

      const invoice = txInvoiceRepo.create({
        organizationId,
        invoiceNumber,
        customerId: dto.customerId || null,
        customerName: dto.customerName || null,
        issueDate: new Date(dto.issueDate),
        dueDate: new Date(dto.dueDate),
        status: InvoiceStatus.DRAFT,
        subtotal,
        taxAmount,
        discountAmount: 0,
        totalAmount,
        paidAmount: 0,
        currency: dto.currency || "UZS",
        lineItems: dto.lineItems,
        notes: dto.notes || null,
        createdById: userId,
      });

      const saved = await txInvoiceRepo.save(invoice);

      this.logger.log(
        `Invoice ${invoiceNumber} created for org ${organizationId} (total: ${totalAmount} ${invoice.currency})`,
      );

      return saved;
    });
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Получить список инвойсов
   */
  async findAllInvoices(
    organizationId: string,
    params: QueryInvoicesDto,
  ): Promise<{
    items: Invoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      customerId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = params;

    const qb = this.invoiceRepo
      .createQueryBuilder("i")
      .leftJoinAndSelect("i.payments", "payments")
      .where("i.organizationId = :organizationId", { organizationId });

    if (customerId) {
      qb.andWhere("i.customerId = :customerId", { customerId });
    }

    if (status) {
      qb.andWhere("i.status = :status", { status });
    }

    if (dateFrom) {
      qb.andWhere("i.issueDate >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("i.issueDate <= :dateTo", { dateTo });
    }

    const [items, total] = await qb
      .orderBy("i.createdAt", "DESC")
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
   * Получить инвойс по ID с платежами
   */
  async findInvoiceById(id: string, organizationId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, organizationId },
      relations: ["payments"],
    });

    if (!invoice) {
      throw new NotFoundException("Invoice not found");
    }

    return invoice;
  }

  // ============================================================================
  // UPDATE INVOICE
  // ============================================================================

  /**
   * Обновить инвойс (только DRAFT)
   */
  async updateInvoice(
    id: string,
    organizationId: string,
    userId: string,
    dto: UpdateInvoiceDto,
  ): Promise<Invoice> {
    const invoice = await this.findInvoiceById(id, organizationId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT invoices can be updated");
    }

    // Update fields
    if (dto.customerId !== undefined)
      invoice.customerId = dto.customerId || null;
    if (dto.customerName !== undefined)
      invoice.customerName = dto.customerName || null;
    if (dto.issueDate) invoice.issueDate = new Date(dto.issueDate);
    if (dto.dueDate) invoice.dueDate = new Date(dto.dueDate);
    if (dto.currency) invoice.currency = dto.currency;
    if (dto.notes !== undefined) invoice.notes = dto.notes || null;

    // Recalculate totals if line items changed
    if (dto.lineItems) {
      invoice.lineItems = dto.lineItems;

      let subtotal = 0;
      let taxAmount = 0;

      for (const item of dto.lineItems) {
        subtotal += item.amount;
        if (item.taxRate) {
          taxAmount += item.amount * (item.taxRate / 100);
        }
      }

      invoice.subtotal = subtotal;
      invoice.taxAmount = taxAmount;
      invoice.totalAmount = subtotal + taxAmount - invoice.discountAmount;
    }

    invoice.updatedById = userId;

    await this.invoiceRepo.save(invoice);

    this.logger.log(`Invoice ${invoice.invoiceNumber} updated`);

    return invoice;
  }

  // ============================================================================
  // STATUS TRANSITIONS
  // ============================================================================

  /**
   * Отправить инвойс (DRAFT -> SENT)
   */
  async sendInvoice(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<Invoice> {
    const invoice = await this.findInvoiceById(id, organizationId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT invoices can be sent");
    }

    invoice.status = InvoiceStatus.SENT;
    invoice.updatedById = userId;

    await this.invoiceRepo.save(invoice);

    this.logger.log(`Invoice ${invoice.invoiceNumber} sent`);

    return invoice;
  }

  /**
   * Отменить инвойс (любой кроме PAID -> CANCELLED)
   */
  async cancelInvoice(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<Invoice> {
    const invoice = await this.findInvoiceById(id, organizationId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException("Paid invoices cannot be cancelled");
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException("Invoice is already cancelled");
    }

    invoice.status = InvoiceStatus.CANCELLED;
    invoice.updatedById = userId;

    await this.invoiceRepo.save(invoice);

    this.logger.log(`Invoice ${invoice.invoiceNumber} cancelled`);

    return invoice;
  }

  // ============================================================================
  // PAYMENTS
  // ============================================================================

  /**
   * Записать платёж по инвойсу
   */
  async recordPayment(
    invoiceId: string,
    organizationId: string,
    userId: string,
    dto: BillingCreatePaymentDto,
  ): Promise<BillingPayment> {
    const invoice = await this.findInvoiceById(invoiceId, organizationId);

    if (
      invoice.status === InvoiceStatus.CANCELLED ||
      invoice.status === InvoiceStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Cannot record payment for ${invoice.status} invoice`,
      );
    }

    const remainingAmount =
      Number(invoice.totalAmount) - Number(invoice.paidAmount);

    if (dto.amount > remainingAmount) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds remaining balance (${remainingAmount})`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const txPaymentRepo = manager.getRepository(BillingPayment);
      const txInvoiceRepo = manager.getRepository(Invoice);

      // Generate payment number
      const paymentCount = await txPaymentRepo.count({
        where: { invoiceId },
      });
      const paymentNumber = `${invoice.invoiceNumber}-P${String(paymentCount + 1).padStart(2, "0")}`;

      const payment = txPaymentRepo.create({
        organizationId,
        invoiceId,
        paymentNumber,
        amount: dto.amount,
        currency: invoice.currency,
        paymentMethod: dto.paymentMethod,
        status: BillingPaymentStatus.COMPLETED,
        paymentDate: new Date(dto.paymentDate),
        referenceNumber: dto.referenceNumber || null,
        notes: dto.notes || null,
        createdById: userId,
      });

      await txPaymentRepo.save(payment);

      // Update invoice paid amount and status
      invoice.paidAmount = Number(invoice.paidAmount) + dto.amount;
      invoice.updatedById = userId;

      if (invoice.paidAmount >= Number(invoice.totalAmount)) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidAt = new Date();
      } else if (invoice.paidAmount > 0) {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      }

      await txInvoiceRepo.save(invoice);

      this.logger.log(
        `Payment ${paymentNumber} recorded for invoice ${invoice.invoiceNumber} ` +
          `(${dto.amount} ${invoice.currency})`,
      );

      return payment;
    });
  }

  /**
   * Получить все платежи
   */
  async findAllPayments(
    organizationId: string,
    params: QueryPaymentsDto,
  ): Promise<{
    items: BillingPayment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      invoiceId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = params;

    const qb = this.paymentRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.invoice", "invoice")
      .where("p.organizationId = :organizationId", { organizationId });

    if (invoiceId) {
      qb.andWhere("p.invoiceId = :invoiceId", { invoiceId });
    }

    if (status) {
      qb.andWhere("p.status = :status", { status });
    }

    if (dateFrom) {
      qb.andWhere("p.paymentDate >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("p.paymentDate <= :dateTo", { dateTo });
    }

    const [items, total] = await qb
      .orderBy("p.paymentDate", "DESC")
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
  // CRON: MARK OVERDUE INVOICES
  // ============================================================================

  /**
   * Ежедневная проверка и пометка просроченных инвойсов
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async markOverdueInvoices(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.invoiceRepo
      .createQueryBuilder()
      .update(Invoice)
      .set({ status: InvoiceStatus.OVERDUE })
      .where("status = :status", { status: InvoiceStatus.SENT })
      .andWhere("dueDate < :today", { today })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Marked ${result.affected} invoices as OVERDUE`);
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Получить статистику по инвойсам
   */
  async getInvoiceStats(organizationId: string): Promise<{
    totalAmount: number;
    paidAmount: number;
    overdueAmount: number;
    pendingAmount: number;
    totalInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
    pendingInvoices: number;
  }> {
    const invoices = await this.invoiceRepo.find({
      where: { organizationId },
    });

    let totalAmount = 0;
    let paidAmount = 0;
    let overdueAmount = 0;
    let pendingAmount = 0;
    let paidInvoices = 0;
    let overdueInvoices = 0;
    let pendingInvoices = 0;

    for (const inv of invoices) {
      const amount = Number(inv.totalAmount);
      totalAmount += amount;

      switch (inv.status) {
        case InvoiceStatus.PAID:
          paidAmount += amount;
          paidInvoices++;
          break;
        case InvoiceStatus.OVERDUE:
          overdueAmount += amount - Number(inv.paidAmount);
          overdueInvoices++;
          break;
        case InvoiceStatus.SENT:
        case InvoiceStatus.PARTIALLY_PAID:
          pendingAmount += amount - Number(inv.paidAmount);
          pendingInvoices++;
          break;
      }
    }

    return {
      totalAmount,
      paidAmount,
      overdueAmount,
      pendingAmount,
      totalInvoices: invoices.length,
      paidInvoices,
      overdueInvoices,
      pendingInvoices,
    };
  }

  // ============================================================================
  // DELETE INVOICE
  // ============================================================================

  /**
   * Мягкое удаление инвойса (только DRAFT)
   */
  async removeInvoice(id: string, organizationId: string): Promise<void> {
    const invoice = await this.findInvoiceById(id, organizationId);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT invoices can be deleted");
    }

    await this.invoiceRepo.softDelete(id);

    this.logger.log(`Invoice ${invoice.invoiceNumber} soft deleted`);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async generateInvoiceNumber(
    organizationId: string,
    repo: Repository<Invoice> = this.invoiceRepo,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const count = await repo.count({ where: { organizationId } });
    return `INV-${year}${month}-${String(count + 1).padStart(5, "0")}`;
  }
}
