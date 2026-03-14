/**
 * Reports Generator Service
 * Definitions, generation, data queries, file creation, delivery
 *
 * P2-009: Uses batch pagination (BATCH_SIZE=500) for machine queries
 * in generateMachinePerformance and generateInventoryLevels to prevent OOM.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import {
  ReportDefinition,
  GeneratedReport,
  ReportType,
  ExportFormat,
  ReportStatus,
} from "./entities/report.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Product } from "../products/entities/product.entity";

type ReportFormat = ExportFormat;

/** Batch size for paginated queries (P2-009) */
const BATCH_SIZE = 500;

export interface GenerateReportDto {
  organizationId: string;
  reportDefinitionId?: string;
  type?: ReportType;
  name?: string;
  format: ReportFormat;
  parameters?: Record<string, unknown>;
  dateFrom?: Date;
  dateTo?: Date;
  delivery?: {
    method: "download" | "email" | "storage";
    emails?: string[];
    storagePath?: string;
  };
}

@Injectable()
export class ReportsGeneratorService {
  private readonly logger = new Logger(ReportsGeneratorService.name);

  constructor(
    @InjectRepository(ReportDefinition)
    private definitionRepo: Repository<ReportDefinition>,
    @InjectRepository(GeneratedReport)
    private generatedRepo: Repository<GeneratedReport>,
    @InjectRepository(Transaction)
    private transactionRepo: Repository<Transaction>,
    @InjectRepository(Machine)
    private machineRepo: Repository<Machine>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
  ) {}

  // ── Report Definitions ───────────────────────────────────

  async getDefinitions(organizationId?: string): Promise<ReportDefinition[]> {
    return this.definitionRepo.find({
      where: [
        { organizationId, isActive: true },
        { isSystem: true, isActive: true },
      ],
      order: { category: "ASC", name: "ASC" },
    });
  }

  async getDefinition(
    id: string,
    organizationId: string,
  ): Promise<ReportDefinition> {
    const where = [
      { id, organizationId },
      { id, isSystem: true },
    ];
    const definition = await this.definitionRepo.findOne({ where });
    if (!definition) {
      throw new NotFoundException(`Определение отчёта ${id} не найдено`);
    }
    return definition;
  }

  async getDefinitionByCode(code: string): Promise<ReportDefinition> {
    const definition = await this.definitionRepo.findOne({ where: { code } });
    if (!definition) {
      throw new NotFoundException(`Отчёт ${code} не найден`);
    }
    return definition;
  }

  async createDefinition(
    data: Partial<ReportDefinition>,
  ): Promise<ReportDefinition> {
    const definition = this.definitionRepo.create({
      ...data,
      isActive: true,
      isSystem: false,
      isPublic: false,
    });
    return this.definitionRepo.save(definition);
  }

  // ── Report Generation ────────────────────────────────────

  async generate(
    dto: GenerateReportDto,
    generatedById?: string,
  ): Promise<GeneratedReport> {
    const startTime = Date.now();

    let definition: ReportDefinition | null = null;
    if (dto.reportDefinitionId) {
      definition = await this.getDefinition(
        dto.reportDefinitionId,
        dto.organizationId,
      );
    }

    const reportType = dto.type || definition?.type || ReportType.CUSTOM;
    const reportName =
      dto.name || definition?.name || `Отчёт ${new Date().toISOString()}`;

    const report = this.generatedRepo.create({
      organizationId: dto.organizationId,
      definitionId: dto.reportDefinitionId || "",
      name: reportName,
      type: reportType,
      generationParams: {
        format: dto.format,
        ...dto.parameters,
      },
      filters: dto.parameters as Record<string, unknown>,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      status: ReportStatus.GENERATING,
      createdById: generatedById,
      startedAt: new Date(),
    });

    await this.generatedRepo.save(report);

    try {
      const data = await this.generateReportData(reportType, dto);

      const { filePath, fileSize } = await this.createReportFile(
        report,
        data,
        dto.format,
      );

      report.files = [
        {
          format: dto.format,
          url: filePath,
          filename: `${report.reportNumber}.${dto.format}`,
          size: fileSize,
          mimeType: this.getMimeType(dto.format),
          generatedAt: new Date(),
        },
      ];
      report.status = ReportStatus.COMPLETED;
      report.generationTimeMs = Date.now() - startTime;
      report.completedAt = new Date();
      report.rowCount = data.rows?.length || 0;
      report.summary = data.summary;
      report.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await this.generatedRepo.save(report);

      if (dto.delivery) {
        await this.deliverReport(report, dto.delivery);
      }

      return report;
    } catch (error: unknown) {
      report.status = ReportStatus.FAILED;
      report.errorMessage =
        error instanceof Error ? error.message : String(error);
      report.errorDetails = {
        stack: error instanceof Error ? error.stack : undefined,
      };
      report.generationTimeMs = Date.now() - startTime;
      report.completedAt = new Date();
      await this.generatedRepo.save(report);
      throw error;
    }
  }

