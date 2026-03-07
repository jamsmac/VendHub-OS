/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";

import { AttendanceService } from "./attendance.service";
import { Attendance, AttendanceStatus } from "../entities/attendance.entity";
import { Employee, EmployeeStatus } from "../entities/employee.entity";

const ORG_ID = "org-uuid-00000000-0000-0000-0000-000000000001";

describe("AttendanceService", () => {
  let service: AttendanceService;
  let attendanceRepo: any;
  let employeeRepo: any;

  const mockEmployee = {
    id: "emp-uuid-1",
    organizationId: ORG_ID,
    firstName: "Aziz",
    lastName: "Karimov",
    status: EmployeeStatus.ACTIVE,
  } as Employee;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const mockAttendance = {
    id: "att-uuid-1",
    organizationId: ORG_ID,
    employeeId: "emp-uuid-1",
    date: new Date(todayStr),
    checkIn: new Date(`${todayStr}T08:30:00`),
    checkOut: null,
    totalHours: null,
    overtimeHours: null,
    status: AttendanceStatus.PRESENT,
    note: null,
    checkInLocation: null,
    checkOutLocation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Attendance;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockAttendance], 1]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockAttendance], 1]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getRepositoryToken(Attendance),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    attendanceRepo = module.get(getRepositoryToken(Attendance));
    employeeRepo = module.get(getRepositoryToken(Employee));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("checkIn", () => {
    it("should check in an employee", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue(null);
      attendanceRepo.create.mockReturnValue({
        ...mockAttendance,
        checkIn: null,
      });
      attendanceRepo.save.mockImplementation(async (a: any) => ({
        ...a,
        id: "att-uuid-new",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const dto = { employeeId: "emp-uuid-1" };

      const result = await service.checkIn(ORG_ID, dto as any);

      expect(result).toBeDefined();
      expect(attendanceRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when employee not found", async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkIn(ORG_ID, { employeeId: "non-existent" } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when already checked in today", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue({
        ...mockAttendance,
        checkIn: new Date(),
      });

      await expect(
        service.checkIn(ORG_ID, { employeeId: "emp-uuid-1" } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should save check-in location when provided", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue(null);
      attendanceRepo.create.mockReturnValue({
        ...mockAttendance,
        checkIn: null,
      });
      attendanceRepo.save.mockImplementation(async (a: any) => ({
        ...a,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const dto = {
        employeeId: "emp-uuid-1",
        location: { lat: 41.2995, lng: 69.2401 },
      };

      await service.checkIn(ORG_ID, dto as any);

      expect(attendanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          checkInLocation: { lat: 41.2995, lng: 69.2401 },
        }),
      );
    });
  });

  describe("checkOut", () => {
    it("should check out an employee and calculate hours", async () => {
      const checkInTime = new Date();
      checkInTime.setHours(checkInTime.getHours() - 9);

      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue({
        ...mockAttendance,
        checkIn: checkInTime,
        checkOut: null,
      });
      attendanceRepo.save.mockImplementation(async (a: any) => a);

      const dto = { employeeId: "emp-uuid-1" };

      const result = await service.checkOut(ORG_ID, dto as any);

      expect(result).toBeDefined();
      expect(result.totalHours).toBeGreaterThan(0);
      expect(result.overtimeHours).toBeGreaterThan(0);
    });

    it("should throw BadRequestException when no check-in record found", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkOut(ORG_ID, { employeeId: "emp-uuid-1" } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when already checked out", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue({
        ...mockAttendance,
        checkOut: new Date(),
      });

      await expect(
        service.checkOut(ORG_ID, { employeeId: "emp-uuid-1" } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it("should not set overtime when worked less than 8 hours", async () => {
      const checkInTime = new Date();
      checkInTime.setHours(checkInTime.getHours() - 6);

      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue({
        ...mockAttendance,
        checkIn: checkInTime,
        checkOut: null,
        overtimeHours: null,
      });
      attendanceRepo.save.mockImplementation(async (a: any) => a);

      const result = await service.checkOut(ORG_ID, {
        employeeId: "emp-uuid-1",
      } as any);

      expect(result.overtimeHours).toBeNull();
    });

    it("should append note to existing note on checkout", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue({
        ...mockAttendance,
        checkIn: new Date(),
        checkOut: null,
        note: "Morning note",
      });
      attendanceRepo.save.mockImplementation(async (a: any) => a);

      const dto = { employeeId: "emp-uuid-1", note: "Evening note" };

      const result = await service.checkOut(ORG_ID, dto as any);

      expect(result.note).toBe("Morning note\nEvening note");
    });
  });

  describe("getAttendance", () => {
    it("should return paginated attendance records", async () => {
      const result = await service.getAttendance(ORG_ID, {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by employeeId", async () => {
      await service.getAttendance(ORG_ID, { employeeId: "emp-uuid-1" } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "a.employeeId = :employeeId",
        { employeeId: "emp-uuid-1" },
      );
    });

    it("should filter by date range", async () => {
      await service.getAttendance(ORG_ID, {
        dateFrom: "2024-03-01",
        dateTo: "2024-03-31",
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "a.date >= :dateFrom",
        { dateFrom: "2024-03-01" },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "a.date <= :dateTo",
        { dateTo: "2024-03-31" },
      );
    });

    it("should filter by status", async () => {
      await service.getAttendance(ORG_ID, {
        status: AttendanceStatus.LATE,
      } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "a.status = :status",
        { status: AttendanceStatus.LATE },
      );
    });
  });

  describe("getDailyReport", () => {
    it("should return daily attendance report with counts", async () => {
      attendanceRepo.find.mockResolvedValue([
        { ...mockAttendance, status: AttendanceStatus.PRESENT },
        { ...mockAttendance, id: "att-2", status: AttendanceStatus.LATE },
        { ...mockAttendance, id: "att-3", status: AttendanceStatus.ON_LEAVE },
      ]);
      employeeRepo.count.mockResolvedValue(10);

      const result = await service.getDailyReport(ORG_ID, "2024-03-15");

      expect(result.totalEmployees).toBe(10);
      expect(result.presentCount).toBe(1);
      expect(result.lateCount).toBe(1);
      expect(result.onLeaveCount).toBe(1);
      expect(result.absentCount).toBe(7);
      expect(result.records).toHaveLength(3);
    });

    it("should default absent count to 0 when negative", async () => {
      attendanceRepo.find.mockResolvedValue([
        { ...mockAttendance, status: AttendanceStatus.PRESENT },
        { ...mockAttendance, id: "att-2", status: AttendanceStatus.PRESENT },
        { ...mockAttendance, id: "att-3", status: AttendanceStatus.PRESENT },
      ]);
      employeeRepo.count.mockResolvedValue(2);

      const result = await service.getDailyReport(ORG_ID);

      expect(result.absentCount).toBe(0);
    });

    it("should use today date when no date provided", async () => {
      attendanceRepo.find.mockResolvedValue([]);
      employeeRepo.count.mockResolvedValue(5);

      const result = await service.getDailyReport(ORG_ID);

      expect(result.date).toBeDefined();
      expect(result.totalEmployees).toBe(5);
    });
  });

  describe("getMonthlyReport", () => {
    it("should return attendance records for a specific month", async () => {
      attendanceRepo.find.mockResolvedValue([mockAttendance]);

      const result = await service.getMonthlyReport(
        ORG_ID,
        "emp-uuid-1",
        2024,
        3,
      );

      expect(result).toHaveLength(1);
      expect(attendanceRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: ORG_ID,
            employeeId: "emp-uuid-1",
          }),
          order: { date: "ASC" },
        }),
      );
    });

    it("should return empty array when no records for the month", async () => {
      attendanceRepo.find.mockResolvedValue([]);

      const result = await service.getMonthlyReport(
        ORG_ID,
        "emp-uuid-1",
        2024,
        1,
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("mapAttendanceToDto", () => {
    it("should convert decimal fields to numbers", () => {
      const attendance = {
        ...mockAttendance,
        totalHours: "8.5" as any,
        overtimeHours: "0.5" as any,
      } as unknown as Attendance;

      const dto = service.mapAttendanceToDto(attendance);

      expect(typeof dto.totalHours).toBe("number");
      expect(dto.totalHours).toBe(8.5);
      expect(typeof dto.overtimeHours).toBe("number");
      expect(dto.overtimeHours).toBe(0.5);
    });

    it("should return null for missing totalHours and overtimeHours", () => {
      const attendance = {
        ...mockAttendance,
        totalHours: null,
        overtimeHours: null,
      } as unknown as Attendance;

      const dto = service.mapAttendanceToDto(attendance);

      expect(dto.totalHours).toBeNull();
      expect(dto.overtimeHours).toBeNull();
    });
  });
});
