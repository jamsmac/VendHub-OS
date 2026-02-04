/**
 * Reconciliation Service
 * Логика сверки данных между HW-отчётами, транзакциями и платёжными системами
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  ReconciliationRun,
  ReconciliationMismatch,
  HwImportedSale,
  ReconciliationStatus,
  MismatchType,
} from './entities/reconciliation.entity';
import {
  CreateReconciliationRunDto,
  ResolveMismatchDto,
  ImportHwSalesDto,
  QueryReconciliationRunsDto,
  QueryMismatchesDto,
} from './dto/create-reconciliation-run.dto';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(ReconciliationRun)
    private readonly runRepo: Repository<ReconciliationRun>,
    @InjectRepository(ReconciliationMismatch)
    private readonly mismatchRepo: Repository<ReconciliationMismatch>,
    @InjectRepository(HwImportedSale)
    private readonly hwSaleRepo: Repository<HwImportedSale>,
  ) {}

  // ============================================================================
  // CREATE RUN
  // ============================================================================

  /**
   * Создать запуск сверки
   */
  async createRun(
    organizationId: string,
    userId: string,
    dto: CreateReconciliationRunDto,
  ): Promise<ReconciliationRun> {
    const run = this.runRepo.create({
      organizationId,
      status: ReconciliationStatus.PENDING,
      dateFrom: new Date(dto.dateFrom),
      dateTo: new Date(dto.dateTo),
      sources: dto.sources,
      machineIds: dto.machineIds || [],
      timeTolerance: dto.timeTolerance ?? 300,
      amountTolerance: dto.amountTolerance ?? 0.01,
      created_by_id: userId,
    });

    const saved = await this.runRepo.save(run);

    this.logger.log(
      `Reconciliation run ${saved.id} created for org ${organizationId} ` +
      `(${dto.dateFrom} to ${dto.dateTo})`,
    );

    return saved;
  }

  // ============================================================================
  // PROCESS RECONCILIATION
  // ============================================================================

  /**
   * Запустить процесс сверки
   */
  async processReconciliation(runId: string): Promise<ReconciliationRun> {
    const run = await this.runRepo.findOne({ where: { id: runId } });

    if (!run) {
      throw new NotFoundException('Reconciliation run not found');
    }

    if (run.status !== ReconciliationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot process run with status ${run.status}`,
      );
    }

    // 1) Mark as PROCESSING
    run.status = ReconciliationStatus.PROCESSING;
    run.startedAt = new Date();
    await this.runRepo.save(run);

    const startTime = Date.now();

    try {
      // 2) Load HW sales for the period
      const hwSalesQuery = this.hwSaleRepo
        .createQueryBuilder('hw')
        .where('hw.organizationId = :orgId', { orgId: run.organizationId })
        .andWhere('hw.saleDate BETWEEN :from AND :to', {
          from: run.dateFrom,
          to: run.dateTo,
        });

      if (run.machineIds && run.machineIds.length > 0) {
        hwSalesQuery.andWhere('hw.machineCode IN (:...machineCodes)', {
          machineCodes: run.machineIds,
        });
      }

      const hwSales = await hwSalesQuery.getMany();

      // 3) Build lookup maps for matching
      const hwByOrderNumber = new Map<string, HwImportedSale>();
      const hwUnmatched: HwImportedSale[] = [];

      for (const hw of hwSales) {
        if (hw.orderNumber) {
          hwByOrderNumber.set(hw.orderNumber, hw);
        } else {
          hwUnmatched.push(hw);
        }
      }

      // 4) Match logic: compare HW sales against each other and detect mismatches
      let matched = 0;
      let mismatched = 0;
      let missing = 0;
      const totalRecords = hwSales.length;
      const mismatches: Partial<ReconciliationMismatch>[] = [];

      // For each HW sale that has no order number, mark as missing
      for (const hw of hwUnmatched) {
        missing++;
        mismatches.push({
          runId: run.id,
          organizationId: run.organizationId,
          orderNumber: hw.orderNumber,
          machineCode: hw.machineCode,
          orderTime: hw.saleDate,
          amount: hw.amount,
          paymentMethod: hw.paymentMethod,
          mismatchType: MismatchType.ORDER_NOT_FOUND,
          matchScore: 0,
          sourcesData: { hw: hw.rawData },
          description: 'HW sale has no matching order number',
        });
      }

      // Check for duplicates among HW sales by order number
      const orderNumberCounts = new Map<string, HwImportedSale[]>();
      for (const hw of hwSales) {
        if (hw.orderNumber) {
          const existing = orderNumberCounts.get(hw.orderNumber) || [];
          existing.push(hw);
          orderNumberCounts.set(hw.orderNumber, existing);
        }
      }

      for (const [orderNumber, sales] of orderNumberCounts) {
        if (sales.length > 1) {
          mismatched++;
          mismatches.push({
            runId: run.id,
            organizationId: run.organizationId,
            orderNumber,
            machineCode: sales[0].machineCode,
            orderTime: sales[0].saleDate,
            amount: sales[0].amount,
            mismatchType: MismatchType.DUPLICATE,
            matchScore: 100,
            sourcesData: { duplicates: sales.map((s) => s.rawData) },
            description: `Duplicate order number found ${sales.length} times`,
          });
        } else {
          // Single occurrence with order number -- considered matched
          matched++;
          // Mark HW sale as reconciled
          const sale = sales[0];
          sale.isReconciled = true;
          sale.reconciliationRunId = run.id;
          await this.hwSaleRepo.save(sale);
        }
      }

      // 5) Create mismatch records
      if (mismatches.length > 0) {
        await this.mismatchRepo.save(
          mismatches.map((m) => this.mismatchRepo.create(m)),
        );
      }

      // 6) Calculate summary
      const matchRate =
        totalRecords > 0 ? Math.round((matched / totalRecords) * 10000) / 100 : 0;

      run.summary = {
        totalRecords,
        matched,
        mismatched,
        missing,
        matchRate,
      };

      // 7) Mark COMPLETED
      run.status = ReconciliationStatus.COMPLETED;
      run.completedAt = new Date();
      run.processingTimeMs = Date.now() - startTime;

      await this.runRepo.save(run);

      this.logger.log(
        `Reconciliation run ${run.id} completed: ` +
        `${matched}/${totalRecords} matched (${matchRate}%)`,
      );

      return run;
    } catch (error) {
      // Mark as FAILED
      run.status = ReconciliationStatus.FAILED;
      run.completedAt = new Date();
      run.processingTimeMs = Date.now() - startTime;
      run.errorMessage = error instanceof Error ? error.message : String(error);

      await this.runRepo.save(run);

      this.logger.error(
        `Reconciliation run ${run.id} failed: ${run.errorMessage}`,
      );

      throw error;
    }
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Получить список запусков сверки
   */
  async findAll(
    organizationId: string,
    params: QueryReconciliationRunsDto,
  ): Promise<{ items: ReconciliationRun[]; total: number; page: number; limit: number; totalPages: number }> {
    const { status, dateFrom, dateTo, page = 1, limit = 20 } = params;

    const qb = this.runRepo
      .createQueryBuilder('r')
      .where('r.organizationId = :organizationId', { organizationId });

    if (status) {
      qb.andWhere('r.status = :status', { status });
    }

    if (dateFrom) {
      qb.andWhere('r.dateFrom >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('r.dateTo <= :dateTo', { dateTo });
    }

    const [items, total] = await qb
      .orderBy('r.createdAt', 'DESC')
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
   * Получить запуск сверки с расхождениями
   */
  async findOne(id: string): Promise<ReconciliationRun> {
    const run = await this.runRepo.findOne({
      where: { id },
      relations: ['mismatches'],
    });

    if (!run) {
      throw new NotFoundException('Reconciliation run not found');
    }

    return run;
  }

  /**
   * Получить расхождения для запуска сверки
   */
  async getMismatches(
    runId: string,
    params: QueryMismatchesDto,
  ): Promise<{ items: ReconciliationMismatch[]; total: number; page: number; limit: number; totalPages: number }> {
    const { mismatchType, isResolved, page = 1, limit = 20 } = params;

    const qb = this.mismatchRepo
      .createQueryBuilder('m')
      .where('m.runId = :runId', { runId });

    if (mismatchType) {
      qb.andWhere('m.mismatchType = :mismatchType', { mismatchType });
    }

    if (isResolved !== undefined) {
      qb.andWhere('m.isResolved = :isResolved', { isResolved });
    }

    const [items, total] = await qb
      .orderBy('m.createdAt', 'DESC')
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
  // RESOLVE MISMATCH
  // ============================================================================

  /**
   * Отметить расхождение как решённое
   */
  async resolveMismatch(
    id: string,
    userId: string,
    dto: ResolveMismatchDto,
  ): Promise<ReconciliationMismatch> {
    const mismatch = await this.mismatchRepo.findOne({ where: { id } });

    if (!mismatch) {
      throw new NotFoundException('Mismatch not found');
    }

    if (mismatch.isResolved) {
      throw new BadRequestException('Mismatch is already resolved');
    }

    mismatch.isResolved = true;
    mismatch.resolutionNotes = dto.resolutionNotes;
    mismatch.resolvedAt = new Date();
    mismatch.resolvedByUserId = userId;
    mismatch.updated_by_id = userId;

    await this.mismatchRepo.save(mismatch);

    this.logger.log(`Mismatch ${id} resolved by user ${userId}`);

    return mismatch;
  }

  // ============================================================================
  // IMPORT HW SALES
  // ============================================================================

  /**
   * Импортировать продажи из HW-отчёта
   */
  async importHwSales(
    organizationId: string,
    userId: string,
    dto: ImportHwSalesDto,
  ): Promise<{ batchId: string; imported: number }> {
    const batchId = crypto.randomUUID();

    const records = dto.sales.map((sale, index) =>
      this.hwSaleRepo.create({
        organizationId,
        importBatchId: batchId,
        saleDate: new Date(sale.saleDate),
        machineCode: sale.machineCode,
        amount: sale.amount,
        paymentMethod: sale.paymentMethod || null,
        orderNumber: sale.orderNumber || null,
        productName: sale.productName || null,
        productCode: sale.productCode || null,
        quantity: sale.quantity ?? 1,
        importSource: dto.importSource,
        importFilename: dto.importFilename || null,
        importRowNumber: index + 1,
        importedByUserId: userId,
        created_by_id: userId,
        rawData: sale as unknown as Record<string, any>,
      }),
    );

    await this.hwSaleRepo.save(records);

    this.logger.log(
      `Imported ${records.length} HW sales (batch ${batchId}) for org ${organizationId}`,
    );

    return { batchId, imported: records.length };
  }

  // ============================================================================
  // DELETE RUN
  // ============================================================================

  /**
   * Мягкое удаление запуска сверки (только COMPLETED или FAILED)
   */
  async deleteRun(id: string): Promise<void> {
    const run = await this.runRepo.findOne({ where: { id } });

    if (!run) {
      throw new NotFoundException('Reconciliation run not found');
    }

    if (
      run.status !== ReconciliationStatus.COMPLETED &&
      run.status !== ReconciliationStatus.FAILED
    ) {
      throw new BadRequestException(
        `Cannot delete run with status ${run.status}. Only COMPLETED or FAILED runs can be deleted.`,
      );
    }

    await this.runRepo.softDelete(id);

    this.logger.log(`Reconciliation run ${id} soft deleted`);
  }
}
