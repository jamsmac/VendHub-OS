import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";

let QRCode:
  | {
      toDataURL: (
        data: string,
        opts?: Record<string, unknown>,
      ) => Promise<string>;
    }
  | undefined;
try {
  QRCode = require("qrcode");
} catch {
  /* qrcode not installed */
}
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Repository, In } from "typeorm";
import {
  WriteoffJobData,
  WriteoffJobResult,
} from "./processors/writeoff.processor";
import {
  Machine,
  MachineSlot,
  MachineLocationHistory,
  MachineComponent,
  MachineErrorLog,
  MachineMaintenanceSchedule,
  MachineStatus,
  MachineConnectionStatus,
  DepreciationMethod,
  ComponentStatus,
  MaintenanceStatus,
  MoveReason,
  ErrorSeverity,
  MaintenanceType,
} from "./entities/machine.entity";
import {
  CreateMachineSlotDto,
  UpdateMachineSlotDto,
  RefillSlotDto,
} from "./dto/machine-slot.dto";
import { InstallComponentDto } from "./dto/machine-component.dto";
import {
  MoveMachineDto,
  LogErrorDto,
  ResolveErrorDto,
  ScheduleMaintenanceDto,
  CompleteMaintenanceDto,
} from "./dto/machine-location.dto";

@Injectable()
export class MachinesService {
  private readonly logger = new Logger(MachinesService.name);

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

