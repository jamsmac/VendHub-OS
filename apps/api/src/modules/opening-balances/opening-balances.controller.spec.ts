import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { OpeningBalancesController } from "./opening-balances.controller";
import { OpeningBalancesService } from "./opening-balances.service";

describe("OpeningBalancesController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      OpeningBalancesController,
      OpeningBalancesService,
      [
        "create",
        "bulkCreate",
        "findAll",
        "getStats",
        "findById",
        "update",
        "apply",
        "applyAll",
        "remove",
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
  // Auth required
  // =========================================================================

  it("GET /opening-balances returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/opening-balances")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // =========================================================================
  // Role rejection
  // =========================================================================

  it("POST /opening-balances rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/opening-balances")
      .set("Authorization", "Bearer viewer-token")
      .send({
        productId: TEST_UUID,
        warehouseId: TEST_UUID,
        balanceDate: "2025-01-01",
        quantity: 100,
        unitCost: 15000,
      })
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /opening-balances/:id/apply rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post(`/opening-balances/${TEST_UUID}/apply`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // =========================================================================
  // CRUD
  // =========================================================================

  it("POST /opening-balances returns 201 for admin", async () => {
    mockService.create.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/opening-balances")
      .set("Authorization", "Bearer admin-token")
      .send({
        productId: TEST_UUID,
        warehouseId: TEST_UUID,
        balanceDate: "2025-01-01",
        quantity: 100,
        unitCost: 15000,
      })
      .expect(HttpStatus.CREATED);
  });

  it("POST /opening-balances/bulk returns 201 for admin", async () => {
    mockService.bulkCreate.mockResolvedValue({ created: 1 });
    await request(app.getHttpServer())
      .post("/opening-balances/bulk")
      .set("Authorization", "Bearer admin-token")
      .send({
        balances: [
          {
            productId: TEST_UUID,
            warehouseId: TEST_UUID,
            balanceDate: "2025-01-01",
            quantity: 50,
            unitCost: 10000,
          },
        ],
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /opening-balances returns 200 for viewer", async () => {
    mockService.findAll.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/opening-balances")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("GET /opening-balances/stats returns 200 for admin", async () => {
    mockService.getStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/opening-balances/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /opening-balances/:id returns 200 for viewer", async () => {
    mockService.findById.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/opening-balances/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.OK);
  });

  it("PATCH /opening-balances/:id returns 200 for admin", async () => {
    mockService.update.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .patch(`/opening-balances/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ quantity: 200 })
      .expect(HttpStatus.OK);
  });

  it("POST /opening-balances/:id/apply returns 200 for admin", async () => {
    mockService.apply.mockResolvedValue({ id: TEST_UUID, isApplied: true });
    await request(app.getHttpServer())
      .post(`/opening-balances/${TEST_UUID}/apply`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /opening-balances/apply-all returns 200 for admin", async () => {
    mockService.applyAll.mockResolvedValue({ applied: 5 });
    await request(app.getHttpServer())
      .post("/opening-balances/apply-all")
      .set("Authorization", "Bearer admin-token")
      .send({ balanceDate: "2025-01-01" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /opening-balances/:id returns 204 for admin", async () => {
    mockService.remove.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/opening-balances/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("DELETE /opening-balances/:id rejects viewer role", async () => {
    await request(app.getHttpServer())
      .delete(`/opening-balances/${TEST_UUID}`)
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });
});
