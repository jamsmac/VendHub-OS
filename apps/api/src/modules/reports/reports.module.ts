/**
 * Reports Module for VendHub OS
 *
 * Includes:
 * - Standard Reports (ReportsController, ReportsService)
 * - VendHub Report System v11.0 (VendHubReportController, VendHubReportGeneratorService, VendHubExcelExportService)
 * - Analytics System (AnalyticsController, AnalyticsService) — snapshots, daily stats, cron aggregation
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Standard Reports
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

// VendHub Report System v11.0
import { VendHubReportController } from './controllers/vendhub-report.controller';
import { VendHubReportGeneratorService } from './services/vendhub-report-generator.service';
import { VendHubExcelExportService } from './services/vendhub-excel-export.service';

// Analytics System
import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';

// Entities
import {
  ReportDefinition,
  ScheduledReport,
  GeneratedReport,
  DashboardWidget,
  Dashboard,
  SavedReportFilter,
  ReportSubscription,
} from './entities/report.entity';
import { AnalyticsSnapshot, DailyStats } from './entities/analytics-snapshot.entity';

// Related entities for VendHub Reports & Analytics
import { Transaction } from '../transactions/entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { Product } from '../products/entities/product.entity';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Report entities
      ReportDefinition,
      ScheduledReport,
      GeneratedReport,
      DashboardWidget,
      Dashboard,
      SavedReportFilter,
      ReportSubscription,
      // Analytics entities
      AnalyticsSnapshot,
      DailyStats,
      // Related entities for VendHub Reports & Analytics
      Transaction,
      Machine,
      Product,
      Task,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    ReportsController,
    VendHubReportController,
    AnalyticsController,
  ],
  providers: [
    ReportsService,
    VendHubReportGeneratorService,
    VendHubExcelExportService,
    AnalyticsService,
  ],
  exports: [
    ReportsService,
    VendHubReportGeneratorService,
    VendHubExcelExportService,
    AnalyticsService,
  ],
})
export class ReportsModule {}
