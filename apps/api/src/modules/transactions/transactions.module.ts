/**
 * Transactions Module for VendHub OS
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import {
  Transaction,
  TransactionItem,
  CollectionRecord,
  TransactionDailySummary,
  Commission,
} from './entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionItem,
      CollectionRecord,
      TransactionDailySummary,
      Commission,
    ]),
    // EventEmitterModule is configured in AppModule
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
