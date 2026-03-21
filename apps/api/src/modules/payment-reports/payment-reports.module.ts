import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { PaymentReportUpload } from "./entities/payment-report-upload.entity";
import { PaymentReportRow } from "./entities/payment-report-row.entity";

import { PaymentReportDetectorService } from "./services/payment-report-detector.service";
import { PaymentReportParserService } from "./services/payment-report-parser.service";
import { PaymentReportsService } from "./services/payment-reports.service";
import { PaymentReportAnalyticsService } from "./services/payment-report-analytics.service";
import { PaymentReportFolderWatcherService } from "./services/payment-report-folder-watcher.service";

import { PaymentReportsController } from "./payment-reports.controller";
import { PaymentReportAnalyticsController } from "./payment-report-analytics.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentReportUpload, PaymentReportRow]),
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [PaymentReportsController, PaymentReportAnalyticsController],
  providers: [
    PaymentReportDetectorService,
    PaymentReportParserService,
    PaymentReportsService,
    PaymentReportAnalyticsService,
    // Авто-импорт из папки (активируется через .env PAYMENT_REPORTS_WATCH_DIR)
    PaymentReportFolderWatcherService,
  ],
  exports: [PaymentReportsService, PaymentReportAnalyticsService],
})
export class PaymentReportsModule {}
