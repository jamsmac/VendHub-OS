/**
 * Monitoring Module
 *
 * Provides application metrics and health check endpoints.
 * No database entities - purely in-memory metrics collection.
 * Export MonitoringService for use by interceptors, middleware, etc.
 */

import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MonitoringService } from "./monitoring.service";
import { MonitoringController } from "./monitoring.controller";

@Module({
  imports: [ConfigModule],
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule implements OnModuleInit {
  private readonly logger = new Logger(MonitoringModule.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (!this.configService.get<string>("METRICS_API_KEY")) {
      this.logger.warn(
        "METRICS_API_KEY is not set - /monitoring/* endpoints will return 403",
      );
    }
  }
}
