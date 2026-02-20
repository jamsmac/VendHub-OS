import * as dotenv from 'dotenv';
import { BotConfig } from './types';

dotenv.config();

export const config: BotConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  miniAppUrl: process.env.MINI_APP_URL || 'https://app.vendhub.uz',
  webhookDomain: process.env.WEBHOOK_DOMAIN || '',
  webhookPath: process.env.WEBHOOK_PATH || '/webhook',
  port: parseInt(process.env.PORT || '3001', 10),
  supportUsername: process.env.SUPPORT_USERNAME || 'vendhub_support',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@vendhub.uz',
  supportPhone: process.env.SUPPORT_PHONE || '+998 71 123 45 67',
};

// Validation
export function validateConfig(): void {
  if (!config.botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }
}

export default config;
