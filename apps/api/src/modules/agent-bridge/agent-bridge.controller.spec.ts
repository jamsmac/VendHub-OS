import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { AgentBridgeController } from "./agent-bridge.controller";
import { AgentBridgeService } from "./agent-bridge.service";
import { AgentApiKeyGuard } from "./guards/agent-api-key.guard";

describe("AgentBridgeController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      AgentBridgeController,
      AgentBridgeService,
      [
        "registerSession",
        "updateSession",
        "completeSession",
        "heartbeat",
        "reportProgress",
        "getAllSessions",
        "getActiveSessions",
        "getSession",
        "deleteSession",
        "getSessionProgress",
        "getRecentProgress",
        "getStatistics",
      ],
      [
        {
          provide: ConfigService,
          useValue: { get: () => "test-agent-key" },
        },
        AgentApiKeyGuard,
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // AGENT-FACING ENDPOINTS (@Public + AgentApiKeyGuard)
  // Agent endpoints are @Public so they bypass JWT auth but need x-agent-key.
  // The AgentApiKeyGuard is a UseGuards guard (not APP_GUARD), so it actually
  // runs. We test with the valid key header.
  // ==========================================================================

  it("POST /agent-bridge/sessions creates session with agent key", async () => {
    mockService.registerSession.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/agent-bridge/sessions")
      .set("x-agent-key", "test-agent-key")
      .send({ sessionId: "sess-001", name: "Test Session" })
      .expect(HttpStatus.CREATED);
  });

  it("PATCH /agent-bridge/sessions/:sessionId updates session", async () => {
    mockService.updateSession.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch("/agent-bridge/sessions/sess-001")
      .set("x-agent-key", "test-agent-key")
      .send({ currentTask: "Building module" })
      .expect(HttpStatus.OK);
  });

  it("POST /agent-bridge/sessions/:sessionId/complete marks complete", async () => {
    mockService.completeSession.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/agent-bridge/sessions/sess-001/complete")
      .set("x-agent-key", "test-agent-key")
      .expect(HttpStatus.OK);
  });

  it("POST /agent-bridge/sessions/:sessionId/heartbeat returns 204", async () => {
    mockService.heartbeat.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .post("/agent-bridge/sessions/sess-001/heartbeat")
      .set("x-agent-key", "test-agent-key")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("POST /agent-bridge/progress reports progress", async () => {
    mockService.reportProgress.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/agent-bridge/progress")
      .set("x-agent-key", "test-agent-key")
      .send({ sessionId: "sess-001", message: "Step 1 completed" })
      .expect(HttpStatus.CREATED);
  });

  // ==========================================================================
  // ADMIN-FACING ENDPOINTS (auth required, owner/admin)
  // ==========================================================================

  it("GET /agent-bridge/sessions returns 200 with admin auth", async () => {
    mockService.getAllSessions.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/agent-bridge/sessions")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /agent-bridge/sessions returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/agent-bridge/sessions")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("GET /agent-bridge/sessions rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/agent-bridge/sessions")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /agent-bridge/sessions/active returns 200 with admin auth", async () => {
    mockService.getActiveSessions.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/agent-bridge/sessions/active")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /agent-bridge/sessions/:sessionId returns 200 with admin auth", async () => {
    mockService.getSession.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get("/agent-bridge/sessions/sess-001")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("DELETE /agent-bridge/sessions/:sessionId returns 204 with admin auth", async () => {
    mockService.deleteSession.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete("/agent-bridge/sessions/sess-001")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("GET /agent-bridge/sessions/:sessionId/progress returns 200", async () => {
    mockService.getSessionProgress.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/agent-bridge/sessions/sess-001/progress")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /agent-bridge/progress/recent returns 200 with admin auth", async () => {
    mockService.getRecentProgress.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/agent-bridge/progress/recent")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /agent-bridge/statistics returns 200 with admin auth", async () => {
    mockService.getStatistics.mockResolvedValue({ total: 0 });
    await request(app.getHttpServer())
      .get("/agent-bridge/statistics")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
