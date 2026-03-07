import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { EmployeesService } from "./employees.service";
import {
  Employee,
  EmployeeRole,
  EmployeeStatus,
} from "./entities/employee.entity";
import { DepartmentService } from "./services/department.service";
import { PositionService } from "./services/position.service";
import { AttendanceService } from "./services/attendance.service";
import { LeaveService } from "./services/leave.service";
import { PayrollService } from "./services/payroll.service";
import { PerformanceReviewService } from "./services/performance-review.service";

const ORG_ID = "org-uuid-00000000-0000-0000-0000-000000000001";

describe("EmployeesService", () => {
  let service: EmployeesService;
  let employeeRepo: jest.Mocked<Repository<Employee>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let departmentService: jest.Mocked<Partial<DepartmentService>>;
  let attendanceService: jest.Mocked<Partial<AttendanceService>>;

  const mockEmployee = {
    id: "emp-uuid-1",
    organizationId: ORG_ID,
    userId: null,
    employeeNumber: "EMP-0001",
    firstName: "Aziz",
    lastName: "Karimov",
    middleName: null,
    phone: "+998901234567",
    email: "aziz@vendhub.uz",
    employeeRole: EmployeeRole.OPERATOR,
    status: EmployeeStatus.ACTIVE,
    telegramUserId: null,
    telegramUsername: null,
    hireDate: new Date("2024-01-15"),
    terminationDate: null,
    terminationReason: null,
    salary: 5000000,
    salaryFrequency: "monthly",
    address: "Tashkent",
    city: "Tashkent",
    district: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelation: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Employee;

  const mockDepartment = {
    id: "dept-uuid-1",
    organizationId: ORG_ID,
    name: "Operations",
    code: "OPS",
    description: null,
    managerId: null,
    parentDepartmentId: null,
    isActive: true,
    sortOrder: 0,
    subDepartments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAttendance = {
    id: "att-uuid-1",
    organizationId: ORG_ID,
    employeeId: "emp-uuid-1",
    date: new Date(),
    checkIn: new Date(),
    checkOut: null,
    totalHours: null,
    overtimeHours: null,
    status: "present",
    note: null,
    checkInLocation: null,
    checkOutLocation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEmployeeQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockEmployee]),
    getCount: jest.fn().mockResolvedValue(1),
    getManyAndCount: jest.fn().mockResolvedValue([[mockEmployee], 1]),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    departmentService = {
      createDepartment: jest.fn(),
      updateDepartment: jest.fn(),
      getDepartments: jest.fn(),
      getDepartment: jest.fn(),
      deleteDepartment: jest.fn(),
    };

    attendanceService = {
      checkIn: jest.fn(),
      checkOut: jest.fn(),
      getAttendance: jest.fn(),
      getDailyReport: jest.fn(),
      getMonthlyReport: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: getRepositoryToken(Employee),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest
              .fn()
              .mockReturnValue(mockEmployeeQueryBuilder),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        { provide: DepartmentService, useValue: departmentService },
        { provide: PositionService, useValue: {} },
        { provide: AttendanceService, useValue: attendanceService },
        { provide: LeaveService, useValue: {} },
        { provide: PayrollService, useValue: {} },
        { provide: PerformanceReviewService, useValue: {} },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    employeeRepo = module.get(getRepositoryToken(Employee));
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE EMPLOYEE
  // ============================================================================

  describe("createEmployee", () => {
    it("should create an employee with generated number", async () => {
      employeeRepo.count.mockResolvedValue(5);
      employeeRepo.create.mockReturnValue(mockEmployee);
      employeeRepo.save.mockResolvedValue(mockEmployee);

      const dto = {
        firstName: "Aziz",
        lastName: "Karimov",
        phone: "+998901234567",
        email: "aziz@vendhub.uz",
        employeeRole: EmployeeRole.OPERATOR,
        hireDate: "2024-01-15",
      };

      const result = await service.createEmployee(ORG_ID, dto as any);

      expect(result).toBeDefined();
      expect(result.id).toBe("emp-uuid-1");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "employee.created",
        expect.any(Object),
      );
    });
  });

  // ============================================================================
  // GET EMPLOYEES
  // ============================================================================

  describe("getEmployees", () => {
    it("should return paginated employees", async () => {
      const result = await service.getEmployees(ORG_ID, {
        page: 1,
        limit: 20,
      } as any);

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 1);
      expect(result).toHaveProperty("page", 1);
    });

    it("should filter by role", async () => {
      await service.getEmployees(ORG_ID, {
        role: EmployeeRole.OPERATOR,
      } as any);

      expect(mockEmployeeQueryBuilder.andWhere).toHaveBeenCalledWith(
        "e.employeeRole = :role",
        { role: EmployeeRole.OPERATOR },
      );
    });

    it("should filter by search term", async () => {
      await service.getEmployees(ORG_ID, { search: "Aziz" } as any);

      expect(mockEmployeeQueryBuilder.andWhere).toHaveBeenCalledWith(
        "(e.firstName ILIKE :search OR e.lastName ILIKE :search OR e.employeeNumber ILIKE :search OR e.phone ILIKE :search)",
        { search: "%Aziz%" },
      );
    });
  });

  // ============================================================================
  // GET EMPLOYEE
  // ============================================================================

  describe("getEmployee", () => {
    it("should return employee when found", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);

      const result = await service.getEmployee("emp-uuid-1", ORG_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe("emp-uuid-1");
    });

    it("should throw NotFoundException when employee not found", async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(service.getEmployee("non-existent", ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // UPDATE EMPLOYEE
  // ============================================================================

  describe("updateEmployee", () => {
    it("should update employee fields", async () => {
      employeeRepo.findOne.mockResolvedValue({ ...mockEmployee } as any);
      employeeRepo.save.mockImplementation(async (emp) => emp as Employee);

      const result = await service.updateEmployee("emp-uuid-1", ORG_ID, {
        phone: "+998901111111",
      } as any);

      expect(result).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "employee.updated",
        expect.any(Object),
      );
    });

    it("should throw NotFoundException when employee not found", async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateEmployee("non-existent", ORG_ID, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // TERMINATE EMPLOYEE
  // ============================================================================

  describe("terminateEmployee", () => {
    it("should terminate an active employee", async () => {
      employeeRepo.findOne.mockResolvedValue({ ...mockEmployee } as any);
      employeeRepo.save.mockImplementation(async (emp) => emp as Employee);

      const dto = { terminationDate: "2024-06-30", reason: "Contract ended" };

      const result = await service.terminateEmployee(
        "emp-uuid-1",
        ORG_ID,

        dto as any,
      );

      expect(result).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "employee.terminated",
        expect.any(Object),
      );
    });

    it("should throw BadRequestException when employee is already terminated", async () => {
      employeeRepo.findOne.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.TERMINATED,
      } as any);

      await expect(
        service.terminateEmployee("emp-uuid-1", ORG_ID, {
          terminationDate: "2024-06-30",
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // DEPARTMENTS (delegated to DepartmentService)
  // ============================================================================

  describe("createDepartment", () => {
    it("should delegate to departmentService and return result", async () => {
      (departmentService.createDepartment as jest.Mock).mockResolvedValue(
        mockDepartment,
      );

      const dto = { name: "Operations", code: "OPS" };

      const result = await service.createDepartment(ORG_ID, dto as any);

      expect(departmentService.createDepartment).toHaveBeenCalledWith(
        ORG_ID,
        dto,
      );
      expect(result).toBeDefined();
      expect(result.code).toBe("OPS");
    });

    it("should propagate ConflictException from departmentService", async () => {
      (departmentService.createDepartment as jest.Mock).mockRejectedValue(
        new ConflictException("Duplicate code"),
      );

      await expect(
        service.createDepartment(ORG_ID, { name: "Ops", code: "OPS" } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("getDepartments", () => {
    it("should delegate to departmentService", async () => {
      (departmentService.getDepartments as jest.Mock).mockResolvedValue({
        items: [mockDepartment],
        total: 1,
      });

      const result = await service.getDepartments(ORG_ID, {
        page: 1,
        limit: 20,
      } as any);

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total", 1);
    });
  });

  // ============================================================================
  // ATTENDANCE (delegated to AttendanceService)
  // ============================================================================

  describe("checkIn", () => {
    it("should delegate to attendanceService", async () => {
      (attendanceService.checkIn as jest.Mock).mockResolvedValue(
        mockAttendance,
      );

      const dto = { employeeId: "emp-uuid-1" };

      const result = await service.checkIn(ORG_ID, dto as any);

      expect(attendanceService.checkIn).toHaveBeenCalledWith(ORG_ID, dto);
      expect(result).toBeDefined();
      expect(result.employeeId).toBe("emp-uuid-1");
    });

    it("should propagate BadRequestException from attendanceService", async () => {
      (attendanceService.checkIn as jest.Mock).mockRejectedValue(
        new BadRequestException("Already checked in"),
      );

      await expect(
        service.checkIn(ORG_ID, { employeeId: "emp-uuid-1" } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // DELETE EMPLOYEE
  // ============================================================================

  describe("deleteEmployee", () => {
    it("should soft remove employee", async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      employeeRepo.softRemove.mockResolvedValue(mockEmployee);

      await service.deleteEmployee("emp-uuid-1", ORG_ID);

      expect(employeeRepo.softRemove).toHaveBeenCalledWith(mockEmployee);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "employee.deleted",
        expect.any(Object),
      );
    });

    it("should throw NotFoundException when employee not found", async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteEmployee("non-existent", ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // LINK / UNLINK USER
  // ============================================================================

  describe("linkToUser", () => {
    it("should link employee to user", async () => {
      employeeRepo.findOne
        .mockResolvedValueOnce(mockEmployee) // findEmployee
        .mockResolvedValueOnce(null); // no existing link
      employeeRepo.save.mockImplementation(async (emp) => emp as Employee);

      const result = await service.linkToUser(
        "emp-uuid-1",
        ORG_ID,
        "user-uuid-1",
      );

      expect(result).toBeDefined();
    });

    it("should throw ConflictException when user already linked to another employee", async () => {
      const otherEmployee = { ...mockEmployee, id: "emp-uuid-other" } as any;
      employeeRepo.findOne
        .mockResolvedValueOnce(mockEmployee) // findEmployee
        .mockResolvedValueOnce(otherEmployee); // existing link

      await expect(
        service.linkToUser("emp-uuid-1", ORG_ID, "user-uuid-1"),
      ).rejects.toThrow(ConflictException);
    });
  });
});
