import { Injectable } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";

/**
 * Health indicator for Telegram Bot API connectivity.
 * Calls getMe to verify the bot token is valid and the API is reachable.
 */
@Injectable()
export class TelegramHealthIndicator extends HealthIndicator {
  private readonly botToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    super();
    this.botToken = configService.get<string>("TELEGRAM_BOT_TOKEN");
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.botToken || this.botToken === "your_telegram_bot_token") {
      return this.getStatus(key, true, {
        status: "not_configured",
        message: "Telegram bot not configured",
      });
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://api.telegram.org/bot${this.botToken}/getMe`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      const responseTime = Date.now() - startTime;
      const data = (await response.json()) as {
        ok: boolean;
        result?: { username?: string };
      };

      if (!data.ok) {
        throw new Error("Telegram API returned ok=false");
      }

      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
        botUsername: data.result?.username,
        reachable: true,
      });
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;

      throw new HealthCheckError(
        "Telegram check failed",
        this.getStatus(key, false, {
          responseTime: `${responseTime}ms`,
          reachable: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}
