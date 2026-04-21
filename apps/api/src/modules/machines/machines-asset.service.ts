/**
 * Machines Asset Service
 * Writeoff, depreciation, QR code, connectivity
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Repository } from "typeorm";
import {
  WriteoffJobData,
  WriteoffJobResult,
} from "./processors/writeoff.processor";
import {
  Machine,
  MachineConnectionStatus,
  DepreciationMethod,
} from "./entities/machine.entity";
import { MachinesCoreService } from "./machines-core.service";

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

@Injectable()
export class MachinesAssetService {
  private readonly logger = new Logger(MachinesAssetService.name);

  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
    @InjectQueue("machine-writeoff")
    private readonly writeoffQueue: Queue<WriteoffJobData, WriteoffJobResult>,
    private readonly coreService: MachinesCoreService,
  ) {}

  // ── Writeoff ───────────────────────────────────────────

  async writeoffMachine(
    machineId: string,
    reason: string,
    userId?: string,
    options?: { notes?: string; disposalDate?: string; requestId?: string },
  ): Promise<{ jobId: string }> {
    const machine = await this.coreService.ensureMachineExists(machineId);

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
        ...(options?.notes !== undefined && { notes: options.notes }),
        ...(options?.disposalDate !== undefined && {
          disposalDate: options.disposalDate,
        }),
        ...(userId !== undefined && { userId }),
        ...(options?.requestId !== undefined && {
          requestId: options.requestId,
        }),
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 7 * 24 * 3600 },
        removeOnFail: { age: 30 * 24 * 3600 },
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

  // ── QR Code ────────────────────────────────────────────

  async generateQrCode(
    machineId: string,
    organizationId: string,
  ): Promise<Machine> {
    const machine = await this.coreService.ensureMachineExists(machineId);
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

  // ── Depreciation ───────────────────────────────────────

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
      accumulated = price * (1 - Math.pow(1 - 1 / years, yearsElapsed));
    } else {
      accumulated = (price / years) * yearsElapsed;
    }

    accumulated = Math.min(accumulated, price);
    return {
      accumulated: Math.round(accumulated * 100) / 100,
      bookValue: Math.round((price - accumulated) * 100) / 100,
    };
  }

  async getDepreciation(
    machineId: string,
  ): Promise<{ accumulated: number; bookValue: number; method: string }> {
    const machine = await this.coreService.ensureMachineExists(machineId);
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
      select: [
        "id",
        "purchasePrice",
        "depreciationYears",
        "purchaseDate",
        "depreciationMethod",
        "accumulatedDepreciation",
      ],
    });

    const toUpdate: { id: string; accumulatedDepreciation: number }[] = [];
    for (const machine of machines) {
      if (
        !machine.purchasePrice ||
        !machine.depreciationYears ||
        !machine.purchaseDate
      )
        continue;

      const { accumulated } = this.calculateDepreciation(machine);
      if (Number(machine.accumulatedDepreciation) !== accumulated) {
        toUpdate.push({ id: machine.id, accumulatedDepreciation: accumulated });
      }
    }

    if (toUpdate.length > 0) {
      const now = new Date();
      const BATCH_SIZE = 500;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        const ids = batch.map((m) => m.id);
        // Batch update — all get same depreciation recalc date
        await this.machineRepository
          .createQueryBuilder()
          .update()
          .set({ lastDepreciationDate: now })
          .whereInIds(ids)
          .execute();
        // Individual accumulated values via save (TypeORM batches internally)
        await this.machineRepository.save(
          batch.map((m) => ({
            id: m.id,
            accumulatedDepreciation: m.accumulatedDepreciation,
            lastDepreciationDate: now,
          })),
        );
      }
    }

    this.logger.log(
      `Depreciation batch: updated ${toUpdate.length} machines for org ${organizationId}`,
    );
    return { updated: toUpdate.length };
  }

  // ── Connectivity ───────────────────────────────────────

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

  async updateConnectivity(machineId: string): Promise<Machine> {
    const machine = await this.coreService.ensureMachineExists(machineId);
    const previousPing = machine.lastPingAt;
    machine.lastPingAt = new Date();

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
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const result = await this.machineRepository
      .createQueryBuilder("m")
      .select("COUNT(*)::int", "total")
      .addSelect(
        "COUNT(CASE WHEN m.last_ping_at > :tenMinutesAgo THEN 1 END)::int",
        "online",
      )
      .addSelect(
        "COUNT(CASE WHEN m.last_ping_at > :oneHourAgo AND m.last_ping_at <= :tenMinutesAgo THEN 1 END)::int",
        "stale",
      )
      .addSelect(
        "COUNT(CASE WHEN m.last_ping_at IS NULL OR m.last_ping_at <= :oneHourAgo THEN 1 END)::int",
        "offline",
      )
      .where("m.organization_id = :organizationId", { organizationId })
      .setParameters({ tenMinutesAgo, oneHourAgo })
      .getRawOne();

    return {
      online: result?.online || 0,
      offline: result?.offline || 0,
      stale: result?.stale || 0,
      total: result?.total || 0,
    };
  }
}