    @InjectQueue("machine-writeoff")
    private readonly writeoffQueue: Queue<WriteoffJobData, WriteoffJobResult>,
  ) {}

  // ============================================================================
  // MACHINE CRUD
  // ============================================================================

  async create(data: Partial<Machine>): Promise<Machine> {
    // Check machineNumber uniqueness within organization
    if (data.machineNumber && data.organizationId) {
      const existing = await this.machineRepository.findOne({
        where: {
          machineNumber: data.machineNumber,
          organizationId: data.organizationId,
        },
      });
      if (existing) {
        throw new ConflictException(
          `Machine with number ${data.machineNumber} already exists`,
        );
      }
    }

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

    const query = this.machineRepository.createQueryBuilder("machine");

    if (organizationId) {
      query.where("machine.organizationId = :organizationId", {
        organizationId,
      });
    }

    if (status) {
      query.andWhere("machine.status = :status", { status });
    }

    if (type) {
      query.andWhere("machine.type = :type", { type });
    }

    if (locationId) {
      query.andWhere("machine.locationId = :locationId", { locationId });
    }

    if (search) {
      query.andWhere(
        "(machine.name ILIKE :search OR machine.serialNumber ILIKE :search OR machine.machineNumber ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const total = await query.getCount();

    query.orderBy("machine.name", "ASC");
    query.skip((page - 1) * limit);
    query.take(limit);

    // Select only needed columns for list view (exclude heavy JSONB fields like telemetry)
    query.select([
      "machine.id",
      "machine.name",
      "machine.machineNumber",
      "machine.serialNumber",
      "machine.type",
      "machine.status",
      "machine.connectionStatus",
      "machine.locationId",
      "machine.address",
      "machine.latitude",
      "machine.longitude",
      "machine.lastRefillDate",
      "machine.lastMaintenanceDate",
      "machine.createdAt",
      "machine.updatedAt",
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

  async findById(id: string, organizationId?: string): Promise<Machine | null> {
    const where: Record<string, string> = { id };
    if (organizationId) where.organizationId = organizationId;
    return this.machineRepository.findOne({
      where,
      relations: ["slots", "slots.product"],
    });
  }

  async findBySerialNumber(serialNumber: string): Promise<Machine | null> {
    return this.machineRepository.findOne({
      where: { serialNumber },
      relations: ["slots"],
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
    telemetry: Partial<Machine["telemetry"]>,
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

  async getStatsByOrganization(
    organizationId: string,
  ): Promise<Record<string, number>> {
    const stats = await this.machineRepository
      .createQueryBuilder("machine")
      .select("machine.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("machine.organizationId = :organizationId", { organizationId })
      .groupBy("machine.status")
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
      .createQueryBuilder("machine")
      .select([
        "machine.id",
        "machine.name",
        "machine.machineNumber",
        "machine.latitude",
        "machine.longitude",
        "machine.address",
        "machine.status",
        "machine.type",
        "machine.connectionStatus",
      ])
      .where("machine.organizationId = :organizationId", { organizationId })
      .andWhere("machine.latitude IS NOT NULL")
      .andWhere("machine.longitude IS NOT NULL")
      .orderBy("machine.name", "ASC")
      .getMany();
  }

  // ============================================================================
  // SLOT MANAGEMENT
  // ============================================================================

  async getSlots(machineId: string): Promise<MachineSlot[]> {
    await this.ensureMachineExists(machineId);

    return this.slotRepository.find({
      where: { machineId },
      order: { slotNumber: "ASC" },
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
      createdById: userId,
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
    slot.updatedById = userId ?? slot.updatedById;

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
    slot.updatedById = userId ?? slot.updatedById;

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
      createdById: userId,
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

    await this.machineRepository.update(
      machineId,
      updateData as Record<string, unknown>,
    );

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
      order: { movedAt: "DESC" },
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
      order: { createdAt: "DESC" },
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
      createdById: userId,
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
      throw new NotFoundException(`Component with ID ${componentId} not found`);
    }

    component.status = ComponentStatus.REMOVED;
    component.machineId = null;
    component.updatedById = userId;

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
      severity: (dto.severity as ErrorSeverity) ?? ErrorSeverity.ERROR,
      context: dto.context ?? {},
      occurredAt: new Date(),
      createdById: userId,
    });

    const savedError = await this.errorLogRepository.save(errorLog);

    // If severity is error or critical, update machine status
    if (dto.severity === "error" || dto.severity === "critical") {
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
      throw new BadRequestException("This error has already been resolved");
    }

    errorLog.resolvedAt = new Date();
    errorLog.resolvedByUserId = userId;
    errorLog.resolution = dto.resolution;
    errorLog.updatedById = userId;

    const savedError = await this.errorLogRepository.save(errorLog);

    // Check if there are any remaining unresolved errors for this machine
    const unresolvedCount = await this.errorLogRepository.count({
      where: {
        machineId: errorLog.machineId,
        resolvedAt: null as unknown as Date, // TypeORM FindOptionsWhere: null check for nullable Date column
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
      order: { occurredAt: "DESC" },
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
      maintenanceType: dto.maintenanceType as MaintenanceType,
      scheduledDate: dto.scheduledDate,
      assignedToUserId: dto.assignedToUserId,
      description: dto.description,
      estimatedDurationMinutes: dto.estimatedDurationMinutes,
      estimatedCost: dto.estimatedCost,
      repeatIntervalDays: dto.repeatIntervalDays,
      status: MaintenanceStatus.SCHEDULED,
      createdById: userId,
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
      order: { scheduledDate: "ASC" },
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
        "This maintenance has already been completed",
      );
    }

    schedule.status = MaintenanceStatus.COMPLETED;
    schedule.completedDate = new Date();
    schedule.completedByUserId = userId;
    schedule.notes = dto.notes ?? schedule.notes;
    schedule.actualDurationMinutes =
      dto.actualDurationMinutes ?? schedule.actualDurationMinutes;
    schedule.actualCost = dto.actualCost ?? schedule.actualCost;
    schedule.updatedById = userId;

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
        createdById: userId,
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
  // LOOKUP HELPERS (ported from VHM24-repo)
  // ============================================================================

  async findByMachineNumber(
    machineNumber: string,
    organizationId?: string,
  ): Promise<Machine | null> {
    interface WhereClause {
      machineNumber: string;
      organizationId?: string;
    }
    const where: WhereClause = { machineNumber };
    if (organizationId) where.organizationId = organizationId;
    return this.machineRepository.findOne({
      where,
      relations: ["slots"],
    });
  }

  async findByQrCode(qrCode: string): Promise<Machine | null> {
    return this.machineRepository.findOne({
      where: { qrCode },
      relations: ["slots"],
    });
  }

  async findAllSimple(organizationId: string): Promise<
    Array<{
      id: string;
      name: string;
      machineNumber: string;
      status: MachineStatus;
    }>
  > {
    return this.machineRepository
      .createQueryBuilder("m")
      .select(["m.id", "m.name", "m.machineNumber", "m.status"])
      .where("m.organizationId = :organizationId", { organizationId })
      .orderBy("m.name", "ASC")
      .getMany();
  }

  async getOfflineMachines(
    organizationId: string,
    minOfflineMinutes = 10,
  ): Promise<Machine[]> {
    const threshold = new Date(Date.now() - minOfflineMinutes * 60 * 1000);

    return this.machineRepository
      .createQueryBuilder("m")
      .where("m.organizationId = :organizationId", { organizationId })
      .andWhere("m.status != :disabled", {
        disabled: MachineStatus.DISABLED,
      })
      .andWhere("(m.lastPingAt IS NULL OR m.lastPingAt < :threshold)", {
        threshold,
      })
      .select([
        "m.id",
        "m.name",
        "m.machineNumber",
        "m.status",
        "m.lastPingAt",
        "m.address",
        "m.locationId",
      ])
      .orderBy("m.lastPingAt", "ASC", "NULLS FIRST")
      .getMany();
  }

  async findByIds(ids: string[]): Promise<Machine[]> {
    if (ids.length === 0) return [];
    return this.machineRepository.find({
      where: { id: In(ids) },
    });
  }

  async updateConnectionStatus(
    machineId: string,
    connectionStatus: MachineConnectionStatus,
    lastSeenAt?: Date,
  ): Promise<void> {
    interface UpdateData {
      connectionStatus: MachineConnectionStatus;
      lastSeenAt?: Date;
    }
    const update: UpdateData = { connectionStatus };
    if (lastSeenAt) {
      update.lastSeenAt = lastSeenAt;
    }
    await this.machineRepository.update(machineId, update);
  }

  async getMachinesWithLowStock(
    organizationId: string,
    threshold?: number,
  ): Promise<Machine[]> {
    const minThreshold = threshold ?? 20; // default 20% capacity

    // Get machines with slots below threshold
    const machines = await this.machineRepository
      .createQueryBuilder("machine")
      .leftJoinAndSelect("machine.slots", "slot")
      .where("machine.organizationId = :organizationId", { organizationId })
      .andWhere("machine.status != :disabled", {
        disabled: MachineStatus.DISABLED,
      })
      .getMany();

    return machines.filter((machine) => {
      if (!machine.slots?.length) return false;
      return machine.slots.some(
        (slot) =>
          slot.capacity > 0 &&
          (slot.currentQuantity / slot.capacity) * 100 <= minThreshold,
      );
    });
  }

  // ============================================================================
  // WRITEOFF (BullMQ queue — ported from VHM24-repo)
  // ============================================================================

  async writeoffMachine(
    machineId: string,
    reason: string,
    userId?: string,
    options?: { notes?: string; disposalDate?: string; requestId?: string },
  ): Promise<{ jobId: string }> {
    const machine = await this.ensureMachineExists(machineId);

    if (machine.isDisposed) {
      throw new BadRequestException(
        `Machine ${machine.machineNumber} is already disposed`,
      );
    }

    const job = await this.writeoffQueue.add(
      "writeoff",
      {
        machineId,
        reason: reason as WriteoffJobData["reason"],
        notes: options?.notes,
        disposalDate: options?.disposalDate,
        userId,
        requestId: options?.requestId,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 7 * 24 * 3600 }, // keep 7 days
        removeOnFail: { age: 30 * 24 * 3600 }, // keep 30 days
      },
    );

    this.logger.log(
      `Queued writeoff job ${job.id} for machine ${machine.machineNumber}`,
    );

    return { jobId: job.id! };
  }

  async getWriteoffJobStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    result?: WriteoffJobResult;
    failedReason?: string;
  }> {
    const job = await this.writeoffQueue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Writeoff job ${jobId} not found`);
    }

    const state = await job.getState();

    return {
      id: job.id!,
      status: state,
      progress: typeof job.progress === "number" ? job.progress : 0,
      result: job.returnvalue ?? undefined,
      failedReason: job.failedReason ?? undefined,
    };
  }

  async bulkWriteoff(
    machineIds: string[],
    reason: string,
    userId?: string,
    options?: { notes?: string; disposalDate?: string },
  ): Promise<{ jobs: { machineId: string; jobId: string }[] }> {
    const jobs: { machineId: string; jobId: string }[] = [];

    for (const machineId of machineIds) {
      const { jobId } = await this.writeoffMachine(machineId, reason, userId, {
        ...options,
        requestId: `bulk-${Date.now()}`,
      });
      jobs.push({ machineId, jobId });
    }

    this.logger.log(
      `Queued ${jobs.length} bulk writeoff jobs for reason: ${reason}`,
    );

    return { jobs };
  }

  // ============================================================================
  // QR CODE
  // ============================================================================

  async generateQrCode(
    machineId: string,
    organizationId: string,
  ): Promise<Machine> {
    const machine = await this.ensureMachineExists(machineId);
    if (machine.organizationId !== organizationId) {
      throw new BadRequestException(
        "Machine does not belong to this organization",
      );
    }

    const qrData = `vendhub://machine/${machineId}`;
    machine.qrCode = qrData;

    if (QRCode) {
      machine.qrCodeUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
      });
    } else {
      this.logger.warn("qrcode package not installed — QR image not generated");
    }

    return this.machineRepository.save(machine);
  }

  // ============================================================================
  // DEPRECIATION
  // ============================================================================

  calculateDepreciation(machine: Machine): {
    accumulated: number;
    bookValue: number;
  } {
    if (
      !machine.purchasePrice ||
      !machine.depreciationYears ||
      !machine.purchaseDate
    ) {
      return { accumulated: 0, bookValue: machine.purchasePrice || 0 };
    }

    const purchaseDate = new Date(machine.purchaseDate);
    const now = new Date();
    const yearsElapsed =
      (now.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const price = Number(machine.purchasePrice);
    const years = machine.depreciationYears;

    let accumulated: number;
    if (machine.depreciationMethod === DepreciationMethod.DECLINING) {
      // Declining balance: price * (1 - (1 - 1/years)^elapsed)
      accumulated = price * (1 - Math.pow(1 - 1 / years, yearsElapsed));
    } else {
      // Linear (default): (price / years) * elapsed
      accumulated = (price / years) * yearsElapsed;
    }

    accumulated = Math.min(accumulated, price); // Cannot exceed purchase price
    return {
      accumulated: Math.round(accumulated * 100) / 100,
      bookValue: Math.round((price - accumulated) * 100) / 100,
    };
  }

  async getDepreciation(
    machineId: string,
  ): Promise<{ accumulated: number; bookValue: number; method: string }> {
    const machine = await this.ensureMachineExists(machineId);
    const result = this.calculateDepreciation(machine);
    return {
      ...result,
      method: machine.depreciationMethod || DepreciationMethod.LINEAR,
    };
  }

  async runDepreciationBatch(
    organizationId: string,
  ): Promise<{ updated: number }> {
    const machines = await this.machineRepository.find({
      where: { organizationId },
    });

    let updated = 0;
    for (const machine of machines) {
      if (
        !machine.purchasePrice ||
        !machine.depreciationYears ||
        !machine.purchaseDate
      )
        continue;

      const { accumulated } = this.calculateDepreciation(machine);
      if (Number(machine.accumulatedDepreciation) !== accumulated) {
        machine.accumulatedDepreciation = accumulated;
        machine.lastDepreciationDate = new Date();
        await this.machineRepository.save(machine);
        updated++;
      }
    }

    this.logger.log(
      `Depreciation batch: updated ${updated} machines for org ${organizationId}`,
    );
    return { updated };
  }

  // ============================================================================
  // CONNECTIVITY
  // ============================================================================

  async updateConnectivity(machineId: string): Promise<Machine> {
    const machine = await this.ensureMachineExists(machineId);
    const previousPing = machine.lastPingAt;
    machine.lastPingAt = new Date();

    // Detect status change (was offline, now online)
    if (previousPing) {
      const wasOffline =
        Date.now() - new Date(previousPing).getTime() > 10 * 60 * 1000;
      if (
        wasOffline &&
        machine.connectionStatus !== MachineConnectionStatus.ONLINE
      ) {
        machine.connectionStatus = MachineConnectionStatus.ONLINE;
        this.logger.log(`Machine ${machineId} came back online`);
      }
    } else {
      machine.connectionStatus = MachineConnectionStatus.ONLINE;
    }

    return this.machineRepository.save(machine);
  }

  async getConnectivityStats(organizationId: string): Promise<{
    online: number;
    offline: number;
    stale: number;
    total: number;
  }> {
    const machines = await this.machineRepository.find({
      where: { organizationId },
      select: ["id", "lastPingAt"],
    });

    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    let online = 0;
    let stale = 0;
    let offline = 0;

    for (const m of machines) {
      if (!m.lastPingAt) {
        offline++;
        continue;
      }
      const age = now - new Date(m.lastPingAt).getTime();
      if (age <= tenMinutes) online++;
      else if (age <= oneHour) stale++;
      else offline++;
    }

    return { online, offline, stale, total: machines.length };
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
