/**
 * Push Notification Service for VendHub OS
 * Handles Firebase/FCM push notifications and Web Push subscriptions
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Notification } from "../entities/notification.entity";
import { PushSubscription } from "../entities/push-subscription.entity";
import { FcmToken, DeviceType } from "../entities/fcm-token.entity";
import { WebPushService } from "../../web-push/web-push.service";

// Firebase Admin SDK is optional — typed as module shape we actually use
export interface FirebaseMulticastResponse {
  successCount: number;
  failureCount: number;
  responses: Array<{ success: boolean; error?: { code: string } }>;
}

let firebaseAdmin: {
  apps: unknown[];
  initializeApp: (config: Record<string, unknown>) => void;
  credential: { cert: (serviceAccount: Record<string, unknown>) => unknown };
  messaging: () => {
    send: (message: Record<string, unknown>) => Promise<string>;
    sendEachForMulticast: (
      message: Record<string, unknown>,
    ) => Promise<FirebaseMulticastResponse>;
  };
} | null = null;
try {
  firebaseAdmin = require("firebase-admin");
} catch {
  /* firebase-admin not installed */
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseInitialized = false;

  constructor(
    @InjectRepository(FcmToken)
    private readonly fcmTokenRepo: Repository<FcmToken>,
    @InjectRepository(PushSubscription)
    private readonly pushSubscriptionRepo: Repository<PushSubscription>,
    private readonly webPushService: WebPushService,
    private readonly configService: ConfigService,
  ) {
    this.initFirebase();
  }

  // ==========================================================================
  // Firebase Initialization
  // ==========================================================================

  private initFirebase(): void {
    if (!firebaseAdmin) {
      this.logger.warn(
        "firebase-admin not installed — push notifications disabled",
      );
      return;
    }
    if (this.firebaseInitialized) return;

    const serviceAccountKey = this.configService.get<string>(
      "FIREBASE_SERVICE_ACCOUNT_KEY",
    );
    if (!serviceAccountKey) {
      this.logger.warn(
        "FIREBASE_SERVICE_ACCOUNT_KEY not set — push notifications disabled",
      );
      return;
    }

    try {
      const credential = JSON.parse(serviceAccountKey);
      if (firebaseAdmin.apps.length === 0) {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(credential),
        });
      }
      this.firebaseInitialized = true;
      this.logger.log("Firebase Admin initialized for push notifications");
    } catch (error) {
      this.logger.error(
        `Firebase init failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // ==========================================================================
  // Push Sending (FCM + Web Push)
  // ==========================================================================

  async sendPush(notification: Notification): Promise<void> {
    if (!notification.userId) {
      this.logger.warn("Push: no userId, skipping");
      return;
    }

    const tokens = await this.fcmTokenRepo.find({
      where: { userId: notification.userId, isActive: true },
    });

    if (tokens.length === 0) {
      this.logger.warn(
        `Push: no active FCM tokens for user ${notification.userId}`,
      );
      return;
    }

    if (!firebaseAdmin || !this.firebaseInitialized) {
      this.logger.log(
        `Push: firebase not available — would send "${notification.content?.title}" to ${tokens.length} device(s)`,
      );
      return;
    }

    const tokenStrings = tokens.map((t) => t.token);
    const message = {
      notification: {
        title: notification.content?.title || "VendHub",
        body: notification.content?.body || "",
      },
      data: {
        notificationId: notification.id,
        type: notification.type,
        ...(notification.content?.actionUrl
          ? { actionUrl: notification.content.actionUrl }
          : {}),
      },
      tokens: tokenStrings,
    };

    try {
      const response = await firebaseAdmin
        .messaging()
        .sendEachForMulticast(message);
      this.logger.log(
        `Push: sent to ${response.successCount}/${tokenStrings.length} device(s) for user ${notification.userId}`,
      );

      // Mark failed tokens as inactive
      if (response.responses) {
        for (let i = 0; i < response.responses.length; i++) {
          const resp = response.responses[i]!;
          if (
            !resp.success &&
            resp.error?.code === "messaging/registration-token-not-registered"
          ) {
            const staleToken = tokens[i]!;
            staleToken.isActive = false;
            await this.fcmTokenRepo.save(staleToken);
            this.logger.warn(`Deactivated stale FCM token ${staleToken.id}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Push: FCM send failed for user ${notification.userId}: ${error instanceof Error ? error.message : error}`,
      );
    }

    // Web Push (browser subscriptions via VAPID)
    try {
      const webPushSent = await this.webPushService.sendToUser(
        notification.userId,
        notification.content?.title || "VendHub",
        notification.content?.body || "",
        notification.content?.actionUrl,
      );
      if (webPushSent > 0) {
        this.logger.log(
          `Push: web-push sent to ${webPushSent} browser(s) for user ${notification.userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Push: web-push failed for user ${notification.userId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // ==========================================================================
  // Web Push Subscriptions
  // ==========================================================================

  /**
   * Register a Web Push subscription for a user
   */
  async subscribePush(
    userId: string,
    organizationId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent?: string,
  ): Promise<PushSubscription> {
    // Upsert: if endpoint already exists, update it
    const existing = await this.pushSubscriptionRepo.findOne({
      where: { endpoint },
    });

    if (existing) {
      existing.userId = userId;
      existing.organizationId = organizationId;
      existing.p256dh = p256dh;
      existing.auth = auth;
      existing.userAgent = userAgent || existing.userAgent;
      existing.isActive = true;
      existing.lastUsedAt = new Date();
      return this.pushSubscriptionRepo.save(existing);
    }

    const subscription = this.pushSubscriptionRepo.create({
      userId,
      organizationId,
      endpoint,
      p256dh,
      auth,
      userAgent: userAgent || null,
      isActive: true,
      lastUsedAt: new Date(),
    });

    return this.pushSubscriptionRepo.save(subscription);
  }

  /**
   * Remove a Web Push subscription by endpoint
   */
  async unsubscribePush(endpoint: string): Promise<void> {
    const subscription = await this.pushSubscriptionRepo.findOne({
      where: { endpoint },
    });

    if (!subscription) {
      throw new NotFoundException("Push subscription not found");
    }

    // Soft deactivate rather than hard delete
    subscription.isActive = false;
    await this.pushSubscriptionRepo.save(subscription);
  }

  // ==========================================================================
  // FCM Tokens (Firebase Cloud Messaging)
  // ==========================================================================

  /**
   * Register an FCM token for a user's device
   */
  async registerFcm(
    userId: string,
    organizationId: string,
    token: string,
    deviceType: DeviceType,
    deviceName?: string,
    deviceId?: string,
  ): Promise<FcmToken> {
    // Upsert: if token already exists, update it
    const existing = await this.fcmTokenRepo.findOne({
      where: { token },
    });

    if (existing) {
      existing.userId = userId;
      existing.organizationId = organizationId;
      existing.deviceType = deviceType;
      existing.deviceName = deviceName || existing.deviceName;
      existing.deviceId = deviceId || existing.deviceId;
      existing.isActive = true;
      existing.lastUsedAt = new Date();
      return this.fcmTokenRepo.save(existing);
    }

    const fcmToken = this.fcmTokenRepo.create({
      userId,
      organizationId,
      token,
      deviceType,
      deviceName: deviceName || null,
      deviceId: deviceId || null,
      isActive: true,
      lastUsedAt: new Date(),
    });

    return this.fcmTokenRepo.save(fcmToken);
  }

  /**
   * Unregister an FCM token
   */
  async unregisterFcm(token: string): Promise<void> {
    const fcmToken = await this.fcmTokenRepo.findOne({
      where: { token },
    });

    if (!fcmToken) {
      throw new NotFoundException("FCM token not found");
    }

    // Soft deactivate rather than hard delete
    fcmToken.isActive = false;
    await this.fcmTokenRepo.save(fcmToken);
  }
}
