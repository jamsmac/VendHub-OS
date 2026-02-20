/**
 * Work Logs Service
 * Business logic for time tracking
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  WorkLog,
  TimeOffRequest,
  Timesheet,
  WorkLogStatus,
  WorkLogType,
  ActivityType,
  TimeOffStatus,
  TimeOffType,
} from './entities/work-log.entity';
import {
  CreateWorkLogDto,
  UpdateWorkLogDto,
  ClockInDto,
  ClockOutDto,
  ApproveWorkLogDto,
  RejectWorkLogDto,
  WorkLogQueryDto,
  CreateTimeOffRequestDto,
  ApproveTimeOffDto,
  RejectTimeOffDto,
  TimeOffQueryDto,
  CreateTimesheetDto,
  ApproveTimesheetDto,
  TimesheetQueryDto,
  WorkLogStatsDto,
  EmployeeAttendanceDto,
} from './dto/work-log.dto';

@Injectable()
export class WorkLogsService {
  private readonly logger = new Logger(WorkLogsService.name);

  constructor(
    @InjectRepository(WorkLog)
    private readonly workLogRepository: Repository<WorkLog>,
    @InjectRepository(TimeOffRequest)
    private readonly timeOffRepository: Repository<TimeOffRequest>,
    @InjectRepository(Timesheet)
    private readonly timesheetRepository: Repository<Timesheet>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ========================================================================
  // WORK LOG CRUD
  // ========================================================================

  async createWorkLog(
    organizationId: string,
    dto: CreateWorkLogDto,
  ): Promise<WorkLog> {
    const workLog = this.workLogRepository.create({
      organizationId,
      ...dto,
      status: WorkLogStatus.DRAFT,
    });

    workLog.calculateWorkedMinutes();
    workLog.calculatePayAmount();

    const saved = await this.workLogRepository.save(workLog);

    this.eventEmitter.emit('worklog.created', { workLog: saved });
    return saved;
  }

  async findAllWorkLogs(
    organizationId: string,
    query: WorkLogQueryDto,
  ): Promise<{ data: WorkLog[]; total: number; page: number; limit: number }> {
    const {
      employeeId,
      startDate,
      endDate,
      status,
      workType,
      activityType,
      taskId,
      machineId,
      page = 1,
      limit = 20,
    } = query;

    const qb = this.workLogRepository
      .createQueryBuilder('wl')
      .where('wl.organizationId = :organizationId', { organizationId })
      .andWhere('wl.deletedAt IS NULL');

    if (employeeId) {
      qb.andWhere('wl.employeeId = :employeeId', { employeeId });
    }
    if (startDate && endDate) {
      qb.andWhere('wl.workDate BETWEEN :startDate AND :endDate', { startDate, endDate });
    }
    if (status) {
      qb.andWhere('wl.status = :status', { status });
    }
    if (workType) {
      qb.andWhere('wl.workType = :workType', { workType });
    }
    if (activityType) {
      qb.andWhere('wl.activityType = :activityType', { activityType });
    }
    if (taskId) {
      qb.andWhere('wl.taskId = :taskId', { taskId });
    }
    if (machineId) {
      qb.andWhere('wl.machineId = :machineId', { machineId });
    }

    const [data, total] = await qb
      .orderBy('wl.workDate', 'DESC')
      .addOrderBy('wl.clockIn', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOneWorkLog(organizationId: string, id: string): Promise<WorkLog> {
    const workLog = await this.workLogRepository.findOne({
      where: { id, organizationId },
    });

    if (!workLog) {
      throw new NotFoundException(`Work log ${id} not found`);
    }

    return workLog;
  }

  async updateWorkLog(
    organizationId: string,
    id: string,
    dto: UpdateWorkLogDto,
  ): Promise<WorkLog> {
    const workLog = await this.findOneWorkLog(organizationId, id);

    if (workLog.status !== WorkLogStatus.DRAFT && workLog.status !== WorkLogStatus.REJECTED) {
      throw new BadRequestException('Can only update draft or rejected work logs');
    }

    Object.assign(workLog, dto);
    workLog.calculateWorkedMinutes();
    workLog.calculatePayAmount();

    if (workLog.status === WorkLogStatus.REJECTED) {
      workLog.status = WorkLogStatus.DRAFT;
    }

    return this.workLogRepository.save(workLog);
  }

  async deleteWorkLog(organizationId: string, id: string): Promise<void> {
    const workLog = await this.findOneWorkLog(organizationId, id);

    if (workLog.status !== WorkLogStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft work logs');
    }

    await this.workLogRepository.softDelete(id);
  }

  // ========================================================================
  // CLOCK IN/OUT
  // ========================================================================

  async clockIn(
    organizationId: string,
    employeeId: string,
    dto: ClockInDto,
  ): Promise<WorkLog> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    const existing = await this.workLogRepository.findOne({
      where: {
        organizationId,
        employeeId,
        workDate: today,
        status: WorkLogStatus.DRAFT,
      },
    });

    if (existing && !existing.clockOut) {
      throw new BadRequestException('Already clocked in today. Clock out first.');
    }

    const now = new Date();
    const clockIn = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const workLog = this.workLogRepository.create({
      organizationId,
      employeeId,
      workDate: today,
      clockIn,
      clockOut: '', // Will be set on clock out
      workedMinutes: 0,
      workType: WorkLogType.REGULAR,
      activityType: ActivityType.OTHER,
      description: 'Auto clock-in',
      status: WorkLogStatus.DRAFT,
      checkInLatitude: dto.latitude,
      checkInLongitude: dto.longitude,
      notes: dto.notes,
    });

    const saved = await this.workLogRepository.save(workLog);

    this.eventEmitter.emit('worklog.clockedin', { workLog: saved });
    return saved;
  }

  async clockOut(
    organizationId: string,
    employeeId: string,
    dto: ClockOutDto,
  ): Promise<WorkLog> {
    const workLog = await this.workLogRepository.findOne({
      where: { id: dto.workLogId, organizationId, employeeId },
    });

    if (!workLog) {
      throw new NotFoundException('Work log not found');
    }

    if (workLog.clockOut) {
      throw new BadRequestException('Already clocked out');
    }

    const now = new Date();
    workLog.clockOut = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    workLog.checkOutLatitude = dto.latitude;
    workLog.checkOutLongitude = dto.longitude;

    if (dto.description) {
      workLog.description = dto.description;
    }
    if (dto.breakMinutes !== undefined) {
      workLog.breakMinutes = dto.breakMinutes;
    }

    workLog.calculateWorkedMinutes();
    workLog.calculatePayAmount();

    const saved = await this.workLogRepository.save(workLog);

    this.eventEmitter.emit('worklog.clockedout', { workLog: saved });
    return saved;
  }

  // ========================================================================
  // WORK LOG WORKFLOW
  // ========================================================================

  async submitWorkLog(organizationId: string, id: string): Promise<WorkLog> {
    const workLog = await this.findOneWorkLog(organizationId, id);

    if (workLog.status !== WorkLogStatus.DRAFT) {
      throw new BadRequestException('Work log already submitted');
    }

    if (!workLog.clockOut) {
      throw new BadRequestException('Cannot submit without clock out');
    }

    workLog.status = WorkLogStatus.SUBMITTED;
    const saved = await this.workLogRepository.save(workLog);

    this.eventEmitter.emit('worklog.submitted', { workLog: saved });
    return saved;
  }

  async approveWorkLog(
    organizationId: string,
    id: string,
    userId: string,
    dto: ApproveWorkLogDto,
  ): Promise<WorkLog> {
    const workLog = await this.findOneWorkLog(organizationId, id);

    if (workLog.status !== WorkLogStatus.SUBMITTED) {
      throw new BadRequestException('Work log not submitted');
    }

    if (dto.hourlyRate !== undefined) {
      workLog.hourlyRate = dto.hourlyRate;
      workLog.calculatePayAmount();
    }

    workLog.status = WorkLogStatus.APPROVED;
    workLog.approvedByUserId = userId;
    workLog.approvedAt = new Date();

    const saved = await this.workLogRepository.save(workLog);

    this.eventEmitter.emit('worklog.approved', { workLog: saved, userId });
    return saved;
  }

  async rejectWorkLog(
    organizationId: string,
    id: string,
    userId: string,
    dto: RejectWorkLogDto,
  ): Promise<WorkLog> {
    const workLog = await this.findOneWorkLog(organizationId, id);

    if (workLog.status !== WorkLogStatus.SUBMITTED) {
      throw new BadRequestException('Work log not submitted');
    }

    workLog.status = WorkLogStatus.REJECTED;
    workLog.rejectionReason = dto.reason;

    const saved = await this.workLogRepository.save(workLog);

    this.eventEmitter.emit('worklog.rejected', { workLog: saved, userId, reason: dto.reason });
    return saved;
  }

  async bulkApprove(
    organizationId: string,
    ids: string[],
    userId: string,
  ): Promise<{ approved: number; failed: number }> {
    let approved = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await this.approveWorkLog(organizationId, id, userId, {});
        approved++;
      } catch {
        failed++;
      }
    }

    return { approved, failed };
  }

  // ========================================================================
  // TIME OFF REQUESTS
  // ========================================================================

  async createTimeOffRequest(
    organizationId: string,
    employeeId: string,
    dto: CreateTimeOffRequestDto,
  ): Promise<TimeOffRequest> {
    // Calculate total days
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    let totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (dto.halfDayStart) totalDays -= 0.5;
    if (dto.halfDayEnd) totalDays -= 0.5;

    const request = this.timeOffRepository.create({
      organizationId,
      employeeId,
      ...dto,
      totalDays,
      status: TimeOffStatus.PENDING,
    });

    const saved = await this.timeOffRepository.save(request);

    this.eventEmitter.emit('timeoff.created', { request: saved });
    return saved;
  }

  async findAllTimeOffRequests(
    organizationId: string,
    query: TimeOffQueryDto,
  ): Promise<{ data: TimeOffRequest[]; total: number }> {
    const { employeeId, timeOffType, status, startDate, endDate, page = 1, limit = 20 } = query;

    const qb = this.timeOffRepository
      .createQueryBuilder('tor')
      .where('tor.organizationId = :organizationId', { organizationId })
      .andWhere('tor.deletedAt IS NULL');

    if (employeeId) {
      qb.andWhere('tor.employeeId = :employeeId', { employeeId });
    }
    if (timeOffType) {
      qb.andWhere('tor.timeOffType = :timeOffType', { timeOffType });
    }
    if (status) {
      qb.andWhere('tor.status = :status', { status });
    }
    if (startDate) {
      qb.andWhere('tor.startDate >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('tor.endDate <= :endDate', { endDate });
    }

    const [data, total] = await qb
      .orderBy('tor.startDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async approveTimeOff(
    organizationId: string,
    id: string,
    userId: string,
    _dto: ApproveTimeOffDto,
  ): Promise<TimeOffRequest> {
    const request = await this.timeOffRepository.findOne({
      where: { id, organizationId },
    });

    if (!request) {
      throw new NotFoundException('Time off request not found');
    }

    if (request.status !== TimeOffStatus.PENDING) {
      throw new BadRequestException('Request already processed');
    }

    request.status = TimeOffStatus.APPROVED;
    request.approvedByUserId = userId;
    request.approvedAt = new Date();

    const saved = await this.timeOffRepository.save(request);

    this.eventEmitter.emit('timeoff.approved', { request: saved, userId });
    return saved;
  }

  async rejectTimeOff(
    organizationId: string,
    id: string,
    userId: string,
    dto: RejectTimeOffDto,
  ): Promise<TimeOffRequest> {
    const request = await this.timeOffRepository.findOne({
      where: { id, organizationId },
    });

    if (!request) {
      throw new NotFoundException('Time off request not found');
    }

    if (request.status !== TimeOffStatus.PENDING) {
      throw new BadRequestException('Request already processed');
    }

    request.status = TimeOffStatus.REJECTED;
    request.rejectionReason = dto.reason;

    const saved = await this.timeOffRepository.save(request);

    this.eventEmitter.emit('timeoff.rejected', { request: saved, userId });
    return saved;
  }

  async cancelTimeOff(organizationId: string, id: string, employeeId: string): Promise<TimeOffRequest> {
    const request = await this.timeOffRepository.findOne({
      where: { id, organizationId, employeeId },
    });

    if (!request) {
      throw new NotFoundException('Time off request not found');
    }

    if (request.status !== TimeOffStatus.PENDING && request.status !== TimeOffStatus.APPROVED) {
      throw new BadRequestException('Cannot cancel this request');
    }

    request.status = TimeOffStatus.CANCELLED;
    return this.timeOffRepository.save(request);
  }

  // ========================================================================
  // TIMESHEETS
  // ========================================================================

  async createTimesheet(
    organizationId: string,
    dto: CreateTimesheetDto,
  ): Promise<Timesheet> {
    const timesheet = this.timesheetRepository.create({
      organizationId,
      ...dto,
      status: 'draft',
    });

    // Calculate totals from work logs
    await this.calculateTimesheetTotals(timesheet);

    const saved = await this.timesheetRepository.save(timesheet);

    this.eventEmitter.emit('timesheet.created', { timesheet: saved });
    return saved;
  }

  async findAllTimesheets(
    organizationId: string,
    query: TimesheetQueryDto,
  ): Promise<{ data: Timesheet[]; total: number }> {
    const { employeeId, status, periodStartFrom, periodStartTo, page = 1, limit = 20 } = query;

    const qb = this.timesheetRepository
      .createQueryBuilder('ts')
      .where('ts.organizationId = :organizationId', { organizationId })
      .andWhere('ts.deletedAt IS NULL');

    if (employeeId) {
      qb.andWhere('ts.employeeId = :employeeId', { employeeId });
    }
    if (status) {
      qb.andWhere('ts.status = :status', { status });
    }
    if (periodStartFrom) {
      qb.andWhere('ts.periodStart >= :periodStartFrom', { periodStartFrom });
    }
    if (periodStartTo) {
      qb.andWhere('ts.periodStart <= :periodStartTo', { periodStartTo });
    }

    const [data, total] = await qb
      .orderBy('ts.periodStart', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async submitTimesheet(organizationId: string, id: string): Promise<Timesheet> {
    const timesheet = await this.timesheetRepository.findOne({
      where: { id, organizationId },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    if (timesheet.status !== 'draft') {
      throw new BadRequestException('Timesheet already submitted');
    }

    // Recalculate totals
    await this.calculateTimesheetTotals(timesheet);

    timesheet.status = 'submitted';
    timesheet.submittedAt = new Date();

    return this.timesheetRepository.save(timesheet);
  }

  async approveTimesheet(
    organizationId: string,
    id: string,
    userId: string,
    dto: ApproveTimesheetDto,
  ): Promise<Timesheet> {
    const timesheet = await this.timesheetRepository.findOne({
      where: { id, organizationId },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    if (timesheet.status !== 'submitted') {
      throw new BadRequestException('Timesheet not submitted');
    }

    if (dto.deductions !== undefined) {
      timesheet.deductions = dto.deductions;
      timesheet.totalPay = Number(timesheet.regularPay) + Number(timesheet.overtimePay) - dto.deductions;
    }

    if (dto.notes) {
      timesheet.notes = dto.notes;
    }

    timesheet.status = 'approved';
    timesheet.approvedByUserId = userId;
    timesheet.approvedAt = new Date();

    const saved = await this.timesheetRepository.save(timesheet);

    this.eventEmitter.emit('timesheet.approved', { timesheet: saved, userId });
    return saved;
  }

  async markTimesheetPaid(organizationId: string, id: string): Promise<Timesheet> {
    const timesheet = await this.timesheetRepository.findOne({
      where: { id, organizationId },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    if (timesheet.status !== 'approved') {
      throw new BadRequestException('Timesheet not approved');
    }

    timesheet.status = 'paid';
    timesheet.paidAt = new Date();

    // Also mark related work logs as paid
    await this.workLogRepository.update(
      {
        organizationId,
        employeeId: timesheet.employeeId,
        workDate: Between(timesheet.periodStart, timesheet.periodEnd),
        status: WorkLogStatus.APPROVED,
      },
      { status: WorkLogStatus.PAID },
    );

    return this.timesheetRepository.save(timesheet);
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  async getWorkLogStats(
    organizationId: string,
    employeeId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<WorkLogStatsDto> {
    const qb = this.workLogRepository
      .createQueryBuilder('wl')
      .where('wl.organizationId = :organizationId', { organizationId })
      .andWhere('wl.deletedAt IS NULL');

    if (employeeId) {
      qb.andWhere('wl.employeeId = :employeeId', { employeeId });
    }
    if (startDate && endDate) {
      qb.andWhere('wl.workDate BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const workLogs = await qb.getMany();

    const totalWorkedMinutes = workLogs.reduce((sum, wl) => sum + wl.workedMinutes, 0);
    const totalOvertimeMinutes = workLogs.reduce((sum, wl) => sum + wl.overtimeMinutes, 0);
    const uniqueDays = new Set(workLogs.map(wl => wl.workDate.toString())).size;

    const byActivity = {} as Record<ActivityType, number>;
    const byStatus = {} as Record<WorkLogStatus, number>;

    Object.values(ActivityType).forEach(a => byActivity[a] = 0);
    Object.values(WorkLogStatus).forEach(s => byStatus[s] = 0);

    for (const wl of workLogs) {
      byActivity[wl.activityType] += wl.workedMinutes / 60;
      byStatus[wl.status]++;
    }

    return {
      totalWorkedHours: Math.round(totalWorkedMinutes / 60 * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeMinutes / 60 * 100) / 100,
      totalDays: uniqueDays,
      averageHoursPerDay: uniqueDays > 0 ? Math.round((totalWorkedMinutes / 60 / uniqueDays) * 100) / 100 : 0,
      byActivity,
      byStatus,
    };
  }

  async getAttendanceReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EmployeeAttendanceDto[]> {
    // Get all work logs for the period
    const workLogs = await this.workLogRepository.find({
      where: {
        organizationId,
        workDate: Between(startDate, endDate),
      },
    });

    // Get time off requests
    const timeOffs = await this.timeOffRepository.find({
      where: {
        organizationId,
        status: TimeOffStatus.APPROVED,
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
      },
    });

    // Group by employee
    const employeeData = new Map<string, EmployeeAttendanceDto>();

    for (const wl of workLogs) {
      if (!employeeData.has(wl.employeeId)) {
        employeeData.set(wl.employeeId, {
          employeeId: wl.employeeId,
          employeeName: '', // Would need to join with employees
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          timeOffDays: 0,
          totalWorkedHours: 0,
          overtimeHours: 0,
        });
      }

      const data = employeeData.get(wl.employeeId)!;
      data.presentDays++;
      data.totalWorkedHours += wl.workedMinutes / 60;
      data.overtimeHours += wl.overtimeMinutes / 60;

      // Check if late (after 9:00)
      const [hour] = wl.clockIn.split(':').map(Number);
      if (hour >= 9) {
        data.lateDays++;
      }
    }

    // Add time off days
    for (const to of timeOffs) {
      if (!employeeData.has(to.employeeId)) {
        employeeData.set(to.employeeId, {
          employeeId: to.employeeId,
          employeeName: '',
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          timeOffDays: 0,
          totalWorkedHours: 0,
          overtimeHours: 0,
        });
      }

      const data = employeeData.get(to.employeeId)!;
      data.timeOffDays += to.totalDays;
    }

    return Array.from(employeeData.values());
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private async calculateTimesheetTotals(timesheet: Timesheet): Promise<void> {
    const workLogs = await this.workLogRepository.find({
      where: {
        organizationId: timesheet.organizationId,
        employeeId: timesheet.employeeId,
        workDate: Between(timesheet.periodStart, timesheet.periodEnd),
        status: In([WorkLogStatus.APPROVED, WorkLogStatus.SUBMITTED]),
      },
    });

    const timeOffs = await this.timeOffRepository.find({
      where: {
        organizationId: timesheet.organizationId,
        employeeId: timesheet.employeeId,
        status: TimeOffStatus.APPROVED,
        startDate: LessThanOrEqual(timesheet.periodEnd),
        endDate: MoreThanOrEqual(timesheet.periodStart),
      },
    });

    const uniqueDays = new Set(workLogs.map(wl => wl.workDate.toString()));
    const totalWorkedMinutes = workLogs.reduce((sum, wl) => sum + wl.workedMinutes, 0);
    const totalOvertimeMinutes = workLogs.reduce((sum, wl) => sum + wl.overtimeMinutes, 0);
    const totalSickDays = timeOffs
      .filter(to => to.timeOffType === TimeOffType.SICK_LEAVE)
      .reduce((sum, to) => sum + to.totalDays, 0);
    const totalTimeOffDays = timeOffs.reduce((sum, to) => sum + to.totalDays, 0);

    const regularPay = workLogs.reduce((sum, wl) => {
      if (wl.hourlyRate) {
        return sum + (wl.workedMinutes / 60 * Number(wl.hourlyRate));
      }
      return sum;
    }, 0);

    const overtimePay = workLogs.reduce((sum, wl) => {
      if (wl.hourlyRate && wl.overtimeMinutes > 0) {
        return sum + (wl.overtimeMinutes / 60 * Number(wl.hourlyRate) * Number(wl.overtimeMultiplier));
      }
      return sum;
    }, 0);

    timesheet.totalWorkedDays = uniqueDays.size;
    timesheet.totalWorkedHours = Math.round(totalWorkedMinutes / 60 * 100) / 100;
    timesheet.totalOvertimeHours = Math.round(totalOvertimeMinutes / 60 * 100) / 100;
    timesheet.totalSickDays = totalSickDays;
    timesheet.totalTimeOffDays = totalTimeOffDays;
    timesheet.regularPay = regularPay;
    timesheet.overtimePay = overtimePay;
    timesheet.totalPay = regularPay + overtimePay - Number(timesheet.deductions || 0);

    // Build daily summary
    const dailySummary: Timesheet['dailySummary'] = [];
    const start = new Date(timesheet.periodStart);
    const end = new Date(timesheet.periodEnd);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayLogs = workLogs.filter(wl => wl.workDate.toString().startsWith(dateStr));
      const dayTimeOff = timeOffs.some(to =>
        new Date(to.startDate) <= d && new Date(to.endDate) >= d,
      );

      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      dailySummary.push({
        date: dateStr,
        workedHours: dayLogs.reduce((sum, wl) => sum + wl.workedMinutes / 60, 0),
        overtimeHours: dayLogs.reduce((sum, wl) => sum + wl.overtimeMinutes / 60, 0),
        status: dayTimeOff
          ? timeOffs.find(to => new Date(to.startDate) <= d && new Date(to.endDate) >= d)?.timeOffType === TimeOffType.SICK_LEAVE
            ? 'sick'
            : 'time_off'
          : isWeekend
            ? 'weekend'
            : dayLogs.length > 0
              ? 'worked'
              : 'weekend', // Default to weekend if no logs
      });
    }

    timesheet.dailySummary = dailySummary;
  }

  // ========================================================================
  // CRON JOBS
  // ========================================================================

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyTimesheets(): Promise<void> {
    this.logger.log('Generating monthly timesheets...');

    // This would typically:
    // 1. Get all employees
    // 2. Create timesheets for the previous month
    // 3. Send notifications

    // Implementation depends on employee data access
  }
}
