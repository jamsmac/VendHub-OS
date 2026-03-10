/**
 * Machines Service — Facade
 * Delegates to MachinesCoreService, MachinesMaintenanceService, MachinesAssetService
 */

import { Injectable } from "@nestjs/common";
import {
  Machine,
  MachineSlot,
  MachineLocationHistory,
  MachineComponent,
  MachineErrorLog,
  MachineMaintenanceSchedule,
  MachineStatus,
  MachineConnectionStatus,
} from "./entities/machine.entity";
import { WriteoffJobResult } from "./processors/writeoff.processor";
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
import { MachinesMaintenanceService } from "./machines-maintenance.service";
import { MachinesAssetService } from "./machines-asset.service";

@Injectable()
export class MachinesService {
  constructor(
    private readonly core: MachinesCoreService,
    private readonly maintenance: MachinesMaintenanceService,
    private readonly asset: MachinesAssetService,
  ) {}

  // ── Core CRUD ──────────────────────────────────────────

  create(data: Partial<Machine>): Promise<Machine> {
    return this.core.create(data);
  }

  findAll(
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
    return this.core.findAll(organizationId, filters);
  }

  findById(id: string, organizationId?: string): Promise<Machine | null> {
    return this.core.findById(id, organizationId);
  }

  findBySerialNumber(serialNumber: string): Promise<Machine | null> {
    return this.core.findBySerialNumber(serialNumber);
  }

  update(id: string, data: Partial<Machine>): Promise<Machine> {
    return this.core.update(id, data);
  }

  updateStatus(id: string, status: MachineStatus): Promise<Machine> {
    return this.core.updateStatus(id, status);
  }

  updateTelemetry(
    id: string,
    telemetry: Partial<Machine["telemetry"]>,
  ): Promise<Machine> {
    return this.core.updateTelemetry(id, telemetry);
  }

  remove(id: string): Promise<void> {
    return this.core.remove(id);
  }

  countByOrganization(organizationId: string): Promise<number> {
    return this.core.countByOrganization(organizationId);
  }

  getStatsByOrganization(
    organizationId: string,
  ): Promise<Record<string, number>> {
    return this.core.getStatsByOrganization(organizationId);
  }

  getMachinesForMap(organizationId: string) {
    return this.core.getMachinesForMap(organizationId);
  }

  findByMachineNumber(
    machineNumber: string,
    organizationId?: string,
  ): Promise<Machine | null> {
    return this.core.findByMachineNumber(machineNumber, organizationId);
  }

  findByQrCode(qrCode: string): Promise<Machine | null> {
    return this.core.findByQrCode(qrCode);
  }

  findAllSimple(organizationId: string) {
    return this.core.findAllSimple(organizationId);
  }

  getOfflineMachines(
    organizationId: string,
    minOfflineMinutes?: number,
  ): Promise<Machine[]> {
    return this.core.getOfflineMachines(organizationId, minOfflineMinutes);
  }

  findByIds(ids: string[]): Promise<Machine[]> {
    return this.core.findByIds(ids);
  }

  getMachinesWithLowStock(
    organizationId: string,
    threshold?: number,
  ): Promise<Machine[]> {
    return this.core.getMachinesWithLowStock(organizationId, threshold);
  }

  // ── Slots ──────────────────────────────────────────────

  getSlots(machineId: string): Promise<MachineSlot[]> {
    return this.maintenance.getSlots(machineId);
  }

  createSlot(
    machineId: string,
    dto: CreateMachineSlotDto,
    userId?: string,
  ): Promise<MachineSlot> {
    return this.maintenance.createSlot(machineId, dto, userId);
  }

  updateSlot(
    slotId: string,
    dto: UpdateMachineSlotDto,
    userId?: string,
  ): Promise<MachineSlot> {
    return this.maintenance.updateSlot(slotId, dto, userId);
  }

  refillSlot(
    slotId: string,
    dto: RefillSlotDto,
    userId?: string,
  ): Promise<MachineSlot> {
    return this.maintenance.refillSlot(slotId, dto, userId);
  }

  // ── Location History ───────────────────────────────────

  moveToLocation(
    machineId: string,
    dto: MoveMachineDto,
    userId: string,
  ): Promise<MachineLocationHistory> {
    return this.maintenance.moveToLocation(machineId, dto, userId);
  }

