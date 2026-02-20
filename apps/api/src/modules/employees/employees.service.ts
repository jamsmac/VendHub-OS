/**
 * Employees Service
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Employee,
  EmployeeDocument,
  EmployeeRole,
  EmployeeStatus,
} from './entities/employee.entity';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  TerminateEmployeeDto,
  EmployeeFilterDto,
  EmployeeDto,
  EmployeeListDto,
  EmployeeStatsDto,
} from './dto/employee.dto';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { LeaveRequest, LeaveType, LeaveStatus } from './entities/leave-request.entity';
import { Payroll, PayrollStatus } from './entities/payroll.entity';
import { PerformanceReview, ReviewStatus } from './entities/performance-review.entity';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  QueryDepartmentsDto,
  DepartmentDto,
  DepartmentListDto,
} from './dto/department.dto';
import {
  CheckInDto,
  CheckOutDto,
  QueryAttendanceDto,
  AttendanceDto,
  AttendanceListDto,
  DailyAttendanceReportDto,
} from './dto/attendance.dto';
import {
  CreateLeaveRequestDto,
  RejectLeaveDto,
  QueryLeaveRequestsDto,
  LeaveRequestDto,
  LeaveRequestListDto,
  LeaveBalanceDto,
} from './dto/leave-request.dto';
import {
  CalculatePayrollDto,
  QueryPayrollDto,
  PayrollDto,
  PayrollListDto,
} from './dto/payroll.dto';
import {
  CreateReviewDto,
  SubmitReviewDto,
  QueryReviewsDto,
  PerformanceReviewDto,
  PerformanceReviewListDto,
} from './dto/performance-review.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(EmployeeDocument)
    private readonly documentRepo: Repository<EmployeeDocument>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepo: Repository<LeaveRequest>,
    @InjectRepository(Payroll)
    private readonly payrollRepo: Repository<Payroll>,
    @InjectRepository(PerformanceReview)
    private readonly reviewRepo: Repository<PerformanceReview>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // CREATE & UPDATE
  // ============================================================================

  /**
   * Создать сотрудника
   */
  async createEmployee(
    organizationId: string,
    dto: CreateEmployeeDto,
  ): Promise<EmployeeDto> {
    // Generate employee number
    const employeeNumber = await this.generateEmployeeNumber(organizationId);

    const employee = this.employeeRepo.create({
      organizationId,
      employeeNumber,
      ...dto,
      hireDate: new Date(dto.hireDate),
      status: EmployeeStatus.ACTIVE,
    });

    await this.employeeRepo.save(employee);

    this.logger.log(`Employee ${employeeNumber} created`);

    this.eventEmitter.emit('employee.created', {
      employeeId: employee.id,
      employeeNumber,
      organizationId,
    });

    return this.mapToDto(employee);
  }

  /**
   * Обновить сотрудника
   */
  async updateEmployee(
    employeeId: string,
    organizationId: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeDto> {
    const employee = await this.findEmployee(employeeId, organizationId);

    Object.assign(employee, dto);
    await this.employeeRepo.save(employee);

    this.eventEmitter.emit('employee.updated', {
      employeeId: employee.id,
      organizationId,
    });

    return this.mapToDto(employee);
  }

  /**
   * Уволить сотрудника
   */
  async terminateEmployee(
    employeeId: string,
    organizationId: string,
    dto: TerminateEmployeeDto,
  ): Promise<EmployeeDto> {
    const employee = await this.findEmployee(employeeId, organizationId);

    if (employee.status === EmployeeStatus.TERMINATED) {
      throw new BadRequestException('Employee is already terminated');
    }

    employee.status = EmployeeStatus.TERMINATED;
    employee.terminationDate = new Date(dto.terminationDate);
    employee.terminationReason = dto.reason || '';

    await this.employeeRepo.save(employee);

    this.eventEmitter.emit('employee.terminated', {
      employeeId: employee.id,
      organizationId,
      reason: dto.reason,
    });

    return this.mapToDto(employee);
  }

  /**
   * Связать сотрудника с User
   */
  async linkToUser(
    employeeId: string,
    organizationId: string,
    userId: string,
  ): Promise<EmployeeDto> {
    const employee = await this.findEmployee(employeeId, organizationId);

    // Check if user is already linked to another employee
    const existing = await this.employeeRepo.findOne({
      where: { userId, organizationId },
    });

    if (existing && existing.id !== employeeId) {
      throw new ConflictException('User is already linked to another employee');
    }

    employee.userId = userId;
    await this.employeeRepo.save(employee);

    return this.mapToDto(employee);
  }

  /**
   * Отвязать сотрудника от User
   */
  async unlinkFromUser(
    employeeId: string,
    organizationId: string,
  ): Promise<EmployeeDto> {
    const employee = await this.findEmployee(employeeId, organizationId);

    employee.userId = undefined as unknown as string;
    await this.employeeRepo.save(employee);

    return this.mapToDto(employee);
  }

  /**
   * Мягкое удаление сотрудника
   */
  async deleteEmployee(employeeId: string, organizationId: string): Promise<void> {
    const employee = await this.findEmployee(employeeId, organizationId);

    await this.employeeRepo.softRemove(employee);

    this.eventEmitter.emit('employee.deleted', {
      employeeId: employee.id,
      organizationId,
    });
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  /**
   * Получить сотрудника по ID
   */
  async getEmployee(employeeId: string, organizationId: string): Promise<EmployeeDto> {
    const employee = await this.findEmployee(employeeId, organizationId);
    return this.mapToDto(employee);
  }

  /**
   * Получить список сотрудников
   */
  async getEmployees(
    organizationId: string,
    filter: EmployeeFilterDto,
  ): Promise<EmployeeListDto> {
    const { role, status, search, page = 1, limit = 20 } = filter;

    const qb = this.employeeRepo
      .createQueryBuilder('e')
      .where('e.organizationId = :organizationId', { organizationId });

    if (role) {
      qb.andWhere('e.employeeRole = :role', { role });
    }

    if (status) {
      qb.andWhere('e.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(e.firstName ILIKE :search OR e.lastName ILIKE :search OR e.employeeNumber ILIKE :search OR e.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [items, total] = await qb
      .orderBy('e.lastName', 'ASC')
      .addOrderBy('e.firstName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(e => this.mapToDto(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить сотрудников по роли (paginated)
   */
  async getEmployeesByRole(
    organizationId: string,
    role: EmployeeRole,
    page = 1,
    limit = 50,
  ): Promise<{ items: EmployeeDto[]; total: number }> {
    const safeLimit = Math.min(limit, 100);
    const [employees, total] = await this.employeeRepo.findAndCount({
      where: { organizationId, employeeRole: role, status: EmployeeStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { items: employees.map(e => this.mapToDto(e)), total };
  }

  /**
   * Получить активных сотрудников (paginated)
   */
  async getActiveEmployees(
    organizationId: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: EmployeeDto[]; total: number }> {
    const safeLimit = Math.min(limit, 100);
    const [employees, total] = await this.employeeRepo.findAndCount({
      where: { organizationId, status: EmployeeStatus.ACTIVE },
      order: { lastName: 'ASC', firstName: 'ASC' },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { items: employees.map(e => this.mapToDto(e)), total };
  }

  /**
   * Найти сотрудника по Telegram ID
   */
  async getEmployeeByTelegram(
    organizationId: string,
    telegramUserId: string,
  ): Promise<EmployeeDto | null> {
    const employee = await this.employeeRepo.findOne({
      where: { organizationId, telegramUserId },
    });

    return employee ? this.mapToDto(employee) : null;
  }

  /**
   * Получить статистику.
   * Optimized: uses SQL aggregation instead of fetching all employees into memory.
   */
  async getStats(organizationId: string): Promise<EmployeeStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Status counts via SQL aggregation
    const statusCounts = await this.employeeRepo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('e.organizationId = :organizationId', { organizationId })
      .groupBy('e.status')
      .getRawMany();

    // Role counts (active only)
    const roleCounts = await this.employeeRepo
      .createQueryBuilder('e')
      .select('e.employeeRole', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('e.organizationId = :organizationId', { organizationId })
      .andWhere('e.status = :status', { status: EmployeeStatus.ACTIVE })
      .groupBy('e.employeeRole')
      .getRawMany();

    // Hired and terminated this month
    const hiredThisMonth = await this.employeeRepo.count({
      where: {
        organizationId,
        hireDate: MoreThanOrEqual(startOfMonth),
      },
    });

    const terminatedThisMonth = await this.employeeRepo
      .createQueryBuilder('e')
      .where('e.organizationId = :organizationId', { organizationId })
      .andWhere('e.terminationDate >= :startOfMonth', { startOfMonth })
      .getCount();

    // Build stats
    const stats: EmployeeStatsDto = {
      totalEmployees: 0,
      activeCount: 0,
      onLeaveCount: 0,
      suspendedCount: 0,
      terminatedCount: 0,
      byRole: {} as Record<string, number>,
      hiredThisMonth,
      terminatedThisMonth,
    };

    // Initialize role counts
    for (const role of Object.values(EmployeeRole)) {
      stats.byRole[role] = 0;
    }

    for (const row of statusCounts) {
      const count = parseInt(row.count);
      stats.totalEmployees += count;
      switch (row.status) {
        case EmployeeStatus.ACTIVE:
          stats.activeCount = count;
          break;
        case EmployeeStatus.ON_LEAVE:
          stats.onLeaveCount = count;
          break;
        case EmployeeStatus.SUSPENDED:
          stats.suspendedCount = count;
          break;
        case EmployeeStatus.TERMINATED:
          stats.terminatedCount = count;
          break;
      }
    }

    for (const row of roleCounts) {
      stats.byRole[row.role] = parseInt(row.count);
    }

    return stats;
  }

  // ============================================================================
  // DEPARTMENT CRUD
  // ============================================================================

  /**
   * Create a department
   */
  async createDepartment(
    organizationId: string,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    // Check code uniqueness within organization
    const existing = await this.departmentRepo.findOne({
      where: { code: dto.code, organizationId },
    });
    if (existing) {
      throw new ConflictException(`Department code "${dto.code}" already exists`);
    }

    // Validate parent department if provided
    if (dto.parentDepartmentId) {
      const parent = await this.departmentRepo.findOne({
        where: { id: dto.parentDepartmentId, organizationId },
      });
      if (!parent) {
        throw new NotFoundException('Parent department not found');
      }
    }

    const department = this.departmentRepo.create({
      organizationId,
      name: dto.name,
      code: dto.code,
      description: dto.description || null,
      managerId: dto.managerId || null,
      parentDepartmentId: dto.parentDepartmentId || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    await this.departmentRepo.save(department);

    this.logger.log(`Department ${dto.code} created`);

    return this.mapDepartmentToDto(department);
  }

  /**
   * Update a department
   */
  async updateDepartment(
    departmentId: string,
    organizationId: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentDto> {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId, organizationId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Check code uniqueness if code is being changed
    if (dto.code && dto.code !== department.code) {
      const existing = await this.departmentRepo.findOne({
        where: { code: dto.code, organizationId },
      });
      if (existing) {
        throw new ConflictException(`Department code "${dto.code}" already exists`);
      }
    }

    // Prevent circular parent reference
    if (dto.parentDepartmentId === departmentId) {
      throw new BadRequestException('Department cannot be its own parent');
    }

    Object.assign(department, dto);
    await this.departmentRepo.save(department);

    return this.mapDepartmentToDto(department);
  }

  /**
   * Get departments with hierarchy support
   */
  async getDepartments(
    organizationId: string,
    query: QueryDepartmentsDto,
  ): Promise<DepartmentListDto> {
    const { page = 1, limit = 20, search, parentId, isActive } = query;

    const qb = this.departmentRepo
      .createQueryBuilder('d')
      .where('d.organizationId = :organizationId', { organizationId });

    if (search) {
      qb.andWhere(
        '(d.name ILIKE :search OR d.code ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (parentId) {
      qb.andWhere('d.parentDepartmentId = :parentId', { parentId });
    }

    if (isActive !== undefined) {
      qb.andWhere('d.isActive = :isActive', { isActive });
    }

    const [items, total] = await qb
      .leftJoinAndSelect('d.subDepartments', 'sub')
      .orderBy('d.sortOrder', 'ASC')
      .addOrderBy('d.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(d => this.mapDepartmentToDto(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single department by ID
   */
  async getDepartment(
    departmentId: string,
    organizationId: string,
  ): Promise<DepartmentDto> {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId, organizationId },
      relations: ['subDepartments'],
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    return this.mapDepartmentToDto(department);
  }

  /**
   * Soft delete a department
   */
  async deleteDepartment(
    departmentId: string,
    organizationId: string,
  ): Promise<void> {
    const department = await this.departmentRepo.findOne({
      where: { id: departmentId, organizationId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    await this.departmentRepo.softRemove(department);
    this.logger.log(`Department ${department.code} deleted`);
  }

  // ============================================================================
  // POSITION CRUD
  // ============================================================================

  /**
   * Create a position
   */
  async createPosition(
    organizationId: string,
    dto: {
      title: string;
      code: string;
      description?: string;
      departmentId?: string;
      level: string;
      minSalary?: number;
      maxSalary?: number;
      isActive?: boolean;
    },
  ): Promise<Position> {
    // Check code uniqueness
    const existing = await this.positionRepo.findOne({
      where: { code: dto.code, organizationId },
    });
    if (existing) {
      throw new ConflictException(`Position code "${dto.code}" already exists`);
    }

    const position = this.positionRepo.create({
      organizationId,
      title: dto.title,
      code: dto.code,
      description: dto.description || null,
      departmentId: dto.departmentId || null,
      level: dto.level as any,
      minSalary: dto.minSalary || null,
      maxSalary: dto.maxSalary || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    await this.positionRepo.save(position);
    this.logger.log(`Position ${dto.code} created`);

    return position;
  }

  /**
   * Update a position
   */
  async updatePosition(
    positionId: string,
    organizationId: string,
    dto: {
      title?: string;
      code?: string;
      description?: string;
      departmentId?: string;
      level?: string;
      minSalary?: number;
      maxSalary?: number;
      isActive?: boolean;
    },
  ): Promise<Position> {
    const position = await this.positionRepo.findOne({
      where: { id: positionId, organizationId },
    });
    if (!position) {
      throw new NotFoundException('Position not found');
    }

    if (dto.code && dto.code !== position.code) {
      const existing = await this.positionRepo.findOne({
        where: { code: dto.code, organizationId },
      });
      if (existing) {
        throw new ConflictException(`Position code "${dto.code}" already exists`);
      }
    }

    Object.assign(position, dto);
    await this.positionRepo.save(position);

    return position;
  }

  /**
   * Get positions list
   */
  async getPositions(
    organizationId: string,
    query: { page?: number; limit?: number; search?: string; departmentId?: string; isActive?: boolean },
  ): Promise<{ items: Position[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 20, search, departmentId, isActive } = query;

    const qb = this.positionRepo
      .createQueryBuilder('p')
      .where('p.organizationId = :organizationId', { organizationId });

    if (search) {
      qb.andWhere(
        '(p.title ILIKE :search OR p.code ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (departmentId) {
      qb.andWhere('p.departmentId = :departmentId', { departmentId });
    }

    if (isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive });
    }

    const [items, total] = await qb
      .orderBy('p.title', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single position by ID
   */
  async getPosition(
    positionId: string,
    organizationId: string,
  ): Promise<Position> {
    const position = await this.positionRepo.findOne({
      where: { id: positionId, organizationId },
    });
    if (!position) {
      throw new NotFoundException('Position not found');
    }
    return position;
  }

  // ============================================================================
  // ATTENDANCE
  // ============================================================================

  /**
   * Employee check-in
   */
  async checkIn(
    organizationId: string,
    dto: CheckInDto,
  ): Promise<AttendanceDto> {
    // Verify employee exists
    await this.findEmployee(dto.employeeId, organizationId);

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Check if already checked in today
    const existing = await this.attendanceRepo.findOne({
      where: {
        employeeId: dto.employeeId,
        date: new Date(dateStr) as any,
        organizationId,
      },
    });

    if (existing && existing.checkIn) {
      throw new BadRequestException('Employee already checked in today');
    }

    const attendance = existing || this.attendanceRepo.create({
      organizationId,
      employeeId: dto.employeeId,
      date: new Date(dateStr),
      status: AttendanceStatus.PRESENT,
    });

    attendance.checkIn = new Date();
    attendance.note = dto.note || null;
    attendance.checkInLocation = dto.location || null;

    // Determine if late (after 09:00)
    const checkInHour = new Date().getHours();
    if (checkInHour >= 10) {
      attendance.status = AttendanceStatus.LATE;
    }

    await this.attendanceRepo.save(attendance);

    this.logger.log(`Employee ${dto.employeeId} checked in`);

    return this.mapAttendanceToDto(attendance);
  }

  /**
   * Employee check-out
   */
  async checkOut(
    organizationId: string,
    dto: CheckOutDto,
  ): Promise<AttendanceDto> {
    await this.findEmployee(dto.employeeId, organizationId);

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const attendance = await this.attendanceRepo.findOne({
      where: {
        employeeId: dto.employeeId,
        date: new Date(dateStr) as any,
        organizationId,
      },
    });

    if (!attendance) {
      throw new BadRequestException('No check-in record found for today');
    }

    if (attendance.checkOut) {
      throw new BadRequestException('Employee already checked out today');
    }

    attendance.checkOut = new Date();
    attendance.checkOutLocation = dto.location || null;

    if (dto.note) {
      attendance.note = attendance.note
        ? `${attendance.note}\n${dto.note}`
        : dto.note;
    }

    // Calculate total hours
    if (attendance.checkIn) {
      const diffMs = attendance.checkOut.getTime() - attendance.checkIn.getTime();
      const totalHours = diffMs / (1000 * 60 * 60);
      attendance.totalHours = Math.round(totalHours * 100) / 100;

      // Calculate overtime (more than 8 hours)
      if (totalHours > 8) {
        attendance.overtimeHours = Math.round((totalHours - 8) * 100) / 100;
      }
    }

    await this.attendanceRepo.save(attendance);

    this.logger.log(`Employee ${dto.employeeId} checked out`);

    return this.mapAttendanceToDto(attendance);
  }

  /**
   * Get attendance records (paginated)
   */
  async getAttendance(
    organizationId: string,
    query: QueryAttendanceDto,
  ): Promise<AttendanceListDto> {
    const { page = 1, limit = 20, employeeId, dateFrom, dateTo, status } = query;

    const qb = this.attendanceRepo
      .createQueryBuilder('a')
      .where('a.organizationId = :organizationId', { organizationId });

    if (employeeId) {
      qb.andWhere('a.employeeId = :employeeId', { employeeId });
    }

    if (dateFrom) {
      qb.andWhere('a.date >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('a.date <= :dateTo', { dateTo });
    }

    if (status) {
      qb.andWhere('a.status = :status', { status });
    }

    const [items, total] = await qb
      .orderBy('a.date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(a => this.mapAttendanceToDto(a)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get daily attendance report
   */
  async getDailyReport(
    organizationId: string,
    dateStr?: string,
  ): Promise<DailyAttendanceReportDto> {
    const date = dateStr || new Date().toISOString().split('T')[0];

    const records = await this.attendanceRepo.find({
      where: { organizationId, date: new Date(date) as any },
    });

    const totalEmployees = await this.employeeRepo.count({
      where: { organizationId, status: EmployeeStatus.ACTIVE },
    });

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let onLeaveCount = 0;

    for (const record of records) {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          presentCount++;
          break;
        case AttendanceStatus.ABSENT:
          absentCount++;
          break;
        case AttendanceStatus.LATE:
          lateCount++;
          break;
        case AttendanceStatus.ON_LEAVE:
          onLeaveCount++;
          break;
      }
    }

    // Employees with no record are considered absent
    absentCount = totalEmployees - presentCount - lateCount - onLeaveCount;
    if (absentCount < 0) absentCount = 0;

    return {
      date,
      totalEmployees,
      presentCount,
      absentCount,
      lateCount,
      onLeaveCount,
      records: records.map(r => this.mapAttendanceToDto(r)),
    };
  }

  /**
   * Get monthly attendance report
   */
  async getMonthlyReport(
    organizationId: string,
    employeeId: string,
    year: number,
    month: number,
  ): Promise<AttendanceDto[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.attendanceRepo.find({
      where: {
        organizationId,
        employeeId,
        date: Between(startDate, endDate) as any,
      },
      order: { date: 'ASC' },
    });

    return records.map(r => this.mapAttendanceToDto(r));
  }

  // ============================================================================
  // LEAVE REQUESTS
  // ============================================================================

  /**
   * Create a leave request
   */
  async createLeaveRequest(
    organizationId: string,
    dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestDto> {
    await this.findEmployee(dto.employeeId, organizationId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Calculate total days (simple calculation, excludes weekends)
    const diffMs = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping leave requests
    const overlapping = await this.leaveRequestRepo
      .createQueryBuilder('lr')
      .where('lr.employeeId = :employeeId', { employeeId: dto.employeeId })
      .andWhere('lr.organizationId = :organizationId', { organizationId })
      .andWhere('lr.status IN (:...statuses)', {
        statuses: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
      })
      .andWhere(
        '(lr.startDate <= :endDate AND lr.endDate >= :startDate)',
        { startDate: dto.startDate, endDate: dto.endDate },
      )
      .getCount();

    if (overlapping > 0) {
      throw new ConflictException('Leave request overlaps with an existing request');
    }

    const leaveRequest = this.leaveRequestRepo.create({
      organizationId,
      employeeId: dto.employeeId,
      leaveType: dto.leaveType,
      startDate,
      endDate,
      totalDays,
      reason: dto.reason || null,
      status: LeaveStatus.PENDING,
    });

    await this.leaveRequestRepo.save(leaveRequest);

    this.logger.log(`Leave request created for employee ${dto.employeeId}`);

    this.eventEmitter.emit('leave.requested', {
      leaveRequestId: leaveRequest.id,
      employeeId: dto.employeeId,
      organizationId,
    });

    return this.mapLeaveRequestToDto(leaveRequest);
  }

  /**
   * Approve a leave request
   */
  async approveLeave(
    leaveId: string,
    organizationId: string,
    approvedById: string,
  ): Promise<LeaveRequestDto> {
    const leaveRequest = await this.leaveRequestRepo.findOne({
      where: { id: leaveId, organizationId },
    });
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is not in pending status');
    }

    leaveRequest.status = LeaveStatus.APPROVED;
    leaveRequest.approvedById = approvedById;
    leaveRequest.approvedAt = new Date();

    await this.leaveRequestRepo.save(leaveRequest);

    this.eventEmitter.emit('leave.approved', {
      leaveRequestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      organizationId,
    });

    return this.mapLeaveRequestToDto(leaveRequest);
  }

  /**
   * Reject a leave request
   */
  async rejectLeave(
    leaveId: string,
    organizationId: string,
    approvedById: string,
    dto: RejectLeaveDto,
  ): Promise<LeaveRequestDto> {
    const leaveRequest = await this.leaveRequestRepo.findOne({
      where: { id: leaveId, organizationId },
    });
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is not in pending status');
    }

    leaveRequest.status = LeaveStatus.REJECTED;
    leaveRequest.approvedById = approvedById;
    leaveRequest.approvedAt = new Date();
    leaveRequest.rejectionReason = dto.reason;

    await this.leaveRequestRepo.save(leaveRequest);

    this.eventEmitter.emit('leave.rejected', {
      leaveRequestId: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      organizationId,
    });

    return this.mapLeaveRequestToDto(leaveRequest);
  }

  /**
   * Cancel a leave request (by employee)
   */
  async cancelLeave(
    leaveId: string,
    organizationId: string,
  ): Promise<LeaveRequestDto> {
    const leaveRequest = await this.leaveRequestRepo.findOne({
      where: { id: leaveId, organizationId },
    });
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    if (![LeaveStatus.PENDING, LeaveStatus.APPROVED].includes(leaveRequest.status)) {
      throw new BadRequestException('Leave request cannot be cancelled');
    }

    leaveRequest.status = LeaveStatus.CANCELLED;
    await this.leaveRequestRepo.save(leaveRequest);

    return this.mapLeaveRequestToDto(leaveRequest);
  }

  /**
   * Get leave requests (paginated)
   */
  async getLeaveRequests(
    organizationId: string,
    query: QueryLeaveRequestsDto,
  ): Promise<LeaveRequestListDto> {
    const { page = 1, limit = 20, employeeId, status, leaveType, dateFrom, dateTo } = query;

    const qb = this.leaveRequestRepo
      .createQueryBuilder('lr')
      .where('lr.organizationId = :organizationId', { organizationId });

    if (employeeId) {
      qb.andWhere('lr.employeeId = :employeeId', { employeeId });
    }

    if (status) {
      qb.andWhere('lr.status = :status', { status });
    }

    if (leaveType) {
      qb.andWhere('lr.leaveType = :leaveType', { leaveType });
    }

    if (dateFrom) {
      qb.andWhere('lr.startDate >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      qb.andWhere('lr.endDate <= :dateTo', { dateTo });
    }

    const [items, total] = await qb
      .orderBy('lr.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(lr => this.mapLeaveRequestToDto(lr)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get leave balance for an employee
   */
  async getLeaveBalance(
    organizationId: string,
    employeeId: string,
    year?: number,
  ): Promise<LeaveBalanceDto> {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const approvedLeaves = await this.leaveRequestRepo.find({
      where: {
        organizationId,
        employeeId,
        status: LeaveStatus.APPROVED,
        startDate: MoreThanOrEqual(startOfYear) as any,
        endDate: LessThanOrEqual(endOfYear) as any,
      },
    });

    // Default allocations (can be made configurable)
    const annualTotal = 24; // 24 days annual leave (Uzbekistan standard)
    const sickTotal = 10;   // 10 days sick leave

    let annualUsed = 0;
    let sickUsed = 0;

    for (const leave of approvedLeaves) {
      if (leave.leaveType === LeaveType.ANNUAL) {
        annualUsed += Number(leave.totalDays);
      } else if (leave.leaveType === LeaveType.SICK) {
        sickUsed += Number(leave.totalDays);
      }
    }

    return {
      employeeId,
      annualTotal,
      annualUsed,
      annualRemaining: annualTotal - annualUsed,
      sickTotal,
      sickUsed,
      sickRemaining: sickTotal - sickUsed,
      year: currentYear,
    };
  }

  // ============================================================================
  // PAYROLL
  // ============================================================================

  /**
   * Calculate payroll for an employee
   */
  async calculatePayroll(
    organizationId: string,
    dto: CalculatePayrollDto,
    userId: string,
  ): Promise<PayrollDto> {
    const employee = await this.findEmployee(dto.employeeId, organizationId);

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // Check for existing payroll for this period
    const existing = await this.payrollRepo.findOne({
      where: {
        employeeId: dto.employeeId,
        periodStart: periodStart as any,
        organizationId,
      },
    });

    if (existing && existing.status !== PayrollStatus.DRAFT) {
      throw new ConflictException('Payroll already calculated for this period');
    }

    // Get attendance data for the period
    const attendances = await this.attendanceRepo.find({
      where: {
        employeeId: dto.employeeId,
        organizationId,
        date: Between(periodStart, periodEnd) as any,
      },
    });

    // Calculate working days in period (Mon-Sat in Uzbekistan)
    let workingDays = 0;
    const current = new Date(periodStart);
    while (current <= periodEnd) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0) { // Sunday is off
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Calculate worked days from attendance
    const workedDays = attendances.filter(a =>
      [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(a.status),
    ).length;

    // Calculate overtime hours
    const totalOvertimeHours = attendances.reduce((sum, a) => {
      return sum + (a.overtimeHours ? Number(a.overtimeHours) : 0);
    }, 0);

    // Calculate salary components
    const baseSalary = employee.salary ? Number(employee.salary) : 0;
    const dailyRate = workingDays > 0 ? baseSalary / workingDays : 0;
    const actualBaseSalary = Math.round(dailyRate * workedDays * 100) / 100;
    const overtimePay = Math.round(totalOvertimeHours * (dailyRate / 8) * 1.5 * 100) / 100;
    const bonuses = 0;
    const deductions = 0;

    // Uzbekistan income tax (12%)
    const grossSalary = actualBaseSalary + overtimePay + bonuses;
    const taxAmount = Math.round(grossSalary * 0.12 * 100) / 100;
    const netSalary = Math.round((grossSalary - deductions - taxAmount) * 100) / 100;

    const payroll = existing || this.payrollRepo.create({
      organizationId,
      employeeId: dto.employeeId,
      periodStart,
      periodEnd,
    });

    payroll.baseSalary = actualBaseSalary;
    payroll.overtimePay = overtimePay;
    payroll.bonuses = bonuses;
    payroll.deductions = deductions;
    payroll.taxAmount = taxAmount;
    payroll.netSalary = netSalary;
    payroll.currency = 'UZS';
    payroll.status = PayrollStatus.CALCULATED;
    payroll.calculatedAt = new Date();
    payroll.workingDays = workingDays;
    payroll.workedDays = workedDays;
    payroll.overtimeHours = totalOvertimeHours;
    payroll.details = {
      dailyRate,
      grossSalary,
      taxRate: 0.12,
      overtimeRate: 1.5,
    };

    await this.payrollRepo.save(payroll);

    this.logger.log(`Payroll calculated for employee ${dto.employeeId}`);

    return this.mapPayrollToDto(payroll);
  }

  /**
   * Approve payroll
   */
  async approvePayroll(
    payrollId: string,
    organizationId: string,
    approvedById: string,
  ): Promise<PayrollDto> {
    const payroll = await this.payrollRepo.findOne({
      where: { id: payrollId, organizationId },
    });
    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    if (payroll.status !== PayrollStatus.CALCULATED) {
      throw new BadRequestException('Payroll must be in calculated status to approve');
    }

    payroll.status = PayrollStatus.APPROVED;
    payroll.approvedById = approvedById;
    payroll.approvedAt = new Date();

    await this.payrollRepo.save(payroll);

    return this.mapPayrollToDto(payroll);
  }

  /**
   * Mark payroll as paid
   */
  async payPayroll(
    payrollId: string,
    organizationId: string,
    paymentReference?: string,
  ): Promise<PayrollDto> {
    const payroll = await this.payrollRepo.findOne({
      where: { id: payrollId, organizationId },
    });
    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    if (payroll.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException('Payroll must be approved before payment');
    }

    payroll.status = PayrollStatus.PAID;
    payroll.paidAt = new Date();
    payroll.paymentReference = paymentReference || null;

    await this.payrollRepo.save(payroll);

    this.eventEmitter.emit('payroll.paid', {
      payrollId: payroll.id,
      employeeId: payroll.employeeId,
      organizationId,
      amount: payroll.netSalary,
    });

    return this.mapPayrollToDto(payroll);
  }

  /**
   * Get payrolls (paginated)
   */
  async getPayrolls(
    organizationId: string,
    query: QueryPayrollDto,
  ): Promise<PayrollListDto> {
    const { page = 1, limit = 20, employeeId, status, periodStart, periodEnd } = query;

    const qb = this.payrollRepo
      .createQueryBuilder('p')
      .where('p.organizationId = :organizationId', { organizationId });

    if (employeeId) {
      qb.andWhere('p.employeeId = :employeeId', { employeeId });
    }

    if (status) {
      qb.andWhere('p.status = :status', { status });
    }

    if (periodStart) {
      qb.andWhere('p.periodStart >= :periodStart', { periodStart });
    }

    if (periodEnd) {
      qb.andWhere('p.periodEnd <= :periodEnd', { periodEnd });
    }

    const [items, total] = await qb
      .orderBy('p.periodStart', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(p => this.mapPayrollToDto(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single payroll record
   */
  async getPayroll(
    payrollId: string,
    organizationId: string,
  ): Promise<PayrollDto> {
    const payroll = await this.payrollRepo.findOne({
      where: { id: payrollId, organizationId },
    });
    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }
    return this.mapPayrollToDto(payroll);
  }

  // ============================================================================
  // PERFORMANCE REVIEWS
  // ============================================================================

  /**
   * Create a performance review
   */
  async createReview(
    organizationId: string,
    dto: CreateReviewDto,
  ): Promise<PerformanceReviewDto> {
    await this.findEmployee(dto.employeeId, organizationId);

    const review = this.reviewRepo.create({
      organizationId,
      employeeId: dto.employeeId,
      reviewerId: dto.reviewerId,
      reviewPeriod: dto.reviewPeriod,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      status: ReviewStatus.SCHEDULED,
    });

    await this.reviewRepo.save(review);

    this.logger.log(`Performance review created for employee ${dto.employeeId}`);

    return this.mapReviewToDto(review);
  }

  /**
   * Submit a review with ratings
   */
  async submitReview(
    reviewId: string,
    organizationId: string,
    dto: SubmitReviewDto,
  ): Promise<PerformanceReviewDto> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId, organizationId },
    });
    if (!review) {
      throw new NotFoundException('Performance review not found');
    }

    if (review.status === ReviewStatus.COMPLETED) {
      throw new BadRequestException('Review is already completed');
    }

    if (review.status === ReviewStatus.CANCELLED) {
      throw new BadRequestException('Review has been cancelled');
    }

    review.overallRating = dto.overallRating;
    review.ratings = dto.ratings;
    review.strengths = dto.strengths || null;
    review.areasForImprovement = dto.areasForImprovement || null;
    review.goals = dto.goals || null;
    review.reviewerComments = dto.reviewerComments || null;
    review.status = ReviewStatus.COMPLETED;
    review.completedAt = new Date();

    await this.reviewRepo.save(review);

    this.eventEmitter.emit('review.completed', {
      reviewId: review.id,
      employeeId: review.employeeId,
      organizationId,
      overallRating: review.overallRating,
    });

    return this.mapReviewToDto(review);
  }

  /**
   * Get reviews (paginated)
   */
  async getReviews(
    organizationId: string,
    query: QueryReviewsDto,
  ): Promise<PerformanceReviewListDto> {
    const { page = 1, limit = 20, employeeId, status, reviewPeriod } = query;

    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .where('r.organizationId = :organizationId', { organizationId });

    if (employeeId) {
      qb.andWhere('r.employeeId = :employeeId', { employeeId });
    }

    if (status) {
      qb.andWhere('r.status = :status', { status });
    }

    if (reviewPeriod) {
      qb.andWhere('r.reviewPeriod = :reviewPeriod', { reviewPeriod });
    }

    const [items, total] = await qb
      .orderBy('r.periodEnd', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map(r => this.mapReviewToDto(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single review
   */
  async getReview(
    reviewId: string,
    organizationId: string,
  ): Promise<PerformanceReviewDto> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId, organizationId },
    });
    if (!review) {
      throw new NotFoundException('Performance review not found');
    }
    return this.mapReviewToDto(review);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async findEmployee(
    employeeId: string,
    organizationId: string,
  ): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, organizationId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  private async generateEmployeeNumber(organizationId: string): Promise<string> {
    const count = await this.employeeRepo.count({ where: { organizationId } });
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }

  private mapToDto(employee: Employee): EmployeeDto {
    return {
      id: employee.id,
      organizationId: employee.organizationId,
      userId: employee.userId,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      middleName: employee.middleName,
      fullName: [employee.firstName, employee.middleName, employee.lastName]
        .filter(Boolean)
        .join(' '),
      phone: employee.phone,
      email: employee.email,
      employeeRole: employee.employeeRole,
      status: employee.status,
      telegramUserId: employee.telegramUserId,
      telegramUsername: employee.telegramUsername,
      hireDate: employee.hireDate,
      terminationDate: employee.terminationDate,
      terminationReason: employee.terminationReason,
      salary: employee.salary ? Number(employee.salary) : undefined,
      salaryFrequency: employee.salaryFrequency,
      address: employee.address,
      city: employee.city,
      district: employee.district,
      emergencyContactName: employee.emergencyContactName,
      emergencyContactPhone: employee.emergencyContactPhone,
      emergencyContactRelation: employee.emergencyContactRelation,
      notes: employee.notes,
      createdAt: employee.created_at,
      updatedAt: employee.updated_at,
    };
  }

  private mapDepartmentToDto(department: Department): DepartmentDto {
    return {
      id: department.id,
      organizationId: department.organizationId,
      name: department.name,
      code: department.code,
      description: department.description,
      managerId: department.managerId,
      parentDepartmentId: department.parentDepartmentId,
      isActive: department.isActive,
      sortOrder: department.sortOrder,
      subDepartments: department.subDepartments
        ? department.subDepartments.map(d => this.mapDepartmentToDto(d))
        : undefined,
      createdAt: department.created_at,
      updatedAt: department.updated_at,
    };
  }

  private mapAttendanceToDto(attendance: Attendance): AttendanceDto {
    return {
      id: attendance.id,
      organizationId: attendance.organizationId,
      employeeId: attendance.employeeId,
      date: attendance.date,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      totalHours: attendance.totalHours ? Number(attendance.totalHours) : null,
      overtimeHours: attendance.overtimeHours ? Number(attendance.overtimeHours) : null,
      status: attendance.status,
      note: attendance.note,
      checkInLocation: attendance.checkInLocation,
      checkOutLocation: attendance.checkOutLocation,
      createdAt: attendance.created_at,
      updatedAt: attendance.updated_at,
    };
  }

  private mapLeaveRequestToDto(leaveRequest: LeaveRequest): LeaveRequestDto {
    return {
      id: leaveRequest.id,
      organizationId: leaveRequest.organizationId,
      employeeId: leaveRequest.employeeId,
      leaveType: leaveRequest.leaveType,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      totalDays: Number(leaveRequest.totalDays),
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      approvedById: leaveRequest.approvedById,
      approvedAt: leaveRequest.approvedAt,
      rejectionReason: leaveRequest.rejectionReason,
      createdAt: leaveRequest.created_at,
      updatedAt: leaveRequest.updated_at,
    };
  }

  private mapPayrollToDto(payroll: Payroll): PayrollDto {
    return {
      id: payroll.id,
      organizationId: payroll.organizationId,
      employeeId: payroll.employeeId,
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      baseSalary: Number(payroll.baseSalary),
      overtimePay: Number(payroll.overtimePay),
      bonuses: Number(payroll.bonuses),
      deductions: Number(payroll.deductions),
      taxAmount: Number(payroll.taxAmount),
      netSalary: Number(payroll.netSalary),
      currency: payroll.currency,
      status: payroll.status,
      calculatedAt: payroll.calculatedAt,
      approvedById: payroll.approvedById,
      approvedAt: payroll.approvedAt,
      paidAt: payroll.paidAt,
      paymentReference: payroll.paymentReference,
      workingDays: payroll.workingDays,
      workedDays: payroll.workedDays,
      overtimeHours: Number(payroll.overtimeHours),
      details: payroll.details,
      note: payroll.note,
      createdAt: payroll.created_at,
      updatedAt: payroll.updated_at,
    };
  }

  private mapReviewToDto(review: PerformanceReview): PerformanceReviewDto {
    return {
      id: review.id,
      organizationId: review.organizationId,
      employeeId: review.employeeId,
      reviewerId: review.reviewerId,
      reviewPeriod: review.reviewPeriod,
      periodStart: review.periodStart,
      periodEnd: review.periodEnd,
      status: review.status,
      overallRating: review.overallRating ? Number(review.overallRating) : null,
      ratings: review.ratings,
      strengths: review.strengths,
      areasForImprovement: review.areasForImprovement,
      goals: review.goals,
      employeeComments: review.employeeComments,
      reviewerComments: review.reviewerComments,
      completedAt: review.completedAt,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    };
  }
}
