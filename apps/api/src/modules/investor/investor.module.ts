import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InvestorProfile } from "./entities/investor-profile.entity";
import { DividendPayment } from "./entities/dividend-payment.entity";
import { Machine } from "../machines/entities/machine.entity";
import { Transaction } from "../transactions/entities/transaction.entity";
import { InvestorService } from "./investor.service";
import { InvestorController } from "./investor.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvestorProfile,
      DividendPayment,
      Machine,
      Transaction,
    ]),
  ],
  controllers: [InvestorController],
  providers: [InvestorService],
  exports: [InvestorService],
})
export class InvestorModule {}
