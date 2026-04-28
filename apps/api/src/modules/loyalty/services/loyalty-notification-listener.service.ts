import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { WebPushService } from "../../web-push/web-push.service";
import { LOYALTY_LEVELS, LoyaltyLevel } from "../constants/loyalty.constants";

/**
 * Payload of the "loyalty.level_up" event emitted by LoyaltyService when
 * earnPoints brings a user across a tier threshold (loyalty.service.ts:267).
 */
interface LevelUpEvent {
  userId: string;
  oldLevel: LoyaltyLevel;
  newLevel: LoyaltyLevel;
  newBalance: number;
}

@Injectable()
export class LoyaltyNotificationListenerService {
  private readonly logger = new Logger(LoyaltyNotificationListenerService.name);

  constructor(private readonly webPushService: WebPushService) {}

  @OnEvent("loyalty.level_up")
  async handleLevelUp(event: LevelUpEvent): Promise<void> {
    const { userId, newLevel } = event;

    const tierConfig = LOYALTY_LEVELS[newLevel];
    if (!tierConfig) {
      this.logger.warn(`level_up for unknown tier ${newLevel} — skipping push`);
      return;
    }

    // Push send is best-effort. WebPushService already swallows VAPID-not-
    // configured and per-subscription failures; we only catch the catastrophic
    // case where the call itself throws synchronously.
    try {
      await this.webPushService.sendToUser(
        userId,
        `${tierConfig.icon} Новый уровень: ${tierConfig.name}!`,
        `Кэшбэк ${tierConfig.cashbackPercent}%, множитель бонусов x${tierConfig.bonusMultiplier}`,
        "/loyalty",
        { type: "loyalty.level_up", newLevel },
      );
    } catch (error: unknown) {
      this.logger.error(
        `level_up push failed for user ${userId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
