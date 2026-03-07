/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { VendHubReportGeneratorService } from "./vendhub-report-generator.service";
import { SalesReportGenerator } from "./sales-report.generator";
import { FinancialReportGenerator } from "./financial-report.generator";
import { Transaction } from "../../transactions/entities/transaction.entity";
import { Machine } from "../../machines/entities/machine.entity";
import { Product } from "../../products/entities/product.entity";
import {
  ReportStructure,
  GenerateVendHubReportDto,
} from "../dto/vendhub-report.dto";

describe("VendHubReportGeneratorService", () => {
  let service: VendHubReportGeneratorService;
  let _transactionRepo: jest.Mocked<Repository<Transaction>>;
  let salesGenerator: jest.Mocked<SalesReportGenerator>;
  let financialGenerator: jest.Mocked<FinancialReportGenerator>;

  const orgId = "org-uuid-1";

  const mockStructureA = {
    summary: {
      period: { from: new Date(), to: new Date() },
      byPaymentType: [],
      totalPaid: { orderCount: 0, totalAmount: 0, averageCheck: 0 },
      testOrderCount: 0,
      qrDetails: [],
    },
    byMonths: [],
    byWeekdays: [],
    byMachines: [],
    byProducts: [],
  };

  const mockStructureB = {
    financialSummary: { totalRevenue: 0, totalCosts: 0, profit: 0 },
    byMonths: [],
    dailyReport: [],
  };

  const mockAnalytics = {
    revenueGrowth: 0,
    topMachines: [],
    topProducts: [],
  };

  const mockTransaction = {
    id: "tx-1",
    createdAt: new Date(),
    amount: 15000,
    paymentMethod: "cash",
    type: "sale",
    status: "completed",
    machineId: "machine-1",
    metadata: {},
    machine: { serialNumber: "VM001", location: { address: "Test" } },
    product: null,
  } as unknown as Transaction;

  const mockTransactionQb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockTransaction]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendHubReportGeneratorService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockTransactionQb),
          },
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Product),
          useValue: {},
        },
        {
          provide: SalesReportGenerator,
          useValue: {
            generateStructureA: jest.fn().mockResolvedValue(mockStructureA),
          },
        },
        {
          provide: FinancialReportGenerator,
          useValue: {
            generateStructureB: jest.fn().mockResolvedValue(mockStructureB),
            generateAnalytics: jest.fn().mockReturnValue(mockAnalytics),
          },
        },
      ],
    }).compile();

    service = module.get<VendHubReportGeneratorService>(
      VendHubReportGeneratorService,
    );
    _transactionRepo = module.get(getRepositoryToken(Transaction));
    salesGenerator = module.get(SalesReportGenerator);
    financialGenerator = module.get(FinancialReportGenerator);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generate", () => {
    it("should generate Structure A report", async () => {
      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.A,
      } as any;

      const result = await service.generate(orgId, dto);

      expect(result.metadata.structure).toBe(ReportStructure.A);
      expect(result.structureA).toBeDefined();
      expect(result.structureB).toBeUndefined();
      expect(salesGenerator.generateStructureA).toHaveBeenCalled();
      expect(financialGenerator.generateStructureB).not.toHaveBeenCalled();
    });

    it("should generate Structure B report", async () => {
      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.B,
      } as any;

      const result = await service.generate(orgId, dto);

      expect(result.structureB).toBeDefined();
      expect(result.structureA).toBeUndefined();
      expect(financialGenerator.generateStructureB).toHaveBeenCalled();
    });

    it("should generate FULL report with analytics", async () => {
      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.FULL,
      } as any;

      const result = await service.generate(orgId, dto);

      expect(result.structureA).toBeDefined();
      expect(result.structureB).toBeDefined();
      expect(result.analytics).toBeDefined();
      expect(salesGenerator.generateStructureA).toHaveBeenCalled();
      expect(financialGenerator.generateStructureB).toHaveBeenCalled();
      expect(financialGenerator.generateAnalytics).toHaveBeenCalled();
    });

    it("should include metadata with reportId and generation time", async () => {
      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.A,
      } as any;

      const result = await service.generate(orgId, dto);

      expect(result.metadata.reportId).toMatch(/^VHR-/);
      expect(result.metadata.generationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.organizationId).toBe(orgId);
    });

    it("should apply machine filter to transaction query", async () => {
      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.A,
        machineIds: ["machine-1", "machine-2"],
      } as any;

      await service.generate(orgId, dto);

      expect(mockTransactionQb.andWhere).toHaveBeenCalledWith(
        "t.machineId IN (:...machineIds)",
        { machineIds: ["machine-1", "machine-2"] },
      );
    });

    it("should exclude test orders by default", async () => {
      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.A,
      } as any;

      await service.generate(orgId, dto);

      expect(mockTransactionQb.andWhere).toHaveBeenCalledWith(
        "t.paymentType != 'TEST'",
      );
    });

    it("should include test orders when explicitly requested", async () => {
      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.A,
        includeTestOrders: true,
      } as any;

      mockTransactionQb.andWhere.mockClear();

      await service.generate(orgId, dto);

      const calls = mockTransactionQb.andWhere.mock.calls.map((c) => c[0]);
      expect(calls).not.toContain("t.paymentType != 'TEST'");
    });

    it("should handle empty transaction result", async () => {
      mockTransactionQb.getMany.mockResolvedValueOnce([]);

      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.A,
      } as any;

      const result = await service.generate(orgId, dto);

      expect(result).toBeDefined();
      expect(result.metadata.reportId).toBeDefined();
    });

    it("should set default language to 'ru' when not provided", async () => {
      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.A,
      } as any;

      const result = await service.generate(orgId, dto);

      expect(result.metadata.language).toBe("ru");
    });
  });

  describe("mapPaymentType (via generate)", () => {
    it("should map cash payment type correctly", async () => {
      const cashTx = {
        ...mockTransaction,
        paymentMethod: "cash",
      } as unknown as Transaction;
      mockTransactionQb.getMany.mockResolvedValueOnce([cashTx]);

      const dto: GenerateVendHubReportDto = {
        dateFrom: "2025-01-01",
        dateTo: "2025-01-31",
        structure: ReportStructure.A,
      } as any;

      await service.generate(orgId, dto);

      expect(salesGenerator.generateStructureA).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ paymentType: "CASH" }),
        ]),
        expect.any(Date),
        expect.any(Date),
      );
    });
  });
});
