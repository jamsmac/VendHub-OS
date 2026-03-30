/**
 * Machines Maintenance Service
 * Slots, components, error logs, maintenance schedules, location history
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Machine,
  MachineSlot,
  MachineLocationHistory,
  MachineComponent,
  SimUsageLog,
  MachineConnectivity,
  MachineExpense,
  MachineErrorLog,
  MachineMaintenanceSchedule,
  MachineStatus,
  ComponentStatus,
  ConnectivityStatus,
  MaintenanceStatus,
  MaintenanceType,
  MoveReason,
  ErrorSeverity,
} from "./entities/machine.entity";
import { CreateSimUsageDto } from "./dto/sim-usage.dto";
import {
  CreateConnectivityDto,
  UpdateConnectivityDto,
} from "./dto/connectivity.dto";
import { CreateExpenseDto, UpdateExpenseDto } from "./dto/expense.dto";
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
  MachineCompleteMaintenanceDto,
} from "./dto/machine-location.dto";
import { MachinesCoreService } from "./machines-core.service";

@Injectable()
export class MachinesMaintenanceService {
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
    @InjectRepository(SimUsageLog)
    private readonly simUsageRepository: Repository<SimUsageLog>,
    @InjectRepository(MachineConnectivity)
    private readonly connectivityRepository: Repository<MachineConnectivity>,
    @InjectRepository(MachineExpense)
    private readonly expenseRepository: Repository<MachineExpense>,
    private readonly coreService: MachinesCoreService,
  ) {}

  // ── Slots ──────────────────────────────────────────────

  async getSlots(machineId: string): Promise<MachineSlot[]> {
    await this.coreService.ensureMachineExists(machineId);

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
    await this.coreService.ensureMachineExists(machineId);

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

    await this.machineRepository.update(slot.machineId, {
      lastRefillDate: new Date(),
    });

    return savedSlot;
  }

  // ── Location History ───────────────────────────────────

  async moveToLocation(
    machineId: string,
    dto: MoveMachineDto,
    userId: string,
  ): Promise<MachineLocationHistory> {
    const machine = await this.coreService.ensureMachineExists(machineId);

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
    await this.coreService.ensureMachineExists(machineId);

    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.locationHistoryRepository.findAndCount({
      where: { machineId },
      order: { movedAt: "DESC" },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total };
  }

  // ── Components ─────────────────────────────────────────

  async getComponents(machineId: string): Promise<MachineComponent[]> {
    await this.coreService.ensureMachineExists(machineId);

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
    await this.coreService.ensureMachineExists(machineId);

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
      metadata: dto.metadata ?? {},
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

  // ── Error Log ──────────────────────────────────────────

  async logError(
    machineId: string,
    dto: LogErrorDto,
    userId?: string,
  ): Promise<MachineErrorLog> {
    await this.coreService.ensureMachineExists(machineId);

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

    const unresolvedCount = await this.errorLogRepository.count({
      where: {
        machineId: errorLog.machineId,
        resolvedAt: null as unknown as Date,
      },
    });

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
    await this.coreService.ensureMachineExists(machineId);

    const safeLimit = Math.min(limit, 100);
    const [data, total] = await this.errorLogRepository.findAndCount({
      where: { machineId },
      order: { occurredAt: "DESC" },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return { data, total };
  }

  // ── Maintenance Schedule ───────────────────────────────

  async scheduleMaintenance(
    machineId: string,
    dto: ScheduleMaintenanceDto,
    userId: string,
  ): Promise<MachineMaintenanceSchedule> {
    await this.coreService.ensureMachineExists(machineId);

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
    await this.coreService.ensureMachineExists(machineId);

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
    dto: MachineCompleteMaintenanceDto,
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

    await this.machineRepository.update(schedule.machineId, {
      lastMaintenanceDate: new Date(),
    });

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

      savedSchedule.nextScheduleId = savedNext.id;
      await this.maintenanceRepository.save(savedSchedule);

      await this.machineRepository.update(schedule.machineId, {
        nextMaintenanceDate: nextDate,
      });
    }

    return savedSchedule;
  }

  // ── SIM Usage ──────────────────────────────────────────

  async getSimUsage(machineId: string): Promise<SimUsageLog[]> {
    await this.coreService.ensureMachineExists(machineId);

    return this.simUsageRepository.find({
      where: { machineId },
      order: { periodStart: "DESC" },
    });
  }

  async addSimUsage(
    machineId: string,
    dto: CreateSimUsageDto,
    user: { id: string; organizationId: string },
  ): Promise<SimUsageLog> {
    await this.coreService.ensureMachineExists(machineId);

    // Verify component exists and belongs to this machine
    const component = await this.componentRepository.findOne({
      where: { id: dto.componentId, machineId },
    });
    if (!component) {
      throw new NotFoundException(
        `SIM component ${dto.componentId} not found on machine ${machineId}`,
      );
    }

    const log = this.simUsageRepository.create({
      componentId: dto.componentId,
      machineId,
      organizationId: user.organizationId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      dataUsedMb: dto.dataUsedMb,
      dataLimitMb: dto.dataLimitMb,
      cost: dto.cost,
      currency: "UZS",
      notes: dto.notes,
      createdById: user.id,
    });

    return this.simUsageRepository.save(log);
  }

  // ── Connectivity (Связь) ───────────────────────────────────

  async getConnectivity(
    machineId: string,
    organizationId: string,
  ): Promise<MachineConnectivity[]> {
    await this.coreService.ensureMachineExists(machineId);
    return this.connectivityRepository.find({
      where: { machineId, organizationId },
      order: { startDate: "DESC" },
    });
  }

  async addConnectivity(
    machineId: string,
    dto: CreateConnectivityDto,
    user: { id: string; organizationId: string },
  ): Promise<MachineConnectivity> {
    await this.coreService.ensureMachineExists(machineId);

    const conn = this.connectivityRepository.create({
      machineId,
      organizationId: user.organizationId,
      connectivityType: dto.connectivityType,
      providerName: dto.providerName,
      accountNumber: dto.accountNumber,
      tariffName: dto.tariffName,
      componentId: dto.componentId,
      monthlyCost: dto.monthlyCost,
      startDate: dto.startDate,
      endDate: dto.endDate,
      notes: dto.notes,
      createdById: user.id,
    });

    return this.connectivityRepository.save(conn);
  }

  async updateConnectivityService(
    connectivityId: string,
    dto: UpdateConnectivityDto,
    user: { id: string; organizationId: string },
  ): Promise<MachineConnectivity> {
    const conn = await this.connectivityRepository.findOne({
      where: { id: connectivityId, organizationId: user.organizationId },
    });
    if (!conn) {
      throw new NotFoundException(`Connectivity ${connectivityId} not found`);
    }

    Object.assign(conn, dto, { updatedById: user.id });
    return this.connectivityRepository.save(conn);
  }

  async removeConnectivity(
    connectivityId: string,
    organizationId: string,
  ): Promise<void> {
    const conn = await this.connectivityRepository.findOne({
      where: { id: connectivityId, organizationId },
    });
    if (!conn) {
      throw new NotFoundException(`Connectivity ${connectivityId} not found`);
    }
    await this.connectivityRepository.softDelete(connectivityId);
  }

  // ── Expenses (Расходы) ──────────────────────────────────────

  async getExpenses(
    machineId: string,
    organizationId: string,
  ): Promise<MachineExpense[]> {
    await this.coreService.ensureMachineExists(machineId);
    return this.expenseRepository.find({
      where: { machineId, organizationId },
      order: { expenseDate: "DESC" },
    });
  }

  async addExpense(
    machineId: string,
    dto: CreateExpenseDto,
    user: { id: string; organizationId: string },
  ): Promise<MachineExpense> {
    await this.coreService.ensureMachineExists(machineId);

    const expense = this.expenseRepository.create({
      machineId,
      organizationId: user.organizationId,
      locationId: dto.locationId,
      category: dto.category,
      expenseType: dto.expenseType,
      description: dto.description,
      amount: dto.amount,
      expenseDate: dto.expenseDate,
      counterpartyId: dto.counterpartyId,
      performedByUserId: user.id,
      receiptUrl: dto.receiptUrl,
      invoiceNumber: dto.invoiceNumber,
      notes: dto.notes,
      createdById: user.id,
    });

    return this.expenseRepository.save(expense);
  }

  async updateExpense(
    expenseId: string,
    dto: UpdateExpenseDto,
    user: { id: string; organizationId: string },
  ): Promise<MachineExpense> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId, organizationId: user.organizationId },
    });
    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found`);
    }

    Object.assign(expense, dto, { updatedById: user.id });
    return this.expenseRepository.save(expense);
  }

  async removeExpense(
    expenseId: string,
    organizationId: string,
  ): Promise<void> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId, organizationId },
    });
    if (!expense) {
      throw new NotFoundException(`Expense ${expenseId} not found`);
    }
    await this.expenseRepository.softDelete(expenseId);
  }

  // ── TCO (Total Cost of Ownership) ──────────────────────────

  async getTco(
    machineId: string,
    organizationId: string,
  ): Promise<{
    machineId: string;
    purchasePrice: number;
    depreciation: number;
    connectivity: { total: number; monthly: number; items: MachineConnectivity[] };
    expenses: {
      capex: number;
      opex: number;
      byCategory: Record<string, number>;
      items: MachineExpense[];
    };
    simUsage: { total: number };
    totalCost: number;
  }> {
    const machine = await this.coreService.ensureMachineExists(machineId);

    const [connectivityItems, expenseItems, simUsageLogs] = await Promise.all([
      this.connectivityRepository.find({
        where: { machineId, organizationId },
      }),
      this.expenseRepository.find({ where: { machineId, organizationId } }),
      this.simUsageRepository.find({ where: { machineId, organizationId } }),
    ]);

    // Connectivity totals
    const connectivityMonthly = connectivityItems
      .filter((c) => c.status === ConnectivityStatus.ACTIVE)
      .reduce((sum, c) => sum + Number(c.monthlyCost || 0), 0);

    const connectivityTotal = connectivityItems.reduce(
      (sum, c) => sum + Number(c.monthlyCost || 0),
      0,
    );

    // Expense totals
    const capex = expenseItems
      .filter((e) => e.expenseType === "capex")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const opex = expenseItems
      .filter((e) => e.expenseType === "opex")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const byCategory: Record<string, number> = {};
    for (const e of expenseItems) {
      byCategory[e.category] =
        (byCategory[e.category] || 0) + Number(e.amount || 0);
    }

    // SIM usage total cost
    const simTotal = simUsageLogs.reduce(
      (sum, s) => sum + Number(s.cost || 0),
      0,
    );

    const purchasePrice = Number(machine.purchasePrice || 0);
    const depreciation = Number(machine.accumulatedDepreciation || 0);

    return {
      machineId,
      purchasePrice,
      depreciation,
      connectivity: {
        total: connectivityTotal,
        monthly: connectivityMonthly,
        items: connectivityItems,
      },
      expenses: { capex, opex, byCategory, items: expenseItems },
      simUsage: { total: simTotal },
      totalCost: purchasePrice + capex + opex + simTotal,
    };
  }
}
