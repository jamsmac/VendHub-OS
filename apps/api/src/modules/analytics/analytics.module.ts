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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DailyStats,
      DashboardWidget,
      AnalyticsSnapshot,
      CustomReport,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class AnalyticsModule {}
