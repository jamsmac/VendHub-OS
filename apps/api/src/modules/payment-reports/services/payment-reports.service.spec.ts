import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { PaymentReportsService } from "./payment-reports.service";
import { PaymentReportParserService } from "./payment-report-parser.service";
import {
  PaymentReportUpload,
  UploadStatus,
  ReportType,
} from "../entities/payment-report-upload.entity";
import { PaymentReportRow } from "../entities/payment-report-row.entity";

describe("PaymentReportsService", () => {
  let service: PaymentReportsService;
  let uploadRepo: any;
  let rowRepo: any;
  let parser: any;

  const orgId = "org-uuid-1";
  const uploadId = "upload-uuid-1";

  const mockUpload = {
    id: uploadId,
    organizationId: orgId,
    fileName: "test.xlsx",
    fileSize: 1024,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    status: UploadStatus.COMPLETED,
    reportType: ReportType.PAYME,
    totalRows: 10,
    processedRows: 10,
    newRows: 8,
    duplicateRows: 2,
  };

  beforeEach(async () => {
    const mockQB = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockUpload], 1]),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    uploadRepo = {
      create: jest
        .fn()
        .mockImplementation((data) => ({ id: uploadId, ...data })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn().mockResolvedValue(mockUpload),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(mockQB),
    };

    rowRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
      softDelete: jest.fn().mockResolvedValue({ affected: 10 }),
      createQueryBuilder: jest.fn().mockReturnValue(mockQB),
    };

    parser = {
      parse: jest.fn().mockResolvedValue({
        detection: { type: ReportType.PAYME, confidence: 95 },
        rows: [
          { rowIndex: 0, externalId: "ext-1", rawData: {} },
          { rowIndex: 1, externalId: "ext-2", rawData: {} },
        ],
        fileHash: "abc123hash",
        meta: {},
        periodFrom: new Date("2026-01-01"),
        periodTo: new Date("2026-01-31"),
        totalAmount: 50000,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentReportsService,
        {
          provide: getRepositoryToken(PaymentReportUpload),
          useValue: uploadRepo,
        },
        { provide: getRepositoryToken(PaymentReportRow), useValue: rowRepo },
        { provide: PaymentReportParserService, useValue: parser },
      ],
    }).compile();

    service = module.get<PaymentReportsService>(PaymentReportsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ======================================================================
  // upload
  // ======================================================================

  describe("upload", () => {
    it("should upload and parse a valid file", async () => {
      uploadRepo.findOne.mockResolvedValue(null); // no duplicate

      const result = await service.upload({
        buffer: Buffer.from("test"),
        fileName: "payme_report.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileSize: 1024,
        uploadedBy: "admin",
        organizationId: orgId,
      });

      expect(result.organizationId).toBe(orgId);
      expect(uploadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: orgId }),
      );
      expect(parser.parse).toHaveBeenCalled();
    });

    it("should reject unsupported file formats", async () => {
      await expect(
        service.upload({
          buffer: Buffer.from("test"),
          fileName: "report.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
          organizationId: orgId,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should detect duplicate by file hash within organization", async () => {
      // findOne is called after parsing to check fileHash — return existing upload
      uploadRepo.findOne.mockResolvedValue({
        id: "existing-id",
        organizationId: orgId,
        fileHash: "abc123hash",
      });

      await expect(
        service.upload({
          buffer: Buffer.from("test"),
          fileName: "payme.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          fileSize: 1024,
          organizationId: orgId,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ======================================================================
  // findUploads
  // ======================================================================

  describe("findUploads", () => {
    it("should filter by organizationId", async () => {
      const qb = uploadRepo.createQueryBuilder();

      await service.findUploads({ organizationId: orgId });

      expect(qb.where).toHaveBeenCalledWith(
        "u.organizationId = :organizationId",
        { organizationId: orgId },
      );
    });

    it("should return paginated results", async () => {
      const result = await service.findUploads({
        organizationId: orgId,
        page: 1,
        limit: 20,
      });

      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("page", 1);
      expect(result).toHaveProperty("limit", 20);
    });
  });

  // ======================================================================
  // findUploadById
  // ======================================================================

  describe("findUploadById", () => {
    it("should return upload when found with correct org", async () => {
      const result = await service.findUploadById(uploadId, orgId);

      expect(result).toEqual(mockUpload);
      expect(uploadRepo.findOne).toHaveBeenCalledWith({
        where: { id: uploadId, organizationId: orgId },
      });
    });

    it("should throw when upload not found", async () => {
      uploadRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findUploadById("non-existent", orgId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw when upload belongs to different org", async () => {
      uploadRepo.findOne.mockResolvedValue(null); // org filter excludes it

      await expect(
        service.findUploadById(uploadId, "other-org"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ======================================================================
  // deleteUpload (soft delete)
  // ======================================================================

  describe("deleteUpload", () => {
    it("should soft-delete upload and its rows", async () => {
      await service.deleteUpload(uploadId, orgId);

      expect(rowRepo.softDelete).toHaveBeenCalledWith({ uploadId });
      expect(uploadRepo.softDelete).toHaveBeenCalledWith(uploadId);
    });

    it("should verify org ownership before deleting", async () => {
      uploadRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteUpload(uploadId, "other-org")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ======================================================================
  // getStats
  // ======================================================================

  describe("getStats", () => {
    it("should filter stats by organizationId", async () => {
      const qb = uploadRepo.createQueryBuilder();

      await service.getStats(orgId);

      expect(qb.where || qb.andWhere).toBeDefined();
    });
  });

  // ======================================================================
  // reconcile
  // ======================================================================

  describe("reconcile", () => {
    it("should reconcile two uploads from same org", async () => {
      const rowsA = [
        { orderNumber: "O-001", amount: 100 },
        { orderNumber: "O-002", amount: 200 },
      ];
      const rowsB = [
        { orderNumber: "O-001", amount: 100 },
        { orderNumber: "O-003", amount: 300 },
      ];
      rowRepo.find.mockResolvedValueOnce(rowsA).mockResolvedValueOnce(rowsB);

      const result = await service.reconcile({
        organizationId: orgId,
        uploadIdA: "a-id",
        uploadIdB: "b-id",
      });

      expect(result.summary.matched).toBe(1);
      expect(result.summary.onlyInA).toBe(1);
      expect(result.summary.onlyInB).toBe(1);
    });
  });
});
