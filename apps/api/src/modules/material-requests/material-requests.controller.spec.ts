import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { MaterialRequestsController } from "./material-requests.controller";
import { MaterialRequestsService } from "./material-requests.service";

describe("MaterialRequestsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      MaterialRequestsController,
      MaterialRequestsService,
      [
        "createRequest",
        "getRequests",
        "getStats",
        "getPendingApprovals",
        "getRequest",
        "updateRequest",
        "getRequestHistory",
        "submitRequest",
        "approveRequest",
        "rejectRequest",
        "sendToSupplier",
        "recordPayment",
        "confirmDelivery",
        "completeRequest",
        "cancelRequest",
        "returnToDraft",
      ],
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
      .get("/material-requests")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer for GET /material-requests", async () => {
    await request(app.getHttpServer())
      .get("/material-requests")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // CRUD
  // =========================================================================

  it("GET /material-requests returns 200", async () => {
    mockService.getRequests.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/material-requests")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /material-requests/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/material-requests/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /material-requests/pending returns 200", async () => {
    mockService.getPendingApprovals.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/material-requests/pending")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /material-requests/:id returns 200", async () => {
    mockService.getRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/material-requests/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /material-requests returns 201", async () => {
    mockService.createRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/material-requests")
      .set("Authorization", "Bearer admin-token")
      .send({
        items: [
          {
            productId: TEST_UUID,
            productName: "Widget",
            quantity: 10,
            unitPrice: 5000,
          },
        ],
      })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /material-requests/:id returns 200", async () => {
    mockService.updateRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/material-requests/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ notes: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("GET /material-requests/:id/history returns 200", async () => {
    mockService.getRequestHistory.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get(`/material-requests/${TEST_UUID}/history`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // =========================================================================
  // WORKFLOW
  // =========================================================================

  it("POST /material-requests/:id/submit returns 200", async () => {
    mockService.submitRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/submit`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.OK);
  });

  it("POST /material-requests/:id/approve returns 200", async () => {
    mockService.approveRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.OK);
  });

  it("POST /material-requests/:id/reject returns 200", async () => {
    mockService.rejectRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/reject`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Budget exceeded" })
      .expect(HttpStatus.OK);
  });

  it("POST /material-requests/:id/send returns 200", async () => {
    mockService.sendToSupplier.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/send`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.OK);
  });

  it("POST /material-requests/:id/payment returns 200", async () => {
    mockService.recordPayment.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/payment`)
      .set("Authorization", "Bearer admin-token")
      .send({ amount: 50000 })
      .expect(HttpStatus.OK);
  });

  it("rejects viewer for POST /material-requests/:id/payment", async () => {
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/payment`)
      .set("Authorization", "Bearer viewer-token")
      .send({ amount: 50000 })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /material-requests/:id/delivery returns 200", async () => {
    mockService.confirmDelivery.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/delivery`)
      .set("Authorization", "Bearer admin-token")
      .send({
        items: [{ itemId: TEST_UUID, deliveredQuantity: 10 }],
      })
      .expect(HttpStatus.OK);
  });

  it("POST /material-requests/:id/complete returns 200", async () => {
    mockService.completeRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/complete`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /material-requests/:id/cancel returns 200", async () => {
    mockService.cancelRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "No longer needed" })
      .expect(HttpStatus.OK);
  });

  it("POST /material-requests/:id/return-to-draft returns 200", async () => {
    mockService.returnToDraft.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/material-requests/${TEST_UUID}/return-to-draft`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });
});
