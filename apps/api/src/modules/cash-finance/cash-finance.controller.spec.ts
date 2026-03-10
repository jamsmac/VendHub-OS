import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { CashFinanceController } from "./cash-finance.controller";
import { CashFinanceService } from "./cash-finance.service";

describe("CashFinanceController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      CashFinanceController,
      CashFinanceService,
      ["getBalance", "findAllDeposits", "createDeposit", "removeDeposit"],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // AUTH
  // ==========================================================================

  it("GET /finance/balance returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/finance/balance")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ==========================================================================
  // BALANCE
  // ==========================================================================

  it("GET /finance/balance returns 200 with admin auth", async () => {
    mockService.getBalance.mockResolvedValue({
      cashOnHand: 1000000,
      totalDeposits: 500000,
    });
    await request(app.getHttpServer())
      .get("/finance/balance")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ==========================================================================
  // DEPOSITS
  // ==========================================================================

  it("GET /finance/deposits returns 200 with admin auth", async () => {
    mockService.findAllDeposits.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/finance/deposits")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /finance/deposits returns 201 with admin auth", async () => {
    mockService.createDeposit.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/finance/deposits")
      .set("Authorization", "Bearer admin-token")
      .send({
        amount: 500000,
        date: "2025-01-15",
      })
      .expect(HttpStatus.CREATED);
  });

  it("DELETE /finance/deposits/:id returns 204 with admin auth", async () => {
    mockService.removeDeposit.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/finance/deposits/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ==========================================================================
  // ROLE RESTRICTIONS (class-level @Roles: owner, admin, manager)
  // ==========================================================================

  it("GET /finance/balance rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/finance/balance")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /finance/deposits rejects operator role", async () => {
    await request(app.getHttpServer())
      .get("/finance/deposits")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("POST /finance/deposits rejects viewer role", async () => {
    await request(app.getHttpServer())
      .post("/finance/deposits")
      .set("Authorization", "Bearer viewer-token")
      .send({ amount: 500000, date: "2025-01-15" })
      .expect(HttpStatus.FORBIDDEN);
  });
});
