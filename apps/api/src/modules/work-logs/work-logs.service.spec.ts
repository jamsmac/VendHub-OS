import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { WorkLogsService } from './work-logs.service';
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

type MockRepository<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;
const createMockRepository = <T extends ObjectLiteral>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createMockQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
  getMany: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
});

describe('WorkLogsService', () => {
  let service: WorkLogsService;
  let workLogRepo: MockRepository<WorkLog>;
  let timeOffRepo: MockRepository<TimeOffRequest>;
  let timesheetRepo: MockRepository<Timesheet>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const orgId = 'org-uuid-1';
  const userId = 'user-uuid-1';
  const employeeId = 'emp-uuid-1';
  const workLogId = 'wl-uuid-1';
  const timeOffId = 'tor-uuid-1';
  const timesheetId = 'ts-uuid-1';

  const mockWorkLog: Partial<WorkLog> = {
    id: workLogId,
    organizationId: orgId,
    employeeId,
    workDate: new Date('2025-01-15'),
    workType: WorkLogType.REGULAR,
    activityType: ActivityType.REFILL,
    status: WorkLogStatus.DRAFT,
    clockIn: '09:00',
    clockOut: '17:00',
    breakMinutes: 60,
    workedMinutes: 420,
    overtimeMinutes: 0,
    description: 'Refill route A',
    hourlyRate: 50000,
    overtimeMultiplier: 1.5,
    calculateWorkedMinutes: jest.fn(),
    calculatePayAmount: jest.fn(),
  };

  const mockTimeOff: Partial<TimeOffRequest> = {
    id: timeOffId,
    organizationId: orgId,
    employeeId,
    timeOffType: TimeOffType.VACATION,
    status: TimeOffStatus.PENDING,
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-02-05'),
    totalDays: 5,
    halfDayStart: false,
    halfDayEnd: false,
  };

  const mockTimesheet: Partial<Timesheet> = {
    id: timesheetId,
    organizationId: orgId,
    employeeId,
    periodStart: new Date('2025-01-01'),
    periodEnd: new Date('2025-01-31'),
    status: 'draft',
    totalWorkedDays: 0,
    totalWorkedHours: 0,
    totalOvertimeHours: 0,
    totalTimeOffDays: 0,
    totalSickDays: 0,
    regularPay: 0,
    overtimePay: 0,
    deductions: 0,
    totalPay: 0,
  };

  beforeEach(async () => {
    workLogRepo = createMockRepository<WorkLog>();
    timeOffRepo = createMockRepository<TimeOffRequest>();
    timesheetRepo = createMockRepository<Timesheet>();
    eventEmitter = { emit: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkLogsService,
        { provide: getRepositoryToken(WorkLog), useValue: workLogRepo },
        { provide: getRepositoryToken(TimeOffRequest), useValue: timeOffRepo },
        { provide: getRepositoryToken(Timesheet), useValue: timesheetRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<WorkLogsService>(WorkLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================================================
  // createWorkLog
  // ========================================================================

  describe('createWorkLog', () => {
    it('should create a work log with DRAFT status', async () => {
      const dto = {
        employeeId,
        workDate: new Date('2025-01-15'),
        clockIn: '09:00',
        clockOut: '17:00',
        breakMinutes: 60,
        workType: WorkLogType.REGULAR,
        activityType: ActivityType.REFILL,
        description: 'Refill route A',
      };

      const created = { ...mockWorkLog, ...dto, status: WorkLogStatus.DRAFT };
      workLogRepo.create!.mockReturnValue(created);
      workLogRepo.save!.mockResolvedValue(created);

      const result = await service.createWorkLog(orgId, dto as any);

      expect(workLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: orgId, status: WorkLogStatus.DRAFT }),
      );
      expect(created.calculateWorkedMinutes).toHaveBeenCalled();
      expect(created.calculatePayAmount).toHaveBeenCalled();
      expect(workLogRepo.save).toHaveBeenCalledWith(created);
      expect(eventEmitter.emit).toHaveBeenCalledWith('worklog.created', { workLog: created });
      expect(result).toEqual(created);
    });
  });

  // ========================================================================
  // findAllWorkLogs
  // ========================================================================

  describe('findAllWorkLogs', () => {
    it('should return paginated work logs', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockWorkLog], 1]);
      workLogRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findAllWorkLogs(orgId, { page: 1, limit: 20 } as any);

      expect(result).toEqual({ data: [mockWorkLog], total: 1, page: 1, limit: 20 });
      expect(qb.where).toHaveBeenCalled();
    });

    it('should apply all optional filters', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      workLogRepo.createQueryBuilder!.mockReturnValue(qb as any);

      await service.findAllWorkLogs(orgId, {
        employeeId: 'emp-1',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        status: WorkLogStatus.APPROVED,
        workType: WorkLogType.REGULAR,
        activityType: ActivityType.REFILL,
        taskId: 'task-1',
        machineId: 'machine-1',
        page: 2,
        limit: 10,
      } as any);

      // 7 optional filters + the mandatory org + deletedAt filter
      expect(qb.andWhere).toHaveBeenCalledTimes(8);
    });
  });

  // ========================================================================
  // findOneWorkLog
  // ========================================================================

  describe('findOneWorkLog', () => {
    it('should return a work log when found', async () => {
      workLogRepo.findOne!.mockResolvedValue(mockWorkLog);

      const result = await service.findOneWorkLog(orgId, workLogId);

      expect(result).toEqual(mockWorkLog);
    });

    it('should throw NotFoundException when work log not found', async () => {
      workLogRepo.findOne!.mockResolvedValue(null);

      await expect(service.findOneWorkLog(orgId, 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ========================================================================
  // updateWorkLog
  // ========================================================================

  describe('updateWorkLog', () => {
    it('should update a DRAFT work log', async () => {
      const draft = { ...mockWorkLog, status: WorkLogStatus.DRAFT };
      workLogRepo.findOne!.mockResolvedValue(draft);
      workLogRepo.save!.mockResolvedValue({ ...draft, description: 'Updated' });

      const result = await service.updateWorkLog(orgId, workLogId, { description: 'Updated' } as any);

      expect(draft.calculateWorkedMinutes).toHaveBeenCalled();
      expect(draft.calculatePayAmount).toHaveBeenCalled();
      expect(result.description).toBe('Updated');
    });

    it('should update a REJECTED work log and reset status to DRAFT', async () => {
      const rejected = { ...mockWorkLog, status: WorkLogStatus.REJECTED };
      workLogRepo.findOne!.mockResolvedValue(rejected);
      workLogRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.updateWorkLog(orgId, workLogId, { description: 'Fixed' } as any);

      expect(result.status).toBe(WorkLogStatus.DRAFT);
    });

    it('should throw BadRequestException when status is not DRAFT or REJECTED', async () => {
      workLogRepo.findOne!.mockResolvedValue({ ...mockWorkLog, status: WorkLogStatus.APPROVED });

      await expect(service.updateWorkLog(orgId, workLogId, {} as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // deleteWorkLog
  // ========================================================================

  describe('deleteWorkLog', () => {
    it('should soft-delete a DRAFT work log', async () => {
      workLogRepo.findOne!.mockResolvedValue({ ...mockWorkLog, status: WorkLogStatus.DRAFT });
      workLogRepo.softDelete!.mockResolvedValue({ affected: 1 });

      await service.deleteWorkLog(orgId, workLogId);

      expect(workLogRepo.softDelete).toHaveBeenCalledWith(workLogId);
    });

    it('should throw BadRequestException when deleting non-DRAFT work log', async () => {
      workLogRepo.findOne!.mockResolvedValue({ ...mockWorkLog, status: WorkLogStatus.SUBMITTED });

      await expect(service.deleteWorkLog(orgId, workLogId))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // clockIn
  // ========================================================================

  describe('clockIn', () => {
    it('should create a new work log for clock-in', async () => {
      workLogRepo.findOne!.mockResolvedValue(null);
      const created = { ...mockWorkLog };
      workLogRepo.create!.mockReturnValue(created);
      workLogRepo.save!.mockResolvedValue(created);

      const result = await service.clockIn(orgId, employeeId, { latitude: 41.3, longitude: 69.2 } as any);

      expect(workLogRepo.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('worklog.clockedin', { workLog: created });
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException when already clocked in', async () => {
      workLogRepo.findOne!.mockResolvedValue({ ...mockWorkLog, clockOut: '' });

      await expect(service.clockIn(orgId, employeeId, {} as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // clockOut
  // ========================================================================

  describe('clockOut', () => {
    it('should clock out successfully', async () => {
      const logWithNoClock = { ...mockWorkLog, clockOut: '' };
      workLogRepo.findOne!.mockResolvedValue(logWithNoClock);
      workLogRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.clockOut(orgId, employeeId, {
        workLogId,
        latitude: 41.3,
        longitude: 69.2,
        description: 'Done',
        breakMinutes: 30,
      } as any);

      expect(result.clockOut).toBeTruthy();
      expect(result.checkOutLatitude).toBe(41.3);
      expect(result.breakMinutes).toBe(30);
      expect(eventEmitter.emit).toHaveBeenCalledWith('worklog.clockedout', expect.any(Object));
    });

    it('should throw NotFoundException when work log not found', async () => {
      workLogRepo.findOne!.mockResolvedValue(null);

      await expect(service.clockOut(orgId, employeeId, { workLogId: 'bad' } as any))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already clocked out', async () => {
      workLogRepo.findOne!.mockResolvedValue({ ...mockWorkLog, clockOut: '17:00' });

      await expect(service.clockOut(orgId, employeeId, { workLogId } as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // submitWorkLog
  // ========================================================================

  describe('submitWorkLog', () => {
    it('should submit a DRAFT work log with clockOut', async () => {
      const draft = { ...mockWorkLog, status: WorkLogStatus.DRAFT, clockOut: '17:00' };
      workLogRepo.findOne!.mockResolvedValue(draft);
      workLogRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.submitWorkLog(orgId, workLogId);

      expect(result.status).toBe(WorkLogStatus.SUBMITTED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('worklog.submitted', expect.any(Object));
    });

    it('should throw when submitting without clock out', async () => {
      workLogRepo.findOne!.mockResolvedValue({ ...mockWorkLog, status: WorkLogStatus.DRAFT, clockOut: '' });

      await expect(service.submitWorkLog(orgId, workLogId))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw when work log already submitted', async () => {
      workLogRepo.findOne!.mockResolvedValue({ ...mockWorkLog, status: WorkLogStatus.SUBMITTED });

      await expect(service.submitWorkLog(orgId, workLogId))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // approveWorkLog
  // ========================================================================

  describe('approveWorkLog', () => {
    it('should approve a submitted work log', async () => {
      const submitted = { ...mockWorkLog, status: WorkLogStatus.SUBMITTED };
      workLogRepo.findOne!.mockResolvedValue(submitted);
      workLogRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.approveWorkLog(orgId, workLogId, userId, {});

      expect(result.status).toBe(WorkLogStatus.APPROVED);
      expect(result.approvedByUserId).toBe(userId);
      expect(result.approvedAt).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith('worklog.approved', expect.any(Object));
    });

    it('should update hourly rate if provided in approval', async () => {
      const submitted = { ...mockWorkLog, status: WorkLogStatus.SUBMITTED };
      workLogRepo.findOne!.mockResolvedValue(submitted);
      workLogRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.approveWorkLog(orgId, workLogId, userId, { hourlyRate: 60000 });

      expect(result.hourlyRate).toBe(60000);
      expect(submitted.calculatePayAmount).toHaveBeenCalled();
    });

    it('should throw when work log not in SUBMITTED status', async () => {
      workLogRepo.findOne!.mockResolvedValue({ ...mockWorkLog, status: WorkLogStatus.DRAFT });

      await expect(service.approveWorkLog(orgId, workLogId, userId, {}))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // rejectWorkLog
  // ========================================================================

  describe('rejectWorkLog', () => {
    it('should reject a submitted work log with reason', async () => {
      const submitted = { ...mockWorkLog, status: WorkLogStatus.SUBMITTED };
      workLogRepo.findOne!.mockResolvedValue(submitted);
      workLogRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.rejectWorkLog(orgId, workLogId, userId, { reason: 'Incorrect hours' });

      expect(result.status).toBe(WorkLogStatus.REJECTED);
      expect(result.rejectionReason).toBe('Incorrect hours');
      expect(eventEmitter.emit).toHaveBeenCalledWith('worklog.rejected', expect.any(Object));
    });
  });

  // ========================================================================
  // bulkApprove
  // ========================================================================

  describe('bulkApprove', () => {
    it('should approve multiple work logs and report success/failures', async () => {
      const submitted = { ...mockWorkLog, status: WorkLogStatus.SUBMITTED };
      // First call succeeds, second call throws
      workLogRepo.findOne!
        .mockResolvedValueOnce(submitted)
        .mockResolvedValueOnce({ ...mockWorkLog, status: WorkLogStatus.DRAFT });
      workLogRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.bulkApprove(orgId, ['id-1', 'id-2'], userId);

      expect(result.approved).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  // ========================================================================
  // Time Off Requests
  // ========================================================================

  describe('createTimeOffRequest', () => {
    it('should create a time off request with calculated total days', async () => {
      const dto = {
        timeOffType: TimeOffType.VACATION,
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        halfDayStart: false,
        halfDayEnd: false,
        reason: 'Family trip',
      };

      timeOffRepo.create!.mockReturnValue({ ...mockTimeOff, ...dto, totalDays: 5 });
      timeOffRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.createTimeOffRequest(orgId, employeeId, dto as any);

      expect(timeOffRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: orgId,
          employeeId,
          status: TimeOffStatus.PENDING,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith('timeoff.created', expect.any(Object));
    });
  });

  describe('findAllTimeOffRequests', () => {
    it('should return paginated time off requests', async () => {
      const qb = createMockQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[mockTimeOff], 1]);
      timeOffRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.findAllTimeOffRequests(orgId, { page: 1, limit: 20 } as any);

      expect(result).toEqual({ data: [mockTimeOff], total: 1 });
    });
  });

  describe('approveTimeOff', () => {
    it('should approve a pending time off request', async () => {
      timeOffRepo.findOne!.mockResolvedValue({ ...mockTimeOff, status: TimeOffStatus.PENDING });
      timeOffRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.approveTimeOff(orgId, timeOffId, userId, {} as any);

      expect(result.status).toBe(TimeOffStatus.APPROVED);
      expect(result.approvedByUserId).toBe(userId);
    });

    it('should throw NotFoundException when request not found', async () => {
      timeOffRepo.findOne!.mockResolvedValue(null);

      await expect(service.approveTimeOff(orgId, 'bad', userId, {} as any))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when already processed', async () => {
      timeOffRepo.findOne!.mockResolvedValue({ ...mockTimeOff, status: TimeOffStatus.APPROVED });

      await expect(service.approveTimeOff(orgId, timeOffId, userId, {} as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectTimeOff', () => {
    it('should reject a pending time off request', async () => {
      timeOffRepo.findOne!.mockResolvedValue({ ...mockTimeOff, status: TimeOffStatus.PENDING });
      timeOffRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.rejectTimeOff(orgId, timeOffId, userId, { reason: 'Staffing' });

      expect(result.status).toBe(TimeOffStatus.REJECTED);
      expect(result.rejectionReason).toBe('Staffing');
    });
  });

  describe('cancelTimeOff', () => {
    it('should cancel a pending time off request', async () => {
      timeOffRepo.findOne!.mockResolvedValue({ ...mockTimeOff, status: TimeOffStatus.PENDING });
      timeOffRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.cancelTimeOff(orgId, timeOffId, employeeId);

      expect(result.status).toBe(TimeOffStatus.CANCELLED);
    });

    it('should throw when request cannot be cancelled', async () => {
      timeOffRepo.findOne!.mockResolvedValue({ ...mockTimeOff, status: TimeOffStatus.REJECTED });

      await expect(service.cancelTimeOff(orgId, timeOffId, employeeId))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // Timesheets
  // ========================================================================

  describe('submitTimesheet', () => {
    it('should submit a draft timesheet', async () => {
      timesheetRepo.findOne!.mockResolvedValue({ ...mockTimesheet, status: 'draft' });
      workLogRepo.find!.mockResolvedValue([]);
      timeOffRepo.find!.mockResolvedValue([]);
      timesheetRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.submitTimesheet(orgId, timesheetId);

      expect(result.status).toBe('submitted');
      expect(result.submittedAt).toBeDefined();
    });

    it('should throw when timesheet not found', async () => {
      timesheetRepo.findOne!.mockResolvedValue(null);

      await expect(service.submitTimesheet(orgId, 'bad'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw when timesheet already submitted', async () => {
      timesheetRepo.findOne!.mockResolvedValue({ ...mockTimesheet, status: 'submitted' });

      await expect(service.submitTimesheet(orgId, timesheetId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('approveTimesheet', () => {
    it('should approve a submitted timesheet', async () => {
      timesheetRepo.findOne!.mockResolvedValue({ ...mockTimesheet, status: 'submitted' });
      timesheetRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.approveTimesheet(orgId, timesheetId, userId, {} as any);

      expect(result.status).toBe('approved');
      expect(result.approvedByUserId).toBe(userId);
    });

    it('should apply deductions when provided', async () => {
      timesheetRepo.findOne!.mockResolvedValue({
        ...mockTimesheet,
        status: 'submitted',
        regularPay: 1000000,
        overtimePay: 200000,
      });
      timesheetRepo.save!.mockImplementation(async (entity) => entity);

      const result = await service.approveTimesheet(orgId, timesheetId, userId, {
        deductions: 50000,
      } as any);

      expect(result.deductions).toBe(50000);
    });
  });

  describe('markTimesheetPaid', () => {
    it('should mark an approved timesheet as paid', async () => {
      timesheetRepo.findOne!.mockResolvedValue({ ...mockTimesheet, status: 'approved' });
      timesheetRepo.save!.mockImplementation(async (entity) => entity);
      workLogRepo.update!.mockResolvedValue({ affected: 5 });

      const result = await service.markTimesheetPaid(orgId, timesheetId);

      expect(result.status).toBe('paid');
      expect(result.paidAt).toBeDefined();
      expect(workLogRepo.update).toHaveBeenCalled();
    });

    it('should throw when timesheet not approved', async () => {
      timesheetRepo.findOne!.mockResolvedValue({ ...mockTimesheet, status: 'submitted' });

      await expect(service.markTimesheetPaid(orgId, timesheetId))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================================
  // Statistics
  // ========================================================================

  describe('getWorkLogStats', () => {
    it('should return aggregated work log statistics', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([
        {
          workedMinutes: 480,
          overtimeMinutes: 60,
          workDate: new Date('2025-01-15'),
          activityType: ActivityType.REFILL,
          status: WorkLogStatus.APPROVED,
        },
        {
          workedMinutes: 420,
          overtimeMinutes: 0,
          workDate: new Date('2025-01-16'),
          activityType: ActivityType.MAINTENANCE,
          status: WorkLogStatus.APPROVED,
        },
      ]);
      workLogRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getWorkLogStats(orgId, employeeId, new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result.totalWorkedHours).toBe(15);
      expect(result.totalOvertimeHours).toBe(1);
      expect(result.totalDays).toBe(2);
      expect(result.averageHoursPerDay).toBe(7.5);
    });

    it('should return zero averages when no data', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      workLogRepo.createQueryBuilder!.mockReturnValue(qb as any);

      const result = await service.getWorkLogStats(orgId);

      expect(result.totalWorkedHours).toBe(0);
      expect(result.totalDays).toBe(0);
      expect(result.averageHoursPerDay).toBe(0);
    });
  });

  describe('getAttendanceReport', () => {
    it('should return attendance data grouped by employee', async () => {
      workLogRepo.find!.mockResolvedValue([
        {
          employeeId: 'emp-1',
          workedMinutes: 480,
          overtimeMinutes: 0,
          clockIn: '08:30',
          workDate: new Date('2025-01-15'),
        },
        {
          employeeId: 'emp-1',
          workedMinutes: 420,
          overtimeMinutes: 60,
          clockIn: '09:30',
          workDate: new Date('2025-01-16'),
        },
      ]);
      timeOffRepo.find!.mockResolvedValue([
        { employeeId: 'emp-1', totalDays: 2, timeOffType: TimeOffType.VACATION },
      ]);

      const result = await service.getAttendanceReport(orgId, new Date('2025-01-01'), new Date('2025-01-31'));

      expect(result).toHaveLength(1);
      expect(result[0].employeeId).toBe('emp-1');
      expect(result[0].presentDays).toBe(2);
      expect(result[0].lateDays).toBe(1); // 09:30 is late
      expect(result[0].timeOffDays).toBe(2);
    });
  });
});
