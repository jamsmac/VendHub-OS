import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { PushSubscription } from "../notifications/entities/push-subscription.entity";

// Dynamic require — web-push is optional at runtime
let webPush: typeof import("web-push") | null = null;
try {
  webPush = require("web-push");
} catch {
  // web-push not installed — delivery disabled
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private vapidConfigured = false;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepo: Repository<PushSubscription>,
    private readonly configService: ConfigService,
  ) {
    this.initVapid();
  }

  private initVapid(): void {
    if (!webPush) {
      this.logger.warn("web-push package not installed — delivery disabled");
      return;
    }

    const publicKey = this.configService.get<string>("VAPID_PUBLIC_KEY");
    const privateKey = this.configService.get<string>("VAPID_PRIVATE_KEY");
    const email = this.configService.get<string>(
      "VAPID_EMAIL",
      "admin@vendhub.uz",
    );

    if (!publicKey || !privateKey) {
      this.logger.warn("VAPID keys not configured — web push disabled");
      return;
    }

    webPush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    this.vapidConfigured = true;
    this.logger.log("VAPID configured — web push enabled");
  }

  getPublicKey(): string | null {
    return this.configService.get<string>("VAPID_PUBLIC_KEY") || null;
  }

  async subscribe(
    userId: string,
    organizationId: string,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent?: string,
  ): Promise<PushSubscription> {
    // Upsert by endpoint
    let sub = await this.subscriptionRepo.findOne({ where: { endpoint } });

    if (sub) {
      sub.userId = userId;
      sub.organizationId = organizationId;
      sub.p256dh = p256dh;
      sub.auth = auth;
      sub.isActive = true;
      sub.lastUsedAt = new Date();
      if (userAgent) sub.userAgent = userAgent;
    } else {
      sub = this.subscriptionRepo.create({
        userId,
        organizationId,
        endpoint,
        p256dh,
        auth,
        isActive: true,
        lastUsedAt: new Date(),
        userAgent: userAgent || null,
      });
    }

    return this.subscriptionRepo.save(sub);
  }

  async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    const sub = await this.subscriptionRepo.findOne({
      where: { endpoint, userId },
    });
    if (!sub) return false;

    await this.subscriptionRepo.softDelete(sub.id);
    return true;
  }

  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return this.subscriptionRepo.find({
      where: { userId, isActive: true },
    });
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    url?: string,
    data?: Record<string, unknown>,
  ): Promise<number> {
    if (!webPush || !this.vapidConfigured) {
      this.logger.log(
        `Web push not available — would send "${title}" to user ${userId}`,
      );
      return 0;
    }

    const subscriptions = await this.subscriptionRepo.find({
      where: { userId, isActive: true },
    });

    if (subscriptions.length === 0) return 0;

    const payload = JSON.stringify({ title, body, url, data });
    let sent = 0;

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sub.lastUsedAt = new Date();
        await this.subscriptionRepo.save(sub);
        sent++;
      } catch (error: unknown) {
        const statusCode =
          error instanceof Object && "statusCode" in error
            ? (error as { statusCode: number }).statusCode
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription expired or unsubscribed
          sub.isActive = false;
          await this.subscriptionRepo.save(sub);
          this.logger.warn(`Deactivated expired subscription ${sub.id}`);
        } else {
          this.logger.error(
            `Web push failed for sub ${sub.id}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    }

    return sent;
  }

  async sendToMultipleUsers(
    userIds: string[],
    title: string,
    body: string,
    url?: string,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const count = await this.sendToUser(userId, title, body, url);
        sent += count;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  }

  @Cron("0 3 * * *", { timeZone: "Asia/Tashkent" })
  async cleanupInactive(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.subscriptionRepo.softDelete({
      isActive: false,
      updatedAt: LessThan(thirtyDaysAgo),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `Cleaned up ${result.affected} inactive subscriptions (>30 days)`,
      );
    }
  }
}
