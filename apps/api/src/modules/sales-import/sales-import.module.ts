import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SalesImportService } from "./sales-import.service";
import { SalesImportController } from "./sales-import.controller";
import { SalesImport } from "./entities/sales-import.entity";
import { SalesTxnHash } from "./entities/sales-txn-hash.entity";
import { SalesAggregated } from "./entities/sales-aggregated.entity";
import { ParseSession } from "./entities/parse-session.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Product } from "../products/entities/product.entity";
import { HiconParserService } from "./services/hicon-parser.service";
import { ParseSessionService } from "./services/parse-session.service";
import { SalesImportIngestService } from "./services/sales-import-ingest.service";
import { StockMovementsModule } from "../stock-movements/stock-movements.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesImport,
      SalesTxnHash,
      SalesAggregated,
      ParseSession,
      Machine,
      Product,
    ]),
    StockMovementsModule,
  ],
  controllers: [SalesImportController],
  providers: [
    SalesImportService,
    HiconParserService,
    ParseSessionService,
    SalesImportIngestService,
  ],
  exports: [SalesImportService, SalesImportIngestService],
})
export class SalesImportModule {}
