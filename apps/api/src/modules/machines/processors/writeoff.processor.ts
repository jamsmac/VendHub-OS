/**
 * Background processor for machine writeoff operations (BullMQ v5)
 *
 * Ported from VHM24-repo, adapted to VendHub OS patterns:
 * - WorkerHost + process() instead of @Process()
 * - @OnWorkerEvent instead of @OnQueueFailed
 * - camelCase entity properties
 * - job.updateProgress() instead of job.progress()
 */

import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Machine,
  MachineStatus,
  DisposalReason,
} from "../entities/machine.entity";

export interface WriteoffJobData {
  machineId: string;
  reason: DisposalReason;
  notes?: string;
  disposalDate?: string; // ISO string
  userId?: string;
  requestId?: string;
}

export interface WriteoffJobResult {
  success: boolean;
  machineId: string;
  machineNumber: string;
  bookValue: number;
  disposalDate: Date;
  message: string;
}

@Processor("machine-writeoff")
export class WriteoffProcessor extends WorkerHost {
  private readonly logger = new Logger(WriteoffProcessor.name);

  constructor(
    @InjectRepository(Machine)
    private readonly machineRepository: Repository<Machine>,
  ) {
    super();
  }

  async process(job: Job<WriteoffJobData>): Promise<WriteoffJobResult> {
    const { machineId, reason, notes, disposalDate, userId, requestId } =
      job.data;

    this.logger.log(
      `Processing writeoff job ${job.id} for machine ${machineId}` +
        (requestId ? ` (request: ${requestId})` : ""),
    );

    try {
      await job.updateProgress(10);

      // Step 1: Load machine
      const machine = await this.machineRepository.findOne({
        where: { id: machineId },
      });

      if (!machine) {
        throw new NotFoundException(`Machine with ID ${machineId} not found`);
      }

      // Step 2: Validate
      await job.updateProgress(20);

      if (machine.isDisposed) {
        throw new BadRequestException(
          `Machine ${machine.machineNumber} is already disposed`,
        );
      }

      if (!machine.purchasePrice) {
        throw new BadRequestException(
          `Cannot writeoff machine ${machine.machineNumber}: missing purchase price`,
        );
      }

      // Step 3: Calculate financials
      await job.updateProgress(40);

      const date = disposalDate ? new Date(disposalDate) : new Date();
      const purchasePrice = Number(machine.purchasePrice);
      const accumulated = Number(machine.accumulatedDepreciation || 0);
      const bookValue = Math.max(0, purchasePrice - accumulated);

      this.logger.log(
        `Writeoff ${machine.machineNumber}: purchase=${purchasePrice}, depreciation=${accumulated}, bookValue=${bookValue}`,
      );

      // Step 4: Update machine status
      await job.updateProgress(70);

      machine.isDisposed = true;
      machine.disposalDate = date;
      machine.disposalReason = reason;
      machine.disposalNotes = notes || "";
      machine.status = MachineStatus.DISABLED;
      if (userId) machine.updatedById = userId;

      await this.machineRepository.save(machine);

      // Step 5: Complete
      await job.updateProgress(100);

      const result: WriteoffJobResult = {
        success: true,
        machineId: machine.id,
        machineNumber: machine.machineNumber,
        bookValue,
        disposalDate: date,
        message: `Machine ${machine.machineNumber} written off (book value: ${bookValue} UZS)`,
      };

      this.logger.log(`Completed writeoff job ${job.id}: ${result.message}`);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Writeoff job ${job.id} failed: ${msg}`);
      throw error;
    }
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job<WriteoffJobData>, error: Error): void {
    this.logger.error(
      `Writeoff job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
