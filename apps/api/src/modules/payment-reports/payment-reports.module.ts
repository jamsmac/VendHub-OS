import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { PaymentReportUpload } from "./entities/payment-report-upload.entity";
import { PaymentReportRow } from "./entities/payment-report-row.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { Machine } from "../machines/entities/machine.entity";
import { HwImportedSale } from "../reconciliation/entities/reconciliation.entity";

import { PaymentReportDetectorService } from "./services/payment-report-detector.service";
import { PaymentReportParserService } from "./services/payment-report-parser.service";
import { PaymentReportsService } from "./services/payment-reports.service";
import { PaymentReportAnalyticsService } from "./services/payment-report-analytics.service";
import { PaymentReportFolderWatcherService } from "./services/payment-report-folder-watcher.service";
import { PaymentReportImportService } from "./services/payment-report-import.service";

import { PaymentReportsController } from "./payment-reports.controller";
import { PaymentReportAnalyticsController } from "./payment-report-analytics.controller";

import { ReconciliationModule } from "../reconciliation/reconciliation.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentReportUpload,
      PaymentReportRow,
      Transaction,
      Machine,
      HwImportedSale,
    ]),
    MulterModule.register({ storage: memoryStorage() }),
    ReconciliationModule,
  ],
  controllers: [PaymentReportsController, PaymentReportAnalyticsController],
  providers: [
    PaymentReportDetectorService,
    PaymentReportParserService,
    PaymentReportsService,
    PaymentReportAnalyticsService,
    // Авто-импорт из папки (активируется через .env PAYMENT_REPORTS_WATCH_DIR)
    PaymentReportFolderWatcherService,
    PaymentReportImportService,
  ],
  exports: [
    PaymentReportsService,
    PaymentReportAnalyticsService,
    PaymentReportImportService,
  ],
})
export class PaymentReportsModule {}
