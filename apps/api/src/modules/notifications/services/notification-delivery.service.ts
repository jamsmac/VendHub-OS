/**
 * Notification Delivery Service for VendHub OS
 * Handles multi-channel delivery orchestration (email, SMS, push, telegram, webhook)
 */

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import {
  Notification,
  NotificationQueue as NotificationQueueEntity,
  NotificationLog,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from "../entities/notification.entity";
import { User } from "../../users/entities/user.entity";
import { EmailService } from "../../email/email.service";
import { SmsService } from "../../sms/sms.service";
import { PushNotificationService } from "./push-notification.service";

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationQueueEntity)
    private readonly queueRepo: Repository<NotificationQueueEntity>,
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  // ==========================================================================
  // Queue Management
  // ==========================================================================

  async queueNotification(notification: Notification): Promise<void> {
    for (const channel of notification.channels) {
      const queueEntry = this.queueRepo.create({
        organizationId: notification.organizationId,
        notificationId: notification.id,
        channel,
        status: NotificationStatus.QUEUED,
        scheduledAt: notification.scheduledAt || new Date(),
        userId: notification.userId,
        recipient: {},
        content: {
          title: notification.content?.title || "",
          body: notification.content?.body || "",
        },
      });

      await this.queueRepo.save(queueEntry);
    }

    // Add to BullMQ queue for processing (disabled)
    // await this.notificationQueue.add('send', { notificationId: notification.id });
  }

  getPriorityWeight(priority: NotificationPriority): number {
    const weights = {
      [NotificationPriority.URGENT]: 100,
      [NotificationPriority.HIGH]: 75,
      [NotificationPriority.NORMAL]: 50,
      [NotificationPriority.LOW]: 25,
    };
    return weights[priority] || 50;
  }

  // ==========================================================================
  // Queue Processing
  // ==========================================================================

  async processQueue(): Promise<void> {
    const pending = await this.queueRepo.find({
      where: {
        status: NotificationStatus.QUEUED,
        scheduledAt: LessThan(new Date()),
      },
      order: { createdAt: "ASC" },
      take: 100,
    });

    for (const entry of pending) {
      try {
        await this.sendToChannel(entry);
        entry.status = NotificationStatus.SENT;
        entry.processedAt = new Date();
      } catch (error: unknown) {
        entry.status = NotificationStatus.FAILED;
        entry.lastError =
          error instanceof Error ? error.message : String(error);
        entry.retryCount++;

        if (entry.retryCount < entry.maxRetries) {
          entry.status = NotificationStatus.QUEUED;
          entry.nextRetryAt = new Date(Date.now() + entry.retryCount * 60000); // Exponential backoff
        }
      }

      await this.queueRepo.save(entry);
    }
  }

  // ==========================================================================
  // Channel Routing
  // ==========================================================================

  private async sendToChannel(entry: NotificationQueueEntity): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { id: entry.notificationId },
    });

    if (!notification) return;

    switch (entry.channel) {
      case NotificationChannel.PUSH:
        await this.pushNotificationService.sendPush(notification);
        break;
      case NotificationChannel.EMAIL:
        await this.sendEmail(notification);
        break;
      case NotificationChannel.SMS:
        await this.sendSms(notification);
        break;
      case NotificationChannel.TELEGRAM:
        await this.sendTelegram(notification);
        break;
      case NotificationChannel.WEBHOOK:
        await this.sendWebhook(notification);
        break;
    }

    // Log
    await this.logRepo.save(
      this.logRepo.create({
        organizationId: notification.organizationId,
        notificationId: notification.id,
        channel: entry.channel,
        status: NotificationStatus.SENT,
      }),
    );
  }

  // ==========================================================================
  // Channel-specific Sending
  // ==========================================================================

  private async loadRecipient(userId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  private async sendEmail(notification: Notification): Promise<void> {
    if (!notification.userId) {
      this.logger.warn("Email: no userId, skipping");
      return;
    }

    const user = await this.loadRecipient(notification.userId);
    if (!user?.email) {
      this.logger.warn(`Email: no email for user ${notification.userId}`);
      return;
    }

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: notification.content?.title || "VendHub Notification",
        text: notification.content?.body || "",
        html: notification.content?.body
          ? `<p>${notification.content.body}</p>`
          : undefined,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Email send failed for user ${notification.userId}: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  private async sendSms(notification: Notification): Promise<void> {
    if (!notification.userId) {
      this.logger.warn("SMS: no userId, skipping");
      return;
    }

    const user = await this.loadRecipient(notification.userId);
    if (!user?.phone) {
      this.logger.warn(`SMS: no phone for user ${notification.userId}`);
      return;
    }

    try {
      await this.smsService.send({
        to: user.phone,
        message:
          notification.content?.body || notification.content?.title || "",
      });
    } catch (error: unknown) {
      this.logger.error(
        `SMS send failed for user ${notification.userId}: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  private async sendTelegram(notification: Notification): Promise<void> {
    if (!notification.userId) {
      this.logger.warn("Telegram: no userId, skipping");
      return;
    }

    const user = await this.loadRecipient(notification.userId);
    if (!user?.telegramId) {
      this.logger.warn(
        `Telegram: no telegramId for user ${notification.userId}`,
      );
      return;
    }

    const telegramBotToken =
      this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!telegramBotToken) {
      this.logger.warn("Telegram: TELEGRAM_BOT_TOKEN not configured");
      return;
    }

    try {
      const message = notification.content?.title
        ? `${notification.content.title}${notification.content?.body ? `\n\n${notification.content.body}` : ""}`
        : notification.content?.body || "Notification";

      await this.httpService.axiosRef.post(
        `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
        {
          chat_id: user.telegramId,
          text: message,
          parse_mode: "HTML",
        },
      );
      this.logger.log(
        `Telegram: sent "${notification.content?.title}" to user ${notification.userId}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Telegram: failed to send to user ${notification.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async sendWebhook(notification: Notification): Promise<void> {
    if (!notification.recipient?.webhookUrl) {
      this.logger.warn("Webhook: no webhookUrl in recipient, skipping");
      return;
    }

    try {
      const payload = {
        id: notification.id,
        notificationId: notification.notificationId,
        type: notification.type,
        priority: notification.priority,
        title: notification.content?.title,
        body: notification.content?.body,
        timestamp: new Date().toISOString(),
        organizationId: notification.organizationId,
        metadata: notification.metadata,
      };

      await this.httpService.axiosRef.post(
        notification.recipient.webhookUrl,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
        },
      );
      this.logger.log(
        `Webhook: sent notification ${notification.notificationId} to ${notification.recipient.webhookUrl}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Webhook: failed to call ${notification.recipient?.webhookUrl}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
