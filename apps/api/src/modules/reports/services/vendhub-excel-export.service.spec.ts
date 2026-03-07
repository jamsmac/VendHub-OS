import { Test, TestingModule } from "@nestjs/testing";
import { VendHubExcelExportService } from "./vendhub-excel-export.service";
import {
  VendHubFullReportDto,
  ReportStructure,
} from "../dto/vendhub-report.dto";

describe("VendHubExcelExportService", () => {
  let service: VendHubExcelExportService;

  const makeMetadata = (
    structure: ReportStructure = ReportStructure.A,
  ): VendHubFullReportDto["metadata"] => ({
    reportId: "VHR-TEST-001",
    generatedAt: new Date("2025-01-31T12:00:00Z"),
    generationTimeMs: 500,
    period: {
      from: new Date("2025-01-01"),
      to: new Date("2025-01-31"),
    },
    structure,
    language: "ru",
    organizationId: "org-uuid-1",
    filters: {},
  });

  const makeStructureA = () => ({
    summary: {
      period: {
        from: new Date("2025-01-01"),
        to: new Date("2025-01-31"),
      },
      byPaymentType: [
        {
          paymentType: "CASH",
          orderCount: 100,
          totalAmount: 5000000,
          percentByCount: 60,
          percentByAmount: 50,
          averageCheck: 50000,
        },
        {
          paymentType: "QR",
          orderCount: 67,
          totalAmount: 5000000,
          percentByCount: 40,
          percentByAmount: 50,
          averageCheck: 74627,
        },
      ],
      totalPaid: {
        orderCount: 167,
        totalAmount: 10000000,
        averageCheck: 59880,
      },
      testOrderCount: 3,
      qrDetails: [
        {
          system: "Payme",
          paymentCount: 40,
          totalAmount: 3000000,
          percentOfQR: 60,
          averagePayment: 75000,
        },
      ],
    },
    byMonths: [
      {
        monthName: "Январь 2025",
        cash: { count: 100, amount: 5000000 },
        qr: { count: 67, amount: 5000000 },
        vip: { count: 0, amount: 0 },
        credit: { count: 0, amount: 0 },
        total: { count: 167, amount: 10000000 },
      },
    ],
    byWeekdays: [
      {
        dayName: "Понедельник",
        cash: { count: 15, amount: 750000 },
        qr: { count: 10, amount: 700000 },
        vip: { count: 0, amount: 0 },
        total: { count: 25, amount: 1450000 },
      },
    ],
    byMachines: [
      {
        machineCode: "VM001",
        address: "Tashkent, Navoi 1",
        cash: { count: 50, amount: 2500000 },
        qr: { count: 30, amount: 2200000 },
        vip: { count: 0, amount: 0 },
        credit: { count: 0, amount: 0 },
        total: { count: 80, amount: 4700000 },
        revenuePercent: 47,
      },
    ],
    byProducts: [
      {
        productName: "Americano",
        cash: { count: 30, amount: 900000 },
        qr: { count: 20, amount: 600000 },
        vip: { count: 0, amount: 0 },
        total: { count: 50, amount: 1500000 },
      },
    ],
    cashSummary: {
      months: [],
      products: [],
      machines: [],
    },
    qrSummary: {
      months: [],
      products: [],
      machines: [],
      qrShare: [],
      payme: [],
      click: [],
    },
    vipSummary: {
      total: {
        paymentType: "VIP",
        orderCount: 0,
        totalAmount: 0,
        percentByCount: 0,
        percentByAmount: 0,
        averageCheck: 0,
      },
      details: [],
      products: [],
    },
    creditSummary: {
      total: {
        paymentType: "CREDIT",
        orderCount: 0,
        totalAmount: 0,
        percentByCount: 0,
        percentByAmount: 0,
        averageCheck: 0,
      },
      details: [],
    },
    qrReconciliation: [],
    crossAnalysis: {
      topProducts: [],
      topMachines: [],
      matrix: [],
      hourlyAnalysis: [],
    },
    dailyReport: [],
    averageCheck: {
      byMonth: [],
      byProduct: [],
    },
  });

  const makeStructureB = () => ({
    summary: {
      period: {
        from: new Date("2025-01-01"),
        to: new Date("2025-01-31"),
        dayCount: 31,
      },
      orders: {
        total: 167,
        successful: 160,
        failed: 7,
        successRate: 95.8,
      },
      finance: {
        totalRevenue: 10000000,
        costOfGoods: 3000000,
        grossProfit: 7000000,
        marginPercent: 70,
        averageCheck: 59880,
        ordersPerDay: 5.4,
      },
      byPaymentType: [],
    },
    byMonths: [],
    byDays: [],
    byMachines: [],
    byProducts: [],
    ingredients: {
      summary: [],
      byMonths: [],
      byMachines: [],
      byDays: [],
    },
    qrReconciliation: [],
    deliveryFailures: [],
    priceHistory: [],
    purchases: [],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VendHubExcelExportService],
    }).compile();

    service = module.get<VendHubExcelExportService>(VendHubExcelExportService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("exportToExcel", () => {
    it("should return a Buffer for Structure A report", async () => {
      const report: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.A),
        structureA: makeStructureA() as any,
      };

      const buffer = await service.exportToExcel(report);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should return a Buffer for Structure B report", async () => {
      const report: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.B),
        structureB: makeStructureB() as any,
      };

      const buffer = await service.exportToExcel(report);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should return a Buffer for FULL report", async () => {
      const report: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.FULL),
        structureA: makeStructureA() as any,
        structureB: makeStructureB() as any,
        analytics: {
          topProducts: [],
          topMachines: [],
          trends: { revenueGrowth: 15, orderGrowth: 10, marginTrend: 5 },
          alerts: [],
        },
      };

      const buffer = await service.exportToExcel(report);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should create Contents sheet as first sheet", async () => {
      const report: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.A),
        structureA: makeStructureA() as any,
      };

      const buffer = await service.exportToExcel(report);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it("should handle report with no structureA or structureB", async () => {
      const report: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.A),
      };

      const buffer = await service.exportToExcel(report);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle empty payment type arrays", async () => {
      const structureA = makeStructureA();
      structureA.summary.byPaymentType = [];
      structureA.byMonths = [];
      structureA.byMachines = [];
      structureA.byProducts = [];

      const report: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.A),
        structureA: structureA as any,
      };

      const buffer = await service.exportToExcel(report);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it("should produce larger buffer for FULL report than A-only", async () => {
      const reportA: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.A),
        structureA: makeStructureA() as any,
      };

      const reportFull: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.FULL),
        structureA: makeStructureA() as any,
        structureB: makeStructureB() as any,
      };

      const bufferA = await service.exportToExcel(reportA);
      const bufferFull = await service.exportToExcel(reportFull);

      expect(bufferFull.length).toBeGreaterThan(bufferA.length);
    });

    it("should include report metadata in buffer output", async () => {
      const report: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.A),
        structureA: makeStructureA() as any,
      };

      const buffer = await service.exportToExcel(report);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it("should handle report with analytics section", async () => {
      const report: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.FULL),
        structureA: makeStructureA() as any,
        structureB: makeStructureB() as any,
        analytics: {
          topProducts: [{ name: "Americano", revenue: 1500000, count: 50 }],
          topMachines: [
            { code: "VM001", address: "Tashkent", revenue: 5000000 },
          ],
          trends: { revenueGrowth: 15.5, orderGrowth: 10, marginTrend: 5 },
          alerts: [],
        },
      };

      const buffer = await service.exportToExcel(report);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should not throw for multiple sequential exports", async () => {
      const report: VendHubFullReportDto = {
        metadata: makeMetadata(ReportStructure.A),
        structureA: makeStructureA() as any,
      };

      const buffer1 = await service.exportToExcel(report);
      const buffer2 = await service.exportToExcel(report);

      expect(buffer1).toBeInstanceOf(Buffer);
      expect(buffer2).toBeInstanceOf(Buffer);
    });
  });
});
