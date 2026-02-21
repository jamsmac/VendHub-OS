import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Counterparty,
  Contract,
  CommissionCalculation,
} from "./entities/counterparty.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Counterparty, Contract, CommissionCalculation]),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class CounterpartyModule {}
