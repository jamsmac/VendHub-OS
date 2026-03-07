import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PayrollService } from "./payroll.service";
import { Payroll, PayrollStatus } from "../entities/payroll.entity";
import { Attendance, AttendanceStatus } from "../entities/attendance.entity";
import { Employee } from "../entities/employee.entity";

const ORG_ID = "org-uuid-00000000-0000-0000-0000-000000000001";

describe("PayrollService", () => {
  let service: PayrollService;
  let payrollRepo: any;
  let attendanceRepo: any;
  let employeeRepo: any;
  let eventEmitter: any;

  const mockEmployee = {
    id: "emp-uuid-1",
    organizationId: ORG_ID,
    firstName: "Aziz",
    lastName: "Karimov",
    salary: 5000000,
  } as unknown as Employee;

  const mockPayroll = {
    id: "pay-uuid-1",
    organizationId: ORG_ID,
    employeeId: "emp-uuid-1",
    periodStart: new Date("2024-03-01"),
    periodEnd: new Date("2024-03-31"),
    baseSalary: 4500000,
    overtimePay: 200000,
    bonuses: 0,
    deductions: 0,
    taxAmount: 564000,
    netSalary: 4136000,
    currency: "UZS",
    status: PayrollStatus.CALCULATED,
    calculatedAt: new Date(),
    approvedById: null,
    approvedAt: null,
    paidAt: null,
    paymentReference: null,
    workingDays: 26,
    workedDays: 24,
    overtimeHours: 10,
    details: {
      dailyRate: 192307.69,
      grossSalary: 4700000,
      taxRate: 0.12,
      overtimeRate: 1.5,
    },
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Payroll;

  const mockAttendances = [
    { id: "att-1", status: AttendanceStatus.PRESENT, overtimeHours: 2 },
    { id: "att-2", status: AttendanceStatus.PRESENT, overtimeHours: 0 },
    { id: "att-3", status: AttendanceStatus.LATE, overtimeHours: 3 },
    { id: "att-4", status: AttendanceStatus.ABSENT, overtimeHours: 0 },
  ] as unknown as Attendance[];

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockPayroll], 1]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueryBuilder.where.mockReturnThis();
    mockQueryBuilder.andWhere.mockReturnThis();
    mockQueryBuilder.orderBy.mockReturnThis();
    mockQueryBuilder.skip.mockReturnThis();
    mockQueryBuilder.take.mockReturnThis();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[mockPayroll], 1]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        {
          provide: getRepositoryToken(Payroll),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    payrollRepo = module.get(getRepositoryToken(Payroll));
    attendanceRepo = module.get(getRepositoryToken(Attendance));
    employeeRepo = module.get(getRepositoryToken(Employee));
    eventEmitter = module.get(EventEmitter2);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("calculatePayroll", () => {
    it("should calculate payroll for an employee", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      payrollRepo.findOne.mockResolvedValue(null);
      attendanceRepo.find.mockResolvedValue(mockAttendances);
      payrollRepo.create.mockReturnValue({
        organizationId: ORG_ID,
        employeeId: "emp-uuid-1",
        periodStart: new Date("2024-03-01"),
        periodEnd: new Date("2024-03-31"),
      });
      payrollRepo.save.mockImplementation(async (p: any) => ({
        id: "pay-uuid-new",
        ...p,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const dto = {
        employeeId: "emp-uuid-1",
        periodStart: "2024-03-01",
        periodEnd: "2024-03-31",
      };

      const result = await service.calculatePayroll(
        ORG_ID,
        dto as any,
        "user-1",
      );

      expect(result).toBeDefined();
      expect(result.currency).toBe("UZS");
      expect(result.status).toBe(PayrollStatus.CALCULATED);
      expect(payrollRepo.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when employee not found", async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      const dto = {
        employeeId: "non-existent",
        periodStart: "2024-03-01",
        periodEnd: "2024-03-31",
      };

      await expect(
        service.calculatePayroll(ORG_ID, dto as any, "user-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException when payroll already exists and is not draft", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      payrollRepo.findOne.mockResolvedValue({
        ...mockPayroll,
        status: PayrollStatus.APPROVED,
      });

      const dto = {
        employeeId: "emp-uuid-1",
        periodStart: "2024-03-01",
        periodEnd: "2024-03-31",
      };

      await expect(
        service.calculatePayroll(ORG_ID, dto as any, "user-1"),
      ).rejects.toThrow(ConflictException);
    });

    it("should recalculate when existing payroll is in draft status", async () => {
      const draftPayroll = { ...mockPayroll, status: PayrollStatus.DRAFT };
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      payrollRepo.findOne.mockResolvedValue(draftPayroll);
      attendanceRepo.find.mockResolvedValue(mockAttendances);
      payrollRepo.save.mockImplementation(async (p: any) => ({
        ...p,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const dto = {
        employeeId: "emp-uuid-1",
        periodStart: "2024-03-01",
        periodEnd: "2024-03-31",
      };

      const result = await service.calculatePayroll(
        ORG_ID,
        dto as any,
        "user-1",
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(PayrollStatus.CALCULATED);
    });

    it("should apply 12% Uzbekistan income tax", async () => {
      employeeRepo.findOne.mockResolvedValue({
        ...mockEmployee,
        salary: 1000000,
      });
      payrollRepo.findOne.mockResolvedValue(null);
      attendanceRepo.find.mockResolvedValue([
        { status: AttendanceStatus.PRESENT, overtimeHours: 0 },
      ]);
      payrollRepo.create.mockReturnValue({
        organizationId: ORG_ID,
        employeeId: "emp-uuid-1",
        periodStart: new Date("2024-03-01"),
        periodEnd: new Date("2024-03-31"),
      });
      payrollRepo.save.mockImplementation(async (p: any) => ({
        id: "pay-new",
        ...p,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const dto = {
        employeeId: "emp-uuid-1",
        periodStart: "2024-03-01",
        periodEnd: "2024-03-31",
      };

      const result = await service.calculatePayroll(
        ORG_ID,
        dto as any,
        "user-1",
      );

      expect(result.details).toEqual(
        expect.objectContaining({ taxRate: 0.12 }),
      );
    });
  });

  describe("approvePayroll", () => {
    it("should approve a calculated payroll", async () => {
      payrollRepo.findOne.mockResolvedValue({
        ...mockPayroll,
        status: PayrollStatus.CALCULATED,
      });
      payrollRepo.save.mockImplementation(async (p: any) => p);

      const result = await service.approvePayroll(
        "pay-uuid-1",
        ORG_ID,
        "approver-1",
      );

      expect(result.status).toBe(PayrollStatus.APPROVED);
      expect(result.approvedById).toBe("approver-1");
    });

    it("should throw NotFoundException when payroll not found", async () => {
      payrollRepo.findOne.mockResolvedValue(null);

      await expect(
        service.approvePayroll("non-existent", ORG_ID, "approver-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when payroll is not in calculated status", async () => {
      payrollRepo.findOne.mockResolvedValue({
        ...mockPayroll,
        status: PayrollStatus.PAID,
      });

      await expect(
        service.approvePayroll("pay-uuid-1", ORG_ID, "approver-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("payPayroll", () => {
    it("should mark approved payroll as paid", async () => {
      payrollRepo.findOne.mockResolvedValue({
        ...mockPayroll,
        status: PayrollStatus.APPROVED,
      });
      payrollRepo.save.mockImplementation(async (p: any) => p);

      const result = await service.payPayroll("pay-uuid-1", ORG_ID, "REF-123");

      expect(result.status).toBe(PayrollStatus.PAID);
      expect(result.paymentReference).toBe("REF-123");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "payroll.paid",
        expect.objectContaining({ payrollId: "pay-uuid-1" }),
      );
    });

    it("should throw BadRequestException when payroll is not approved", async () => {
      payrollRepo.findOne.mockResolvedValue({
        ...mockPayroll,
        status: PayrollStatus.CALCULATED,
      });

      await expect(service.payPayroll("pay-uuid-1", ORG_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when payroll not found", async () => {
      payrollRepo.findOne.mockResolvedValue(null);

      await expect(service.payPayroll("non-existent", ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getPayrolls", () => {
    it("should return paginated payrolls", async () => {
      const result = await service.getPayrolls(ORG_ID, {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should filter by employeeId", async () => {
      await service.getPayrolls(ORG_ID, { employeeId: "emp-uuid-1" } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "p.employeeId = :employeeId",
        { employeeId: "emp-uuid-1" },
      );
    });

    it("should filter by status", async () => {
      await service.getPayrolls(ORG_ID, { status: PayrollStatus.PAID } as any);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "p.status = :status",
        { status: PayrollStatus.PAID },
      );
    });
  });

  describe("getPayroll", () => {
    it("should return a single payroll record", async () => {
      payrollRepo.findOne.mockResolvedValue(mockPayroll);

      const result = await service.getPayroll("pay-uuid-1", ORG_ID);

      expect(result.id).toBe("pay-uuid-1");
      expect(result.currency).toBe("UZS");
    });

    it("should throw NotFoundException when payroll not found", async () => {
      payrollRepo.findOne.mockResolvedValue(null);

      await expect(service.getPayroll("non-existent", ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("mapPayrollToDto", () => {
    it("should convert decimal fields to numbers", () => {
      const payroll = {
        ...mockPayroll,
        baseSalary: "4500000" as any,
        overtimePay: "200000" as any,
        bonuses: "0" as any,
        deductions: "0" as any,
        taxAmount: "564000" as any,
        netSalary: "4136000" as any,
        overtimeHours: "10" as any,
      } as unknown as Payroll;

      const dto = service.mapPayrollToDto(payroll);

      expect(typeof dto.baseSalary).toBe("number");
      expect(typeof dto.overtimePay).toBe("number");
      expect(typeof dto.netSalary).toBe("number");
      expect(typeof dto.overtimeHours).toBe("number");
    });
  });
});
