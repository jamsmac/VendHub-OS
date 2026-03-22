/**
 * Import Service (Orchestrator)
 * Thin facade that delegates to sub-services.
 * Maintains the exact same public API for the controller.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";

import {
  ImportJob,
  ImportTemplate,
  ImportType,
  ImportStatus,
  ImportSource,
} from "./entities/import.entity";
import { ImportSession, DomainType } from "./entities/import-session.entity";
import { ImportAuditLog } from "./entities/import-audit-log.entity";
import { SchemaDefinition } from "./entities/schema-definition.entity";
import { ValidationRule } from "./entities/validation-rule.entity";
import {
  CreateImportSessionDto,
  ClassifySessionDto,
  ApproveSessionDto,
  RejectSessionDto,
  QueryImportSessionsDto,
  QueryAuditLogDto,
} from "./dto/import-session.dto";

import { ImportParserService } from "./services/import-parser.service";
import { ImportValidatorService } from "./services/import-validator.service";
import { ImportTemplateService } from "./services/import-template.service";
import { ImportSessionService } from "./services/import-session.service";

export interface ImportOptions {
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  dryRun?: boolean;
  mapping?: Record<string, string>;
  dateFormat?: string;
  encoding?: string;
  delimiter?: string;
  templateId?: string;
}

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, unknown>;
  errors: { field: string; message: string }[];
  warnings: { field: string; message: string }[];
}

export interface ImportResult {
  jobId: string;
  status: ImportStatus;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  errors: { row: number; field?: string; message: string }[];
  summary: {
    created: number;
    updated: number;
    deleted: number;
    unchanged: number;
  };
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectRepository(ImportJob)
    private readonly importJobRepository: Repository<ImportJob>,
    private readonly eventEmitter: EventEmitter2,
    private readonly parserService: ImportParserService,
    private readonly validatorService: ImportValidatorService,
    private readonly templateService: ImportTemplateService,
    private readonly sessionService: ImportSessionService,
  ) {}

  // ========================================================================
  // IMPORT JOB MANAGEMENT
  // ========================================================================

  /**
   * Create import job
   */
  async createImportJob(
    organizationId: string,
    userId: string,
    importType: ImportType,
    source: ImportSource,
    fileName?: string,
    fileUrl?: string,
    options?: ImportOptions,
  ): Promise<ImportJob> {
    const job = this.importJobRepository.create({
      organizationId,
      importType,
      source,
      fileName,
      fileUrl,
      options,
      createdByUserId: userId,
      status: ImportStatus.PENDING,
    });

    const saved = await this.importJobRepository.save(job);

    this.eventEmitter.emit("import.created", { job: saved });
    this.logger.log(`Import job created: ${saved.jobNumber}`);

    return saved;
  }

  /**
   * Get import job by ID
   */
  async getImportJob(organizationId: string, id: string): Promise<ImportJob> {
    const job = await this.importJobRepository.findOne({
      where: { id, organizationId },
    });

    if (!job) {
      throw new NotFoundException(`Import job ${id} not found`);
    }

    return job;
  }

  /**
   * List import jobs
   */
  async listImportJobs(
    organizationId: string,
    filters: {
      importType?: ImportType;
      status?: ImportStatus;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: ImportJob[]; total: number }> {
    const qb = this.importJobRepository
      .createQueryBuilder("ij")
      .where("ij.organizationId = :organizationId", { organizationId });

    if (filters.importType) {
      qb.andWhere("ij.importType = :importType", {
        importType: filters.importType,
      });
    }
    if (filters.status) {
      qb.andWhere("ij.status = :status", { status: filters.status });
    }
    if (filters.startDate && filters.endDate) {
      qb.andWhere("ij.createdAt BETWEEN :startDate AND :endDate", {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const [data, total] = await qb
      .orderBy("ij.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Cancel import job
   */
  async cancelImportJob(
    organizationId: string,
    id: string,
    userId: string,
  ): Promise<ImportJob> {
    const job = await this.getImportJob(organizationId, id);

    if (
      ![
        ImportStatus.PENDING,
        ImportStatus.VALIDATING,
        ImportStatus.PROCESSING,
      ].includes(job.status)
    ) {
      throw new BadRequestException("Cannot cancel job in current status");
    }

    job.status = ImportStatus.CANCELLED;
    job.cancelledByUserId = userId;

    const saved = await this.importJobRepository.save(job);

    this.eventEmitter.emit("import.cancelled", { job: saved, userId });
    return saved;
  }

  // ========================================================================
  // FILE PARSING (delegates to ImportParserService)
  // ========================================================================

  async parseCSV(
    buffer: Buffer,
    options?: { delimiter?: string; encoding?: string; headerRow?: number },
  ): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
    return this.parserService.parseCSV(buffer, options);
  }

  async parseExcel(
    buffer: Buffer,
    options?: { sheetName?: string; headerRow?: number; startRow?: number },
  ): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
    return this.parserService.parseExcel(buffer, options);
  }

  async parseJSON(
    buffer: Buffer,
  ): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
    return this.parserService.parseJSON(buffer);
  }

  // ========================================================================
  // VALIDATION (delegates to ImportValidatorService)
  // ========================================================================

  async validateImportData(
    organizationId: string,
    jobId: string,
    rows: Record<string, unknown>[],
    importType: ImportType,
    mapping?: Record<string, string>,
  ): Promise<{
    validRows: ParsedRow[];
    invalidRows: ParsedRow[];
    warnings: Array<{ row: number; field: string; message: string }>;
  }> {
    const job = await this.getImportJob(organizationId, jobId);

    job.status = ImportStatus.VALIDATING;
    job.totalRows = rows.length;
    await this.importJobRepository.save(job);

    const validRows: ParsedRow[] = [];
    const invalidRows: ParsedRow[] = [];
    const warnings: Array<{ row: number; field: string; message: string }> = [];

    const validator = this.validatorService.getValidator(importType);

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1;
      const currentRow = rows[i]!;
      const mappedData = mapping
        ? this.validatorService.applyMapping(currentRow, mapping)
        : currentRow;

      const result = await validator(mappedData, organizationId, rowNumber);

      if (result.errors.length > 0) {
        invalidRows.push({
          rowNumber,
          data: mappedData,
          errors: result.errors,
          warnings: result.warnings,
        });
      } else {
        validRows.push({
          rowNumber,
          data: mappedData,
          errors: [],
          warnings: result.warnings,
        });
      }

      if (result.warnings.length > 0) {
        warnings.push(
          ...result.warnings.map((w) => ({ row: rowNumber, ...w })),
        );
      }
    }

    // Update job with validation results
    job.validationWarnings = warnings;
    if (invalidRows.length === rows.length) {
      job.status = ImportStatus.VALIDATION_FAILED;
      job.errorDetails = invalidRows.flatMap((r) =>
        r.errors.map((e) => ({
          row: r.rowNumber,
          field: e.field,
          message: e.message,
        })),
      );
    }
    await this.importJobRepository.save(job);

    return { validRows, invalidRows, warnings };
  }

  // ========================================================================
  // TEMPLATES (delegates to ImportTemplateService)
  // ========================================================================

  async createTemplate(
    organizationId: string,
    userId: string,
    data: Partial<ImportTemplate>,
  ): Promise<ImportTemplate> {
    return this.templateService.createTemplate(organizationId, userId, data);
  }

  async getTemplates(
    organizationId: string,
    importType?: ImportType,
  ): Promise<ImportTemplate[]> {
    return this.templateService.getTemplates(organizationId, importType);
  }

  async getTemplate(
    organizationId: string,
    id: string,
  ): Promise<ImportTemplate> {
    return this.templateService.getTemplate(organizationId, id);
  }

  async deleteTemplate(organizationId: string, id: string): Promise<void> {
    return this.templateService.deleteTemplate(organizationId, id);
  }

  // ========================================================================
  // SESSIONS (delegates to ImportSessionService)
  // ========================================================================

  async createSession(
    file: Express.Multer.File,
    dto: CreateImportSessionDto,
    organizationId: string,
    userId: string,
  ): Promise<ImportSession> {
    return this.sessionService.createSession(file, dto, organizationId, userId);
  }

  async classifySession(
    sessionId: string,
    dto: ClassifySessionDto | undefined,
    organizationId: string,
  ): Promise<ImportSession> {
    return this.sessionService.classifySession(sessionId, dto, organizationId);
  }

  async validateSession(
    sessionId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    return this.sessionService.validateSession(sessionId, organizationId);
  }

  async submitForApproval(
    sessionId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    return this.sessionService.submitForApproval(sessionId, organizationId);
  }

  async approveSession(
    sessionId: string,
    dto: ApproveSessionDto,
    userId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    return this.sessionService.approveSession(
      sessionId,
      dto,
      userId,
      organizationId,
    );
  }

  async rejectSession(
    sessionId: string,
    dto: RejectSessionDto,
    userId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    return this.sessionService.rejectSession(
      sessionId,
      dto,
      userId,
      organizationId,
    );
  }

  async executeImportSession(
    sessionId: string,
    organizationId: string,
    userId: string,
  ): Promise<ImportSession> {
    return this.sessionService.executeImportSession(
      sessionId,
      organizationId,
      userId,
    );
  }

  async getSessions(
    query: QueryImportSessionsDto,
    organizationId: string,
  ): Promise<{
    data: ImportSession[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.sessionService.getSessions(query, organizationId);
  }

  async getSession(
    sessionId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    return this.sessionService.getSession(sessionId, organizationId);
  }

  async getAuditLog(
    sessionId: string,
    query: QueryAuditLogDto,
    organizationId: string,
  ): Promise<{
    data: ImportAuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.sessionService.getAuditLog(sessionId, query, organizationId);
  }

  async getSchemaDefinitions(domain?: DomainType): Promise<SchemaDefinition[]> {
    return this.sessionService.getSchemaDefinitions(domain);
  }

  async getValidationRules(domain?: DomainType): Promise<ValidationRule[]> {
    return this.validatorService.getValidationRules(domain);
  }
}
