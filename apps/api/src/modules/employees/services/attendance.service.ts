/**
 * Attendance Sub-Service
 * Handles check-in/check-out and attendance reports
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Employee, EmployeeStatus } from "../entities/employee.entity";
import { Attendance, AttendanceStatus } from "../entities/attendance.entity";
import {
  CheckInDto,
  CheckOutDto,
  QueryAttendanceDto,
  AttendanceDto,
  AttendanceListDto,
  DailyAttendanceReportDto,
} from "../dto/attendance.dto";

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

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
    const dateStr = today.toISOString().split("T")[0];

    // Check if already checked in today
    const existing = await this.attendanceRepo.findOne({
      where: {
        employeeId: dto.employeeId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        date: new Date(dateStr) as any,
        organizationId,
      },
    });

    if (existing && existing.checkIn) {
      throw new BadRequestException("Employee already checked in today");
    }

    const attendance =
      existing ||
      this.attendanceRepo.create({
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
    const dateStr = today.toISOString().split("T")[0];

    const attendance = await this.attendanceRepo.findOne({
      where: {
        employeeId: dto.employeeId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        date: new Date(dateStr) as any,
        organizationId,
      },
    });

    if (!attendance) {
      throw new BadRequestException("No check-in record found for today");
    }

    if (attendance.checkOut) {
      throw new BadRequestException("Employee already checked out today");
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
      const diffMs =
        attendance.checkOut.getTime() - attendance.checkIn.getTime();
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
    const {
      page = 1,
      limit = 20,
      employeeId,
      dateFrom,
      dateTo,
      status,
    } = query;

    const qb = this.attendanceRepo
      .createQueryBuilder("a")
      .where("a.organizationId = :organizationId", { organizationId });

    if (employeeId) {
      qb.andWhere("a.employeeId = :employeeId", { employeeId });
    }

    if (dateFrom) {
      qb.andWhere("a.date >= :dateFrom", { dateFrom });
    }

    if (dateTo) {
      qb.andWhere("a.date <= :dateTo", { dateTo });
    }

    if (status) {
      qb.andWhere("a.status = :status", { status });
    }

    const [items, total] = await qb
      .orderBy("a.date", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((a) => this.mapAttendanceToDto(a)),
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
    const date = dateStr || new Date().toISOString().split("T")[0];

    const records = await this.attendanceRepo.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      records: records.map((r) => this.mapAttendanceToDto(r)),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        date: Between(startDate, endDate) as any,
      },
      order: { date: "ASC" },
    });

    return records.map((r) => this.mapAttendanceToDto(r));
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

  mapAttendanceToDto(attendance: Attendance): AttendanceDto {
    return {
      id: attendance.id,
      organizationId: attendance.organizationId,
      employeeId: attendance.employeeId,
      date: attendance.date,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      totalHours: attendance.totalHours ? Number(attendance.totalHours) : null,
      overtimeHours: attendance.overtimeHours
        ? Number(attendance.overtimeHours)
        : null,
      status: attendance.status,
      note: attendance.note,
      checkInLocation: attendance.checkInLocation,
      checkOutLocation: attendance.checkOutLocation,
      createdAt: attendance.createdAt,
      updatedAt: attendance.updatedAt,
    };
  }
}
