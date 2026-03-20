/**
 * Firebase Cloud Messaging Service
 *
 * Handles mobile push notifications via FCM:
 * - Device token registration/unregistration
 * - Push to individual user (all devices)
 * - Push to multiple users
 * - Topic subscribe/unsubscribe/send
 * - Automatic invalid token cleanup
 *
 * Requires firebase-admin package and GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID.
 * Gracefully degrades when not configured.
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FcmToken } from "./entities/fcm-token.model";
import {
  RegisterFcmTokenDto,
  SendFcmNotificationDto,
} from "./dto/register-token.dto";

interface FirebaseMessaging {
  send: (message: unknown) => Promise<string>;
  sendEachForMulticast: (message: unknown) => Promise<{
    successCount: number;
    failureCount: number;
    responses: unknown[];
  }>;
  subscribeToTopic: (tokens: string[], topic: string) => Promise<unknown>;
  unsubscribeFromTopic: (tokens: string[], topic: string) => Promise<unknown>;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private isFirebaseInitialized = false;
  private messaging: FirebaseMessaging | null = null;

  constructor(
    @InjectRepository(FcmToken)
    private readonly tokenRepository: Repository<FcmToken>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeFirebase();
  }

  private async initializeFirebase() {
    const credentials = this.configService.get<string>(
      "GOOGLE_APPLICATION_CREDENTIALS",
    );
    const projectId = this.configService.get<string>("FIREBASE_PROJECT_ID");

    if (!credentials && !projectId) {
      this.logger.warn(
        "FCM not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID to enable mobile push.",
      );
      return;
    }

    try {
      const firebaseAdmin = require("firebase-admin");

      if (firebaseAdmin.apps.length === 0) {
        if (credentials) {
          const serviceAccount = require(credentials);
          firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount),
          });
        } else {
          firebaseAdmin.initializeApp({ projectId });
        }
      }

      this.messaging = firebaseAdmin.messaging();
      this.isFirebaseInitialized = true;
      this.logger.log("Firebase Admin SDK initialized successfully");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Failed to initialize Firebase: ${msg}`);
      this.logger.warn(
        "FCM disabled. Install firebase-admin if needed: pnpm add firebase-admin",
      );
    }
  }

  isConfigured(): boolean {
    return this.isFirebaseInitialized && this.messaging !== null;
  }

  // ===========================================================================
  // TOKEN MANAGEMENT
  // ===========================================================================

  async registerToken(
    userId: string,
    organizationId: string,
    dto: RegisterFcmTokenDto,
  ): Promise<FcmToken> {
    let fcmToken = await this.tokenRepository.findOne({
      where: { token: dto.token },
    });

    if (fcmToken) {
      fcmToken.userId = userId;
      fcmToken.organizationId = organizationId;
      fcmToken.deviceType = dto.deviceType ?? fcmToken.deviceType;
      fcmToken.deviceName = dto.deviceName ?? fcmToken.deviceName;
      fcmToken.isActive = true;
    } else {
      fcmToken = this.tokenRepository.create({
        userId,
        organizationId,
        token: dto.token,
        deviceType: dto.deviceType ?? null,
        deviceName: dto.deviceName ?? null,
        isActive: true,
      });
    }

    const saved = await this.tokenRepository.save(fcmToken);
    this.logger.log(`FCM token registered for user ${userId}`);
    return saved;
  }

  async unregisterToken(
    userId: string,
    organizationId: string,
    token: string,
  ): Promise<void> {
    const fcmToken = await this.tokenRepository.findOne({
      where: { userId, organizationId, token },
    });

    if (fcmToken) {
      await this.tokenRepository.softDelete(fcmToken.id);
      this.logger.log(`FCM token unregistered for user ${userId}`);
    }
  }

  async getUserTokens(
    userId: string,
    organizationId: string,
  ): Promise<FcmToken[]> {
    return this.tokenRepository.find({
      where: { userId, organizationId, isActive: true },
      order: { createdAt: "DESC" },
    });
  }

  // ===========================================================================
  // SEND NOTIFICATIONS
  // ===========================================================================

  async sendToUser(
    dto: SendFcmNotificationDto,
    organizationId: string,
  ): Promise<number> {
    if (!this.isConfigured()) {
      this.logger.warn("FCM not configured, skipping notification");
      return 0;
    }

    const tokens = await this.tokenRepository.find({
      where: { userId: dto.userId, organizationId, isActive: true },
    });

    if (tokens.length === 0) {
      return 0;
    }

    let sentCount = 0;

    for (const fcmToken of tokens) {
      try {
        await this.messaging!.send({
          token: fcmToken.token,
          notification: { title: dto.title, body: dto.body },
          data: {
            ...(dto.data ?? {}),
            url: dto.url ?? "",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
          android: {
            priority: "high" as const,
            notification: { channelId: "default", sound: "default" },
          },
          apns: {
            payload: { aps: { sound: "default", badge: 1 } },
          },
        });

        fcmToken.lastUsedAt = new Date();
        await this.tokenRepository.save(fcmToken);
        sentCount++;
      } catch (error: unknown) {
        const err = error as { message?: string; code?: string };
        this.logger.error(
          `Failed to send FCM notification: ${err.message ?? "unknown"}`,
        );

        if (
          err.code === "messaging/invalid-registration-token" ||
          err.code === "messaging/registration-token-not-registered"
        ) {
          fcmToken.isActive = false;
          await this.tokenRepository.save(fcmToken);
          this.logger.warn(
            `Deactivated invalid FCM token for user ${dto.userId}`,
          );
        }
      }
    }

    return sentCount;
  }

  async sendToMultipleUsers(
    userIds: string[],
    organizationId: string,
    title: string,
    body: string,
    url?: string,
    data?: Record<string, string>,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const count = await this.sendToUser(
          { userId, title, body, url, data },
          organizationId,
        );
        sent += count;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  }

  // ===========================================================================
  // TOPICS
  // ===========================================================================

  async subscribeToTopic(
    userId: string,
    organizationId: string,
    topic: string,
  ): Promise<void> {
    if (!this.isConfigured()) return;

    const tokens = await this.tokenRepository.find({
      where: { userId, organizationId, isActive: true },
    });

    if (tokens.length === 0) return;

    try {
      await this.messaging!.subscribeToTopic(
        tokens.map((t) => t.token),
        topic,
      );
      this.logger.log(`User ${userId} subscribed to topic ${topic}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "unknown";
      this.logger.error(`Failed to subscribe to topic: ${msg}`);
    }
  }

  async unsubscribeFromTopic(
    userId: string,
    organizationId: string,
    topic: string,
  ): Promise<void> {
    if (!this.isConfigured()) return;

    const tokens = await this.tokenRepository.find({
      where: { userId, organizationId, isActive: true },
    });

    if (tokens.length === 0) return;

    try {
      await this.messaging!.unsubscribeFromTopic(
        tokens.map((t) => t.token),
        topic,
      );
      this.logger.log(`User ${userId} unsubscribed from topic ${topic}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "unknown";
      this.logger.error(`Failed to unsubscribe from topic: ${msg}`);
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      await this.messaging!.send({
        topic,
        notification: { title, body },
        data,
      });
      this.logger.log(`Sent notification to topic ${topic}`);
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "unknown";
      this.logger.error(`Failed to send to topic ${topic}: ${msg}`);
      return false;
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  async cleanupInactiveTokens(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.tokenRepository
      .createQueryBuilder()
      .softDelete()
      .where("isActive = false")
      .andWhere("updatedAt < :date", { date: thirtyDaysAgo })
      .execute();

    const cleaned = result.affected ?? 0;
    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} inactive FCM tokens`);
    }
    return cleaned;
  }
}
