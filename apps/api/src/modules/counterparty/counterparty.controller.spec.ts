import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { CounterpartyController } from "./counterparty.controller";
import { CounterpartyService } from "./counterparty.service";

describe("CounterpartyController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      CounterpartyController,
      CounterpartyService,
      [
        "createCounterparty",
        "getCounterparty",
        "getCounterpartiesByType",
        "updateCounterparty",
        "deleteCounterparty",
        "createContract",
        "getContract",
        "getCounterpartyContracts",
        "activateContract",
        "terminateContract",
        "getCommissionCalculations",
        "calculateTotalCommission",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /counterparties", () => {
    it("should create a counterparty", async () => {
      const dto = {
        name: "Test Partner",
        type: "partner",
        inn: "123456789",
      };
      mockService.createCounterparty.mockResolvedValue({
        id: TEST_UUID,
        ...dto,
      });

      const res = await request(app.getHttpServer())
        .post("/counterparties")
        .set("Authorization", "Bearer admin-token")
        .send(dto);

      expect(res.status).toBe(HttpStatus.CREATED);
      expect(mockService.createCounterparty).toHaveBeenCalled();
    });
  });

  describe("GET /counterparties", () => {
    it("should list counterparties", async () => {
      mockService.getCounterpartiesByType.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get("/counterparties")
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(HttpStatus.OK);
    });
  });

  describe("GET /counterparties/:id", () => {
    it("should return a counterparty", async () => {
      mockService.getCounterparty.mockResolvedValue({
        id: TEST_UUID,
        name: "Test",
      });

      const res = await request(app.getHttpServer())
        .get(`/counterparties/${TEST_UUID}`)
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(HttpStatus.OK);
    });
  });

  describe("PUT /counterparties/:id", () => {
    it("should update a counterparty", async () => {
      mockService.updateCounterparty.mockResolvedValue({
        id: TEST_UUID,
        name: "Updated",
      });

      const res = await request(app.getHttpServer())
        .put(`/counterparties/${TEST_UUID}`)
        .set("Authorization", "Bearer admin-token")
        .send({ name: "Updated" });

      expect(res.status).toBe(HttpStatus.OK);
    });
  });

  describe("DELETE /counterparties/:id", () => {
    it("should soft-delete a counterparty", async () => {
      mockService.deleteCounterparty.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .delete(`/counterparties/${TEST_UUID}`)
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(HttpStatus.NO_CONTENT);
    });
  });

  describe("POST /counterparties/:id/contracts", () => {
    it("should create a contract", async () => {
      const dto = {
        contractNumber: "C-001",
        startDate: "2026-01-01",
        commissionType: "percentage",
        commissionRate: 10,
      };
      mockService.createContract.mockResolvedValue({
        id: TEST_UUID,
        ...dto,
      });

      const res = await request(app.getHttpServer())
        .post(`/counterparties/${TEST_UUID}/contracts`)
        .set("Authorization", "Bearer admin-token")
        .send(dto);

      expect(res.status).toBe(HttpStatus.CREATED);
    });
  });

  describe("POST /counterparties/:id/contracts/:contractId/activate", () => {
    it("should activate a contract", async () => {
      mockService.activateContract.mockResolvedValue({
        id: TEST_UUID,
        status: "active",
      });

      const res = await request(app.getHttpServer())
        .post(`/counterparties/${TEST_UUID}/contracts/${TEST_UUID}/activate`)
        .set("Authorization", "Bearer admin-token");

      expect(res.status).toBe(HttpStatus.CREATED);
    });
  });
});
