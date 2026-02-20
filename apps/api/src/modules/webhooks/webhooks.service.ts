import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export enum WebhookEvent {
  MACHINE_STATUS_CHANGED = 'machine.status.changed',
  INVENTORY_LOW = 'inventory.low',
  TASK_CREATED = 'task.created',
  TASK_COMPLETED = 'task.completed',
  SALE_COMPLETED = 'sale.completed',
  PAYMENT_RECEIVED = 'payment.received',
}

@Injectable()
export class WebhooksService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS = [1000, 5000, 30000]; // ms

  /**
   * Send webhook to all registered endpoints for organization
   */
  async send(
    organizationId: string,
    event: WebhookEvent,
    payload: any,
    webhooks: { url: string; events: string[]; secret: string; isActive: boolean }[],
  ): Promise<void> {
    const activeWebhooks = webhooks.filter(
      (w) => w.isActive && w.events.includes(event),
    );

    for (const webhook of activeWebhooks) {
      this.sendWithRetry(webhook.url, webhook.secret, event, payload);
    }
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWithRetry(
    url: string,
    secret: string,
    event: WebhookEvent,
    payload: any,
    attempt = 0,
  ): Promise<void> {
    try {
      const body = JSON.stringify({
        event,
        payload,
        timestamp: new Date().toISOString(),
      });

      const signature = this.generateSignature(body, secret);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
        },
        body,
      });

      if (!response.ok && attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[attempt];
        setTimeout(() => {
          this.sendWithRetry(url, secret, event, payload, attempt + 1);
        }, delay);
      }
    } catch (error: any) {
      if (attempt < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[attempt];
        setTimeout(() => {
          this.sendWithRetry(url, secret, event, payload, attempt + 1);
        }, delay);
      }
      // Log error but don't throw
      console.error(`Webhook failed after ${attempt + 1} attempts:`, error);
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify incoming webhook signature (for receiving webhooks)
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  }
}
