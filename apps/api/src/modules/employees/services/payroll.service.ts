/**
 * Payroll Sub-Service
 * Handles payroll calculations, approval, and payment workflow
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Employee } from "../entities/employee.entity";
import { Attendance, AttendanceStatus } from "../entities/attendance.entity";
import { Payroll, PayrollStatus } from "../entities/payroll.entity";
import {
  CalculatePayrollDto,
  QueryPayrollDto,
  PayrollDto,
  PayrollListDto,
} from "../dto/payroll.dto";

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    @InjectRepository(Payroll)
    private readonly payrollRepo: Repository<Payroll>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Calculate payroll for an employee
   */
  async calculatePayroll(
    organizationId: string,
    dto: CalculatePayrollDto,
    _userId: string,
  ): Promise<PayrollDto> {
    const employee = await this.findEmployee(dto.employeeId, organizationId);

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // Check for existing payroll for this period
    const existing = await this.payrollRepo.findOne({
      where: {
        employeeId: dto.employeeId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        periodStart: periodStart as any, // TypeORM FindOptionsWhere doesn't resolve Date column type correctly
        organizationId,
      },
    });

    if (existing && existing.status !== PayrollStatus.DRAFT) {
      throw new ConflictException("Payroll already calculated for this period");
    }

    // Get attendance data for the period
    const attendances = await this.attendanceRepo.find({
      where: {
        employeeId: dto.employeeId,
        organizationId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        date: Between(periodStart, periodEnd) as any, // TypeORM FindOptionsWhere doesn't resolve FindOperator<Date> correctly
      },
    });

    // Calculate working days in period (Mon-Sat in Uzbekistan)
    let workingDays = 0;
    const current = new Date(periodStart);
    while (current <= periodEnd) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0) {
        // Sunday is off
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Calculate worked days from attendance
    const workedDays = attendances.filter((a) =>
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
    const overtimePay =
      Math.round(totalOvertimeHours * (dailyRate / 8) * 1.5 * 100) / 100;
    const bonuses = 0;
    const deductions = 0;

    // Uzbekistan income tax (12%)
    const grossSalary = actualBaseSalary + overtimePay + bonuses;
    const taxAmount = Math.round(grossSalary * 0.12 * 100) / 100;
    const netSalary =
      Math.round((grossSalary - deductions - taxAmount) * 100) / 100;

    const payroll =
      existing ||
      this.payrollRepo.create({
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
    payroll.currency = "UZS";
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
      throw new NotFoundException("Payroll record not found");
    }

    if (payroll.status !== PayrollStatus.CALCULATED) {
      throw new BadRequestException(
        "Payroll must be in calculated status to approve",
      );
    }

    // SECURITY: Prevent self-approval of payroll
    if (payroll.createdById === approvedById) {
      throw new BadRequestException(
        "Cannot approve payroll you created. Another authorized user must approve.",
      );
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
      throw new NotFoundException("Payroll record not found");
    }

    if (payroll.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException("Payroll must be approved before payment");
    }

    payroll.status = PayrollStatus.PAID;
    payroll.paidAt = new Date();
    payroll.paymentReference = paymentReference || null;

    await this.payrollRepo.save(payroll);

    this.eventEmitter.emit("payroll.paid", {
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
    const {
      page = 1,
      limit = 20,
      employeeId,
      status,
      periodStart,
      periodEnd,
    } = query;

    const qb = this.payrollRepo
      .createQueryBuilder("p")
      .where("p.organizationId = :organizationId", { organizationId });

    if (employeeId) {
      qb.andWhere("p.employeeId = :employeeId", { employeeId });
    }

    if (status) {
      qb.andWhere("p.status = :status", { status });
    }

    if (periodStart) {
      qb.andWhere("p.periodStart >= :periodStart", { periodStart });
    }

    if (periodEnd) {
      qb.andWhere("p.periodEnd <= :periodEnd", { periodEnd });
    }

    const [items, total] = await qb
      .orderBy("p.periodStart", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((p) => this.mapPayrollToDto(p)),
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
      throw new NotFoundException("Payroll record not found");
    }
    return this.mapPayrollToDto(payroll);
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
      throw new NotFoundException("Employee not found");
    }

    return employee;
  }

  mapPayrollToDto(payroll: Payroll): PayrollDto {
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
      createdAt: payroll.createdAt,
      updatedAt: payroll.updatedAt,
    };
  }
}
