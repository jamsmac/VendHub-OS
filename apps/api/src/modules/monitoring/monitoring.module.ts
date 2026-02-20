/**
 * Monitoring Module
 *
 * Provides application metrics and health check endpoints.
 * No database entities - purely in-memory metrics collection.
 * Export MonitoringService for use by interceptors, middleware, etc.
 */

import { Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
