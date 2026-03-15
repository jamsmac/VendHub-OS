import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationService } from "./services/integration.service";
import { AIParserService } from "./services/ai-parser.service";
import { IntegrationTesterService } from "./services/integration-tester.service";
import { PaymentExecutorService } from "./services/payment-executor.service";

describe("IntegrationsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    const mockAIParser: Record<string, jest.Mock> = {
      parseDocumentation: jest.fn().mockResolvedValue({}),
      startConfigSession: jest.fn().mockResolvedValue({}),
      continueConversation: jest.fn().mockResolvedValue({}),
      getSession: jest.fn().mockResolvedValue({}),
      getSuggestions: jest.fn().mockResolvedValue([]),
    };

    const mockTester: Record<string, jest.Mock> = {
      runTestSuite: jest.fn().mockResolvedValue({}),
      testConnectivity: jest.fn().mockResolvedValue({}),
      validateCredentials: jest.fn().mockResolvedValue({}),
    };

    const mockPaymentExecutor: Record<string, jest.Mock> = {
      createPayment: jest.fn().mockResolvedValue({}),
      checkGatewayPaymentStatus: jest.fn().mockResolvedValue({}),
    };

    ({ app, mockService } = await createControllerTestApp(
      IntegrationsController,
      IntegrationService,
      [
        "findAll",
        "findOne",
        "create",
        "update",
        "updateConfig",
        "updateCredentials",
        "updateStatus",
        "delete",
        "getLogs",
        "getStatistics",
      ],
      [
        { provide: AIParserService, useValue: mockAIParser },
        { provide: IntegrationTesterService, useValue: mockTester },
        { provide: PaymentExecutorService, useValue: mockPaymentExecutor },
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Auth ----

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/integrations")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ---- Role rejection ----

  it("rejects viewer on GET /integrations", async () => {
    await request(app.getHttpServer())
      .get("/integrations")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator on GET /integrations", async () => {
    await request(app.getHttpServer())
      .get("/integrations")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ---- CRUD success cases ----

  it("GET /integrations returns 200", async () => {
    mockService.findAll.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/integrations")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /integrations/:id returns 200", async () => {
    mockService.findOne.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/integrations/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /integrations returns 201", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/integrations")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "payme",
        displayName: "Payme Integration",
        category: "payment",
      })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /integrations/:id returns 200", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/integrations/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ displayName: "Updated Name" })
      .expect(HttpStatus.OK);
  });

  it("PATCH /integrations/:id/credentials returns 200", async () => {
    mockService.updateCredentials.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/integrations/${TEST_UUID}/credentials`)
      .set("Authorization", "Bearer admin-token")
      .send({ credentials: { apiKey: "test-key" }, isSandbox: true })
      .expect(HttpStatus.OK);
  });

  it("PATCH /integrations/:id/status returns 200", async () => {
    mockService.updateStatus.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/integrations/${TEST_UUID}/status`)
      .set("Authorization", "Bearer admin-token")
      .send({ status: "active" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /integrations/:id returns 204", async () => {
    mockService.delete.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/integrations/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ---- Logs and Stats ----

  it("GET /integrations/:id/logs returns 200", async () => {
    mockService.getLogs.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get(`/integrations/${TEST_UUID}/logs`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /integrations/:id/stats returns 200", async () => {
    mockService.getStatistics.mockResolvedValue({});
    await request(app.getHttpServer())
      .get(`/integrations/${TEST_UUID}/stats`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ---- Templates (manager allowed) ----

  it("GET /integrations/templates/all returns 200 for admin", async () => {
    await request(app.getHttpServer())
      .get("/integrations/templates/all")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
