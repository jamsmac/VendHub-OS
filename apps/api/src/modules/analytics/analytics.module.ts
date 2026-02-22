/**
 * Analytics Module
 * Daily stats, dashboard widgets, analytics snapshots, and custom reports
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  DailyStats,
  DashboardWidget,
  AnalyticsSnapshot,
  CustomReport,
} from "./entities/analytics.entity";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsController } from "./analytics.controller";
import { Transaction } from "../transactions/entities/transaction.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Task } from "../tasks/entities/task.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyStats,
      DashboardWidget,
      AnalyticsSnapshot,
      CustomReport,
      Transaction,
      Machine,
      Task,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
