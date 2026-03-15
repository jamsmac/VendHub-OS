import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Counterparty,
  Contract,
  CommissionCalculation,
} from "./entities/counterparty.entity";
import { CounterpartyService } from "./counterparty.service";
import { CounterpartyController } from "./counterparty.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([Counterparty, Contract, CommissionCalculation]),
  ],
  controllers: [CounterpartyController],
  providers: [CounterpartyService],
  exports: [CounterpartyService],
})
export class CounterpartyModule {}
