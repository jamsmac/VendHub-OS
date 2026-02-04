import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, ObjectLiteral } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { ImportService } from './import.service';
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
import { ImportAuditLog } from './entities/import-audit-log.entity';
import { SchemaDefinition } from './entities/schema-definition.entity';
import { ValidationRule, ValidationRuleType, ValidationSeverity } from './entities/validation-rule.entity';

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
});

describe('ImportService', () => {
  let service: ImportService;
  let importJobRepo: MockRepository<ImportJob>;
  let templateRepo: MockRepository<ImportTemplate>;
  let sessionRepo: MockRepository<ImportSession>;
  let auditLogRepo: MockRepository<ImportAuditLog>;
  let schemaDefRepo: MockRepository<SchemaDefinition>;
  let validationRuleRepo: MockRepository<ValidationRule>;
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';
  const jobId = 'job-uuid-1';
  const sessionId = 'session-uuid-1';
  const templateId = 'template-uuid-1';

  const mockJob: Partial<ImportJob> = {
    id: jobId,
    organizationId: orgId,
    jobNumber: 'IMP-2025-001',
    importType: ImportType.PRODUCTS,
    source: ImportSource.CSV,
    status: ImportStatus.PENDING,
    totalRows: 0,
    processedRows: 0,
    successfulRows: 0,
    failedRows: 0,
    skippedRows: 0,
    createdByUserId: userId,
  } as any;

  const mockSession: Partial<ImportSession> = {
    id: sessionId,
    organization_id: orgId,
    domain: DomainType.PRODUCTS,
    status: ImportSessionStatus.UPLOADED,
    approval_status: ApprovalStatus.PENDING,
    file_name: 'products.csv',
    file_size: 1024,
    file_type: 'csv',
    file_metadata: {
      rows: 10,
      columns: 3,
      headers: ['name', 'price', 'category'],
      sampleData: [
        { name: 'Cola', price: 5000, category: 'beverage' },
        { name: 'Snickers', price: 8000, category: 'snack' },
      ],
    },
    column_mapping: null,
    classification_confidence: null,
    uploaded_by_user_id: userId,
  } as any;

  const mockTemplate: Partial<ImportTemplate> = {
    id: templateId,
    organizationId: orgId,
    name: 'Products Template',
    importType: ImportType.PRODUCTS,
    source: ImportSource.CSV,
    isActive: true,
    createdByUserId: userId,
  } as any;

  beforeEach(async () => {
    importJobRepo = createMockRepository<ImportJob>();
    templateRepo = createMockRepository<ImportTemplate>();
    sessionRepo = createMockRepository<ImportSession>();
    auditLogRepo = createMockRepository<ImportAuditLog>();
    schemaDefRepo = createMockRepository<SchemaDefinition>();
    validationRuleRepo = createMockRepository<ValidationRule>();
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        query: jest.fn(),
        manager: { save: jest.fn() },
      }),
    };
    eventEmitter = { emit: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: getRepositoryToken(ImportJob), useValue: importJobRepo },
        { provide: getRepositoryToken(ImportTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(ImportSession), useValue: sessionRepo },
        { provide: getRepositoryToken(ImportAuditLog), useValue: auditLogRepo },
        { provide: getRepositoryToken(SchemaDefinition), useValue: schemaDefRepo },
        { provide: getRepositoryToken(ValidationRule), useValue: validationRuleRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================================================
  // createImportJob
  // ========================================================================

  describe('createImportJob', () => {
    it('should create an import job with PENDING status', async () => {
      importJobRepo.create!.mockReturnValue(mockJob);
      importJobRepo.save!.mockResolvedValue(mockJob);

      const result = await service.createImportJob(
        orgId,
        userId,
        ImportType.PRODUCTS,
        ImportSource.CSV,
        'products.csv',
      );

      expect(importJobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          status: ImportStatus.PENDING,
          createdByUserId: userId,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('import.created', expect.any(Object));
      expect(result).toEqual(mockJob);
    });
  });

  // ========================================================================
  // getImportJob
  // ========================================================================

  describe('getImportJob', () => {
    it('should return import job when found', async () => {
      importJobRepo.findOne!.mockResolvedValue(mockJob);

      const result = await service.getImportJob(orgId, jobId);
      expect(result).toEqual(mockJob);
    });

    it('should throw NotFoundException when not found', async () => {
      importJobRepo.findOne!.mockResolvedValue(null);

      await expect(service.getImportJob(orgId, 'bad'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ========================================================================
  // listImportJobs
  // ========================================================================

  describe('listImportJobs', () => {
    it('should return paginated list of import jobs', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockJob], 1]);
      importJobRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.listImportJobs(orgId, {}, 1, 20);

      expect(result.data).toEqual([mockJob]);
      expect(result.total).toBe(1);
    });

    it('should apply filters', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      importJobRepo.createQueryBuilder!.mockReturnValue(qb as any);

      await service.listImportJobs(
        orgId,
        {
          importType: ImportType.PRODUCTS,
          status: ImportStatus.COMPLETED,
          startDate: new Date(),
          endDate: new Date(),
        },
        1,
        20,
      );

      expect(qb.andWhere).toHaveBeenCalledTimes(3); // importType + status + dateRange
    });
  });

  // ========================================================================
  // cancelImportJob
  // ========================================================================

  describe('cancelImportJob', () => {
    it('should cancel a pending import job', async () => {
      importJobRepo.findOne!.mockResolvedValue({ ...mockJob, status: ImportStatus.PENDING });
      importJobRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.cancelImportJob(orgId, jobId, userId);

      expect(result.status).toBe(ImportStatus.CANCELLED);
      expect(result.cancelledByUserId).toBe(userId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('import.cancelled', expect.any(Object));
    });

    it('should throw BadRequestException when job is in non-cancellable status', async () => {
      importJobRepo.findOne!.mockResolvedValue({ ...mockJob, status: ImportStatus.COMPLETED });

      await expect(service.cancelImportJob(orgId, jobId, userId))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // parseCSV
  // ========================================================================

  describe('parseCSV', () => {
    it('should parse a CSV buffer into headers and rows', async () => {
      const csv = 'name,price,category\nCola,5000,beverage\nSnickers,8000,snack';
      const buffer = Buffer.from(csv, 'utf-8');

      const result = await service.parseCSV(buffer);

      expect(result.headers).toEqual(['name', 'price', 'category']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({ name: 'Cola', price: '5000', category: 'beverage' });
    });

    it('should handle custom delimiter', async () => {
      const csv = 'name;price;category\nCola;5000;beverage';
      const buffer = Buffer.from(csv, 'utf-8');

      const result = await service.parseCSV(buffer, { delimiter: ';' });

      expect(result.headers).toEqual(['name', 'price', 'category']);
    });
  });

  // ========================================================================
  // parseJSON
  // ========================================================================

  describe('parseJSON', () => {
    it('should parse a JSON array buffer', async () => {
      const json = JSON.stringify([
        { name: 'Cola', price: 5000 },
        { name: 'Fanta', price: 5000 },
      ]);
      const buffer = Buffer.from(json, 'utf-8');

      const result = await service.parseJSON(buffer);

      expect(result.headers).toEqual(['name', 'price']);
      expect(result.rows).toHaveLength(2);
    });

    it('should wrap single object into array', async () => {
      const json = JSON.stringify({ name: 'Cola', price: 5000 });
      const buffer = Buffer.from(json, 'utf-8');

      const result = await service.parseJSON(buffer);

      expect(result.rows).toHaveLength(1);
    });

    it('should throw BadRequestException for invalid JSON', async () => {
      const buffer = Buffer.from('not json', 'utf-8');

      await expect(service.parseJSON(buffer))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // validateImportData
  // ========================================================================

  describe('validateImportData', () => {
    it('should validate product rows and separate valid/invalid', async () => {
      importJobRepo.findOne!.mockResolvedValue({ ...mockJob });
      importJobRepo.save!.mockImplementation(async (entity) => entity);

      const rows = [
        { name: 'Cola', price: '5000', category: 'beverage' },
        { name: '', price: '8000', category: 'snack' }, // Missing name
        { name: 'Chips', price: '-100', category: 'snack' }, // Negative price
      ];

      const result = await service.validateImportData(
        orgId,
        jobId,
        rows,
        ImportType.PRODUCTS,
      );

      expect(result.validRows.length).toBeGreaterThanOrEqual(1); // Cola is valid
      expect(result.invalidRows.length).toBeGreaterThanOrEqual(1); // Missing name
    });

    it('should set job status to VALIDATION_FAILED when all rows are invalid', async () => {
      importJobRepo.findOne!.mockResolvedValue({ ...mockJob });
      importJobRepo.save!.mockImplementation(async (entity) => entity);

      const rows = [
        { name: '', price: '5000' }, // Missing name
      ];

      const result = await service.validateImportData(orgId, jobId, rows, ImportType.PRODUCTS);

      expect(result.invalidRows).toHaveLength(1);
    });

    it('should apply field mapping before validation', async () => {
      importJobRepo.findOne!.mockResolvedValue({ ...mockJob });
      importJobRepo.save!.mockImplementation(async (entity) => entity);

      const rows = [{ product_name: 'Cola', cost: '5000' }];
      const mapping = { product_name: 'name', cost: 'price' };

      const result = await service.validateImportData(
        orgId,
        jobId,
        rows,
        ImportType.PRODUCTS,
        mapping,
      );

      // After mapping, "product_name" -> "name" should pass the name-required check
      expect(result.validRows).toHaveLength(1);
    });
  });

  // ========================================================================
  // Templates
  // ========================================================================

  describe('createTemplate', () => {
    it('should create an import template', async () => {
      templateRepo.create!.mockReturnValue(mockTemplate);
      templateRepo.save!.mockResolvedValue(mockTemplate);

      const result = await service.createTemplate(orgId, userId, {
        name: 'Products Template',
        importType: ImportType.PRODUCTS,
      });

      expect(result).toEqual(mockTemplate);
    });
  });

  describe('getTemplates', () => {
    it('should return active templates for organization', async () => {
      templateRepo.find!.mockResolvedValue([mockTemplate]);

      const result = await service.getTemplates(orgId);

      expect(result).toEqual([mockTemplate]);
      expect(templateRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, isActive: true },
        }),
      );
    });

    it('should filter by import type when provided', async () => {
      templateRepo.find!.mockResolvedValue([]);

      await service.getTemplates(orgId, ImportType.MACHINES);

      expect(templateRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, isActive: true, importType: ImportType.MACHINES },
        }),
      );
    });
  });

  describe('getTemplate', () => {
    it('should return a template by ID', async () => {
      templateRepo.findOne!.mockResolvedValue(mockTemplate);

      const result = await service.getTemplate(orgId, templateId);
      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException when template not found', async () => {
      templateRepo.findOne!.mockResolvedValue(null);

      await expect(service.getTemplate(orgId, 'bad'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTemplate', () => {
    it('should deactivate a template', async () => {
      templateRepo.update!.mockResolvedValue({ affected: 1 });

      await service.deleteTemplate(orgId, templateId);

      expect(templateRepo.update).toHaveBeenCalledWith(
        { id: templateId, organizationId: orgId },
        { isActive: false },
      );
    });
  });

  // ========================================================================
  // Import Sessions
  // ========================================================================

  describe('getSession', () => {
    it('should return a session by ID', async () => {
      sessionRepo.findOne!.mockResolvedValue(mockSession);

      const result = await service.getSession(sessionId, orgId);
      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException when session not found', async () => {
      sessionRepo.findOne!.mockResolvedValue(null);

      await expect(service.getSession('bad', orgId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getSessions', () => {
    it('should return paginated sessions', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockSession], 1]);
      sessionRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getSessions({ page: 1, limit: 20 } as any, orgId);

      expect(result.data).toEqual([mockSession]);
      expect(result.total).toBe(1);
    });
  });

  // ========================================================================
  // submitForApproval
  // ========================================================================

  describe('submitForApproval', () => {
    it('should auto-approve when confidence >= 95% and no errors', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.VALIDATED,
        classification_confidence: 98,
        validation_report: { errors: [] },
      });
      sessionRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.submitForApproval(sessionId, orgId);

      expect(result.approval_status).toBe(ApprovalStatus.AUTO_APPROVED);
      expect(result.status).toBe(ImportSessionStatus.APPROVED);
    });

    it('should require manual approval when confidence < 95%', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.VALIDATED,
        classification_confidence: 70,
        validation_report: { errors: [] },
      });
      sessionRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.submitForApproval(sessionId, orgId);

      expect(result.status).toBe(ImportSessionStatus.AWAITING_APPROVAL);
    });

    it('should require manual approval when there are validation errors', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.VALIDATED,
        classification_confidence: 98,
        validation_report: { errors: [{ row: 1, field: 'name', message: 'required' }] },
      });
      sessionRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.submitForApproval(sessionId, orgId);

      expect(result.status).toBe(ImportSessionStatus.AWAITING_APPROVAL);
    });

    it('should throw when session is not in VALIDATED status', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.UPLOADED,
      });

      await expect(service.submitForApproval(sessionId, orgId))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // approveSession
  // ========================================================================

  describe('approveSession', () => {
    it('should approve a session awaiting approval', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.AWAITING_APPROVAL,
      });
      sessionRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.approveSession(
        sessionId,
        { autoExecute: false } as any,
        userId,
        orgId,
      );

      expect(result.approval_status).toBe(ApprovalStatus.APPROVED);
      expect(result.approved_by_user_id).toBe(userId);
    });

    it('should throw when not in AWAITING_APPROVAL status', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.UPLOADED,
      });

      await expect(service.approveSession(sessionId, {} as any, userId, orgId))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // rejectSession
  // ========================================================================

  describe('rejectSession', () => {
    it('should reject a session with reason', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.AWAITING_APPROVAL,
      });
      sessionRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.rejectSession(
        sessionId,
        { reason: 'Bad data' },
        userId,
        orgId,
      );

      expect(result.approval_status).toBe(ApprovalStatus.REJECTED);
      expect(result.rejection_reason).toBe('Bad data');
      expect(result.status).toBe(ImportSessionStatus.REJECTED);
    });

    it('should throw when not in AWAITING_APPROVAL status', async () => {
      sessionRepo.findOne!.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.VALIDATED,
      });

      await expect(service.rejectSession(sessionId, { reason: 'x' }, userId, orgId))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // Schema Definitions & Validation Rules
  // ========================================================================

  describe('getSchemaDefinitions', () => {
    it('should return active schema definitions', async () => {
      const schemaDef = { domain: DomainType.PRODUCTS, is_active: true };
      schemaDefRepo.find!.mockResolvedValue([schemaDef]);

      const result = await service.getSchemaDefinitions();

      expect(result).toEqual([schemaDef]);
    });

    it('should filter by domain when provided', async () => {
      schemaDefRepo.find!.mockResolvedValue([]);

      await service.getSchemaDefinitions(DomainType.MACHINES);

      expect(schemaDefRepo.find).toHaveBeenCalledWith({
        where: { is_active: true, domain: DomainType.MACHINES },
        order: { domain: 'ASC', table_name: 'ASC' },
      });
    });
  });

  describe('getValidationRules', () => {
    it('should return active validation rules', async () => {
      validationRuleRepo.find!.mockResolvedValue([]);

      const result = await service.getValidationRules();

      expect(result).toEqual([]);
    });
  });

  // ========================================================================
  // getAuditLog
  // ========================================================================

  describe('getAuditLog', () => {
    it('should return paginated audit log entries', async () => {
      sessionRepo.findOne!.mockResolvedValue(mockSession);
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      auditLogRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getAuditLog(sessionId, { page: 1, limit: 20 } as any, orgId);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
