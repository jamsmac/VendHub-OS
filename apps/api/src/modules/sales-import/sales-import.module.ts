import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesImportService } from './sales-import.service';
import { SalesImportController } from './sales-import.controller';
import { SalesImport } from './entities/sales-import.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SalesImport])],
  controllers: [SalesImportController],
  providers: [SalesImportService],
  exports: [SalesImportService],
})
export class SalesImportModule {}
