import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import {
  Machine,
  MachineSlot,
  MachineLocationHistory,
  MachineComponent,
  MachineErrorLog,
  MachineMaintenanceSchedule,
  MachineStatus,
  ComponentStatus,
  MaintenanceStatus,
  MoveReason,
} from './entities/machine.entity';
import { CreateMachineSlotDto, UpdateMachineSlotDto, RefillSlotDto } from './dto/machine-slot.dto';
import { InstallComponentDto } from './dto/machine-component.dto';
import {
  MoveMachineDto,
  LogErrorDto,
  ResolveErrorDto,
  ScheduleMaintenanceDto,
  CompleteMaintenanceDto,
} from './dto/machine-location.dto';

@Injectable()
export class MachinesService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,

    @InjectRepository(MachineSlot)
    private readonly slotRepository: Repository<MachineSlot>,

    @InjectRepository(MachineLocationHistory)
    private readonly locationHistoryRepository: Repository<MachineLocationHistory>,

    @InjectRepository(MachineComponent)
    private readonly componentRepository: Repository<MachineComponent>,

    @InjectRepository(MachineErrorLog)
    private readonly errorLogRepository: Repository<MachineErrorLog>,

    @InjectRepository(MachineMaintenanceSchedule)
    private readonly maintenanceRepository: Repository<MachineMaintenanceSchedule>,
  ) {}

  // ============================================================================
  // MACHINE CRUD
  // ============================================================================

  async create(data: Partial<Machine>): Promise<Machine> {
    const machine = this.machineRepository.create(data);
    return this.machineRepository.save(machine);
  }

  async findAll(
    organizationId?: string,
    filters?: {
      status?: MachineStatus;
      type?: string;
      locationId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const {
      status,
      type,
      locationId,
      search,
      page = 1,
      limit: rawLimit = 20,
    } = filters || {};
    const limit = Math.min(rawLimit, 100);

    const query = this.machineRepository.createQueryBuilder('machine');

    if (organizationId) {
      query.where('machine.organizationId = :organizationId', {
        organizationId,
      });
    }

    if (status) {
      query.andWhere('machine.status = :status', { status });
    }

    if (type) {
      query.andWhere('machine.type = :type', { type });
    }

    if (locationId) {
      query.andWhere('machine.locationId = :locationId', { locationId });
    }

    if (search) {
      query.andWhere(
        '(machine.name ILIKE :search OR machine.serialNumber ILIKE :search OR machine.machineNumber ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy('machine.name', 'ASC');
    query.skip((page - 1) * limit);
    query.take(limit);

    // Select only needed columns for list view (exclude heavy JSONB fields like telemetry)
    query.select([
      'machine.id',
      'machine.name',
      'machine.machineNumber',
      'machine.serialNumber',
      'machine.type',
      'machine.status',
      'machine.connectionStatus',
      'machine.locationId',
      'machine.address',
      'machine.latitude',
      'machine.longitude',
      'machine.lastRefillDate',
      'machine.lastMaintenanceDate',
      'machine.created_at',
      'machine.updated_at',
    ]);

    const data = await query.getMany();

    return {
      data,
      total,
      page,
      limit: Math.min(limit, 100),
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Machine | null> {
    return this.machineRepository.findOne({
      where: { id },
      relations: ['slots', 'slots.product'],
    });
  }

  async findBySerialNumber(serialNumber: string): Promise<Machine | null> {
    return this.machineRepository.findOne({
      where: { serialNumber },
      relations: ['slots'],
    });
  }

  async update(id: string, data: Partial<Machine>): Promise<Machine> {
    const machine = await this.findById(id);
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    Object.assign(machine, data);
    return this.machineRepository.save(machine);
  }

  async updateStatus(id: string, status: MachineStatus): Promise<Machine> {
    return this.update(id, { status });
  }

  async updateTelemetry(
    id: string,
    telemetry: Partial<Machine['telemetry']>,
  ): Promise<Machine> {
    const machine = await this.findById(id);
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    machine.telemetry = { ...machine.telemetry, ...telemetry };
    return this.machineRepository.save(machine);
  }

  async remove(id: string): Promise<void> {
    const machine = await this.findById(id);
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    await this.machineRepository.softDelete(id);
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.machineRepository.count({ where: { organizationId } });
  }

  async getStatsByOrganization(organizationId: string): Promise<any> {
    const stats = await this.machineRepository
      .createQueryBuilder('machine')
      .select('machine.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('machine.organizationId = :organizationId', { organizationId })
      .groupBy('machine.status')
      .getRawMany();

    return stats.reduce(
      (acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  // ============================================================================
  // MAP DATA
  // ============================================================================

  async getMachinesForMap(organizationId: string) {
    return this.machineRepository
      .createQueryBuilder('machine')
      .select([
        'machine.id',
        'machine.name',
        'machine.machineNumber',
        'machine.latitude',
        'machine.longitude',
        'machine.address',
        'machine.status',
        'machine.type',
        'machine.connectionStatus',
      ])
      .where('machine.organizationId = :organizationId', { organizationId })
      .andWhere('machine.latitude IS NOT NULL')
      .andWhere('machine.longitude IS NOT NULL')
      .orderBy('machine.name', 'ASC')
      .getMany();
  }

  // ============================================================================
  // SLOT MANAGEMENT
  // ============================================================================

  async getSlots(machineId: string): Promise<MachineSlot[]> {
    await this.ensureMachineExists(machineId);

    return this.slotRepository.find({
      where: { machineId },
      order: { slotNumber: 'ASC' },
    });
  }

  async createSlot(
    machineId: string,
    dto: CreateMachineSlotDto,
    userId?: string,
  ): Promise<MachineSlot> {
    await this.ensureMachineExists(machineId);

    // Check for duplicate slot number on this machine
    const existing = await this.slotRepository.findOne({
      where: { machineId, slotNumber: dto.slotNumber },
    });
    if (existing) {
      throw new BadRequestException(
        `Slot ${dto.slotNumber} already exists on this machine`,
      );
    }

    const slot = this.slotRepository.create({
      machineId,
      slotNumber: dto.slotNumber,
      productId: dto.productId,
      capacity: dto.capacity,
      currentQuantity: dto.currentQuantity ?? 0,
      price: dto.price,
      costPrice: dto.costPrice,
      minQuantity: dto.minQuantity ?? 0,
      created_by_id: userId,
    });

    return this.slotRepository.save(slot);
  }

  async updateSlot(
    slotId: string,
    dto: UpdateMachineSlotDto,
    userId?: string,
  ): Promise<MachineSlot> {
    const slot = await this.slotRepository.findOne({
      where: { id: slotId },
    });
    if (!slot) {
      throw new NotFoundException(`Slot with ID ${slotId} not found`);
    }

    Object.assign(slot, dto);
    slot.updated_by_id = userId ?? slot.updated_by_id;

    return this.slotRepository.save(slot);
  }

  async refillSlot(
    slotId: string,
    dto: RefillSlotDto,
    userId?: string,
  ): Promise<MachineSlot> {
    const slot = await this.slotRepository.findOne({
      where: { id: slotId },
    });
    if (!slot) {
      throw new NotFoundException(`Slot with ID ${slotId} not found`);
    }

    const newQuantity = slot.currentQuantity + dto.quantity;
    if (newQuantity > slot.capacity) {
      throw new BadRequestException(
        `Refill would exceed slot capacity. Current: ${slot.currentQuantity}, Adding: ${dto.quantity}, Capacity: ${slot.capacity}`,
      );
    }

    slot.currentQuantity = newQuantity;
    slot.lastRefilledAt = new Date();
    slot.updated_by_id = userId ?? slot.updated_by_id;

    const savedSlot = await this.slotRepository.save(slot);

    // Update machine lastRefillDate
    await this.machineRepository.update(slot.machineId, {
      lastRefillDate: new Date(),
    });

    return savedSlot;
  }

  // ============================================================================
  // LOCATION HISTORY
  // ============================================================================

  async moveToLocation(
    machineId: string,
    dto: MoveMachineDto,
    userId: string,
  ): Promise<MachineLocationHistory> {
    const machine = await this.ensureMachineExists(machineId);

    // Create location history record
    const history = this.locationHistoryRepository.create({
      machineId,
      fromLocationId: machine.locationId,
      toLocationId: dto.toLocationId,
      movedByUserId: userId,
      reason: dto.reason ?? MoveReason.RELOCATION,
      notes: dto.notes,
      movedAt: new Date(),
      created_by_id: userId,
    });

    const savedHistory = await this.locationHistoryRepository.save(history);

    // Update the machine's current location
    const updateData: Partial<Machine> = {
      locationId: dto.toLocationId,
    };
    if (dto.latitude !== undefined) {
      updateData.latitude = dto.latitude;
    }
    if (dto.longitude !== undefined) {
      updateData.longitude = dto.longitude;
    }
    if (dto.address !== undefined) {
      updateData.address = dto.address;
    }

    await this.machineRepository.update(machineId, updateData);

    return savedHistory;
  }

  async getLocationHistory(
    machineId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: MachineLocationHistory[]; total: number }> {
    await this.ensureMachineExists(machineId);

    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.locationHistoryRepository.findAndCount({
      where: { machineId },
      order: { movedAt: 'DESC' },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total };
  }

  // ============================================================================
  // COMPONENT TRACKING
  // ============================================================================

  async getComponents(machineId: string): Promise<MachineComponent[]> {
    await this.ensureMachineExists(machineId);

    return this.componentRepository.find({
      where: { machineId },
      order: { created_at: 'DESC' },
    });
  }

  async installComponent(
    machineId: string,
    dto: InstallComponentDto,
    userId: string,
  ): Promise<MachineComponent> {
    await this.ensureMachineExists(machineId);

    const component = this.componentRepository.create({
      machineId,
      componentType: dto.componentType,
      name: dto.name,
      serialNumber: dto.serialNumber,
      manufacturer: dto.manufacturer,
      model: dto.model,
      purchasePrice: dto.purchasePrice,
      warrantyUntil: dto.warrantyUntil,
      expectedLifeHours: dto.expectedLifeHours,
      status: ComponentStatus.INSTALLED,
      installedAt: new Date(),
      installedByUserId: userId,
      created_by_id: userId,
    });

    return this.componentRepository.save(component);
  }

  async removeComponent(
    componentId: string,
    userId: string,
  ): Promise<MachineComponent> {
    const component = await this.componentRepository.findOne({
      where: { id: componentId },
    });
    if (!component) {
      throw new NotFoundException(
        `Component with ID ${componentId} not found`,
      );
    }

    component.status = ComponentStatus.REMOVED;
    component.machineId = null;
    component.updated_by_id = userId;

    return this.componentRepository.save(component);
  }

  // ============================================================================
  // ERROR LOG
  // ============================================================================

  async logError(
    machineId: string,
    dto: LogErrorDto,
    userId?: string,
  ): Promise<MachineErrorLog> {
    await this.ensureMachineExists(machineId);

    const errorLog = this.errorLogRepository.create({
      machineId,
      errorCode: dto.errorCode,
      message: dto.message,
      severity: dto.severity as any ?? 'error',
      context: dto.context ?? {},
      occurredAt: new Date(),
      created_by_id: userId,
    });

    const savedError = await this.errorLogRepository.save(errorLog);

    // If severity is error or critical, update machine status
    if (dto.severity === 'error' || dto.severity === 'critical') {
      await this.machineRepository.update(machineId, {
        status: MachineStatus.ERROR,
      });
    }

    return savedError;
  }

  async resolveError(
    errorId: string,
    dto: ResolveErrorDto,
    userId: string,
  ): Promise<MachineErrorLog> {
    const errorLog = await this.errorLogRepository.findOne({
      where: { id: errorId },
    });
    if (!errorLog) {
      throw new NotFoundException(`Error log with ID ${errorId} not found`);
    }

    if (errorLog.resolvedAt) {
      throw new BadRequestException('This error has already been resolved');
    }

    errorLog.resolvedAt = new Date();
    errorLog.resolvedByUserId = userId;
    errorLog.resolution = dto.resolution;
    errorLog.updated_by_id = userId;

    const savedError = await this.errorLogRepository.save(errorLog);

    // Check if there are any remaining unresolved errors for this machine
    const unresolvedCount = await this.errorLogRepository.count({
      where: {
        machineId: errorLog.machineId,
        resolvedAt: null as any,
      },
    });

    // If no more unresolved errors, set machine back to active
    if (unresolvedCount === 0) {
      const machine = await this.machineRepository.findOne({
        where: { id: errorLog.machineId },
      });
      if (machine && machine.status === MachineStatus.ERROR) {
        await this.machineRepository.update(errorLog.machineId, {
          status: MachineStatus.ACTIVE,
        });
      }
    }

    return savedError;
  }

  async getErrorHistory(
    machineId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: MachineErrorLog[]; total: number }> {
    await this.ensureMachineExists(machineId);

    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.errorLogRepository.findAndCount({
      where: { machineId },
      order: { occurredAt: 'DESC' },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total };
  }

  // ============================================================================
  // MAINTENANCE SCHEDULE
  // ============================================================================

  async scheduleMaintenance(
    machineId: string,
    dto: ScheduleMaintenanceDto,
    userId: string,
  ): Promise<MachineMaintenanceSchedule> {
    await this.ensureMachineExists(machineId);

    const schedule = this.maintenanceRepository.create({
      machineId,
      maintenanceType: dto.maintenanceType as any,
      scheduledDate: dto.scheduledDate,
      assignedToUserId: dto.assignedToUserId,
      description: dto.description,
      estimatedDurationMinutes: dto.estimatedDurationMinutes,
      estimatedCost: dto.estimatedCost,
      repeatIntervalDays: dto.repeatIntervalDays,
      status: MaintenanceStatus.SCHEDULED,
      created_by_id: userId,
    });

    return this.maintenanceRepository.save(schedule);
  }

  async getUpcomingMaintenance(
    machineId: string,
  ): Promise<MachineMaintenanceSchedule[]> {
    await this.ensureMachineExists(machineId);

    return this.maintenanceRepository.find({
      where: {
        machineId,
        status: MaintenanceStatus.SCHEDULED,
      },
      order: { scheduledDate: 'ASC' },
    });
  }

  async completeMaintenance(
    scheduleId: string,
    dto: CompleteMaintenanceDto,
    userId: string,
  ): Promise<MachineMaintenanceSchedule> {
    const schedule = await this.maintenanceRepository.findOne({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new NotFoundException(
        `Maintenance schedule with ID ${scheduleId} not found`,
      );
    }

    if (schedule.status === MaintenanceStatus.COMPLETED) {
      throw new BadRequestException(
        'This maintenance has already been completed',
      );
    }

    schedule.status = MaintenanceStatus.COMPLETED;
    schedule.completedDate = new Date();
    schedule.completedByUserId = userId;
    schedule.notes = dto.notes ?? schedule.notes;
    schedule.actualDurationMinutes =
      dto.actualDurationMinutes ?? schedule.actualDurationMinutes;
    schedule.actualCost = dto.actualCost ?? schedule.actualCost;
    schedule.updated_by_id = userId;

    const savedSchedule = await this.maintenanceRepository.save(schedule);

    // Update machine maintenance dates
    await this.machineRepository.update(schedule.machineId, {
      lastMaintenanceDate: new Date(),
    });

    // If recurring, create the next scheduled maintenance
    if (schedule.repeatIntervalDays && schedule.repeatIntervalDays > 0) {
      const nextDate = new Date(schedule.scheduledDate);
      nextDate.setDate(nextDate.getDate() + schedule.repeatIntervalDays);

      const nextSchedule = this.maintenanceRepository.create({
        machineId: schedule.machineId,
        maintenanceType: schedule.maintenanceType,
        scheduledDate: nextDate,
        assignedToUserId: schedule.assignedToUserId,
        description: schedule.description,
        estimatedDurationMinutes: schedule.estimatedDurationMinutes,
        estimatedCost: schedule.estimatedCost,
        repeatIntervalDays: schedule.repeatIntervalDays,
        status: MaintenanceStatus.SCHEDULED,
        created_by_id: userId,
      });

      const savedNext = await this.maintenanceRepository.save(nextSchedule);

      // Link current schedule to the next one
      savedSchedule.nextScheduleId = savedNext.id;
      await this.maintenanceRepository.save(savedSchedule);

      // Update machine nextMaintenanceDate
      await this.machineRepository.update(schedule.machineId, {
        nextMaintenanceDate: nextDate,
      });
    }

    return savedSchedule;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async ensureMachineExists(machineId: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
    });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${machineId} not found`);
    }
    return machine;
  }
}
