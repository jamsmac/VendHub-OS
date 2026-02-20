import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PurchaseHistory, PurchaseStatus } from './entities/purchase-history.entity';
import {
  CreatePurchaseHistoryDto,
  BulkCreatePurchaseHistoryDto,
  UpdatePurchaseHistoryDto,
  ReceivePurchaseDto,
  ReturnPurchaseDto,
} from './dto/create-purchase-history.dto';
import { QueryPurchaseHistoryDto, PurchaseStatsQueryDto } from './dto/query-purchase-history.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PurchaseHistoryService {
  private readonly logger = new Logger(PurchaseHistoryService.name);

  constructor(
    @InjectRepository(PurchaseHistory)
    private readonly repository: Repository<PurchaseHistory>,
  ) {}

  /**
   * Calculate VAT amount and total amount
   */
  private calculateAmounts(
    quantity: number,
    unitPrice: number,
    vatRate: number,
  ): { vatAmount: number; totalAmount: number } {
    const subtotal = quantity * unitPrice;
    const vatAmount = Math.round((subtotal * vatRate) / 100 * 100) / 100;
    const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;
    return { vatAmount, totalAmount };
  }

  /**
   * Create a single purchase history record
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreatePurchaseHistoryDto,
  ): Promise<PurchaseHistory> {
    const vatRate = dto.vatRate ?? 12;
    const { vatAmount, totalAmount } = this.calculateAmounts(dto.quantity, dto.unitPrice, vatRate);

    const purchase = this.repository.create({
      organizationId,
      purchaseDate: dto.purchaseDate,
      invoiceNumber: dto.invoiceNumber || null,
      supplierId: dto.supplierId || null,
      productId: dto.productId,
      warehouseId: dto.warehouseId || null,
      quantity: dto.quantity,
      unit: dto.unit || 'pcs',
      unitPrice: dto.unitPrice,
      vatRate,
      vatAmount,
      totalAmount,
      batchNumber: dto.batchNumber || null,
      productionDate: dto.productionDate || null,
      expiryDate: dto.expiryDate || null,
      status: PurchaseStatus.PENDING,
      currency: dto.currency || 'UZS',
      exchangeRate: dto.exchangeRate ?? 1,
      paymentMethod: dto.paymentMethod || null,
      notes: dto.notes || null,
      importSource: 'manual',
      created_by_id: userId,
    });

    const saved = await this.repository.save(purchase);

    this.logger.log(
      `Purchase created: id=${saved.id}, product=${dto.productId}, total=${totalAmount}, org=${organizationId}`,
    );

    return saved;
  }

  /**
   * Bulk create purchase history records
   */
  async bulkCreate(
    organizationId: string,
    userId: string,
    dto: BulkCreatePurchaseHistoryDto,
  ): Promise<{ created: number; importSessionId: string }> {
    const importSessionId = randomUUID();

    const purchases = dto.purchases.map((item) => {
      const vatRate = item.vatRate ?? 12;
      const { vatAmount, totalAmount } = this.calculateAmounts(item.quantity, item.unitPrice, vatRate);

      return this.repository.create({
        organizationId,
        purchaseDate: item.purchaseDate,
        invoiceNumber: item.invoiceNumber || null,
        supplierId: item.supplierId || null,
        productId: item.productId,
        warehouseId: item.warehouseId || null,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        unitPrice: item.unitPrice,
        vatRate,
        vatAmount,
        totalAmount,
        batchNumber: item.batchNumber || null,
        productionDate: item.productionDate || null,
        expiryDate: item.expiryDate || null,
        status: PurchaseStatus.PENDING,
        currency: item.currency || 'UZS',
        exchangeRate: item.exchangeRate ?? 1,
        paymentMethod: item.paymentMethod || null,
        notes: item.notes || null,
        importSource: dto.importSource || 'manual',
        importSessionId,
        created_by_id: userId,
      });
    });

    await this.repository.save(purchases);

    this.logger.log(
      `Bulk purchases created: count=${purchases.length}, session=${importSessionId}, org=${organizationId}`,
    );

    return { created: purchases.length, importSessionId };
  }

  /**
   * Find all purchase history records with pagination and filters
   */
  async findAll(
    organizationId: string,
    params: QueryPurchaseHistoryDto,
  ): Promise<{ data: PurchaseHistory[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder('ph')
      .where('ph.organizationId = :organizationId', { organizationId });

    if (params.supplierId) {
      query.andWhere('ph.supplierId = :supplierId', { supplierId: params.supplierId });
    }

    if (params.productId) {
      query.andWhere('ph.productId = :productId', { productId: params.productId });
    }

    if (params.warehouseId) {
      query.andWhere('ph.warehouseId = :warehouseId', { warehouseId: params.warehouseId });
    }

    if (params.status) {
      query.andWhere('ph.status = :status', { status: params.status });
    }

    if (params.dateFrom) {
      query.andWhere('ph.purchaseDate >= :dateFrom', { dateFrom: params.dateFrom });
    }

    if (params.dateTo) {
      query.andWhere('ph.purchaseDate <= :dateTo', { dateTo: params.dateTo });
    }

    if (params.search) {
      query.andWhere(
        '(ph.invoiceNumber ILIKE :search OR ph.batchNumber ILIKE :search OR ph.notes ILIKE :search)',
        { search: `%${params.search}%` },
      );
    }

    const total = await query.getCount();

    const data = await query
      .orderBy('ph.purchaseDate', 'DESC')
      .addOrderBy('ph.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  /**
   * Find a single purchase history record by ID
   */
  async findById(id: string): Promise<PurchaseHistory> {
    const purchase = await this.repository.findOne({ where: { id } });

    if (!purchase) {
      throw new NotFoundException(`Purchase history record with ID ${id} not found`);
    }

    return purchase;
  }

  /**
   * Update a purchase history record (only PENDING status)
   */
  async update(
    id: string,
    dto: UpdatePurchaseHistoryDto,
  ): Promise<PurchaseHistory> {
    const purchase = await this.findById(id);

    if (purchase.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update purchase with status ${purchase.status}. Only PENDING purchases can be updated.`,
      );
    }

    // Recalculate amounts if price-related fields changed
    const quantity = dto.quantity ?? purchase.quantity;
    const unitPrice = dto.unitPrice ?? purchase.unitPrice;
    const vatRate = dto.vatRate ?? purchase.vatRate;
    const { vatAmount, totalAmount } = this.calculateAmounts(quantity, unitPrice, vatRate);

    Object.assign(purchase, {
      ...dto,
      vatAmount,
      totalAmount,
    });

    return this.repository.save(purchase);
  }

  /**
   * Mark purchase as received (PENDING -> RECEIVED)
   */
  async receive(
    id: string,
    userId: string,
    dto?: ReceivePurchaseDto,
  ): Promise<PurchaseHistory> {
    const purchase = await this.findById(id);

    if (purchase.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException(
        `Cannot receive purchase with status ${purchase.status}. Only PENDING purchases can be received.`,
      );
    }

    purchase.status = PurchaseStatus.RECEIVED;
    purchase.deliveryDate = dto?.deliveryDate ? new Date(dto.deliveryDate) : new Date();
    purchase.deliveryNoteNumber = dto?.deliveryNoteNumber || purchase.deliveryNoteNumber;
    purchase.updated_by_id = userId;

    if (dto?.notes) {
      purchase.notes = purchase.notes
        ? `${purchase.notes}\n[Received] ${dto.notes}`
        : `[Received] ${dto.notes}`;
    }

    const saved = await this.repository.save(purchase);

    this.logger.log(`Purchase received: id=${id}, user=${userId}`);

    return saved;
  }

  /**
   * Cancel a purchase (PENDING -> CANCELLED)
   */
  async cancel(id: string): Promise<PurchaseHistory> {
    const purchase = await this.findById(id);

    if (purchase.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel purchase with status ${purchase.status}. Only PENDING purchases can be cancelled.`,
      );
    }

    purchase.status = PurchaseStatus.CANCELLED;

    const saved = await this.repository.save(purchase);

    this.logger.log(`Purchase cancelled: id=${id}`);

    return saved;
  }

  /**
   * Return a purchase (RECEIVED -> RETURNED)
   */
  async returnPurchase(
    id: string,
    dto: ReturnPurchaseDto,
  ): Promise<PurchaseHistory> {
    const purchase = await this.findById(id);

    if (purchase.status !== PurchaseStatus.RECEIVED) {
      throw new BadRequestException(
        `Cannot return purchase with status ${purchase.status}. Only RECEIVED purchases can be returned.`,
      );
    }

    purchase.status = PurchaseStatus.RETURNED;
    purchase.metadata = {
      ...purchase.metadata,
      returnReason: dto.reason,
      returnedAt: new Date().toISOString(),
    };

    if (dto.notes) {
      purchase.notes = purchase.notes
        ? `${purchase.notes}\n[Returned] ${dto.notes}`
        : `[Returned] ${dto.notes}`;
    }

    const saved = await this.repository.save(purchase);

    this.logger.log(`Purchase returned: id=${id}, reason=${dto.reason}`);

    return saved;
  }

  /**
   * Soft delete a purchase (only PENDING or CANCELLED)
   */
  async remove(id: string): Promise<void> {
    const purchase = await this.findById(id);

    if (purchase.status !== PurchaseStatus.PENDING && purchase.status !== PurchaseStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot delete purchase with status ${purchase.status}. Only PENDING or CANCELLED purchases can be deleted.`,
      );
    }

    await this.repository.softDelete(id);

    this.logger.log(`Purchase deleted: id=${id}`);
  }

  /**
   * Get purchase statistics
   */
  async getStats(
    organizationId: string,
    params?: PurchaseStatsQueryDto,
  ): Promise<{
    totalPurchases: number;
    totalAmount: number;
    bySupplier: Array<{ supplierId: string | null; count: number; totalAmount: number }>;
    byProduct: Array<{ productId: string; count: number; totalAmount: number }>;
  }> {
    const baseQuery = this.repository
      .createQueryBuilder('ph')
      .where('ph.organizationId = :organizationId', { organizationId })
      .andWhere('ph.deleted_at IS NULL');

    if (params?.dateFrom) {
      baseQuery.andWhere('ph.purchaseDate >= :dateFrom', { dateFrom: params.dateFrom });
    }

    if (params?.dateTo) {
      baseQuery.andWhere('ph.purchaseDate <= :dateTo', { dateTo: params.dateTo });
    }

    // Overall stats
    const overallStats = await baseQuery
      .clone()
      .select('COUNT(*)', 'totalPurchases')
      .addSelect('COALESCE(SUM(ph.totalAmount), 0)', 'totalAmount')
      .getRawOne();

    // By supplier
    const bySupplier = await baseQuery
      .clone()
      .select('ph.supplierId', 'supplierId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(ph.totalAmount), 0)', 'totalAmount')
      .groupBy('ph.supplierId')
      .orderBy('SUM(ph.totalAmount)', 'DESC')
      .limit(10)
      .getRawMany();

    // By product
    const byProduct = await baseQuery
      .clone()
      .select('ph.productId', 'productId')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(ph.totalAmount), 0)', 'totalAmount')
      .groupBy('ph.productId')
      .orderBy('SUM(ph.totalAmount)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalPurchases: parseInt(overallStats?.totalPurchases || '0', 10),
      totalAmount: parseFloat(overallStats?.totalAmount || '0'),
      bySupplier: bySupplier.map((s) => ({
        supplierId: s.supplierId,
        count: parseInt(s.count, 10),
        totalAmount: parseFloat(s.totalAmount),
      })),
      byProduct: byProduct.map((p) => ({
        productId: p.productId,
        count: parseInt(p.count, 10),
        totalAmount: parseFloat(p.totalAmount),
      })),
    };
  }
}
