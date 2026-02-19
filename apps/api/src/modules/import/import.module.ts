/**
 * Import Module
 * Data import functionality for legacy data migration
 * and intelligent import workflow with approval process
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";

import { ImportController } from "./import.controller";
import { ImportService } from "./import.service";
import { ImportParserService } from "./services/import-parser.service";
import { ImportValidatorService } from "./services/import-validator.service";
import { ImportTemplateService } from "./services/import-template.service";
import { ImportSessionService } from "./services/import-session.service";
import { ImportJob, ImportTemplate } from "./entities/import.entity";
import { ImportSession } from "./entities/import-session.entity";
import { ImportAuditLog } from "./entities/import-audit-log.entity";
import { SchemaDefinition } from "./entities/schema-definition.entity";
import { ValidationRule } from "./entities/validation-rule.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportJob,
      ImportTemplate,
      ImportSession,
      ImportAuditLog,
      SchemaDefinition,
      ValidationRule,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max for imports
      },
    }),
  ],
  controllers: [ImportController],
  providers: [
    ImportService,
    ImportParserService,
    ImportValidatorService,
    ImportTemplateService,
    ImportSessionService,
  ],
  exports: [ImportService],
})
export class ImportModule {}
