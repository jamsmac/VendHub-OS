import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";
import {
  ImportSource,
  ImportStatus,
  ImportType,
} from "./entities/import.entity";
import { DomainType } from "./entities/import-session.entity";

// ============================================================================
// Mock service
// ============================================================================

const mockImportService = {
  parseCSV: jest.fn(),
  parseExcel: jest.fn(),
  parseJSON: jest.fn(),
  createImportJob: jest.fn(),
  getImportJob: jest.fn(),
  listImportJobs: jest.fn(),
  cancelImportJob: jest.fn(),
  validateImportData: jest.fn(),
  createTemplate: jest.fn(),
  getTemplates: jest.fn(),
  getTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  createSession: jest.fn(),
  getSessions: jest.fn(),
  getSession: jest.fn(),
  classifySession: jest.fn(),
  validateSession: jest.fn(),
  submitForApproval: jest.fn(),
  approveSession: jest.fn(),
  rejectSession: jest.fn(),
  executeImportSession: jest.fn(),
  getAuditLog: jest.fn(),
  getSchemaDefinitions: jest.fn(),
  getValidationRules: jest.fn(),
};

// ============================================================================
// Helpers
// ============================================================================

const ORG_ID = "org-1";
const USER_ID = "user-1";

function makeUser(
  overrides: Partial<{ id: string; organizationId: string }> = {},
) {
  return {
    id: USER_ID,
    organizationId: ORG_ID,
    ...overrides,
  };
}

function makeFile(
  name = "data.csv",
  content = "col1,col2\nval1,val2",
): Express.Multer.File {
  return {
    originalname: name,
    buffer: Buffer.from(content),
    fieldname: "file",
    encoding: "7bit",
    mimetype: "text/csv",
    size: Buffer.byteLength(content),
    destination: "",
    filename: name,
    path: "",
    stream: null as any,
  } as Express.Multer.File;
}

// ============================================================================
// Test suite
// ============================================================================

