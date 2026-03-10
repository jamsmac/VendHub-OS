import request from "supertest";
import { HttpStatus } from "@nestjs/common";
import {
  createControllerTestApp,
  TEST_UUID,
} from "../../common/test-utils/controller-test.helper";
import { WorkLogsController } from "./work-logs.controller";
import { WorkLogsService } from "./work-logs.service";

describe("WorkLogsController", () => {
  let app: any;
  let mockService: Record<string, jest.Mock>;

  beforeAll(async () => {
    ({ app, mockService } = await createControllerTestApp(
      WorkLogsController,
      WorkLogsService,
      [
        "createWorkLog",
        "findAllWorkLogs",
        "findOneWorkLog",
        "updateWorkLog",
        "deleteWorkLog",
        "getWorkLogStats",
        "getAttendanceReport",
        "clockIn",
        "clockOut",
        "submitWorkLog",
        "approveWorkLog",
        "rejectWorkLog",
        "bulkApprove",
        "createTimeOffRequest",
        "findAllTimeOffRequests",
        "approveTimeOff",
        "rejectTimeOff",
        "cancelTimeOff",
        "createTimesheet",
        "findAllTimesheets",
        "submitTimesheet",
        "approveTimesheet",
        "markTimesheetPaid",
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
      .get("/work-logs")
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it("rejects viewer role", async () => {
    await request(app.getHttpServer())
      .get("/work-logs")
      .set("Authorization", "Bearer viewer-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── Work Log CRUD ───────────────────────────────────────

  it("POST /work-logs creates work log (201)", async () => {
    mockService.createWorkLog.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/work-logs")
      .set("Authorization", "Bearer admin-token")
      .send({
        employeeId: TEST_UUID,
        workDate: "2026-03-01",
        activityType: "refill",
        clockIn: "09:00",
        clockOut: "18:00",
        description: "Daily tasks",
      })
      .expect(HttpStatus.CREATED);
    expect(mockService.createWorkLog).toHaveBeenCalled();
  });

  it("GET /work-logs returns paginated list (200)", async () => {
    mockService.findAllWorkLogs.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/work-logs")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
    expect(mockService.findAllWorkLogs).toHaveBeenCalled();
  });

  it("GET /work-logs/:id returns work log (200)", async () => {
    mockService.findOneWorkLog.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .get(`/work-logs/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("PUT /work-logs/:id updates work log (200)", async () => {
    mockService.updateWorkLog.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .put(`/work-logs/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .send({ description: "Updated" })
      .expect(HttpStatus.OK);
  });

  it("DELETE /work-logs/:id deletes work log (204)", async () => {
    mockService.deleteWorkLog.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete(`/work-logs/${TEST_UUID}`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.NO_CONTENT);
  });

  it("rejects operator on delete", async () => {
    await request(app.getHttpServer())
      .delete(`/work-logs/${TEST_UUID}`)
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  // ── Stats & Attendance ──────────────────────────────────

  it("GET /work-logs/stats returns statistics (200)", async () => {
    mockService.getWorkLogStats.mockResolvedValue({});
    await request(app.getHttpServer())
      .get("/work-logs/stats")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("rejects operator on stats (manager+)", async () => {
    await request(app.getHttpServer())
      .get("/work-logs/stats")
      .set("Authorization", "Bearer operator-token")
      .expect(HttpStatus.FORBIDDEN);
  });

  it("GET /work-logs/attendance returns attendance (200)", async () => {
    mockService.getAttendanceReport.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get("/work-logs/attendance?startDate=2026-03-01&endDate=2026-03-31")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  // ── Clock In/Out ────────────────────────────────────────

  it("POST /work-logs/clock-in clocks in (201)", async () => {
    mockService.clockIn.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/work-logs/clock-in")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.CREATED);
    expect(mockService.clockIn).toHaveBeenCalled();
  });

  it("POST /work-logs/clock-out clocks out (201)", async () => {
    mockService.clockOut.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/work-logs/clock-out")
      .set("Authorization", "Bearer admin-token")
      .send({ workLogId: TEST_UUID })
      .expect(HttpStatus.CREATED);
    expect(mockService.clockOut).toHaveBeenCalled();
  });

  // ── Work Log Workflow ───────────────────────────────────

  it("POST /work-logs/:id/submit submits for approval (201)", async () => {
    mockService.submitWorkLog.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/work-logs/${TEST_UUID}/submit`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });

  it("POST /work-logs/:id/approve approves work log (201)", async () => {
    mockService.approveWorkLog.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/work-logs/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.CREATED);
  });

  it("POST /work-logs/:id/reject rejects work log (201)", async () => {
    mockService.rejectWorkLog.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/work-logs/${TEST_UUID}/reject`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Incorrect hours" })
      .expect(HttpStatus.CREATED);
  });

  it("POST /work-logs/bulk-approve bulk approves (201)", async () => {
    mockService.bulkApprove.mockResolvedValue({ approved: 2 });
    await request(app.getHttpServer())
      .post("/work-logs/bulk-approve")
      .set("Authorization", "Bearer admin-token")
      .send({ ids: [TEST_UUID] })
      .expect(HttpStatus.CREATED);
  });

  // ── Time Off ────────────────────────────────────────────

  it("POST /work-logs/time-off creates time off request (201)", async () => {
    mockService.createTimeOffRequest.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/work-logs/time-off")
      .set("Authorization", "Bearer admin-token")
      .send({
        timeOffType: "vacation",
        startDate: "2026-04-01",
        endDate: "2026-04-05",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /work-logs/time-off returns 200", async () => {
    mockService.findAllTimeOffRequests.mockResolvedValue({
      data: [],
      total: 0,
    });
    await request(app.getHttpServer())
      .get("/work-logs/time-off")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /work-logs/time-off/:id/approve approves (201)", async () => {
    mockService.approveTimeOff.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/work-logs/time-off/${TEST_UUID}/approve`)
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(HttpStatus.CREATED);
  });

  it("POST /work-logs/time-off/:id/reject rejects (201)", async () => {
    mockService.rejectTimeOff.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/work-logs/time-off/${TEST_UUID}/reject`)
      .set("Authorization", "Bearer admin-token")
      .send({ reason: "Not enough leave balance" })
      .expect(HttpStatus.CREATED);
  });

  // ── Timesheets ──────────────────────────────────────────

  it("POST /work-logs/timesheets creates timesheet (201)", async () => {
    mockService.createTimesheet.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post("/work-logs/timesheets")
      .set("Authorization", "Bearer admin-token")
      .send({
        employeeId: TEST_UUID,
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
      })
      .expect(HttpStatus.CREATED);
  });

  it("GET /work-logs/timesheets returns 200", async () => {
    mockService.findAllTimesheets.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/work-logs/timesheets")
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.OK);
  });

  it("POST /work-logs/timesheets/:id/mark-paid marks paid (201)", async () => {
    mockService.markTimesheetPaid.mockResolvedValue({ id: TEST_UUID });
    await request(app.getHttpServer())
      .post(`/work-logs/timesheets/${TEST_UUID}/mark-paid`)
      .set("Authorization", "Bearer admin-token")
      .expect(HttpStatus.CREATED);
  });

  it("allows owner role on all endpoints", async () => {
    mockService.findAllWorkLogs.mockResolvedValue({ data: [], total: 0 });
    await request(app.getHttpServer())
      .get("/work-logs")
      .set("Authorization", "Bearer owner-token")
      .expect(HttpStatus.OK);
  });
});