  private async generateReportData(
    type: ReportType,
    dto: GenerateReportDto,
  ): Promise<{
    rows: Record<string, unknown>[];
    summary: Record<string, unknown>;
  }> {
    switch (type) {
      case ReportType.SALES_SUMMARY:
        return this.generateSalesSummary(dto);
      case ReportType.MACHINE_PERFORMANCE:
        return this.generateMachinePerformance(dto);
      case ReportType.INVENTORY_LEVELS:
        return this.generateInventoryLevels(dto);
      default:
        return { rows: [], summary: {} };
    }
  }

  private async generateSalesSummary(dto: GenerateReportDto): Promise<{
    rows: Record<string, unknown>[];
    summary: Record<string, unknown>;
  }> {
    const qb = this.transactionRepo
      .createQueryBuilder("t")
      .where("t.organizationId = :orgId", { orgId: dto.organizationId });

    if (dto.dateFrom) {
      qb.andWhere("t.transactionDate >= :dateFrom", { dateFrom: dto.dateFrom });
    }
    if (dto.dateTo) {
      qb.andWhere("t.transactionDate <= :dateTo", { dateTo: dto.dateTo });
    }

    const summaryRaw = await qb
      .clone()
      .select("t.paymentMethod", "paymentMethod")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(t.totalAmount), 0)", "revenue")
      .addSelect("COALESCE(AVG(t.totalAmount), 0)", "average")
      .groupBy("t.paymentMethod")
      .getRawMany();

    const totalsRaw = await qb
      .clone()
      .select("COUNT(*)", "totalTransactions")
      .addSelect("COALESCE(SUM(t.totalAmount), 0)", "totalRevenue")
      .addSelect("COALESCE(AVG(t.totalAmount), 0)", "averageTransaction")
      .getRawOne();

