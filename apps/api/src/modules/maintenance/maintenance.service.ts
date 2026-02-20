/**
 * Maintenance Service
 * Business logic for maintenance management
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  MaintenanceRequest,
  MaintenancePart,
  MaintenanceWorkLog,
  MaintenanceSchedule,
  MaintenanceStatus,
  MaintenanceType,
  MaintenancePriority,
  VALID_MAINTENANCE_TRANSITIONS,
} from './entities/maintenance.entity';
import {
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto,
  ApproveMaintenanceRequestDto,
  RejectMaintenanceRequestDto,
  AssignTechnicianDto,
  StartMaintenanceDto,
  CompleteMaintenanceDto,
  VerifyMaintenanceDto,
  MaintenanceQueryDto,
  CreateMaintenancePartDto,
  UpdateMaintenancePartDto,
  CreateMaintenanceWorkLogDto,
  UpdateMaintenanceWorkLogDto,
  CreateMaintenanceScheduleDto,
  UpdateMaintenanceScheduleDto,
  ScheduleQueryDto,
  MaintenanceStatsDto,
} from './dto/maintenance.dto';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly maintenanceRepository: Repository<MaintenanceRequest>,
    @InjectRepository(MaintenancePart)
    private readonly partRepository: Repository<MaintenancePart>,
    @InjectRepository(MaintenanceWorkLog)
    private readonly workLogRepository: Repository<MaintenanceWorkLog>,
    @InjectRepository(MaintenanceSchedule)
    private readonly scheduleRepository: Repository<MaintenanceSchedule>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ========================================================================
  // MAINTENANCE REQUEST CRUD
  // ========================================================================

  async create(
    organizationId: string,
    userId: string,
    dto: CreateMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    const request = this.maintenanceRepository.create({
      organizationId,
      createdByUserId: userId,
      ...dto,
      status: MaintenanceStatus.DRAFT,
    });

    // Calculate SLA due date based on priority
    request.slaDueDate = this.calculateSlaDueDate(dto.priority || MaintenancePriority.NORMAL);

    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.created', { request: saved });
    this.logger.log(`Maintenance request created: ${saved.requestNumber}`);

    return saved;
  }

  async findAll(
    organizationId: string,
    query: MaintenanceQueryDto,
  ): Promise<{ data: MaintenanceRequest[]; total: number; page: number; limit: number }> {
    const {
      status,
      statuses,
      maintenanceType,
      priority,
      machineId,
      technicianId,
      createdByUserId,
      startDate,
      endDate,
      overdueOnly,
      slaBreachedOnly,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.maintenanceRepository
      .createQueryBuilder('m')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.deletedAt IS NULL');

    // Filters
    if (status) {
      qb.andWhere('m.status = :status', { status });
    }
    if (statuses?.length) {
      qb.andWhere('m.status IN (:...statuses)', { statuses });
    }
    if (maintenanceType) {
      qb.andWhere('m.maintenanceType = :maintenanceType', { maintenanceType });
    }
    if (priority) {
      qb.andWhere('m.priority = :priority', { priority });
    }
    if (machineId) {
      qb.andWhere('m.machineId = :machineId', { machineId });
    }
    if (technicianId) {
      qb.andWhere('m.assignedTechnicianId = :technicianId', { technicianId });
    }
    if (createdByUserId) {
      qb.andWhere('m.createdByUserId = :createdByUserId', { createdByUserId });
    }
    if (startDate && endDate) {
      qb.andWhere('m.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }
    if (overdueOnly) {
      qb.andWhere('m.slaDueDate < NOW()')
        .andWhere('m.status NOT IN (:...completedStatuses)', {
          completedStatuses: [MaintenanceStatus.COMPLETED, MaintenanceStatus.VERIFIED, MaintenanceStatus.CANCELLED],
        });
    }
    if (slaBreachedOnly) {
      qb.andWhere('m.slaBreached = true');
    }
    if (search) {
      qb.andWhere('(m.title ILIKE :search OR m.requestNumber ILIKE :search OR m.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Sorting
    qb.orderBy(`m.${sortBy}`, sortOrder);

    // Pagination
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(organizationId: string, id: string): Promise<MaintenanceRequest> {
    const request = await this.maintenanceRepository.findOne({
      where: { id, organizationId },
      relations: ['parts', 'workLogs'],
    });

    if (!request) {
      throw new NotFoundException(`Maintenance request ${id} not found`);
    }

    return request;
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);

    if (request.status !== MaintenanceStatus.DRAFT) {
      throw new BadRequestException('Can only update draft requests');
    }

    Object.assign(request, dto);
    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.updated', { request: saved });
    return saved;
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const request = await this.findOne(organizationId, id);

    if (request.status !== MaintenanceStatus.DRAFT) {
      throw new BadRequestException('Can only delete draft requests');
    }

    await this.maintenanceRepository.softDelete(id);
    this.eventEmitter.emit('maintenance.deleted', { requestId: id });
  }

  // ========================================================================
  // WORKFLOW METHODS
  // ========================================================================

  private validateTransition(currentStatus: MaintenanceStatus, newStatus: MaintenanceStatus): void {
    const validTransitions = VALID_MAINTENANCE_TRANSITIONS[currentStatus];
    if (!validTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  async submit(organizationId: string, id: string, userId: string): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);
    this.validateTransition(request.status, MaintenanceStatus.SUBMITTED);

    request.status = MaintenanceStatus.SUBMITTED;
    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.submitted', { request: saved, userId });
    return saved;
  }

  async approve(
    organizationId: string,
    id: string,
    userId: string,
    dto: ApproveMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);
    this.validateTransition(request.status, MaintenanceStatus.APPROVED);

    request.status = MaintenanceStatus.APPROVED;
    request.approvedByUserId = userId;
    request.approvedAt = new Date();

    if (dto.estimatedCost !== undefined) {
      request.estimatedCost = dto.estimatedCost;
    }

    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.approved', { request: saved, userId });
    return saved;
  }

  async reject(
    organizationId: string,
    id: string,
    userId: string,
    dto: RejectMaintenanceRequestDto,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);
    this.validateTransition(request.status, MaintenanceStatus.REJECTED);

    request.status = MaintenanceStatus.REJECTED;
    request.rejectionReason = dto.reason;

    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.rejected', { request: saved, userId, reason: dto.reason });
    return saved;
  }

  async assignTechnician(
    organizationId: string,
    id: string,
    userId: string,
    dto: AssignTechnicianDto,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);

    request.assignedTechnicianId = dto.technicianId;
    if (dto.scheduledDate) {
      request.scheduledDate = dto.scheduledDate;
    }

    if (request.status === MaintenanceStatus.APPROVED) {
      request.status = MaintenanceStatus.SCHEDULED;
    }

    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.assigned', { request: saved, technicianId: dto.technicianId });
    return saved;
  }

  async start(
    organizationId: string,
    id: string,
    userId: string,
    dto: StartMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);
    this.validateTransition(request.status, MaintenanceStatus.IN_PROGRESS);

    request.status = MaintenanceStatus.IN_PROGRESS;
    request.startedAt = new Date();

    if (dto.downtimeStart) {
      request.downtimeStart = dto.downtimeStart;
    }

    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.started', { request: saved, userId });
    return saved;
  }

  async setAwaitingParts(
    organizationId: string,
    id: string,
    userId: string,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);
    this.validateTransition(request.status, MaintenanceStatus.AWAITING_PARTS);

    request.status = MaintenanceStatus.AWAITING_PARTS;
    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.awaiting_parts', { request: saved, userId });
    return saved;
  }

  async complete(
    organizationId: string,
    id: string,
    userId: string,
    dto: CompleteMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);
    this.validateTransition(request.status, MaintenanceStatus.COMPLETED);

    request.status = MaintenanceStatus.COMPLETED;
    request.completedAt = new Date();
    request.completionNotes = dto.completionNotes;
    request.rootCause = dto.rootCause;
    request.actionsTaken = dto.actionsTaken;
    request.recommendations = dto.recommendations;

    // Calculate actual duration
    if (request.startedAt) {
      request.actualDuration = Math.round(
        (request.completedAt.getTime() - request.startedAt.getTime()) / 60000,
      );
    }

    // Calculate downtime
    if (dto.downtimeEnd) {
      request.downtimeEnd = dto.downtimeEnd;
    } else if (request.downtimeStart) {
      request.downtimeEnd = new Date();
    }

    if (request.downtimeStart && request.downtimeEnd) {
      request.downtimeMinutes = Math.round(
        (new Date(request.downtimeEnd).getTime() - new Date(request.downtimeStart).getTime()) / 60000,
      );
    }

    // Calculate total cost
    await this.calculateTotalCost(request);

    // Check SLA breach
    if (request.slaDueDate && new Date() > new Date(request.slaDueDate)) {
      request.slaBreached = true;
    }

    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.completed', { request: saved, userId });
    return saved;
  }

  async verify(
    organizationId: string,
    id: string,
    userId: string,
    dto: VerifyMaintenanceDto,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);

    if (dto.passed) {
      this.validateTransition(request.status, MaintenanceStatus.VERIFIED);
      request.status = MaintenanceStatus.VERIFIED;
      request.verifiedByUserId = userId;
      request.verifiedAt = new Date();
    } else {
      // Send back for rework
      this.validateTransition(request.status, MaintenanceStatus.IN_PROGRESS);
      request.status = MaintenanceStatus.IN_PROGRESS;
    }

    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.verified', { request: saved, userId, passed: dto.passed });
    return saved;
  }

  async cancel(
    organizationId: string,
    id: string,
    userId: string,
    reason: string,
  ): Promise<MaintenanceRequest> {
    const request = await this.findOne(organizationId, id);
    this.validateTransition(request.status, MaintenanceStatus.CANCELLED);

    request.status = MaintenanceStatus.CANCELLED;
    request.rejectionReason = reason;

    const saved = await this.maintenanceRepository.save(request);

    this.eventEmitter.emit('maintenance.cancelled', { request: saved, userId, reason });
    return saved;
  }

  // ========================================================================
  // PARTS MANAGEMENT
  // ========================================================================

  async addPart(
    organizationId: string,
    requestId: string,
    dto: CreateMaintenancePartDto,
  ): Promise<MaintenancePart> {
    const request = await this.findOne(organizationId, requestId);

    const part = this.partRepository.create({
      maintenanceRequestId: requestId,
      ...dto,
      totalPrice: dto.quantityNeeded * dto.unitPrice,
    });

    const saved = await this.partRepository.save(part);

    // Recalculate total cost
    await this.calculateTotalCost(request);
    await this.maintenanceRepository.save(request);

    return saved;
  }

  async updatePart(
    organizationId: string,
    requestId: string,
    partId: string,
    dto: UpdateMaintenancePartDto,
  ): Promise<MaintenancePart> {
    await this.findOne(organizationId, requestId);

    const part = await this.partRepository.findOne({
      where: { id: partId, maintenanceRequestId: requestId },
    });

    if (!part) {
      throw new NotFoundException(`Part ${partId} not found`);
    }

    Object.assign(part, dto);

    if (dto.quantityUsed !== undefined) {
      part.totalPrice = part.quantityUsed * Number(part.unitPrice);
    }

    return this.partRepository.save(part);
  }

  async removePart(
    organizationId: string,
    requestId: string,
    partId: string,
  ): Promise<void> {
    const request = await this.findOne(organizationId, requestId);

    await this.partRepository.delete({ id: partId, maintenanceRequestId: requestId });

    // Recalculate total cost
    await this.calculateTotalCost(request);
    await this.maintenanceRepository.save(request);
  }

  // ========================================================================
  // WORK LOG MANAGEMENT
  // ========================================================================

  async addWorkLog(
    organizationId: string,
    requestId: string,
    technicianId: string,
    dto: CreateMaintenanceWorkLogDto,
  ): Promise<MaintenanceWorkLog> {
    await this.findOne(organizationId, requestId);

    // Calculate duration
    const [startHour, startMin] = dto.startTime.split(':').map(Number);
    const [endHour, endMin] = dto.endTime.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

    if (durationMinutes <= 0) {
      throw new BadRequestException('End time must be after start time');
    }

    const laborCost = dto.hourlyRate ? (dto.hourlyRate / 60) * durationMinutes : undefined;

    const workLog = this.workLogRepository.create({
      maintenanceRequestId: requestId,
      technicianId,
      ...dto,
      durationMinutes,
      laborCost,
    } as Partial<MaintenanceWorkLog>);

    return this.workLogRepository.save(workLog);
  }

  async updateWorkLog(
    organizationId: string,
    requestId: string,
    logId: string,
    dto: UpdateMaintenanceWorkLogDto,
  ): Promise<MaintenanceWorkLog> {
    await this.findOne(organizationId, requestId);

    const workLog = await this.workLogRepository.findOne({
      where: { id: logId, maintenanceRequestId: requestId },
    });

    if (!workLog) {
      throw new NotFoundException(`Work log ${logId} not found`);
    }

    Object.assign(workLog, dto);

    // Recalculate if times changed
    if (dto.startTime || dto.endTime) {
      const startTime = dto.startTime || workLog.startTime;
      const endTime = dto.endTime || workLog.endTime;
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      workLog.durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }

    if (dto.hourlyRate !== undefined || dto.startTime || dto.endTime) {
      const hourlyRate = dto.hourlyRate ?? workLog.hourlyRate;
      workLog.laborCost = hourlyRate ? (hourlyRate / 60) * workLog.durationMinutes : undefined;
    }

    return this.workLogRepository.save(workLog);
  }

  async removeWorkLog(
    organizationId: string,
    requestId: string,
    logId: string,
  ): Promise<void> {
    await this.findOne(organizationId, requestId);
    await this.workLogRepository.delete({ id: logId, maintenanceRequestId: requestId });
  }

  // ========================================================================
  // SCHEDULE MANAGEMENT
  // ========================================================================

  async createSchedule(
    organizationId: string,
    userId: string,
    dto: CreateMaintenanceScheduleDto,
  ): Promise<MaintenanceSchedule> {
    const schedule = this.scheduleRepository.create({
      organizationId,
      createdByUserId: userId,
      ...dto,
    });

    // Calculate next due date if not provided
    if (!schedule.nextDueDate) {
      schedule.nextDueDate = this.calculateNextDueDate(schedule);
    }

    return this.scheduleRepository.save(schedule);
  }

  async findAllSchedules(
    organizationId: string,
    query: ScheduleQueryDto,
  ): Promise<{ data: MaintenanceSchedule[]; total: number }> {
    const { machineId, maintenanceType, activeOnly, dueWithinDays, page = 1, limit = 20 } = query;

    const qb = this.scheduleRepository
      .createQueryBuilder('s')
      .where('s.organizationId = :organizationId', { organizationId })
      .andWhere('s.deletedAt IS NULL');

    if (machineId) {
      qb.andWhere('(s.machineId = :machineId OR s.machineId IS NULL)', { machineId });
    }
    if (maintenanceType) {
      qb.andWhere('s.maintenanceType = :maintenanceType', { maintenanceType });
    }
    if (activeOnly) {
      qb.andWhere('s.isActive = true');
    }
    if (dueWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + dueWithinDays);
      qb.andWhere('s.nextDueDate <= :futureDate', { futureDate });
    }

    const [data, total] = await qb
      .orderBy('s.nextDueDate', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async updateSchedule(
    organizationId: string,
    id: string,
    dto: UpdateMaintenanceScheduleDto,
  ): Promise<MaintenanceSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, organizationId },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule ${id} not found`);
    }

    Object.assign(schedule, dto);

    // Recalculate next due date if frequency changed
    if (dto.frequencyType || dto.frequencyValue) {
      schedule.nextDueDate = this.calculateNextDueDate(schedule);
    }

    return this.scheduleRepository.save(schedule);
  }

  async deleteSchedule(organizationId: string, id: string): Promise<void> {
    await this.scheduleRepository.softDelete({ id, organizationId });
  }

  // ========================================================================
  // STATISTICS
  // ========================================================================

  async getStats(organizationId: string, startDate?: Date, endDate?: Date): Promise<MaintenanceStatsDto> {
    const qb = this.maintenanceRepository
      .createQueryBuilder('m')
      .where('m.organizationId = :organizationId', { organizationId })
      .andWhere('m.deletedAt IS NULL');

    if (startDate && endDate) {
      qb.andWhere('m.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const requests = await qb.getMany();

    const byStatus: Record<MaintenanceStatus, number> = {} as Record<MaintenanceStatus, number>;
    const byType: Record<MaintenanceType, number> = {} as Record<MaintenanceType, number>;
    const byPriority: Record<MaintenancePriority, number> = {} as Record<MaintenancePriority, number>;

    Object.values(MaintenanceStatus).forEach(s => byStatus[s] = 0);
    Object.values(MaintenanceType).forEach(t => byType[t] = 0);
    Object.values(MaintenancePriority).forEach(p => byPriority[p] = 0);

    let totalCost = 0;
    let totalDowntime = 0;
    let completionTimes: number[] = [];
    let overdue = 0;
    let slaBreached = 0;

    for (const req of requests) {
      byStatus[req.status]++;
      byType[req.maintenanceType]++;
      byPriority[req.priority]++;

      totalCost += Number(req.totalCost) || 0;
      totalDowntime += req.downtimeMinutes || 0;

      if (req.actualDuration) {
        completionTimes.push(req.actualDuration);
      }

      if (req.isOverdue) overdue++;
      if (req.slaBreached) slaBreached++;
    }

    const avgCompletionTime = completionTimes.length
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    return {
      total: requests.length,
      byStatus,
      byType,
      byPriority,
      overdue,
      slaBreached,
      avgCompletionTime: Math.round(avgCompletionTime),
      totalCost,
      totalDowntimeMinutes: totalDowntime,
    };
  }

  // ========================================================================
  // CRON JOBS
  // ========================================================================

  @Cron(CronExpression.EVERY_HOUR)
  async checkScheduledMaintenance(): Promise<void> {
    this.logger.log('Checking scheduled maintenance...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueSchedules = await this.scheduleRepository.find({
      where: {
        isActive: true,
        autoCreateRequest: true,
        nextDueDate: LessThan(today),
      },
    });

    for (const schedule of dueSchedules) {
      try {
        // Create maintenance request
        const request = await this.create(
          schedule.organizationId,
          schedule.createdByUserId,
          {
            maintenanceType: schedule.maintenanceType,
            priority: MaintenancePriority.NORMAL,
            machineId: schedule.machineId || '',
            title: `Scheduled: ${schedule.name}`,
            description: schedule.description,
            estimatedDuration: schedule.estimatedDuration,
            estimatedCost: schedule.estimatedCost ? Number(schedule.estimatedCost) : undefined,
            maintenanceScheduleId: schedule.id,
          },
        );

        // Update schedule
        schedule.lastExecutedDate = today;
        schedule.nextDueDate = this.calculateNextDueDate(schedule);
        schedule.timesExecuted++;
        await this.scheduleRepository.save(schedule);

        this.logger.log(`Created maintenance request ${request.requestNumber} from schedule ${schedule.name}`);
      } catch (error: unknown) {
        this.logger.error(`Failed to create request from schedule ${schedule.id}`, error instanceof Error ? error.stack : error);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkSlaBreaches(): Promise<void> {
    this.logger.log('Checking SLA breaches...');

    const now = new Date();
    const overdueRequests = await this.maintenanceRepository.find({
      where: {
        slaDueDate: LessThan(now),
        slaBreached: false,
        status: In([
          MaintenanceStatus.SUBMITTED,
          MaintenanceStatus.APPROVED,
          MaintenanceStatus.SCHEDULED,
          MaintenanceStatus.IN_PROGRESS,
          MaintenanceStatus.AWAITING_PARTS,
        ]),
      },
    });

    for (const request of overdueRequests) {
      request.slaBreached = true;
      await this.maintenanceRepository.save(request);

      this.eventEmitter.emit('maintenance.sla_breached', { request });
    }

    this.logger.log(`Marked ${overdueRequests.length} requests as SLA breached`);
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private calculateSlaDueDate(priority: MaintenancePriority): Date {
    const now = new Date();
    const slaHours = {
      [MaintenancePriority.CRITICAL]: 4,
      [MaintenancePriority.HIGH]: 24,
      [MaintenancePriority.NORMAL]: 72,
      [MaintenancePriority.LOW]: 168, // 7 days
    };

    now.setHours(now.getHours() + slaHours[priority]);
    return now;
  }

  private async calculateTotalCost(request: MaintenanceRequest): Promise<void> {
    // Get parts cost
    const parts = await this.partRepository.find({
      where: { maintenanceRequestId: request.id },
    });
    request.partsCost = parts.reduce((sum, p) => sum + Number(p.totalPrice), 0);

    // Get labor cost
    const workLogs = await this.workLogRepository.find({
      where: { maintenanceRequestId: request.id, isBillable: true },
    });
    request.laborCost = workLogs.reduce((sum, w) => sum + (Number(w.laborCost) || 0), 0);

    request.totalCost = Number(request.partsCost) + Number(request.laborCost);
  }

  private calculateNextDueDate(schedule: MaintenanceSchedule): Date {
    const baseDate = schedule.lastExecutedDate ? new Date(schedule.lastExecutedDate) : new Date();
    const nextDate = new Date(baseDate);

    switch (schedule.frequencyType) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + schedule.frequencyValue);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + schedule.frequencyValue * 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + schedule.frequencyValue);
        if (schedule.dayOfMonth) {
          nextDate.setDate(schedule.dayOfMonth);
        }
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + schedule.frequencyValue * 3);
        break;
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + schedule.frequencyValue);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 30); // Default to 30 days
    }

    return nextDate;
  }
}
