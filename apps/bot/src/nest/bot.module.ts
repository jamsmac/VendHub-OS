/**
 * NestJS Module wrapper for the Telegram Bot.
 *
 * This module integrates the existing Telegraf-based bot into a NestJS
 * application context, enabling:
 * - Dependency injection for services
 * - Proper lifecycle management (onModuleInit/onModuleDestroy)
 * - Health check endpoint for monitoring
 * - Testability via NestJS testing utilities
 *
 * Migration path:
 * 1. [Current] Wrap existing bot in NestJS module
 * 2. [Future] Move handlers to NestJS injectable services
 * 3. [Future] Share services with API via shared NestJS modules
 */

import { Module } from "@nestjs/common";
import { BotService } from "./bot.service";
import { BotHealthController } from "./bot-health.controller";

@Module({
  providers: [BotService],
  controllers: [BotHealthController],
  exports: [BotService],
})
export class BotModule {}
