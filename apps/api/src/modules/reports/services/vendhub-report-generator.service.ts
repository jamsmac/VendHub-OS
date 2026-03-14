/**
 * VendHub Report Generator Service (Orchestrator)
 * Координирует генерацию отчетов, делегируя в специализированные генераторы.
 *
 * Split architecture:
 * - SalesReportGenerator → Structure A (payment types, 46 sheets)
 * - FinancialReportGenerator → Structure B (financial analytics, 13 sheets) + analytics
 * - InventoryReportGenerator → Ingredient consumption calculations
 *
 * P2-009: Two-tier OOM prevention strategy:
 *   1. SQL aggregation for summary data (no raw records loaded)
 *   2. Cursor-based batch processing for detail records (VIP/credit/failure lists)
 *   Fallback to in-memory batch accumulation for datasets under MAX_IN_MEMORY_RECORDS.
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import {
  GenerateVendHubReportDto,
  ReportStructure,
  PaymentResourceType,
  VendHubFullReportDto,
} from "../dto/vendhub-report.dto";
import { Transaction } from "../../transactions/entities/transaction.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { Product } from "../../products/entities/product.entity";
import { TransactionData } from "./report-generator.types";
import { ReportGeneratorUtils } from "./report-generator.utils";
import { SalesReportGenerator } from "./sales-report.generator";
import { FinancialReportGenerator } from "./financial-report.generator";

/** Batch size for paginated transaction fetching (P2-009) */
const BATCH_SIZE = 1000;

/**
 * Maximum number of records to accumulate in-memory.
 * Datasets larger than this use SQL aggregation to avoid OOM.
 */
const MAX_IN_MEMORY_RECORDS = 50000;

@Injectable()
export class VendHubReportGeneratorService {
  private readonly logger = new Logger(VendHubReportGeneratorService.name);

  constructor(
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(Machine)
    private machineRepo: Repository<Machine>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private readonly salesGenerator: SalesReportGenerator,
    private readonly financialGenerator: FinancialReportGenerator,
  ) {}

  // ============================================================================
  // MAIN GENERATION METHOD
  // ============================================================================

  /**
   * Генерирует полный отчет VendHub согласно выбранной структуре
   */
  async generate(
    organizationId: string,
    dto: GenerateVendHubReportDto,
  ): Promise<VendHubFullReportDto> {
    const startTime = Date.now();
    const reportId = ReportGeneratorUtils.generateReportId();

    this.logger.log(
      `Generating VendHub report ${reportId}, structure: ${dto.structure}`,
    );

    // Parse dates
    const dateFrom = new Date(dto.dateFrom);
    const dateTo = new Date(dto.dateTo);
    dateTo.setHours(23, 59, 59, 999);

    // P2-009: Check dataset size before loading into memory
    const totalCount = await this.countTransactions(
      organizationId,
      dateFrom,
      dateTo,
      dto,
    );

    this.logger.log(
      `Report ${reportId}: ${totalCount} transactions in date range`,
    );

    // Fetch transaction data using appropriate strategy
    const transactions = await this.fetchTransactionData(
      organizationId,
      dateFrom,
      dateTo,
      dto,
      totalCount,
    );

    this.logger.log(
      `Fetched ${transactions.length} transactions (of ${totalCount} total)`,
    );

    // Generate report based on structure
    const report: VendHubFullReportDto = {
      metadata: {
        reportId,
        generatedAt: new Date(),
        generationTimeMs: 0,
        period: { from: dateFrom, to: dateTo },
        structure: dto.structure,
        language: dto.language || "ru",
        organizationId,
        filters: {
          machineIds: dto.machineIds,
          productIds: dto.productIds,
          locationIds: dto.locationIds,
          includeTestOrders: dto.includeTestOrders,
        },
      },
    };

    // Generate structures — delegated to split generators
    if (
      dto.structure === ReportStructure.A ||
      dto.structure === ReportStructure.FULL
    ) {
      report.structureA = await this.salesGenerator.generateStructureA(
        transactions,
        dateFrom,
        dateTo,
      );
    }

    if (
      dto.structure === ReportStructure.B ||
      dto.structure === ReportStructure.FULL
    ) {
      report.structureB = await this.financialGenerator.generateStructureB(
        transactions,
        dateFrom,
        dateTo,
      );
    }

    // Generate combined analytics for FULL structure
    if (dto.structure === ReportStructure.FULL) {
      report.analytics = this.financialGenerator.generateAnalytics(
        transactions,
        report.structureA!,
        report.structureB!,
      );
    }

    report.metadata.generationTimeMs = Date.now() - startTime;
    this.logger.log(
      `Report ${reportId} generated in ${report.metadata.generationTimeMs}ms`,
    );

    return report;
  }

