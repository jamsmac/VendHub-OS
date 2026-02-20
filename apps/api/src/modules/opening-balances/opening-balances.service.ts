import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StockOpeningBalance } from './entities/stock-opening-balance.entity';
import {
  CreateOpeningBalanceDto,
  BulkCreateOpeningBalanceDto,
  UpdateOpeningBalanceDto,
  QueryOpeningBalancesDto,
  ApplyAllDto,
} from './dto/create-opening-balance.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class OpeningBalancesService {
  private readonly logger = new Logger(OpeningBalancesService.name);

  constructor(
    @InjectRepository(StockOpeningBalance)
    private readonly repository: Repository<StockOpeningBalance>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a single opening balance record
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateOpeningBalanceDto,
  ): Promise<StockOpeningBalance> {
    const totalCost = dto.totalCost ?? dto.quantity * dto.unitCost;

    const balance = this.repository.create({
      organizationId,
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      balanceDate: dto.balanceDate,
      quantity: dto.quantity,
      unit: dto.unit || 'pcs',
      unitCost: dto.unitCost,
      totalCost,
      batchNumber: dto.batchNumber || null,
      expiryDate: dto.expiryDate || null,
      location: dto.location || null,
      notes: dto.notes || null,
      importSource: 'manual',
      created_by_id: userId,
    });

    const saved = await this.repository.save(balance);

    this.logger.log(
      `Opening balance created: id=${saved.id}, product=${dto.productId}, org=${organizationId}`,
    );

    return saved;
  }

  /**
   * Bulk create opening balance records with shared import session ID
   */
  async bulkCreate(
    organizationId: string,
    userId: string,
    dto: BulkCreateOpeningBalanceDto,
  ): Promise<{ created: number; importSessionId: string }> {
    const importSessionId = randomUUID();

    const balances = dto.balances.map((item) => {
      const totalCost = item.totalCost ?? item.quantity * item.unitCost;

      return this.repository.create({
        organizationId,
        productId: item.productId,
        warehouseId: item.warehouseId,
        balanceDate: item.balanceDate,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        unitCost: item.unitCost,
        totalCost,
        batchNumber: item.batchNumber || null,
        expiryDate: item.expiryDate || null,
        location: item.location || null,
        notes: item.notes || null,
        importSource: dto.importSource || 'manual',
        importSessionId,
        created_by_id: userId,
      });
    });

    await this.repository.save(balances);

    this.logger.log(
      `Bulk opening balances created: count=${balances.length}, session=${importSessionId}, org=${organizationId}`,
    );

    return { created: balances.length, importSessionId };
  }

  /**
   * Find all opening balances with pagination and filters
   */
  async findAll(
    organizationId: string,
    params: QueryOpeningBalancesDto,
  ): Promise<{ data: StockOpeningBalance[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder('sob')
      .where('sob.organizationId = :organizationId', { organizationId });

    if (params.productId) {
      query.andWhere('sob.productId = :productId', { productId: params.productId });
    }

    if (params.warehouseId) {
      query.andWhere('sob.warehouseId = :warehouseId', { warehouseId: params.warehouseId });
    }

    if (params.isApplied !== undefined) {
      query.andWhere('sob.isApplied = :isApplied', { isApplied: params.isApplied });
    }

    if (params.dateFrom) {
      query.andWhere('sob.balanceDate >= :dateFrom', { dateFrom: params.dateFrom });
    }

    if (params.dateTo) {
      query.andWhere('sob.balanceDate <= :dateTo', { dateTo: params.dateTo });
    }

    const total = await query.getCount();

    const data = await query
      .orderBy('sob.balanceDate', 'DESC')
      .addOrderBy('sob.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  /**
   * Find a single opening balance by ID
   */
  async findById(id: string): Promise<StockOpeningBalance> {
    const balance = await this.repository.findOne({ where: { id } });

    if (!balance) {
      throw new NotFoundException(`Opening balance with ID ${id} not found`);
    }

    return balance;
  }

  /**
   * Update an opening balance (only unapplied records)
   */
  async update(
    id: string,
    dto: UpdateOpeningBalanceDto,
  ): Promise<StockOpeningBalance> {
    const balance = await this.findById(id);

    if (balance.isApplied) {
      throw new BadRequestException('Cannot update an already applied opening balance');
    }

    // Recalculate totalCost if quantity or unitCost changed
    const quantity = dto.quantity ?? balance.quantity;
    const unitCost = dto.unitCost ?? balance.unitCost;
    const totalCost = dto.totalCost ?? quantity * unitCost;

    Object.assign(balance, {
      ...dto,
      totalCost,
    });

    return this.repository.save(balance);
  }

  /**
   * Apply a single opening balance
   */
  async apply(id: string, userId: string): Promise<StockOpeningBalance> {
    const balance = await this.findById(id);

    if (balance.isApplied) {
      throw new BadRequestException('Opening balance is already applied');
    }

    balance.isApplied = true;
    balance.appliedAt = new Date();
    balance.appliedByUserId = userId;

    const saved = await this.repository.save(balance);

    this.eventEmitter.emit('opening-balance.applied', {
      id: saved.id,
      organizationId: saved.organizationId,
      productId: saved.productId,
      warehouseId: saved.warehouseId,
      quantity: saved.quantity,
      unitCost: saved.unitCost,
      totalCost: saved.totalCost,
      appliedByUserId: userId,
    });

    this.logger.log(`Opening balance applied: id=${id}, user=${userId}`);

    return saved;
  }

  /**
   * Apply all unapplied opening balances for a specific date
   */
  async applyAll(
    organizationId: string,
    userId: string,
    dto: ApplyAllDto,
  ): Promise<{ applied: number }> {
    const balances = await this.repository.find({
      where: {
        organizationId,
        balanceDate: new Date(dto.balanceDate),
        isApplied: false,
      },
    });

    if (balances.length === 0) {
      return { applied: 0 };
    }

    const now = new Date();

    for (const balance of balances) {
      balance.isApplied = true;
      balance.appliedAt = now;
      balance.appliedByUserId = userId;
    }

    await this.repository.save(balances);

    // Emit events for each applied balance
    for (const balance of balances) {
      this.eventEmitter.emit('opening-balance.applied', {
        id: balance.id,
        organizationId: balance.organizationId,
        productId: balance.productId,
        warehouseId: balance.warehouseId,
        quantity: balance.quantity,
        unitCost: balance.unitCost,
        totalCost: balance.totalCost,
        appliedByUserId: userId,
      });
    }

    this.logger.log(
      `Apply all opening balances: count=${balances.length}, date=${dto.balanceDate}, org=${organizationId}`,
    );

    return { applied: balances.length };
  }

  /**
   * Soft delete an opening balance (only unapplied records)
   */
  async remove(id: string): Promise<void> {
    const balance = await this.findById(id);

    if (balance.isApplied) {
      throw new BadRequestException('Cannot delete an already applied opening balance');
    }

    await this.repository.softDelete(id);

    this.logger.log(`Opening balance deleted: id=${id}`);
  }

  /**
   * Get statistics for opening balances
   */
  async getStats(
    organizationId: string,
  ): Promise<{
    total: number;
    applied: number;
    pending: number;
    totalValue: number;
  }> {
    const stats = await this.repository
      .createQueryBuilder('sob')
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN sob.isApplied = true THEN 1 ELSE 0 END)', 'applied')
      .addSelect('SUM(CASE WHEN sob.isApplied = false THEN 1 ELSE 0 END)', 'pending')
      .addSelect('COALESCE(SUM(sob.totalCost), 0)', 'totalValue')
      .where('sob.organizationId = :organizationId', { organizationId })
      .andWhere('sob.deleted_at IS NULL')
      .getRawOne();

    return {
      total: parseInt(stats?.total || '0', 10),
      applied: parseInt(stats?.applied || '0', 10),
      pending: parseInt(stats?.pending || '0', 10),
      totalValue: parseFloat(stats?.totalValue || '0'),
    };
  }
}
