import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { FiscalService } from '../services/fiscal.service';

@Processor('fiscal')
export class FiscalQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(FiscalQueueProcessor.name);

  constructor(private readonly fiscalService: FiscalService) {
    super();
  }

  async process(job: Job<{ queueItemId: string }>): Promise<void> {
    this.logger.log(`Processing fiscal queue item: ${job.data.queueItemId}`);

    try {
      await this.fiscalService.processQueueItem(job.data.queueItemId);
      this.logger.log(`Successfully processed: ${job.data.queueItemId}`);
    } catch (error: any) {
      this.logger.error(`Failed to process ${job.data.queueItemId}: ${error.message}`);
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `Job ${job.id} failed after ${job.attemptsMade} attempts: ${error.message}`,
    );
  }
}
