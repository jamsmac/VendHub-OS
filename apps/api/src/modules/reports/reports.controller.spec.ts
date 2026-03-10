import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

describe("ReportsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      ReportsController,
      ReportsService,
      [
        "getDefinitions",
        "getDefinition",
        "createDefinition",
        "generate",
        "getGeneratedReports",
        "getGeneratedReport",
        "getScheduledReports",
        "createScheduledReport",
        "updateScheduledReport",
        "deleteScheduledReport",
        "getDashboards",
        "getDashboard",
        "createDashboard",
        "updateDashboard",
        "deleteDashboard",
        "setDefaultDashboard",
        "createWidget",
        "updateWidget",
        "deleteWidget",
        "reorderWidgets",
        "getSavedFilters",
        "saveFilter",
        "deleteSavedFilter",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // AUTH
  // ============================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/reports/definitions")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ============================================================================
  // REPORT DEFINITIONS
  // ============================================================================

  it("GET /reports/definitions returns 200", async () => {
    mockService.getDefinitions.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/reports/definitions")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /reports/definitions/:id returns 200", async () => {
    mockService.getDefinition.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/reports/definitions/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /reports/definitions returns 201", async () => {
    mockService.createDefinition.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/reports/definitions")
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Test Report", type: "sales_summary" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /reports/definitions rejects viewer", async () => {
    await request(app.getHttpServer())
      .post("/reports/definitions")
      .set("Authorization", "Bearer viewer-token")
      .send({ name: "Test", type: "sales_summary" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  it("POST /reports/generate returns 201", async () => {
    mockService.generate.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/reports/generate")
      .set("Authorization", "Bearer admin-token")
      .send({ format: "json" })
      .expect(HttpStatus.CREATED);
  });

  it("GET /reports/generated returns 200", async () => {
    mockService.getGeneratedReports.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/reports/generated")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ============================================================================
  // SCHEDULED REPORTS
  // ============================================================================

  it("GET /reports/scheduled returns 200", async () => {
    mockService.getScheduledReports.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/reports/scheduled")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("DELETE /reports/scheduled/:id returns 204", async () => {
    mockService.deleteScheduledReport.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/reports/scheduled/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ============================================================================
  // DASHBOARDS
  // ============================================================================

  it("GET /reports/dashboards returns 200", async () => {
    mockService.getDashboards.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/reports/dashboards")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /reports/dashboards returns 201", async () => {
    mockService.createDashboard.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/reports/dashboards")
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Test Dashboard" })
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /reports/dashboards/:id returns 204", async () => {
    mockService.deleteDashboard.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/reports/dashboards/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ============================================================================
  // QUICK REPORTS
  // ============================================================================

  it("GET /reports/sales returns 200", async () => {
    mockService.generate.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/reports/sales")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /reports/inventory returns 200", async () => {
    mockService.generate.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/reports/inventory")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /reports/machines returns 200", async () => {
    mockService.generate.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/reports/machines")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /reports/sales rejects viewer", async () => {
    await request(app.getHttpServer())
      .get("/reports/sales")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
