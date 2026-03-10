import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";

describe("EmployeesController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      EmployeesController,
      EmployeesService,
      [
        "createEmployee",
        "getEmployees",
        "getStats",
        "getActiveEmployees",
        "getEmployeesByRole",
        "getEmployeeByTelegram",
        "getEmployee",
        "updateEmployee",
        "deleteEmployee",
        "terminateEmployee",
        "linkToUser",
        "unlinkFromUser",
        "createDepartment",
        "getDepartments",
        "getDepartment",
        "updateDepartment",
        "deleteDepartment",
        "createPosition",
        "getPositions",
        "getPosition",
        "updatePosition",
        "checkIn",
        "checkOut",
        "getAttendance",
        "getDailyReport",
        "createLeaveRequest",
        "getLeaveRequests",
        "getLeaveBalance",
        "approveLeave",
        "rejectLeave",
        "cancelLeave",
        "calculatePayroll",
        "getPayrolls",
        "getPayroll",
        "approvePayroll",
        "payPayroll",
        "createReview",
        "getReviews",
        "getReview",
        "submitReview",
      ],
    ));
  });

  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── AUTH ──────────────────────────────────────────────────────
  it("returns 401 without auth", async () => {
    await request(app.getHttpServer())
      .get("/employees")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  // ── CRUD ─────────────────────────────────────────────────────
  it("GET /employees returns 200 with auth", async () => {
    mockService.getEmployees.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/employees")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /employees rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/employees")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /employees rejects operator role", async () => {
    await request(app.getHttpServer())
      .get("/employees")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /employees/stats returns 200", async () => {
    mockService.getStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/employees/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /employees/active returns 200 with operator role", async () => {
    mockService.getActiveEmployees.mockResolvedValue({
      items: [],
      total: 0,
    });
    await request(app.getHttpServer())
      .get("/employees/active")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.OK);
  });

  it("GET /employees/by-role/:role returns 200", async () => {
    mockService.getEmployeesByRole.mockResolvedValue({
      items: [],
      total: 0,
    });
    await request(app.getHttpServer())
      .get("/employees/by-role/operator")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /employees/by-telegram/:telegramUserId returns 200", async () => {
    mockService.getEmployeeByTelegram.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get("/employees/by-telegram/12345")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /employees/:id returns 200", async () => {
    mockService.getEmployee.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/employees/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees returns 201 with valid body", async () => {
    mockService.createEmployee.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/employees")
      .set("Authorization", "Bearer admin-token")
      .send({
        firstName: "John",
        lastName: "Doe",
        employeeRole: "operator",
        hireDate: "2026-01-15",
      })
      .expect(HttpStatus.CREATED);
  });

  it("PUT /employees/:id returns 200", async () => {
    mockService.updateEmployee.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/employees/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ firstName: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /employees/:id returns 204", async () => {
    mockService.deleteEmployee.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/employees/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ── ACTIONS ──────────────────────────────────────────────────
  it("POST /employees/:id/terminate returns 200", async () => {
    mockService.terminateEmployee.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/employees/${TEST_UUID}/terminate`)
      .set("Authorization", "Bearer admin-token")
      .send({ terminationDate: "2026-03-10", reason: "End of contract" })
      .expect(HttpStatus.OK);
  });

  it("POST /employees/:id/link-user returns 200", async () => {
    mockService.linkToUser.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/employees/${TEST_UUID}/link-user`)
      .set("Authorization", "Bearer admin-token")
      .send({ userId: TEST_UUID })
      .expect(HttpStatus.OK);
  });

  it("POST /employees/:id/unlink-user returns 200", async () => {
    mockService.unlinkFromUser.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/employees/${TEST_UUID}/unlink-user`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── DEPARTMENTS ──────────────────────────────────────────────
  it("POST /employees/departments returns 201", async () => {
    mockService.createDepartment.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/employees/departments")
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Engineering", code: "ENG" })
      .expect(HttpStatus.CREATED);
  });

  it("GET /employees/departments returns 200", async () => {
    mockService.getDepartments.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/employees/departments")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("GET /employees/departments/:id returns 200", async () => {
    mockService.getDepartment.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/employees/departments/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PUT /employees/departments/:id returns 200", async () => {
    mockService.updateDepartment.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/employees/departments/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ name: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /employees/departments/:id returns 204", async () => {
    mockService.deleteDepartment.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/employees/departments/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  // ── POSITIONS ────────────────────────────────────────────────
  it("GET /employees/positions returns 200", async () => {
    mockService.getPositions.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/employees/positions")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/positions returns 201", async () => {
    mockService.createPosition.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/employees/positions")
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Senior Engineer", code: "SR-ENG", level: "senior" })
      .expect(HttpStatus.CREATED);
  });

  it("GET /employees/positions/:id returns 200", async () => {
    mockService.getPosition.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/employees/positions/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PUT /employees/positions/:id returns 200", async () => {
    mockService.updatePosition.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/employees/positions/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ title: "Updated" })
      .expect(HttpStatus.OK);
  });

  // ── ATTENDANCE ───────────────────────────────────────────────
  it("GET /employees/attendance returns 200", async () => {
    mockService.getAttendance.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/employees/attendance")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/attendance/check-in returns 201", async () => {
    mockService.checkIn.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/employees/attendance/check-in")
      .set("Authorization", "Bearer operator-token")
      .send({ employeeId: TEST_UUID })
      .expect(HttpStatus.CREATED);
  });

  it("POST /employees/attendance/check-out returns 200", async () => {
    mockService.checkOut.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/employees/attendance/check-out")
      .set("Authorization", "Bearer operator-token")
      .send({ employeeId: TEST_UUID })
      .expect(HttpStatus.OK);
  });

  it("GET /employees/attendance/daily returns 200", async () => {
    mockService.getDailyReport.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/employees/attendance/daily")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── LEAVE REQUESTS ───────────────────────────────────────────
  it("GET /employees/leave returns 200", async () => {
    mockService.getLeaveRequests.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/employees/leave")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/leave returns 201", async () => {
    mockService.createLeaveRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/employees/leave")
      .set("Authorization", "Bearer operator-token")
      .send({
        employeeId: TEST_UUID,
        leaveType: "annual",
        startDate: "2026-04-01",
        endDate: "2026-04-05",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /employees/leave/balance/:employeeId returns 200", async () => {
    mockService.getLeaveBalance.mockResolvedValue({});
    await request(app.getHttpServer())
      .get(`/employees/leave/balance/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/leave/:id/approve returns 200", async () => {
    mockService.approveLeave.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/employees/leave/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/leave/:id/reject returns 200", async () => {
    mockService.rejectLeave.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/employees/leave/${TEST_UUID}/reject`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Too short notice" })
      .expect(HttpStatus.OK);
  });

  it("POST /employees/leave/:id/cancel returns 200", async () => {
    mockService.cancelLeave.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/employees/leave/${TEST_UUID}/cancel`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.OK);
  });

  // ── PAYROLL ──────────────────────────────────────────────────
  it("GET /employees/payroll returns 200", async () => {
    mockService.getPayrolls.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/employees/payroll")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/payroll/calculate returns 201", async () => {
    mockService.calculatePayroll.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/employees/payroll/calculate")
      .set("Authorization", "Bearer admin-token")
      .send({
        employeeId: TEST_UUID,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /employees/payroll/:id returns 200", async () => {
    mockService.getPayroll.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/employees/payroll/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/payroll/:id/approve returns 200", async () => {
    mockService.approvePayroll.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/employees/payroll/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/payroll/:id/pay returns 200", async () => {
    mockService.payPayroll.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/employees/payroll/${TEST_UUID}/pay`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── REVIEWS ──────────────────────────────────────────────────
  it("GET /employees/reviews returns 200", async () => {
    mockService.getReviews.mockResolvedValue({ items: [], total: 0 });
    await request(app.getHttpServer())
      .get("/employees/reviews")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/reviews returns 201", async () => {
    mockService.createReview.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/employees/reviews")
      .set("Authorization", "Bearer admin-token")
      .send({
        employeeId: TEST_UUID,
        reviewerId: TEST_UUID,
        reviewPeriod: "quarterly",
        periodStart: "2026-01-01",
        periodEnd: "2026-03-31",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /employees/reviews/:id returns 200", async () => {
    mockService.getReview.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/employees/reviews/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /employees/reviews/:id/submit returns 200", async () => {
    mockService.submitReview.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/employees/reviews/${TEST_UUID}/submit`)
      .set("Authorization", "Bearer admin-token")
      .send({ overallRating: 4, ratings: { quality: 4, productivity: 5 } })
      .expect(HttpStatus.OK);
  });
});
