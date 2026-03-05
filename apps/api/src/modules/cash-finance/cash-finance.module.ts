import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BankDeposit } from "./entities/bank-deposit.entity";
import { Collection } from "../collections/entities/collection.entity";
import { CashFinanceService } from "./cash-finance.service";
import { CashFinanceController } from "./cash-finance.controller";

@Module({
  imports: [TypeOrmModule.forFeature([BankDeposit, Collection])],
  controllers: [CashFinanceController],
  providers: [CashFinanceService],
  exports: [CashFinanceService],
})
export class CashFinanceModule {}
