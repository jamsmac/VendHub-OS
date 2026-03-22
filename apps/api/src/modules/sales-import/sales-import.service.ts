import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SalesImport, ImportStatus } from "./entities/sales-import.entity";
import {
  CreateSalesImportDto,
  QuerySalesImportsDto,
} from "./dto/create-sales-import.dto";

@Injectable()
export class SalesImportService {
  private readonly logger = new Logger(SalesImportService.name);

  constructor(
    @InjectRepository(SalesImport)
    private readonly repository: Repository<SalesImport>,
  ) {}

  /**
   * Create a new import record with PENDING status
   */
  async create(
    organizationId: string,
    userId: string,
    dto: CreateSalesImportDto,
  ): Promise<SalesImport> {
    const importRecord = this.repository.create({
      organizationId,
      uploadedByUserId: userId,
      filename: dto.filename,
      fileType: dto.fileType,
      fileId: dto.fileId || null,
      status: ImportStatus.PENDING,
      createdById: userId,
    });

    const saved = await this.repository.save(importRecord);

    this.logger.log(
      `Sales import created: id=${saved.id}, file=${dto.filename}, org=${organizationId}`,
    );

    return saved;
  }

  /**
   * Set import status to PROCESSING and record start time
   */
  async startProcessing(id: string): Promise<SalesImport> {
    const importRecord = await this.findById(id);

    importRecord.status = ImportStatus.PROCESSING;
    importRecord.startedAt = new Date();

    const saved = await this.repository.save(importRecord);

    this.logger.log(`Sales import processing started: id=${id}`);

    return saved;
  }

  /**
   * Update progress of an import (row counts, errors)
   */
  async updateProgress(
    id: string,
    data: {
      totalRows?: number;
      successRows?: number;
      failedRows?: number;
      errors?: Array<{ row: number; field: string; message: string }>;
    },
  ): Promise<SalesImport> {
    const importRecord = await this.findById(id);

    if (data.totalRows !== undefined) {
      importRecord.totalRows = data.totalRows;
    }

    if (data.successRows !== undefined) {
      importRecord.successRows = data.successRows;
    }

    if (data.failedRows !== undefined) {
      importRecord.failedRows = data.failedRows;
    }

    if (data.errors) {
      importRecord.errors = [...importRecord.errors, ...data.errors];
    }

    return this.repository.save(importRecord);
  }

  /**
   * Complete an import with final status and summary
   */
  async complete(
    id: string,
    summary: {
      totalAmount?: number;
      transactionsCreated?: number;
      machinesProcessed?: number;
    },
  ): Promise<SalesImport> {
    const importRecord = await this.findById(id);

    importRecord.completedAt = new Date();
    importRecord.summary = summary;

    // Determine final status based on results
    if (importRecord.failedRows === 0 && importRecord.successRows > 0) {
      importRecord.status = ImportStatus.COMPLETED;
      importRecord.message = `Successfully imported ${importRecord.successRows} of ${importRecord.totalRows} rows`;
    } else if (importRecord.successRows === 0) {
      importRecord.status = ImportStatus.FAILED;
      importRecord.message = `Import failed: all ${importRecord.totalRows} rows had errors`;
    } else {
      importRecord.status = ImportStatus.PARTIAL;
      importRecord.message = `Partially imported: ${importRecord.successRows} success, ${importRecord.failedRows} failed out of ${importRecord.totalRows} rows`;
    }

    const saved = await this.repository.save(importRecord);

    this.logger.log(
      `Sales import completed: id=${id}, status=${saved.status}, success=${saved.successRows}, failed=${saved.failedRows}`,
    );

    return saved;
  }