  getLocationHistory(
    machineId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: MachineLocationHistory[]; total: number }> {
    return this.maintenance.getLocationHistory(machineId, page, limit);
  }

  // ── Components ─────────────────────────────────────────

  getComponents(machineId: string): Promise<MachineComponent[]> {
    return this.maintenance.getComponents(machineId);
  }

  installComponent(
    machineId: string,
    dto: InstallComponentDto,
    userId: string,
  ): Promise<MachineComponent> {
    return this.maintenance.installComponent(machineId, dto, userId);
  }

  removeComponent(
    componentId: string,
    userId: string,
  ): Promise<MachineComponent> {
    return this.maintenance.removeComponent(componentId, userId);
  }

  // ── Error Log ──────────────────────────────────────────

  logError(
    machineId: string,
    dto: LogErrorDto,
    userId?: string,
  ): Promise<MachineErrorLog> {
    return this.maintenance.logError(machineId, dto, userId);
  }

  resolveError(
    errorId: string,
    dto: ResolveErrorDto,
    userId: string,
  ): Promise<MachineErrorLog> {
    return this.maintenance.resolveError(errorId, dto, userId);
  }

  getErrorHistory(
    machineId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: MachineErrorLog[]; total: number }> {
    return this.maintenance.getErrorHistory(machineId, page, limit);
  }

  // ── Maintenance Schedule ───────────────────────────────

  scheduleMaintenance(
    machineId: string,
    dto: ScheduleMaintenanceDto,
    userId: string,
  ): Promise<MachineMaintenanceSchedule> {
    return this.maintenance.scheduleMaintenance(machineId, dto, userId);
  }

  getUpcomingMaintenance(
    machineId: string,
  ): Promise<MachineMaintenanceSchedule[]> {
    return this.maintenance.getUpcomingMaintenance(machineId);
  }

  completeMaintenance(
    scheduleId: string,
    dto: MachineCompleteMaintenanceDto,
    userId: string,
  ): Promise<MachineMaintenanceSchedule> {
    return this.maintenance.completeMaintenance(scheduleId, dto, userId);
  }

  // ── Writeoff ───────────────────────────────────────────

  writeoffMachine(
    machineId: string,
    reason: string,
    userId?: string,
    options?: { notes?: string; disposalDate?: string; requestId?: string },
  ): Promise<{ jobId: string }> {
    return this.asset.writeoffMachine(machineId, reason, userId, options);
  }

  getWriteoffJobStatus(jobId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    result?: WriteoffJobResult;
    failedReason?: string;
  }> {
    return this.asset.getWriteoffJobStatus(jobId);
  }

  bulkWriteoff(
    machineIds: string[],
    reason: string,
    userId?: string,
    options?: { notes?: string; disposalDate?: string },
  ): Promise<{ jobs: { machineId: string; jobId: string }[] }> {
    return this.asset.bulkWriteoff(machineIds, reason, userId, options);
  }

  // ── QR Code ────────────────────────────────────────────

  generateQrCode(machineId: string, organizationId: string): Promise<Machine> {
    return this.asset.generateQrCode(machineId, organizationId);
  }

  // ── Depreciation ───────────────────────────────────────

  calculateDepreciation(machine: Machine): {
    accumulated: number;
    bookValue: number;
  } {
    return this.asset.calculateDepreciation(machine);
  }

  getDepreciation(
    machineId: string,
  ): Promise<{ accumulated: number; bookValue: number; method: string }> {
    return this.asset.getDepreciation(machineId);
  }

  runDepreciationBatch(organizationId: string): Promise<{ updated: number }> {
    return this.asset.runDepreciationBatch(organizationId);
  }

  // ── Connectivity ───────────────────────────────────────

  updateConnectionStatus(
    machineId: string,
    connectionStatus: MachineConnectionStatus,
    lastSeenAt?: Date,
  ): Promise<void> {
    return this.asset.updateConnectionStatus(
      machineId,
      connectionStatus,
      lastSeenAt,
    );
  }

  updateConnectivity(machineId: string): Promise<Machine> {
    return this.asset.updateConnectivity(machineId);
  }

  getConnectivityStats(organizationId: string): Promise<{
    online: number;
    offline: number;
    stale: number;
    total: number;
  }> {
    return this.asset.getConnectivityStats(organizationId);
  }
}
