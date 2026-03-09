/**
 * Common Module for VendHub OS
 * Provides shared services used across all modules.
 *
 * NOTE: Global interceptors, filters, pipes, and guards are registered
 * in AppModule (app.module.ts) — NOT here. Registering them in both
 * places causes double execution (duplicate logs, double transforms).
 */

import { Module, Global } from "@nestjs/common";

// Services
import { AppLoggerService } from "./services/logger.service";

@Global()
@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService],
})
export class CommonModule {}
