import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { EmployeesService } from './employees.service';
import {
  Employee,
  EmployeeDocument,
  EmployeeRole,
  EmployeeStatus,
} from './entities/employee.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { LeaveRequest, LeaveStatus } from './entities/leave-request.entity';
import { Payroll, PayrollStatus } from './entities/payroll.entity';
import { PerformanceReview } from './entities/performance-review.entity';

const ORG_ID = 'org-uuid-00000000-0000-0000-0000-000000000001';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeeRepo: jest.Mocked<Repository<Employee>>;
  let documentRepo: jest.Mocked<Repository<EmployeeDocument>>;
  let departmentRepo: jest.Mocked<Repository<Department>>;
  let positionRepo: jest.Mocked<Repository<Position>>;
  let attendanceRepo: jest.Mocked<Repository<Attendance>>;
  let leaveRequestRepo: jest.Mocked<Repository<LeaveRequest>>;
  let payrollRepo: jest.Mocked<Repository<Payroll>>;
  let reviewRepo: jest.Mocked<Repository<PerformanceReview>>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEmployee = {
    id: 'emp-uuid-1',
    organizationId: ORG_ID,
    userId: null,
    employeeNumber: 'EMP-0001',
    firstName: 'Aziz',
    lastName: 'Karimov',
    middleName: null,
    phone: '+998901234567',
    email: 'aziz@vendhub.uz',
    employeeRole: EmployeeRole.OPERATOR,
    status: EmployeeStatus.ACTIVE,
    telegramUserId: null,
    telegramUsername: null,
    hireDate: new Date('2024-01-15'),
    terminationDate: null,
    terminationReason: null,
    salary: 5000000,
    salaryFrequency: 'monthly',
    address: 'Tashkent',
    city: 'Tashkent',
    district: null,
    emergencyContactName: null,
    emergencyContactPhone: null,
    emergencyContactRelation: null,
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Employee;

  const mockDepartment = {
    id: 'dept-uuid-1',
    organizationId: ORG_ID,
    name: 'Operations',
    code: 'OPS',
    description: null,
    managerId: null,
    parentDepartmentId: null,
    isActive: true,
    sortOrder: 0,
    subDepartments: [],
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Department;

  const mockAttendance = {
    id: 'att-uuid-1',
    organizationId: ORG_ID,
    employeeId: 'emp-uuid-1',
    date: new Date(),
    checkIn: new Date(),
    checkOut: null,
    totalHours: null,
    overtimeHours: null,
    status: AttendanceStatus.PRESENT,
    note: null,
    checkInLocation: null,
    checkOutLocation: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Attendance;

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

  const mockDeptQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockDepartment], 1]),
  };

  const mockAttendanceQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockAttendance], 1]),
  };

  const mockLeaveQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  beforeEach(async () => {
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
            createQueryBuilder: jest.fn().mockReturnValue(mockEmployeeQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(EmployeeDocument),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Department),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockDeptQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Position),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockDeptQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Attendance),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockAttendanceQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(LeaveRequest),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockLeaveQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Payroll),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PerformanceReview),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockEmployeeQueryBuilder),
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

    service = module.get<EmployeesService>(EmployeesService);
    employeeRepo = module.get(getRepositoryToken(Employee));
    documentRepo = module.get(getRepositoryToken(EmployeeDocument));
    departmentRepo = module.get(getRepositoryToken(Department));
    positionRepo = module.get(getRepositoryToken(Position));
    attendanceRepo = module.get(getRepositoryToken(Attendance));
    leaveRequestRepo = module.get(getRepositoryToken(LeaveRequest));
    payrollRepo = module.get(getRepositoryToken(Payroll));
    reviewRepo = module.get(getRepositoryToken(PerformanceReview));
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE EMPLOYEE
  // ============================================================================

  describe('createEmployee', () => {
    it('should create an employee with generated number', async () => {
      employeeRepo.count.mockResolvedValue(5);
      employeeRepo.create.mockReturnValue(mockEmployee);
      employeeRepo.save.mockResolvedValue(mockEmployee);

      const dto = {
        firstName: 'Aziz',
        lastName: 'Karimov',
        phone: '+998901234567',
        email: 'aziz@vendhub.uz',
        employeeRole: EmployeeRole.OPERATOR,
        hireDate: '2024-01-15',
      };

      const result = await service.createEmployee(ORG_ID, dto as any);

      expect(result).toBeDefined();
      expect(result.id).toBe('emp-uuid-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith('employee.created', expect.any(Object));
    });
  });

  // ============================================================================
  // GET EMPLOYEES
  // ============================================================================

  describe('getEmployees', () => {
    it('should return paginated employees', async () => {
      const result = await service.getEmployees(ORG_ID, { page: 1, limit: 20 } as any);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
    });

    it('should filter by role', async () => {
      await service.getEmployees(ORG_ID, { role: EmployeeRole.OPERATOR } as any);

      expect(mockEmployeeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'e.employeeRole = :role',
        { role: EmployeeRole.OPERATOR },
      );
    });

    it('should filter by search term', async () => {
      await service.getEmployees(ORG_ID, { search: 'Aziz' } as any);

      expect(mockEmployeeQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(e.firstName ILIKE :search OR e.lastName ILIKE :search OR e.employeeNumber ILIKE :search OR e.phone ILIKE :search)',
        { search: '%Aziz%' },
      );
    });
  });

  // ============================================================================
  // GET EMPLOYEE
  // ============================================================================

  describe('getEmployee', () => {
    it('should return employee when found', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);

      const result = await service.getEmployee('emp-uuid-1', ORG_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe('emp-uuid-1');
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getEmployee('non-existent', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // UPDATE EMPLOYEE
  // ============================================================================

  describe('updateEmployee', () => {
    it('should update employee fields', async () => {
      employeeRepo.findOne.mockResolvedValue({ ...mockEmployee } as any);
      employeeRepo.save.mockImplementation(async (emp) => emp as Employee);

      const result = await service.updateEmployee('emp-uuid-1', ORG_ID, { phone: '+998901111111' } as any);

      expect(result).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('employee.updated', expect.any(Object));
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateEmployee('non-existent', ORG_ID, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // TERMINATE EMPLOYEE
  // ============================================================================

  describe('terminateEmployee', () => {
    it('should terminate an active employee', async () => {
      employeeRepo.findOne.mockResolvedValue({ ...mockEmployee } as any);
      employeeRepo.save.mockImplementation(async (emp) => emp as Employee);

      const dto = { terminationDate: '2024-06-30', reason: 'Contract ended' };
      const result = await service.terminateEmployee('emp-uuid-1', ORG_ID, dto as any);

      expect(result).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('employee.terminated', expect.any(Object));
    });

    it('should throw BadRequestException when employee is already terminated', async () => {
      employeeRepo.findOne.mockResolvedValue({
        ...mockEmployee,
        status: EmployeeStatus.TERMINATED,
      } as any);

      await expect(
        service.terminateEmployee('emp-uuid-1', ORG_ID, { terminationDate: '2024-06-30' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // DEPARTMENTS
  // ============================================================================

  describe('createDepartment', () => {
    it('should create a department with unique code', async () => {
      departmentRepo.findOne.mockResolvedValue(null); // no existing code
      departmentRepo.create.mockReturnValue(mockDepartment as any);
      departmentRepo.save.mockResolvedValue(mockDepartment as any);

      const dto = { name: 'Operations', code: 'OPS' };
      const result = await service.createDepartment(ORG_ID, dto as any);

      expect(result).toBeDefined();
      expect(result.code).toBe('OPS');
    });

    it('should throw ConflictException for duplicate department code', async () => {
      departmentRepo.findOne.mockResolvedValue(mockDepartment as any);

      await expect(
        service.createDepartment(ORG_ID, { name: 'Ops', code: 'OPS' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getDepartments', () => {
    it('should return paginated departments', async () => {
      const result = await service.getDepartments(ORG_ID, { page: 1, limit: 20 } as any);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 1);
    });
  });

  // ============================================================================
  // ATTENDANCE (CHECK IN)
  // ============================================================================

  describe('checkIn', () => {
    it('should create attendance check-in record', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue(null); // no existing check-in
      attendanceRepo.create.mockReturnValue(mockAttendance as any);
      attendanceRepo.save.mockResolvedValue(mockAttendance as any);

      const dto = { employeeId: 'emp-uuid-1' };
      const result = await service.checkIn(ORG_ID, dto as any);

      expect(result).toBeDefined();
      expect(result.employeeId).toBe('emp-uuid-1');
    });

    it('should throw BadRequestException when already checked in', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      attendanceRepo.findOne.mockResolvedValue({ ...mockAttendance, checkIn: new Date() } as any);

      await expect(
        service.checkIn(ORG_ID, { employeeId: 'emp-uuid-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // DELETE EMPLOYEE
  // ============================================================================

  describe('deleteEmployee', () => {
    it('should soft remove employee', async () => {
      employeeRepo.findOne.mockResolvedValue(mockEmployee);
      employeeRepo.softRemove.mockResolvedValue(mockEmployee);

      await service.deleteEmployee('emp-uuid-1', ORG_ID);

      expect(employeeRepo.softRemove).toHaveBeenCalledWith(mockEmployee);
      expect(eventEmitter.emit).toHaveBeenCalledWith('employee.deleted', expect.any(Object));
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deleteEmployee('non-existent', ORG_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // LINK / UNLINK USER
  // ============================================================================

  describe('linkToUser', () => {
    it('should link employee to user', async () => {
      employeeRepo.findOne
        .mockResolvedValueOnce(mockEmployee) // findEmployee
        .mockResolvedValueOnce(null); // no existing link
      employeeRepo.save.mockImplementation(async (emp) => emp as Employee);

      const result = await service.linkToUser('emp-uuid-1', ORG_ID, 'user-uuid-1');

      expect(result).toBeDefined();
    });

    it('should throw ConflictException when user already linked to another employee', async () => {
      const otherEmployee = { ...mockEmployee, id: 'emp-uuid-other' } as any;
      employeeRepo.findOne
        .mockResolvedValueOnce(mockEmployee) // findEmployee
        .mockResolvedValueOnce(otherEmployee); // existing link

      await expect(
        service.linkToUser('emp-uuid-1', ORG_ID, 'user-uuid-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