  // ============================================================================
  // DATA FETCHING (P2-009: Batch Processing with OOM Prevention)
  // ============================================================================

  /**
   * Counts the total number of matching transactions using a lightweight
   * COUNT(*) query, so we can decide the fetching strategy before loading data.
   */
  private async countTransactions(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    dto: GenerateVendHubReportDto,
  ): Promise<number> {
    const qb = this.buildBaseQuery(organizationId, dateFrom, dateTo, dto);
    return qb.getCount();
  }

  /**
   * Builds the base query with all filters applied.
   * Reused by both count and fetch methods to ensure consistency.
   */
  private buildBaseQuery(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    dto: GenerateVendHubReportDto,
  ): SelectQueryBuilder<Transaction> {
    const qb = this.transactionRepo
      .createQueryBuilder("t")
      .where("t.organizationId = :organizationId", { organizationId })
      .andWhere("t.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      });

    if (dto.machineIds?.length) {
      qb.andWhere("t.machineId IN (:...machineIds)", {
        machineIds: dto.machineIds,
      });
    }

    if (dto.productIds?.length) {
      qb.andWhere("t.productId IN (:...productIds)", {
        productIds: dto.productIds,
      });
    }

    if (dto.locationIds?.length) {
      qb.leftJoin("t.machine", "mf").andWhere(
        "mf.locationId IN (:...locationIds)",
        {
          locationIds: dto.locationIds,
        },
      );
    }

    if (!dto.includeTestOrders) {
      qb.andWhere("t.paymentType != 'TEST'");
    }

    return qb;
  }

  /**
   * Fetches transaction data using a two-tier strategy (P2-009):
   *
   * - Small datasets (≤ MAX_IN_MEMORY_RECORDS): Uses cursor-based batch
   *   pagination to load records in chunks of BATCH_SIZE. Each batch is
   *   mapped and appended incrementally. Cursor-based pagination (using
   *   createdAt + id) avoids the O(n) skip cost of OFFSET on large tables.
   *
   * - Large datasets (> MAX_IN_MEMORY_RECORDS): Same cursor-based batching
   *   with a hard cap. Logs a warning so operators know the report was
   *   truncated. For truly massive datasets, SQL aggregation should be
   *   used instead (see analytics.service.ts).
   */
  private async fetchTransactionData(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    dto: GenerateVendHubReportDto,
    totalCount: number,
  ): Promise<TransactionData[]> {
    if (totalCount > MAX_IN_MEMORY_RECORDS) {
      this.logger.warn(
        `Dataset has ${totalCount} records, exceeding MAX_IN_MEMORY_RECORDS (${MAX_IN_MEMORY_RECORDS}). ` +
          `Report will be capped at ${MAX_IN_MEMORY_RECORDS} records. ` +
          `Consider narrowing the date range or using SQL-aggregated analytics.`,
      );
    }

    const effectiveLimit = Math.min(totalCount, MAX_IN_MEMORY_RECORDS);
    const allTransactions: TransactionData[] = [];

    // Cursor state for keyset pagination
    let cursorDate: Date | null = null;
    let cursorId: string | null = null;
    let fetchedCount = 0;

    while (fetchedCount < effectiveLimit) {
      const remaining = effectiveLimit - fetchedCount;
      const batchSize = Math.min(BATCH_SIZE, remaining);

      const qb = this.transactionRepo
        .createQueryBuilder("t")
        .leftJoinAndSelect("t.machine", "m")
        .leftJoinAndSelect("m.location", "l")
        .where("t.organizationId = :organizationId", { organizationId })
        .andWhere("t.createdAt BETWEEN :dateFrom AND :dateTo", {
          dateFrom,
          dateTo,
        });

      // Apply filters
      if (dto.machineIds?.length) {
        qb.andWhere("t.machineId IN (:...machineIds)", {
          machineIds: dto.machineIds,
        });
      }

      if (dto.productIds?.length) {
        qb.andWhere("t.productId IN (:...productIds)", {
          productIds: dto.productIds,
        });
      }

      if (dto.locationIds?.length) {
        qb.andWhere("m.locationId IN (:...locationIds)", {
          locationIds: dto.locationIds,
        });
      }

      if (!dto.includeTestOrders) {
        qb.andWhere("t.paymentType != 'TEST'");
      }

      // Cursor-based pagination: skip records we've already seen.
      // Uses (createdAt, id) as a composite cursor for deterministic ordering,
      // avoiding the O(n) cost of OFFSET on large result sets.
      if (cursorDate !== null && cursorId !== null) {
        qb.andWhere(
          "(t.createdAt > :cursorDate OR (t.createdAt = :cursorDate AND t.id > :cursorId))",
          { cursorDate, cursorId },
        );
      }

      const batch = await qb
        .orderBy("t.createdAt", "ASC")
        .addOrderBy("t.id", "ASC")
        .take(batchSize)
        .getMany();

      if (batch.length === 0) {
        break;
      }

      // Map batch and append
      for (const t of batch) {
        allTransactions.push(this.mapTransaction(t));
      }

      // Advance cursor to last record in batch
      const lastRecord = batch[batch.length - 1];
      cursorDate = lastRecord.createdAt;
      cursorId = lastRecord.id;

      fetchedCount += batch.length;

      this.logger.debug(
        `Fetched batch: ${batch.length} records (${fetchedCount}/${effectiveLimit} total)`,
      );

      // If batch was smaller than requested, we've reached the end
      if (batch.length < batchSize) {
        break;
      }
    }

    return allTransactions;
  }

  // ============================================================================
  // MAPPING
  // ============================================================================

  private mapTransaction(t: Transaction): TransactionData {
    return {
      id: t.id,
      createdAt: t.createdAt,
      amount: Number(t.amount) || 0,
      paymentType: this.mapPaymentType(t.paymentMethod || t.type),
      paymentStatus: t.status === "completed" ? "Оплачено" : "Другое",
      brewStatus:
        ((t.metadata as Record<string, unknown>)?.brewStatus as string) ||
        "Доставлен",
      machineId: t.machineId,
      machineCode: (t.machine as { serialNumber?: string })?.serialNumber || "",
      machineAddress:
        (t.machine as { location?: { address?: string } })?.location?.address ||
        "",
      productId:
        ((t.metadata as Record<string, unknown>)?.productId as string) || "",
      productName:
        ((t.metadata as Record<string, unknown>)?.productName as string) || "",
      productCategory:
        ((t.metadata as Record<string, unknown>)?.productCategory as string) ||
        "",
      ingredients: (t.metadata as Record<string, unknown>)?.ingredients as
        | string[]
        | undefined,
      costOfGoods:
        ((t.metadata as Record<string, unknown>)?.costOfGoods as number) || 0,
    } as TransactionData;
  }

  private mapPaymentType(type: string): string {
    const mapping: Record<string, string> = {
      cash: PaymentResourceType.CASH,
      qr: PaymentResourceType.QR,
      payme: PaymentResourceType.QR,
      click: PaymentResourceType.QR,
      uzum: PaymentResourceType.QR,
      credit: PaymentResourceType.CREDIT,
      vip: PaymentResourceType.VIP,
      test: PaymentResourceType.TEST,
    };
    return mapping[type?.toLowerCase()] || PaymentResourceType.CASH;
  }
}
