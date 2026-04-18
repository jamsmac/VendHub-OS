jest.mock("@nestjs/axios", () => ({
  HttpService: class HttpService {},
  HttpModule: class HttpModule {},
}));

import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { FiscalController } from "./fiscal.controller";
import { FiscalService } from "./services/fiscal.service";

describe("FiscalController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      FiscalController,
      FiscalService,
      [
        "getDevices",
        "getDevice",
        "createDevice",
        "updateDevice",
        "activateDevice",
        "deactivateDevice",
        "getDeviceStatistics",
        "openShift",
        "closeShift",
        "getCurrentShift",
        "getShiftHistory",
        "getXReport",
        "createReceipt",
        "getReceipt",
        "getReceipts",
        "getQueueItems",
        "processQueueItem",
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
      .get("/fiscal/devices")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ---- Role rejection ----

  it("rejects viewer on GET /fiscal/devices", async () => {
    await request(app.getHttpServer())
      .get("/fiscal/devices")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("rejects operator on GET /fiscal/devices", async () => {
    await request(app.getHttpServer())
      .get("/fiscal/devices")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ---- Device endpoints ----

  it("GET /fiscal/devices returns 200", async () => {
    mockService.getDevices.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/fiscal/devices")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /fiscal/devices/:id returns 200", async () => {
    mockService.getDevice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/fiscal/devices/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /fiscal/devices returns 201", async () => {
    mockService.createDevice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/fiscal/devices")
      .set("Authorization", "Bearer admin-token")
      .send({
        name: "MultiKassa #1",
        provider: "multikassa",
        credentials: {},
      })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /fiscal/devices/:id returns 200", async () => {
    mockService.updateDevice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/fiscal/devices/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated Device" })
      .expect(HttpStatus.OK);
  });

  it("POST /fiscal/devices/:id/activate returns 201", async () => {
    mockService.activateDevice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/fiscal/devices/${TEST_UUID}/activate`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });

  it("POST /fiscal/devices/:id/deactivate returns 201", async () => {
    mockService.deactivateDevice.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/fiscal/devices/${TEST_UUID}/deactivate`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });

  it("GET /fiscal/devices/:id/stats returns 200", async () => {
    mockService.getDeviceStatistics.mockResolvedValue({});
    await request(app.getHttpServer())
      .get(`/fiscal/devices/${TEST_UUID}/stats`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ---- Shift endpoints ----

  it("POST /fiscal/devices/:id/shift/open returns 201", async () => {
    mockService.openShift.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/fiscal/devices/${TEST_UUID}/shift/open`)
      .set("Authorization", "Bearer admin-token")
      .send({ cashier_name: "Test Cashier" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /fiscal/devices/:id/shift/close returns 201", async () => {
    mockService.closeShift.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/fiscal/devices/${TEST_UUID}/shift/close`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });

  it("GET /fiscal/devices/:id/shift/current returns 200", async () => {
    mockService.getDevice.mockResolvedValue({ id: TEST_UUID });
    mockService.getCurrentShift.mockResolvedValue({});
    await request(app.getHttpServer())
      .get(`/fiscal/devices/${TEST_UUID}/shift/current`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ---- Receipt endpoints ----

  it("GET /fiscal/receipts returns 200", async () => {
    mockService.getReceipts.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/fiscal/receipts")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ---- Queue endpoints ----

  it("GET /fiscal/queue returns 200 for admin", async () => {
    mockService.getQueueItems.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/fiscal/queue")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /fiscal/queue/:id/retry returns 201 for admin", async () => {
    mockService.processQueueItem.mockResolvedValue({});
    await request(app.getHttpServer())
      .post(`/fiscal/queue/${TEST_UUID}/retry`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });
});