describe("ImportController (unit)", () => {
  let controller: ImportController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportController],
      providers: [{ provide: ImportService, useValue: mockImportService }],
    })
      .overrideGuard(require("../auth/guards/jwt-auth.guard").JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require("../../common/guards").RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ImportController>(ImportController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ==========================================================================
  // uploadAndCreateJob
  // ==========================================================================

  describe("uploadAndCreateJob", () => {
    it("should throw BadRequestException when no file provided", async () => {
      await expect(
        controller.uploadAndCreateJob(
          ORG_ID,
          makeUser() as any,
          undefined as any,
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockImportService.parseCSV).not.toHaveBeenCalled();
    });

    it("should route .csv to parseCSV and return job + preview", async () => {
      const file = makeFile("products.csv");
      const parsed = {
        headers: ["name", "price"],
        rows: [
          { rowNumber: 1, data: { name: "Coke", price: "2000" } },
          { rowNumber: 2, data: { name: "Pepsi", price: "1800" } },
        ],
        source: ImportSource.CSV,
      };
      const job = { id: "job-1", importType: "products" };
      mockImportService.parseCSV.mockResolvedValue(parsed);
      mockImportService.createImportJob.mockResolvedValue(job);

      const result = await controller.uploadAndCreateJob(
        ORG_ID,
        makeUser() as any,
        file,
        { importType: "products" } as any,
      );

      expect(mockImportService.parseCSV).toHaveBeenCalledWith(file.buffer, {
        delimiter: undefined,
      });
      expect(mockImportService.createImportJob).toHaveBeenCalled();
      expect(result.job).toEqual(job);
      expect(result.preview.headers).toEqual(["name", "price"]);
    });

    it("should route .xlsx to parseExcel", async () => {
      const file = makeFile("data.xlsx");
      const parsed = {
        headers: ["col1"],
        rows: [],
        source: ImportSource.EXCEL,
      };
      const job = { id: "job-2" };
      mockImportService.parseExcel.mockResolvedValue(parsed);
      mockImportService.createImportJob.mockResolvedValue(job);

      await controller.uploadAndCreateJob(ORG_ID, makeUser() as any, file, {
        importType: "machines",
      } as any);

      expect(mockImportService.parseExcel).toHaveBeenCalledWith(file.buffer);
      expect(mockImportService.parseCSV).not.toHaveBeenCalled();
    });

    it("should route .xls to parseExcel", async () => {
      const file = makeFile("data.xls");
      const parsed = {
        headers: ["col1"],
        rows: [],
        source: ImportSource.EXCEL,
      };
      mockImportService.parseExcel.mockResolvedValue(parsed);
      mockImportService.createImportJob.mockResolvedValue({ id: "job-3" });

      await controller.uploadAndCreateJob(ORG_ID, makeUser() as any, file, {
        importType: "machines",
      } as any);

      expect(mockImportService.parseExcel).toHaveBeenCalled();
    });

    it("should route .json to parseJSON", async () => {
      const file = makeFile("data.json", '[{"col1":"val1"}]');
      const parsed = { headers: ["col1"], rows: [], source: ImportSource.JSON };
      mockImportService.parseJSON.mockResolvedValue(parsed);
      mockImportService.createImportJob.mockResolvedValue({ id: "job-4" });

      await controller.uploadAndCreateJob(ORG_ID, makeUser() as any, file, {
        importType: "users",
      } as any);

      expect(mockImportService.parseJSON).toHaveBeenCalledWith(file.buffer);
    });

    it("should throw BadRequestException for unsupported file extension", async () => {
      const file = makeFile("data.txt");

      await expect(
        controller.uploadAndCreateJob(ORG_ID, makeUser() as any, file, {
          importType: "products",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should include up to 5 sample rows in preview", async () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        rowNumber: i + 1,
        data: { col: `val${i}` },
      }));
      const parsed = { headers: ["col"], rows, source: ImportSource.CSV };
      mockImportService.parseCSV.mockResolvedValue(parsed);
      mockImportService.createImportJob.mockResolvedValue({ id: "job-5" });

      const result = await controller.uploadAndCreateJob(
        ORG_ID,
        makeUser() as any,
        makeFile("big.csv"),
        { importType: "products" } as any,
      );

      expect(result.preview.sampleRows.length).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // validateImport
  // ==========================================================================

  describe("validateImport", () => {
    it("should assemble validation summary from service result", async () => {
      const job = { id: "job-1", headers: ["name", "price"] };
      const validationResult = {
        validRows: [{ rowNumber: 1 }],
        invalidRows: [
          {
            rowNumber: 2,
            errors: [{ field: "price", message: "Invalid number" }],
          },
        ],
        warnings: ["Some warning"],
      };
      mockImportService.getImportJob.mockResolvedValue(job);
      mockImportService.validateImportData.mockResolvedValue(validationResult);

      const dto = {
        rows: [{ rowNumber: 1 }, { rowNumber: 2 }],
        fieldMappings: {},
      } as any;

      const result = await controller.validateImport(ORG_ID, "job-1", dto);

      expect(mockImportService.getImportJob).toHaveBeenCalledWith(
        ORG_ID,
        "job-1",
      );
      expect(result.jobId).toBe("job-1");
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 2, field: "price" });
      expect(result.warnings).toEqual(["Some warning"]);
    });

    it("should return zero counts when all rows are valid", async () => {
      const job = { id: "job-2" };
      const validationResult = {
        validRows: [{ rowNumber: 1 }, { rowNumber: 2 }],
        invalidRows: [],
        warnings: [],
      };
      mockImportService.getImportJob.mockResolvedValue(job);
      mockImportService.validateImportData.mockResolvedValue(validationResult);

      const dto = {
        rows: [{ rowNumber: 1 }, { rowNumber: 2 }],
        fieldMappings: {},
      } as any;
      const result = await controller.validateImport(ORG_ID, "job-2", dto);

      expect(result.invalidRows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // executeImport — static stub, no service calls
  // ==========================================================================

  describe("executeImport", () => {
    it("should return processing status without calling any service method", async () => {
      const result = await controller.executeImport(
        ORG_ID,
        makeUser() as any,
        "job-1",
        {} as any,
      );

      expect(result).toMatchObject({
        jobId: "job-1",
        status: "processing",
      });
      expect(typeof result.message).toBe("string");

      // Static stub — no service calls
      expect(mockImportService.getImportJob).not.toHaveBeenCalled();
      expect(mockImportService.validateImportData).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // listJobs
  // ==========================================================================

  describe("listJobs", () => {
    it("should delegate with filters and default pagination", async () => {
      const jobs = [{ id: "job-1" }];
      mockImportService.listImportJobs.mockResolvedValue(jobs);

      const result = await controller.listJobs(
        ORG_ID,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(mockImportService.listImportJobs).toHaveBeenCalledWith(
        ORG_ID,
        { importType: undefined, status: undefined },
        1,
        20,
      );
      expect(result).toEqual(jobs);
    });

    it("should pass explicit page and limit values", async () => {
      mockImportService.listImportJobs.mockResolvedValue([]);

      await controller.listJobs(
        ORG_ID,
        ImportType.PRODUCTS,
        ImportStatus.COMPLETED,
        3,
        50,
      );

      expect(mockImportService.listImportJobs).toHaveBeenCalledWith(
        ORG_ID,
        { importType: ImportType.PRODUCTS, status: ImportStatus.COMPLETED },
        3,
        50,
      );
    });
  });

  // ==========================================================================
  // getJob
  // ==========================================================================

  describe("getJob", () => {
    it("should delegate to service with organizationId and id", async () => {
      const job = { id: "job-1", status: "pending" };
      mockImportService.getImportJob.mockResolvedValue(job);

      const result = await controller.getJob(ORG_ID, "job-1");

      expect(mockImportService.getImportJob).toHaveBeenCalledWith(
        ORG_ID,
        "job-1",
      );
      expect(result).toEqual(job);
    });
  });

  // ==========================================================================
  // cancelJob
  // ==========================================================================

  describe("cancelJob", () => {
    it("should delegate with organizationId, id, and userId", async () => {
      const cancelled = { id: "job-1", status: "cancelled" };
      mockImportService.cancelImportJob.mockResolvedValue(cancelled);

      const result = await controller.cancelJob(
        ORG_ID,
        makeUser() as any,
        "job-1",
      );

      expect(mockImportService.cancelImportJob).toHaveBeenCalledWith(
        ORG_ID,
        "job-1",
        USER_ID,
      );
      expect(result).toEqual(cancelled);
    });
  });

  // ==========================================================================
  // createTemplate
  // ==========================================================================

  describe("createTemplate", () => {
    it("should delegate with organizationId, userId, and dto", async () => {
      const template = { id: "tmpl-1", name: "Product import" };
      mockImportService.createTemplate.mockResolvedValue(template);

      const dto = {
        name: "Product import",
        importType: ImportType.PRODUCTS,
      } as any;
      const result = await controller.createTemplate(
        ORG_ID,
        makeUser() as any,
        dto,
      );

      expect(mockImportService.createTemplate).toHaveBeenCalledWith(
        ORG_ID,
        USER_ID,
        dto,
      );
      expect(result).toEqual(template);
    });
  });

  // ==========================================================================
  // listTemplates
  // ==========================================================================

  describe("listTemplates", () => {
    it("should return all templates when no importType filter", async () => {
      const templates = [{ id: "tmpl-1" }, { id: "tmpl-2" }];
      mockImportService.getTemplates.mockResolvedValue(templates);

      const result = await controller.listTemplates(ORG_ID, undefined);

      expect(mockImportService.getTemplates).toHaveBeenCalledWith(
        ORG_ID,
        undefined,
      );
      expect(result).toEqual(templates);
    });

    it("should filter templates by importType", async () => {
      const templates = [{ id: "tmpl-1", importType: ImportType.PRODUCTS }];
      mockImportService.getTemplates.mockResolvedValue(templates);

      await controller.listTemplates(ORG_ID, ImportType.PRODUCTS);

      expect(mockImportService.getTemplates).toHaveBeenCalledWith(
        ORG_ID,
        ImportType.PRODUCTS,
      );
    });
  });

  // ==========================================================================
  // getTemplate
  // ==========================================================================

  describe("getTemplate", () => {
    it("should delegate to service with organizationId and id", async () => {
      const template = { id: "tmpl-1", name: "Machines" };
      mockImportService.getTemplate.mockResolvedValue(template);

      const result = await controller.getTemplate(ORG_ID, "tmpl-1");

      expect(mockImportService.getTemplate).toHaveBeenCalledWith(
        ORG_ID,
        "tmpl-1",
      );
      expect(result).toEqual(template);
    });
  });

  // ==========================================================================
  // deleteTemplate
  // ==========================================================================

  describe("deleteTemplate", () => {
    it("should call deleteTemplate and return void", async () => {
      mockImportService.deleteTemplate.mockResolvedValue(undefined);

      const result = await controller.deleteTemplate(ORG_ID, "tmpl-1");

      expect(mockImportService.deleteTemplate).toHaveBeenCalledWith(
        ORG_ID,
        "tmpl-1",
      );
      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // createSession
  // ==========================================================================

  describe("createSession", () => {
    it("should throw BadRequestException when no file provided", async () => {
      await expect(
        controller.createSession(
          ORG_ID,
          makeUser() as any,
          undefined as any,
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockImportService.createSession).not.toHaveBeenCalled();
    });

    it("should delegate to service with file, dto, organizationId, userId", async () => {
      const session = { id: "sess-1", status: "uploaded" };
      mockImportService.createSession.mockResolvedValue(session);

      const file = makeFile("inventory.csv");
      const dto = { domain: DomainType.PRODUCTS } as any;

      const result = await controller.createSession(
        ORG_ID,
        makeUser() as any,
        file,
        dto,
      );

      expect(mockImportService.createSession).toHaveBeenCalledWith(
        file,
        dto,
        ORG_ID,
        USER_ID,
      );
      expect(result).toEqual(session);
    });
  });

  // ==========================================================================
  // listSessions
  // ==========================================================================

  describe("listSessions", () => {
    it("should delegate to getSessions with query and organizationId", async () => {
      const paginated = {
        data: [{ id: "sess-1" }],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockImportService.getSessions.mockResolvedValue(paginated);

      const query = { page: 1, limit: 20 } as any;
      const result = await controller.listSessions(ORG_ID, query);

      expect(mockImportService.getSessions).toHaveBeenCalledWith(query, ORG_ID);
      expect(result).toEqual(paginated);
    });
  });

  // ==========================================================================
  // getSession — NOTE: service args are REVERSED (id first, orgId second)
  // ==========================================================================

  describe("getSession", () => {
    it("should call service.getSession(id, organizationId) — reversed arg order", async () => {
      const session = { id: "sess-1", domain: DomainType.MACHINES };
      mockImportService.getSession.mockResolvedValue(session);

      const result = await controller.getSession(ORG_ID, "sess-1");

      expect(mockImportService.getSession).toHaveBeenCalledWith(
        "sess-1",
        ORG_ID,
      );
      expect(result).toEqual(session);
    });
  });

  // ==========================================================================
  // classifySession
  // ==========================================================================

  describe("classifySession", () => {
    it("should call service.classifySession(id, dto, organizationId)", async () => {
      const classified = { id: "sess-1", domain: DomainType.PRODUCTS };
      mockImportService.classifySession.mockResolvedValue(classified);

      const dto = { domain: DomainType.PRODUCTS, fieldMappings: {} } as any;
      const result = await controller.classifySession(ORG_ID, "sess-1", dto);

      expect(mockImportService.classifySession).toHaveBeenCalledWith(
        "sess-1",
        dto,
        ORG_ID,
      );
      expect(result).toEqual(classified);
    });
  });

  // ==========================================================================
  // validateSession — ignores _dto, only passes id and organizationId
  // ==========================================================================

  describe("validateSession", () => {
    it("should call service.validateSession(id, organizationId) ignoring dto", async () => {
      const validated = { id: "sess-1", validRowCount: 10, invalidRowCount: 0 };
      mockImportService.validateSession.mockResolvedValue(validated);

      const dto = { someField: "someValue" } as any;
      const result = await controller.validateSession(ORG_ID, "sess-1", dto);

      // dto is ignored — service only receives id and organizationId
      expect(mockImportService.validateSession).toHaveBeenCalledWith(
        "sess-1",
        ORG_ID,
      );
      expect(result).toEqual(validated);
    });
  });

  // ==========================================================================
  // submitForApproval
  // ==========================================================================

  describe("submitForApproval", () => {
    it("should call service.submitForApproval(id, organizationId)", async () => {
      const session = { id: "sess-1", approvalStatus: "pending" };
      mockImportService.submitForApproval.mockResolvedValue(session);

      const result = await controller.submitForApproval(ORG_ID, "sess-1");

      expect(mockImportService.submitForApproval).toHaveBeenCalledWith(
        "sess-1",
        ORG_ID,
      );
      expect(result).toEqual(session);
    });
  });

  // ==========================================================================
  // approveSession
  // ==========================================================================

  describe("approveSession", () => {
    it("should call service.approveSession(id, dto, userId, organizationId)", async () => {
      const session = { id: "sess-1", approvalStatus: "approved" };
      mockImportService.approveSession.mockResolvedValue(session);

      const dto = { notes: "Looks good" } as any;
      const result = await controller.approveSession(
        ORG_ID,
        makeUser() as any,
        "sess-1",
        dto,
      );

      expect(mockImportService.approveSession).toHaveBeenCalledWith(
        "sess-1",
        dto,
        USER_ID,
        ORG_ID,
      );
      expect(result).toEqual(session);
    });
  });

  // ==========================================================================
  // rejectSession
  // ==========================================================================

  describe("rejectSession", () => {
    it("should call service.rejectSession(id, dto, userId, organizationId)", async () => {
      const session = { id: "sess-1", approvalStatus: "rejected" };
      mockImportService.rejectSession.mockResolvedValue(session);

      const dto = { reason: "Data quality issues" } as any;
      const result = await controller.rejectSession(
        ORG_ID,
        makeUser() as any,
        "sess-1",
        dto,
      );

      expect(mockImportService.rejectSession).toHaveBeenCalledWith(
        "sess-1",
        dto,
        USER_ID,
        ORG_ID,
      );
      expect(result).toEqual(session);
    });
  });

  // ==========================================================================
  // executeSession
  // ==========================================================================

  describe("executeSession", () => {
    it("should call service.executeImportSession(id, organizationId, userId)", async () => {
      const result_data = { id: "sess-1", importedCount: 42, failedCount: 0 };
      mockImportService.executeImportSession.mockResolvedValue(result_data);

      const result = await controller.executeSession(
        ORG_ID,
        makeUser() as any,
        "sess-1",
      );

      expect(mockImportService.executeImportSession).toHaveBeenCalledWith(
        "sess-1",
        ORG_ID,
        USER_ID,
      );
      expect(result).toEqual(result_data);
    });
  });

  // ==========================================================================
  // getSessionAuditLog
  // ==========================================================================

  describe("getSessionAuditLog", () => {
    it("should call service.getAuditLog(id, query, organizationId)", async () => {
      const log = { data: [{ action: "validate", actor: "user-1" }], total: 1 };
      mockImportService.getAuditLog.mockResolvedValue(log);

      const query = { page: 1, limit: 20 } as any;
      const result = await controller.getSessionAuditLog(
        ORG_ID,
        "sess-1",
        query,
      );

      expect(mockImportService.getAuditLog).toHaveBeenCalledWith(
        "sess-1",
        query,
        ORG_ID,
      );
      expect(result).toEqual(log);
    });
  });

  // ==========================================================================
  // listSchemaDefinitions
  // ==========================================================================

  describe("listSchemaDefinitions", () => {
    it("should return all schema definitions when no domain filter", async () => {
      const schemas = [{ domain: "products" }, { domain: "machines" }];
      mockImportService.getSchemaDefinitions.mockResolvedValue(schemas);

      const result = await controller.listSchemaDefinitions(undefined);

      expect(mockImportService.getSchemaDefinitions).toHaveBeenCalledWith(
        undefined,
      );
      expect(result).toEqual(schemas);
    });

    it("should filter by domain when provided", async () => {
      const schemas = [{ domain: DomainType.PRODUCTS }];
      mockImportService.getSchemaDefinitions.mockResolvedValue(schemas);

      await controller.listSchemaDefinitions(DomainType.PRODUCTS);

      expect(mockImportService.getSchemaDefinitions).toHaveBeenCalledWith(
        DomainType.PRODUCTS,
      );
    });
  });

  // ==========================================================================
  // listValidationRules
  // ==========================================================================

  describe("listValidationRules", () => {
    it("should delegate to service with optional domain", async () => {
      const rules = [{ field: "name", required: true }];
      mockImportService.getValidationRules.mockResolvedValue(rules);

      const result = await controller.listValidationRules(DomainType.MACHINES);

      expect(mockImportService.getValidationRules).toHaveBeenCalledWith(
        DomainType.MACHINES,
      );
      expect(result).toEqual(rules);
    });
  });

  // ==========================================================================
  // getSampleStructure — static stub for known types, no service calls
  // ==========================================================================

  describe("getSampleStructure", () => {
    it("should return sample structure for 'products' without calling service", async () => {
      const result = await controller.getSampleStructure(ImportType.PRODUCTS);

      expect(result).toHaveProperty("columns");
      expect(result).toHaveProperty("sampleRow");
      expect(Array.isArray(result.columns)).toBe(true);
      // Static — no service calls
      expect(mockImportService.getSchemaDefinitions).not.toHaveBeenCalled();
    });

    it("should return sample structure for 'machines' without calling service", async () => {
      const result = await controller.getSampleStructure(ImportType.MACHINES);

      expect(result).toHaveProperty("columns");
      expect(result).toHaveProperty("sampleRow");
      expect(mockImportService.getSchemaDefinitions).not.toHaveBeenCalled();
    });

    it("should return empty structure for unknown importType", async () => {
      const result = await controller.getSampleStructure(
        "unknown_type" as ImportType,
      );

      expect(result).toMatchObject({ columns: [], sampleRow: {} });
    });

    it("should not call any service method for any importType", async () => {
      await controller.getSampleStructure(ImportType.USERS);
      await controller.getSampleStructure(ImportType.INVENTORY);

      // All service methods should remain uncalled
      Object.values(mockImportService).forEach((mockFn) => {
        expect(mockFn).not.toHaveBeenCalled();
      });
    });
  });
});
