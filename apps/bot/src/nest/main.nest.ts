/**
 * NestJS bootstrap for the Telegram Bot.
 *
 * To use NestJS mode instead of standalone mode:
 *   NODE_ENV=production node dist/nest/main.nest.js
 *
 * This wraps the existing Telegraf bot in a NestJS context,
 * providing health checks and proper lifecycle management.
 */

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const port = process.env.BOT_PORT || 3001;
  await app.listen(port);
  console.log(`Bot NestJS server listening on port ${port}`);
}

bootstrap();