    return {
      rows: summaryRaw.map((r) => ({
        paymentMethod: r.paymentMethod,
        count: parseInt(r.count, 10),
        revenue: parseFloat(r.revenue),
        average: parseFloat(r.average),
      })),
      summary: {
        totalTransactions: parseInt(totalsRaw?.totalTransactions || "0", 10),
        totalRevenue: parseFloat(totalsRaw?.totalRevenue || "0"),
        averageTransaction: parseFloat(totalsRaw?.averageTransaction || "0"),
      },
    };
  }

  private async generateMachinePerformance(dto: GenerateReportDto): Promise<{
    rows: Record<string, unknown>[];
    summary: Record<string, unknown>;
  }> {
    // P2-009: Batch-load machines to prevent OOM on large organizations
    const machines: Machine[] = [];
    let offset = 0;

    while (true) {
      const batch = await this.machineRepo.find({
        where: { organizationId: dto.organizationId },
        select: [
          "id",
          "name",
          "machineNumber",
          "status",
          "connectionStatus",
          "totalSalesCount",
          "totalRevenue",
          "lastPingAt",
          "currentProductCount",
          "maxProductSlots",
        ],
        order: { createdAt: "ASC" },
        skip: offset,
        take: BATCH_SIZE,
      });

      if (batch.length === 0) break;
      machines.push(...batch);
      offset += BATCH_SIZE;
      if (batch.length < BATCH_SIZE) break;
    }

    const now = Date.now();
    const rows = machines.map((m) => {
      const offlineMinutes = m.lastPingAt
        ? (now - new Date(m.lastPingAt).getTime()) / 60000
        : null;
      const stockPercent =
        m.maxProductSlots > 0
          ? Math.round((m.currentProductCount / m.maxProductSlots) * 100)
          : 0;

      return {
        machineNumber: m.machineNumber,
        name: m.name,
        status: m.status,
        connectionStatus: m.connectionStatus,
        totalSales: m.totalSalesCount,
        totalRevenue: Number(m.totalRevenue),
        stockPercent,
        offlineMinutes:
          offlineMinutes !== null ? Math.round(offlineMinutes) : null,
      };
    });

    const onlineCount = rows.filter(
      (r) => r.offlineMinutes !== null && r.offlineMinutes < 10,
    ).length;

    return {
      rows,
      summary: {
        totalMachines: machines.length,
        onlineMachines: onlineCount,
        averageUptime:
          machines.length > 0
            ? Math.round((onlineCount / machines.length) * 100)
            : 0,
        totalRevenue: rows.reduce((sum, r) => sum + r.totalRevenue, 0),
      },
    };
  }

  private async generateInventoryLevels(dto: GenerateReportDto): Promise<{
    rows: Record<string, unknown>[];
    summary: Record<string, unknown>;
  }> {
    // P2-009: Batch-load machines to prevent OOM on large organizations
    const machines: Machine[] = [];
    let offset = 0;

    while (true) {
      const batch = await this.machineRepo.find({
        where: { organizationId: dto.organizationId },
        select: [
          "id",
          "name",
          "machineNumber",
          "currentProductCount",
          "maxProductSlots",
          "lowStockThresholdPercent",
        ],
        order: { createdAt: "ASC" },
        skip: offset,
        take: BATCH_SIZE,
      });

      if (batch.length === 0) break;
      machines.push(...batch);
      offset += BATCH_SIZE;
      if (batch.length < BATCH_SIZE) break;
    }

    const rows = machines.map((m) => {
      const stockPercent =
        m.maxProductSlots > 0
          ? Math.round((m.currentProductCount / m.maxProductSlots) * 100)
          : 0;
      const isLowStock = stockPercent <= (m.lowStockThresholdPercent || 10);

      return {
        machineNumber: m.machineNumber,
        name: m.name,
        currentStock: m.currentProductCount,
        maxCapacity: m.maxProductSlots,
        stockPercent,
        isLowStock,
      };
    });

    const lowStockItems = rows.filter((r) => r.isLowStock).length;

    return {
      rows,
      summary: {
        totalMachines: machines.length,
        lowStockMachines: lowStockItems,
        averageStockPercent:
          rows.length > 0
            ? Math.round(
                rows.reduce((sum, r) => sum + r.stockPercent, 0) / rows.length,
              )
            : 0,
      },
    };
  }

  private async createReportFile(
    report: GeneratedReport,
    data: { rows: Record<string, unknown>[]; summary: Record<string, unknown> },
    format: ReportFormat,
  ): Promise<{ filePath: string; fileSize: number; checksum: string }> {
    const filePath = `/reports/${report.organizationId}/${report.id}.${format}`;
    const jsonData = JSON.stringify(data);
    const fileSize = Buffer.byteLength(jsonData, "utf-8");

    const crypto = await import("crypto");
    const checksum = crypto.createHash("sha256").update(jsonData).digest("hex");

    this.logger.log(
      `Report file: ${filePath}, size: ${fileSize}, format: ${format}`,
    );

    return { filePath, fileSize, checksum };
  }

  private async deliverReport(
    report: GeneratedReport,
    delivery: { method: string; emails?: string[]; storagePath?: string },
  ): Promise<void> {
    this.logger.log(`Delivering report ${report.id} via ${delivery.method}`);

    switch (delivery.method) {
      case "email":
        this.logger.log(`Email delivery to: ${delivery.emails?.join(", ")}`);
        break;
      case "storage":
        this.logger.log(
          `Report stored at: ${delivery.storagePath || report.files?.[0]?.url || "N/A"}`,
        );
        break;
      case "download":
      default:
        break;
    }
  }

  // ── Generated Reports ────────────────────────────────────

  async getGeneratedReports(
    organizationId: string,
    options?: {
      type?: ReportType;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    data: GeneratedReport[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);

    const qb = this.generatedRepo.createQueryBuilder("r");
    qb.where("r.organizationId = :organizationId", { organizationId });
    qb.andWhere("r.status = :status", { status: ReportStatus.COMPLETED });

    if (options?.type) {
      qb.andWhere("r.type = :type", { type: options.type });
    }

    if (options?.dateFrom) {
      qb.andWhere("r.createdAt >= :dateFrom", { dateFrom: options.dateFrom });
    }

    if (options?.dateTo) {
      qb.andWhere("r.createdAt <= :dateTo", { dateTo: options.dateTo });
    }

    const total = await qb.getCount();

    qb.select([
      "r.id",
      "r.organizationId",
      "r.definitionId",
      "r.name",
      "r.type",
      "r.status",
      "r.generationTimeMs",
      "r.rowCount",
      "r.reportNumber",
      "r.createdAt",
      "r.completedAt",
      "r.expiresAt",
    ]);

    qb.orderBy("r.createdAt", "DESC");
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const data = await qb.getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getGeneratedReport(
    id: string,
    organizationId: string,
  ): Promise<GeneratedReport> {
    const report = await this.generatedRepo.findOne({
      where: { id, organizationId },
    });
    if (!report) {
      throw new NotFoundException(`Отчёт ${id} не найден`);
    }
    return report;
  }

  async deleteExpiredReports(): Promise<number> {
    const result = await this.generatedRepo.softDelete({
      expiresAt: LessThan(new Date()),
    });
    return result.affected || 0;
  }

  // ── Helpers ──────────────────────────────────────────────

  getMimeType(format: ReportFormat): string {
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      excel:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv",
      json: "application/json",
      html: "text/html",
    };
    return mimeTypes[format] || "application/octet-stream";
  }
}
