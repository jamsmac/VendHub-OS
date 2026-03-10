import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../../common/test-utils/controller-test.helper";
import { VendHubReportController } from "./vendhub-report.controller";
import { VendHubReportGeneratorService } from "../services/vendhub-report-generator.service";
import { VendHubExcelExportService } from "../services/vendhub-excel-export.service";

describe("VendHubReportController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    const mockExcelService = {
      exportToExcel: jest.fn().mockResolvedValue(Buffer.from("test")),
    };

    ({ app, mockService } = await createControllerTestApp(
      VendHubReportController,
      VendHubReportGeneratorService,
      ["generate"],
      [{ provide: VendHubExcelExportService, useValue: mockExcelService }],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default return for generate
    mockService.generate.mockResolvedValue({
      structureA: { summary: {}, crossAnalysis: {}, qrReconciliation: {} },
      structureB: {
        summary: { orders: { failed: 0, successRate: 100 } },
        ingredients: {},
        deliveryFailures: [],
      },
    });
  });

  // ============================================================================
  // AUTH
  // ============================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .post("/reports/vendhub/generate")
      .send({ dateFrom: "2025-01-01", dateTo: "2025-01-31", structure: "A" })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  it("POST /reports/vendhub/generate returns 201", async () => {
    await request(app.getHttpServer())
      .post("/reports/vendhub/generate")
      .set("Authorization", "Bearer admin-token")
      .send({ dateFrom: "2025-01-01", dateTo: "2025-01-31", structure: "A" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /reports/vendhub/generate rejects viewer", async () => {
    await request(app.getHttpServer())
      .post("/reports/vendhub/generate")
      .set("Authorization", "Bearer viewer-token")
      .send({ dateFrom: "2025-01-01", dateTo: "2025-01-31", structure: "A" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ============================================================================
  // QUICK REPORTS
  // ============================================================================

  it("GET /reports/vendhub/quick/structure-a returns 200", async () => {
    await request(app.getHttpServer())
      .get("/reports/vendhub/quick/structure-a")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /reports/vendhub/quick/structure-b returns 200", async () => {
    await request(app.getHttpServer())
      .get("/reports/vendhub/quick/structure-b")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /reports/vendhub/quick/full returns 200", async () => {
    await request(app.getHttpServer())
      .get("/reports/vendhub/quick/full")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // SPECIFIC SECTIONS
  // ============================================================================

  it("GET /reports/vendhub/structures returns 200", async () => {
    await request(app.getHttpServer())
      .get("/reports/vendhub/structures")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /reports/vendhub/payment-types returns 200", async () => {
    await request(app.getHttpServer())
      .get(
        "/reports/vendhub/payment-types?dateFrom=2025-01-01&dateTo=2025-01-31",
      )
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
