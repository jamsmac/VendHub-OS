import { Test, TestingModule } from "@nestjs/testing";
import { getDataSourceToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { InventoryDashboardService } from "./inventory-dashboard.service";

describe("InventoryDashboardService", () => {
  let service: InventoryDashboardService;
  let dataSource: { query: jest.Mock };

  const ORG_ID = "a0000000-0000-0000-0000-000000000001";

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryDashboardService,
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = module.get<InventoryDashboardService>(InventoryDashboardService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getDashboard", () => {
    it("returns aggregate inventory snapshot", async () => {
      dataSource.query
        .mockResolvedValueOnce([
          { total_value: "500000.00", total_units: "150" },
        ])
        .mockResolvedValueOnce([
          { id: "p1", name: "Espresso", qty: "50", value: "250000" },
          { id: "p2", name: "Latte", qty: "40", value: "200000" },
        ])
        .mockResolvedValueOnce([
          { movement_type: "sale", count: "12" },
          { movement_type: "purchase_in", count: "3" },
        ]);

      const result = await service.getDashboard(ORG_ID);

      expect(result.totalValue).toBe(500000);
      expect(result.totalUnits).toBe(150);
      expect(result.topProducts).toHaveLength(2);
      expect(result.topProducts[0]).toEqual({
        id: "p1",
        name: "Espresso",
        qty: 50,
        value: 250000,
      });
      expect(result.recentMovementsByType).toEqual({
        sale: 12,
        purchase_in: 3,
      });
    });

    it("filters all queries by organizationId (tenant isolation)", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total_value: "0", total_units: "0" }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getDashboard(ORG_ID);

      // Every query should receive orgId as a param
      for (const call of dataSource.query.mock.calls) {
        expect(call[1]).toEqual([ORG_ID]);
      }
    });

    it("returns zeros and empty arrays when org has no inventory", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total_value: null, total_units: null }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getDashboard(ORG_ID);
      expect(result.totalValue).toBe(0);
      expect(result.totalUnits).toBe(0);
      expect(result.topProducts).toEqual([]);
      expect(result.recentMovementsByType).toEqual({});
    });

    it("coerces string numbers from pg to numeric types", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total_value: "1234.56", total_units: "789" }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getDashboard(ORG_ID);
      expect(typeof result.totalValue).toBe("number");
      expect(typeof result.totalUnits).toBe("number");
      expect(result.totalValue).toBe(1234.56);
    });
  });
});
