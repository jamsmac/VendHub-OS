import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ImportSessionService } from "./import-session.service";
import { ImportParserService } from "./import-parser.service";
import { ImportValidatorService } from "./import-validator.service";
import {
  ImportSession,
  ImportSessionStatus,
  DomainType,
  ApprovalStatus,
} from "../entities/import-session.entity";
import { ImportAuditLog } from "../entities/import-audit-log.entity";
import { SchemaDefinition } from "../entities/schema-definition.entity";

describe("ImportSessionService", () => {
  let service: ImportSessionService;
  let sessionRepo: any;
  let auditLogRepo: any;
  let schemaDefRepo: any;
  let eventEmitter: any;
  let parserService: any;
  let validatorService: any;

  const orgId = "org-uuid-1";
  const userId = "user-uuid-1";

  beforeEach(async () => {
    sessionRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: "session-1", ...entity }),
        ),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    auditLogRepo = {
      create: jest.fn().mockImplementation((data) => ({ ...data })),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    schemaDefRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    parserService = {
      parseCSV: jest.fn(),
      parseExcel: jest.fn(),
      parseJSON: jest.fn(),
    };

    validatorService = {
      getValidationRulesForDomain: jest.fn().mockResolvedValue([]),
      applyValidationRule: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportSessionService,
        { provide: getRepositoryToken(ImportSession), useValue: sessionRepo },
        { provide: getRepositoryToken(ImportAuditLog), useValue: auditLogRepo },
        {
          provide: getRepositoryToken(SchemaDefinition),
          useValue: schemaDefRepo,
        },
        { provide: DataSource, useValue: {} },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: ImportParserService, useValue: parserService },
        { provide: ImportValidatorService, useValue: validatorService },
      ],
    }).compile();

    service = module.get<ImportSessionService>(ImportSessionService);
  });

  // --------------------------------------------------------------------------
  // createSession
  // --------------------------------------------------------------------------

  it("should create a session from a CSV file with domain", async () => {
    const file = {
      originalname: "products.csv",
      size: 1024,
      buffer: Buffer.from("name,price\nCola,1000"),
    } as Express.Multer.File;

    parserService.parseCSV.mockResolvedValue({
      headers: ["name", "price"],
      rows: [{ name: "Cola", price: "1000" }],
    });

    const dto = { domain: DomainType.PRODUCTS };

    await service.createSession(file, dto as any, orgId, userId);

    expect(parserService.parseCSV).toHaveBeenCalledWith(file.buffer);
    expect(sessionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: orgId,
        domain: DomainType.PRODUCTS,
        status: ImportSessionStatus.UPLOADED,
        fileName: "products.csv",
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "import.session.created",
      expect.any(Object),
    );
  });

  it("should reject unsupported file formats", async () => {
    const file = {
      originalname: "data.xml",
      size: 512,
      buffer: Buffer.from("<data/>"),
    } as Express.Multer.File;

    await expect(
      service.createSession(file, {} as any, orgId, userId),
    ).rejects.toThrow(BadRequestException);
  });

  it("should throw when domain cannot be auto-detected", async () => {
    const file = {
      originalname: "data.csv",
      size: 512,
      buffer: Buffer.from("a,b\n1,2"),
    } as Express.Multer.File;

    parserService.parseCSV.mockResolvedValue({
      headers: ["a", "b"],
      rows: [{ a: "1", b: "2" }],
    });
    schemaDefRepo.find.mockResolvedValue([]);

    await expect(
      service.createSession(file, {} as any, orgId, userId),
    ).rejects.toThrow(BadRequestException);
  });

  // --------------------------------------------------------------------------
  // getSession
  // --------------------------------------------------------------------------

  it("should return session by id and orgId", async () => {
    const mockSession = { id: "session-1", organizationId: orgId };
    sessionRepo.findOne.mockResolvedValue(mockSession);

    const result = await service.getSession("session-1", orgId);
    expect(result).toEqual(mockSession);
  });

  it("should throw NotFoundException for missing session", async () => {
    sessionRepo.findOne.mockResolvedValue(null);

    await expect(service.getSession("nonexistent", orgId)).rejects.toThrow(
      NotFoundException,
    );
  });

  // --------------------------------------------------------------------------
  // submitForApproval
  // --------------------------------------------------------------------------

  it("should auto-approve session with high confidence and no errors", async () => {
    const session = {
      id: "session-1",
      organizationId: orgId,
      status: ImportSessionStatus.VALIDATED,
      classificationConfidence: 98,
      validationReport: { errors: [] },
    };
    sessionRepo.findOne.mockResolvedValue(session);

    const result = await service.submitForApproval("session-1", orgId);

    expect(result.approvalStatus).toBe(ApprovalStatus.AUTO_APPROVED);
    expect(result.status).toBe(ImportSessionStatus.APPROVED);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "import.session.auto_approved",
      expect.any(Object),
    );
  });

  it("should require manual approval when confidence is low", async () => {
    const session = {
      id: "session-1",
      organizationId: orgId,
      status: ImportSessionStatus.VALIDATED,
      classificationConfidence: 50,
      validationReport: { errors: [] },
    };
    sessionRepo.findOne.mockResolvedValue(session);

    const result = await service.submitForApproval("session-1", orgId);

    expect(result.status).toBe(ImportSessionStatus.AWAITING_APPROVAL);
  });

  it("should reject submission for non-VALIDATED session", async () => {
    const session = {
      id: "session-1",
      organizationId: orgId,
      status: ImportSessionStatus.UPLOADED,
    };
    sessionRepo.findOne.mockResolvedValue(session);

    await expect(service.submitForApproval("session-1", orgId)).rejects.toThrow(
      BadRequestException,
    );
  });

  // --------------------------------------------------------------------------
  // rejectSession
  // --------------------------------------------------------------------------

  it("should reject session with a reason", async () => {
    const session = {
      id: "session-1",
      organizationId: orgId,
      status: ImportSessionStatus.AWAITING_APPROVAL,
    };
    sessionRepo.findOne.mockResolvedValue(session);

    const result = await service.rejectSession(
      "session-1",
      { reason: "Bad data" },
      userId,
      orgId,
    );

    expect(result.approvalStatus).toBe(ApprovalStatus.REJECTED);
    expect(result.rejectionReason).toBe("Bad data");
    expect(result.status).toBe(ImportSessionStatus.REJECTED);
  });

  // --------------------------------------------------------------------------
  // getSessions (paginated)
  // --------------------------------------------------------------------------

  it("should return paginated sessions", async () => {
    const result = await service.getSessions(
      { page: 1, limit: 10 } as any,
      orgId,
    );

    expect(result).toEqual(
      expect.objectContaining({ data: [], total: 0, page: 1, limit: 10 }),
    );
  });

  // --------------------------------------------------------------------------
  // getSchemaDefinitions
  // --------------------------------------------------------------------------

  it("should return active schema definitions", async () => {
    const schemas = [{ id: "1", domain: DomainType.PRODUCTS, isActive: true }];
    schemaDefRepo.find.mockResolvedValue(schemas);

    const result = await service.getSchemaDefinitions(DomainType.PRODUCTS);

    expect(schemaDefRepo.find).toHaveBeenCalledWith({
      where: { isActive: true, domain: DomainType.PRODUCTS },
      order: { domain: "ASC", tableName: "ASC" },
    });
    expect(result).toEqual(schemas);
  });
});
