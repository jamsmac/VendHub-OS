import * as dotenv from "dotenv";
import { BotConfig } from "./types";

dotenv.config();

export const config: BotConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  apiToken: process.env.BOT_API_TOKEN || "",
  apiUrl: process.env.API_URL || "http://localhost:4000",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  miniAppUrl: process.env.MINI_APP_URL || "https://app.vendhub.uz",
  webhookDomain: process.env.WEBHOOK_DOMAIN || "",
  webhookPath: process.env.WEBHOOK_PATH || "/webhook",
  port: parseInt(process.env.PORT || "3001", 10),
  supportUsername: process.env.SUPPORT_USERNAME || "vendhub_support",
  supportEmail: process.env.SUPPORT_EMAIL || "support@vendhub.uz",
  supportPhone: process.env.SUPPORT_PHONE || "+998 71 123 45 67",
};

// Validation
export function validateConfig(): void {
  if (!config.botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }
  if (!config.apiToken) {
    throw new Error(
      "BOT_API_TOKEN is required — generate a JWT for the bot service account",
    );
  }
  // In production, ensure no localhost URLs and HTTPS webhooks
  if (process.env.NODE_ENV === "production") {
    if (config.apiUrl.includes("localhost")) {
      throw new Error("API_URL must not point to localhost in production");
    }
    if (config.redisUrl.includes("localhost")) {
      throw new Error("REDIS_URL must not point to localhost in production");
    }
    if (config.webhookDomain && !config.webhookDomain.startsWith("https://")) {
      throw new Error(
        "WEBHOOK_DOMAIN must use HTTPS in production (Telegram requirement)",
      );
    }
  }
}

export default config;
