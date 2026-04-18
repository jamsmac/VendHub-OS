import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PaymentReportImportService } from "./payment-report-import.service";
import { PaymentReportRow } from "../entities/payment-report-row.entity";
import {
  PaymentReportUpload,
  ReportType,
  UploadStatus,
} from "../entities/payment-report-upload.entity";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from "../../transactions/entities/transaction.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { HwImportedSale } from "../../reconciliation/entities/reconciliation.entity";
import { ReconciliationService } from "../../reconciliation/reconciliation.service";

describe("PaymentReportImportService", () => {
  let service: PaymentReportImportService;
  let rowRepo: jest.Mocked<Repository<PaymentReportRow>>;
  let uploadRepo: jest.Mocked<Repository<PaymentReportUpload>>;
  let transactionRepo: jest.Mocked<Repository<Transaction>>;
  let machineRepo: jest.Mocked<Repository<Machine>>;
  let hwSaleRepo: jest.Mocked<Repository<HwImportedSale>>;
  let reconciliationService: jest.Mocked<ReconciliationService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = "org-uuid-1";
  const uploadId = "upload-uuid-1";
  const batchId = "batch-uuid-1";

  const mockUpload: Partial<PaymentReportUpload> = {
    id: uploadId,
    organizationId: orgId,
    fileName: "payme-jan-2026.xlsx",
    reportType: ReportType.PAYME,
    status: UploadStatus.COMPLETED,
    totalRows: 3,
    newRows: 3,
    importedRows: 0,
    importErrors: 0,
    importedAt: undefined,
    importedBy: undefined,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };

  const mockRows: Partial<PaymentReportRow>[] = [
    {
      id: "row-1",
      uploadId,
      organizationId: orgId,
      reportType: ReportType.PAYME,
      rowIndex: 1,
      externalId: "EXT-001",
      orderNumber: "ORD-001",
      paymentTime: new Date("2026-01-15T10:30:00Z"),
      amount: 12000,
      paymentMethod: "Узкард",
      machineCode: "M-001",
      isDuplicate: false,
      isImported: false,
      importedTransactionId: null,
      importError: null,
    },
    {
      id: "row-2",
      uploadId,
      organizationId: orgId,
      reportType: ReportType.PAYME,
      rowIndex: 2,
      externalId: "EXT-002",
      orderNumber: "ORD-002",
      paymentTime: new Date("2026-01-15T11:00:00Z"),
      amount: 8500,
      paymentMethod: "Наличные",
      machineCode: "M-003",
      isDuplicate: false,
      isImported: false,
      importedTransactionId: null,
      importError: null,
    },
    {
      id: "row-3",
      uploadId,
      organizationId: orgId,
      reportType: ReportType.PAYME,
      rowIndex: 3,
      externalId: "EXT-003",
      orderNumber: "ORD-003",
      paymentTime: new Date("2026-01-15T12:15:00Z"),
      amount: 15000,
      paymentMethod: undefined,
      machineCode: "UNKNOWN-99",
      isDuplicate: false,
      isImported: false,
      importedTransactionId: null,
      importError: null,
    },
  ];

  const mockMachines: Partial<Machine>[] = [
    { id: "machine-uuid-1", machineNumber: "M-001", serialNumber: "SN-001" },
    { id: "machine-uuid-3", machineNumber: "M-003", serialNumber: "SN-003" },
  ];

  // Mock DataSource transaction
  const mockManager = {
    getRepository: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(
      async (fn: (manager: typeof mockManager) => Promise<void>) => {
        await fn(mockManager);
      },
    ),
  };

  beforeEach(async () => {
    const mockRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn((data: Record<string, unknown>) => data),
      save: jest.fn((entity: Record<string, unknown>) =>
        Promise.resolve(entity),
      ),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      })),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentReportImportService,
        { provide: getRepositoryToken(PaymentReportRow), useValue: mockRepo() },
        {
          provide: getRepositoryToken(PaymentReportUpload),
          useValue: mockRepo(),
        },
        { provide: getRepositoryToken(Transaction), useValue: mockRepo() },
        { provide: getRepositoryToken(Machine), useValue: mockRepo() },
        { provide: getRepositoryToken(HwImportedSale), useValue: mockRepo() },
        {
          provide: ReconciliationService,
          useValue: {
            importHwSales: jest
              .fn()
              .mockResolvedValue({ batchId, imported: 3 }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get(PaymentReportImportService);
    rowRepo = module.get(getRepositoryToken(PaymentReportRow));
    uploadRepo = module.get(getRepositoryToken(PaymentReportUpload));
    transactionRepo = module.get(getRepositoryToken(Transaction));
    machineRepo = module.get(getRepositoryToken(Machine));
    hwSaleRepo = module.get(getRepositoryToken(HwImportedSale));
    reconciliationService = module.get(ReconciliationService);
    eventEmitter = module.get(EventEmitter2);

    // Default mock for DataSource.transaction manager repos
    const txnRepoMock = {
      create: jest.fn((data: Record<string, unknown>) => ({
        id: `txn-${Math.random().toString(36).slice(2)}`,
        ...data,
      })),
      save: jest.fn((entity: Record<string, unknown>) =>
        Promise.resolve(entity),
      ),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const hwRepoMock = {
      save: jest.fn((entity: Record<string, unknown>) =>
        Promise.resolve(entity),
      ),
    };
    const rowRepoMock = {
      save: jest.fn((entity: Record<string, unknown>) =>
        Promise.resolve(entity),
      ),
    };
    mockManager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === Transaction) return txnRepoMock;
      if (entity === HwImportedSale) return hwRepoMock;
      if (entity === PaymentReportRow) return rowRepoMock;
      return {};
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // Test 1: Successful import of Payme report
  // ─────────────────────────────────────────────
  it("should import rows and create transactions for known machines", async () => {
    uploadRepo.findOne.mockResolvedValue(mockUpload as PaymentReportUpload);
    rowRepo.find.mockResolvedValue(mockRows as PaymentReportRow[]);
    machineRepo.find.mockResolvedValue(mockMachines as Machine[]);
    hwSaleRepo.find.mockResolvedValue(
      mockRows.map((r, i) => ({
        id: `hw-${i}`,
        machineCode: r.machineCode,
        machineId: null,
        orderNumber: r.orderNumber,
        amount: r.amount,
        paymentMethod: r.paymentMethod,
        saleDate: r.paymentTime,
        currency: "UZS",
        importRowNumber: i + 1,
        transactionId: null,
      })) as unknown as HwImportedSale[],
    );

    const result = await service.importUpload(orgId, uploadId, "admin");

    expect(result.totalRows).toBe(3);
    expect(result.imported).toBe(2); // M-001, M-003
    expect(result.machineNotFound).toBe(1); // UNKNOWN-99
    expect(reconciliationService.importHwSales).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "payment-report.imported",
      expect.objectContaining({ imported: 2 }),
    );
  });

  // ─────────────────────────────────────────────
  // Test 2: Machine not found
  // ─────────────────────────────────────────────
  it("should record machine_not_found error for unknown machines", async () => {
    uploadRepo.findOne.mockResolvedValue(mockUpload as PaymentReportUpload);
    const unknownRow = { ...mockRows[2] } as PaymentReportRow;
    rowRepo.find.mockResolvedValue([unknownRow]);
    machineRepo.find.mockResolvedValue(mockMachines as Machine[]);
    hwSaleRepo.find.mockResolvedValue([
      {
        id: "hw-0",
        machineCode: "UNKNOWN-99",
        machineId: null,
        orderNumber: "ORD-003",
        amount: 15000,
        saleDate: unknownRow.paymentTime,
        importRowNumber: 1,
        transactionId: null,
      } as unknown as HwImportedSale,
    ]);

    const result = await service.importUpload(orgId, uploadId, "admin");

    expect(result.machineNotFound).toBe(1);
    expect(result.imported).toBe(0);
    expect(result.errors[0]?.reason).toBe("machine_not_found");
  });

  // ─────────────────────────────────────────────
  // Test 3: Empty upload (all already imported)
  // ─────────────────────────────────────────────
  it("should return 0 imported when all rows are already imported", async () => {
    uploadRepo.findOne.mockResolvedValue(mockUpload as PaymentReportUpload);
    rowRepo.find.mockResolvedValue([]); // No un-imported rows

    const result = await service.importUpload(orgId, uploadId, "admin");

    expect(result.totalRows).toBe(0);
    expect(result.imported).toBe(0);
    expect(result.batchId).toBeNull();
    expect(reconciliationService.importHwSales).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────
  // Test 4: Upload not found
  // ─────────────────────────────────────────────
  it("should throw NotFoundException for invalid upload ID", async () => {
    uploadRepo.findOne.mockResolvedValue(null);

    await expect(
      service.importUpload(orgId, "nonexistent", "admin"),
    ).rejects.toThrow(NotFoundException);
  });

  // ─────────────────────────────────────────────
  // Test 5: Upload not COMPLETED
  // ─────────────────────────────────────────────
  it("should throw BadRequestException for non-COMPLETED upload", async () => {
    uploadRepo.findOne.mockResolvedValue({
      ...mockUpload,
      status: UploadStatus.PROCESSING,
    } as PaymentReportUpload);

    await expect(
      service.importUpload(orgId, uploadId, "admin"),
    ).rejects.toThrow(BadRequestException);
  });

  // ─────────────────────────────────────────────
  // Test 6: Payment method mapping
  // ─────────────────────────────────────────────
  it("should correctly map payment methods from cyrillic and latin strings", async () => {
    // Access private method via bracket notation for testing
    const mapMethod = (
      service as unknown as Record<
        string,
        (raw: string | null, type: ReportType) => PaymentMethod
      >
    )["mapPaymentMethod"].bind(service);

    expect(mapMethod("Узкард", ReportType.PAYME)).toBe(PaymentMethod.UZCARD);
    expect(mapMethod("Наличные", ReportType.PAYME)).toBe(PaymentMethod.CASH);
    expect(mapMethod("humo", ReportType.CLICK)).toBe(PaymentMethod.HUMO);
    expect(mapMethod("card", ReportType.VENDHUB_ORDERS)).toBe(
      PaymentMethod.CARD,
    );
    expect(mapMethod(null, ReportType.PAYME)).toBe(PaymentMethod.PAYME);
    expect(mapMethod(null, ReportType.CLICK)).toBe(PaymentMethod.CLICK);
    expect(mapMethod(null, ReportType.KASSA_FISCAL)).toBe(PaymentMethod.CASH);
    expect(mapMethod("unknown_method", ReportType.PAYME)).toBe(
      PaymentMethod.PAYME,
    );
  });

  // ─────────────────────────────────────────────
  // Test 7: Import status
  // ─────────────────────────────────────────────
  it("should return correct import status", async () => {
    uploadRepo.findOne.mockResolvedValue(mockUpload as PaymentReportUpload);
    rowRepo.count
      .mockResolvedValueOnce(10) // importedRows
      .mockResolvedValueOnce(15); // totalNonDuplicate
    // Mock queryBuilder for errorRows
    const mockQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
    };
    rowRepo.createQueryBuilder.mockReturnValue(mockQb as never);

    const status = await service.getImportStatus(orgId, uploadId);

    expect(status.uploadId).toBe(uploadId);
    expect(status.importedRows).toBe(10);
    expect(status.errorRows).toBe(2);
    expect(status.pendingRows).toBe(3); // 15 - 10 - 2
  });

  // ─────────────────────────────────────────────
  // Test 8: Idempotent re-import (already imported rows skipped)
  // ─────────────────────────────────────────────
  it("should skip already-imported rows on re-import", async () => {
    uploadRepo.findOne.mockResolvedValue(mockUpload as PaymentReportUpload);
    // All rows already imported → find returns empty
    rowRepo.find.mockResolvedValue([]);

    const result = await service.importUpload(orgId, uploadId, "admin");

    expect(result.imported).toBe(0);
    expect(result.totalRows).toBe(0);
  });
});
