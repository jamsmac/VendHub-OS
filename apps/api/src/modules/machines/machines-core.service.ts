/**
 * Machines Core Service
 * CRUD, lookups, map, list, stats
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Machine, MachineSlot, MachineStatus } from "./entities/machine.entity";
import { stripProtectedFields } from "../../common/utils";

@Injectable()
export class MachinesCoreService {
  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectRepository(MachineSlot)
    private readonly slotRepository: Repository<MachineSlot>,
  ) {}

  // ── CRUD ───────────────────────────────────────────────

  async create(data: Partial<Machine>): Promise<Machine> {
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
      relations: ["slots"],
    });
  }

  async findBySerialNumber(
    serialNumber: string,
    organizationId?: string,
  ): Promise<Machine | null> {
    const where: Record<string, string> = { serialNumber };
    if (organizationId) where.organizationId = organizationId;
    return this.machineRepository.findOne({
      where,
      relations: ["slots"],
    });
  }

  async update(
    id: string,
    data: Partial<Machine>,
    organizationId?: string,
  ): Promise<Machine> {
    const machine = await this.findById(id, organizationId);
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    Object.assign(
      machine,
      stripProtectedFields(data as Record<string, unknown>),
    );
    return this.machineRepository.save(machine);
  }

  async updateStatus(
    id: string,
    status: MachineStatus,
    organizationId?: string,
  ): Promise<Machine> {
    return this.update(id, { status }, organizationId);
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

  async remove(id: string, organizationId: string): Promise<void> {
    const machine = await this.machineRepository.findOne({
      where: { id, organizationId },
    });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${id} not found`);
    }
    await this.machineRepository.softDelete(id);
  }

  // ── Stats & Map ────────────────────────────────────────

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

  // ── Lookups ────────────────────────────────────────────

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

  async findByQrCode(
    qrCode: string,
    organizationId?: string,
  ): Promise<Machine | null> {
    const where: Record<string, string> = { qrCode };
    if (organizationId) where.organizationId = organizationId;
    return this.machineRepository.findOne({
      where,
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

  async getMachinesWithLowStock(
    organizationId: string,
    threshold?: number,
  ): Promise<Machine[]> {
    const minThreshold = threshold ?? 20;

    return this.machineRepository
      .createQueryBuilder("machine")
      .innerJoin(
        "machine.slots",
        "slot",
        "slot.capacity > 0 AND (slot.currentQuantity::float / slot.capacity) * 100 <= :minThreshold",
        { minThreshold },
      )
      .leftJoinAndSelect("machine.slots", "allSlots")
      .where("machine.organizationId = :organizationId", { organizationId })
      .andWhere("machine.status != :disabled", {
        disabled: MachineStatus.DISABLED,
      })
      .take(200)
      .getMany();
  }

  // ── Shared helper ──────────────────────────────────────

  async ensureMachineExists(machineId: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({
      where: { id: machineId },
    });
    if (!machine) {
      throw new NotFoundException(`Machine with ID ${machineId} not found`);
    }
    return machine;
  }
}
