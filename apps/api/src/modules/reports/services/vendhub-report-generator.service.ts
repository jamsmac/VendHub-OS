/**
 * VendHub Report Generator Service (Orchestrator)
 * Координирует генерацию отчетов, делегируя в специализированные генераторы.
 *
 * Split architecture:
 * - SalesReportGenerator → Structure A (payment types, 46 sheets)
 * - FinancialReportGenerator → Structure B (financial analytics, 13 sheets) + analytics
 * - InventoryReportGenerator → Ingredient consumption calculations
 *
 * P2-009: Uses batch pagination (BATCH_SIZE=1000) for fetchTransactionData
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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

    // Fetch raw transaction data with batch pagination (P2-009)
    const transactions = await this.fetchTransactionData(
      organizationId,
      dateFrom,
      dateTo,
      dto,
    );

    this.logger.log(`Fetched ${transactions.length} transactions`);

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
  // DATA FETCHING (P2-009: Batch Pagination)
  // ============================================================================

  /**
   * Fetches transaction data in batches of BATCH_SIZE to avoid loading
   * the entire dataset into memory at once. Uses LIMIT/OFFSET pagination
   * with ASC ordering on createdAt for deterministic batching.
   */
  private async fetchTransactionData(
    organizationId: string,
    dateFrom: Date,
    dateTo: Date,
    dto: GenerateVendHubReportDto,
  ): Promise<TransactionData[]> {
    const allTransactions: TransactionData[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const qb = this.transactionRepo
        .createQueryBuilder("t")
        .leftJoinAndSelect("t.machine", "m")
        .leftJoinAndSelect("t.product", "p")
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

      // Exclude test orders unless explicitly included
      if (!dto.includeTestOrders) {
        qb.andWhere("t.paymentType != 'TEST'");
      }

      const batch = await qb
        .orderBy("t.createdAt", "ASC")
        .skip(offset)
        .take(BATCH_SIZE)
        .getMany();

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      // Map batch to TransactionData
      const mapped = batch.map((t) => this.mapTransaction(t));
      allTransactions.push(...mapped);

      this.logger.debug(
        `Fetched batch at offset ${offset}: ${batch.length} records`,
      );

      offset += BATCH_SIZE;
      hasMore = batch.length === BATCH_SIZE;
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
