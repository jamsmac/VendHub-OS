import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, ObjectLiteral } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ImportService } from "./import.service";
import {
  ImportJob,
  ImportType,
  ImportStatus,
  ImportSource,
} from "./entities/import.entity";
import {
  ImportSession,
  ImportSessionStatus,
  DomainType,
  ApprovalStatus,
} from "./entities/import-session.entity";
import { ImportParserService } from "./services/import-parser.service";
import { ImportValidatorService } from "./services/import-validator.service";
import { ImportTemplateService } from "./services/import-template.service";
import { ImportSessionService } from "./services/import-session.service";

type MockRepository<T extends ObjectLiteral> = Partial<
  Record<keyof Repository<T>, jest.Mock>
>;
const createMockRepository = <
  T extends ObjectLiteral,
>(): MockRepository<T> => ({
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

describe("ImportService", () => {
  let service: ImportService;
  let importJobRepo: MockRepository<ImportJob>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let parserService: Record<string, jest.Mock>;
  let validatorService: Record<string, jest.Mock>;
  let templateService: Record<string, jest.Mock>;
  let sessionService: Record<string, jest.Mock>;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";
  const jobId = "job-uuid-1";
  const sessionId = "session-uuid-1";
  const templateId = "template-uuid-1";

  const mockJob: Partial<ImportJob> = {
    id: jobId,
    organizationId: orgId,
    jobNumber: "IMP-2025-001",
    importType: ImportType.PRODUCTS,
    source: ImportSource.CSV,
    status: ImportStatus.PENDING,
    totalRows: 0,
    processedRows: 0,
    successfulRows: 0,
    failedRows: 0,
    skippedRows: 0,
    createdByUserId: userId,
  };

  const mockSession: Partial<ImportSession> = {
    id: sessionId,
    organization_id: orgId,
    domain: DomainType.PRODUCTS,
    status: ImportSessionStatus.UPLOADED,
    approval_status: ApprovalStatus.PENDING,
    file_name: "products.csv",
    file_size: 1024,
    file_type: "csv",
    file_metadata: {
      rows: 10,
      columns: 3,
      headers: ["name", "price", "category"],
      sampleData: [
        { name: "Cola", price: 5000, category: "beverage" },
        { name: "Snickers", price: 8000, category: "snack" },
      ],
    },
    column_mapping: null,
    classification_confidence: null,
    uploaded_by_user_id: userId,
  };

  const mockTemplate = {
    id: templateId,
    organizationId: orgId,
    name: "Products Template",
    importType: ImportType.PRODUCTS,
    source: ImportSource.CSV,
    isActive: true,
    createdByUserId: userId,
  };

  beforeEach(async () => {
    importJobRepo = createMockRepository<ImportJob>();
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    parserService = {
      parseCSV: jest.fn(),
      parseExcel: jest.fn(),
      parseJSON: jest.fn(),
    };

    validatorService = {
      getValidator: jest.fn(),
      applyMapping: jest.fn(),
      getValidationRules: jest.fn(),
    };

    templateService = {
      createTemplate: jest.fn(),
      getTemplates: jest.fn(),
      getTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    };

    sessionService = {
      createSession: jest.fn(),
      classifySession: jest.fn(),
      validateSession: jest.fn(),
      submitForApproval: jest.fn(),
      approveSession: jest.fn(),
      rejectSession: jest.fn(),
      executeImportSession: jest.fn(),
      getSessions: jest.fn(),
      getSession: jest.fn(),
      getAuditLog: jest.fn(),
      getSchemaDefinitions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: getRepositoryToken(ImportJob), useValue: importJobRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ImportParserService, useValue: parserService },
        { provide: ImportValidatorService, useValue: validatorService },
        { provide: ImportTemplateService, useValue: templateService },
        { provide: ImportSessionService, useValue: sessionService },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ========================================================================
  // createImportJob
  // ========================================================================

  describe("createImportJob", () => {
    it("should create an import job with PENDING status", async () => {
      importJobRepo.create!.mockReturnValue(mockJob);
      importJobRepo.save!.mockResolvedValue(mockJob);

      const result = await service.createImportJob(
        orgId,
        userId,
        ImportType.PRODUCTS,
        ImportSource.CSV,
        "products.csv",
      );

      expect(importJobRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          status: ImportStatus.PENDING,
          createdByUserId: userId,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "import.created",
        expect.any(Object),
      );
      expect(result).toEqual(mockJob);
    });
  });

  // ========================================================================
  // getImportJob
  // ========================================================================

  describe("getImportJob", () => {
    it("should return import job when found", async () => {
      importJobRepo.findOne!.mockResolvedValue(mockJob);

      const result = await service.getImportJob(orgId, jobId);
      expect(result).toEqual(mockJob);
    });

    it("should throw NotFoundException when not found", async () => {
      importJobRepo.findOne!.mockResolvedValue(null);

      await expect(service.getImportJob(orgId, "bad")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========================================================================
  // listImportJobs
  // ========================================================================

  describe("listImportJobs", () => {
    it("should return paginated list of import jobs", async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockJob], 1]);
      importJobRepo.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.listImportJobs(orgId, {}, 1, 20);

      expect(result.data).toEqual([mockJob]);
      expect(result.total).toBe(1);
    });

    it("should apply filters", async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      importJobRepo.createQueryBuilder!.mockReturnValue(qb);

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

  describe("cancelImportJob", () => {
    it("should cancel a pending import job", async () => {
      importJobRepo.findOne!.mockResolvedValue({
        ...mockJob,
        status: ImportStatus.PENDING,
      });
      importJobRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.cancelImportJob(orgId, jobId, userId);

      expect(result.status).toBe(ImportStatus.CANCELLED);
      expect(result.cancelledByUserId).toBe(userId);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "import.cancelled",
        expect.any(Object),
      );
    });

    it("should throw BadRequestException when job is in non-cancellable status", async () => {
      importJobRepo.findOne!.mockResolvedValue({
        ...mockJob,
        status: ImportStatus.COMPLETED,
      });

      await expect(
        service.cancelImportJob(orgId, jobId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // parseCSV (delegated to parserService)
  // ========================================================================

  describe("parseCSV", () => {
    it("should delegate to parserService.parseCSV", async () => {
      const mockResult = {
        headers: ["name", "price", "category"],
        rows: [
          { name: "Cola", price: "5000", category: "beverage" },
          { name: "Snickers", price: "8000", category: "snack" },
        ],
      };
      parserService.parseCSV.mockResolvedValue(mockResult);

      const buffer = Buffer.from("csv data", "utf-8");
      const result = await service.parseCSV(buffer);

      expect(parserService.parseCSV).toHaveBeenCalledWith(buffer, undefined);
      expect(result.headers).toEqual(["name", "price", "category"]);
      expect(result.rows).toHaveLength(2);
    });

    it("should pass options to parserService", async () => {
      parserService.parseCSV.mockResolvedValue({ headers: [], rows: [] });

      const buffer = Buffer.from("csv data", "utf-8");
      await service.parseCSV(buffer, { delimiter: ";" });

      expect(parserService.parseCSV).toHaveBeenCalledWith(buffer, {
        delimiter: ";",
      });
    });
  });

  // ========================================================================
  // parseJSON (delegated to parserService)
  // ========================================================================

  describe("parseJSON", () => {
    it("should delegate to parserService.parseJSON", async () => {
      const mockResult = {
        headers: ["name", "price"],
        rows: [
          { name: "Cola", price: 5000 },
          { name: "Fanta", price: 5000 },
        ],
      };
      parserService.parseJSON.mockResolvedValue(mockResult);

      const buffer = Buffer.from("[]", "utf-8");
      const result = await service.parseJSON(buffer);

      expect(parserService.parseJSON).toHaveBeenCalledWith(buffer);
      expect(result.rows).toHaveLength(2);
    });

    it("should propagate BadRequestException from parserService", async () => {
      parserService.parseJSON.mockRejectedValue(
        new BadRequestException("Invalid JSON"),
      );

      const buffer = Buffer.from("not json", "utf-8");
      await expect(service.parseJSON(buffer)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ========================================================================
  // validateImportData
  // ========================================================================

  describe("validateImportData", () => {
    it("should validate product rows using validatorService", async () => {
      importJobRepo.findOne!.mockResolvedValue({ ...mockJob });
      importJobRepo.save!.mockImplementation(async (entity) => entity);

      const mockValidator = (row: Record<string, string>) => {
        const errors: { field: string; message: string }[] = [];
        if (!row.name) errors.push({ field: "name", message: "required" });
        return { errors, warnings: [] };
      };
      validatorService.getValidator.mockReturnValue(mockValidator);

      const rows = [
        { name: "Cola", price: "5000", category: "beverage" },
        { name: "", price: "8000", category: "snack" },
      ];

      const result = await service.validateImportData(
        orgId,
        jobId,
        rows,
        ImportType.PRODUCTS,
      );

      expect(result.validRows.length).toBeGreaterThanOrEqual(1);
      expect(result.invalidRows.length).toBeGreaterThanOrEqual(1);
    });

    it("should set job status to VALIDATION_FAILED when all rows are invalid", async () => {
      importJobRepo.findOne!.mockResolvedValue({ ...mockJob });
      importJobRepo.save!.mockImplementation(async (entity) => entity);

      const mockValidator = () => ({
        errors: [{ field: "name", message: "required" }],
        warnings: [],
      });
      validatorService.getValidator.mockReturnValue(mockValidator);

      const rows = [{ name: "", price: "5000" }];

      const result = await service.validateImportData(
        orgId,
        jobId,
        rows,
        ImportType.PRODUCTS,
      );

      expect(result.invalidRows).toHaveLength(1);
    });

    it("should apply field mapping before validation", async () => {
      importJobRepo.findOne!.mockResolvedValue({ ...mockJob });
      importJobRepo.save!.mockImplementation(async (entity) => entity);

      const mockValidatorMapping = (row: Record<string, string>) => {
        const errors: { field: string; message: string }[] = [];
        if (!row.name) errors.push({ field: "name", message: "required" });
        return { errors, warnings: [] };
      };
      validatorService.getValidator.mockReturnValue(mockValidatorMapping);
      validatorService.applyMapping.mockImplementation(
        (row: Record<string, string>, mapping: Record<string, string>) => {
          const mapped: Record<string, string> = {};
          for (const [from, to] of Object.entries(mapping)) {
            if (row[from] !== undefined) mapped[to] = row[from];
          }
          // Copy unmapped fields
          for (const [key, val] of Object.entries(row)) {
            if (!mapping[key]) mapped[key] = val;
          }
          return mapped;
        },
      );

      const rows = [{ product_name: "Cola", cost: "5000" }];
      const mapping = { product_name: "name", cost: "price" };

      const result = await service.validateImportData(
        orgId,
        jobId,
        rows,
        ImportType.PRODUCTS,
        mapping,
      );

      expect(result.validRows).toHaveLength(1);
    });
  });

  // ========================================================================
  // Templates (delegated to templateService)
  // ========================================================================

  describe("createTemplate", () => {
    it("should delegate to templateService", async () => {
      templateService.createTemplate.mockResolvedValue(mockTemplate);

      const result = await service.createTemplate(orgId, userId, {
        name: "Products Template",
        importType: ImportType.PRODUCTS,
      });

      expect(templateService.createTemplate).toHaveBeenCalledWith(
        orgId,
        userId,
        expect.objectContaining({ name: "Products Template" }),
      );
      expect(result).toEqual(mockTemplate);
    });
  });

  describe("getTemplates", () => {
    it("should delegate to templateService", async () => {
      templateService.getTemplates.mockResolvedValue([mockTemplate]);

      const result = await service.getTemplates(orgId);

      expect(templateService.getTemplates).toHaveBeenCalledWith(
        orgId,
        undefined,
      );
      expect(result).toEqual([mockTemplate]);
    });

    it("should pass importType filter", async () => {
      templateService.getTemplates.mockResolvedValue([]);

      await service.getTemplates(orgId, ImportType.MACHINES);

      expect(templateService.getTemplates).toHaveBeenCalledWith(
        orgId,
        ImportType.MACHINES,
      );
    });
  });

  describe("getTemplate", () => {
    it("should delegate to templateService", async () => {
      templateService.getTemplate.mockResolvedValue(mockTemplate);

      const result = await service.getTemplate(orgId, templateId);
      expect(result).toEqual(mockTemplate);
    });

    it("should propagate NotFoundException from templateService", async () => {
      templateService.getTemplate.mockRejectedValue(
        new NotFoundException("Template not found"),
      );

      await expect(service.getTemplate(orgId, "bad")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("deleteTemplate", () => {
    it("should delegate to templateService", async () => {
      templateService.deleteTemplate.mockResolvedValue(undefined);

      await service.deleteTemplate(orgId, templateId);

      expect(templateService.deleteTemplate).toHaveBeenCalledWith(
        orgId,
        templateId,
      );
    });
  });

  // ========================================================================
  // Import Sessions (delegated to sessionService)
  // ========================================================================

  describe("getSession", () => {
    it("should delegate to sessionService", async () => {
      sessionService.getSession.mockResolvedValue(mockSession);

      const result = await service.getSession(sessionId, orgId);
      expect(result).toEqual(mockSession);
    });

    it("should propagate NotFoundException from sessionService", async () => {
      sessionService.getSession.mockRejectedValue(
        new NotFoundException("Session not found"),
      );

      await expect(service.getSession("bad", orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getSessions", () => {
    it("should delegate to sessionService", async () => {
      sessionService.getSessions.mockResolvedValue({
        data: [mockSession],
        total: 1,
      });

      const result = await service.getSessions({ page: 1, limit: 20 }, orgId);

      expect(result.data).toEqual([mockSession]);
      expect(result.total).toBe(1);
    });
  });

  // ========================================================================
  // submitForApproval (delegated to sessionService)
  // ========================================================================

  describe("submitForApproval", () => {
    it("should delegate to sessionService", async () => {
      sessionService.submitForApproval.mockResolvedValue({
        ...mockSession,
        status: ImportSessionStatus.APPROVED,
        approval_status: ApprovalStatus.AUTO_APPROVED,
      });

      const result = await service.submitForApproval(sessionId, orgId);

      expect(sessionService.submitForApproval).toHaveBeenCalledWith(
        sessionId,
        orgId,
      );
      expect(result.approval_status).toBe(ApprovalStatus.AUTO_APPROVED);
    });

    it("should propagate BadRequestException from sessionService", async () => {
      sessionService.submitForApproval.mockRejectedValue(
        new BadRequestException("Not in VALIDATED status"),
      );

      await expect(service.submitForApproval(sessionId, orgId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ========================================================================
  // approveSession (delegated to sessionService)
  // ========================================================================

  describe("approveSession", () => {
    it("should delegate to sessionService", async () => {
      sessionService.approveSession.mockResolvedValue({
        ...mockSession,
        approval_status: ApprovalStatus.APPROVED,
        approved_by_user_id: userId,
      });

      const result = await service.approveSession(
        sessionId,
        { autoExecute: false },
        userId,
        orgId,
      );

      expect(result.approval_status).toBe(ApprovalStatus.APPROVED);
      expect(result.approved_by_user_id).toBe(userId);
    });

    it("should propagate BadRequestException from sessionService", async () => {
      sessionService.approveSession.mockRejectedValue(
        new BadRequestException("Not awaiting approval"),
      );

      await expect(
        service.approveSession(sessionId, {}, userId, orgId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // rejectSession (delegated to sessionService)
  // ========================================================================

  describe("rejectSession", () => {
    it("should delegate to sessionService", async () => {
      sessionService.rejectSession.mockResolvedValue({
        ...mockSession,
        approval_status: ApprovalStatus.REJECTED,
        rejection_reason: "Bad data",
        status: ImportSessionStatus.REJECTED,
      });

      const result = await service.rejectSession(
        sessionId,
        { reason: "Bad data" },
        userId,
        orgId,
      );

      expect(result.approval_status).toBe(ApprovalStatus.REJECTED);
      expect(result.rejection_reason).toBe("Bad data");
    });
  });

  // ========================================================================
  // Schema Definitions & Validation Rules (delegated)
  // ========================================================================

  describe("getSchemaDefinitions", () => {
    it("should delegate to sessionService", async () => {
      const schemaDef = { domain: DomainType.PRODUCTS, is_active: true };
      sessionService.getSchemaDefinitions.mockResolvedValue([schemaDef]);

      const result = await service.getSchemaDefinitions();

      expect(result).toEqual([schemaDef]);
    });

    it("should pass domain filter", async () => {
      sessionService.getSchemaDefinitions.mockResolvedValue([]);

      await service.getSchemaDefinitions(DomainType.MACHINES);

      expect(sessionService.getSchemaDefinitions).toHaveBeenCalledWith(
        DomainType.MACHINES,
      );
    });
  });

  describe("getValidationRules", () => {
    it("should delegate to validatorService", async () => {
      validatorService.getValidationRules.mockResolvedValue([]);

      const result = await service.getValidationRules();

      expect(result).toEqual([]);
    });
  });

  // ========================================================================
  // getAuditLog (delegated to sessionService)
  // ========================================================================

  describe("getAuditLog", () => {
    it("should delegate to sessionService", async () => {
      sessionService.getAuditLog.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await service.getAuditLog(
        sessionId,
        { page: 1, limit: 20 },
        orgId,
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
