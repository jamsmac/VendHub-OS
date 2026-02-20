/**
 * Reconciliation Module
 * Сверка данных из HW-отчётов, транзакций и платёжных систем
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ReconciliationRun,
  ReconciliationMismatch,
  HwImportedSale,
} from './entities/reconciliation.entity';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReconciliationRun,
      ReconciliationMismatch,
      HwImportedSale,
    ]),
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
