import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { Vhm24IntegrationController } from "./vhm24-integration.controller";
import { Vhm24IntegrationService } from "./vhm24-integration.service";
import { TripReconciliationService } from "./services/trip-reconciliation.service";

describe("Vhm24IntegrationController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;
  let mockReconciliation: Record<string, jest.Mock>;

  beforeAll(async () => {
    mockReconciliation = {
      reconcileTrip: jest.fn().mockResolvedValue({}),
      resolve: jest.fn().mockResolvedValue({}),
    };

    ({ app, mockService } = await createControllerTestApp(
      Vhm24IntegrationController,
      Vhm24IntegrationService,
      ["handleWebhook", "syncMachines", "linkTasksToTrip", "manualVerifyTask"],
      [
        {
          provide: TripReconciliationService,
          useValue: mockReconciliation,
        },
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Auth ────────────────────────────────────────────────

  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .post("/integration/vhm24/webhook")
      .send({ event: "test" })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/integration/vhm24/webhook")
      .set("Authorization", "Bearer viewer-token")
      .send({ event: "test" })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator role", async () => {
    await request(app.getHttpServer())
      .post("/integration/vhm24/webhook")
      .set("Authorization", "Bearer operator-token")
      .send({ event: "test" })
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── Webhook ─────────────────────────────────────────────

  it("POST /integration/vhm24/webhook returns 200 (HttpCode OK)", async () => {
    mockService.handleWebhook.mockResolvedValue({ processed: true });
    await request(app.getHttpServer())
      .post("/integration/vhm24/webhook")
      .set("Authorization", "Bearer admin-token")
      .send({ event: "machine.updated", data: {} })
      .expect(HttpStatus.OK);
    expect(mockService.handleWebhook).toHaveBeenCalled();
  });

  // ── Machine Sync ────────────────────────────────────────

  it("POST /integration/vhm24/sync/machines syncs machines (201)", async () => {
    mockService.syncMachines.mockResolvedValue({ synced: 1 });
    await request(app.getHttpServer())
      .post("/integration/vhm24/sync/machines")
      .set("Authorization", "Bearer admin-token")
      .send({
        machines: [
          {
            machineId: "M-001",
            latitude: 41.311,
            longitude: 69.24,
          },
        ],
      })
      .expect(HttpStatus.CREATED);
    expect(mockService.syncMachines).toHaveBeenCalled();
  });

  // ── Task Linking ────────────────────────────────────────

  it("POST /integration/vhm24/trips/:tripId/tasks links tasks (201)", async () => {
    mockService.linkTasksToTrip.mockResolvedValue({ linked: 1 });
    await request(app.getHttpServer())
      .post(`/integration/vhm24/trips/${TEST_UUID}/tasks`)
      .set("Authorization", "Bearer admin-token")
      .send({
        tasks: [
          {
            vhm24TaskId: "T-001",
            vhm24TaskType: "refill",
            vhm24MachineId: "M-001",
            expectedLatitude: 41.311,
            expectedLongitude: 69.24,
          },
        ],
      })
      .expect(HttpStatus.CREATED);
  });

  // ── Manual Verification ─────────────────────────────────

  it("PATCH /integration/vhm24/task-links/:id/verify verifies task (200)", async () => {
    mockService.manualVerifyTask.mockResolvedValue({ verified: true });
    await request(app.getHttpServer())
      .patch(`/integration/vhm24/task-links/${TEST_UUID}/verify`)
      .set("Authorization", "Bearer admin-token")
      .send({ status: "verified" })
      .expect(HttpStatus.OK);
    expect(mockService.manualVerifyTask).toHaveBeenCalled();
  });

  // ── Reconciliation ─────────────────────────────────────

  it("POST /integration/vhm24/trips/:tripId/reconcile reconciles (201)", async () => {
    mockReconciliation.reconcileTrip.mockResolvedValue({ discrepancies: [] });
    await request(app.getHttpServer())
      .post(`/integration/vhm24/trips/${TEST_UUID}/reconcile`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
    expect(mockReconciliation.reconcileTrip).toHaveBeenCalled();
  });

  it("PATCH /integration/vhm24/reconciliations/:id/resolve resolves (200)", async () => {
    mockReconciliation.resolve.mockResolvedValue({ resolved: true });
    await request(app.getHttpServer())
      .patch(`/integration/vhm24/reconciliations/${TEST_UUID}/resolve`)
      .set("Authorization", "Bearer admin-token")
      .send({ notes: "Fixed" })
      .expect(HttpStatus.OK);
    expect(mockReconciliation.resolve).toHaveBeenCalled();
  });

  it("allows owner role", async () => {
    mockService.handleWebhook.mockResolvedValue({});
    await request(app.getHttpServer())
      .post("/integration/vhm24/webhook")
      .set("Authorization", "Bearer owner-token")
      .send({ event: "test" })
      .expect(HttpStatus.OK);
  });
});
