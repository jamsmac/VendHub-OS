/**
 * Employees Service (Orchestrator)
 * Thin facade that delegates to domain-specific sub-services.
 * The controller only talks to this service — sub-services are internal.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Employee,
  EmployeeRole,
  EmployeeStatus,
} from "./entities/employee.entity";
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  TerminateEmployeeDto,
  EmployeeFilterDto,
  EmployeeDto,
  EmployeeListDto,
  EmployeeStatsDto,
} from "./dto/employee.dto";
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  QueryDepartmentsDto,
  DepartmentDto,
  DepartmentListDto,
} from "./dto/department.dto";
import { Position } from "./entities/position.entity";
import {
  CheckInDto,
  CheckOutDto,
  QueryAttendanceDto,
  AttendanceDto,
  AttendanceListDto,
  DailyAttendanceReportDto,
} from "./dto/attendance.dto";
import {
  CreateLeaveRequestDto,
  RejectLeaveDto,
  QueryLeaveRequestsDto,
  LeaveRequestDto,
  LeaveRequestListDto,
  LeaveBalanceDto,
} from "./dto/leave-request.dto";
import {
  CalculatePayrollDto,
  QueryPayrollDto,
  PayrollDto,
  PayrollListDto,
} from "./dto/payroll.dto";
import {
  CreateReviewDto,
  SubmitReviewDto,
  QueryReviewsDto,
  PerformanceReviewDto,
  PerformanceReviewListDto,
} from "./dto/performance-review.dto";
import { DepartmentService } from "./services/department.service";
import { PositionService } from "./services/position.service";
import { AttendanceService } from "./services/attendance.service";
import { LeaveService } from "./services/leave.service";
import { PayrollService } from "./services/payroll.service";
import { PerformanceReviewService } from "./services/performance-review.service";

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly eventEmitter: EventEmitter2,
    private readonly departmentService: DepartmentService,
    private readonly positionService: PositionService,
    private readonly attendanceService: AttendanceService,
    private readonly leaveService: LeaveService,
    private readonly payrollService: PayrollService,
    private readonly performanceReviewService: PerformanceReviewService,
  ) {}

  // ============================================================================
  // EMPLOYEE CRUD & QUERIES
  // ============================================================================

  /**
   * Create employee
   */
  async createEmployee(
    organizationId: string,
    dto: CreateEmployeeDto,
  ): Promise<EmployeeDto> {
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

    this.eventEmitter.emit("employee.created", {
      employeeId: employee.id,
      employeeNumber,
      organizationId,
    });

    return this.mapToDto(employee);
  }

  /**
   * Update employee
   */
  async updateEmployee(
    employeeId: string,
    organizationId: string,
    dto: UpdateEmployeeDto,
  ): Promise<EmployeeDto> {
    const employee = await this.findEmployee(employeeId, organizationId);

    Object.assign(employee, dto);
    await this.employeeRepo.save(employee);

    this.eventEmitter.emit("employee.updated", {
      employeeId: employee.id,
      organizationId,
    });

    return this.mapToDto(employee);
  }

  /**
   * Terminate employee
   */
  async terminateEmployee(
    employeeId: string,
    organizationId: string,
    dto: TerminateEmployeeDto,
  ): Promise<EmployeeDto> {
    const employee = await this.findEmployee(employeeId, organizationId);

    if (employee.status === EmployeeStatus.TERMINATED) {
      throw new BadRequestException("Employee is already terminated");
    }

    employee.status = EmployeeStatus.TERMINATED;
    employee.terminationDate = new Date(dto.terminationDate);
    employee.terminationReason = dto.reason || "";

    await this.employeeRepo.save(employee);

    this.eventEmitter.emit("employee.terminated", {
      employeeId: employee.id,
      organizationId,
      reason: dto.reason,
    });

    return this.mapToDto(employee);
  }

  /**
   * Link employee to User
   */
  async linkToUser(
    employeeId: string,
    organizationId: string,
    userId: string,
  ): Promise<EmployeeDto> {
    const employee = await this.findEmployee(employeeId, organizationId);

    const existing = await this.employeeRepo.findOne({
      where: { userId, organizationId },
    });

    if (existing && existing.id !== employeeId) {
      throw new ConflictException("User is already linked to another employee");
    }

    employee.userId = userId;
    await this.employeeRepo.save(employee);

    return this.mapToDto(employee);
  }

  /**
   * Unlink employee from User
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
   * Soft delete employee
   */
  async deleteEmployee(
    employeeId: string,
    organizationId: string,
  ): Promise<void> {
    const employee = await this.findEmployee(employeeId, organizationId);

    await this.employeeRepo.softRemove(employee);

    this.eventEmitter.emit("employee.deleted", {
      employeeId: employee.id,
      organizationId,
    });
  }

  /**
   * Get employee by ID
   */
  async getEmployee(
    employeeId: string,
    organizationId: string,
  ): Promise<EmployeeDto> {
    const employee = await this.findEmployee(employeeId, organizationId);
    return this.mapToDto(employee);
  }

  /**
   * Get employees list
   */
  async getEmployees(
    organizationId: string,
    filter: EmployeeFilterDto,
  ): Promise<EmployeeListDto> {
    const { role, status, search, page = 1, limit = 20 } = filter;

    const qb = this.employeeRepo
      .createQueryBuilder("e")
      .where("e.organizationId = :organizationId", { organizationId });

    if (role) {
      qb.andWhere("e.employeeRole = :role", { role });
    }

    if (status) {
      qb.andWhere("e.status = :status", { status });
    }

    if (search) {
      qb.andWhere(
        "(e.firstName ILIKE :search OR e.lastName ILIKE :search OR e.employeeNumber ILIKE :search OR e.phone ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const [items, total] = await qb
      .orderBy("e.lastName", "ASC")
      .addOrderBy("e.firstName", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((e) => this.mapToDto(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get employees by role (paginated)
   */
  async getEmployeesByRole(
    organizationId: string,
    role: EmployeeRole,
    page = 1,
    limit = 50,
  ): Promise<{ items: EmployeeDto[]; total: number }> {
    const safeLimit = Math.min(limit, 100);
    const [employees, total] = await this.employeeRepo.findAndCount({
      where: {
        organizationId,
        employeeRole: role,
        status: EmployeeStatus.ACTIVE,
      },
      order: { lastName: "ASC", firstName: "ASC" },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { items: employees.map((e) => this.mapToDto(e)), total };
  }

  /**
   * Get active employees (paginated)
   */
  async getActiveEmployees(
    organizationId: string,
    page = 1,
    limit = 50,
  ): Promise<{ items: EmployeeDto[]; total: number }> {
    const safeLimit = Math.min(limit, 100);
    const [employees, total] = await this.employeeRepo.findAndCount({
      where: { organizationId, status: EmployeeStatus.ACTIVE },
      order: { lastName: "ASC", firstName: "ASC" },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { items: employees.map((e) => this.mapToDto(e)), total };
  }

  /**
   * Find employee by Telegram ID
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
   * Get statistics
   */
  async getStats(organizationId: string): Promise<EmployeeStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const statusCounts = await this.employeeRepo
      .createQueryBuilder("e")
      .select("e.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("e.organizationId = :organizationId", { organizationId })
      .groupBy("e.status")
      .getRawMany();

    const roleCounts = await this.employeeRepo
      .createQueryBuilder("e")
      .select("e.employeeRole", "role")
      .addSelect("COUNT(*)", "count")
      .where("e.organizationId = :organizationId", { organizationId })
      .andWhere("e.status = :status", { status: EmployeeStatus.ACTIVE })
      .groupBy("e.employeeRole")
      .getRawMany();

    const hiredThisMonth = await this.employeeRepo.count({
      where: {
        organizationId,
        hireDate: MoreThanOrEqual(startOfMonth),
      },
    });

    const terminatedThisMonth = await this.employeeRepo
      .createQueryBuilder("e")
      .where("e.organizationId = :organizationId", { organizationId })
      .andWhere("e.terminationDate >= :startOfMonth", { startOfMonth })
      .getCount();

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
  // DEPARTMENT CRUD (delegated)
  // ============================================================================

  async createDepartment(
    organizationId: string,
    dto: CreateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.departmentService.createDepartment(organizationId, dto);
  }

  async updateDepartment(
    departmentId: string,
    organizationId: string,
    dto: UpdateDepartmentDto,
  ): Promise<DepartmentDto> {
    return this.departmentService.updateDepartment(
      departmentId,
      organizationId,
      dto,
    );
  }

  async getDepartments(
    organizationId: string,
    query: QueryDepartmentsDto,
  ): Promise<DepartmentListDto> {
    return this.departmentService.getDepartments(organizationId, query);
  }

  async getDepartment(
    departmentId: string,
    organizationId: string,
  ): Promise<DepartmentDto> {
    return this.departmentService.getDepartment(departmentId, organizationId);
  }

  async deleteDepartment(
    departmentId: string,
    organizationId: string,
  ): Promise<void> {
    return this.departmentService.deleteDepartment(
      departmentId,
      organizationId,
    );
  }

  // ============================================================================
  // POSITION CRUD (delegated)
  // ============================================================================

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
    return this.positionService.createPosition(organizationId, dto);
  }

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
    return this.positionService.updatePosition(positionId, organizationId, dto);
  }

  async getPositions(
    organizationId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      departmentId?: string;
      isActive?: boolean;
    },
  ): Promise<{
    items: Position[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.positionService.getPositions(organizationId, query);
  }

  async getPosition(
    positionId: string,
    organizationId: string,
  ): Promise<Position> {
    return this.positionService.getPosition(positionId, organizationId);
  }

  // ============================================================================
  // ATTENDANCE (delegated)
  // ============================================================================

  async checkIn(
    organizationId: string,
    dto: CheckInDto,
  ): Promise<AttendanceDto> {
    return this.attendanceService.checkIn(organizationId, dto);
  }

  async checkOut(
    organizationId: string,
    dto: CheckOutDto,
  ): Promise<AttendanceDto> {
    return this.attendanceService.checkOut(organizationId, dto);
  }

  async getAttendance(
    organizationId: string,
    query: QueryAttendanceDto,
  ): Promise<AttendanceListDto> {
    return this.attendanceService.getAttendance(organizationId, query);
  }

  async getDailyReport(
    organizationId: string,
    dateStr?: string,
  ): Promise<DailyAttendanceReportDto> {
    return this.attendanceService.getDailyReport(organizationId, dateStr);
  }

  async getMonthlyReport(
    organizationId: string,
    employeeId: string,
    year: number,
    month: number,
  ): Promise<AttendanceDto[]> {
    return this.attendanceService.getMonthlyReport(
      organizationId,
      employeeId,
      year,
      month,
    );
  }

  // ============================================================================
  // LEAVE REQUESTS (delegated)
  // ============================================================================

  async createLeaveRequest(
    organizationId: string,
    dto: CreateLeaveRequestDto,
  ): Promise<LeaveRequestDto> {
    return this.leaveService.createLeaveRequest(organizationId, dto);
  }

  async approveLeave(
    leaveId: string,
    organizationId: string,
    approvedById: string,
  ): Promise<LeaveRequestDto> {
    return this.leaveService.approveLeave(
      leaveId,
      organizationId,
      approvedById,
    );
  }

  async rejectLeave(
    leaveId: string,
    organizationId: string,
    approvedById: string,
    dto: RejectLeaveDto,
  ): Promise<LeaveRequestDto> {
    return this.leaveService.rejectLeave(
      leaveId,
      organizationId,
      approvedById,
      dto,
    );
  }

  async cancelLeave(
    leaveId: string,
    organizationId: string,
  ): Promise<LeaveRequestDto> {
    return this.leaveService.cancelLeave(leaveId, organizationId);
  }

  async getLeaveRequests(
    organizationId: string,
    query: QueryLeaveRequestsDto,
  ): Promise<LeaveRequestListDto> {
    return this.leaveService.getLeaveRequests(organizationId, query);
  }

  async getLeaveBalance(
    organizationId: string,
    employeeId: string,
    year?: number,
  ): Promise<LeaveBalanceDto> {
    return this.leaveService.getLeaveBalance(organizationId, employeeId, year);
  }

  // ============================================================================
  // PAYROLL (delegated)
  // ============================================================================

  async calculatePayroll(
    organizationId: string,
    dto: CalculatePayrollDto,
    userId: string,
  ): Promise<PayrollDto> {
    return this.payrollService.calculatePayroll(organizationId, dto, userId);
  }

  async approvePayroll(
    payrollId: string,
    organizationId: string,
    approvedById: string,
  ): Promise<PayrollDto> {
    return this.payrollService.approvePayroll(
      payrollId,
      organizationId,
      approvedById,
    );
  }

  async payPayroll(
    payrollId: string,
    organizationId: string,
    paymentReference?: string,
  ): Promise<PayrollDto> {
    return this.payrollService.payPayroll(
      payrollId,
      organizationId,
      paymentReference,
    );
  }

  async getPayrolls(
    organizationId: string,
    query: QueryPayrollDto,
  ): Promise<PayrollListDto> {
    return this.payrollService.getPayrolls(organizationId, query);
  }

  async getPayroll(
    payrollId: string,
    organizationId: string,
  ): Promise<PayrollDto> {
    return this.payrollService.getPayroll(payrollId, organizationId);
  }

  // ============================================================================
  // PERFORMANCE REVIEWS (delegated)
  // ============================================================================

  async createReview(
    organizationId: string,
    dto: CreateReviewDto,
  ): Promise<PerformanceReviewDto> {
    return this.performanceReviewService.createReview(organizationId, dto);
  }

  async submitReview(
    reviewId: string,
    organizationId: string,
    dto: SubmitReviewDto,
  ): Promise<PerformanceReviewDto> {
    return this.performanceReviewService.submitReview(
      reviewId,
      organizationId,
      dto,
    );
  }

  async getReviews(
    organizationId: string,
    query: QueryReviewsDto,
  ): Promise<PerformanceReviewListDto> {
    return this.performanceReviewService.getReviews(organizationId, query);
  }

  async getReview(
    reviewId: string,
    organizationId: string,
  ): Promise<PerformanceReviewDto> {
    return this.performanceReviewService.getReview(reviewId, organizationId);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async findEmployee(
    employeeId: string,
    organizationId: string,
  ): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, organizationId },
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    return employee;
  }

  private async generateEmployeeNumber(
    organizationId: string,
  ): Promise<string> {
    const count = await this.employeeRepo.count({ where: { organizationId } });
    return `EMP-${String(count + 1).padStart(4, "0")}`;
  }

  private mapToDto(employee: Employee): EmployeeDto {
    return {
      id: employee.id,
      organizationId: employee.organizationId,
      userId: employee.userId,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      ...(employee.middleName != null && { middleName: employee.middleName }),
      fullName: [employee.firstName, employee.middleName, employee.lastName]
        .filter(Boolean)
        .join(" "),
      phone: employee.phone,
      email: employee.email,
      employeeRole: employee.employeeRole,
      status: employee.status,
      ...(employee.telegramUserId != null && {
        telegramUserId: employee.telegramUserId,
      }),
      ...(employee.telegramUsername != null && {
        telegramUsername: employee.telegramUsername,
      }),
      hireDate: employee.hireDate,
      ...(employee.terminationDate != null && {
        terminationDate: employee.terminationDate,
      }),
      ...(employee.terminationReason != null && {
        terminationReason: employee.terminationReason,
      }),
      ...(employee.salary != null && { salary: Number(employee.salary) }),
      ...(employee.salaryFrequency != null && {
        salaryFrequency: employee.salaryFrequency,
      }),
      ...(employee.address != null && { address: employee.address }),
      ...(employee.city != null && { city: employee.city }),
      ...(employee.district != null && { district: employee.district }),
      ...(employee.emergencyContactName != null && {
        emergencyContactName: employee.emergencyContactName,
      }),
      ...(employee.emergencyContactPhone != null && {
        emergencyContactPhone: employee.emergencyContactPhone,
      }),
      ...(employee.emergencyContactRelation != null && {
        emergencyContactRelation: employee.emergencyContactRelation,
      }),
      ...(employee.notes != null && { notes: employee.notes }),
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