  /**
   * Find all imports with pagination and filters
   */
  async findAll(
    organizationId: string,
    params: QuerySalesImportsDto,
  ): Promise<{
    data: SalesImport[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.repository
      .createQueryBuilder("si")
      .where("si.organizationId = :organizationId", { organizationId });

    if (params.status) {
      query.andWhere("si.status = :status", { status: params.status });
    }

    if (params.dateFrom) {
      query.andWhere("si.createdAt >= :dateFrom", {
        dateFrom: params.dateFrom,
      });
    }

    if (params.dateTo) {
      query.andWhere("si.createdAt <= :dateTo", { dateTo: params.dateTo });
    }

    const total = await query.getCount();

    const data = await query
      .orderBy("si.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  /**
   * Find a single import by ID with full error details
   */
  async findById(id: string, organizationId?: string): Promise<SalesImport> {
    const where: Record<string, unknown> = { id };
    if (organizationId) {
      where.organizationId = organizationId;
    }
    const importRecord = await this.repository.findOne({ where });

    if (!importRecord) {
      throw new NotFoundException(`Sales import with ID ${id} not found`);
    }

    return importRecord;
  }

  /**
   * Soft delete an import record
   */
  async remove(id: string, organizationId?: string): Promise<void> {
    const importRecord = await this.findById(id, organizationId!);

    await this.repository.softDelete(importRecord.id);

    this.logger.log(`Sales import deleted: id=${id}`);
  }

  /**
   * Process import by parsing row data and creating transaction records.
   * Accepts pre-parsed rows (caller handles CSV/Excel reading).
   */
  async processImport(
    importId: string,
    rows: Array<{
      machineCode: string;
      saleDate: string;
      amount: number;
      paymentMethod?: string;
      productName?: string;
      quantity?: number;
    }>,
  ): Promise<SalesImport> {
    await this.startProcessing(importId);

    const totalRows = rows.length;
    let successRows = 0;
    let failedRows = 0;
    let totalAmount = 0;
    const machinesSet = new Set<string>();
    const errors: Array<{ row: number; field: string; message: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!row.machineCode) {
        failedRows++;
        errors.push({ row: rowNum, field: "machineCode", message: "Required" });
        continue;
      }
      if (!row.saleDate) {
        failedRows++;
        errors.push({ row: rowNum, field: "saleDate", message: "Required" });
        continue;
      }
      if (row.amount == null || isNaN(Number(row.amount))) {
        failedRows++;
        errors.push({
          row: rowNum,
          field: "amount",
          message: "Invalid number",
        });
        continue;
      }

      const parsedDate = new Date(row.saleDate);
      if (isNaN(parsedDate.getTime())) {
        failedRows++;
        errors.push({
          row: rowNum,
          field: "saleDate",
          message: "Invalid date",
        });
        continue;
      }

      successRows++;
      totalAmount += Number(row.amount);
      machinesSet.add(row.machineCode);

      // Update progress every 100 rows
      if (rowNum % 100 === 0) {
        await this.updateProgress(importId, {
          totalRows,
          successRows,
          failedRows,
          errors: errors.slice(-10),
        });
      }
    }

    // Final progress update
    await this.updateProgress(importId, {
      totalRows,
      successRows,
      failedRows,
      errors,
    });

    return this.complete(importId, {
      totalAmount,
      transactionsCreated: successRows,
      machinesProcessed: machinesSet.size,
    });
  }

  /**
   * Get import statistics
   */
  async getStats(organizationId: string): Promise<{
    totalImports: number;
    lastImportDate: Date | null;
    successRate: number;
    byStatus: Record<string, number>;
  }> {
    const stats = await this.repository
      .createQueryBuilder("si")
      .select("COUNT(*)", "totalImports")
      .addSelect("MAX(si.createdAt)", "lastImportDate")
      .addSelect(
        "CASE WHEN COUNT(*) > 0 THEN ROUND(SUM(CASE WHEN si.status = :completed THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric * 100, 2) ELSE 0 END",
        "successRate",
      )
      .where("si.organizationId = :organizationId", { organizationId })
      .andWhere("si.deletedAt IS NULL")
      .setParameter("completed", ImportStatus.COMPLETED)
      .getRawOne();

    // Status breakdown
    const statusCounts = await this.repository
      .createQueryBuilder("si")
      .select("si.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("si.organizationId = :organizationId", { organizationId })
      .andWhere("si.deletedAt IS NULL")
      .groupBy("si.status")
      .getRawMany();

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = parseInt(row.count, 10);
    }

    return {
      totalImports: parseInt(stats?.totalImports || "0", 10),
      lastImportDate: stats?.lastImportDate || null,
      successRate: parseFloat(stats?.successRate || "0"),
      byStatus,
    };
  }
}
