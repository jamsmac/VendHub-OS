/**
 * Import Session Service
 * Session workflow: create, classify, validate, approve/reject, execute
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";

import {
  ImportSession,
  ImportSessionStatus,
  DomainType,
  ApprovalStatus,
} from "../entities/import-session.entity";
import {
  ImportAuditLog,
  AuditActionType,
} from "../entities/import-audit-log.entity";
import {
  SchemaDefinition,
  FieldDefinition,
} from "../entities/schema-definition.entity";
import { ValidationSeverity } from "../entities/validation-rule.entity";
import {
  CreateImportSessionDto,
  ClassifySessionDto,
  ApproveSessionDto,
  RejectSessionDto,
  QueryImportSessionsDto,
  QueryAuditLogDto,
} from "../dto/import-session.dto";
import { ImportParserService } from "./import-parser.service";
import { ImportValidatorService } from "./import-validator.service";

@Injectable()
export class ImportSessionService {
  private readonly logger = new Logger(ImportSessionService.name);

  constructor(
    @InjectRepository(ImportSession)
    private readonly sessionRepo: Repository<ImportSession>,
    @InjectRepository(ImportAuditLog)
    private readonly auditLogRepo: Repository<ImportAuditLog>,
    @InjectRepository(SchemaDefinition)
    private readonly schemaDefRepo: Repository<SchemaDefinition>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly parserService: ImportParserService,
    private readonly validatorService: ImportValidatorService,
  ) {}

  // ========================================================================
  // SESSION CREATION
  // ========================================================================

  /**
   * Create an import session from an uploaded file.
   * Parses file headers, detects file type, and optionally auto-classifies domain.
   */
  async createSession(
    file: Express.Multer.File,
    dto: CreateImportSessionDto,
    organizationId: string,
    userId: string,
  ): Promise<ImportSession> {
    // Determine file type from extension
    const extension = file.originalname.split(".").pop()?.toLowerCase();
    let fileType: string;

    switch (extension) {
      case "csv":
        fileType = "csv";
        break;
      case "xlsx":
      case "xls":
        fileType = "xlsx";
        break;
      case "json":
        fileType = "json";
        break;
      default:
        throw new BadRequestException(`Unsupported file format: ${extension}`);
    }

    // Parse file to extract headers and sample data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: { headers: string[]; rows: Record<string, any>[] };

    if (fileType === "csv") {
      parsed = await this.parserService.parseCSV(file.buffer);
    } else if (fileType === "xlsx") {
      parsed = await this.parserService.parseExcel(file.buffer);
    } else {
      parsed = await this.parserService.parseJSON(file.buffer);
    }

    const fileMetadata = {
      rows: parsed.rows.length,
      columns: parsed.headers.length,
      headers: parsed.headers,
      sampleData: parsed.rows.slice(0, 5),
    };

    // Determine domain: use provided or attempt auto-detection
    let domain = dto.domain;
    if (!domain) {
      domain = await this.autoDetectDomain(parsed.headers);
    }

    if (!domain) {
      throw new BadRequestException(
        "Could not auto-detect import domain. Please specify the domain manually.",
      );
    }

    const session = this.sessionRepo.create({
      organizationId,
      domain,
      status: ImportSessionStatus.UPLOADED,
      templateId: dto.templateId || null,
      fileName: file.originalname,
      fileSize: file.size,
      fileType,
      fileUrl: null,
      fileMetadata,
      classificationResult: null,
      classificationConfidence: null,
      columnMapping: null,
      unmappedColumns: null,
      validationReport: null,
      actionPlan: null,
      approvalStatus: ApprovalStatus.PENDING,
      approvedByUserId: null,
      approvedAt: null,
      rejectionReason: null,
      executionResult: null,
      uploadedByUserId: userId,
      importJobId: null,
      startedAt: new Date(),
      completedAt: null,
      message: "File uploaded successfully. Ready for classification.",
    });

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit("import.session.created", { session: saved });
    this.logger.log(`Import session created: ${saved.id} for domain ${domain}`);

    return saved;
  }

  // ========================================================================
  // AUTO-DETECTION
  // ========================================================================

  /**
   * Auto-detect domain from file headers by matching against all schema definitions.
   */
  private async autoDetectDomain(
    headers: string[],
  ): Promise<DomainType | undefined> {
    const schemas = await this.schemaDefRepo.find({
      where: { isActive: true },
    });

    if (schemas.length === 0) {
      return undefined;
    }

    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());
    let bestDomain: DomainType | undefined;
    let bestScore = 0;

    for (const schema of schemas) {
      let matchCount = 0;
      const fieldDefs = schema.fieldDefinitions || [];

      for (const fieldDef of fieldDefs) {
        const allNames = [
          fieldDef.name.toLowerCase(),
          fieldDef.display_name.toLowerCase(),
          ...fieldDef.synonyms.map((s) => s.toLowerCase()),
        ];

        const matched = normalizedHeaders.some((h) => allNames.includes(h));
        if (matched) {
          matchCount++;
        }
      }

      const requiredCount = schema.requiredFields.length || 1;
      const score = (matchCount / requiredCount) * 100;

      if (score > bestScore) {
        bestScore = score;
        bestDomain = schema.domain;
      }
    }

    // Only return if we have a reasonable match (> 30%)
    return bestScore > 30 ? bestDomain : undefined;
  }

  // ========================================================================
  // CLASSIFICATION
  // ========================================================================

  /**
   * Classify session: match columns to SchemaDefinition using synonyms.
   * Calculate confidence score and save classificationResult and columnMapping.
   */
  async classifySession(
    sessionId: string,
    dto: ClassifySessionDto | undefined,
    organizationId: string,
  ): Promise<ImportSession> {
    const session = await this.getSession(sessionId, organizationId);

    if (
      session.status !== ImportSessionStatus.UPLOADED &&
      session.status !== ImportSessionStatus.CLASSIFIED
    ) {
      throw new BadRequestException(
        `Cannot classify session in status: ${session.status}. Session must be in UPLOADED or CLASSIFIED status.`,
      );
    }

    session.status = ImportSessionStatus.CLASSIFYING;
    await this.sessionRepo.save(session);

    // Use override domain if provided, otherwise use session domain
    const domain = dto?.overrideDomain || session.domain;
    if (dto?.overrideDomain) {
      session.domain = dto.overrideDomain;
    }

    // If manual column mapping is provided, use it directly
    if (dto?.columnMapping && Object.keys(dto.columnMapping).length > 0) {
      session.columnMapping = dto.columnMapping;
      session.classificationConfidence = 100;
      session.unmappedColumns = this.findUnmappedColumns(
        session.fileMetadata?.headers || [],
        dto.columnMapping,
      );
      session.classificationResult = {
        detected_domain: domain,
        confidence: 100,
        column_mapping: dto.columnMapping,
        unmapped_columns: session.unmappedColumns,
        method: "manual",
      };
      session.status = ImportSessionStatus.CLASSIFIED;
      session.message = "Classification completed with manual mapping.";

      return this.sessionRepo.save(session);
    }

    // Auto-classify using SchemaDefinition
    const schemaDef = await this.schemaDefRepo.findOne({
      where: { domain, isActive: true },
    });

    if (!schemaDef) {
      session.status = ImportSessionStatus.UPLOADED;
      session.message = `No schema definition found for domain: ${domain}. Please provide manual column mapping.`;
      return this.sessionRepo.save(session);
    }

    const headers: string[] = session.fileMetadata?.headers || [];
    const { mapping, unmappedColumns, confidence } = this.matchColumns(
      headers,
      schemaDef.fieldDefinitions,
      schemaDef.requiredFields,
    );

    session.columnMapping = mapping;
    session.unmappedColumns = unmappedColumns;
    session.classificationConfidence = confidence;
    session.classificationResult = {
      detected_domain: domain,
      confidence,
      column_mapping: mapping,
      unmapped_columns: unmappedColumns,
      method: "auto",
      schema_version: schemaDef.version,
    };
    session.status = ImportSessionStatus.CLASSIFIED;
    session.message = `Classification completed. Confidence: ${confidence.toFixed(1)}%. Mapped ${Object.keys(mapping).length} columns.`;

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit("import.session.classified", { session: saved });
    this.logger.log(
      `Session ${sessionId} classified with confidence ${confidence}%`,
    );

    return saved;
  }

  /**
   * Match source column headers to schema field definitions using synonyms.
   *
   * Algorithm:
   * 1. For each source column header, check against fieldDefinitions synonyms
   * 2. Match is case-insensitive, trimmed, normalized
   * 3. Calculate confidence = matched_required_columns / total_required_columns * 100
   * 4. Return mapping and unmapped columns
   */
  private matchColumns(
    headers: string[],
    fieldDefinitions: FieldDefinition[],
    requiredFields: string[],
  ): {
    mapping: Record<string, string>;
    unmappedColumns: string[];
    confidence: number;
  } {
    const mapping: Record<string, string> = {};
    const matchedHeaders = new Set<string>();

    const normalizedHeaders = headers.map((h) =>
      h
        .toLowerCase()
        .trim()
        .replace(/[\s_-]+/g, "_"),
    );

    for (const fieldDef of fieldDefinitions) {
      // Build list of all possible names for this field (including synonyms)
      const allNames = [
        fieldDef.name.toLowerCase().replace(/[\s_-]+/g, "_"),
        fieldDef.display_name.toLowerCase().replace(/[\s_-]+/g, "_"),
        ...fieldDef.synonyms.map((s) =>
          s.toLowerCase().replace(/[\s_-]+/g, "_"),
        ),
      ];

      // Find the first matching header
      for (let i = 0; i < normalizedHeaders.length; i++) {
        if (
          allNames.includes(normalizedHeaders[i]) &&
          !matchedHeaders.has(headers[i])
        ) {
          mapping[headers[i]] = fieldDef.name;
          matchedHeaders.add(headers[i]);
          break;
        }
      }
    }

    // Find unmapped columns
    const unmappedColumns = headers.filter((h) => !matchedHeaders.has(h));

    // Calculate confidence based on required fields matched
    const totalRequired = requiredFields.length || 1;
    const mappedTargetFields = new Set(Object.values(mapping));
    const matchedRequired = requiredFields.filter((rf) =>
      mappedTargetFields.has(rf),
    ).length;
    const confidence = Math.min((matchedRequired / totalRequired) * 100, 100);

    return { mapping, unmappedColumns, confidence };
  }

  /**
   * Find columns that were not included in a mapping.
   */
  private findUnmappedColumns(
    headers: string[],
    mapping: Record<string, string>,
  ): string[] {
    const mappedSources = new Set(Object.keys(mapping));
    return headers.filter((h) => !mappedSources.has(h));
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  /**
   * Validate session: run ValidationRules against data.
   * Generate validationReport with errors/warnings per row.
   */
  async validateSession(
    sessionId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    const session = await this.getSession(sessionId, organizationId);

    if (
      session.status !== ImportSessionStatus.CLASSIFIED &&
      session.status !== ImportSessionStatus.MAPPED
    ) {
      throw new BadRequestException(
        `Cannot validate session in status: ${session.status}. Session must be in CLASSIFIED or MAPPED status.`,
      );
    }

    session.status = ImportSessionStatus.VALIDATING;
    session.message = "Validation in progress...";
    await this.sessionRepo.save(session);

    // Get validation rules for this domain, sorted by priority
    const rules = await this.validatorService.getValidationRulesForDomain(
      session.domain,
    );

    // Get the data rows from fileMetadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRows: Record<string, any>[] =
      session.fileMetadata?.sampleData || [];
    const columnMapping = session.columnMapping || {};
    const totalRows = session.fileMetadata?.rows || allRows.length;

    let validRows = 0;
    let invalidRows = 0;
    const errors: {
      row: number;
      field: string;
      message: string;
      severity: string;
    }[] = [];
    const warnings: { row: number; field: string; message: string }[] = [];

    for (let i = 0; i < allRows.length; i++) {
      const rowNumber = i + 1;
      const row = allRows[i];

      // Map source columns to target fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedRow: Record<string, any> = {};
      for (const [sourceCol, targetField] of Object.entries(columnMapping)) {
        if (row[sourceCol] !== undefined) {
          mappedRow[targetField] = row[sourceCol];
        }
      }

      let rowHasError = false;

      // Apply each validation rule
      for (const rule of rules) {
        const fieldValue = mappedRow[rule.fieldName];
        const validationResult = this.validatorService.applyValidationRule(
          rule,
          fieldValue,
          mappedRow,
          rowNumber,
        );

        if (!validationResult.valid) {
          if (rule.severity === ValidationSeverity.ERROR) {
            rowHasError = true;
            errors.push({
              row: rowNumber,
              field: rule.fieldName,
              message: validationResult.message,
              severity: "error",
            });
          } else if (rule.severity === ValidationSeverity.WARNING) {
            warnings.push({
              row: rowNumber,
              field: rule.fieldName,
              message: validationResult.message,
            });
          }
        }
      }

      if (rowHasError) {
        invalidRows++;
      } else {
        validRows++;
      }
    }

    const validationReport = {
      total_rows: totalRows,
      validated_rows: allRows.length,
      valid_rows: validRows,
      invalid_rows: invalidRows,
      warnings: warnings,
      errors: errors,
      rules_applied: rules.length,
    };

    session.validationReport = validationReport;

    // Generate action plan
    session.actionPlan = {
      inserts: validRows,
      updates: 0,
      skips: invalidRows,
      merges: 0,
      estimated_changes: validRows,
    };

    if (invalidRows > 0 && validRows === 0) {
      session.status = ImportSessionStatus.VALIDATION_FAILED;
      session.message = `Validation failed. ${invalidRows} rows have errors.`;
    } else {
      session.status = ImportSessionStatus.VALIDATED;
      session.message = `Validation completed. ${validRows} valid, ${invalidRows} invalid out of ${allRows.length} rows.`;
    }

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit("import.session.validated", { session: saved });
    this.logger.log(
      `Session ${sessionId} validated: ${validRows} valid, ${invalidRows} invalid`,
    );

    return saved;
  }

  // ========================================================================
  // APPROVAL WORKFLOW
  // ========================================================================

  /**
   * Submit session for approval.
   * Auto-approve if confidence >= 95% and zero validation errors.
   */
  async submitForApproval(
    sessionId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    const session = await this.getSession(sessionId, organizationId);

    if (session.status !== ImportSessionStatus.VALIDATED) {
      throw new BadRequestException(
        `Cannot submit for approval in status: ${session.status}. Session must be in VALIDATED status.`,
      );
    }

    const hasErrors = (session.validationReport?.errors?.length || 0) > 0;
    const confidence = session.classificationConfidence || 0;

    // Auto-approve if confidence >= 95% and no errors
    if (confidence >= 95 && !hasErrors) {
      session.approvalStatus = ApprovalStatus.AUTO_APPROVED;
      session.approvedAt = new Date();
      session.status = ImportSessionStatus.APPROVED;
      session.message = `Auto-approved: confidence ${confidence.toFixed(1)}%, no validation errors.`;

      this.eventEmitter.emit("import.session.auto_approved", { session });
      this.logger.log(
        `Session ${sessionId} auto-approved with confidence ${confidence}%`,
      );
    } else {
      session.status = ImportSessionStatus.AWAITING_APPROVAL;
      session.message = `Awaiting manual approval. Confidence: ${confidence.toFixed(1)}%, errors: ${session.validationReport?.errors?.length || 0}.`;

      this.eventEmitter.emit("import.session.awaiting_approval", { session });
      this.logger.log(`Session ${sessionId} submitted for approval`);
    }

    return this.sessionRepo.save(session);
  }

  /**
   * Approve session. Optionally auto-execute after approval.
   */
  async approveSession(
    sessionId: string,
    dto: ApproveSessionDto,
    userId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    const session = await this.getSession(sessionId, organizationId);

    if (session.status !== ImportSessionStatus.AWAITING_APPROVAL) {
      throw new BadRequestException(
        `Cannot approve session in status: ${session.status}. Session must be in AWAITING_APPROVAL status.`,
      );
    }

    session.approvalStatus = ApprovalStatus.APPROVED;
    session.approvedByUserId = userId;
    session.approvedAt = new Date();
    session.status = ImportSessionStatus.APPROVED;
    session.message = "Session approved.";

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit("import.session.approved", {
      session: saved,
      userId,
    });
    this.logger.log(`Session ${sessionId} approved by user ${userId}`);

    // Auto-execute if requested
    if (dto.autoExecute !== false) {
      return this.executeImportSession(sessionId, organizationId, userId);
    }

    return saved;
  }

  /**
   * Reject session with a reason.
   */
  async rejectSession(
    sessionId: string,
    dto: RejectSessionDto,
    userId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    const session = await this.getSession(sessionId, organizationId);

    if (session.status !== ImportSessionStatus.AWAITING_APPROVAL) {
      throw new BadRequestException(
        `Cannot reject session in status: ${session.status}. Session must be in AWAITING_APPROVAL status.`,
      );
    }

    session.approvalStatus = ApprovalStatus.REJECTED;
    session.approvedByUserId = userId;
    session.approvedAt = new Date();
    session.rejectionReason = dto.reason;
    session.status = ImportSessionStatus.REJECTED;
    session.message = `Session rejected: ${dto.reason}`;

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit("import.session.rejected", {
      session: saved,
      userId,
      reason: dto.reason,
    });
    this.logger.log(
      `Session ${sessionId} rejected by user ${userId}: ${dto.reason}`,
    );

    return saved;
  }

  // ========================================================================
  // EXECUTION
  // ========================================================================

  /**
   * Execute import session: perform actual data INSERT/UPDATE operations.
   * Creates ImportAuditLog entries for every row operation.
   * Updates executionResult on the session.
   */
  async executeImportSession(
    sessionId: string,
    organizationId: string,
    userId: string,
  ): Promise<ImportSession> {
    const session = await this.getSession(sessionId, organizationId);

    if (
      session.status !== ImportSessionStatus.APPROVED &&
      session.approvalStatus !== ApprovalStatus.AUTO_APPROVED
    ) {
      throw new BadRequestException(
        `Cannot execute session in status: ${session.status}. Session must be APPROVED.`,
      );
    }

    session.status = ImportSessionStatus.EXECUTING;
    session.message = "Executing import...";
    await this.sessionRepo.save(session);

    const startTime = Date.now();
    const columnMapping = session.columnMapping || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allRows: Record<string, any>[] =
      session.fileMetadata?.sampleData || [];

    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Get schema for table name
    const schemaDef = await this.schemaDefRepo.findOne({
      where: { domain: session.domain, isActive: true },
    });
    const tableName = schemaDef?.tableName || session.domain;

    // SECURITY: Validate table name to prevent SQL injection.
    // Only allow lowercase alphanumeric characters and underscores.
    if (!/^[a-z_][a-z0-9_]{0,62}$/.test(tableName)) {
      throw new BadRequestException(
        `Invalid table name: "${tableName}". Only lowercase letters, digits, and underscores are allowed.`,
      );
    }

    // Use a transaction for data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (let i = 0; i < allRows.length; i++) {
        const rowNumber = i + 1;
        const row = allRows[i];

        // Map source columns to target fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedRow: Record<string, any> = {};
        for (const [sourceCol, targetField] of Object.entries(columnMapping)) {
          if (row[sourceCol] !== undefined) {
            mappedRow[targetField] = row[sourceCol];
          }
        }

        // Add organization_id to the mapped data (DB column name, not entity property)
        mappedRow["organization_id"] = organizationId;

        try {
          // Build insert query (simplified -- in production would use entity manager)
          const fields = Object.keys(mappedRow);

          // SECURITY: Validate column names to prevent SQL injection via column mapping.
          const validColumnPattern = /^[a-z_][a-z0-9_]{0,62}$/;
          for (const field of fields) {
            if (!validColumnPattern.test(field)) {
              throw new BadRequestException(
                `Invalid column name: "${field}". Only lowercase letters, digits, and underscores are allowed.`,
              );
            }
          }

          const values = Object.values(mappedRow);
          const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(", ");
          const columnNames = fields.map((f) => `"${f}"`).join(", ");

          const query = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) RETURNING id`;
          const result = await queryRunner.query(query, values);

          const newRecordId = result?.[0]?.id || null;

          // Create audit log for successful insert
          const auditLog = this.auditLogRepo.create({
            sessionId,
            organizationId,
            actionType: AuditActionType.INSERT,
            tableName,
            recordId: newRecordId,
            beforeState: null,
            afterState: mappedRow,
            fieldChanges: null,
            rowNumber,
            executedAt: new Date(),
            executedByUserId: userId,
            errorMessage: null,
            success: true,
          });
          await queryRunner.manager.save(ImportAuditLog, auditLog);

          successful++;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (rowError: any) {
          // Create audit log for failed row
          const auditLog = this.auditLogRepo.create({
            sessionId,
            organizationId,
            actionType: AuditActionType.INSERT,
            tableName,
            recordId: null,
            beforeState: null,
            afterState: mappedRow,
            fieldChanges: null,
            rowNumber,
            executedAt: new Date(),
            executedByUserId: userId,
            errorMessage: rowError.message,
            success: false,
          });
          await queryRunner.manager.save(ImportAuditLog, auditLog);

          failed++;
          this.logger.warn(`Row ${rowNumber} failed: ${rowError.message}`);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      session.status = ImportSessionStatus.FAILED;
      session.message = `Import execution failed: ${error instanceof Error ? error.message : String(error)}`;
      session.completedAt = new Date();

      const errMsg = error instanceof Error ? error.message : String(error);
      session.executionResult = {
        total: allRows.length,
        successful: 0,
        failed: allRows.length,
        skipped: 0,
        duration_ms: Date.now() - startTime,
        error: errMsg,
      };

      const savedFailed = await this.sessionRepo.save(session);
      this.eventEmitter.emit("import.session.failed", { session: savedFailed });
      this.logger.error(`Session ${sessionId} execution failed: ${errMsg}`);

      return savedFailed;
    } finally {
      await queryRunner.release();
    }

    const durationMs = Date.now() - startTime;

    session.executionResult = {
      total: allRows.length,
      successful,
      failed,
      skipped,
      duration_ms: durationMs,
    };

    session.completedAt = new Date();

    if (failed > 0 && successful > 0) {
      session.status = ImportSessionStatus.COMPLETED_WITH_ERRORS;
      session.message = `Import completed with errors. ${successful} successful, ${failed} failed, ${skipped} skipped. Duration: ${durationMs}ms.`;
    } else if (failed > 0 && successful === 0) {
      session.status = ImportSessionStatus.FAILED;
      session.message = `Import failed. All ${failed} rows failed. Duration: ${durationMs}ms.`;
    } else {
      session.status = ImportSessionStatus.COMPLETED;
      session.message = `Import completed successfully. ${successful} rows imported. Duration: ${durationMs}ms.`;
    }

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit("import.session.completed", { session: saved });
    this.logger.log(
      `Session ${sessionId} execution completed: ${successful} successful, ${failed} failed`,
    );

    return saved;
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Get paginated list of import sessions.
   */
  async getSessions(
    query: QueryImportSessionsDto,
    organizationId: string,
  ): Promise<{
    data: ImportSession[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.sessionRepo
      .createQueryBuilder("s")
      .where("s.organizationId = :organizationId", { organizationId });

    if (query.domain) {
      qb.andWhere("s.domain = :domain", { domain: query.domain });
    }
    if (query.status) {
      qb.andWhere("s.status = :status", { status: query.status });
    }
    if (query.approvalStatus) {
      qb.andWhere("s.approvalStatus = :approvalStatus", {
        approvalStatus: query.approvalStatus,
      });
    }
    if (query.dateFrom) {
      qb.andWhere("s.createdAt >= :dateFrom", { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere("s.createdAt <= :dateTo", { dateTo: query.dateTo });
    }

    const [data, total] = await qb
      .orderBy("s.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get a single session by ID with all details.
   */
  async getSession(
    sessionId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, organizationId },
    });

    if (!session) {
      throw new NotFoundException(`Import session ${sessionId} not found`);
    }

    return session;
  }

  /**
   * Get paginated audit log for a session.
   */
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
    // Verify session exists and belongs to organization
    await this.getSession(sessionId, organizationId);

    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.auditLogRepo
      .createQueryBuilder("al")
      .where("al.sessionId = :sessionId", { sessionId })
      .andWhere("al.organizationId = :organizationId", { organizationId });

    if (query.actionType) {
      qb.andWhere("al.actionType = :actionType", {
        actionType: query.actionType,
      });
    }
    if (query.tableName) {
      qb.andWhere("al.tableName = :tableName", { tableName: query.tableName });
    }

    const [data, total] = await qb
      .orderBy("al.executedAt", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  // ========================================================================
  // SCHEMA DEFINITIONS
  // ========================================================================

  /**
   * Get schema definitions, optionally filtered by domain.
   */
  async getSchemaDefinitions(domain?: DomainType): Promise<SchemaDefinition[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };
    if (domain) {
      where.domain = domain;
    }

    return this.schemaDefRepo.find({
      where,
      order: { domain: "ASC", tableName: "ASC" },
    });
  }
}
