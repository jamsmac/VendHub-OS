/**
 * Transactions Module for VendHub OS
 */

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";
import { TransactionQueryService } from "./transaction-query.service";
import { TransactionCreateService } from "./transaction-create.service";
import { TransactionReconcileService } from "./transaction-reconcile.service";
import {
  Transaction,
  TransactionItem,
  CollectionRecord,
  TransactionDailySummary,
  Commission,
} from "./entities/transaction.entity";
import {
  Recipe,
  RecipeIngredient,
  IngredientBatch,
} from "../products/entities/product.entity";
import { SaleIngredient } from "./entities/sale-ingredient.entity";
import { CogsListener } from "./listeners/cogs.listener";
import { ContainersModule } from "../containers/containers.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionItem,
      CollectionRecord,
      TransactionDailySummary,
      Commission,
      Recipe,
      RecipeIngredient,
      IngredientBatch,
      SaleIngredient,
    ]),
    ContainersModule,
    // EventEmitterModule is configured in AppModule
  ],
  controllers: [TransactionsController],
  providers: [
    // Split services (order matters: dependencies first)
    TransactionQueryService,
    TransactionCreateService,
    TransactionReconcileService,
    TransactionsService,
    CogsListener,
  ],
  exports: [
    TransactionsService,
    TransactionQueryService,
    TransactionCreateService,
    TransactionReconcileService,
  ],
})
export class TransactionsModule {}
