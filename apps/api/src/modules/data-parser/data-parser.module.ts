import { Module } from "@nestjs/common";
import { DataParserController } from "./data-parser.controller";
import { DataParserService } from "./data-parser.service";
import { CsvParser } from "./parsers/csv.parser";
import { ExcelParser } from "./parsers/excel.parser";
import { JsonParser } from "./parsers/json.parser";
import { UniversalParser } from "./parsers/universal.parser";
import { DataValidationService } from "./services/data-validation.service";

@Module({
  controllers: [DataParserController],
  providers: [
    DataParserService,
    CsvParser,
    ExcelParser,
    JsonParser,
    UniversalParser,
    DataValidationService,
  ],
  exports: [DataParserService, DataValidationService],
})
export class DataParserModule {}
