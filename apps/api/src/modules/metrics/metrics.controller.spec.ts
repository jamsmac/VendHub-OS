import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import { createControllerTestApp } from "../../common/test-utils/controller-test.helper";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

describe("MetricsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      MetricsController,
      MetricsService,
      ["getMetrics"],
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // AUTH
  // =========================================================================

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/metrics")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // GET /metrics (owner/admin)
  // =========================================================================

  it("GET /metrics returns 200 with admin auth", async () => {
    mockService.getMetrics.mockResolvedValue("# HELP uptime\nuptime 123\n");
    await request(app.getHttpServer())
      .get("/metrics")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("rejects viewer for GET /metrics", async () => {
    await request(app.getHttpServer())
      .get("/metrics")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator for GET /metrics", async () => {
    await request(app.getHttpServer())
      .get("/metrics")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
