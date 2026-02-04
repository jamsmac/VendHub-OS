/**
 * Import Service
 * Business logic for data imports
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';

import {
  ImportJob,
  ImportTemplate,
  ImportType,
  ImportStatus,
  ImportSource,
} from './entities/import.entity';
import {
  ImportSession,
  ImportSessionStatus,
  DomainType,
  ApprovalStatus,
} from './entities/import-session.entity';
import { ImportAuditLog, AuditActionType } from './entities/import-audit-log.entity';
import { SchemaDefinition, FieldDefinition } from './entities/schema-definition.entity';
import { ValidationRule, ValidationRuleType, ValidationSeverity } from './entities/validation-rule.entity';
import {
  CreateImportSessionDto,
  ClassifySessionDto,
  ValidateSessionDto,
  ApproveSessionDto,
  RejectSessionDto,
  QueryImportSessionsDto,
  QueryAuditLogDto,
} from './dto/import-session.dto';

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
  data: Record<string, any>;
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
    @InjectRepository(ImportTemplate)
    private readonly templateRepository: Repository<ImportTemplate>,
    @InjectRepository(ImportSession)
    private readonly sessionRepo: Repository<ImportSession>,
    @InjectRepository(ImportAuditLog)
    private readonly auditLogRepo: Repository<ImportAuditLog>,
    @InjectRepository(SchemaDefinition)
    private readonly schemaDefRepo: Repository<SchemaDefinition>,
    @InjectRepository(ValidationRule)
    private readonly validationRuleRepo: Repository<ValidationRule>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
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

    this.eventEmitter.emit('import.created', { job: saved });
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
      .createQueryBuilder('ij')
      .where('ij.organizationId = :organizationId', { organizationId });

    if (filters.importType) {
      qb.andWhere('ij.importType = :importType', { importType: filters.importType });
    }
    if (filters.status) {
      qb.andWhere('ij.status = :status', { status: filters.status });
    }
    if (filters.startDate && filters.endDate) {
      qb.andWhere('ij.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const [data, total] = await qb
      .orderBy('ij.createdAt', 'DESC')
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

    if (![ImportStatus.PENDING, ImportStatus.VALIDATING, ImportStatus.PROCESSING].includes(job.status)) {
      throw new BadRequestException('Cannot cancel job in current status');
    }

    job.status = ImportStatus.CANCELLED;
    job.cancelledByUserId = userId;

    const saved = await this.importJobRepository.save(job);

    this.eventEmitter.emit('import.cancelled', { job: saved, userId });
    return saved;
  }

  // ========================================================================
  // FILE PARSING
  // ========================================================================

  /**
   * Parse CSV file
   */
  async parseCSV(
    buffer: Buffer,
    options?: { delimiter?: string; encoding?: string; headerRow?: number },
  ): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
    const csvString = buffer.toString(options?.encoding as BufferEncoding || 'utf-8');

    return new Promise((resolve, reject) => {
      Papa.parse(csvString, {
        header: true,
        delimiter: options?.delimiter || ',',
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          resolve({
            headers: results.meta.fields || [],
            rows: results.data as Record<string, any>[],
          });
        },
        error: (error: any) => {
          reject(new BadRequestException(`CSV parse error: ${error.message}`));
        },
      });
    });
  }

  /**
   * Parse Excel file
   */
  async parseExcel(
    buffer: Buffer,
    options?: { sheetName?: string; headerRow?: number; startRow?: number },
  ): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      const sheetName = options?.sheetName || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new BadRequestException(`Sheet "${sheetName}" not found`);
      }

      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
        header: 1,
        defval: '',
      });

      const headerRowIndex = (options?.headerRow || 1) - 1;
      const startRowIndex = (options?.startRow || 2) - 1;

      const headers = (rawData[headerRowIndex] as string[]).map(h => String(h).trim());
      const rows: Record<string, any>[] = [];

      for (let i = startRowIndex; i < rawData.length; i++) {
        const rowData = rawData[i] as any[];
        const row: Record<string, any> = {};

        headers.forEach((header, idx) => {
          row[header] = rowData[idx] ?? '';
        });

        // Skip empty rows
        if (Object.values(row).some(v => v !== '')) {
          rows.push(row);
        }
      }

      return { headers, rows };
    } catch (error: any) {
      throw new BadRequestException(`Excel parse error: ${error.message}`);
    }
  }

  /**
   * Parse JSON file
   */
  async parseJSON(buffer: Buffer): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
    try {
      const data = JSON.parse(buffer.toString('utf-8'));
      const rows = Array.isArray(data) ? data : [data];

      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

      return { headers, rows };
    } catch (error: any) {
      throw new BadRequestException(`JSON parse error: ${error.message}`);
    }
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  /**
   * Validate import data
   */
  async validateImportData(
    organizationId: string,
    jobId: string,
    rows: Record<string, any>[],
    importType: ImportType,
    mapping?: Record<string, string>,
  ): Promise<{ validRows: ParsedRow[]; invalidRows: ParsedRow[]; warnings: any[] }> {
    const job = await this.getImportJob(organizationId, jobId);

    job.status = ImportStatus.VALIDATING;
    job.totalRows = rows.length;
    await this.importJobRepository.save(job);

    const validRows: ParsedRow[] = [];
    const invalidRows: ParsedRow[] = [];
    const warnings: any[] = [];

    const validator = this.getValidator(importType);

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 1;
      const mappedData = mapping ? this.applyMapping(rows[i], mapping) : rows[i];

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
        warnings.push(...result.warnings.map(w => ({ row: rowNumber, ...w })));
      }
    }

    // Update job with validation results
    job.validationWarnings = warnings;
    if (invalidRows.length === rows.length) {
      job.status = ImportStatus.VALIDATION_FAILED;
      job.errorDetails = invalidRows.flatMap(r =>
        r.errors.map(e => ({ row: r.rowNumber, field: e.field, message: e.message })),
      );
    }
    await this.importJobRepository.save(job);

    return { validRows, invalidRows, warnings };
  }

  /**
   * Get validator for import type
   */
  private getValidator(
    importType: ImportType,
  ): (data: Record<string, any>, orgId: string, row: number) => Promise<{
    errors: { field: string; message: string }[];
    warnings: { field: string; message: string }[];
  }> {
    const validators: Record<ImportType, any> = {
      [ImportType.PRODUCTS]: this.validateProduct.bind(this),
      [ImportType.MACHINES]: this.validateMachine.bind(this),
      [ImportType.USERS]: this.validateUser.bind(this),
      [ImportType.EMPLOYEES]: this.validateEmployee.bind(this),
      [ImportType.TRANSACTIONS]: this.validateTransaction.bind(this),
      [ImportType.SALES]: this.validateSale.bind(this),
      [ImportType.INVENTORY]: this.validateInventory.bind(this),
      [ImportType.CUSTOMERS]: this.validateCustomer.bind(this),
      [ImportType.PRICES]: this.validatePrice.bind(this),
      [ImportType.CATEGORIES]: this.validateCategory.bind(this),
      [ImportType.LOCATIONS]: this.validateLocation.bind(this),
      [ImportType.CONTRACTORS]: this.validateContractor.bind(this),
    };

    return validators[importType] || this.validateGeneric.bind(this);
  }

  // ========================================================================
  // VALIDATORS
  // ========================================================================

  private async validateProduct(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.name || String(data.name).trim() === '') {
      errors.push({ field: 'name', message: 'Product name is required' });
    }

    if (data.price !== undefined && data.price !== '') {
      const price = parseFloat(data.price);
      if (isNaN(price) || price < 0) {
        errors.push({ field: 'price', message: 'Invalid price value' });
      }
    }

    if (data.barcode && String(data.barcode).length > 50) {
      errors.push({ field: 'barcode', message: 'Barcode too long (max 50 characters)' });
    }

    if (!data.category) {
      warnings.push({ field: 'category', message: 'Category not specified, will use default' });
    }

    return { errors, warnings };
  }

  private async validateMachine(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.serialNumber || String(data.serialNumber).trim() === '') {
      errors.push({ field: 'serialNumber', message: 'Serial number is required' });
    }

    if (!data.model) {
      warnings.push({ field: 'model', message: 'Model not specified' });
    }

    return { errors, warnings };
  }

  private async validateUser(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.email || !this.isValidEmail(data.email)) {
      errors.push({ field: 'email', message: 'Valid email is required' });
    }

    if (!data.firstName) {
      errors.push({ field: 'firstName', message: 'First name is required' });
    }

    return { errors, warnings };
  }

  private async validateEmployee(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.firstName) {
      errors.push({ field: 'firstName', message: 'First name is required' });
    }

    if (!data.lastName) {
      errors.push({ field: 'lastName', message: 'Last name is required' });
    }

    if (!data.employeeRole) {
      errors.push({ field: 'employeeRole', message: 'Employee role is required' });
    }

    return { errors, warnings };
  }

  private async validateTransaction(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.amount || isNaN(parseFloat(data.amount))) {
      errors.push({ field: 'amount', message: 'Valid amount is required' });
    }

    if (!data.transactionDate) {
      errors.push({ field: 'transactionDate', message: 'Transaction date is required' });
    }

    return { errors, warnings };
  }

  private async validateSale(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.machineId && !data.machineSerial) {
      errors.push({ field: 'machineId', message: 'Machine ID or serial number is required' });
    }

    if (!data.saleDate) {
      errors.push({ field: 'saleDate', message: 'Sale date is required' });
    }

    if (!data.amount || isNaN(parseFloat(data.amount))) {
      errors.push({ field: 'amount', message: 'Valid amount is required' });
    }

    return { errors, warnings };
  }

  private async validateInventory(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.productId && !data.productSku && !data.productBarcode) {
      errors.push({ field: 'productId', message: 'Product identifier is required' });
    }

    if (!data.quantity || isNaN(parseFloat(data.quantity))) {
      errors.push({ field: 'quantity', message: 'Valid quantity is required' });
    }

    return { errors, warnings };
  }

  private async validateCustomer(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.phone && !data.email) {
      errors.push({ field: 'phone', message: 'Phone or email is required' });
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    return { errors, warnings };
  }

  private async validatePrice(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.productId && !data.productSku) {
      errors.push({ field: 'productId', message: 'Product identifier is required' });
    }

    if (!data.price || isNaN(parseFloat(data.price)) || parseFloat(data.price) < 0) {
      errors.push({ field: 'price', message: 'Valid positive price is required' });
    }

    return { errors, warnings };
  }

  private async validateCategory(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.name) {
      errors.push({ field: 'name', message: 'Category name is required' });
    }

    return { errors, warnings };
  }

  private async validateLocation(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.name && !data.address) {
      errors.push({ field: 'name', message: 'Location name or address is required' });
    }

    return { errors, warnings };
  }

  private async validateContractor(
    data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    const errors: { field: string; message: string }[] = [];
    const warnings: { field: string; message: string }[] = [];

    if (!data.companyName) {
      errors.push({ field: 'companyName', message: 'Company name is required' });
    }

    if (!data.serviceType) {
      errors.push({ field: 'serviceType', message: 'Service type is required' });
    }

    return { errors, warnings };
  }

  private async validateGeneric(
    _data: Record<string, any>,
    _orgId: string,
    _row: number,
  ): Promise<{ errors: { field: string; message: string }[]; warnings: { field: string; message: string }[] }> {
    return { errors: [], warnings: [] };
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private applyMapping(data: Record<string, any>, mapping: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (data[sourceField] !== undefined) {
        result[targetField] = data[sourceField];
      }
    }

    // Include unmapped fields
    for (const [key, value] of Object.entries(data)) {
      if (!mapping[key]) {
        result[key] = value;
      }
    }

    return result;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ========================================================================
  // TEMPLATES
  // ========================================================================

  async createTemplate(
    organizationId: string,
    userId: string,
    data: Partial<ImportTemplate>,
  ): Promise<ImportTemplate> {
    const template = this.templateRepository.create({
      organizationId,
      createdByUserId: userId,
      ...data,
    });

    return this.templateRepository.save(template);
  }

  async getTemplates(
    organizationId: string,
    importType?: ImportType,
  ): Promise<ImportTemplate[]> {
    const where: any = { organizationId, isActive: true };
    if (importType) {
      where.importType = importType;
    }

    return this.templateRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async getTemplate(organizationId: string, id: string): Promise<ImportTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }

    return template;
  }

  async deleteTemplate(organizationId: string, id: string): Promise<void> {
    await this.templateRepository.update(
      { id, organizationId },
      { isActive: false },
    );
  }

  // ========================================================================
  // INTELLIGENT IMPORT SESSIONS
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
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    let fileType: string;

    switch (extension) {
      case 'csv':
        fileType = 'csv';
        break;
      case 'xlsx':
      case 'xls':
        fileType = 'xlsx';
        break;
      case 'json':
        fileType = 'json';
        break;
      default:
        throw new BadRequestException(`Unsupported file format: ${extension}`);
    }

    // Parse file to extract headers and sample data
    let parsed: { headers: string[]; rows: Record<string, any>[] };

    if (fileType === 'csv') {
      parsed = await this.parseCSV(file.buffer);
    } else if (fileType === 'xlsx') {
      parsed = await this.parseExcel(file.buffer);
    } else {
      parsed = await this.parseJSON(file.buffer);
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
        'Could not auto-detect import domain. Please specify the domain manually.',
      );
    }

    const session = this.sessionRepo.create({
      organization_id: organizationId,
      domain,
      status: ImportSessionStatus.UPLOADED,
      template_id: dto.templateId || null,
      file_name: file.originalname,
      file_size: file.size,
      file_type: fileType,
      file_url: null,
      file_metadata: fileMetadata,
      classification_result: null,
      classification_confidence: null,
      column_mapping: null,
      unmapped_columns: null,
      validation_report: null,
      action_plan: null,
      approval_status: ApprovalStatus.PENDING,
      approved_by_user_id: null,
      approved_at: null,
      rejection_reason: null,
      execution_result: null,
      uploaded_by_user_id: userId,
      import_job_id: null,
      started_at: new Date(),
      completed_at: null,
      message: 'File uploaded successfully. Ready for classification.',
    });

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit('import.session.created', { session: saved });
    this.logger.log(`Import session created: ${saved.id} for domain ${domain}`);

    return saved;
  }

  /**
   * Auto-detect domain from file headers by matching against all schema definitions.
   */
  private async autoDetectDomain(headers: string[]): Promise<DomainType | undefined> {
    const schemas = await this.schemaDefRepo.find({
      where: { is_active: true },
    });

    if (schemas.length === 0) {
      return undefined;
    }

    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    let bestDomain: DomainType | undefined;
    let bestScore = 0;

    for (const schema of schemas) {
      let matchCount = 0;
      const fieldDefs = schema.field_definitions || [];

      for (const fieldDef of fieldDefs) {
        const allNames = [
          fieldDef.name.toLowerCase(),
          fieldDef.display_name.toLowerCase(),
          ...fieldDef.synonyms.map(s => s.toLowerCase()),
        ];

        const matched = normalizedHeaders.some(h => allNames.includes(h));
        if (matched) {
          matchCount++;
        }
      }

      const requiredCount = schema.required_fields.length || 1;
      const score = (matchCount / requiredCount) * 100;

      if (score > bestScore) {
        bestScore = score;
        bestDomain = schema.domain;
      }
    }

    // Only return if we have a reasonable match (> 30%)
    return bestScore > 30 ? bestDomain : undefined;
  }

  /**
   * Classify session: match columns to SchemaDefinition using synonyms.
   * Calculate confidence score and save classification_result and column_mapping.
   */
  async classifySession(
    sessionId: string,
    dto: ClassifySessionDto | undefined,
    organizationId: string,
  ): Promise<ImportSession> {
    const session = await this.getSession(sessionId, organizationId);

    if (session.status !== ImportSessionStatus.UPLOADED && session.status !== ImportSessionStatus.CLASSIFIED) {
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
      session.column_mapping = dto.columnMapping;
      session.classification_confidence = 100;
      session.unmapped_columns = this.findUnmappedColumns(
        session.file_metadata?.headers || [],
        dto.columnMapping,
      );
      session.classification_result = {
        detected_domain: domain,
        confidence: 100,
        column_mapping: dto.columnMapping,
        unmapped_columns: session.unmapped_columns,
        method: 'manual',
      };
      session.status = ImportSessionStatus.CLASSIFIED;
      session.message = 'Classification completed with manual mapping.';

      return this.sessionRepo.save(session);
    }

    // Auto-classify using SchemaDefinition
    const schemaDef = await this.schemaDefRepo.findOne({
      where: { domain, is_active: true },
    });

    if (!schemaDef) {
      session.status = ImportSessionStatus.UPLOADED;
      session.message = `No schema definition found for domain: ${domain}. Please provide manual column mapping.`;
      return this.sessionRepo.save(session);
    }

    const headers: string[] = session.file_metadata?.headers || [];
    const { mapping, unmappedColumns, confidence } = this.matchColumns(headers, schemaDef.field_definitions, schemaDef.required_fields);

    session.column_mapping = mapping;
    session.unmapped_columns = unmappedColumns;
    session.classification_confidence = confidence;
    session.classification_result = {
      detected_domain: domain,
      confidence,
      column_mapping: mapping,
      unmapped_columns: unmappedColumns,
      method: 'auto',
      schema_version: schemaDef.version,
    };
    session.status = ImportSessionStatus.CLASSIFIED;
    session.message = `Classification completed. Confidence: ${confidence.toFixed(1)}%. Mapped ${Object.keys(mapping).length} columns.`;

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit('import.session.classified', { session: saved });
    this.logger.log(`Session ${sessionId} classified with confidence ${confidence}%`);

    return saved;
  }

  /**
   * Match source column headers to schema field definitions using synonyms.
   *
   * Algorithm:
   * 1. For each source column header, check against field_definitions synonyms
   * 2. Match is case-insensitive, trimmed, normalized
   * 3. Calculate confidence = matched_required_columns / total_required_columns * 100
   * 4. Return mapping and unmapped columns
   */
  private matchColumns(
    headers: string[],
    fieldDefinitions: FieldDefinition[],
    requiredFields: string[],
  ): { mapping: Record<string, string>; unmappedColumns: string[]; confidence: number } {
    const mapping: Record<string, string> = {};
    const matchedHeaders = new Set<string>();

    const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[\s_-]+/g, '_'));

    for (const fieldDef of fieldDefinitions) {
      // Build list of all possible names for this field (including synonyms)
      const allNames = [
        fieldDef.name.toLowerCase().replace(/[\s_-]+/g, '_'),
        fieldDef.display_name.toLowerCase().replace(/[\s_-]+/g, '_'),
        ...fieldDef.synonyms.map(s => s.toLowerCase().replace(/[\s_-]+/g, '_')),
      ];

      // Find the first matching header
      for (let i = 0; i < normalizedHeaders.length; i++) {
        if (allNames.includes(normalizedHeaders[i]) && !matchedHeaders.has(headers[i])) {
          mapping[headers[i]] = fieldDef.name;
          matchedHeaders.add(headers[i]);
          break;
        }
      }
    }

    // Find unmapped columns
    const unmappedColumns = headers.filter(h => !matchedHeaders.has(h));

    // Calculate confidence based on required fields matched
    const totalRequired = requiredFields.length || 1;
    const mappedTargetFields = new Set(Object.values(mapping));
    const matchedRequired = requiredFields.filter(rf => mappedTargetFields.has(rf)).length;
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
    return headers.filter(h => !mappedSources.has(h));
  }

  /**
   * Validate session: run ValidationRules against data.
   * Generate validation_report with errors/warnings per row.
   */
  async validateSession(
    sessionId: string,
    organizationId: string,
  ): Promise<ImportSession> {
    const session = await this.getSession(sessionId, organizationId);

    if (session.status !== ImportSessionStatus.CLASSIFIED && session.status !== ImportSessionStatus.MAPPED) {
      throw new BadRequestException(
        `Cannot validate session in status: ${session.status}. Session must be in CLASSIFIED or MAPPED status.`,
      );
    }

    session.status = ImportSessionStatus.VALIDATING;
    session.message = 'Validation in progress...';
    await this.sessionRepo.save(session);

    // Get validation rules for this domain, sorted by priority
    const rules = await this.validationRuleRepo.find({
      where: { domain: session.domain, is_active: true },
      order: { priority: 'ASC' },
    });

    // Get the data rows from file_metadata
    const allRows: Record<string, any>[] = session.file_metadata?.sampleData || [];
    const columnMapping = session.column_mapping || {};
    const totalRows = session.file_metadata?.rows || allRows.length;

    let validRows = 0;
    let invalidRows = 0;
    const errors: { row: number; field: string; message: string; severity: string }[] = [];
    const warnings: { row: number; field: string; message: string }[] = [];

    for (let i = 0; i < allRows.length; i++) {
      const rowNumber = i + 1;
      const row = allRows[i];

      // Map source columns to target fields
      const mappedRow: Record<string, any> = {};
      for (const [sourceCol, targetField] of Object.entries(columnMapping)) {
        if (row[sourceCol] !== undefined) {
          mappedRow[targetField] = row[sourceCol];
        }
      }

      let rowHasError = false;

      // Apply each validation rule
      for (const rule of rules) {
        const fieldValue = mappedRow[rule.field_name];
        const validationResult = this.applyValidationRule(rule, fieldValue, mappedRow, rowNumber);

        if (!validationResult.valid) {
          if (rule.severity === ValidationSeverity.ERROR) {
            rowHasError = true;
            errors.push({
              row: rowNumber,
              field: rule.field_name,
              message: validationResult.message,
              severity: 'error',
            });
          } else if (rule.severity === ValidationSeverity.WARNING) {
            warnings.push({
              row: rowNumber,
              field: rule.field_name,
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

    session.validation_report = validationReport;

    // Generate action plan
    session.action_plan = {
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

    this.eventEmitter.emit('import.session.validated', { session: saved });
    this.logger.log(`Session ${sessionId} validated: ${validRows} valid, ${invalidRows} invalid`);

    return saved;
  }

  /**
   * Apply a single validation rule to a field value.
   */
  private applyValidationRule(
    rule: ValidationRule,
    value: any,
    row: Record<string, any>,
    rowNumber: number,
  ): { valid: boolean; message: string } {
    const def = rule.rule_definition;

    const formatMessage = (template: string | null, defaultMsg: string): string => {
      if (!template) return defaultMsg;
      return template
        .replace(/\{\{field\}\}/g, rule.field_name)
        .replace(/\{\{value\}\}/g, String(value ?? ''))
        .replace(/\{\{row\}\}/g, String(rowNumber));
    };

    switch (rule.rule_type) {
      case ValidationRuleType.REQUIRED: {
        if (value === undefined || value === null || String(value).trim() === '') {
          return {
            valid: false,
            message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" is required`),
          };
        }
        return { valid: true, message: '' };
      }

      case ValidationRuleType.RANGE: {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return {
            valid: false,
            message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" must be a number`),
          };
        }
        if (def.min !== undefined && numValue < def.min) {
          return {
            valid: false,
            message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" must be at least ${def.min}`),
          };
        }
        if (def.max !== undefined && numValue > def.max) {
          return {
            valid: false,
            message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" must be at most ${def.max}`),
          };
        }
        return { valid: true, message: '' };
      }

      case ValidationRuleType.REGEX: {
        if (value === undefined || value === null) {
          return { valid: true, message: '' };
        }
        const regex = new RegExp(def.pattern);
        if (!regex.test(String(value))) {
          return {
            valid: false,
            message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" does not match required pattern`),
          };
        }
        return { valid: true, message: '' };
      }

      case ValidationRuleType.ENUM: {
        if (value === undefined || value === null) {
          return { valid: true, message: '' };
        }
        const allowedValues: string[] = def.values || [];
        if (!allowedValues.includes(String(value))) {
          return {
            valid: false,
            message: formatMessage(
              rule.error_message_template,
              `Field "${rule.field_name}" must be one of: ${allowedValues.join(', ')}`,
            ),
          };
        }
        return { valid: true, message: '' };
      }

      case ValidationRuleType.LENGTH: {
        if (value === undefined || value === null) {
          return { valid: true, message: '' };
        }
        const strValue = String(value);
        if (def.min_length !== undefined && strValue.length < def.min_length) {
          return {
            valid: false,
            message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" must be at least ${def.min_length} characters`),
          };
        }
        if (def.max_length !== undefined && strValue.length > def.max_length) {
          return {
            valid: false,
            message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" must be at most ${def.max_length} characters`),
          };
        }
        return { valid: true, message: '' };
      }

      case ValidationRuleType.FORMAT: {
        if (value === undefined || value === null) {
          return { valid: true, message: '' };
        }
        if (def.format === 'email') {
          if (!this.isValidEmail(String(value))) {
            return {
              valid: false,
              message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" is not a valid email`),
            };
          }
        }
        if (def.format === 'uuid') {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(String(value))) {
            return {
              valid: false,
              message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" is not a valid UUID`),
            };
          }
        }
        if (def.format === 'date') {
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            return {
              valid: false,
              message: formatMessage(rule.error_message_template, `Field "${rule.field_name}" is not a valid date`),
            };
          }
        }
        return { valid: true, message: '' };
      }

      case ValidationRuleType.UNIQUE: {
        // Unique validation would require checking the entire dataset or DB.
        // This is a placeholder -- full unique checks happen during execution.
        return { valid: true, message: '' };
      }

      case ValidationRuleType.FOREIGN_KEY: {
        // FK validation would require DB lookup.
        // This is a placeholder -- full FK checks happen during execution.
        return { valid: true, message: '' };
      }

      case ValidationRuleType.CROSS_FIELD: {
        // Cross-field validation using dependent_field and condition from rule_definition
        if (def.condition === 'required_if' && def.dependent_field) {
          const dependentValue = row[def.dependent_field];
          if (dependentValue && (value === undefined || value === null || String(value).trim() === '')) {
            return {
              valid: false,
              message: formatMessage(
                rule.error_message_template,
                `Field "${rule.field_name}" is required when "${def.dependent_field}" is set`,
              ),
            };
          }
        }
        return { valid: true, message: '' };
      }

      case ValidationRuleType.CUSTOM: {
        // Custom rules would execute a stored expression or function.
        // Placeholder for future implementation.
        return { valid: true, message: '' };
      }

      default:
        return { valid: true, message: '' };
    }
  }

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

    const hasErrors = (session.validation_report?.errors?.length || 0) > 0;
    const confidence = session.classification_confidence || 0;

    // Auto-approve if confidence >= 95% and no errors
    if (confidence >= 95 && !hasErrors) {
      session.approval_status = ApprovalStatus.AUTO_APPROVED;
      session.approved_at = new Date();
      session.status = ImportSessionStatus.APPROVED;
      session.message = `Auto-approved: confidence ${confidence.toFixed(1)}%, no validation errors.`;

      this.eventEmitter.emit('import.session.auto_approved', { session });
      this.logger.log(`Session ${sessionId} auto-approved with confidence ${confidence}%`);
    } else {
      session.status = ImportSessionStatus.AWAITING_APPROVAL;
      session.message = `Awaiting manual approval. Confidence: ${confidence.toFixed(1)}%, errors: ${session.validation_report?.errors?.length || 0}.`;

      this.eventEmitter.emit('import.session.awaiting_approval', { session });
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

    session.approval_status = ApprovalStatus.APPROVED;
    session.approved_by_user_id = userId;
    session.approved_at = new Date();
    session.status = ImportSessionStatus.APPROVED;
    session.message = 'Session approved.';

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit('import.session.approved', { session: saved, userId });
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

    session.approval_status = ApprovalStatus.REJECTED;
    session.approved_by_user_id = userId;
    session.approved_at = new Date();
    session.rejection_reason = dto.reason;
    session.status = ImportSessionStatus.REJECTED;
    session.message = `Session rejected: ${dto.reason}`;

    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit('import.session.rejected', { session: saved, userId, reason: dto.reason });
    this.logger.log(`Session ${sessionId} rejected by user ${userId}: ${dto.reason}`);

    return saved;
  }

  /**
   * Execute import session: perform actual data INSERT/UPDATE operations.
   * Creates ImportAuditLog entries for every row operation.
   * Updates execution_result on the session.
   */
  async executeImportSession(
    sessionId: string,
    organizationId: string,
    userId: string,
  ): Promise<ImportSession> {
    const session = await this.getSession(sessionId, organizationId);

    if (
      session.status !== ImportSessionStatus.APPROVED &&
      session.approval_status !== ApprovalStatus.AUTO_APPROVED
    ) {
      throw new BadRequestException(
        `Cannot execute session in status: ${session.status}. Session must be APPROVED.`,
      );
    }

    session.status = ImportSessionStatus.EXECUTING;
    session.message = 'Executing import...';
    await this.sessionRepo.save(session);

    const startTime = Date.now();
    const columnMapping = session.column_mapping || {};
    const allRows: Record<string, any>[] = session.file_metadata?.sampleData || [];

    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Get schema for table name
    const schemaDef = await this.schemaDefRepo.findOne({
      where: { domain: session.domain, is_active: true },
    });
    const tableName = schemaDef?.table_name || session.domain;

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
        const mappedRow: Record<string, any> = {};
        for (const [sourceCol, targetField] of Object.entries(columnMapping)) {
          if (row[sourceCol] !== undefined) {
            mappedRow[targetField] = row[sourceCol];
          }
        }

        // Add organization_id to the mapped data
        mappedRow['organization_id'] = organizationId;

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
          const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(', ');
          const columnNames = fields.map(f => `"${f}"`).join(', ');

          const query = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) RETURNING id`;
          const result = await queryRunner.query(query, values);

          const newRecordId = result?.[0]?.id || null;

          // Create audit log for successful insert
          const auditLog = this.auditLogRepo.create({
            session_id: sessionId,
            organization_id: organizationId,
            action_type: AuditActionType.INSERT,
            table_name: tableName,
            record_id: newRecordId,
            before_state: null,
            after_state: mappedRow,
            field_changes: null,
            row_number: rowNumber,
            executed_at: new Date(),
            executed_by_user_id: userId,
            error_message: null,
            success: true,
          });
          await queryRunner.manager.save(ImportAuditLog, auditLog);

          successful++;
        } catch (rowError: any) {
          // Create audit log for failed row
          const auditLog = this.auditLogRepo.create({
            session_id: sessionId,
            organization_id: organizationId,
            action_type: AuditActionType.INSERT,
            table_name: tableName,
            record_id: null,
            before_state: null,
            after_state: mappedRow,
            field_changes: null,
            row_number: rowNumber,
            executed_at: new Date(),
            executed_by_user_id: userId,
            error_message: rowError.message,
            success: false,
          });
          await queryRunner.manager.save(ImportAuditLog, auditLog);

          failed++;
          this.logger.warn(`Row ${rowNumber} failed: ${rowError.message}`);
        }
      }

      await queryRunner.commitTransaction();
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      session.status = ImportSessionStatus.FAILED;
      session.message = `Import execution failed: ${error.message}`;
      session.completed_at = new Date();

      session.execution_result = {
        total: allRows.length,
        successful: 0,
        failed: allRows.length,
        skipped: 0,
        duration_ms: Date.now() - startTime,
        error: error.message,
      };

      const savedFailed = await this.sessionRepo.save(session);
      this.eventEmitter.emit('import.session.failed', { session: savedFailed });
      this.logger.error(`Session ${sessionId} execution failed: ${error.message}`);

      return savedFailed;
    } finally {
      await queryRunner.release();
    }

    const durationMs = Date.now() - startTime;

    session.execution_result = {
      total: allRows.length,
      successful,
      failed,
      skipped,
      duration_ms: durationMs,
    };

    session.completed_at = new Date();

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

    this.eventEmitter.emit('import.session.completed', { session: saved });
    this.logger.log(`Session ${sessionId} execution completed: ${successful} successful, ${failed} failed`);

    return saved;
  }

  /**
   * Get paginated list of import sessions.
   */
  async getSessions(
    query: QueryImportSessionsDto,
    organizationId: string,
  ): Promise<{ data: ImportSession[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.sessionRepo
      .createQueryBuilder('s')
      .where('s.organization_id = :organizationId', { organizationId });

    if (query.domain) {
      qb.andWhere('s.domain = :domain', { domain: query.domain });
    }
    if (query.status) {
      qb.andWhere('s.status = :status', { status: query.status });
    }
    if (query.approvalStatus) {
      qb.andWhere('s.approval_status = :approvalStatus', { approvalStatus: query.approvalStatus });
    }
    if (query.dateFrom) {
      qb.andWhere('s.created_at >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('s.created_at <= :dateTo', { dateTo: query.dateTo });
    }

    const [data, total] = await qb
      .orderBy('s.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get a single session by ID with all details.
   */
  async getSession(sessionId: string, organizationId: string): Promise<ImportSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, organization_id: organizationId },
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
  ): Promise<{ data: ImportAuditLog[]; total: number; page: number; limit: number }> {
    // Verify session exists and belongs to organization
    await this.getSession(sessionId, organizationId);

    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.auditLogRepo
      .createQueryBuilder('al')
      .where('al.session_id = :sessionId', { sessionId })
      .andWhere('al.organization_id = :organizationId', { organizationId });

    if (query.actionType) {
      qb.andWhere('al.action_type = :actionType', { actionType: query.actionType });
    }
    if (query.tableName) {
      qb.andWhere('al.table_name = :tableName', { tableName: query.tableName });
    }

    const [data, total] = await qb
      .orderBy('al.executed_at', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get schema definitions, optionally filtered by domain.
   */
  async getSchemaDefinitions(domain?: DomainType): Promise<SchemaDefinition[]> {
    const where: any = { is_active: true };
    if (domain) {
      where.domain = domain;
    }

    return this.schemaDefRepo.find({
      where,
      order: { domain: 'ASC', table_name: 'ASC' },
    });
  }

  /**
   * Get validation rules, optionally filtered by domain.
   */
  async getValidationRules(domain?: DomainType): Promise<ValidationRule[]> {
    const where: any = { is_active: true };
    if (domain) {
      where.domain = domain;
    }

    return this.validationRuleRepo.find({
      where,
      order: { domain: 'ASC', priority: 'ASC' },
    });
  }
}
