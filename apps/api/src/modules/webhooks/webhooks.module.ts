import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

/**
 * Webhooks Module
 * Sends webhook notifications to external systems
 * Features from VHM project:
 * - Retry logic
 * - Event filtering
 * - Secret signing
 */
@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
